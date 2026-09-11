import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID');

    if (!studentID || !studentID.trim()) {
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
    let studentIDToQuery = studentID.trim();
    let { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        father_name,
        mother_name,
        status,
        class,
        total_annual_fees,
        parents_guardian (father_name, mother_name)
      `)
      .ilike('student_id', studentIDToQuery)
      .maybeSingle();

    if (!student && /^\d+$/.test(studentIDToQuery)) {
      const fallbackID = `SIC-${studentIDToQuery}`;
      const { data: studentFallback, error: fallbackError } = await supabase
        .from('students')
        .select(`
          student_id,
          student_name,
          father_name,
          mother_name,
          status,
          class,
          total_annual_fees,
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
      .select('class_assigned, remaining_balance, total_annual_fee, total_received')
      .ilike('student_id', studentIDToQuery)
      .maybeSingle();

    const parent = student.parents_guardian?.[0];
    const fatherName = student.father_name || parent?.father_name;
    const motherName = student.mother_name || parent?.mother_name;
    const fatherMotherName = [fatherName, motherName]
      .filter(Boolean)
      .join(' / ');

    const status = student.status || 'active';

    let balance = 0;
    if (status === 'left') {
      balance = 0;
    } else if (balanceData && balanceData.remaining_balance !== undefined && balanceData.remaining_balance !== null) {
      balance = Number(balanceData.remaining_balance);
    } else {
      // Fallback calculation: total annual fees minus sum of paid fee transactions
      const totalFee = Number(student.total_annual_fees || 0);
      const { data: txs } = await supabase
        .from('fee_transactions')
        .select('amount_received')
        .ilike('student_id', student.student_id);

      const totalReceived = (txs || []).reduce((sum, tx) => sum + (Number(tx.amount_received) || 0), 0);
      balance = Math.max(0, totalFee - totalReceived);
    }

    const rawClass = balanceData?.class_assigned || student.class || 'Not Enrolled';
    const cleanClass = String(rawClass).replace(/^Class\s+/i, '').trim();

    return Response.json(
      {
        success: true,
        data: {
          StudentID: student.student_id,
          StudentName: student.student_name || '',
          fatherMotherName: fatherMotherName || '',
          Class: cleanClass,
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


