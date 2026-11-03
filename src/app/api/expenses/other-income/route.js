import { createClient } from '@supabase/supabase-js';
import { localDb, isMissingTableError } from '@/lib/localExpensesDb';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// POST /api/expenses/other-income
export async function POST(request) {
  try {
    const {
      date,
      receipt_from,
      receipt_to,
      receipt_no,
      head,
      payment_mode,
      source_title,
      amount,
      remarks,
    } = await request.json();

    if (!date) {
      return Response.json({ success: false, error: 'Date is required.' }, { status: 400 });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return Response.json({ success: false, error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    // Build the receipt range string if from/to are provided
    let finalReceiptNo = receipt_no ? String(receipt_no).trim() : '';
    if (!finalReceiptNo && (receipt_from || receipt_to)) {
      const fromStr = String(receipt_from || '').trim();
      const toStr = String(receipt_to || '').trim();
      if (fromStr && toStr) {
        finalReceiptNo = `${fromStr} to ${toStr}`;
      } else {
        finalReceiptNo = fromStr || toStr;
      }
    }

    const finalHead = head || payment_mode || 'Online';
    const finalTitle = source_title ? String(source_title).trim() : 'Fee / Income Collection';

    const insertData = {
      date,
      source_title: finalTitle,
      receipt_no: finalReceiptNo || null,
      amount: amt,
      payment_mode: finalHead,
      remarks: remarks ? String(remarks).trim() : null,
    };

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('other_income')
      .insert([insertData])
      .select();

    if (error && isMissingTableError(error)) {
      // Fallback: save to local persistent store
      const localRecord = localDb.insertOtherIncome(insertData);
      return Response.json({
        success: true,
        data: localRecord,
        storage: 'local',
        needsSetup: true,
        message: 'Income entry added to local database (Supabase table setup pending).',
      });
    }

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      data: data?.[0],
      storage: 'supabase',
      needsSetup: false,
      message: 'Income entry added successfully.',
    });
  } catch (err) {
    console.error('Other Income POST error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/expenses/other-income?id=...
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ success: false, error: 'ID is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('other_income')
      .delete()
      .eq('id', id);

    // Also remove from local database if it was saved locally
    localDb.deleteOtherIncome(id);

    if (error && !isMissingTableError(error)) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Income entry deleted.',
    });
  } catch (err) {
    console.error('Other Income DELETE error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
