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

    const { data, error } = await supabase
      .from('FeeDetails')
      .select('*')
      .eq('StudentID', studentID.trim())
      .order('Date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        studentID: studentID.trim(),
        records: data ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
