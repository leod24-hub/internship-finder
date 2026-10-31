-- Migration 003: what the API server and the application worker need.
-- Runs after backend/schema/schema.sql and migrations/002_taxonomy_and_rls.sql.

-- Local accounts. Supabase Auth replaces credentials and sessions when hosted.
create table credentials (
  user_id       uuid primary key references users(id) on delete cascade,
  password_hash text not null
);
create table sessions (
  token_hash  text primary key,             -- sha256 of the cookie value; the raw token is never stored
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index on sessions (user_id);

-- Profile details the application forms ask for
alter table profiles
  add column website         text,
  add column resume_filename text,
  add column resume_text     text;           -- extracted from the PDF; the only source for drafted answers

-- Where each application is in the fill / review / submit cycle
alter table applications
  add column fill_state text not null default 'idle'
    check (fill_state in ('idle','queued','filling','ready','needs_you','submitting','submitted','failed')),
  add column fill_note  text not null default '';

-- What the worker filled, shown on the review screen and resubmitted after approval
alter table approvals
  add column cover_letter text not null default '',
  add column confirmation_screenshot_url text;

-- Work queue for the application worker. Written by the server role only.
create table jobs (
  id             bigserial primary key,
  kind           text not null check (kind in ('fill','submit')),
  application_id uuid not null references applications(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  status         text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts       integer not null default 0,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on jobs (status, created_at);

alter table jobs enable row level security;
create policy read_own_jobs on jobs for select using (user_id = auth.uid());
