import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tables = ['students', 'StudentDetails', 'FeeDetails', 'fee_transactions', 'student_fee_balances', 'studentfinancialsummary'];
    const results = {};

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      results[table] = {
        exists: !error,
        error: error ? error.message : null,
        count: data ? data.length : 0,
        columns: data && data.length > 0 ? Object.keys(data[0]) : [],
        sample: data && data.length > 0 ? data[0] : null
      };
    }

    return Response.json({
      success: true,
      results
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
