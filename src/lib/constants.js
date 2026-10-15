export const ALL_CLASSES = [
  'PG',
  'Nursery',
  'LKG',
  'UKG',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  'AT1',
  'AT2',
  'AT3',
  'AT4',
  'AT5',
  'AT6',
  'AT7',
  'AT8',
];

export const sortClasses = (arr) => {
  if (!Array.isArray(arr)) return [];
  const cleanArr = [...new Set(arr.map((c) => (c ? String(c).replace(/^Class\s+/i, '').trim() : '')).filter(Boolean))];

  return cleanArr.sort((a, b) => {
    const idxA = ALL_CLASSES.indexOf(a);
    const idxB = ALL_CLASSES.indexOf(b);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    const isANum = !isNaN(a) && a !== '';
    const isBNum = !isNaN(b) && b !== '';
    if (isANum && isBNum) return Number(a) - Number(b);
    if (isANum) return -1;
    if (isBNum) return 1;

    return a.localeCompare(b);
  });
};

export const EXPENSE_HEADS = [
  'Stationery',
  'Teacher Salary',
  'Staff Salary',
  'CCTV',
  'Electricity',
  'Water Bill',
  'Laboratory',
  'Transport',
  'Cleaning/Housekeeping',
  'Examination Expenses',
  'Board Fee',
  'Administrative Fee',
  'Operational Maintenance',
  'Building Maintenance',
  'Computer/IT',
  'Library',
  'Sports & Activities',
  'Security',
  'Internet/Phone',
  'Miscellaneous',
];

export const PAYMENT_MODES = ['Cash', 'Cheque', 'UPI', 'Bank Transfer'];
