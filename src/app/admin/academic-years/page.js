'use client';

import { useState, useEffect } from 'react';

export default function AcademicYearsMaster() {
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/academic-years');
      const result = await res.json();
      if (result.success) {
        setSessions(result.data || []);
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
    fetchSessions();
  }, []);

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{4}$/.test(newSession)) {
      alert('Please enter a valid academic session format (e.g. 2026-2027)');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_string: newSession, is_active: false }),
      });
      const result = await res.json();
      if (result.success) {
        alert('Session added successfully!');
        setNewSession('');
        fetchSessions();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to add session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (session) => {
    try {
      const res = await fetch('/api/admin/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_string: session.year_string, is_active: !session.is_active }),
      });
      const result = await res.json();
      if (result.success) {
        fetchSessions();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to toggle active status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Academic Year Master</h1>
        <p className="text-gray-500 mt-2">Manage academic terms and designate the current active session.</p>

        {/* Add Session Form */}
        <form onSubmit={handleAddSession} className="mt-8 flex gap-4 bg-gray-50 p-6 rounded-xl border border-gray-150">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Academic Session</label>
            <input
              type="text"
              value={newSession}
              onChange={(e) => setNewSession(e.target.value)}
              placeholder="e.g. 2026-2027"
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
              {isSubmitting ? 'Adding...' : 'Add Session'}
            </button>
          </div>
        </form>

        {/* Sessions List */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Configured Academic Years</h2>
          {isLoading ? (
            <p className="text-gray-500">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-400 italic">No academic years set up yet.</p>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((session) => (
                    <tr key={session.year_string}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.year_string}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.is_active ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active Session
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleActive(session)}
                          className={`text-xs px-4 py-2 rounded-lg font-bold transition duration-150 ${
                            session.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {session.is_active ? 'Deactivate' : 'Set as Active'}
                        </button>
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
