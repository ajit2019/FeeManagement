'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { EXPENSE_HEADS, PAYMENT_MODES } from '@/lib/constants';

function formatCurrency(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IncomeExpensesDashboard() {
  // Current month in YYYY-MM format
  const today = new Date();
  const defaultMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonthStr);
  const [ledgerData, setLedgerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    voucher_no: '',
    date: today.toISOString().split('T')[0],
    paid_to: '',
    amount: '',
    expense_head: 'Miscellaneous',
    purpose: '',
    payment_mode: 'Cash',
    reference_no: '',
    remarks: '',
  });

  // Income form state (Receipt No, Head, Amount, Date)
  const [incomeForm, setIncomeForm] = useState({
    date: today.toISOString().split('T')[0],
    receipt_from: '',
    receipt_to: '',
    receipt_note: '',
    head: 'Cash',
    customHead: '',
    source_title: 'Tuition Fee Collection',
    amount: '',
    remarks: '',
  });

  // Opening balance form state
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Ledger data
  const fetchLedger = async (month) => {
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`/api/expenses/ledger?month=${encodeURIComponent(month)}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch income-expenses ledger.');
      }

      setNeedsSetup(Boolean(data.needsSetup));
      setLedgerData(data);
      if (data.summary?.openingBalance !== undefined) {
        setOpeningBalanceInput(String(data.summary.openingBalance));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading dashboard ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(selectedMonth);
  }, [selectedMonth]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  // Month title formatter (e.g., "October 2026-27" like in Image 1)
  const monthTitle = useMemo(() => {
    if (!selectedMonth) return '';
    const [y, m] = selectedMonth.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    
    // Academic year format: if month >= 4 (April) => year-(year+1)%100, else (year-1)-year%100
    const startYear = m >= 4 ? y : y - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
    return `${monthName} ${startYear}-${endYearShort}`;
  }, [selectedMonth]);

  // Filtered ledger rows
  const displayRows = useMemo(() => {
    if (!ledgerData?.ledger) return [];
    if (!activeOnly) return ledgerData.ledger;
    return ledgerData.ledger.filter((r) => r.isOpeningBalance || r.hasActivity);
  }, [ledgerData, activeOnly]);

  // Submit New Expense
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save expense.');
      }

      setIsExpenseModalOpen(false);
      // Reset form
      setExpenseForm({
        voucher_no: '',
        date: expenseForm.date,
        paid_to: '',
        amount: '',
        expense_head: 'Miscellaneous',
        purpose: '',
        payment_mode: 'Cash',
        reference_no: '',
        remarks: '',
      });
      // Refresh ledger
      await fetchLedger(selectedMonth);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Income Entry
  const handleCreateOtherIncome = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Determine final receipt label: e.g. "0556 to 0557" or "a/c138 se"
      let finalReceiptNo = incomeForm.receipt_note.trim();
      if (!finalReceiptNo && (incomeForm.receipt_from || incomeForm.receipt_to)) {
        const from = incomeForm.receipt_from.trim();
        const to = incomeForm.receipt_to.trim();
        finalReceiptNo = from && to ? `${from} to ${to}` : (from || to);
      }

      const resolvedHead = incomeForm.head === 'Other'
        ? (incomeForm.customHead.trim() || 'Cash')
        : (incomeForm.head || 'Cash');

      const res = await fetch('/api/expenses/other-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: incomeForm.date,
          receipt_no: finalReceiptNo || null,
          head: resolvedHead,
          source_title: incomeForm.source_title || 'Fee / Income Collection',
          amount: Number(incomeForm.amount),
          remarks: incomeForm.remarks || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save income entry.');
      }

      setIsIncomeModalOpen(false);
      setIncomeForm({
        date: incomeForm.date,
        receipt_from: '',
        receipt_to: '',
        receipt_note: '',
        head: 'Cash',
        customHead: '',
        source_title: 'Tuition Fee Collection',
        amount: '',
        remarks: '',
      });
      await fetchLedger(selectedMonth);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an income entry
  const handleDeleteIncome = async (id) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    try {
      const res = await fetch(`/api/expenses/other-income?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete income.');
      await fetchLedger(selectedMonth);
      if (selectedDayDetails) {
        setSelectedDayDetails((prev) => ({
          ...prev,
          otherIncomes: prev.otherIncomes.filter((i) => i.id !== id),
        }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Opening Balance
  const handleSaveOpeningBalance = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/expenses/opening-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_key: selectedMonth,
          opening_balance: Number(openingBalanceInput) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update opening balance.');
      }

      setIsOpeningBalanceModalOpen(false);
      await fetchLedger(selectedMonth);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an expense voucher
  const handleDeleteVoucher = async (id) => {
    if (!confirm('Are you sure you want to delete this expense voucher?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete.');
      await fetchLedger(selectedMonth);
      if (selectedDayDetails) {
        setSelectedDayDetails((prev) => ({
          ...prev,
          vouchers: prev.vouchers.filter((v) => v.id !== id),
        }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Copy SQL script
  const sqlSetupScript = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS expense_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_to TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  purpose TEXT,
  expense_head TEXT NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS other_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_title TEXT NOT NULL,
  receipt_no TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Online',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_opening_balances (
  month_key TEXT PRIMARY KEY,
  opening_balance NUMERIC(12, 2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSetupScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Income & Expenses Dashboard
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                Cash Book Ledger
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Monthly day-book, student fee income, voucher expenses, and running cash balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>

            <button
              onClick={() => setIsOpeningBalanceModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            >
              <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last Month Balance
            </button>

            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 border border-emerald-400 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-sm"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Add Income (Receipt)
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition shadow-md"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Add Expense (Voucher)
            </button>
          </div>
        </div>

        {/* Supabase Missing Table Setup Notice */}
        {needsSetup && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Database Tables Setup Required in Supabase</span>
              </div>
              <button
                onClick={copySqlToClipboard}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
              >
                {copiedSql ? '✓ Copied SQL!' : 'Copy SQL Script'}
              </button>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              To store manual expenses and other income, paste and run this SQL script in your{' '}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">
                Supabase SQL Editor
              </a>. Once executed, reload this page to start recording entries immediately.
            </p>
            <pre className="bg-slate-900 text-slate-100 text-xs p-3.5 rounded-xl overflow-x-auto font-mono max-h-48 border border-slate-700">
              {sqlSetupScript}
            </pre>
          </div>
        )}

        {/* Month Selector Bar + Quick Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7m0 0l7-7" />
              </svg>
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-1.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />

            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="ml-2 text-sm font-extrabold text-purple-900 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
              {monthTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
              Show Active Days Only
            </label>

            <button
              onClick={() => fetchLedger(selectedMonth)}
              disabled={isLoading}
              title="Refresh ledger"
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : 'text-gray-600'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= SECTION 1: CUMULATIVE OF ALL MONTHS (TOTAL INCOME, EXPENSES, BALANCE) ================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-900">
                All-Time Overall Financial Totals (Cumulative of All Months)
              </h2>
            </div>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
              Net All-Time Summary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Cumulative Card 1: Total Income */}
            <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 rounded-2xl p-5 text-white shadow-md border border-emerald-600/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                  Total Income (Cumulative All Months)
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(ledgerData?.cumulative?.totalIncome)}
              </p>
              <div className="text-[11px] text-emerald-100/80 mt-2 flex justify-between items-center border-t border-emerald-600/30 pt-1.5">
                <span>Fee: {formatCurrency(ledgerData?.cumulative?.feeIncome)}</span>
                <span>Other: {formatCurrency(ledgerData?.cumulative?.otherIncome)}</span>
              </div>
            </div>

            {/* Cumulative Card 2: Total Expense */}
            <div className="bg-gradient-to-br from-rose-700 via-red-800 to-rose-950 rounded-2xl p-5 text-white shadow-md border border-rose-600/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-100">
                  Total Expenses (Cumulative All Months)
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-rose-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(ledgerData?.cumulative?.totalExpense)}
              </p>
              <p className="text-[11px] text-rose-100/80 mt-2 border-t border-rose-600/30 pt-1.5">
                Total vouchers recorded across all months
              </p>
            </div>

            {/* Cumulative Card 3: Cash Balance */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-5 text-white shadow-md border border-indigo-700/40 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Total Cash Balance (Cumulative All Months)
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-emerald-400">
                {formatCurrency(ledgerData?.cumulative?.cashBalance)}
              </p>
              <div className="text-[11px] text-slate-300 mt-2 flex justify-between items-center border-t border-indigo-800/40 pt-1.5">
                <span>All-Time Income - All-Time Expenses</span>
                <span className="font-bold text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded">Net In Hand</span>
              </div>
            </div>

          </div>
        </div>

        {/* ================= SECTION 2: MONTHLY LEDGER BANNER CARDS (Image 1 Excel Header Style) ================= */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Monthly Summary for {monthTitle}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Opening Balance: {formatCurrency(ledgerData?.summary?.openingBalance)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Month Card 1: Total Income Amount */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl p-5 text-white shadow-md border border-purple-900/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  {monthTitle} Total Income
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(ledgerData?.summary?.totalIncome)}
              </p>
              <p className="text-[11px] text-purple-200/80 mt-2">
                Fee Collections + Other Income in {monthTitle}
              </p>
            </div>

            {/* Month Card 2: Total Expense Amount */}
            <div className="bg-gradient-to-r from-purple-900 to-fuchsia-950 rounded-2xl p-5 text-white shadow-md border border-purple-900/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-200">
                  {monthTitle} Total Expenses
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-fuchsia-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(ledgerData?.summary?.totalExpense)}
              </p>
              <p className="text-[11px] text-fuchsia-200/80 mt-2">
                Sum of all vouchers recorded in {monthTitle}
              </p>
            </div>

            {/* Month Card 3: Total Cash Balance */}
            <div className="bg-gradient-to-r from-slate-900 to-purple-950 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  {monthTitle} Closing Balance
                </span>
                <span className="p-1.5 bg-white/10 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-emerald-400">
                {formatCurrency(ledgerData?.summary?.cashBalance)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2">
                <span>Opening: {formatCurrency(ledgerData?.summary?.openingBalance)}</span>
                <span className="font-semibold text-emerald-300">Month End Position</span>
              </div>
            </div>

          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Monthly Ledger Table (Matching Image 1 Excel Structure) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Table Header Banner */}
          <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 px-6 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black tracking-wide uppercase">
                {monthTitle}
              </span>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                Daily Financial Day-Book
              </span>
            </div>
            <span className="text-xs text-white/90 hidden sm:inline">
              Daily Running Cash Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-400 text-gray-900 font-extrabold uppercase text-xs tracking-wider border-b-2 border-amber-500 text-center">
                  <th className="py-3 px-3 text-left border-r border-amber-500/40 w-28">Date</th>
                  <th className="py-3 px-3 border-r border-amber-500/40 w-36">Receipt No to Receipt No</th>
                  <th className="py-3 px-3 border-r border-amber-500/40 w-24">Head</th>
                  <th className="py-3 px-4 text-left border-r border-amber-500/40">Expense Details</th>
                  <th className="py-3 px-3 text-right border-r border-amber-500/40 w-28 bg-amber-300/80">Income (₹)</th>
                  <th className="py-3 px-3 text-right border-r border-amber-500/40 w-28 bg-amber-300/80">Expense (₹)</th>
                  <th className="py-3 px-3 text-right w-32 bg-amber-300">Balance (₹)</th>
                  <th className="py-3 px-2 text-center w-16 print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading && !ledgerData ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500 italic">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Calculating monthly ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                      No records found for this month.
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row, idx) => {
                    // Row 0 is Opening Balance
                    if (row.isOpeningBalance) {
                      return (
                        <tr key="opening-row" className="bg-emerald-50/70 font-bold border-b-2 border-emerald-200">
                          <td className="py-2.5 px-3 border-r border-gray-200 text-emerald-900">
                            -
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-gray-200 text-gray-500">
                            -
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-gray-200 text-gray-500">
                            -
                          </td>
                          <td className="py-2.5 px-4 border-r border-gray-200">
                            <span className="inline-block bg-emerald-700 text-white font-bold px-2.5 py-0.5 rounded text-xs">
                              Last Month balance
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800 border-r border-gray-200">
                            {formatCurrency(row.income)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-400 border-r border-gray-200">
                            ₹0.00
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-900 bg-emerald-100/50">
                            {formatCurrency(row.balance)}
                          </td>
                          <td className="py-2.5 px-2 text-center print:hidden">
                            <button
                              onClick={() => setIsOpeningBalanceModalOpen(true)}
                              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline"
                              title="Edit Opening Balance"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const isHighlight = row.hasActivity;

                    return (
                      <tr
                        key={row.date}
                        className={`hover:bg-purple-50/50 transition ${
                          isHighlight ? 'bg-white font-medium' : 'bg-gray-50/40 text-gray-400'
                        }`}
                      >
                        {/* Date */}
                        <td className="py-2 px-3 border-r border-gray-200 font-mono text-gray-900 whitespace-nowrap">
                          {row.dateFormatted}
                        </td>

                        {/* Receipt No to Receipt No */}
                        <td className="py-2 px-3 text-center border-r border-gray-200 font-mono font-semibold text-gray-800">
                          {row.receiptRange !== '-' ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-xs">
                              {row.receiptRange}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Head */}
                        <td className="py-2 px-3 text-center border-r border-gray-200 text-xs font-semibold">
                          {row.head === '-' ? (
                            <span className="text-gray-300">-</span>
                          ) : row.head.toLowerCase().includes('cash') ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Cash
                            </span>
                          ) : row.head.toLowerCase().includes('online') ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                              Online
                            </span>
                          ) : row.head.toLowerCase().includes('138') ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              {row.head}
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {row.head}
                            </span>
                          )}
                        </td>

                        {/* Expense Details */}
                        <td className="py-2 px-4 border-r border-gray-200 text-gray-800 text-xs max-w-md truncate">
                          {row.vouchers && row.vouchers.length > 0 ? (
                            <div className="space-y-0.5">
                              {row.vouchers.map((v, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900">
                                    {v.purpose || v.expense_head}:
                                  </span>
                                  <span className="text-red-700 font-bold">
                                    ₹{Number(v.amount).toLocaleString('en-IN')}
                                  </span>
                                  {v.paid_to && (
                                    <span className="text-gray-500 text-[11px]">
                                      (Paid to: {v.paid_to})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">{row.expenseDetails}</span>
                          )}
                        </td>

                        {/* Income */}
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-gray-200 whitespace-nowrap">
                          {row.income > 0 ? formatCurrency(row.income) : <span className="text-gray-400 font-normal">₹0.00</span>}
                        </td>

                        {/* Expense */}
                        <td className="py-2 px-3 text-right font-bold text-red-600 border-r border-gray-200 whitespace-nowrap">
                          {row.expense > 0 ? formatCurrency(row.expense) : <span className="text-gray-400 font-normal">₹0.00</span>}
                        </td>

                        {/* Balance */}
                        <td className={`py-2 px-3 text-right font-bold border-r border-gray-200 whitespace-nowrap ${
                          row.balance >= 0 ? 'text-gray-900' : 'text-red-700'
                        }`}>
                          {formatCurrency(row.balance)}
                        </td>

                        {/* Action: Add Income / Add Expense for this date or inspect */}
                        <td className="py-2 px-2 text-center whitespace-nowrap print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setIncomeForm((prev) => ({ ...prev, date: row.date }));
                                setIsIncomeModalOpen(true);
                              }}
                              title={`+ Add Income on ${row.dateFormatted}`}
                              className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold transition flex items-center gap-0.5"
                            >
                              +Inc
                            </button>
                            <button
                              onClick={() => {
                                setExpenseForm((prev) => ({ ...prev, date: row.date }));
                                setIsExpenseModalOpen(true);
                              }}
                              title={`+ Add Expense on ${row.dateFormatted}`}
                              className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded text-[11px] font-bold transition flex items-center gap-0.5"
                            >
                              +Exp
                            </button>
                            {((row.vouchers && row.vouchers.length > 0) || (row.otherIncomes && row.otherIncomes.length > 0)) && (
                              <button
                                onClick={() => setSelectedDayDetails(row)}
                                title="View day entries"
                                className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {ledgerData && (
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-extrabold text-sm text-gray-900">
                  <tr>
                    <td className="py-3 px-3 uppercase">Total</td>
                    <td className="py-3 px-3 text-center">-</td>
                    <td className="py-3 px-3 text-center">-</td>
                    <td className="py-3 px-4 text-xs font-semibold text-gray-500">
                      Total Month Aggregates
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800 font-black">
                      {formatCurrency(ledgerData?.summary?.totalIncome)}
                    </td>
                    <td className="py-3 px-3 text-right text-red-700 font-black">
                      {formatCurrency(ledgerData?.summary?.totalExpense)}
                    </td>
                    <td className="py-3 px-3 text-right text-purple-950 font-black bg-purple-100/60">
                      {formatCurrency(ledgerData?.summary?.cashBalance)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Expense Category Breakdown Section (Based on 20 Heads) */}
        {ledgerData?.categoryBreakdown && Object.keys(ledgerData.categoryBreakdown).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Category-Wise Expenditure Breakdown</h3>
                <p className="text-xs text-gray-500">Spending across the 20 standard expense heads for {monthTitle}.</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                {Object.keys(ledgerData.categoryBreakdown).length} Categories Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {Object.entries(ledgerData.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([head, amt]) => {
                  const totalExp = ledgerData.summary?.totalExpense || 1;
                  const pct = Math.round((amt / totalExp) * 100);
                  return (
                    <div key={head} className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate" title={head}>
                          {head}
                        </span>
                        <span className="text-xs font-bold text-purple-700">{pct}%</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-base font-black text-gray-900">{formatCurrency(amt)}</p>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-purple-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>

      {/* ================= MODAL 1: ADD EXPENSE VOUCHER (Matching Image 2) ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-t-2xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Shivam Inter College
                </span>
                <h3 className="text-xl font-black tracking-tight">Manual Expense Voucher Entry</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-5">
              
              {/* Row 1: Voucher No & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Voucher No.
                  </label>
                  <input
                    type="text"
                    value={expenseForm.voucher_no}
                    onChange={(e) => setExpenseForm({ ...expenseForm, voucher_no: e.target.value })}
                    placeholder="e.g. 03"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Paid To & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Paid To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name of vendor / teacher / staff"
                    value={expenseForm.paid_to}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paid_to: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Expense Head (The 20 Heads from Voucher) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Expense Head (20 Standard Categories) <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.expense_head}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_head: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {EXPENSE_HEADS.map((head) => (
                    <option key={head} value={head}>
                      {head}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 4: Purpose */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Purpose / Item Breakdown
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stabilizer Electric repairing, Cement, Labour, August salary..."
                  value={expenseForm.purpose}
                  onChange={(e) => setExpenseForm({ ...expenseForm, purpose: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Row 5: Mode of Payment & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Mode of Payment
                  </label>
                  <select
                    value={expenseForm.payment_mode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cheque NO. / UPI ID / UTR No.
                  </label>
                  <input
                    type="text"
                    placeholder="Optional reference number"
                    value={expenseForm.reference_no}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference_no: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional remarks or notes..."
                  value={expenseForm.remarks}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Voucher...' : 'Save Expense Voucher'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD OTHER INCOME ================= */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Daily Cash Book
                </span>
                <h3 className="text-xl font-black tracking-tight">Record Income Entry</h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Enter Receipt No range, Head, Date, and Amount to populate the ledger.
                </p>
              </div>
              <button
                onClick={() => setIsIncomeModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOtherIncome} className="p-6 space-y-4">
              
              {/* Row 1: Date & Head */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Head (Payment Mode) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeForm.head}
                    onChange={(e) => setIncomeForm({ ...incomeForm, head: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="A/C 138">A/C 138</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Other">Other (Custom Head)</option>
                  </select>
                  {incomeForm.head === 'Other' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom Head name..."
                      value={incomeForm.customHead}
                      onChange={(e) => setIncomeForm({ ...incomeForm, customHead: e.target.value })}
                      className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Receipt No to Receipt No */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Receipt No to Receipt No (Matches Column 2)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="From (e.g. 0556)"
                      value={incomeForm.receipt_from}
                      onChange={(e) => setIncomeForm({ ...incomeForm, receipt_from: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Start receipt no</span>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="To (e.g. 0557 or 0)"
                      value={incomeForm.receipt_to}
                      onChange={(e) => setIncomeForm({ ...incomeForm, receipt_to: e.target.value })}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">End receipt no (or 0)</span>
                  </div>
                </div>

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="OR direct reference/note: e.g. a/c138 se"
                    value={incomeForm.receipt_note}
                    onChange={(e) => setIncomeForm({ ...incomeForm, receipt_note: e.target.value })}
                    className="w-full px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs font-mono text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Income Amount & Source Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Income Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="e.g. 1885.00"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Source / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fee Collection, A/C 138 me..."
                    value={incomeForm.source_title}
                    onChange={(e) => setIncomeForm({ ...incomeForm, source_title: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or student names..."
                  value={incomeForm.remarks}
                  onChange={(e) => setIncomeForm({ ...incomeForm, remarks: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Income Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SET OPENING BALANCE ================= */}
      {isOpeningBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white">
              <div>
                <h3 className="text-lg font-black tracking-tight">Set Opening Balance</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last month closing cash balance carried forward.</p>
              </div>
              <button
                onClick={() => setIsOpeningBalanceModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Month
                </label>
                <input
                  type="text"
                  disabled
                  value={monthTitle}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-gray-100 font-bold text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Opening Balance Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 18516.00"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base font-black text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Shown as &ldquo;Last Month balance&rdquo; at row 1 of the ledger.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsOpeningBalanceModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: DAY VOUCHERS LIST & MANAGEMENT ================= */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-900 text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  Transactions on {selectedDayDetails.dateFormatted}
                </h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Income: {formatCurrency(selectedDayDetails.income)} | Expense: {formatCurrency(selectedDayDetails.expense)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetails(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Section 1: Recorded Incomes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Recorded Incomes ({selectedDayDetails.otherIncomes?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      setIncomeForm((prev) => ({ ...prev, date: selectedDayDetails.date }));
                      setSelectedDayDetails(null);
                      setIsIncomeModalOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    + Add Income
                  </button>
                </div>

                {selectedDayDetails.otherIncomes && selectedDayDetails.otherIncomes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayDetails.otherIncomes.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                              Head: {inc.payment_mode || 'Online'}
                            </span>
                            {inc.receipt_no && (
                              <span className="text-xs font-mono font-semibold text-gray-700">
                                Receipt: {inc.receipt_no}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {inc.source_title}
                          </p>
                          {inc.remarks && (
                            <p className="text-xs text-gray-500 mt-0.5">Note: {inc.remarks}</p>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end justify-between">
                          <span className="text-sm font-black text-emerald-700">
                            {formatCurrency(inc.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No direct income entries logged for this day.</p>
                )}
              </div>

              {/* Section 2: Recorded Expense Vouchers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Recorded Expense Vouchers ({selectedDayDetails.vouchers?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      setExpenseForm((prev) => ({ ...prev, date: selectedDayDetails.date }));
                      setSelectedDayDetails(null);
                      setIsExpenseModalOpen(true);
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
                  >
                    + Add Voucher
                  </button>
                </div>

                {selectedDayDetails.vouchers && selectedDayDetails.vouchers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayDetails.vouchers.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                              {v.expense_head}
                            </span>
                            {v.voucher_no && (
                              <span className="text-xs font-mono text-gray-600">
                                Voucher #{v.voucher_no}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-gray-500">
                              ({v.payment_mode})
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            {v.purpose || v.expense_head}
                          </p>
                          {v.paid_to && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              Paid to: <span className="font-semibold">{v.paid_to}</span>
                            </p>
                          )}
                          {v.reference_no && (
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">
                              Ref: {v.reference_no}
                            </p>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end justify-between">
                          <span className="text-sm font-black text-red-600">
                            {formatCurrency(v.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteVoucher(v.id)}
                            className="mt-2 text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No vouchers for this day.</p>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-200">
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
