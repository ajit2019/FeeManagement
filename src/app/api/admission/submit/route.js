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

  if (payload.Class === null || payload.Class === undefined || payload.Class === '') {
    errors.Class = 'Class is required.';
  }

  // Validate optional fields only if they are provided
  if (payload.PhoneNumber) {
    if (!/^\d{10}$/.test(payload.PhoneNumber)) {
      errors.PhoneNumber = 'PhoneNumber must be a 10-digit number.';
    }
  }

  if (payload.DateOfAdmission && !isValidDate(payload.DateOfAdmission)) {
    errors.DateOfAdmission = 'DateOfAdmission must be a valid date.';
  }

  if (payload.DOB && !isValidDate(payload.DOB)) {
    errors.DOB = 'DOB must be a valid date.';
  }

  if (
    payload.TotalAnnualFees !== null &&
    payload.TotalAnnualFees !== undefined &&
    payload.TotalAnnualFees !== ''
  ) {
    const feeVal = Number(payload.TotalAnnualFees);
    if (Number.isNaN(feeVal) || feeVal < 0) {
      errors.TotalAnnualFees = 'TotalAnnualFees must be a valid non-negative number.';
    }
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Insert into students table using current schema columns (and fallback column names)
    const { error: studentError } = await supabase
      .from('students')
      .insert([
        {
          student_id: formData.StudentID,
          student_name: formData.StudentName || null,
          date_of_birth: formData.DOB,
          admission_date: formData.DateOfAdmission || new Date().toISOString().split('T')[0],
          aadhar_number: formData.AadharNo || null,
          nationality: formData.Nationality || 'Indian',
          religion: formData.Religion || null,
          caste: formData.Caste || null,
          category: formData.Category || null,
          address: formData.Address || null,
          last_school: formData.LastSchoolName || null,
          last_school_name: formData.LastSchoolName || null,
          has_transfer_certificate: !!formData.TC_Submitted,
          has_birth_certificate: !!formData.BirthCertificateSubmitted,
          tc_submitted: formData.TC_Submitted === 'yes',
          birth_certificate_submitted: formData.TC_Submitted === 'yes', // fallback
          birth_certificate_submitted: formData.TC_Submitted === 'yes' ? true : formData.BirthCertificateSubmitted === 'yes',
          choice_of_game: formData.ChoiceOfGame || null,
          opt_computer_class: formData.ComputerClasses === 'yes',
          tan_number: formData.TanNumber || null,
          father_name: formData.FatherName || null,
          father_profession: formData.Profession || null,
          mother_name: formData.MotherName || null,
          mobile_no: formData.PhoneNumber || null,
          class: formData.Class ? parseInt(formData.Class, 10) : null,
          roll_no: formData.RollNo ? parseInt(formData.RollNo, 10) : null,
          total_annual_fees: formData.TotalAnnualFees ? parseFloat(formData.TotalAnnualFees) : null,
          status: 'active',
          subjects: [
            formData.Subject1,
            formData.Subject2,
            formData.Subject3,
            formData.Subject4,
            formData.Subject5,
            formData.Subject6,
            formData.Subject7,
            formData.Subject8,
            formData.Subject9,
            formData.Subject10,
          ].filter(Boolean),
        },
      ]);

    if (studentError) {
      console.error('students insert error:', studentError);
      return Response.json({ success: false, error: studentError.message }, { status: 400 });
    }

    // 3. Insert Parent/Guardian info
    const { error: parentError } = await supabase
      .from('parents_guardian')
      .insert([
        {
          student_id: formData.StudentID,
          father_name: formData.FatherName,
          mother_name: formData.MotherName,
          father_profession: formData.Profession || null,
          mobile_number: formData.PhoneNumber,
        },
      ]);

    if (parentError) {
      console.error('parents_guardian insert error:', parentError);
      return Response.json({ success: false, error: `Parent details registration failed: ${parentError.message}` }, { status: 400 });
    }

    // 4. Resolve and ensure Class ID exists
    const className = `Class ${formData.Class}`;
    let { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('class_name', className)
      .maybeSingle();

    if (!classData) {
      const { data: newClass, error: newClassErr } = await supabase
        .from('classes')
        .insert([{ class_name: className }])
        .select('id')
        .single();
      if (newClassErr) {
        console.error('classes insert error:', newClassErr);
        return Response.json({ success: false, error: `Failed to create class: ${newClassErr.message}` }, { status: 400 });
      } else {
        classData = newClass;
      }
    }

    // 5. Resolve and ensure Academic Year exists
    const academicYear = formData.AcademicYear || '2026-2027';
    let { data: yearData } = await supabase
      .from('academic_years')
      .select('year_string')
      .eq('year_string', academicYear)
      .maybeSingle();

    if (!yearData) {
      const { data: newYear, error: newYearErr } = await supabase
        .from('academic_years')
        .insert([{ year_string: academicYear, is_active: true }])
        .select('year_string')
        .single();
      if (newYearErr) {
        console.error('academic_years insert error:', newYearErr);
        return Response.json({ success: false, error: `Failed to create academic year: ${newYearErr.message}` }, { status: 400 });
      } else {
        yearData = newYear;
      }
    }

    // 6. Insert student enrollment
    if (classData && yearData) {
      const { error: enrollError } = await supabase
        .from('student_enrollments')
        .insert([
          {
            student_id: formData.StudentID,
            academic_year: yearData.year_string,
            class_id: classData.id,
            roll_number: formData.RollNo ? parseInt(formData.RollNo, 10) : null,
            total_annual_fee: parseFloat(formData.TotalAnnualFees),
          },
        ]);
      if (enrollError) {
        console.error('student_enrollments insert error:', enrollError);
        let errorMsg = enrollError.message;
        if (enrollError.code === '23505') {
          errorMsg = `Roll number ${formData.RollNo} is already assigned to another student in Class ${formData.Class} for academic year ${yearData.year_string}.`;
        }
        return Response.json({ success: false, error: errorMsg }, { status: 400 });
      }
    }

    // 7. Insert Subjects mapping
    const subjects = [
      formData.Subject1,
      formData.Subject2,
      formData.Subject3,
      formData.Subject4,
      formData.Subject5,
      formData.Subject6,
      formData.Subject7,
      formData.Subject8,
      formData.Subject9,
      formData.Subject10,
    ].filter(Boolean);

    for (const subName of subjects) {
      let { data: subData } = await supabase
        .from('subjects')
        .select('id')
        .eq('subject_name', subName)
        .maybeSingle();

      if (!subData) {
        const { data: newSub, error: newSubErr } = await supabase
          .from('subjects')
          .insert([{ subject_name: subName }])
          .select('id')
          .single();
        if (newSubErr) {
          console.error('subjects insert error:', newSubErr);
          continue;
        }
        subData = newSub;
      }

      if (subData) {
        await supabase
          .from('student_subjects')
          .insert([{ student_id: formData.StudentID, subject_id: subData.id }]);
      }
    }

    return Response.json(
      {
        success: true,
        message: 'Admission form submitted successfully!',
        data: { StudentID: formData.StudentID },
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

