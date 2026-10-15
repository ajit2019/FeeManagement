import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET /api/expenses?month=2026-10 or ?date=2026-10-01
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const date = searchParams.get('date');   // YYYY-MM-DD

    const supabase = getSupabase();
    let query = supabase
      .from('expense_vouchers')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    } else if (month) {
      // Filter for month range
      const [year, m] = month.split('-').map(Number);
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      const nextMonthYear = m === 12 ? year + 1 : year;
      const nextMonthM = m === 12 ? 1 : m + 1;
      const endDate = `${nextMonthYear}-${String(nextMonthM).padStart(2, '0')}-01`;

      query = query.gte('date', startDate).lt('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      // Check if table missing
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json({
          success: false,
          needsSetup: true,
          error: "Table 'expense_vouchers' does not exist yet. Please run the SQL setup script in Supabase.",
        }, { status: 200 });
      }
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      expenses: data || [],
    });
  } catch (err) {
    console.error('API Expenses GET error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      voucher_no,
      date,
      paid_to,
      amount,
      purpose,
      expense_head,
      payment_mode,
      reference_no,
      remarks,
    } = body;

    if (!date) {
      return Response.json({ success: false, error: 'Date is required.' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ success: false, error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    if (!expense_head) {
      return Response.json({ success: false, error: 'Expense Head is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const insertData = {
      voucher_no: voucher_no ? String(voucher_no).trim() : null,
      date,
      paid_to: paid_to ? String(paid_to).trim() : '',
      amount: parsedAmount,
      purpose: purpose ? String(purpose).trim() : '',
      expense_head: String(expense_head).trim(),
      payment_mode: payment_mode || 'Cash',
      reference_no: reference_no ? String(reference_no).trim() : null,
      remarks: remarks ? String(remarks).trim() : null,
    };

    const { data, error } = await supabase
      .from('expense_vouchers')
      .insert([insertData])
      .select();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json({
          success: false,
          needsSetup: true,
          error: "Table 'expense_vouchers' does not exist yet. Please run the SQL setup script in Supabase.",
        }, { status: 400 });
      }
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      voucher: data?.[0],
      message: 'Expense voucher saved successfully.',
    });
  } catch (err) {
    console.error('API Expenses POST error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/expenses
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return Response.json({ success: false, error: 'ID is required for update.' }, { status: 400 });
    }

    if (updateFields.amount !== undefined) {
      const amt = Number(updateFields.amount);
      if (isNaN(amt) || amt <= 0) {
        return Response.json({ success: false, error: 'Amount must be a positive number.' }, { status: 400 });
      }
      updateFields.amount = amt;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('expense_vouchers')
      .update(updateFields)
      .eq('id', id)
      .select();

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      voucher: data?.[0],
      message: 'Expense updated successfully.',
    });
  } catch (err) {
    console.error('API Expenses PUT error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/expenses?id=...
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('expense_vouchers')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Expense voucher deleted successfully.',
    });
  } catch (err) {
    console.error('API Expenses DELETE error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
