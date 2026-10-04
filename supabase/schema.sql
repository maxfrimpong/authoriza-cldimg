-- ============================================================================
-- SendREQ — canonical schema (RECONSTRUCTED FROM APPLICATION CODE)
-- ============================================================================
-- This file was rebuilt from services/api.ts and types.ts because every .sql
-- file in the original archive was empty or corrupt. It is a best-effort
-- reconstruction, NOT a dump of the live database.
--
-- BEFORE applying this anywhere, diff it against the live Supabase project:
--   select table_name, column_name, data_type
--   from information_schema.columns
--   where table_schema = 'public'
--   order by table_name, ordinal_position;
--
-- Primary keys are TEXT because the app generates string IDs (e.g. 'u1699..',
-- 'r1699..', 'n..', 'm..') client-side. Do not change to uuid without also
-- changing the ID generation in context/AppContext.tsx.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- users
-- NOTE: the `password` column holds PLAINTEXT today. It is retained here only
-- to match the current live schema. It is removed by the Supabase Auth
-- migration (see supabase/migrations/). Do not treat this as acceptable.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                   text primary key,
  name                 text not null default '',
  email                text unique not null,
  phone_number         text,
  password             text,              -- TEMPORARY: dropped by the auth migration
  department           text default '',
  position             text default '',
  roles                jsonb not null default '[]'::jsonb,
  profile_picture_url  text,
  auth_id              uuid,              -- links to auth.users.id (Supabase Auth)
  created_at           timestamptz not null default now()
);
create index if not exists users_auth_id_idx on public.users (auth_id);

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id                               text primary key,
  requester_id                     text,
  requester_name                   text default '',
  department                       text default '',
  position                         text default '',
  vendor_name                      text default '',
  vendor_tin                       text,
  payment_details                  text default '',
  amount                           numeric not null default 0,
  full_requested_amount            numeric default 0,
  currency                         text default 'GHS',
  billing_project                  text default '',
  request_subject                  text default '',
  description                      text default '',
  billing_items                    jsonb default '[]'::jsonb,
  withholding_tax_percentage       numeric default 0,
  other_withholding_tax_percentage numeric default 0,
  part_payment_percentage          numeric default 100,
  files                            jsonb default '[]'::jsonb,
  supervisor_id                    text,
  authorizer_id                    text,
  approver_id                      text,
  status                           text not null default 'Pending Supervisor',
  remarks                          text,
  sign_off                         text default '',
  requester_signature              text,
  supervisor_signature             text,
  authorizer_signature             text,
  approver_signature               text,
  edit_count                       integer not null default 0,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);
create index if not exists requests_created_at_idx on public.requests (created_at desc);
create index if not exists requests_status_idx      on public.requests (status);

-- ---------------------------------------------------------------------------
-- messages (1:1 chat; realtime enabled)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id           text primary key,
  sender_id    text,
  receiver_id  text,
  content      text not null default '',
  timestamp    timestamptz not null default now(),
  is_read      boolean not null default false
);
create index if not exists messages_pair_idx on public.messages (sender_id, receiver_id);

-- ---------------------------------------------------------------------------
-- notifications (realtime enabled)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          text primary key,
  user_id     text,
  message     text not null default '',
  is_read     boolean not null default false,
  type        text not null default 'info',   -- info | success | error | warning
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- system_config (single row, id = 1, holds the SystemLists JSON blob)
-- ---------------------------------------------------------------------------
create table if not exists public.system_config (
  id    integer primary key,
  data  jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Realtime: the client subscribes to messages and notifications
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Single-tenant model: any signed-in (authenticated) user may use the app;
-- the anon key alone can read nothing except public branding. User-table writes
-- happen only through the service role (the /api/admin-user function), so the
-- client has no write policy on public.users.
--
-- Apply this block only AFTER the app is deployed on Supabase Auth and every
-- user has a linked auth account. See supabase/migrations/0001_supabase_auth.md
-- for the ordered runbook.

alter table public.users          enable row level security;
alter table public.requests       enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;
alter table public.system_config  enable row level security;

-- users: readable by any signed-in user (the directory); no client writes.
create policy "users_select_authenticated" on public.users
  for select using (auth.role() = 'authenticated');

-- requests: full workflow access for signed-in users.
create policy "requests_select_authenticated" on public.requests
  for select using (auth.role() = 'authenticated');
create policy "requests_insert_authenticated" on public.requests
  for insert with check (auth.role() = 'authenticated');
create policy "requests_update_authenticated" on public.requests
  for update using (auth.role() = 'authenticated');
create policy "requests_delete_authenticated" on public.requests
  for delete using (auth.role() = 'authenticated');

-- messages: 1:1 chat between signed-in users.
create policy "messages_select_authenticated" on public.messages
  for select using (auth.role() = 'authenticated');
create policy "messages_insert_authenticated" on public.messages
  for insert with check (auth.role() = 'authenticated');
create policy "messages_update_authenticated" on public.messages
  for update using (auth.role() = 'authenticated');

-- notifications.
create policy "notifications_select_authenticated" on public.notifications
  for select using (auth.role() = 'authenticated');
create policy "notifications_insert_authenticated" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "notifications_update_authenticated" on public.notifications
  for update using (auth.role() = 'authenticated');

-- system_config: branding/lists. Readable by everyone (login screen needs it
-- before sign-in); writable by signed-in users (admin UI). Tighten to an
-- admin-only check once roles live in a claim.
create policy "system_config_select_public" on public.system_config
  for select using (true);
create policy "system_config_write_authenticated" on public.system_config
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- Note on refinement: these policies gate access to "signed in vs not". They do
-- NOT yet enforce per-role rules (e.g. only an approver may approve) at the
-- database level; that is still enforced in the app. Tightening to per-role,
-- per-row policies is a later step and would key off a role claim or a
-- security-definer helper that reads public.users.roles for auth.uid().
-- ============================================================================
