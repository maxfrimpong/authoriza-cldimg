# Migration 0001 — Replace plaintext passwords with Supabase Auth

**Status: PLAN. Not yet applied. Do not run against production without reading every step.**

## Why

Today `login()` runs `select * from users where email = ? and password = ?` from the
browser under the anon key. That means:

- passwords are stored and compared in **plaintext**;
- anyone with the anon key (it ships in the bundle) can read the whole `users`
  table, passwords included, if RLS allows select;
- there is no real session, just a user id in `localStorage`.

Supabase Auth fixes all three: bcrypt-hashed credentials in `auth.users`, a real
JWT session, and RLS keyed on `auth.uid()`.

## Risk

This touches the **live** `users` table and every existing login. Run it in a
**staging copy first**. Take a backup before touching production:

```sql
create table users_backup_0001 as table public.users;
select count(*) from users_backup_0001;   -- CHECKPOINT: equals current user count
```

## Step 1 — Create auth accounts for existing users

Supabase Auth stores identities in `auth.users`, which you cannot insert into
directly with a password. Create accounts via the Admin API (service role), from
a one-off script run locally — never from the browser:

```ts
// scripts/migrate-auth.ts  (run with: deno run -A scripts/migrate-auth.ts)
import { createClient } from 'npm:@supabase/supabase-js';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // service role, local only
);

const { data: users } = await admin.from('users').select('id, email, password');
for (const u of users ?? []) {
  const { error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password ?? crypto.randomUUID(), // if null, force a reset later
    email_confirm: true,
    user_metadata: { legacy_id: u.id },
  });
  console.log(u.email, error ? `FAILED: ${error.message}` : 'ok');
}
```

**CHECKPOINT:**

```sql
select count(*) from auth.users;             -- equals users_backup_0001 count
select email from public.users
  where email not in (select email from auth.users);  -- must return 0 rows
```

## Step 2 — Link app rows to the auth id

Add an `auth_id` column so the app's string ids keep working while RLS uses the
auth uuid.

```sql
alter table public.users add column if not exists auth_id uuid;

update public.users u
set auth_id = a.id
from auth.users a
where a.email = u.email;

-- CHECKPOINT: every user linked
select count(*) from public.users where auth_id is null;   -- must be 0
```

## Step 3 — Switch the app to Supabase Auth

In `context/AppContext.tsx` / `services/api.ts`:

- `login()` → `supabase.auth.signInWithPassword({ email, password })`, then load
  the matching `public.users` row by email.
- Replace the `localStorage('sendreq_user_id')` session with
  `supabase.auth.getSession()` / `onAuthStateChange`.
- `logout()` → `supabase.auth.signOut()`.
- `addUser()` → call a new `create-user` Edge Function (service role) that runs
  `auth.admin.createUser`, instead of inserting a plaintext password.

**Do not drop the password column until Step 3 is deployed and verified**, or
logins break.

## Step 4 — Remove plaintext, enable RLS

```sql
alter table public.users drop column password;

alter table public.users         enable row level security;
alter table public.requests      enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;
alter table public.system_config enable row level security;

-- Example starting policies (tighten per role afterwards):
create policy "users read self + directory" on public.users
  for select using (auth.role() = 'authenticated');

create policy "requests readable by authenticated" on public.requests
  for select using (auth.role() = 'authenticated');
-- writes should move to a server/Edge Function with the service role
-- (see engineering-principles: service-role writes-path).
```

**CHECKPOINT after each enable:** log in as a normal user and confirm the
dashboards still load. A policy that selects zero rows looks identical to "no
data" — verify with a known row:

```sql
select id, status from public.requests order by created_at desc limit 5;
```

## Rollback

```sql
-- if Step 4 was applied and something is wrong:
alter table public.users add column password text;
update public.users u set password = b.password
  from users_backup_0001 b where b.id = u.id;
alter table public.users disable row level security;
-- then revert the app code to the pre-migration commit.
```
