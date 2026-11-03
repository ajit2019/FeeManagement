-- ==============================================================
-- SHIVAM INTER COLLEGE - FEE & EXPENSE MANAGEMENT SYSTEM
-- Supabase PostgreSQL Table Setup for Income & Expenses Module
-- ==============================================================
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/jqqcvsapzmejyumigytg
-- 2. Navigate to "SQL Editor" on the left menu (or visit https://supabase.com/dashboard/project/jqqcvsapzmejyumigytg/sql/new)
-- 3. Paste the contents of this file and click "Run".
-- ==============================================================

-- 1. Table: expense_vouchers
CREATE TABLE IF NOT EXISTS public.expense_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_to TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  purpose TEXT,
  expense_head TEXT NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_date ON public.expense_vouchers(date);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_expense_head ON public.expense_vouchers(expense_head);

-- 2. Table: other_income
CREATE TABLE IF NOT EXISTS public.other_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_title TEXT NOT NULL,
  receipt_no TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_mode TEXT NOT NULL DEFAULT 'Online',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_other_income_date ON public.other_income(date);

-- 3. Table: monthly_opening_balances
CREATE TABLE IF NOT EXISTS public.monthly_opening_balances (
  month_key TEXT PRIMARY KEY, -- Format: YYYY-MM (e.g. '2026-10')
  opening_balance NUMERIC(12, 2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- Permissions & Row Level Security (RLS)
-- ==============================================================

-- Enable Row Level Security
ALTER TABLE public.expense_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_opening_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to allow safe re-runs
DROP POLICY IF EXISTS "Allow service role full access on expense_vouchers" ON public.expense_vouchers;
DROP POLICY IF EXISTS "Allow anon read and insert on expense_vouchers" ON public.expense_vouchers;
DROP POLICY IF EXISTS "Allow service role full access on other_income" ON public.other_income;
DROP POLICY IF EXISTS "Allow anon read and insert on other_income" ON public.other_income;
DROP POLICY IF EXISTS "Allow service role full access on monthly_opening_balances" ON public.monthly_opening_balances;
DROP POLICY IF EXISTS "Allow anon read and insert on monthly_opening_balances" ON public.monthly_opening_balances;

-- Create policies for service role and app access
CREATE POLICY "Allow service role full access on expense_vouchers"
  ON public.expense_vouchers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read and insert on expense_vouchers"
  ON public.expense_vouchers FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access on other_income"
  ON public.other_income FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read and insert on other_income"
  ON public.other_income FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access on monthly_opening_balances"
  ON public.monthly_opening_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read and insert on monthly_opening_balances"
  ON public.monthly_opening_balances FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Grant table privileges
GRANT ALL ON public.expense_vouchers TO postgres, service_role, anon, authenticated;
GRANT ALL ON public.other_income TO postgres, service_role, anon, authenticated;
GRANT ALL ON public.monthly_opening_balances TO postgres, service_role, anon, authenticated;

-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
