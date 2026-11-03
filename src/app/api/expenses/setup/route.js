import { createClient } from '@supabase/supabase-js';
import { localDb, isMissingTableError } from '@/lib/localExpensesDb';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET /api/expenses/setup
// Checks whether Supabase connection and tables are ready
export async function GET() {
  try {
    const supabase = getSupabase();

    // Check expense_vouchers table
    const { error: expErr } = await supabase.from('expense_vouchers').select('id').limit(1);
    const expenseVouchersReady = !expErr || !isMissingTableError(expErr);

    // Check other_income table
    const { error: incErr } = await supabase.from('other_income').select('id').limit(1);
    const otherIncomeReady = !incErr || !isMissingTableError(incErr);

    // Check monthly_opening_balances table
    const { error: balErr } = await supabase.from('monthly_opening_balances').select('month_key').limit(1);
    const balancesReady = !balErr || !isMissingTableError(balErr);

    const allReady = expenseVouchersReady && otherIncomeReady && balancesReady;

    const localExpenses = localDb.getAllExpenses();
    const localOtherIncome = localDb.getAllOtherIncome();
    const localBalances = localDb.getAllOpeningBalances();

    return Response.json({
      success: true,
      supabaseConnected: true,
      tablesReady: {
        expense_vouchers: expenseVouchersReady,
        other_income: otherIncomeReady,
        monthly_opening_balances: balancesReady,
      },
      allTablesReady: allReady,
      localRecordCounts: {
        expenses: localExpenses.length,
        otherIncome: localOtherIncome.length,
        balances: Object.keys(localBalances).length,
      },
      canSync: allReady && (localExpenses.length > 0 || localOtherIncome.length > 0),
    });
  } catch (err) {
    console.error('Setup check error:', err);
    return Response.json({
      success: false,
      supabaseConnected: false,
      error: err.message,
    });
  }
}

// POST /api/expenses/setup
// Action: 'sync_to_supabase' - transfers all local records to Supabase
export async function POST(request) {
  try {
    const { action } = await request.json();
    if (action !== 'sync_to_supabase') {
      return Response.json({ success: false, error: 'Invalid action.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Check if tables exist
    const { error: testErr } = await supabase.from('expense_vouchers').select('id').limit(1);
    if (testErr && isMissingTableError(testErr)) {
      return Response.json({
        success: false,
        error: "Supabase tables not detected yet. Please run the SQL script in Supabase SQL Editor first.",
      }, { status: 400 });
    }

    const localExpenses = localDb.getAllExpenses();
    const localOtherIncome = localDb.getAllOtherIncome();
    const localBalances = localDb.getAllOpeningBalances();

    let syncedExpenses = 0;
    let syncedIncome = 0;
    let syncedBalances = 0;

    // Sync Expenses
    if (localExpenses.length > 0) {
      const payload = localExpenses.map(({ _storage, ...rest }) => rest);
      const { error: expSyncErr } = await supabase.from('expense_vouchers').upsert(payload);
      if (expSyncErr) {
        throw new Error(`Failed to sync expenses: ${expSyncErr.message}`);
      }
      syncedExpenses = localExpenses.length;
      localDb.markExpensesSynced(localExpenses.map((e) => e.id));
    }

    // Sync Other Income
    if (localOtherIncome.length > 0) {
      const payload = localOtherIncome.map(({ _storage, ...rest }) => rest);
      const { error: incSyncErr } = await supabase.from('other_income').upsert(payload);
      if (incSyncErr) {
        throw new Error(`Failed to sync other income: ${incSyncErr.message}`);
      }
      syncedIncome = localOtherIncome.length;
      localDb.markIncomeSynced(localOtherIncome.map((i) => i.id));
    }

    // Sync Opening Balances
    for (const [month_key, bal] of Object.entries(localBalances)) {
      await supabase.from('monthly_opening_balances').upsert({
        month_key,
        opening_balance: Number(bal) || 0,
        updated_at: new Date().toISOString(),
      });
      syncedBalances++;
    }

    return Response.json({
      success: true,
      message: `Successfully synchronized ${syncedExpenses} expenses, ${syncedIncome} other income entries, and ${syncedBalances} opening balances to Supabase!`,
      syncedExpenses,
      syncedIncome,
      syncedBalances,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
