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
  password             text,              -- TEMPORARY: removed by auth migration
  department           text default '',
  position             text default '',
  roles                jsonb not null default '[]'::jsonb,
  profile_picture_url  text,
  created_at           timestamptz not null default now()
);

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
-- INTENTIONALLY NOT ENABLED in this file.
--
-- The app currently reads and writes every table with the anon key and has no
-- server-side writes path. Turning on RLS now would break the running app.
-- Proper RLS (policies keyed on auth.uid()) is part of the Supabase Auth
-- migration — see supabase/migrations/0001_supabase_auth.md. Do that first,
-- then enable RLS.
-- ============================================================================
