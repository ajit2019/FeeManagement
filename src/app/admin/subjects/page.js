'use client';

import { useState, useEffect } from 'react';

export default function SubjectsMaster() {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/subjects');
      const result = await res.json();
      if (result.success) {
        setSubjects(result.data || []);
      } else {
        alert(result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_name: newSubject }),
      });
      const result = await res.json();
      if (result.success) {
        setNewSubject('');
        fetchSubjects();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Subject Master</h1>
        <p className="text-gray-500 mt-2">Manage all registered school subjects.</p>

        {/* Add Subject Form */}
        <form onSubmit={handleAddSubject} className="mt-8 flex gap-4 bg-gray-50 p-6 rounded-xl border border-gray-150">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Name</label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Mathematics, Social Studies"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition duration-200 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Subject'}
            </button>
          </div>
        </form>

        {/* Subjects List */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Available Subjects</h2>
          {isLoading ? (
            <p className="text-gray-500">Loading subjects...</p>
          ) : subjects.length === 0 ? (
            <p className="text-gray-400 italic">No subjects configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-sm transition"
                >
                  <span className="text-sm font-semibold text-gray-800">{sub.subject_name}</span>
                  <span className="text-xs text-gray-400 font-mono">ID: {sub.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
