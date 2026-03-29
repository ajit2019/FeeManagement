'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function BalancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Class Balance Summary</h1>
          <p className="text-gray-600 mt-2">Select class to view student balance details</p>
        </div>

        <div className="mb-6 max-w-sm">
          <label className="block text-sm font-semibold mb-2">Select Class</label>
          <select
            value={selectedClass}
            onChange={handleClassChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose Class --</option>
            {classes.map((classValue) => (
              <option key={classValue} value={classValue}>
                Class {classValue}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-red-600 mb-4">{error}</p>
        )}

        {isLoading && <p className="text-gray-600">Loading students...</p>}

        {!isLoading && selectedClass && (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="border px-4 py-2 text-left">Student ID</th>
                  <th className="border px-4 py-2 text-left">Student Name</th>
                  <th className="border px-4 py-2 text-left">Class</th>
                  <th className="border px-4 py-2 text-right">Total Annual Fees</th>
                  <th className="border px-4 py-2 text-right">Total Received</th>
                  <th className="border px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border px-4 py-4 text-center text-gray-600">
                      No students found for selected class.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.StudentID}>
                      <td className="border px-4 py-2">
                        <Link
                          href={`/feesummary/${encodeURIComponent(student.StudentID)}`}
                          className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                        >
                          {student.StudentID}
                        </Link>
                      </td>
                      <td className="border px-4 py-2">{student.StudentName}</td>
                      <td className="border px-4 py-2">{student.Class}</td>
                      <td className="border px-4 py-2 text-right">{student.TotalAnnualFees ?? 0}</td>
                      <td className="border px-4 py-2 text-right">{student.totalreceived ?? 0}</td>
                      <td className="border px-4 py-2 text-right font-semibold">{student.balance ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
