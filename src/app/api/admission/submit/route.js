import { createClient } from '@supabase/supabase-js';

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validateAdmissionPayload(payload) {
  const errors = {};

  if (!payload.StudentID || typeof payload.StudentID !== 'string') {
    errors.StudentID = 'StudentID is required.';
  }

  if (!payload.StudentName || typeof payload.StudentName !== 'string') {
    errors.StudentName = 'StudentName is required.';
  }

  if (!payload.FatherName || typeof payload.FatherName !== 'string') {
    errors.FatherName = 'FatherName is required.';
  }

  if (!payload.MotherName || typeof payload.MotherName !== 'string') {
    errors.MotherName = 'MotherName is required.';
  }

  if (!payload.Address || typeof payload.Address !== 'string') {
    errors.Address = 'Address is required.';
  }

  if (!payload.PhoneNumber || typeof payload.PhoneNumber !== 'string') {
    errors.PhoneNumber = 'PhoneNumber is required.';
  } else if (!/^\d{10}$/.test(payload.PhoneNumber)) {
    errors.PhoneNumber = 'PhoneNumber must be a 10-digit number.';
  }

  if (!isValidDate(payload.DateOfAdmission)) {
    errors.DateOfAdmission = 'DateOfAdmission must be a valid date.';
  }

  if (!isValidDate(payload.DOB)) {
    errors.DOB = 'DOB must be a valid date.';
  }

  if (payload.Class === null || payload.Class === undefined || payload.Class === '') {
    errors.Class = 'Class is required.';
  } else if (!Number.isInteger(payload.Class) || payload.Class <= 0) {
    errors.Class = 'Class must be a positive integer.';
  }

  if (
    payload.RollNo !== null &&
    payload.RollNo !== undefined &&
    payload.RollNo !== '' &&
    (!Number.isInteger(payload.RollNo) || payload.RollNo <= 0)
  ) {
    errors.RollNo = 'RollNo must be a positive integer.';
  }

  if (
    payload.TotalAnnualFees === null ||
    payload.TotalAnnualFees === undefined ||
    payload.TotalAnnualFees === ''
  ) {
    errors.TotalAnnualFees = 'TotalAnnualFees is required.';
  } else if (Number.isNaN(payload.TotalAnnualFees) || payload.TotalAnnualFees < 0) {
    errors.TotalAnnualFees = 'TotalAnnualFees must be a valid non-negative number.';
  }

  if (typeof payload.TC_Submitted !== 'boolean') {
    errors.TC_Submitted = 'TC_Submitted must be boolean.';
  }

  if (typeof payload.BirthCertificateSubmitted !== 'boolean') {
    errors.BirthCertificateSubmitted = 'BirthCertificateSubmitted must be boolean.';
  }

  return errors;
}

export async function POST(request) {
  try {
    const formData = await request.json();
    const validationErrors = validateAdmissionPayload(formData);

    if (Object.keys(validationErrors).length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Validation failed.',
          validationErrors,
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Insert form data into the 'admissions' table
    const { data, error } = await supabase
      .from('StudentDetails')
      .insert([
        {
          ...formData,
        },
      ])
      .select();

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
        message: 'Admission form submitted successfully!',
        data: data[0],
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
