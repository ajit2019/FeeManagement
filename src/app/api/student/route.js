import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        parents_guardian (
          father_name,
          mother_name,
          father_profession,
          mobile_number
        ),
        student_enrollments (
          roll_number,
          total_annual_fee,
          classes (
            class_name
          )
        ),
        student_subjects (
          subjects (
            subject_name
          )
        )
      `)
      .order('student_id', { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const students = (data || []).map(student => {
      const parent = student.parents_guardian?.[0] || {};
      const enrollment = student.student_enrollments?.[0] || {};
      const className = enrollment.classes?.class_name || '';
      const classNum = className ? className.replace(/[^\d]/g, '') : '';

      const subjectsMapped = {};
      const subjectsList = student.subjects || [];
      const relationalSubjects = student.student_subjects || [];
      for (let i = 0; i < 10; i++) {
        const sub = subjectsList[i] || relationalSubjects[i]?.subjects?.subject_name || '';
        subjectsMapped[`Subject${i + 1}`] = typeof sub === 'object' ? sub?.subject_name || '' : sub;
      }

      return {
        StudentID: student.student_id,
        StudentName: student.student_name || '',
        Class: student.class || classNum || className,
        RollNo: student.roll_no || enrollment.roll_number || '',
        DateOfAdmission: student.admission_date || '',
        DOB: student.date_of_birth || '',
        Nationality: student.nationality || 'Indian',
        Religion: student.religion || '',
        Caste: student.caste || '',
        Category: student.category || '',
        AadharNo: student.aadhar_number || '',
        FatherName: student.father_name || parent.father_name || '',
        Profession: student.father_profession || parent.father_profession || '',
        MotherName: student.mother_name || parent.mother_name || '',
        PhoneNumber: student.mobile_no || parent.mobile_number || '',
        Address: student.address || '',
        LastSchoolName: student.last_school_name || student.last_school || '',
        TotalAnnualFees: student.total_annual_fees || enrollment.total_annual_fee || 0,
        TC_Submitted: student.tc_submitted ?? !!student.has_transfer_certificate,
        BirthCertificateSubmitted: student.birth_certificate_submitted ?? !!student.has_birth_certificate,
        ChoiceOfGame: student.choice_of_game || '',
        opt_computer_class: !!student.opt_computer_class,
        tan_number: student.tan_number || '',
        Status: student.status || 'active',
        ...subjectsMapped
      };
    });

    return Response.json(
      {
        success: true,
        students,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const payload = await request.json();
    const { studentID } = payload;

    if (!studentID) {
      return Response.json(
        { success: false, error: 'studentID is required.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if this is a simple status-only update (e.g. from the status dropdown)
    if (Object.keys(payload).length === 2 && payload.status !== undefined) {
      const { error } = await supabase
        .from('students')
        .update({ status: payload.status })
        .eq('student_id', studentID);

      if (error) {
        console.error('Supabase status update error:', error);
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      return Response.json(
        { success: true, message: 'Student status updated successfully!' },
        { status: 200 }
      );
    }

    // Otherwise, this is a full student profile edit update
    const {
      StudentName,
      DOB,
      DateOfAdmission,
      Nationality,
      Religion,
      Caste,
      Category,
      AadharNo,
      tan_number,
      FatherName,
      Profession,
      MotherName,
      PhoneNumber,
      Address,
      LastSchoolName,
      TotalAnnualFees,
      TC_Submitted,
      BirthCertificateSubmitted,
      opt_computer_class,
      ChoiceOfGame,
      RollNo,
      Class,
      Status
    } = payload;

    // Filter out active subjects
    const subjects = [
      payload.Subject1,
      payload.Subject2,
      payload.Subject3,
      payload.Subject4,
      payload.Subject5,
      payload.Subject6,
      payload.Subject7,
      payload.Subject8,
      payload.Subject9,
      payload.Subject10,
    ].filter(Boolean);

    // 1. Update students table
    const { error: studentErr } = await supabase
      .from('students')
      .update({
        student_name: StudentName || null,
        date_of_birth: DOB || null,
        admission_date: DateOfAdmission || null,
        nationality: Nationality || 'Indian',
        religion: Religion || null,
        caste: Caste || null,
        category: Category || null,
        aadhar_number: AadharNo || null,
        tan_number: tan_number || null,
        address: Address || null,
        last_school: LastSchoolName || null,
        last_school_name: LastSchoolName || null,
        has_transfer_certificate: !!TC_Submitted,
        has_birth_certificate: !!BirthCertificateSubmitted,
        tc_submitted: !!TC_Submitted,
        birth_certificate_submitted: !!BirthCertificateSubmitted,
        choice_of_game: ChoiceOfGame || null,
        opt_computer_class: !!opt_computer_class,
        father_name: FatherName || null,
        father_profession: Profession || null,
        mother_name: MotherName || null,
        mobile_no: PhoneNumber || null,
        class: Class ? parseInt(Class, 10) : null,
        roll_no: RollNo ? parseInt(RollNo, 10) : null,
        total_annual_fees: TotalAnnualFees ? parseFloat(TotalAnnualFees) : null,
        status: Status || 'active',
        subjects: subjects
      })
      .eq('student_id', studentID);

    if (studentErr) {
      console.error('students update edit error:', studentErr);
      return Response.json({ success: false, error: studentErr.message }, { status: 400 });
    }

    // 2. Update parents_guardian table
    const { error: parentErr } = await supabase
      .from('parents_guardian')
      .update({
        father_name: FatherName || null,
        mother_name: MotherName || null,
        father_profession: Profession || null,
        mobile_number: PhoneNumber || null,
      })
      .eq('student_id', studentID);

    if (parentErr) {
      console.error('parents_guardian update edit error:', parentErr);
    }

    // 3. Resolve Class ID and Update student_enrollments
    if (Class !== undefined && Class !== null && Class !== '') {
      const className = `Class ${Class}`;
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
        if (!newClassErr) {
          classData = newClass;
        }
      }

      if (classData) {
        const { error: enrollError } = await supabase
          .from('student_enrollments')
          .update({
            class_id: classData.id,
            roll_number: RollNo ? parseInt(RollNo, 10) : null,
            total_annual_fee: TotalAnnualFees ? parseFloat(TotalAnnualFees) : 0,
          })
          .eq('student_id', studentID);

        if (enrollError) {
          console.error('student_enrollments update edit error:', enrollError);
          let errorMsg = enrollError.message;
          if (enrollError.code === '23505') {
            errorMsg = `Roll number ${RollNo} is already assigned to another student in Class ${Class}.`;
          }
          return Response.json({ success: false, error: errorMsg }, { status: 400 });
        }
      }
    }

    // 4. Update Subjects mapping in student_subjects
    await supabase
      .from('student_subjects')
      .delete()
      .eq('student_id', studentID);

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
        if (!newSubErr) {
          subData = newSub;
        }
      }

      if (subData) {
        await supabase
          .from('student_subjects')
          .insert([{ student_id: studentID, subject_id: subData.id }]);
      }
    }

    return Response.json(
      { success: true, message: 'Student details updated successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
