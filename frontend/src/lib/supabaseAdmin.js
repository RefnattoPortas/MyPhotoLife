import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let client = null;

function getClient() {
  if (client) return client;
  if (!supabaseUrl || !serviceRoleKey) return null;
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
  return client;
}

const chainableMock = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') {
      return (resolve) => resolve({ data: null, error: { message: 'Supabase not configured', code: 'NOT_CONFIGURED' } });
    }
    return () => chainableMock;
  },
});

export const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    const c = getClient();
    if (!c) {
      if (prop === 'from' || prop === 'rpc') return () => chainableMock;
      return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
    }
    const value = c[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  },
});
