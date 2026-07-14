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
    
    const sortClasses = (arr) => {
      return [...new Set(arr.map(c => c ? String(c).replace(/^Class\s+/i, '').trim() : ''))]
        .filter(Boolean)
        .sort((a, b) => {
          const isANum = !isNaN(a) && a !== '';
          const isBNum = !isNaN(b) && b !== '';
          if (isANum && isBNum) return Number(a) - Number(b);
          if (isANum) return -1;
          if (isBNum) return 1;
          return a.localeCompare(b);
        });
    };

    // First try the VIEW_NAME
    const { data: classesData, error: classesError } = await supabase
      .from(VIEW_NAME)
      .select('Class');

    if (!classesError && classesData) {
      classes = sortClasses(classesData.map((row) => row.Class));
    } else {
      // Fallback: fetch from students table
      const { data: studentsForClasses, error: studentsClassesError } = await supabase
        .from('students')
        .select('class')
        .not('class', 'is', null);
      if (!studentsClassesError && studentsForClasses) {
        classes = sortClasses(studentsForClasses.map(s => s.class));
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
    const classValue = selectedClass;
    const { data: viewStudents, error: viewStudentsError } = await supabase
      .from(VIEW_NAME)
      .select('StudentID, Class, StudentName, TotalAnnualFees, totalreceived, balance')
      .eq('Class', classValue)
      .order('StudentName', { ascending: true });

    if (!viewStudentsError && viewStudents) {
      // Fetch statuses and other details to append
      const { data: studentStatuses } = await supabase
        .from('students')
        .select('student_id, status, roll_no, father_name, mother_name, mobile_no, aadhar_number')
        .eq('class', classValue);

      const detailsMap = {};
      if (studentStatuses) {
        studentStatuses.forEach(s => {
          detailsMap[s.student_id] = {
            Status: s.status || 'active',
            RollNo: s.roll_no || '',
            FatherName: s.father_name || '',
            MotherName: s.mother_name || '',
            MobileNo: s.mobile_no || '',
            AadharNo: s.aadhar_number || ''
          };
        });
      }

      const finalStudents = viewStudents.map(student => {
        const details = detailsMap[student.StudentID] || {
          Status: 'active',
          RollNo: '',
          FatherName: '',
          MotherName: '',
          MobileNo: '',
          AadharNo: ''
        };
        let totalAnnual = Number(student.TotalAnnualFees || 0);
        let received = Number(student.totalreceived || 0);
        let balance = Number(student.balance || 0);

        if (details.Status === 'left') {
          totalAnnual = received;
          balance = 0;
        }

        return {
          ...student,
          Status: details.Status,
          RollNo: details.RollNo,
          FatherName: details.FatherName,
          MotherName: details.MotherName,
          MobileNo: details.MobileNo,
          AadharNo: details.AadharNo,
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
        roll_no,
        father_name,
        mother_name,
        mobile_no,
        aadhar_number,
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
        Status: status,
        RollNo: student.roll_no || '',
        FatherName: student.father_name || '',
        MotherName: student.mother_name || '',
        MobileNo: student.mobile_no || '',
        AadharNo: student.aadhar_number || ''
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
