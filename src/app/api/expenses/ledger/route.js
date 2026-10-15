import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET /api/expenses/ledger?month=YYYY-MM
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || currentMonthStr; // e.g. '2026-10'

    const [year, m] = month.split('-').map(Number);
    if (!year || !m || m < 1 || m > 12) {
      return Response.json({ success: false, error: 'Invalid month format. Expected YYYY-MM.' }, { status: 400 });
    }

    const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, m, 0).getDate();
    const nextMonthYear = m === 12 ? year + 1 : year;
    const nextMonthM = m === 12 ? 1 : m + 1;
    const endDate = `${nextMonthYear}-${String(nextMonthM).padStart(2, '0')}-01`;

    const supabase = getSupabase();

    // 1. Fetch Opening Balance for this month
    let openingBalance = 0;
    try {
      const { data: balanceData } = await supabase
        .from('monthly_opening_balances')
        .select('opening_balance')
        .eq('month_key', month)
        .maybeSingle();

      if (balanceData && balanceData.opening_balance !== null) {
        openingBalance = Number(balanceData.opening_balance) || 0;
      }
    } catch (e) {
      // Table might not exist yet; default to 0
    }

    // 2. Fetch all fee transactions (for sequential slip numbers and fee income)
    let feeIncomeMap = {}; // date -> { amount, slips: [] }
    let cumulativeFeeIncome = 0;
    try {
      const { data: allTxs } = await supabase
        .from('fee_transactions')
        .select('id, student_id, date_paid, created_at, amount_received, fee_head');

      if (allTxs && allTxs.length > 0) {
        const { slipMap } = getSequentialSlips(allTxs);

        allTxs.forEach((tx) => {
          const amt = Number(tx.amount_received || 0);
          cumulativeFeeIncome += amt;

          if (tx.date_paid && tx.date_paid >= startDate && tx.date_paid < endDate) {
            const dateStr = tx.date_paid;
            const slipNo = slipMap.get(tx.id) || '';

            if (!feeIncomeMap[dateStr]) {
              feeIncomeMap[dateStr] = { amount: 0, slips: new Set() };
            }
            feeIncomeMap[dateStr].amount += amt;
            if (slipNo) {
              // Extract numeric part if formatted like SICF-00556
              const match = slipNo.match(/\d+$/);
              feeIncomeMap[dateStr].slips.add(match ? match[0] : slipNo);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching fee_transactions for ledger:', e);
    }

    // 3. Fetch Other / Non-Fee Incomes for this month & Cumulative All-Time
    let otherIncomeMap = {}; // date -> [{ id, source_title, receipt_no, amount, head }]
    let cumulativeOtherIncome = 0;
    try {
      const { data: allOtherIncomes } = await supabase
        .from('other_income')
        .select('*');

      if (allOtherIncomes) {
        allOtherIncomes.forEach((inc) => {
          const amt = Number(inc.amount || 0);
          cumulativeOtherIncome += amt;

          if (inc.date >= startDate && inc.date < endDate) {
            const dateStr = inc.date;
            if (!otherIncomeMap[dateStr]) {
              otherIncomeMap[dateStr] = [];
            }
            otherIncomeMap[dateStr].push(inc);
          }
        });
      }
    } catch (e) {
      // Table might not exist yet
    }

    // 4. Fetch Expense Vouchers for this month & Cumulative All-Time
    let expenseMap = {}; // date -> [voucher]
    let categoryBreakdown = {};
    let cumulativeTotalExpense = 0;
    let needsSetup = false;

    try {
      const { data: allExpenses, error: expError } = await supabase
        .from('expense_vouchers')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (expError) {
        if (expError.code === '42P01' || expError.message?.includes('does not exist')) {
          needsSetup = true;
        }
      } else if (allExpenses) {
        allExpenses.forEach((exp) => {
          const amt = Number(exp.amount || 0);
          cumulativeTotalExpense += amt;

          if (exp.date >= startDate && exp.date < endDate) {
            const dateStr = exp.date;
            const head = exp.expense_head || 'Miscellaneous';

            if (!expenseMap[dateStr]) {
              expenseMap[dateStr] = [];
            }
            expenseMap[dateStr].push(exp);

            categoryBreakdown[head] = (categoryBreakdown[head] || 0) + amt;
          }
        });
      }
    } catch (e) {
      console.error('Error fetching expenses for ledger:', e);
    }

    // Base initial opening balance from earliest record
    let earliestOpeningBalance = 0;
    try {
      const { data: firstBalance } = await supabase
        .from('monthly_opening_balances')
        .select('opening_balance, month_key')
        .order('month_key', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstBalance && firstBalance.opening_balance !== null) {
        earliestOpeningBalance = Number(firstBalance.opening_balance) || 0;
      }
    } catch (e) {}

    const cumulativeTotalIncome = cumulativeFeeIncome + cumulativeOtherIncome;
    const cumulativeCashBalance = earliestOpeningBalance + cumulativeTotalIncome - cumulativeTotalExpense;

    // 5. Build Day-by-Day Rows
    // We can include all days of the month, or only days with transactions
    let runningBalance = openingBalance;
    let totalIncome = 0;
    let totalExpense = 0;

    const days = [];

    // Row 0: Opening / Last Month balance
    days.push({
      isOpeningBalance: true,
      date: startDate,
      dateFormatted: 'Opening Balance',
      receiptRange: '-',
      head: '-',
      expenseDetails: 'Last Month balance',
      income: openingBalance,
      expense: 0,
      balance: openingBalance,
      vouchers: [],
      otherIncomes: [],
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${dayStr}`;
      
      const dayFee = feeIncomeMap[dateStr] || { amount: 0, slips: new Set() };
      const dayOtherIncomes = otherIncomeMap[dateStr] || [];
      const dayVouchers = expenseMap[dateStr] || [];

      const otherIncomeTotal = dayOtherIncomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const dayTotalIncome = dayFee.amount + otherIncomeTotal;
      const dayTotalExpense = dayVouchers.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      // Receipt number range
      let receiptRange = '';
      if (dayFee.slips && dayFee.slips.size > 0) {
        const sortedSlips = Array.from(dayFee.slips).sort((a, b) => Number(a) - Number(b));
        if (sortedSlips.length === 1) {
          receiptRange = sortedSlips[0];
        } else {
          receiptRange = `${sortedSlips[0]} to ${sortedSlips[sortedSlips.length - 1]}`;
        }
      }

      if (dayOtherIncomes.length > 0) {
        const otherRefs = dayOtherIncomes
          .map((i) => i.receipt_no || i.source_title)
          .filter(Boolean)
          .join(', ');
        if (otherRefs) {
          receiptRange = receiptRange ? `${receiptRange} | ${otherRefs}` : otherRefs;
        }
      }

      // Heads summary (matches Image 1 where Head column represents Income Head like "Online", "Cash", etc.)
      let headSummary = '-';
      if (dayTotalIncome > 0) {
        const incomeModes = new Set();
        if (dayFee.amount > 0) incomeModes.add('Online');
        dayOtherIncomes.forEach((i) => incomeModes.add(i.payment_mode || 'Online'));
        headSummary = Array.from(incomeModes).join(', ');
      } else if (dayVouchers.length > 0) {
        const expenseModes = new Set();
        dayVouchers.forEach((v) => expenseModes.add(v.payment_mode || 'Cash'));
        headSummary = Array.from(expenseModes).join(', ');
      }

      // Expense details summary text (similar to Image 1)
      let expenseDetailsList = [];
      dayVouchers.forEach((v) => {
        let line = v.purpose ? v.purpose : v.expense_head;
        if (v.paid_to) line = `${v.paid_to} (${line})`;
        if (v.amount) line = `${line} ₹${Number(v.amount).toLocaleString('en-IN')}`;
        expenseDetailsList.push(line);
      });
      const expenseDetails = expenseDetailsList.join('; ');

      // Running Balance
      runningBalance = runningBalance + dayTotalIncome - dayTotalExpense;
      totalIncome += dayTotalIncome;
      totalExpense += dayTotalExpense;

      // Only push if there was activity OR push anyway for full daybook
      const hasActivity = dayTotalIncome > 0 || dayTotalExpense > 0 || dayVouchers.length > 0;

      days.push({
        date: dateStr,
        dayNumber: day,
        dateFormatted: `${dayStr}-${String(m).padStart(2, '0')}-${year}`,
        receiptRange: receiptRange || '-',
        head: headSummary,
        expenseDetails: expenseDetails || '-',
        income: dayTotalIncome,
        feeIncome: dayFee.amount,
        otherIncome: otherIncomeTotal,
        expense: dayTotalExpense,
        balance: runningBalance,
        hasActivity,
        vouchers: dayVouchers,
        otherIncomes: dayOtherIncomes,
      });
    }

    return Response.json({
      success: true,
      needsSetup,
      month,
      cumulative: {
        totalIncome: cumulativeTotalIncome,
        totalExpense: cumulativeTotalExpense,
        cashBalance: cumulativeCashBalance,
        feeIncome: cumulativeFeeIncome,
        otherIncome: cumulativeOtherIncome,
      },
      summary: {
        openingBalance,
        totalIncome,
        totalExpense,
        cashBalance: runningBalance, // Final closing balance for this month
      },
      categoryBreakdown,
      ledger: days,
    });

  } catch (error) {
    console.error('Ledger API error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
