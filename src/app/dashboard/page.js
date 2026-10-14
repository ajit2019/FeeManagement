'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [classBreakdown, setClassBreakdown] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // 'active' (default) or 'all'
  const [searchClass, setSearchClass] = useState('');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);

  const fetchDashboardStats = async (statusMode = 'active') => {
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/dashboard/stats?status=${statusMode}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch financial metrics');
      }

      setStats(data.summary);
      setClassBreakdown(data.classBreakdown || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Error loading dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(filterStatus);
  }, [filterStatus]);

  // Filtered class breakdown based on search input
  const filteredClasses = useMemo(() => {
    if (!searchClass.trim()) return classBreakdown;
    const query = searchClass.toLowerCase().trim();
    return classBreakdown.filter(
      (c) =>
        c.class.toLowerCase().includes(query) ||
        `class ${c.class}`.toLowerCase().includes(query)
    );
  }, [classBreakdown, searchClass]);

  // Totals for filtered classes
  const filteredTotals = useMemo(() => {
    return filteredClasses.reduce(
      (acc, curr) => {
        acc.studentCount += curr.studentCount;
        acc.totalAnnual += curr.totalAnnual;
        acc.totalReceived += curr.totalReceived;
        acc.balance += curr.balance;
        return acc;
      },
      { studentCount: 0, totalAnnual: 0, totalReceived: 0, balance: 0 }
    );
  }, [filteredClasses]);

  const links = [
    {
      href: '/admission',
      title: 'Student Admission Form',
      description: 'Register new students, fill details, and print admission forms.',
      color: 'from-blue-500 to-indigo-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      href: '/studentdetails',
      title: 'Student Admission Registry',
      description: 'View, search, edit status, and manage student details database.',
      color: 'from-cyan-500 to-blue-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: '/fee',
      title: 'Fee Submission Form',
      description: 'Record fee transactions, print receipts, and track remaining balance.',
      color: 'from-emerald-500 to-teal-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/balance',
      title: 'Class Balance Summary',
      description: 'Get class-wise balance fees, view total dues, and export stats.',
      color: 'from-amber-500 to-orange-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/fees/by-date',
      title: 'Fee Summary by Date',
      description: 'Track daily fee receipts, slip numbers, and total revenue collected.',
      color: 'from-violet-500 to-purple-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/about',
      title: 'About System',
      description: 'Learn about the features, database configurations, and system updates.',
      color: 'from-slate-500 to-slate-700',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full space-y-10">
        
        {/* Top Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Shivam School Panel
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Dashboard
            </span>
          </div>
          <p className="mt-1 text-sm sm:text-base text-gray-500">
            Student fee management, admissions, records, and financial summary.
          </p>
        </div>

        {/* Student Management Modules Section (Top) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Student Management Modules
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Access all operational features, forms, and student logs.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {links.length} Modules Available
            </span>
          </div>

          {/* Dashboard Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                    {link.icon}
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                    {link.title}
                  </h3>
                  <p className="mt-2 text-gray-500 text-sm leading-relaxed">
                    {link.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-800 transition-colors duration-200">
                  Open Module
                  <svg
                    className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Financial & Revenue Overview Section (Bottom) */}
        <div className="pt-6 border-t border-gray-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Financial Overview & Revenue Statistics
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live Metrics
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Annual revenue projections, received till date, balance to be received, and active student metrics.
              </p>
            </div>

            {/* Controls: Filter & Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl p-1 bg-white border border-gray-200 shadow-sm text-xs font-medium">
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === 'active'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Registered & Active Only
                </button>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Enrolled Students
                </button>
              </div>

              <button
                onClick={() => fetchDashboardStats(filterStatus)}
                disabled={isLoading}
                title="Refresh financial statistics"
                className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <svg
                  className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-600' : 'text-gray-600'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm text-sm text-red-700">
              <strong>Notice:</strong> {error}
            </div>
          )}

          {/* 4 Financial Metric Cards: Total Revenue, Received Till Date, Balance to be Received, Active Students */}
          <div>
            {isLoading && !stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: TOTAL ANNUAL REVENUE */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                        Total Annual Revenue
                      </span>
                      <span className="p-2 bg-white/10 rounded-xl">
                        <svg className="w-5 h-5 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
                      ₹{(stats?.totalAnnualRevenue || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100">
                    <span>Sum of annual fees of all classes</span>
                    <span className="font-semibold bg-emerald-800/40 px-2 py-0.5 rounded">
                      {filterStatus === 'active' ? 'Active Students' : 'All Enrolled'}
                    </span>
                  </div>
                </div>

                {/* Card 2: RECEIVED TILL TODAY'S DATE */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                        Received Till Date
                      </span>
                      <span className="p-2 bg-white/10 rounded-xl">
                        <svg className="w-5 h-5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
                      ₹{(stats?.totalReceived || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-blue-100">
                    <span>Total fee collected to date</span>
                    <span className="font-semibold bg-blue-800/40 px-2 py-0.5 rounded">
                      {stats?.collectionRatePercentage || 0}% Collected
                    </span>
                  </div>
                </div>

                {/* Card 3: BALANCE TO BE RECEIVED */}
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-200/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
                        Balance To Be Received
                      </span>
                      <span className="p-2 bg-white/10 rounded-xl">
                        <svg className="w-5 h-5 text-amber-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
                      ₹{(stats?.totalBalance || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-amber-100">
                    <span>Outstanding for all classes</span>
                    <span className="font-semibold bg-amber-700/40 px-2 py-0.5 rounded">
                      Pending
                    </span>
                  </div>
                </div>

                {/* Card 4: ACTIVE STUDENTS & COLLECTION RATE */}
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-purple-200/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-100">
                        {filterStatus === 'active' ? 'Active Students' : 'Total Students'}
                      </span>
                      <span className="p-2 bg-white/10 rounded-xl">
                        <svg className="w-5 h-5 text-purple-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-3">
                      <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {stats?.studentCount || 0}
                      </p>
                      <span className="text-sm text-purple-200">Across {stats?.classesCount || 0} classes</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-xs text-purple-100 mb-1.5">
                      <span>Collection Progress</span>
                      <span className="font-bold">{stats?.collectionRatePercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-purple-900/60 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, stats?.collectionRatePercentage || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Collapsible Class-Wise Breakdown Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Class-Wise Annual Revenue & Balance Breakdown</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                    {classBreakdown.length} Classes
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Detailed breakdown of expected annual fees, collections received till today, and balance by class.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  placeholder="Search class..."
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 w-36 sm:w-44 shadow-sm"
                />
                <button
                  onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition shadow-sm flex items-center gap-1.5"
                >
                  {isBreakdownOpen ? 'Collapse Table' : 'Expand Table'}
                  <svg
                    className={`w-3.5 h-3.5 transform transition-transform ${isBreakdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {isBreakdownOpen && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100/70 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 text-left">Class</th>
                      <th className="px-4 py-3.5 text-center">
                        {filterStatus === 'active' ? 'Active Students' : 'Students'}
                      </th>
                      <th className="px-4 py-3.5 text-right">Total Annual Fees</th>
                      <th className="px-4 py-3.5 text-right">Received Till Date</th>
                      <th className="px-4 py-3.5 text-right">Balance Due</th>
                      <th className="px-4 py-3.5 text-center">Collection %</th>
                      <th className="px-4 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100 text-sm">
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                          No class records match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((cls) => (
                        <tr key={cls.class} className="hover:bg-blue-50/40 transition">
                          <td className="px-4 py-3.5 whitespace-nowrap font-bold text-gray-900">
                            Class {cls.class}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center text-gray-600 font-medium">
                            {cls.studentCount}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-gray-900 font-semibold">
                            ₹{cls.totalAnnual.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-emerald-600 font-semibold">
                            ₹{cls.totalReceived.toLocaleString('en-IN')}
                          </td>
                          <td className={`px-4 py-3.5 whitespace-nowrap text-right font-bold ${
                            cls.balance > 0 ? 'text-amber-600' : 'text-gray-600'
                          }`}>
                            ₹{cls.balance.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cls.collectionRate >= 70
                                      ? 'bg-emerald-500'
                                      : cls.collectionRate >= 40
                                      ? 'bg-blue-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${cls.collectionRate}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-8 text-right">
                                {cls.collectionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-medium">
                            <Link
                              href={`/balance?class=${encodeURIComponent(cls.class)}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              View Balance
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredClasses.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-extrabold text-sm text-gray-900">
                      <tr>
                        <td className="px-4 py-3.5">Total</td>
                        <td className="px-4 py-3.5 text-center">{filteredTotals.studentCount}</td>
                        <td className="px-4 py-3.5 text-right text-gray-900">
                          ₹{filteredTotals.totalAnnual.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right text-emerald-700">
                          ₹{filteredTotals.totalReceived.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right text-amber-700">
                          ₹{filteredTotals.balance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {filteredTotals.totalAnnual > 0
                            ? Math.round((filteredTotals.totalReceived / filteredTotals.totalAnnual) * 100)
                            : 0}
                          %
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="text-center text-sm text-gray-400 mt-16 pb-4">
        &copy; {new Date().getFullYear()} Shivam Education System. All rights reserved.
      </div>
    </div>
  );
}
