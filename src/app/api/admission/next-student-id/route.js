import { createClient } from '@supabase/supabase-js';

function getNextStudentID(lastStudentID) {
  if (!lastStudentID || typeof lastStudentID !== 'string') {
    return 'SIC-00001';
  }

  const match = lastStudentID.match(/^SIC-(\d{5})$/);
  if (!match) {
    return 'SIC-00001';
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `SIC-${String(nextNumber).padStart(5, '0')}`;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('StudentDetails')
      .select('StudentID')
      .order('StudentID', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return Response.json(
        { success: false, error: error.message, StudentID: 'SIC-00001' },
        { status: 400 }
      );
    }

    const nextStudentID = getNextStudentID(data?.StudentID);

    return Response.json(
      { success: true, StudentID: nextStudentID },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message, StudentID: 'SIC-00001' },
      { status: 500 }
    );
  }
}
