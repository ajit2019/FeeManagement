import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('year_string', { ascending: false });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { year_string, is_active } = await request.json();

    if (!year_string || !/^\d{4}-\d{4}$/.test(year_string)) {
      return Response.json(
        { success: false, error: 'Valid year string (e.g., 2026-2027) is required.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (is_active) {
      // Toggle all other sessions to inactive
      await supabase
        .from('academic_years')
        .update({ is_active: false })
        .not('year_string', 'eq', year_string);
    }

    const { data, error } = await supabase
      .from('academic_years')
      .upsert({ year_string, is_active: !!is_active }, { onConflict: 'year_string' })
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
