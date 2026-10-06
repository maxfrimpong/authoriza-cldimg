-- ============================================================================
-- Authoriza — canonical schema
-- VERIFIED against the live Supabase database on 2026-10-04 via
-- information_schema introspection (columns, types, nullability, defaults,
-- primary keys, unique and foreign-key constraints). RLS policies are those
-- applied in supabase/migrations/0001_supabase_auth.md.
--
-- This file is now a faithful mirror of the live schema, not a guess. Keep it
-- in sync: after any schema change, re-run the introspection and update here,
-- or use `supabase db dump --schema public` for a full dump.
--
-- Primary keys are TEXT because the app generates string ids client-side
-- (e.g. 'u1699..', 'r1699..'). Do not change to uuid without changing the id
-- generation in context/AppContext.tsx.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- users
-- Note: there is no `password` column (dropped 2026-10-04; passwords live in
-- Supabase Auth). There are TWO uuid columns: `auth_id` (set by the auth
-- migration, used by the app) and `auth_uid` (pre-existing, appears unused by
-- the current code — verify and consider dropping in a later migration).
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                   text primary key,
  name                 text not null,
  email                text not null unique,            -- constraint: users_email_unique
  department           text,
  position             text,
  roles                jsonb default '[]'::jsonb,
  profile_picture_url  text,
  auth_uid             uuid,                             -- legacy, unused by current app
  updated_at           timestamptz default now(),
  phone_number         text,
  created_at           timestamptz default now(),
  auth_id              uuid                              -- links to auth.users.id
);
create index if not exists users_auth_id_idx on public.users (auth_id);

-- ---------------------------------------------------------------------------
-- requests
-- Foreign keys reference public.users(id). ON DELETE behaviour was not
-- captured by introspection; assume NO ACTION, meaning a user who still has
-- requests (or messages/notifications) cannot be deleted until those rows are
-- removed or reassigned. This affects the admin delete-user flow.
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id                                text primary key,
  requester_id                      text references public.users(id),
  requester_name                    text,
  department                        text,
  position                          text,
  vendor_name                       text,
  payment_details                   text,
  amount                            numeric,
  currency                          text,
  billing_project                   text,
  request_subject                   text,
  description                       text,
  billing_items                     jsonb default '[]'::jsonb,
  withholding_tax_percentage        numeric,
  files                             jsonb default '[]'::jsonb,
  authorizer_id                     text references public.users(id),
  approver_id                       text references public.users(id),
  status                            text,
  created_at                        timestamptz default now(),
  updated_at                        timestamptz default now(),
  remarks                           text,
  sign_off                          text,
  edit_count                        integer default 0,
  supervisor_id                     text references public.users(id),
  full_requested_amount             numeric,
  other_withholding_tax_percentage  numeric default 0,
  part_payment_percentage           numeric default 100,
  vendor_tin                        text,
  requester_signature               text,
  supervisor_signature              text,
  authorizer_signature              text,
  approver_signature                text
);

-- ---------------------------------------------------------------------------
-- messages (1:1 chat)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id           text primary key,
  sender_id    text references public.users(id),
  receiver_id  text references public.users(id),
  content      text,
  timestamp    timestamptz default now(),
  is_read      boolean default false
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          text primary key,
  user_id     text references public.users(id),
  message     text,
  is_read     boolean default false,
  type        text,                                     -- info | success | error | warning
  created_at  timestamptz default now(),
  metadata    jsonb
);

-- ---------------------------------------------------------------------------
-- system_config (single row, id = 1, holds the SystemLists JSON blob)
-- ---------------------------------------------------------------------------
create table if not exists public.system_config (
  id    integer primary key,
  data  jsonb
);

-- ============================================================================
-- Realtime
-- The client subscribes to messages and notifications. If realtime is not
-- already enabled for them, add them to the publication (each errors if the
-- table is already a member, so run individually as needed):
--   alter publication supabase_realtime add table public.messages;
--   alter publication supabase_realtime add table public.notifications;
-- ============================================================================

-- ============================================================================
-- Row Level Security  (applied 2026-10-04 — migration 0001)
-- Single-tenant: any signed-in user may use the app; the anon key reads only
-- public branding. User-table writes go through the service role
-- (/api/admin-user), so the client has no write policy on public.users.
-- ============================================================================
alter table public.users          enable row level security;
alter table public.requests       enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;
alter table public.system_config  enable row level security;

create policy "users_select_authenticated" on public.users
  for select using (auth.role() = 'authenticated');

create policy "requests_select_authenticated" on public.requests
  for select using (auth.role() = 'authenticated');
create policy "requests_insert_authenticated" on public.requests
  for insert with check (auth.role() = 'authenticated');
create policy "requests_update_authenticated" on public.requests
  for update using (auth.role() = 'authenticated');
create policy "requests_delete_authenticated" on public.requests
  for delete using (auth.role() = 'authenticated');

create policy "messages_select_authenticated" on public.messages
  for select using (auth.role() = 'authenticated');
create policy "messages_insert_authenticated" on public.messages
  for insert with check (auth.role() = 'authenticated');
create policy "messages_update_authenticated" on public.messages
  for update using (auth.role() = 'authenticated');

create policy "notifications_select_authenticated" on public.notifications
  for select using (auth.role() = 'authenticated');
create policy "notifications_insert_authenticated" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "notifications_update_authenticated" on public.notifications
  for update using (auth.role() = 'authenticated');

create policy "system_config_select_public" on public.system_config
  for select using (true);
create policy "system_config_write_authenticated" on public.system_config
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- Known follow-ups (not yet applied)
-- - Drop the unused `users.auth_uid` column once confirmed nothing references
--   it (the current app uses `auth_id`).
-- - RLS is "signed in vs not"; per-role rules are still enforced only in the
--   app. Tighten to per-role policies when desired.
-- - No non-key indexes are defined beyond users_auth_id_idx. Consider adding
--   requests(created_at), requests(status), messages(sender_id, receiver_id),
--   and notifications(user_id, created_at) if query volume grows.
-- ============================================================================
