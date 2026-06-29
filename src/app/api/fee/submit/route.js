import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function toNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function normalizePayload(payload) {
  return {
    StudentID: payload.StudentID ?? payload.studentID ?? null,
    Date: payload.Date ?? payload.date ?? null,
    StudentName: payload.StudentName ?? payload.studentName ?? null,
    Class: payload.Class ?? payload.class ?? null,
    MonthFee: toNonNegativeNumber(payload.MonthFee ?? payload.monthFee),
    AdmissionFee: toNonNegativeNumber(payload.AdmissionFee ?? payload.admissionFee),
    BooksStationary: toNonNegativeNumber(payload.BooksStationary ?? payload.booksStationary),
  };
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const normalized = normalizePayload(payload);

    if (!normalized.StudentID) {
      return Response.json(
        { success: false, error: 'StudentID is required.' },
        { status: 400 }
      );
    }

    if (!isValidDate(normalized.Date)) {
      return Response.json(
        { success: false, error: 'Date must be a valid date.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Resolve current academic year from student's latest enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from('student_enrollments')
      .select('academic_year')
      .eq('student_id', normalized.StudentID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollErr) {
      console.error('Error fetching enrollment:', enrollErr);
    }

    const academicYear = enrollment?.academic_year || '2026-2027';
    const datePaid = normalized.Date;
    const dateObj = new Date(datePaid);
    const monthPaid = dateObj.toLocaleString('default', { month: 'short' }); // e.g. "Jun"

    const transactionsToInsert = [];

    if (normalized.MonthFee > 0) {
      transactionsToInsert.push({
        student_id: normalized.StudentID,
        academic_year: academicYear,
        date_paid: datePaid,
        fee_head: 'Monthly Tuition',
        month_paid: monthPaid,
        amount_received: normalized.MonthFee,
        collected_by: 'Account Manager',
      });
    }

    if (normalized.AdmissionFee > 0) {
      transactionsToInsert.push({
        student_id: normalized.StudentID,
        academic_year: academicYear,
        date_paid: datePaid,
        fee_head: 'Admission Fee',
        month_paid: monthPaid,
        amount_received: normalized.AdmissionFee,
        collected_by: 'Account Manager',
      });
    }

    if (normalized.BooksStationary > 0) {
      transactionsToInsert.push({
        student_id: normalized.StudentID,
        academic_year: academicYear,
        date_paid: datePaid,
        fee_head: 'Books/Stationary',
        month_paid: monthPaid,
        amount_received: normalized.BooksStationary,
        collected_by: 'Account Manager',
      });
    }

    if (transactionsToInsert.length === 0) {
      return Response.json(
        { success: false, error: 'At least one fee head must be greater than zero.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('fee_transactions')
      .insert(transactionsToInsert)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Fetch all transactions to compute the correct sequential slip number
    const { data: allTxs, error: allTxsErr } = await supabase
      .from('fee_transactions')
      .select('id, student_id, date_paid, created_at');

    let slipNo = `SICF-${data[0].id.split('-')[0].toUpperCase()}`;
    if (!allTxsErr && allTxs) {
      const { slipMap } = getSequentialSlips(allTxs);
      slipNo = slipMap.get(data[0].id) || slipNo;
    }

    return Response.json(
      {
        success: true,
        message: 'Fee submitted successfully!',
        data: {
          SlipNo: slipNo,
          transactions: data,
        },
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

