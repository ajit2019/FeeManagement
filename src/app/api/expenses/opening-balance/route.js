import { createClient } from '@supabase/supabase-js';
import { localDb, isMissingTableError } from '@/lib/localExpensesDb';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// POST /api/expenses/opening-balance { month_key: '2026-10', opening_balance: 18516 }
export async function POST(request) {
  try {
    const { month_key, opening_balance } = await request.json();

    if (!month_key) {
      return Response.json({ success: false, error: 'month_key is required (e.g. 2026-10).' }, { status: 400 });
    }

    const balanceNum = Number(opening_balance);
    if (isNaN(balanceNum)) {
      return Response.json({ success: false, error: 'opening_balance must be a valid number.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('monthly_opening_balances')
      .upsert({
        month_key,
        opening_balance: balanceNum,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error && isMissingTableError(error)) {
      // Save locally
      const localResult = localDb.upsertOpeningBalance(month_key, balanceNum);
      return Response.json({
        success: true,
        data: localResult,
        storage: 'local',
        needsSetup: true,
        message: 'Opening balance updated in local database (Supabase table setup pending).',
      });
    }

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    // Also update local store for consistency
    localDb.upsertOpeningBalance(month_key, balanceNum);

    return Response.json({
      success: true,
      data: data?.[0],
      storage: 'supabase',
      needsSetup: false,
      message: 'Opening balance updated successfully.',
    });
  } catch (err) {
    console.error('Opening balance API error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
