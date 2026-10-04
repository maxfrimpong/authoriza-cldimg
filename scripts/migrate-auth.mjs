// scripts/migrate-auth.mjs
// One-off migration: create a Supabase Auth account for every existing
// public.users row, using that user's current plaintext password, and link it
// back via users.auth_id so nobody's login breaks at cutover.
//
// Run locally. NEVER commit the service role key.
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
//   node scripts/migrate-auth.mjs
//
// Safe to re-run: rows that already have auth_id are skipped; if an auth account
// already exists for an email, it is found and linked instead of recreated.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: users, error } = await admin.from('users').select('id, email, password, auth_id');
if (error) {
  console.error('Could not read public.users:', error.message);
  process.exit(1);
}

let created = 0, linked = 0, skipped = 0, failed = 0;

for (const u of users) {
  if (!u.email) { console.warn('skip (no email):', u.id); skipped++; continue; }
  if (u.auth_id) { skipped++; continue; }

  const hasUsablePassword = u.password && String(u.password).length >= 6;
  const password = hasUsablePassword ? u.password : tempPassword();

  const { data: made, error: cErr } = await admin.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { legacy_id: u.id },
  });

  let authId = made?.user?.id;
  if (cErr) {
    const found = await findAuthIdByEmail(u.email);
    if (!found) { console.error('FAILED create', u.email, cErr.message); failed++; continue; }
    authId = found;
  } else {
    created++;
    if (!hasUsablePassword) console.log('  temp password set, user must reset:', u.email);
  }

  const { error: lErr } = await admin.from('users').update({ auth_id: authId }).eq('id', u.id);
  if (lErr) { console.error('FAILED link', u.email, lErr.message); failed++; continue; }
  linked++;
}

console.log(`\nDone. created=${created} linked=${linked} skipped=${skipped} failed=${failed}`);
if (failed > 0) process.exit(1);

function tempPassword() {
  return 'Tmp-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase();
}

async function findAuthIdByEmail(email) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return null;
}
