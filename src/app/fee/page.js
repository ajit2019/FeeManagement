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
  const [balanceFee, setBalanceFee] = useState(0);

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
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        StudentName: result.data.StudentName || '',
        fatherMotherName: result.data.fatherMotherName || '',
        Class: result.data.Class ? String(result.data.Class) : '',
      }));
      setBalanceFee(Number(result.data.balance ?? 0));
    } catch (error) {
      setStudentLookupError(error.message);
      setBalanceFee(0);
    } finally {
      setIsFetchingStudent(false);
    }
  };

  const submitFeeToApi = async () => {
    const payload = {
      ...formData,
      Class: formData.Class ? parseInt(formData.Class, 10) : null,
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
    } catch (error) {
      alert(`Submission failed: ${error.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
                  value="Auto-generated on submit (SICF-00001)"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
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
                <input
                  type="text"
                  name="StudentName"
                  value={formData.StudentName}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  required
                />
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
                  type="number"
                  name="Class"
                  value={formData.Class}
                  readOnly
                  min="1"
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
          <div ref={receiptRef} className="p-6 text-black">
            <h2 className="text-2xl font-bold mb-4">Fee Receipt</h2>
            <p><strong>Date:</strong> {formData.Date}</p>
            <p><strong>Student ID:</strong> {formData.StudentID}</p>
            <p><strong>Student Name:</strong> {formData.StudentName}</p>
            <p><strong>Father/Mother Name:</strong> {formData.fatherMotherName}</p>
            <p><strong>Class:</strong> {formData.Class}</p>
            <hr className="my-4" />
            <p><strong>Month Fee:</strong> {formData.MonthFee || 0}</p>
            <p><strong>Admission Fee:</strong> {formData.AdmissionFee || 0}</p>
            <p><strong>BooksStationary:</strong> {formData.BooksStationary || 0}</p>
            <p><strong>Total Received:</strong> {totalReceived}</p>
            <p><strong>Balance Fee:</strong> {balanceFee}</p>
            <p><strong>Balance After Payment:</strong> {balanceAfterPayment}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
