'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';

export default function StudentDetailsPage() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTC, setSelectedTC] = useState('');
  const [selectedBirthCert, setSelectedBirthCert] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');

  // Active student for Modal
  const [activeStudent, setActiveStudent] = useState(null);
  const printRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const startEditing = () => {
    if (!activeStudent) return;
    const initialData = {};
    const fields = [
      'StudentID', 'StudentName', 'Class', 'RollNo', 'DateOfAdmission', 'DOB',
      'Nationality', 'Religion', 'Caste', 'Category', 'AadharNo', 'FatherName',
      'Profession', 'MotherName', 'PhoneNumber', 'Address', 'LastSchoolName',
      'TotalAnnualFees', 'TC_Submitted', 'BirthCertificateSubmitted',
      'ChoiceOfGame', 'opt_computer_class', 'tan_number', 'Status'
    ];
    fields.forEach(f => {
      initialData[f] = getField(activeStudent, f);
    });
    for (let i = 1; i <= 10; i++) {
      initialData[`Subject${i}`] = getField(activeStudent, `Subject${i}`);
    }
    setEditFormData(initialData);
    setIsEditing(true);
  };

  const saveEdits = async () => {
    try {
      const response = await fetch('/api/student', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentID: editFormData.StudentID,
          ...editFormData
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Student details updated successfully!');
        
        // Build updated student object
        const updatedStudent = { ...activeStudent };
        Object.keys(editFormData).forEach(key => {
          if (updatedStudent[key] !== undefined) {
            updatedStudent[key] = editFormData[key];
          } else {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (updatedStudent[snakeKey] !== undefined) {
              updatedStudent[snakeKey] = editFormData[key];
            } else {
              updatedStudent[key] = editFormData[key];
            }
          }
        });

        // Ensure getField mappings are populated correctly
        updatedStudent.StudentID = editFormData.StudentID;
        updatedStudent.StudentName = editFormData.StudentName;
        updatedStudent.Class = editFormData.Class;
        updatedStudent.RollNo = editFormData.RollNo;
        updatedStudent.DateOfAdmission = editFormData.DateOfAdmission;
        updatedStudent.DOB = editFormData.DOB;
        updatedStudent.Nationality = editFormData.Nationality;
        updatedStudent.Religion = editFormData.Religion;
        updatedStudent.Caste = editFormData.Caste;
        updatedStudent.Category = editFormData.Category;
        updatedStudent.AadharNo = editFormData.AadharNo;
        updatedStudent.FatherName = editFormData.FatherName;
        updatedStudent.Profession = editFormData.Profession;
        updatedStudent.MotherName = editFormData.MotherName;
        updatedStudent.PhoneNumber = editFormData.PhoneNumber;
        updatedStudent.Address = editFormData.Address;
        updatedStudent.LastSchoolName = editFormData.LastSchoolName;
        updatedStudent.TotalAnnualFees = editFormData.TotalAnnualFees;
        updatedStudent.TC_Submitted = editFormData.TC_Submitted;
        updatedStudent.BirthCertificateSubmitted = editFormData.BirthCertificateSubmitted;
        updatedStudent.ChoiceOfGame = editFormData.ChoiceOfGame;
        updatedStudent.opt_computer_class = editFormData.opt_computer_class;
        updatedStudent.tan_number = editFormData.tan_number;
        updatedStudent.Status = editFormData.Status;
        for (let i = 1; i <= 10; i++) {
          updatedStudent[`Subject${i}`] = editFormData[`Subject${i}`];
        }

        setActiveStudent(updatedStudent);
        setStudents(prev => prev.map(s => {
          if (getField(s, 'StudentID') === editFormData.StudentID) {
            return updatedStudent;
          }
          return s;
        }));
        setIsEditing(false);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    }
  };

  // Helper to extract fields case-insensitively with fallback
  const getField = (student, key) => {
    if (!student) return '';
    // Direct key matching (exact match)
    if (student[key] !== undefined && student[key] !== null) {
      return student[key];
    }
    // Lowercase match
    const lowerKey = key.toLowerCase();
    if (student[lowerKey] !== undefined && student[lowerKey] !== null) {
      return student[lowerKey];
    }
    // Snake case match
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    if (student[snakeKey] !== undefined && student[snakeKey] !== null) {
      return student[snakeKey];
    }

    // Additional common mappings/aliases
    if (key === 'PhoneNumber' && student.mobileNo) return student.mobileNo;
    if (key === 'Profession' && student.fatherProfession) return student.fatherProfession;
    if (key === 'TC_Submitted' && student.tcSubmitted !== undefined) return student.tcSubmitted;
    if (key === 'BirthCertificateSubmitted' && student.birthCertSubmitted !== undefined) return student.birthCertSubmitted;
    if (key === 'TotalAnnualFees' && student.totalFees) return student.totalFees;
    if (key === 'opt_computer_class' && student.opt_computer_class !== undefined) return student.opt_computer_class;
    if (key === 'tan_number' && student.tan_number !== undefined) return student.tan_number;
    if (key === 'Status' && student.Status !== undefined) return student.Status;

    return '';
  };

  // Fetch all students
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/student');
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to load students.');
        return;
      }

      setStudents(result.students || []);
      setFilteredStudents(result.students || []);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching student data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Handle Search and Filtering
  useEffect(() => {
    let result = [...students];

    // Search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const studentID = String(getField(s, 'StudentID')).toLowerCase();
        const studentName = String(getField(s, 'StudentName')).toLowerCase();
        const fatherName = String(getField(s, 'FatherName')).toLowerCase();
        const motherName = String(getField(s, 'MotherName')).toLowerCase();
        const phoneNumber = String(getField(s, 'PhoneNumber')).toLowerCase();
        const classVal = String(getField(s, 'Class')).toLowerCase();

        return (
          studentID.includes(query) ||
          studentName.includes(query) ||
          fatherName.includes(query) ||
          motherName.includes(query) ||
          phoneNumber.includes(query) ||
          classVal.includes(query)
        );
      });
    }

    // Class filter
    if (selectedClass !== '') {
      result = result.filter((s) => String(getField(s, 'Class')) === selectedClass);
    }

    // TC filter
    if (selectedTC !== '') {
      const tcVal = selectedTC === 'yes';
      result = result.filter((s) => {
        const val = getField(s, 'TC_Submitted');
        return val === tcVal || (tcVal && val === 'yes') || (!tcVal && val === 'no');
      });
    }

    // Birth Certificate filter
    if (selectedBirthCert !== '') {
      const bcVal = selectedBirthCert === 'yes';
      result = result.filter((s) => {
        const val = getField(s, 'BirthCertificateSubmitted');
        return val === bcVal || (bcVal && val === 'yes') || (!bcVal && val === 'no');
      });
    }

    // Status filter
    if (selectedStatus !== '' && selectedStatus !== 'all') {
      result = result.filter((s) => String(getField(s, 'Status') || 'active').toLowerCase() === selectedStatus.toLowerCase());
    }

    setFilteredStudents(result);
  }, [searchQuery, selectedClass, selectedTC, selectedBirthCert, selectedStatus, students]);

  // Handle printing
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: activeStudent ? `Admission-Form-${getField(activeStudent, 'StudentID')}` : 'Student-Admission-Form',
  });

  // Dynamic unique list of classes for the filter dropdown
  const classesList = [...new Set(students.map((s) => getField(s, 'Class')).filter(Boolean))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white shadow-md py-8 px-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Student Admission Registry</h1>
            <p className="text-blue-100 mt-1">Search, view, filter, and print student admission details</p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg backdrop-blur-sm transition font-medium text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Search & Filters Panel */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Search Students
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ID, Name, Parent, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-9 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filter by Class */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">All Classes</option>
                {classesList.map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by TC Submitted */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                T.C. Submitted
              </label>
              <select
                value={selectedTC}
                onChange={(e) => setSelectedTC(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Filter by Birth Cert */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Birth Certificate
              </label>
              <select
                value={selectedBirthCert}
                onChange={(e) => setSelectedBirthCert(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
              >
                <option value="active">Active</option>
                <option value="left">Left</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Loading / List Content */}
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-slate-500 font-medium">Fetching student database records...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="px-6 py-4">S.No</th>
                    <th className="px-6 py-4">Student ID</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Father's Name</th>
                    <th className="px-6 py-4">Admission Date</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No student records matched your search parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const id = getField(student, 'StudentID');
                      const name = getField(student, 'StudentName');
                      const cls = getField(student, 'Class');
                      const father = getField(student, 'FatherName');
                      const date = getField(student, 'DateOfAdmission');
                      const phone = getField(student, 'PhoneNumber');
                      const status = getField(student, 'Status') || 'active';

                      return (
                        <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-blue-700">
                            {id}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
                              Class {cls}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{father}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {date
                              ? new Date(date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono">{phone || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              status.toLowerCase() === 'active'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : status.toLowerCase() === 'inactive'
                                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setActiveStudent(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <p>
                Showing {filteredStudents.length} of {students.length} registered students
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Student Details Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded font-bold">
                  {getField(activeStudent, 'StudentID')}
                </span>
                <h3 className="text-lg font-bold text-slate-900">Student Profile Summary</h3>

                {/* Status Switcher */}
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
                  <select
                    value={getField(activeStudent, 'Status') || 'active'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        const res = await fetch('/api/student', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            studentID: getField(activeStudent, 'StudentID'),
                            status: newStatus
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setActiveStudent({ ...activeStudent, status: newStatus, Status: newStatus });
                          setStudents(prev => prev.map(s => {
                            if (getField(s, 'StudentID') === getField(activeStudent, 'StudentID')) {
                              return { ...s, status: newStatus, Status: newStatus };
                            }
                            return s;
                          }));
                        } else {
                          alert('Error: ' + data.error);
                        }
                      } catch (err) {
                        alert('Failed to update status: ' + err.message);
                      }
                    }}
                    className={`text-xs font-bold rounded px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border cursor-pointer ${
                      (getField(activeStudent, 'Status') || 'active').toLowerCase() === 'active'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : (getField(activeStudent, 'Status') || 'active').toLowerCase() === 'inactive'
                          ? 'bg-yellow-50 text-yellow-850 border-yellow-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="left">Left</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdits}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEditing}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Details
                    </button>
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Print Admission Form
                    </button>
                    <button
                      onClick={() => { setActiveStudent(null); setIsEditing(false); }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body (Scrollable form view) */}
            <div className="p-6 md:p-8 space-y-8 flex-1 bg-slate-50">
              {/* Printed Container (Targets printRef) */}
              <div ref={printRef} className="bg-white text-slate-900 printable-form p-6 md:p-8 border border-slate-200 rounded-lg shadow-sm">
                
                {/* Print Styles */}
                <style jsx global>{`
                  @media print {
                    @page {
                      size: A4;
                      margin: 10mm 15mm 10mm 15mm;
                    }
                    body * {
                      visibility: hidden;
                    }
                    .printable-form, .printable-form * {
                      visibility: visible;
                    }
                    .printable-form {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      border: none !important;
                      box-shadow: none !important;
                      padding: 5mm !important;
                      margin: 0 !important;
                    }
                    .printable-form .border-b-2 {
                      border-bottom-width: 1px !important;
                      padding-bottom: 2px !important;
                      margin-bottom: 4px !important;
                    }
                    .printable-form .mb-6 {
                      margin-bottom: 4px !important;
                    }
                    .printable-form .grid {
                      gap: 4px !important;
                      margin-bottom: 4px !important;
                    }
                    .printable-form .p-4 {
                      padding: 4px 6px !important;
                    }
                    .printable-form span {
                      font-size: 10px !important;
                    }
                    .printable-form input, .printable-form select {
                      padding: 1px 2px !important;
                      font-size: 10px !important;
                      height: auto !important;
                    }
                    .printable-form .space-y-4 > * + * {
                      margin-top: 2px !important;
                    }
                    .printable-form hr {
                      margin-top: 4px !important;
                      margin-bottom: 4px !important;
                    }
                  }
                `}</style>

                {/* Admission Header */}
                <div className="text-center border-b-2 border-blue-600 pb-2 mb-4">
                  <h1 className="text-3xl font-extrabold text-black uppercase tracking-wide">
                    SIC Mahuli-Duddhi
                  </h1>
                  <h2 className="text-xl font-bold text-blue-700 tracking-wider">
                    SCHOOL ADMISSION FORM
                  </h2>
                  <p className="text-slate-500 font-semibold text-xs mt-0.5">Academic Session 2024-2025</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  {/* Student ID info */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">StudentID</span>
                    <span className="font-mono text-base font-bold text-slate-700">{getField(activeStudent, 'StudentID')}</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Roll Number</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.RollNo || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, RollNo: e.target.value })}
                        className="w-full mt-1 px-2.5 py-1 border border-slate-350 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                      />
                    ) : (
                      <span className="text-base font-bold text-slate-800">{getField(activeStudent, 'RollNo') || 'N/A'}</span>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Class Admission</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.Class || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, Class: e.target.value })}
                        className="w-full mt-1 px-2.5 py-1 border border-slate-350 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm font-semibold"
                      />
                    ) : (
                      <span className="text-base font-bold text-slate-800">Class {getField(activeStudent, 'Class')}</span>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Status</span>
                    {isEditing ? (
                      <select
                        value={editFormData.Status || 'active'}
                        onChange={(e) => setEditFormData({ ...editFormData, Status: e.target.value })}
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option value="active">Active</option>
                        <option value="left">Left</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        (getField(activeStudent, 'Status') || 'active').toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : (getField(activeStudent, 'Status') || 'active').toLowerCase() === 'inactive'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {getField(activeStudent, 'Status') || 'active'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Personal Info */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-700 border-b border-blue-200 pb-1.5 mb-3 uppercase tracking-wide">
                    1. Student Personal Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Student Name</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.StudentName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, StudentName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-800">{getField(activeStudent, 'StudentName') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData.DOB ? new Date(editFormData.DOB).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditFormData({ ...editFormData, DOB: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">
                          {getField(activeStudent, 'DOB') ? new Date(getField(activeStudent, 'DOB')).toLocaleDateString('en-US') : 'N/A'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Date of Admission</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData.DateOfAdmission ? new Date(editFormData.DateOfAdmission).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditFormData({ ...editFormData, DateOfAdmission: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">
                          {getField(activeStudent, 'DateOfAdmission') ? new Date(getField(activeStudent, 'DateOfAdmission')).toLocaleDateString('en-US') : 'N/A'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Nationality</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.Nationality || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, Nationality: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{getField(activeStudent, 'Nationality') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Religion</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.Religion || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, Religion: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{getField(activeStudent, 'Religion') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Caste / Category</span>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Caste"
                            value={editFormData.Caste || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, Caste: e.target.value })}
                            className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                          />
                          <input
                            type="text"
                            placeholder="Category"
                            value={editFormData.Category || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, Category: e.target.value })}
                            className="w-1/2 px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-800">
                          {getField(activeStudent, 'Caste') || 'N/A'} {getField(activeStudent, 'Category') ? `(${getField(activeStudent, 'Category')})` : ''}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Aadhar Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.AadharNo || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, AadharNo: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-mono text-slate-800">{getField(activeStudent, 'AadharNo') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">TAN Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.tan_number || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, tan_number: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-mono text-slate-800">{getField(activeStudent, 'tan_number') || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Family Info */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-700 border-b border-blue-200 pb-1.5 mb-3 uppercase tracking-wide">
                    2. Parent / Guardian Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Father's Name</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.FatherName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, FatherName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-800">{getField(activeStudent, 'FatherName') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Father's Profession</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.Profession || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, Profession: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{getField(activeStudent, 'Profession') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Mother's Name</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.MotherName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, MotherName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">{getField(activeStudent, 'MotherName') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Mobile Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.PhoneNumber || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, PhoneNumber: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-mono text-slate-800">{getField(activeStudent, 'PhoneNumber') || 'N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Address */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-700 border-b border-blue-200 pb-1.5 mb-3 uppercase tracking-wide">
                    3. Address Information
                  </h4>
                  {isEditing ? (
                    <textarea
                      value={editFormData.Address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, Address: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm text-slate-800 bg-slate-50/55 p-3 rounded border border-slate-100">
                      {getField(activeStudent, 'Address') || 'N/A'}
                    </p>
                  )}
                </div>

                {/* Section 4: Academic */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-700 border-b border-blue-200 pb-1.5 mb-3 uppercase tracking-wide">
                    4. Academic & Fees Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Last School Attended</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.LastSchoolName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, LastSchoolName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{getField(activeStudent, 'LastSchoolName') || 'N/A'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Total Annual Fees</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData.TotalAnnualFees || 0}
                          onChange={(e) => setEditFormData({ ...editFormData, TotalAnnualFees: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-bold text-green-700">₹{getField(activeStudent, 'TotalAnnualFees') || '0'}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">T.C. Submitted</span>
                      {isEditing ? (
                        <select
                          value={editFormData.TC_Submitted ? 'yes' : 'no'}
                          onChange={(e) => setEditFormData({ ...editFormData, TC_Submitted: e.target.value === 'yes' })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550 bg-white"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-slate-800">
                          {getField(activeStudent, 'TC_Submitted') ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Birth Certificate Submitted</span>
                      {isEditing ? (
                        <select
                          value={editFormData.BirthCertificateSubmitted ? 'yes' : 'no'}
                          onChange={(e) => setEditFormData({ ...editFormData, BirthCertificateSubmitted: e.target.value === 'yes' })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550 bg-white"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-slate-800">
                          {getField(activeStudent, 'BirthCertificateSubmitted') ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Computer Classes</span>
                      {isEditing ? (
                        <select
                          value={editFormData.opt_computer_class ? 'yes' : 'no'}
                          onChange={(e) => setEditFormData({ ...editFormData, opt_computer_class: e.target.value === 'yes' })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550 bg-white"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      ) : (
                        <span className="text-sm font-medium text-slate-800">
                          {getField(activeStudent, 'opt_computer_class') ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-500 mb-1">Choice of Game</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.ChoiceOfGame || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, ChoiceOfGame: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-semibold focus:ring-1 focus:ring-blue-550"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{getField(activeStudent, 'ChoiceOfGame') || 'N/A'}</span>
                      )}
                    </div>
                  </div>

                  {/* Subjects list */}
                  <div className="mt-3">
                    <span className="block text-xs font-semibold text-slate-500 mb-2">Enrolled Subjects</span>
                    {isEditing ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <input
                            key={num}
                            type="text"
                            placeholder={`Subject ${num}`}
                            value={editFormData[`Subject${num}`] || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, [`Subject${num}`]: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-550"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const val = getField(activeStudent, `Subject${num}`);
                          if (!val) return null;
                          return (
                            <span
                              key={num}
                              className="text-xs bg-slate-100 text-slate-750 px-2.5 py-1 rounded border border-slate-200 font-medium"
                            >
                              {val}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Signatures and Approvals */}
                <div className="mt-6 pt-4 border-t border-slate-100 print:border-none print:mt-4 print:pt-0">
                  <div className="grid grid-cols-4 gap-4 text-center text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 font-bold text-xs h-4 mb-0.5">{getField(activeStudent, 'StudentSignature') || ''}</span>
                      <span>Student's Signature</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 font-bold text-xs h-4 mb-0.5">{getField(activeStudent, 'ParentsSignature') || ''}</span>
                      <span>Parent's Signature</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 font-bold text-xs h-4 mb-0.5">{getField(activeStudent, 'ClassTeacher') || ''}</span>
                      <span>Class Teacher</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 font-bold text-xs h-4 mb-0.5">{getField(activeStudent, 'Principal') || ''}</span>
                      <span>Principal Signature</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
