-- "Just announced" alerts (Supabase project "The Show Shack", free plan).
-- Run once in the Supabase SQL editor (or approve it when Claude asks), then redeploy the "reminders" function
-- from supabase/functions/reminders/index.ts.
--   push_subscriptions.new_shows  the third switch under You -> Reminders (on by default)
--   follow_artists                each signed-in person's top 300 artists from Match my music (own row only, capped)

alter table public.push_subscriptions add column if not exists new_shows boolean not null default true;

create table if not exists public.follow_artists (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  names text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint follow_artists_cap check (cardinality(names) <= 300 and octet_length(array_to_string(names, '|')) <= 20000)
);
alter table public.follow_artists enable row level security;
create policy "own artists read"   on public.follow_artists for select using ((select auth.uid()) = user_id);
create policy "own artists add"    on public.follow_artists for insert with check ((select auth.uid()) = user_id);
create policy "own artists edit"   on public.follow_artists for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own artists delete" on public.follow_artists for delete using ((select auth.uid()) = user_id);
revoke all on public.follow_artists from anon;
grant select, insert, update, delete on public.follow_artists to authenticated;
