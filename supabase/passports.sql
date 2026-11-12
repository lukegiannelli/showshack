-- Show passport sync: what's set up in the Supabase project "The Show Shack" (free plan).
-- Already applied on 2026-11-11. Kept here as a record; you don't need to run it.

-- One small row per signed-in person: their Show passport (stamps, log, bucket list, starred shows).
create table public.passports (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- safeguard: cap each passport at ~200 KB so nobody can fill the free database
  constraint passports_size check (octet_length(data::text) < 200000),
  constraint passports_is_object check (jsonb_typeof(data) = 'object')
);

alter table public.passports enable row level security;

-- each person can only ever see and change their own row
create policy "read own passport" on public.passports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own passport" on public.passports
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own passport" on public.passports
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own passport" on public.passports
  for delete to authenticated using ((select auth.uid()) = user_id);

-- the server sets the timestamp, not the browser
create or replace function public.passports_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger passports_touch before insert or update on public.passports
  for each row execute function public.passports_touch();

-- signed-out visitors get nothing
revoke all on public.passports from anon;
grant select, insert, update, delete on public.passports to authenticated;

-- lock helper functions so they can't be called through the API
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.passports_touch() from public, anon, authenticated;
