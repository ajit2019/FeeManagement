import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID');

    if (!studentID) {
      return Response.json(
        { success: false, error: 'studentID is required.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch student profile and parents info
    let studentIDToQuery = studentID;
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        father_name,
        mother_name,
        status,
        parents_guardian (father_name, mother_name)
      `)
      .ilike('student_id', studentIDToQuery)
      .maybeSingle();

    if (!student && /^\d+$/.test(studentID)) {
      const fallbackID = `SIC-${studentID}`;
      const { data: studentFallback, error: fallbackError } = await supabase
        .from('students')
        .select(`
          student_id,
          student_name,
          father_name,
          mother_name,
          status,
          parents_guardian (father_name, mother_name)
        `)
        .ilike('student_id', fallbackID)
        .maybeSingle();

      if (studentFallback) {
        student = studentFallback;
        studentIDToQuery = fallbackID;
      }
    }

    if (studentError) {
      return Response.json(
        { success: false, error: studentError.message },
        { status: 400 }
      );
    }

    if (!student) {
      return Response.json(
        { success: false, error: 'Student not found.' },
        { status: 404 }
      );
    }

    // Fetch latest balance and class details from the view
    const { data: balanceData } = await supabase
      .from('student_fee_balances')
      .select('class_assigned, remaining_balance')
      .ilike('student_id', studentIDToQuery)
      .maybeSingle();


    const parent = student.parents_guardian?.[0];
    const fatherName = student.father_name || parent?.father_name;
    const motherName = student.mother_name || parent?.mother_name;
    const fatherMotherName = [fatherName, motherName]
      .filter(Boolean)
      .join(' / ');

    const status = student.status || 'active';
    let balance = balanceData?.remaining_balance ?? 0;
    if (status === 'left') {
      balance = 0;
    }

    return Response.json(
      {
        success: true,
        data: {
          StudentID: student.student_id,
          StudentName: student.student_name || '',
          fatherMotherName: fatherMotherName || '',
          Class: balanceData?.class_assigned ? balanceData.class_assigned.replace(/^Class\s+/i, '') : (student.class || 'Not Enrolled'),
          balance: balance,
          status: status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

