import { createClient } from '@supabase/supabase-js';
import { sortClasses } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status') || 'active'; // 'active' or 'all'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Fetch students with enrollment fee information
    const { data: students, error: studentsError } = await supabase
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
      `);

    if (studentsError) {
      return Response.json(
        { success: false, error: studentsError.message },
        { status: 400 }
      );
    }

    // 2. Fetch all fee transactions up to today's date
    const today = new Date().toISOString().split('T')[0];
    const { data: transactions, error: txError } = await supabase
      .from('fee_transactions')
      .select('student_id, amount_received, date_paid');

    if (txError) {
      return Response.json(
        { success: false, error: txError.message },
        { status: 400 }
      );
    }

    // Map received amounts per student (only include transactions till today's date)
    const studentReceivedMap = {};
    (transactions || []).forEach((tx) => {
      if (!tx.date_paid || tx.date_paid <= today) {
        const id = tx.student_id;
        const amt = Number(tx.amount_received || 0);
        studentReceivedMap[id] = (studentReceivedMap[id] || 0) + amt;
      }
    });

    // 3. Filter students based on status
    const filteredStudents = (students || []).filter((s) => {
      const st = (s.status || 'active').toLowerCase().trim();
      if (filterStatus === 'all') {
        return st !== 'left';
      }
      // Default: active only
      return st === 'active';
    });

    // 4. Compute totals and class-wise aggregates
    let totalAnnualRevenue = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    const classMap = {};

    filteredStudents.forEach((student) => {
      const rawClass = student.class ? String(student.class).replace(/^Class\s+/i, '').trim() : 'Unassigned';
      const className = rawClass || 'Unassigned';

      const annualFee = Number(
        student.total_annual_fees ||
        student.student_enrollments?.[0]?.total_annual_fee ||
        0
      );
      const received = Number(studentReceivedMap[student.student_id] || 0);
      const balance = annualFee - received;

      totalAnnualRevenue += annualFee;
      totalReceived += received;
      totalBalance += balance;

      if (!classMap[className]) {
        classMap[className] = {
          className,
          studentCount: 0,
          totalAnnual: 0,
          totalReceived: 0,
          balance: 0,
        };
      }

      classMap[className].studentCount += 1;
      classMap[className].totalAnnual += annualFee;
      classMap[className].totalReceived += received;
      classMap[className].balance += balance;
    });

    // Sort classes
    const uniqueClassNames = Object.keys(classMap);
    const sortedClassNames = sortClasses(uniqueClassNames);

    const classBreakdown = sortedClassNames.map((cls) => {
      const item = classMap[cls];
      const collectionRate = item.totalAnnual > 0
        ? Math.min(100, Math.round((item.totalReceived / item.totalAnnual) * 100))
        : 0;

      return {
        class: item.className,
        studentCount: item.studentCount,
        totalAnnual: item.totalAnnual,
        totalReceived: item.totalReceived,
        balance: item.balance,
        collectionRate,
      };
    });

    const collectionRatePercentage = totalAnnualRevenue > 0
      ? Number(((totalReceived / totalAnnualRevenue) * 100).toFixed(1))
      : 0;

    return Response.json(
      {
        success: true,
        asOfDate: today,
        filterStatus,
        summary: {
          totalAnnualRevenue,
          totalReceived,
          totalBalance,
          studentCount: filteredStudents.length,
          classesCount: classBreakdown.length,
          collectionRatePercentage,
        },
        classBreakdown,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
