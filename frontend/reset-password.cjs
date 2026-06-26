const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...r] = l.split('=');
  if (k && r.length) vars[k.trim()] = r.join('=').trim();
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node reset-password.cjs <email> <new-password>');
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(newPassword, 12);

supabase
  .from('users')
  .update({ password_hash: passwordHash })
  .eq('email', email)
  .select()
  .then(({ data, error }) => {
    if (error) { console.error('Error:', error.message); process.exit(1); }
    if (!data || data.length === 0) { console.error('User not found:', email); process.exit(1); }
    console.log('✓ Password reset successfully for', email);
  });
