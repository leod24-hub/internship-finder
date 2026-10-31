-- Local stand-in for Supabase's auth schema, so migration 002 runs unchanged on a plain Postgres.
-- The API server sets app.user_id per transaction; auth.uid() and auth.role() read it.
-- Do not apply this file on Supabase, which provides the real auth schema.

create schema if not exists auth;

create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create or replace function auth.role() returns text
  language sql stable
  as $$ select case when nullif(current_setting('app.user_id', true), '') is null then 'anon' else 'authenticated' end $$;
