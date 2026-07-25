import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        date_of_birth,
        status,
        class,
        student_enrollments (
          roll_number,
          total_annual_fee,
          academic_year,
          classes (class_name)
        )
      `);

    if (search) {
      query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    // Format output
    const formatted = data.map(student => {
      const enrollment = student.student_enrollments?.[0] || {};
      const className = enrollment.classes?.class_name || '';
      const cleanClassName = className ? className.replace(/^Class\s+/i, '') : (student.class || 'Not Enrolled');
      return {
        StudentID: student.student_id,
        StudentName: student.student_name || '',
        Class: cleanClassName,
        RollNo: enrollment.roll_number ?? 'N/A',
        DOB: student.date_of_birth,
        Status: student.status || 'active',
      };
    });

    return Response.json({ success: true, data: formatted }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
