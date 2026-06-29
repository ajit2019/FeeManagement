import { createClient } from '@supabase/supabase-js';

function getNextStudentID(studentIds) {
  if (!studentIds || studentIds.length === 0) {
    return 'SIC-1';
  }

  let maxNum = 0;
  studentIds.forEach(row => {
    const id = row.student_id;
    if (id && typeof id === 'string') {
      const match = id.match(/^SIC-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  return `SIC-${maxNum + 1}`;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('students')
      .select('student_id');

    if (error) {
      console.error('Supabase error:', error);
      return Response.json(
        { success: false, error: error.message, StudentID: 'SIC-1' },
        { status: 400 }
      );
    }

    const nextStudentID = getNextStudentID(data);

    return Response.json(
      { success: true, StudentID: nextStudentID },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message, StudentID: 'SIC-1' },
      { status: 500 }
    );
  }
}

