'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const MONTH_FEE_KEYS = [
  { key: 'AprilFee', label: 'April' },
  { key: 'MayFee', label: 'May' },
  { key: 'JuneFee', label: 'June' },
  { key: 'JulyFee', label: 'July' },
  { key: 'AugustFee', label: 'Aug' },
  { key: 'SeptFee', label: 'Sept' },
  { key: 'OctFee', label: 'Oct' },
  { key: 'NovFee', label: 'Nov' },
  { key: 'DecFee', label: 'Dec' },
  { key: 'JanFee', label: 'Jan' },
  { key: 'FebFee', label: 'Feb' },
  { key: 'MarchFee', label: 'March' },
];

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(2);
}

function monthFeesForRow(row) {
  return MONTH_FEE_KEYS.map(({ key, label }) => {
    const v = row[key];
    if (v === null || v === undefined || v === '' || Number(v) === 0) return null;
    return { label, amount: v };
  }).filter(Boolean);
}

export default function FeeSummaryPage() {
  const params = useParams();
  const rawId = params?.studentID;
  const studentID = typeof rawId === 'string' ? decodeURIComponent(rawId) : '';

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentID) {
      setIsLoading(false);
      setError('Invalid student ID in URL.');
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/fee/summary?studentID=${encodeURIComponent(studentID)}`
        );
        const result = await response.json();

        if (cancelled) return;

        if (!result.success) {
          setError(result.error || 'Failed to load fee summary.');
          setRecords([]);
          return;
        }

        setRecords(result.records || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRecords([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentID]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Fee summary</h1>
            <p className="text-gray-600 mt-1">
              Student ID:{' '}
              <span className="font-semibold text-gray-900">{studentID || '—'}</span>
            </p>
          </div>
          <Link
            href="/balance"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Back to class balance
          </Link>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        {isLoading && <p className="text-gray-600">Loading fee records…</p>}

        {!isLoading && !error && records.length === 0 && (
          <p className="text-gray-600">
            No fee payments found for this student in FeeDetails.
          </p>
        )}

        {!isLoading && records.length > 0 && (
          <div className="space-y-8">
            {records.map((row) => {
              const months = monthFeesForRow(row);
              return (
                <div
                  key={row.SlipNo}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <span>
                        <strong>Slip No:</strong> {row.SlipNo}
                      </span>
                      <span>
                        <strong>Date:</strong> {row.Date ?? '—'}
                      </span>
                      <span>
                        <strong>Student:</strong> {row.StudentName ?? '—'}
                      </span>
                      <span>
                        <strong>Class:</strong> {row.Class ?? '—'}
                      </span>
                    </div>
                    {row['Father/Mother Name'] && (
                      <p className="text-sm text-gray-700 mt-1">
                        <strong>Parent:</strong> {row['Father/Mother Name']}
                      </p>
                    )}
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-2">
                        Monthly fees (this slip)
                      </h3>
                      {months.length === 0 ? (
                        <p className="text-sm text-gray-500">No month-wise fee on this slip.</p>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {months.map((m) => (
                            <li key={m.label} className="flex justify-between max-w-xs">
                              <span>{m.label}</span>
                              <span>{formatMoney(m.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-2">
                        Other amounts
                      </h3>
                      <ul className="text-sm space-y-1 max-w-xs">
                        <li className="flex justify-between">
                          <span>Admission fee</span>
                          <span>{formatMoney(row.AdmissionFee)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Books / stationary</span>
                          <span>{formatMoney(row.BooksStationary)}</span>
                        </li>
                        <li className="flex justify-between font-semibold border-t pt-2 mt-2">
                          <span>Total received</span>
                          <span>{formatMoney(row.TotalReceived)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
