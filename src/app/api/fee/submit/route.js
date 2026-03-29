import { createClient } from '@supabase/supabase-js';

const MONTH_COLUMNS = [
  'AprilFee',
  'MayFee',
  'JuneFee',
  'JulyFee',
  'AugustFee',
  'SeptFee',
  'OctFee',
  'NovFee',
  'DecFee',
  'JanFee',
  'FebFee',
  'MarchFee',
];

function getMonthColumnByDate(dateValue) {
  // Parse YYYY-MM-DD safely to avoid timezone shifts.
  const parts = String(dateValue).split('-');
  const monthIndex = parts.length >= 2 ? Number(parts[1]) - 1 : new Date(dateValue).getMonth();
  const byCalendarMonth = {
    0: 'JanFee',
    1: 'FebFee',
    2: 'MarchFee',
    3: 'AprilFee',
    4: 'MayFee',
    5: 'JuneFee',
    6: 'JulyFee',
    7: 'AugustFee',
    8: 'SeptFee',
    9: 'OctFee',
    10: 'NovFee',
    11: 'DecFee',
  };
  return byCalendarMonth[monthIndex];
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function toNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return Number.NaN;
  return parsed;
}

function generateNextSlipNo(lastSlipNo) {
  if (!lastSlipNo || typeof lastSlipNo !== 'string') {
    return 'SICF-00001';
  }

  const match = lastSlipNo.match(/^SICF-(\d{5})$/);
  if (!match) return 'SICF-00001';

  const nextNumber = parseInt(match[1], 10) + 1;
  return `SICF-${String(nextNumber).padStart(5, '0')}`;
}

function normalizePayload(payload) {
  // Accept either exact DB names or friendlier camelCase keys.
  return {
    StudentID: payload.StudentID ?? payload.studentID ?? null,
    Date: payload.Date ?? payload.date ?? null,
    StudentName: payload.StudentName ?? payload.studentName ?? null,
    'Father/Mother Name':
      payload['Father/Mother Name'] ??
      payload.fatherMotherName ??
      payload.parentName ??
      null,
    Class: payload.Class ?? payload.class ?? null,
    MonthFee: payload.MonthFee ?? payload.monthFee ?? null,
    AdmissionFee: payload.AdmissionFee ?? payload.admissionFee ?? null,
    BooksStationary: payload.BooksStationary ?? payload.booksStationary ?? null,
    TotalReceived: payload.TotalReceived ?? payload.totalReceived ?? null,
  };
}

function validateAndSanitize(data) {
  const errors = {};

  if (!data.StudentID || typeof data.StudentID !== 'string') {
    errors.StudentID = 'StudentID is required.';
  }

  if (!isValidDate(data.Date)) {
    errors.Date = 'Date must be a valid date.';
  }

  if (!data.StudentName || typeof data.StudentName !== 'string') {
    errors.StudentName = 'StudentName is required.';
  }

  if (!data['Father/Mother Name'] || typeof data['Father/Mother Name'] !== 'string') {
    errors['Father/Mother Name'] = 'Father/Mother Name is required.';
  }

  const classValue = Number(data.Class);
  if (!Number.isInteger(classValue) || classValue <= 0) {
    errors.Class = 'Class must be a positive integer.';
  }

  const sanitized = {
    StudentID: data.StudentID,
    Date: data.Date,
    StudentName: data.StudentName,
    'Father/Mother Name': data['Father/Mother Name'],
    Class: Number.isInteger(classValue) ? classValue : null,
  };

  const monthFeeValue = toNonNegativeNumber(data.MonthFee);
  if (Number.isNaN(monthFeeValue)) {
    errors.MonthFee = 'MonthFee must be a non-negative number.';
  }

  const monthColumn = getMonthColumnByDate(data.Date);
  MONTH_COLUMNS.forEach((column) => {
    sanitized[column] = null;
  });
  if (monthColumn) {
    sanitized[monthColumn] = monthFeeValue;
  }

  const admissionFeeValue = toNonNegativeNumber(data.AdmissionFee);
  if (Number.isNaN(admissionFeeValue)) {
    errors.AdmissionFee = 'AdmissionFee must be a non-negative number.';
  }
  sanitized.AdmissionFee = admissionFeeValue;

  const booksStationaryValue = toNonNegativeNumber(data.BooksStationary);
  if (Number.isNaN(booksStationaryValue)) {
    errors.BooksStationary = 'BooksStationary must be a non-negative number.';
  }
  sanitized.BooksStationary = booksStationaryValue;

  const computedTotal =
    (monthFeeValue || 0) +
    (admissionFeeValue || 0) +
    (booksStationaryValue || 0);

  const providedTotal = toNonNegativeNumber(data.TotalReceived);
  if (Number.isNaN(providedTotal)) {
    errors.TotalReceived = 'TotalReceived must be a non-negative number.';
  }
  sanitized.TotalReceived = providedTotal ?? computedTotal;

  return { errors, sanitized };
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const normalized = normalizePayload(payload);
    const { errors, sanitized } = validateAndSanitize(normalized);

    if (Object.keys(errors).length > 0) {
      return Response.json(
        { success: false, error: 'Validation failed.', validationErrors: errors },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: lastRow, error: readError } = await supabase
      .from('FeeDetails')
      .select('SlipNo')
      .order('SlipNo', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readError) {
      console.error('Supabase read error:', readError);
      return Response.json(
        { success: false, error: readError.message },
        { status: 400 }
      );
    }

    const nextSlipNo = generateNextSlipNo(lastRow?.SlipNo);

    const { data, error } = await supabase
      .from('FeeDetails')
      .insert([{ SlipNo: nextSlipNo, ...sanitized }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Fee submitted successfully!',
        data,
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
