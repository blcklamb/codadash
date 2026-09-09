import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ quiet: true });

// Only report check names and safe status codes. Never log keys, responses or user data.
const env = process.env;
const url = env.SUPABASE_URL;
const publicUrl = env.VITE_SUPABASE_URL;
const publicKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
let failures = 0;
function report(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
}
for (const [name, value] of Object.entries({
  SUPABASE_URL: url,
  VITE_SUPABASE_URL: publicUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
  SUPABASE_SECRET_KEY: secretKey,
})) {
  report(name, !!value, value ? 'configured' : 'missing');
}
if (failures) process.exit(1);
let validUrl = false;
try {
  validUrl =
    new URL(url).protocol === 'https:' && new URL(url).origin === new URL(publicUrl).origin;
} catch {}
report('Server/browser project URLs', validUrl);
let publicIsSafe = !publicKey.startsWith('sb_secret_');
if (publicKey.startsWith('eyJ')) {
  try {
    publicIsSafe =
      JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {
    publicIsSafe = false;
  }
}
report(
  'Browser key is publishable/anon',
  publicIsSafe && (publicKey.startsWith('sb_publishable_') || publicKey.startsWith('eyJ')),
);
report('Server key differs from browser key', secretKey !== publicKey);
if (failures) process.exit(1);

const safeFetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) });
const client = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: safeFetch },
});
const schema = {
  profiles: 'id,nickname,locale',
  sessions: 'id,user_ids,kind,status',
  records: 'user_id,session_id,result,ended_at',
  daily_activity: 'user_id,day',
  personal_bests: 'user_id,result',
};
for (const [table, columns] of Object.entries(schema)) {
  try {
    const { error } = await client.from(table).select(columns).limit(0);
    report(`Database ${table}`, !error, error ? 'check API key and apply migration' : 'available');
  } catch {
    report(`Database ${table}`, false, 'connection failed');
  }
}
try {
  const response = await safeFetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: publicKey },
  });
  report('Public Auth API', response.ok, `HTTP ${response.status}`);
  if (response.ok) {
    const settings = await response.json();
    report(
      'GitHub provider',
      settings.external?.github === true,
      settings.external?.github ? 'enabled' : 'enable in Supabase Auth',
    );
  }
} catch {
  report('Public Auth API', false, 'connection failed');
}
console.log(
  'Read-only check. GitHub callback, login and saved records still need an actual browser session.',
);
process.exitCode = failures ? 1 : 0;
