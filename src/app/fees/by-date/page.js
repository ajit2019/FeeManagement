'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const getTodayDate = () => {
  const localDate = new Date();
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '₹0.00';
  return `₹${n.toFixed(2)}`;
}

export default function FeeSummaryByDate() {
  const [selectedDate, setSelectedDate] = useState('');
  const [slips, setSlips] = useState([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Set default date to today on mount
  useEffect(() => {
    setSelectedDate(getTodayDate());
  }, []);

  const fetchSummaryByDate = async (date) => {
    if (!date) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/fees/by-date?date=${encodeURIComponent(date)}`);
      const result = await res.json();
      if (result.success) {
        setSlips(result.slips || []);
        setTotalReceived(result.totalReceived || 0);
      } else {
        setError(result.error || 'Failed to fetch fee summary.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading the fee summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchSummaryByDate(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fee Summary By Date</h1>
            <p className="text-gray-500 mt-1">Select a date to view all received payments, slip numbers, and total revenue.</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Date Selector & Total Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Date Picker Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
            <label htmlFor="summary-date" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Date
            </label>
            <input
              id="summary-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all font-medium text-gray-800"
            />
          </div>

          {/* Revenue Stat Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-md text-white flex flex-col justify-between">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Revenue Collected</p>
              <h3 className="text-4xl font-extrabold mt-1 tracking-tight">
                {isLoading ? (
                  <span className="opacity-50">Loading...</span>
                ) : (
                  formatMoney(totalReceived)
                )}
              </h3>
            </div>
            <div className="text-blue-100 text-xs mt-4 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Based on {slips.length} slip{slips.length !== 1 ? 's' : ''} generated on {selectedDate}</span>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {error && (
            <div className="p-6 bg-red-50 border-b border-red-100 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-medium">Fetching transactions ledger...</p>
            </div>
          ) : slips.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No fee payments found on {selectedDate}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Slip No</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fee Details</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {slips.map((slip) => (
                    <tr key={slip.slipNo} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{slip.slipNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/feesummary/${encodeURIComponent(slip.studentId)}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {slip.studentId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{slip.studentName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {slip.details.map((detail, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                            >
                              {detail.feeHead} {detail.monthPaid ? `(${detail.monthPaid})` : ''}: {formatMoney(detail.amount)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600">
                        {formatMoney(slip.totalAmount)}
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
