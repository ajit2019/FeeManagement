import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'income_expenses_store.json');

// In-memory fallback if filesystem is read-only
let memoryStore = {
  expense_vouchers: [],
  other_income: [],
  monthly_opening_balances: {},
};

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = {
        expense_vouchers: [],
        other_income: [],
        monthly_opening_balances: {},
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    }
  } catch (e) {
    // Read-only filesystem, use memoryStore
  }
}

function readStore() {
  ensureDataFile();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        expense_vouchers: Array.isArray(parsed.expense_vouchers) ? parsed.expense_vouchers : [],
        other_income: Array.isArray(parsed.other_income) ? parsed.other_income : [],
        monthly_opening_balances: parsed.monthly_opening_balances || {},
      };
    }
  } catch (err) {
    console.error('Error reading income_expenses_store.json, using memory cache:', err);
  }
  return memoryStore;
}

function writeStore(data) {
  memoryStore = data;
  try {
    ensureDataFile();
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (e) {
    // If filesystem write fails on serverless, memoryStore still holds the data
  }
}

/**
 * Checks whether a Supabase error is caused by missing tables.
 */
export function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

export const localDb = {
  // Expenses
  getExpenses({ month, date } = {}) {
    const store = readStore();
    let list = [...store.expense_vouchers];

    if (date) {
      list = list.filter((e) => e.date === date);
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      const nextMonthYear = m === 12 ? year + 1 : year;
      const nextMonthM = m === 12 ? 1 : m + 1;
      const endDate = `${nextMonthYear}-${String(nextMonthM).padStart(2, '0')}-01`;
      list = list.filter((e) => e.date >= startDate && e.date < endDate);
    }

    // Sort descending date, then created_at
    list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return list;
  },

  getAllExpenses() {
    const store = readStore();
    return store.expense_vouchers;
  },

  insertExpense(item) {
    const store = readStore();
    const record = {
      id: item.id || crypto.randomUUID(),
      voucher_no: item.voucher_no || null,
      date: item.date || new Date().toISOString().split('T')[0],
      paid_to: item.paid_to || '',
      amount: Number(item.amount) || 0,
      purpose: item.purpose || '',
      expense_head: item.expense_head || 'Miscellaneous',
      payment_mode: item.payment_mode || 'Cash',
      reference_no: item.reference_no || null,
      remarks: item.remarks || null,
      created_at: item.created_at || new Date().toISOString(),
      _storage: 'local',
    };
    store.expense_vouchers.push(record);
    writeStore(store);
    return record;
  },

  updateExpense(id, updateFields) {
    const store = readStore();
    const idx = store.expense_vouchers.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    store.expense_vouchers[idx] = {
      ...store.expense_vouchers[idx],
      ...updateFields,
      updated_at: new Date().toISOString(),
    };
    writeStore(store);
    return store.expense_vouchers[idx];
  },

  deleteExpense(id) {
    const store = readStore();
    const prevLen = store.expense_vouchers.length;
    store.expense_vouchers = store.expense_vouchers.filter((e) => e.id !== id);
    if (store.expense_vouchers.length !== prevLen) {
      writeStore(store);
      return true;
    }
    return false;
  },

  // Other Incomes
  getOtherIncomes({ month, date } = {}) {
    const store = readStore();
    let list = [...store.other_income];

    if (date) {
      list = list.filter((i) => i.date === date);
    } else if (month) {
      const [year, m] = month.split('-').map(Number);
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      const nextMonthYear = m === 12 ? year + 1 : year;
      const nextMonthM = m === 12 ? 1 : m + 1;
      const endDate = `${nextMonthYear}-${String(nextMonthM).padStart(2, '0')}-01`;
      list = list.filter((i) => i.date >= startDate && i.date < endDate);
    }

    list.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return list;
  },

  getAllOtherIncome() {
    const store = readStore();
    return store.other_income;
  },

  insertOtherIncome(item) {
    const store = readStore();
    const record = {
      id: item.id || crypto.randomUUID(),
      date: item.date || new Date().toISOString().split('T')[0],
      source_title: item.source_title || 'Fee / Income Collection',
      receipt_no: item.receipt_no || null,
      amount: Number(item.amount) || 0,
      payment_mode: item.payment_mode || 'Online',
      remarks: item.remarks || null,
      created_at: item.created_at || new Date().toISOString(),
      _storage: 'local',
    };
    store.other_income.push(record);
    writeStore(store);
    return record;
  },

  deleteOtherIncome(id) {
    const store = readStore();
    const prevLen = store.other_income.length;
    store.other_income = store.other_income.filter((i) => i.id !== id);
    if (store.other_income.length !== prevLen) {
      writeStore(store);
      return true;
    }
    return false;
  },

  // Opening Balances
  getOpeningBalance(month_key) {
    const store = readStore();
    const val = store.monthly_opening_balances[month_key];
    return val !== undefined ? Number(val) : null;
  },

  getAllOpeningBalances() {
    const store = readStore();
    return store.monthly_opening_balances;
  },

  upsertOpeningBalance(month_key, balance) {
    const store = readStore();
    store.monthly_opening_balances[month_key] = Number(balance) || 0;
    writeStore(store);
    return { month_key, opening_balance: store.monthly_opening_balances[month_key] };
  },

  // Remove local items after they've been successfully synced to Supabase
  markExpensesSynced(ids) {
    if (!ids || ids.length === 0) return;
    const store = readStore();
    const idSet = new Set(ids);
    store.expense_vouchers = store.expense_vouchers.filter((e) => !idSet.has(e.id));
    writeStore(store);
  },

  markIncomeSynced(ids) {
    if (!ids || ids.length === 0) return;
    const store = readStore();
    const idSet = new Set(ids);
    store.other_income = store.other_income.filter((i) => !idSet.has(i.id));
    writeStore(store);
  },
};
