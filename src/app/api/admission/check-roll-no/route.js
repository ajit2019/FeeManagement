import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawClass = searchParams.get('class');
    const rollNo = searchParams.get('rollNo');
    const excludeStudentId = searchParams.get('excludeStudentId');

    if (!rawClass || !rollNo) {
      return Response.json(
        { exists: false, error: 'class and rollNo query parameters are required.' },
        { status: 400 }
      );
    }

    const cleanClass = String(rawClass).replace(/^Class\s+/i, '').trim();
    const rollInt = parseInt(rollNo, 10);

    if (Number.isNaN(rollInt)) {
      return Response.json(
        { exists: false, error: 'rollNo must be a valid number.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Check in students table
    let studentsQuery = supabase
      .from('students')
      .select('student_id, student_name, class, roll_no, status')
      .eq('class', cleanClass)
      .or(`roll_no.eq.${rollInt},roll_no.eq.${rollNo}`);

    if (excludeStudentId) {
      studentsQuery = studentsQuery.neq('student_id', excludeStudentId);
    }

    const { data: studentMatches, error: studentError } = await studentsQuery;

    if (studentError) {
      console.error('Check roll students query error:', studentError);
    }

    if (studentMatches && studentMatches.length > 0) {
      const match = studentMatches[0];
      return Response.json(
        {
          exists: true,
          message: `Roll No. ${rollInt} is already assigned to ${match.student_name || 'another student'} (${match.student_id}) in Class ${cleanClass}.`,
          student: match,
        },
        { status: 200 }
      );
    }

    // 2. Also check in student_enrollments / classes table
    const classNameWithPrefix = `Class ${cleanClass}`;
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .or(`class_name.eq.${classNameWithPrefix},class_name.eq.${cleanClass}`)
      .maybeSingle();

    if (classData) {
      let enrollQuery = supabase
        .from('student_enrollments')
        .select(`
          student_id,
          roll_number,
          students (
            student_name,
            status
          )
        `)
        .eq('class_id', classData.id)
        .eq('roll_number', rollInt);

      if (excludeStudentId) {
        enrollQuery = enrollQuery.neq('student_id', excludeStudentId);
      }

      const { data: enrollMatches, error: enrollError } = await enrollQuery;

      if (enrollError) {
        console.error('Check roll enrollments query error:', enrollError);
      }

      if (enrollMatches && enrollMatches.length > 0) {
        const match = enrollMatches[0];
        const studentName = match.students?.student_name || 'another student';
        return Response.json(
          {
            exists: true,
            message: `Roll No. ${rollInt} is already assigned to ${studentName} (${match.student_id}) in Class ${cleanClass}.`,
            student: {
              student_id: match.student_id,
              student_name: studentName,
              class: cleanClass,
              roll_no: rollInt,
            },
          },
          { status: 200 }
        );
      }
    }

    return Response.json({ exists: false }, { status: 200 });
  } catch (error) {
    console.error('check-roll-no API error:', error);
    return Response.json(
      { exists: false, error: error.message },
      { status: 500 }
    );
  }
}
