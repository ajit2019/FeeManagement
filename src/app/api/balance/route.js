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

    const { data: classesData, error: classesError } = await supabase
      .from(VIEW_NAME)
      .select('Class')
      .order('Class', { ascending: true });

    if (classesError) {
      return Response.json(
        { success: false, error: classesError.message },
        { status: 400 }
      );
    }

    const classes = [...new Set((classesData || []).map((row) => row.Class).filter(Boolean))];

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

    const classValue = Number(selectedClass);
    if (!Number.isInteger(classValue)) {
      return Response.json(
        { success: false, error: 'Class must be a valid integer.' },
        { status: 400 }
      );
    }

    const { data: students, error: studentsError } = await supabase
      .from(VIEW_NAME)
      .select('StudentID, Class, StudentName, TotalAnnualFees, totalreceived, balance')
      .eq('Class', classValue)
      .order('StudentName', { ascending: true });

    if (studentsError) {
      return Response.json(
        { success: false, error: studentsError.message },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        classes,
        students: students || [],
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
