import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all transactions to compute the total number of slips
    const { data: allTxs, error: allTxsErr } = await supabase
      .from('fee_transactions')
      .select('id, student_id, date_paid, created_at');

    if (allTxsErr) {
      console.error('Supabase error:', allTxsErr);
      return Response.json(
        { success: false, error: allTxsErr.message, nextSlipNo: 'SICF-00001' },
        { status: 400 }
      );
    }

    const { totalSlips } = getSequentialSlips(allTxs || []);
    const nextSlipNo = `SICF-${String(totalSlips + 1).padStart(5, '0')}`;

    return Response.json(
      { success: true, nextSlipNo },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message, nextSlipNo: 'SICF-00001' },
      { status: 500 }
    );
  }
}
