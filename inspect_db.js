const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function run() {
  // Check tables
  console.log('--- Inspecting FeeDetails ---');
  const { data: feeDetails, error: err1 } = await supabase.from('FeeDetails').select('*').limit(3);
  if (err1) {
    console.error('FeeDetails error:', err1);
  } else {
    console.log('FeeDetails row sample:', feeDetails);
  }

  console.log('--- Inspecting fee_transactions ---');
  const { data: txs, error: err2 } = await supabase.from('fee_transactions').select('*').limit(3);
  if (err2) {
    console.error('fee_transactions error:', err2);
  } else {
    console.log('fee_transactions row sample:', txs);
  }

  // Let's query information_schema or similar if possible
  console.log('--- Querying DB schema details ---');
  const { data: schema, error: err3 } = await supabase.rpc('get_schema_info').select('*').limit(10);
  if (err3) {
    // If rpc doesn't exist, try querying a query directly via supabase.from or a general sql executor if any
    console.log('get_schema_info RPC not found, trying query on pg_class');
  } else {
    console.log('schema info:', schema);
  }
}

run();
