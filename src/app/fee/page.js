'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const initialFormData = {
  StudentID: '',
  Date: getTodayDate(),
  StudentName: '',
  fatherMotherName: '',
  Class: '',
  MonthFee: '',
  AdmissionFee: '',
  BooksStationary: '',
};

export default function FeeFormPage() {
  const receiptRef = useRef(null);
  const [formData, setFormData] = useState(initialFormData);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [studentLookupError, setStudentLookupError] = useState('');
  const [lastSlipNo, setLastSlipNo] = useState('');
  const [nextSlipNo, setNextSlipNo] = useState('Fetching...');
  const [balanceFee, setBalanceFee] = useState(0);

  const fetchNextSlipNo = async () => {
    try {
      const response = await fetch('/api/fee/next-slip-no');
      const result = await response.json();
      if (result.success) {
        setNextSlipNo(result.nextSlipNo);
      } else {
        setNextSlipNo('SICF-00001');
      }
    } catch (error) {
      console.error('Error fetching next slip number:', error);
      setNextSlipNo('SICF-00001');
    }
  };

  const totalReceived = useMemo(() => {
    const monthFee = parseFloat(formData.MonthFee || 0);
    const admissionFee = parseFloat(formData.AdmissionFee || 0);
    const booksStationary = parseFloat(formData.BooksStationary || 0);
    return (Number.isNaN(monthFee) ? 0 : monthFee) +
      (Number.isNaN(admissionFee) ? 0 : admissionFee) +
      (Number.isNaN(booksStationary) ? 0 : booksStationary);
  }, [formData]);

  const balanceAfterPayment = useMemo(() => {
    const current = Number(balanceFee || 0);
    return current - totalReceived;
  }, [balanceFee, totalReceived]);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `FeeReceipt-${formData.StudentID || 'Student'}`,
    onAfterPrint: async () => {
      try {
        await submitFeeToApi();
      } finally {
        setIsSubmitting(false);
      }
    },
    onPrintError: () => {
      setIsSubmitting(false);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      if (name === 'fatherMotherName') {
        delete next['Father/Mother Name'];
      }
      return next;
    });
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      Date: getTodayDate(),
    }));
    fetchNextSlipNo();
  }, []);

  const fetchStudentDetails = async () => {
    if (!formData.StudentID) return;

    try {
      setIsFetchingStudent(true);
      setStudentLookupError('');
      const response = await fetch(
        `/api/student/details?studentID=${encodeURIComponent(formData.StudentID)}`
      );
      const result = await response.json();

      if (!result.success) {
        setStudentLookupError(result.error || 'Unable to fetch student details.');
        setBalanceFee(0);
        setFormData((prev) => ({
          ...prev,
          StudentName: '',
          fatherMotherName: '',
          Class: '',
          status: '',
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        StudentName: result.data.StudentName || '',
        fatherMotherName: result.data.fatherMotherName || '',
        Class: result.data.Class ? String(result.data.Class) : '',
        status: result.data.status || 'active',
      }));
      setBalanceFee(Number(result.data.balance ?? 0));
    } catch (error) {
      setStudentLookupError(error.message);
      setBalanceFee(0);
    } finally {
      setIsFetchingStudent(false);
    }
  };

  // Automatically fetch student details as soon as the user types/enters a Student ID
  useEffect(() => {
    if (!formData.StudentID) {
      setFormData((prev) => ({
        ...prev,
        StudentName: '',
        fatherMotherName: '',
        Class: '',
        status: '',
      }));
      setBalanceFee(0);
      setStudentLookupError('');
      return;
    }

    const timer = setTimeout(() => {
      fetchStudentDetails();
    }, 400); // 400ms debounce to prevent spamming API requests on every keystroke

    return () => clearTimeout(timer);
  }, [formData.StudentID]);

  const submitFeeToApi = async () => {
    const parsedClass = formData.Class && !isNaN(parseInt(formData.Class, 10))
      ? parseInt(formData.Class, 10)
      : formData.Class || null;
    const payload = {
      ...formData,
      Class: parsedClass,
      TotalReceived: totalReceived,
    };

    try {
      const response = await fetch('/api/fee/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        setValidationErrors(result.validationErrors || {});
        alert(`Error: ${result.error}`);
        return;
      }

      alert(result.message);
      setLastSlipNo(result?.data?.SlipNo || '');
      setStudentLookupError('');
      setBalanceFee(0);
      setFormData({
        ...initialFormData,
        Date: getTodayDate(),
      });
      fetchNextSlipNo();
    } catch (error) {
      alert(`Submission failed: ${error.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.status === 'left') {
      alert('Cannot submit fees for a student who has left the school.');
      return;
    }
    setValidationErrors({});
    setIsSubmitting(true);
    handlePrint();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">FEE SUBMISSION FORM</h1>
          <p className="text-gray-600 mt-2">Submit monthly and annual fee details</p>
          {lastSlipNo && (
            <p className="text-green-700 mt-2 font-semibold">
              Last Saved Slip No: {lastSlipNo}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">1. STUDENT DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Slip No</label>
                <input
                  type="text"
                  value={nextSlipNo}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 font-semibold text-blue-700"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Student ID *</label>
                <input
                  type="text"
                  name="StudentID"
                  value={formData.StudentID}
                  onChange={handleInputChange}
                  onBlur={fetchStudentDetails}
                  placeholder="e.g., SIC-00001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.StudentID && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.StudentID}</p>
                )}
                {isFetchingStudent && (
                  <p className="text-gray-600 text-sm mt-1">Fetching student details...</p>
                )}
                {studentLookupError && (
                  <p className="text-red-600 text-sm mt-1">{studentLookupError}</p>
                )}
                {formData.status === 'left' && (
                  <p className="text-red-600 text-sm mt-1 font-semibold">
                    This student has left the school. Fee collection is disabled.
                  </p>
                )}
                {formData.status === 'inactive' && (
                  <p className="text-amber-600 text-sm mt-1 font-semibold">
                    Warning: Student is inactive (not attending class). Check status before submitting.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  name="Date"
                  value={formData.Date}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.Date && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.Date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Student Name *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="StudentName"
                    value={formData.StudentName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    required
                  />
                  {formData.status && (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-bold uppercase ${
                      formData.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : formData.status === 'left'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {formData.status}
                    </span>
                  )}
                </div>
                {validationErrors.StudentName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.StudentName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Father/Mother Name *</label>
                <input
                  type="text"
                  name="fatherMotherName"
                  value={formData.fatherMotherName}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  required
                />
                {validationErrors['Father/Mother Name'] && (
                  <p className="text-red-600 text-sm mt-1">
                    {validationErrors['Father/Mother Name']}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Class *</label>
                <input
                  type="text"
                  name="Class"
                  value={formData.Class}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  required
                />
                {validationErrors.Class && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.Class}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">2. FEE DETAILS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Month Fee</label>
                <input
                  type="number"
                  name="MonthFee"
                  value={formData.MonthFee}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.MonthFee && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.MonthFee}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Admission Fee</label>
                <input
                  type="number"
                  name="AdmissionFee"
                  value={formData.AdmissionFee}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.AdmissionFee && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.AdmissionFee}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">BooksStationary</label>
                <input
                  type="number"
                  name="BooksStationary"
                  value={formData.BooksStationary}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.BooksStationary && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.BooksStationary}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Balance Fee</label>
                <input
                  type="number"
                  value={balanceFee}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold mb-1">Total Received</label>
              <input
                type="number"
                value={totalReceived}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1">Balance After Payment</label>
              <input
                type="number"
                value={balanceAfterPayment}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200"
            >
              {isSubmitting ? 'Printing & Saving...' : 'Print Receipt & Save'}
            </button>
          </div>
        </form>

        <div className="hidden">
          <div ref={receiptRef} className="print-receipt-container text-black font-sans">
            {/* School Info / Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-2">
              <h2 className="text-xl font-extrabold uppercase tracking-wide">SHIVAM EDUCATION ACADEMY</h2>
              <p className="text-xs font-semibold">SCHOOL FEE RECEIPT (OFFICIAL COPY)</p>
            </div>

            {/* Student & Slip Info */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-b pb-2 mb-2">
              <div><strong>Slip No:</strong> {nextSlipNo}</div>
              <div className="text-right"><strong>Date:</strong> {formData.Date}</div>
              <div><strong>Student ID:</strong> {formData.StudentID}</div>
              <div className="text-right"><strong>Class:</strong> {formData.Class}</div>
              <div className="col-span-2"><strong>Student Name:</strong> {formData.StudentName}</div>
              <div className="col-span-2"><strong>Father/Mother Name:</strong> {formData.fatherMotherName}</div>
            </div>

            {/* Fee Breakdown Table */}
            <div className="flex-grow">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-1">Fee Description</th>
                    <th className="py-1 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-0.5">Month Fee</td>
                    <td className="py-0.5 text-right">₹{parseFloat(formData.MonthFee || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Admission Fee</td>
                    <td className="py-0.5 text-right">₹{parseFloat(formData.AdmissionFee || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Books & Stationary</td>
                    <td className="py-0.5 text-right">₹{parseFloat(formData.BooksStationary || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-black font-bold">
                    <td className="py-1 text-base">Total Received</td>
                    <td className="py-1 text-right text-base">₹{parseFloat(totalReceived || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Outstanding Balances & Signatures */}
            <div className="border-t border-black pt-2 text-xs flex justify-between items-end">
              <div className="space-y-1">
                <div><strong>Previous Balance:</strong> ₹{parseFloat(balanceFee || 0).toFixed(2)}</div>
                <div><strong>Remaining Balance:</strong> ₹{parseFloat(balanceAfterPayment || 0).toFixed(2)}</div>
              </div>
              <div className="text-center w-36 border-t border-black mt-6 pt-1">
                <span className="text-[10px] font-bold block">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
