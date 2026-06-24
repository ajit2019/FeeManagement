import { createClient } from '@supabase/supabase-js';

const VIEW_NAME = 'studentfinancialsummary';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedClass = searchParams.get('class');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch classes list (distinct classes from students or views)
    let classes = [];
    
    // First try the VIEW_NAME
    const { data: classesData, error: classesError } = await supabase
      .from(VIEW_NAME)
      .select('Class')
      .order('Class', { ascending: true });

    if (!classesError && classesData) {
      classes = [...new Set(classesData.map((row) => row.Class).filter(row => row !== null && row !== undefined))];
    } else {
      // Fallback: fetch from students table
      const { data: studentsForClasses, error: studentsClassesError } = await supabase
        .from('students')
        .select('class')
        .not('class', 'is', null);
      if (!studentsClassesError && studentsForClasses) {
        classes = [...new Set(studentsForClasses.map(s => s.class))].sort((a, b) => Number(a) - Number(b));
      }
    }

    if (!selectedClass) {
      return Response.json(
        {
          success: true,
          classes,
          students: [],
        },
        { status: 200 }
      );
    }

    // Try fetching students from VIEW_NAME
    const classValue = Number(selectedClass);
    const { data: viewStudents, error: viewStudentsError } = await supabase
      .from(VIEW_NAME)
      .select('StudentID, Class, StudentName, TotalAnnualFees, totalreceived, balance')
      .eq('Class', classValue)
      .order('StudentName', { ascending: true });

    if (!viewStudentsError && viewStudents) {
      // Fetch statuses to append and modify fee details
      const { data: studentStatuses } = await supabase
        .from('students')
        .select('student_id, status')
        .eq('class', classValue);

      const statusMap = {};
      if (studentStatuses) {
        studentStatuses.forEach(s => {
          statusMap[s.student_id] = s.status || 'active';
        });
      }

      const finalStudents = viewStudents.map(student => {
        const status = statusMap[student.StudentID] || 'active';
        let totalAnnual = Number(student.TotalAnnualFees || 0);
        let received = Number(student.totalreceived || 0);
        let balance = Number(student.balance || 0);

        if (status === 'left') {
          totalAnnual = received;
          balance = 0;
        }

        return {
          ...student,
          Status: status,
          TotalAnnualFees: totalAnnual,
          totalreceived: received,
          balance: balance
        };
      });

      return Response.json(
        {
          success: true,
          classes,
          students: finalStudents,
        },
        { status: 200 }
      );
    }

    // Fallback: Compute student financial summary manually
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        class,
        total_annual_fees,
        status,
        student_enrollments (
          total_annual_fee
        )
      `)
      .eq('class', classValue);

    if (studentsError) {
      return Response.json(
        { success: false, error: studentsError.message },
        { status: 400 }
      );
    }

    // Fetch all transactions to calculate received amounts
    const { data: txs } = await supabase
      .from('fee_transactions')
      .select('student_id, amount_received');

    // Sum transaction amounts by student_id
    const receivedMap = {};
    if (txs) {
      txs.forEach(tx => {
        const id = tx.student_id;
        const amt = Number(tx.amount_received || 0);
        receivedMap[id] = (receivedMap[id] || 0) + amt;
      });
    }

    const calculatedStudents = (studentsData || []).map(student => {
      const status = student.status || 'active';
      const received = Number(receivedMap[student.student_id] || 0);
      let totalAnnual = Number(student.total_annual_fees || (student.student_enrollments?.[0]?.total_annual_fee) || 0);
      let balance = totalAnnual - received;

      if (status === 'left') {
        totalAnnual = received;
        balance = 0;
      }

      return {
        StudentID: student.student_id,
        StudentName: student.student_name || 'Unnamed',
        Class: student.class,
        TotalAnnualFees: totalAnnual,
        totalreceived: received,
        balance: balance,
        Status: status
      };
    });

    // Sort by StudentName ascending
    calculatedStudents.sort((a, b) => (a.StudentName || '').localeCompare(b.StudentName || ''));

    return Response.json(
      {
        success: true,
        classes,
        students: calculatedStudents,
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
