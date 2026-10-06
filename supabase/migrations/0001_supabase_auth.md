# Migration 0001 — Supabase Auth + RLS (single-tenant hardening)

**Status: APPLIED to production on 2026-10-04.**

Deviations encountered during the live run, for the record:
- The live `users.password` column was `NOT NULL` (not captured by the original
  reconstructed schema). It was made nullable so Auth-based user creation could
  proceed, then dropped in Phase 4.
- The live `users` table already had an unused `auth_uid` uuid column from an
  earlier attempt. The migration added and uses `auth_id`; `auth_uid` was left
  in place (see `schema.sql` follow-ups).
- Existing users' Auth accounts were created by hand in the Supabase dashboard
  (two users), not via `scripts/migrate-auth.mjs`. The script remains for scale.

`schema.sql` was afterwards rebuilt to mirror the live database exactly.

This replaces plaintext-password login with Supabase Auth and turns on Row Level
Security, so the anon key alone can no longer read your data. The app code for
this is already in the repo; the steps below are the live-database side.

## Why the order matters

If you enable RLS or drop the password column before the app is on Supabase Auth,
logins break. The order below keeps the app working at every step.

## Phase 0 — Back up

```sql
create table if not exists users_backup_0001 as table public.users;
select count(*) from users_backup_0001;   -- note this number
```

## Phase 1 — Add the auth link column

```sql
alter table public.users add column if not exists auth_id uuid;
create index if not exists users_auth_id_idx on public.users (auth_id);
```

This is harmless to the running app (old login still works).

## Phase 2 — Create auth accounts for existing users

Run the script locally. It reads each user's current password and creates a
matching Supabase Auth account, then links it via `auth_id`. Get the service
role key from Supabase -> Project Settings -> API. Never commit it.

```bash
npm install
SUPABASE_URL=https://mqmibsjedlkdwlgftdei.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
node scripts/migrate-auth.mjs
```

**CHECKPOINT:**

```sql
select count(*) from public.users where auth_id is null;   -- must be 0
```

Still harmless to the running app.

## Phase 3 — Deploy the app on Supabase Auth

1. In Vercel env vars (server-side, NOT VITE_), add:
   - `SUPABASE_URL` = `https://mqmibsjedlkdwlgftdei.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = the service role key
   (these power `/api/admin-user`; the key stays server-side)
2. Push the repo and let Vercel redeploy.

**CHECKPOINT:** log in with your existing email and password. Login now goes
through Supabase Auth. Confirm the dashboards load and you can create or edit a
user (which now runs through `/api/admin-user`). Data reads still work because
RLS is not on yet.

Do not continue until login works for a real account.

## Phase 4 — Turn on RLS and remove plaintext passwords

Run the RLS block from `supabase/schema.sql` (the section under "Row Level
Security"), then drop the column:

```sql
-- after the RLS policies from schema.sql have been applied:
alter table public.users drop column password;
```

**CHECKPOINT:** still logged in, reload the app. Requests, messages,
notifications and the user directory must still load. A policy that returns zero
rows looks the same as "no data", so verify against a row you know exists:

```sql
select id, status from public.requests order by created_at desc limit 5;
```

If a logged-in user now sees nothing, a policy is too strict; re-check the
`authenticated` policies in `schema.sql`.

## Rollback

```sql
-- re-open access if Phase 4 broke something:
alter table public.users          disable row level security;
alter table public.requests       disable row level security;
alter table public.messages       disable row level security;
alter table public.notifications  disable row level security;
alter table public.system_config  disable row level security;

-- if you also dropped the column and must revert the app to pre-Auth code:
alter table public.users add column if not exists password text;
update public.users u set password = b.password
  from users_backup_0001 b where b.id = u.id;
```

Then redeploy the previous commit. Note that rolling back after people have set
new passwords through Supabase Auth will lose those new passwords (the backup
holds the old ones).

## After it is done

- Remove `users_backup_0001` once you are confident:
  `drop table users_backup_0001;`
- New users created in the app get an auth account automatically via
  `/api/admin-user`. There is no plaintext password anywhere.
- RLS is "signed in vs not". Per-role database rules are a later refinement
  (see the note at the end of `schema.sql`).
