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

    const { data, error } = await supabase
      .from('StudentDetails')
      .select('StudentID, StudentName, FatherName, MotherName, Class')
      .eq('StudentID', studentID)
      .maybeSingle();

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return Response.json(
        { success: false, error: 'Student not found.' },
        { status: 404 }
      );
    }

    // Fetch latest balance from summary view (if available).
    const { data: summaryData } = await supabase
      .from('studentfinancialsummary')
      .select('balance')
      .eq('StudentID', studentID)
      .maybeSingle();

    return Response.json(
      {
        success: true,
        data: {
          StudentID: data.StudentID,
          StudentName: data.StudentName ?? '',
          fatherMotherName: [data.FatherName, data.MotherName].filter(Boolean).join(' / '),
          Class: data.Class ?? '',
          balance: summaryData?.balance ?? 0,
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
