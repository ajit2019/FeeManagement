'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = async (search = '') => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
      const result = await res.json();
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredStudents = students.filter(student => {
    if (statusFilter === 'all') return true;
    return (student.Status || 'active').toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Student Directory</h1>
            <p className="text-gray-500 mt-1">Search active students, view classes, and manage actions.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Link
              href="/admission"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition"
            >
              New Admission
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or student ID..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-gray-700"
          >
            <option value="active">Active Students</option>
            <option value="left">Left / Inactive Students</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        {/* Directory List */}
        <div className="mt-8">
          {isLoading ? (
            <p className="text-gray-500">Loading student directory...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-gray-400 italic text-center py-8">No students found matching that criteria.</p>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-xl shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.StudentID} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{student.StudentID}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{student.StudentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.Class}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.RollNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (student.Status || 'active').toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(student.Status || 'active').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/fee?studentID=${student.StudentID}`}
                          className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg font-bold transition mr-2"
                        >
                          Collect Fee
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
