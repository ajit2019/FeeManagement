import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('StudentDetails')
      .select('*')
      .limit(1);

    if (error) {
      return Response.json({ success: false, error: error.message });
    }

    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    return Response.json({ success: true, columns, sample: data?.[0] || null });
  } catch (err) {
    return Response.json({ success: false, error: err.message });
  }
}
