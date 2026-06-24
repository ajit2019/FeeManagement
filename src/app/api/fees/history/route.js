import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
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
      .order('date_paid', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    // Fetch all transactions to compute the correct sequential slip number
    const { data: allTxs, error: allTxsErr } = await supabase
      .from('fee_transactions')
      .select('id, student_id, date_paid, created_at');

    const { slipMap } = getSequentialSlips(allTxs || []);

    const formatted = data.map(tx => ({
      id: tx.id,
      StudentID: tx.student_id,
      StudentName: tx.students ? tx.students.student_name || 'Unknown' : 'Unknown',
      AcademicYear: tx.academic_year,
      DatePaid: tx.date_paid,
      FeeHead: tx.fee_head,
      MonthPaid: tx.month_paid,
      AmountReceived: tx.amount_received,
      CollectedBy: tx.collected_by,
      SlipNo: slipMap.get(tx.id) || `SICF-${tx.id.split('-')[0].toUpperCase()}`,
    }));

    return Response.json({ success: true, data: formatted }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
