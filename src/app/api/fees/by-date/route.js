import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // Expected format YYYY-MM-DD

    if (!dateStr) {
      return Response.json(
        { success: false, error: 'date parameter is required.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Fetch all transactions to compute correct sequential slip numbers
    const { data: allTxs, error: allTxsErr } = await supabase
      .from('fee_transactions')
      .select('id, student_id, date_paid, created_at');

    if (allTxsErr) {
      return Response.json({ success: false, error: allTxsErr.message }, { status: 400 });
    }

    const { slipMap } = getSequentialSlips(allTxs || []);

    // 2. Fetch transactions for the specific date
    const { data: targetTxs, error: targetTxsErr } = await supabase
      .from('fee_transactions')
      .select(`
        id,
        student_id,
        academic_year,
        date_paid,
        fee_head,
        month_paid,
        amount_received,
        collected_by,
        created_at,
        students (
          student_name
        )
      `)
      .eq('date_paid', dateStr)
      .order('created_at', { ascending: true });

    if (targetTxsErr) {
      return Response.json({ success: false, error: targetTxsErr.message }, { status: 400 });
    }

    // 3. Group by Slip Number
    // A single slip can contain multiple fee items (e.g., Monthly Tuition, Admission Fee, Books/Stationary)
    const groupedSlips = {};
    let totalReceived = 0;

    for (const tx of targetTxs || []) {
      const slipNo = slipMap.get(tx.id) || `SICF-${tx.id.split('-')[0].toUpperCase()}`;
      const amount = parseFloat(tx.amount_received || 0);
      totalReceived += amount;

      if (!groupedSlips[slipNo]) {
        groupedSlips[slipNo] = {
          slipNo: slipNo,
          studentId: tx.student_id,
          studentName: tx.students ? tx.students.student_name || 'Unknown' : 'Unknown',
          datePaid: tx.date_paid,
          totalAmount: 0,
          details: [],
        };
      }

      groupedSlips[slipNo].totalAmount += amount;
      groupedSlips[slipNo].details.push({
        feeHead: tx.fee_head,
        monthPaid: tx.month_paid,
        amount: amount,
      });
    }

    // Convert object to array sorted by slip number or student ID
    const slipsList = Object.values(groupedSlips).sort((a, b) => a.slipNo.localeCompare(b.slipNo));

    return Response.json({
      success: true,
      date: dateStr,
      totalReceived,
      slips: slipsList,
    }, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
