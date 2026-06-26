import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, 'frontend', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) {
    envVars[key.trim()] = rest.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node reset-password.mjs <email> <new-password>');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(newPassword, 12);

const { data, error } = await supabase
  .from('users')
  .update({ password_hash: passwordHash })
  .eq('email', email)
  .select();

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

if (data?.length === 0) {
  console.error('User not found:', email);
  process.exit(1);
}

console.log('Password reset successfully for', email);
