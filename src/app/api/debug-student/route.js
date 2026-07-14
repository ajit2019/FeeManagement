import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || 'SIC-400';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const studentResult = await supabase
      .from('students')
      .select('*')
      .ilike('student_id', id);

    const enrollResult = await supabase
      .from('student_enrollments')
      .select('*')
      .ilike('student_id', id);

    const balanceResult = await supabase
      .from('student_fee_balances')
      .select('*')
      .ilike('student_id', id);

    const feeDetailsResult = await supabase
      .from('FeeDetails')
      .select('*')
      .ilike('StudentID', id);

    const parentResult = await supabase
      .from('parents_guardian')
      .select('*')
      .ilike('student_id', id);

    return Response.json({
      success: true,
      queryId: id,
      students: studentResult.data,
      studentError: studentResult.error,
      student_enrollments: enrollResult.data,
      enrollError: enrollResult.error,
      student_fee_balances: balanceResult.data,
      balanceError: balanceResult.error,
      FeeDetails: feeDetailsResult.data,
      feeDetailsError: feeDetailsResult.error,
      parents_guardian: parentResult.data,
      parentError: parentResult.error
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
