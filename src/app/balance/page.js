'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

export default function BalancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchClasses = async () => {
    try {
      setError('');
      const response = await fetch('/api/balance');
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to load classes.');
        return;
      }

      setClasses(result.classes || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStudentsByClass = async (classValue) => {
    if (!classValue) {
      setStudents([]);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`/api/balance?class=${encodeURIComponent(classValue)}`);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to load students.');
        setStudents([]);
        return;
      }

      setStudents(result.students || []);
    } catch (err) {
      setError(err.message);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassChange = (e) => {
    const classValue = e.target.value;
    setSelectedClass(classValue);
    fetchStudentsByClass(classValue);
  };

  // Filter students based on search query (by student ID or Name)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.StudentID || '').toLowerCase().includes(query) ||
        (s.StudentName || '').toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    if (filteredStudents.length === 0) {
      return { totalStudents: 0, totalAnnualFees: 0, totalReceived: 0, totalBalance: 0 };
    }
    let totalAnnualFees = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    filteredStudents.forEach((student) => {
      totalAnnualFees += Number(student.TotalAnnualFees || 0);
      totalReceived += Number(student.totalreceived || 0);
      totalBalance += Number(student.balance || 0);
    });

    return {
      totalStudents: filteredStudents.length,
      totalAnnualFees,
      totalReceived,
      totalBalance,
    };
  }, [filteredStudents]);

  // Export to CSV utility
  const exportToCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = ['S.No', 'Student ID', 'Student Name', 'Class', 'Total Annual Fees', 'Total Received', 'Balance'];
    const rows = filteredStudents.map((student, index) => [
      index + 1,
      `"${student.StudentID}"`,
      `"${student.StudentName}"`,
      `"${student.Class}"`,
      student.TotalAnnualFees || 0,
      student.totalreceived || 0,
      student.balance || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Class_${selectedClass || 'All'}_Fee_Balance_Summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-slate-100 py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-slate-100">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Class Balance Summary</h1>
            <p className="text-slate-500 mt-2">Filter and manage student fee outstanding balances by class and search terms.</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <Link
              href="/students"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-sm flex items-center gap-2"
            >
              ← Student Directory
            </Link>
            <Link
              href="/fee"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition text-sm"
            >
              Collect New Fee
            </Link>
          </div>
        </div>

        {/* Filters and Search Utility Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Class</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-slate-700 shadow-sm transition"
            >
              <option value="">-- Choose Class --</option>
              {classes.map((classValue) => (
                <option key={classValue} value={classValue}>
                  Class {classValue}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-2/3">
            <label className="block text-sm font-bold text-slate-700 mb-2">Search Student</label>
            <input
              type="text"
              value={searchQuery}
              disabled={!selectedClass}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedClass ? "Search by student ID or student name..." : "Please select a class first..."}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 disabled:bg-slate-50 shadow-sm transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-slate-500 font-semibold">Loading student records...</span>
          </div>
        )}

        {!isLoading && selectedClass && (
          <>
            {/* Stats Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Total Students</p>
                <p className="text-3xl font-extrabold mt-1">{stats.totalStudents}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-100">
                <p className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">Total Expected Fees</p>
                <p className="text-3xl font-extrabold mt-1">₹{stats.totalAnnualFees.toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-100">
                <p className="text-xs text-blue-100 uppercase tracking-wider font-semibold">Total Fees Received</p>
                <p className="text-3xl font-extrabold mt-1">₹{stats.totalReceived.toLocaleString('en-IN')}</p>
              </div>

              <div className={`bg-gradient-to-br p-5 rounded-2xl text-white shadow-lg ${
                stats.totalBalance > 0 
                  ? 'from-amber-500 to-amber-600 shadow-amber-100' 
                  : 'from-slate-700 to-slate-800 shadow-slate-200'
              }`}>
                <p className="text-xs text-amber-100 uppercase tracking-wider font-semibold">Outstanding Balance</p>
                <p className="text-3xl font-extrabold mt-1">₹{stats.totalBalance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Showing {filteredStudents.length} of {students.length} students
              </span>
              <button
                onClick={exportToCSV}
                disabled={filteredStudents.length === 0}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-xl transition text-xs flex items-center gap-1.5 border border-emerald-100"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Students Balance Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Fees</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-150">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-slate-400 italic">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => {
                      const total = student.TotalAnnualFees || 0;
                      const received = student.totalreceived || 0;
                      const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;
                      
                      return (
                        <tr key={student.StudentID} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{student.StudentID}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                            <div className="flex flex-col">
                              <span>{student.StudentName}</span>
                              {student.Status && (
                                <span className={`inline-flex items-center w-max mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  student.Status.toLowerCase() === 'active'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : student.Status.toLowerCase() === 'left'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {student.Status}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Class {student.Class}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600">₹{total.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 font-medium">₹{received.toLocaleString('en-IN')}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                            student.balance > 0 ? 'text-amber-600' : 'text-slate-700'
                          }`}>
                            ₹{student.balance.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider ${
                                student.balance <= 0 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : percent > 50 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-amber-100 text-amber-800'
                              }`}>
                                {student.balance <= 0 ? 'Fully Paid' : `${percent}% Paid`}
                              </span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    student.balance <= 0 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`} 
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/feesummary/${encodeURIComponent(student.StudentID)}`}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"
                              >
                                View History
                              </Link>
                              <Link
                                href={`/fee?studentID=${student.StudentID}`}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                              >
                                Collect Fee
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!selectedClass && !isLoading && (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-slate-800">No Class Selected</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Please select a class from the dropdown above to view student financial and fee summary records.</p>
          </div>
        )}
      </div>
    </div>
  );
}
