-- Migration 002: category taxonomy for every field of study, plus RLS fixes.
-- Run after schema.sql. Written for Supabase (auth.uid()). Review before applying.

-- ---------------------------------------------------------------------------
-- 1. Taxonomy
-- ---------------------------------------------------------------------------
create table categories (
  id         serial primary key,
  parent_id  integer references categories(id) on delete cascade,
  name       text not null,
  slug       text not null unique,
  sort_order integer not null default 0
);
create index on categories (parent_id);

create table posting_categories (
  posting_id  text    not null references postings(id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  primary key (posting_id, category_id)
);
create index on posting_categories (category_id);

create table user_interests (
  user_id     uuid    not null references users(id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  priority    smallint not null default 2 check (priority between 1 and 3),  -- 1 = top choice
  primary key (user_id, category_id)
);

create table schools (
  id      serial primary key,
  name    text not null unique,
  state   text,
  country text not null default 'US'
);
create table majors (
  id   serial primary key,
  name text not null unique
);

-- Posting fields needed to match across fields
alter table postings
  add column opportunity_type text not null default 'internship'
    check (opportunity_type in ('internship','co_op','research','fellowship','externship','summer_program','other')),
  add column paid text not null default 'unknown' check (paid in ('yes','no','unknown')),
  add column citizenship_required boolean not null default false,
  add column term text,                       -- e.g. 'Summer 2027'
  add column classified_at timestamptz;      -- set when the LLM categorized it once

-- Profile fields
alter table profiles
  add column school_id integer references schools(id),
  add column major_id  integer references majors(id),
  add column preferred_modes text[] not null default '{}',   -- remote / hybrid / onsite
  add column preferred_locations text[] not null default '{}',
  add column category_data jsonb not null default '{}';      -- category-specific modules (portfolio, clinical hours, ...)

-- ---------------------------------------------------------------------------
-- 2. RLS fixes (Supabase)
-- ---------------------------------------------------------------------------
-- The original policies used current_setting('app.user_id') and had no WITH CHECK.
drop policy own_profile     on profiles;
drop policy own_apps        on applications;
drop policy own_outreach    on outreach;
drop policy own_approvals   on approvals;
drop policy own_usage       on usage_events;
drop policy own_connections on connections;

create policy own_profile   on profiles     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_apps      on applications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_outreach  on outreach     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_approvals on approvals    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Usage and connections are written by the server (service role), read-only for the student.
create policy own_usage       on usage_events for select using (user_id = auth.uid());
create policy own_connections on connections  for select using (user_id = auth.uid());

alter table user_interests enable row level security;
create policy own_interests on user_interests for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- users: a student can read their own row but cannot edit plan or stripe_customer_id.
-- Those are written only by the server via the service role (Stripe webhook).
alter table users enable row level security;
create policy read_self on users for select using (id = auth.uid());

-- Shared reference data: readable by any signed-in user, written only by the server.
alter table categories         enable row level security;
alter table posting_categories enable row level security;
alter table postings           enable row level security;
alter table schools            enable row level security;
alter table majors             enable row level security;
create policy read_categories         on categories         for select using (auth.role() = 'authenticated');
create policy read_posting_categories on posting_categories for select using (auth.role() = 'authenticated');
create policy read_postings           on postings           for select using (auth.role() = 'authenticated');
create policy read_schools            on schools            for select using (auth.role() = 'authenticated');
create policy read_majors             on majors             for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 3. Billing support
-- ---------------------------------------------------------------------------
create table stripe_events (            -- makes the webhook idempotent
  id          text primary key,         -- Stripe event id
  type        text not null,
  received_at timestamptz not null default now()
);
create table purchases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  plan        text not null check (plan in ('pro','premium')),
  period_start date not null,
  period_end   date not null,
  stripe_ref  text,
  created_at  timestamptz not null default now()
);
alter table purchases enable row level security;
create policy read_own_purchases on purchases for select using (user_id = auth.uid());

-- Note: the server role bypasses RLS. Keep the service key out of the extension and the browser.
