-- Multi-tenant Postgres schema for the Internship Finder service.
-- Every student-owned row carries user_id and is protected by row-level security,
-- so one student can never read another student's profile, tracker or inbox data.
-- Assumes an auth layer that sets `app.user_id` per request (e.g. Supabase auth.uid()).

create extension if not exists pgcrypto;

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  created_at    timestamptz not null default now(),
  plan          text not null default 'free' check (plan in ('free','pro','premium')),
  stripe_customer_id text,
  timezone      text not null default 'America/New_York'
);

-- One profile per student. Mirrors templates/student-profile.template.md.
-- Sensitive fields (EEO, address, phone) should be encrypted at the application layer.
create table profiles (
  user_id       uuid primary key references users(id) on delete cascade,
  legal_name    text,
  preferred_name text,
  application_email text,
  phone_enc     bytea,
  address_enc   bytea,
  linkedin      text,
  school        text,
  college       text,
  degree        text,
  major         text,
  minor         text,
  grad_date     date,
  class_year    text check (class_year in ('freshman','sophomore','junior','senior','grad')),
  gpa           numeric(3,2),
  work_auth     text,
  needs_sponsorship boolean,
  eeo_opt_in    boolean not null default false,  -- default: decline everywhere
  eeo_enc       bytea,                           -- only written when eeo_opt_in
  targets       jsonb not null default '{}',     -- industries, tiers, locations, weekly goal, program types
  positioning   jsonb not null default '{}',     -- hook, talking points, gaps, "why this industry"
  resume_url    text,
  updated_at    timestamptz not null default now()
);

-- Shared, de-duplicated job postings (not student data). Discovery service writes here.
create table postings (
  id            text primary key,                -- e.g. li-4476935832, hs-11469760
  company       text not null,
  role          text not null,
  location      text,
  mode          text check (mode in ('remote','hybrid','onsite')),
  category      text,
  tier          text check (tier in ('big','mid','small')),
  class_years   text[],                          -- which class years are eligible
  min_gpa       numeric(3,2),
  deadline      date,
  link          text,
  ats           text,                            -- workday, icims, smartrecruiters, ...
  source        text,
  first_seen    timestamptz not null default now(),
  closed        boolean not null default false
);

-- Per-student tracker rows. Matches backend/schema/applications.schema.json.
create table applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  posting_id    text references postings(id),
  company       text not null,
  role          text not null,
  status        text not null default 'found'
                check (status in ('found','drafted','awaiting','submitted','interview','offer','rejected','skipped')),
  applied       date,
  deadline      date,
  follow_up     date,
  next_action   text not null default '',
  notes         text not null default '',
  link          text,
  portal        text,
  mode          text,
  location      text,
  category      text,
  tier          text,
  source        text,
  cover_letter_url text,
  version       integer not null default 1,      -- optimistic concurrency
  updated_at    timestamptz not null default now(),
  unique (user_id, posting_id)
);
create index on applications (user_id, status);

-- Matches backend/schema/outreach.schema.json.
create table outreach (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  name          text not null,
  firm          text,
  title         text,
  channel       text,
  status        text not null default 'drafted' check (status in ('drafted','sent','replied','call','none')),
  sent          date,
  follow_up     date,
  next_action   text not null default '',
  notes         text not null default '',
  version       integer not null default 1,
  updated_at    timestamptz not null default now()
);

-- Approval is mandatory: the agent fills a form, then waits here for the student's yes.
create table approvals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  answers       jsonb not null,                  -- every field the agent filled, for review
  screenshot_url text,
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decision      text check (decision in ('approved','rejected','edit_requested'))
);

-- Usage metering for plan limits and billing.
create table usage_events (
  id            bigserial primary key,
  user_id       uuid not null references users(id) on delete cascade,
  kind          text not null check (kind in ('application_filled','cover_letter','inbox_scan','discovery_run')),
  at            timestamptz not null default now()
);
create index on usage_events (user_id, kind, at);

-- OAuth connections (Gmail/Outlook read-only). Store tokens encrypted, never in plaintext.
create table connections (
  user_id       uuid not null references users(id) on delete cascade,
  provider      text not null check (provider in ('gmail','outlook')),
  account_email text not null,
  token_enc     bytea not null,
  scopes        text[] not null,
  primary key (user_id, provider, account_email)
);

-- Row-level security: each student sees only their own rows.
alter table profiles     enable row level security;
alter table applications enable row level security;
alter table outreach     enable row level security;
alter table approvals    enable row level security;
alter table usage_events enable row level security;
alter table connections  enable row level security;

create policy own_profile     on profiles     using (user_id = current_setting('app.user_id')::uuid);
create policy own_apps        on applications using (user_id = current_setting('app.user_id')::uuid);
create policy own_outreach    on outreach     using (user_id = current_setting('app.user_id')::uuid);
create policy own_approvals   on approvals    using (user_id = current_setting('app.user_id')::uuid);
create policy own_usage       on usage_events using (user_id = current_setting('app.user_id')::uuid);
create policy own_connections on connections  using (user_id = current_setting('app.user_id')::uuid);
