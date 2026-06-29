'use client';

import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';

const emptyFormFields = {
  date: '',
  StudentID: '',
  rollNo: '',
  class: '',
  studentName: '',
  fatherName: '',
  motherName: '',
  fatherProfession: '',
  dob: '',
  totalFees: '',
  address: '',
  mobileNo: '',
  nationality: '',
  religion: '',
  caste: '',
  category: '',
  aadharNumber: '',
  lastSchoolName: '',
  tcSubmitted: 'no',
  birthCertSubmitted: 'no',
  subject1: '',
  subject2: '',
  subject3: '',
  subject4: '',
  subject5: '',
  subject6: '',
  subject7: '',
  subject8: '',
  subject9: '',
  subject10: '',
  choiceOfGame: '',
  studentSignature: '',
  parentsSignature: '',
  classTeacher: '',
  principal: '',
  computerClasses: 'no',
  tanNumber: '',
};

export default function AdmissionForm() {
  const printRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStudentId, setIsLoadingStudentId] = useState(true);
  const [formData, setFormData] = useState(() => ({ ...emptyFormFields }));

  const fetchNextStudentID = async () => {
    try {
      const response = await fetch('/api/admission/next-student-id');
      const result = await response.json();
      const nextID = result?.StudentID || 'SIC-00001';
      setFormData((prev) => ({ ...prev, StudentID: nextID }));
      return nextID;
    } catch (error) {
      console.error('Failed to fetch next StudentID:', error);
      const fallback = 'SIC-00001';
      setFormData((prev) => ({ ...prev, StudentID: fallback }));
      return fallback;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingStudentId(true);
      await fetchNextStudentID();
      if (!cancelled) setIsLoadingStudentId(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const dbToFormFieldMap = {
    DateOfAdmission: 'date',
    StudentID: 'StudentID',
    RollNo: 'rollNo',
    StudentName: 'studentName',
    Class: 'class',
    FatherName: 'fatherName',
    MotherName: 'motherName',
    DOB: 'dob',
    TotalAnnualFees: 'totalFees',
    Address: 'address',
    PhoneNumber: 'mobileNo',
    Religion: 'religion',
    Caste: 'caste',
    Category: 'category',
    AadharNo: 'aadharNumber',
    LastSchoolName: 'lastSchoolName',
    TC_Submitted: 'tcSubmitted',
    BirthCertificateSubmitted: 'birthCertSubmitted',
    tan_number: 'tanNumber',
    opt_computer_class: 'computerClasses',
  };

  const handleReset = async (showConfirm = true) => {
    if (showConfirm && !confirm('Are you sure you want to reset the form?')) {
      return;
    }

    setIsLoadingStudentId(true);
    const nextID = await fetchNextStudentID();
    setValidationErrors({});
    setFormData({
      ...emptyFormFields,
      StudentID: nextID,
    });
    setIsLoadingStudentId(false);
  };

  const submitAdmissionToApi = async () => {
    const payload = {
      StudentID: formData.StudentID,
      RollNo: formData.rollNo ? parseInt(formData.rollNo, 10) : null,
      DateOfAdmission: formData.date || null,
      StudentName: formData.studentName || null,
      Class: formData.class ? parseInt(formData.class, 10) : null,
      FatherName: formData.fatherName || null,
      MotherName: formData.motherName || null,
      Profession: formData.fatherProfession || null,
      DOB: formData.dob || null,
      TotalAnnualFees: formData.totalFees ? parseFloat(formData.totalFees) : null,
      Address: formData.address || null,
      PhoneNumber: formData.mobileNo || null,
      Religion: formData.religion || null,
      Caste: formData.caste || null,
      Category: formData.category || null,
      AadharNo: formData.aadharNumber || null,
      LastSchoolName: formData.lastSchoolName || null,
      TC_Submitted: formData.tcSubmitted === 'yes',
      BirthCertificateSubmitted: formData.birthCertSubmitted === 'yes',
      ComputerClasses: formData.computerClasses,
      TanNumber: formData.tanNumber || null,
      Subject1: formData.subject1 || null,
      Subject2: formData.subject2 || null,
      Subject3: formData.subject3 || null,
      Subject4: formData.subject4 || null,
      Subject5: formData.subject5 || null,
      Subject6: formData.subject6 || null,
      Subject7: formData.subject7 || null,
      Subject8: formData.subject8 || null,
      Subject9: formData.subject9 || null,
      Subject10: formData.subject10 || null,
    };

    try {
      const response = await fetch('/api/admission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        await handleReset(false);
      } else {
        if (result.validationErrors) {
          const mappedErrors = {};
          Object.entries(result.validationErrors).forEach(([dbField, message]) => {
            const formField = dbToFormFieldMap[dbField] || dbField;
            mappedErrors[formField] = message;
          });
          setValidationErrors(mappedErrors);
        }
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Submission failed: ' + error.message);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Admission-${formData.StudentID || 'Student'}`,
    onAfterPrint: async () => {
      try {
        await submitAdmissionToApi();
      } finally {
        setIsSubmitting(false);
      }
    },
    onPrintError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationErrors({});
    setIsSubmitting(true);
    handlePrint();
  };

  return (
    <div ref={printRef} className="min-h-screen bg-gray-100 py-8 px-4">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 4mm 8mm 4mm 8mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .min-h-screen {
            min-height: 0 !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          form {
            gap: 0.15rem !important;
            margin-top: 0.15rem !important;
          }
          .space-y-6 > * + * {
            margin-top: 0.2rem !important;
          }
          .pb-6 {
            padding-bottom: 0.15rem !important;
          }
          .mb-8 {
            margin-bottom: 0.25rem !important;
          }
          .mb-4 {
            margin-bottom: 0.15rem !important;
          }
          .mb-3 {
            margin-bottom: 0.15rem !important;
          }
          .mt-4 {
            margin-top: 0.15rem !important;
          }
          .grid {
            gap: 0.25rem !important;
          }
          input, select, textarea {
            padding-top: 0.1rem !important;
            padding-bottom: 0.1rem !important;
            padding-left: 0.3rem !important;
            padding-right: 0.3rem !important;
            font-size: 10px !important;
            border: 1px solid #ccc !important;
            background-color: transparent !important;
            border-radius: 2px !important;
            line-height: 1.1 !important;
            height: auto !important;
          }
          label {
            font-size: 9px !important;
            margin-bottom: 0px !important;
          }
          h1 {
            font-size: 20px !important;
            margin-bottom: 2px !important;
          }
          h2 {
            font-size: 11px !important;
            margin-bottom: 0.15rem !important;
          }
          h3 {
            font-size: 10px !important;
            margin-bottom: 0.15rem !important;
            margin-top: 0.15rem !important;
          }
          .border-b-2 {
            border-bottom-width: 1px !important;
          }
          button, .flex.justify-center.pt-6, .text-center.text-gray-500.text-sm.mt-8.pt-6 {
            display: none !important;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-black uppercase tracking-wide">SIC Mahuli-Duddhi</h1>
          <h2 className="text-xl font-bold text-blue-600 mt-1">SCHOOL ADMISSION FORM</h2>
          <p className="text-gray-600 text-sm mt-1">Academic Session 2024-2025</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">1. BASIC INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.date && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Student ID</label>
                <input
                  type="text"
                  name="StudentID"
                  value={isLoadingStudentId ? '' : formData.StudentID}
                  placeholder={isLoadingStudentId ? 'Loading next ID from database…' : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Roll No</label>
                <input
                  type="number"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleInputChange}
                  placeholder="e.g., 1"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.rollNo && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.rollNo}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Class</label>
                <input
                  type="number"
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  placeholder="e.g., 6"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.class && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.class}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">2. PERSONAL INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Student Name *</label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.studentName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.studentName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.dob && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.dob}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  placeholder="e.g., Indian"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Religion</label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Caste</label>
                <input
                  type="text"
                  name="caste"
                  value={formData.caste}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Aadhar Number</label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleInputChange}
                  placeholder="12-digit number"
                  maxLength="12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">TAN Number</label>
                <input
                  type="text"
                  name="tanNumber"
                  value={formData.tanNumber}
                  onChange={handleInputChange}
                  placeholder="10-character TAN"
                  maxLength="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parent/Guardian Information */}
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">3. PARENT/GUARDIAN INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Father Name *</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.fatherName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.fatherName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Father Profession</label>
                <input
                  type="text"
                  name="fatherProfession"
                  value={formData.fatherProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mother Name *</label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {validationErrors.motherName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.motherName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mobile No.</label>
                <input
                  type="tel"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleInputChange}
                  placeholder="10-digit number"
                  maxLength="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.mobileNo && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.mobileNo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Address Information */}
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">4. ADDRESS INFORMATION</h2>
            <div>
              <label className="block text-sm font-semibold mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {validationErrors.address && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.address}</p>
              )}
            </div>
          </div>

          {/* Section 5: Academic Information */}
          <div className="border-b-2 border-blue-300 pb-6">
            <h2 className="text-xl font-bold text-blue-600 mb-4">5. ACADEMIC INFORMATION</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Last School Name</label>
                <input
                  type="text"
                  name="lastSchoolName"
                  value={formData.lastSchoolName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Total Annual Fees</label>
                <input
                  type="number"
                  name="totalFees"
                  value={formData.totalFees}
                  onChange={handleInputChange}
                  placeholder="Amount in INR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {validationErrors.totalFees && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.totalFees}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">T.C. Submitted</label>
                <select
                  name="tcSubmitted"
                  value={formData.tcSubmitted}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Birth Certificate Submitted</label>
                <select
                  name="birthCertSubmitted"
                  value={formData.birthCertSubmitted}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Computer Classes</label>
                <select
                  name="computerClasses"
                  value={formData.computerClasses}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-blue-600 mb-3">Subjects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div key={num}>
                  <label className="block text-sm font-semibold mb-1">Subject {num}</label>
                  <input
                    type="text"
                    name={`subject${num}`}
                    value={formData[`subject${num}`]}
                    onChange={handleInputChange}
                    placeholder={`e.g., ${num === 1 ? 'English' : num === 2 ? 'Hindi' : 'Subject'}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold mb-1">Choice of Game</label>
              <input
                type="text"
                name="choiceOfGame"
                value={formData.choiceOfGame}
                onChange={handleInputChange}
                placeholder="e.g., Cricket, Football, Basketball"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 6: Signatures */}
          <div className="border-b-2 border-blue-300 pb-6 print:hidden">
            <h2 className="text-xl font-bold text-blue-600 mb-4">6. SIGNATURES & APPROVAL</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Student Signature</label>
                <input
                  type="text"
                  name="studentSignature"
                  value={formData.studentSignature}
                  onChange={handleInputChange}
                  placeholder="Sign here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Parents Signature</label>
                <input
                  type="text"
                  name="parentsSignature"
                  value={formData.parentsSignature}
                  onChange={handleInputChange}
                  placeholder="Sign here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Class Teacher</label>
                <input
                  type="text"
                  name="classTeacher"
                  value={formData.classTeacher}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Principal</label>
                <input
                  type="text"
                  name="principal"
                  value={formData.principal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
            <button
              type="submit"
              disabled={isSubmitting || isLoadingStudentId || !formData.StudentID}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200"
            >
              {isSubmitting ? 'Printing & Saving...' : 'Print & Save'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-200"
            >
              Reset Form
            </button>
          </div>
        </form>

        {/* Print-only signatures block without borders or boxes */}
        <div className="hidden print:block mt-6 text-[10px] text-gray-800">
          <div className="grid grid-cols-4 gap-4 text-center font-semibold">
            <div>
              <p className="text-black text-xs font-bold h-5">{formData.studentSignature || ''}</p>
              <p className="uppercase tracking-wider">Student's Signature</p>
            </div>
            <div>
              <p className="text-black text-xs font-bold h-5">{formData.parentsSignature || ''}</p>
              <p className="uppercase tracking-wider">Parent's Signature</p>
            </div>
            <div>
              <p className="text-black text-xs font-bold h-5">{formData.classTeacher || ''}</p>
              <p className="uppercase tracking-wider">Class Teacher</p>
            </div>
            <div>
              <p className="text-black text-xs font-bold h-5">{formData.principal || ''}</p>
              <p className="uppercase tracking-wider">Principal Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 pt-6 border-t">
          <p>* Indicates mandatory fields</p>
        </div>
      </div>
    </div>
  );
}
