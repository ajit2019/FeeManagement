import { createClient } from '@supabase/supabase-js';
import { getSequentialSlips } from '@/lib/slips';

const MONTH_MAP = {
  apr: 'AprilFee',
  april: 'AprilFee',
  may: 'MayFee',
  jun: 'JuneFee',
  june: 'JuneFee',
  jul: 'JulyFee',
  july: 'JulyFee',
  aug: 'AugustFee',
  august: 'AugustFee',
  sep: 'SeptFee',
  sept: 'SeptFee',
  september: 'SeptFee',
  oct: 'OctFee',
  october: 'OctFee',
  nov: 'NovFee',
  november: 'NovFee',
  dec: 'DecFee',
  december: 'DecFee',
  jan: 'JanFee',
  january: 'JanFee',
  feb: 'FebFee',
  february: 'FebFee',
  mar: 'MarchFee',
  march: 'MarchFee'
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentID = searchParams.get('studentID');

    if (!studentID || !studentID.trim()) {
      return Response.json(
        { success: false, error: 'studentID is required.' },
        { status: 400 }
      );
    }

    const trimmedID = studentID.trim();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Try to fetch from FeeDetails view case-insensitively
    let viewData = null;
    let viewError = null;

    // Try standard query
    const { data: data1, error: err1 } = await supabase
      .from('FeeDetails')
      .select('*')
      .ilike('StudentID', trimmedID)
      .order('Date', { ascending: false });
    
    if (!err1 && data1 && data1.length > 0) {
      viewData = data1;
    } else {
      // Try lowercase column name
      const { data: data2, error: err2 } = await supabase
        .from('FeeDetails')
        .select('*')
        .ilike('student_id', trimmedID)
        .order('Date', { ascending: false });
      
      if (!err2 && data2 && data2.length > 0) {
        viewData = data2;
      } else {
        viewError = err1 || err2;
      }
    }

    // 2. Fetch all transactions for slip mapping
    const { data: allTxs, error: allTxsErr } = await supabase
      .from('fee_transactions')
      .select('id, student_id, date_paid, created_at');

    const { uuidPrefixMap, slipMap } = getSequentialSlips(allTxs || []);

    if (viewData && viewData.length > 0) {
      const formattedRecords = [];
      for (const row of viewData) {
        const prefixMatch = row.SlipNo ? row.SlipNo.match(/SICF-(.*)/i) : null;
        const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : '';
        const sequentialSlipNo = uuidPrefixMap.get(prefix) || row.SlipNo;

        formattedRecords.push({
          ...row,
          SlipNo: sequentialSlipNo
        });
      }

      return Response.json({
        success: true,
        studentID: trimmedID,
        records: formattedRecords,
      }, { status: 200 });
    }

    // 3. Fallback: Manually build pivot records from fee_transactions and students
    // Retrieve student name and class info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        class,
        father_name,
        mother_name,
        parents_guardian (father_name, mother_name),
        student_enrollments (
          classes (class_name)
        )
      `)
      .ilike('student_id', trimmedID)
      .maybeSingle();

    if (!student) {
      return Response.json({
        success: true,
        studentID: trimmedID,
        records: [],
      }, { status: 200 });
    }

    const parent = student.parents_guardian?.[0];
    const fatherName = student.father_name || parent?.father_name;
    const motherName = student.mother_name || parent?.mother_name;
    const fatherMotherName = [fatherName, motherName].filter(Boolean).join(' / ');
    const studentName = student.student_name || 'Unknown';
    const className = student.class || student.student_enrollments?.[0]?.classes?.class_name || 'Not Enrolled';

    // Retrieve transactions for this student
    const { data: studentTxs, error: txsErr } = await supabase
      .from('fee_transactions')
      .select('*')
      .ilike('student_id', trimmedID)
      .order('date_paid', { ascending: false })
      .order('created_at', { ascending: false });

    if (txsErr || !studentTxs || studentTxs.length === 0) {
      return Response.json({
        success: true,
        studentID: trimmedID,
        records: [],
      }, { status: 200 });
    }

    // Group transactions by their computed slip numbers
    const grouped = {};
    for (const tx of studentTxs) {
      const slipNo = slipMap.get(tx.id) || `SICF-${tx.id.split('-')[0].toUpperCase()}`;
      if (!grouped[slipNo]) {
        grouped[slipNo] = {
          SlipNo: slipNo,
          Date: tx.date_paid,
          StudentID: student.student_id,
          StudentName: studentName,
          Class: className,
          'Father/Mother Name': fatherMotherName,
          AdmissionFee: 0,
          BooksStationary: 0,
          TotalReceived: 0,
          AprilFee: 0, MayFee: 0, JuneFee: 0, JulyFee: 0, AugustFee: 0, SeptFee: 0,
          OctFee: 0, NovFee: 0, DecFee: 0, JanFee: 0, FebFee: 0, MarchFee: 0
        };
      }

      const val = Number(tx.amount_received || 0);
      grouped[slipNo].TotalReceived += val;

      const head = (tx.fee_head || '').toLowerCase();
      if (head.includes('tuition') || head.includes('monthly')) {
        const m = (tx.month_paid || '').toLowerCase();
        const column = MONTH_MAP[m];
        if (column) {
          grouped[slipNo][column] += val;
        }
      } else if (head.includes('admission')) {
        grouped[slipNo].AdmissionFee += val;
      } else if (head.includes('books') || head.includes('stationary')) {
        grouped[slipNo].BooksStationary += val;
      }
    }

    const records = Object.values(grouped).sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return Response.json({
      success: true,
      studentID: trimmedID,
      records,
    }, { status: 200 });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
