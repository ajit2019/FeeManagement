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
    env[match[1]] = match[2].trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);

const supabase = createClient(url, key);

async function run() {
  const { data: students, error: err1 } = await supabase.from('students').select('*').limit(1);
  if (err1) {
    console.error('students error:', err1);
  } else {
    console.log('students row keys:', students[0] ? Object.keys(students[0]) : 'no rows');
    console.log('students row sample:', students[0]);
  }

  const { data: studentDetails, error: err2 } = await supabase.from('StudentDetails').select('*').limit(1);
  if (err2) {
    console.error('StudentDetails error:', err2);
  } else {
    console.log('StudentDetails row keys:', studentDetails[0] ? Object.keys(studentDetails[0]) : 'no rows');
    console.log('StudentDetails row sample:', studentDetails[0]);
  }
}

run();
