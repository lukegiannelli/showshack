-- Social features: what's set up in the Supabase project "The Show Shack" (free plan).
-- Already applied on 2026-11-11. Kept here as a record; you don't need to run it.
-- live_nights   one row per shared night; the link (#L=id) stays the same while the plan updates. Max 40 per person, 30 KB each.
-- profiles      display name + friend code; leaderboard and public ratings are OFF until the person turns them on.
-- friends       both directions, only made through add_friend(code). Max 200 per person.
-- venue_ratings 1-5 stars per venue from people who opted in (never notes). Max 600 per person.
-- storage "stamps" private photo bucket: your own folder only, 300 KB per photo, JPEG/WebP, max 100 photos.
--
-- Public functions (no sign-in): get_live_night(id), leaderboard(), venue_scores().
-- Signed-in functions: add_friend(code), remove_friend(id), my_friends(), my_stamp_count().
--
-- Lesson learned: a storage insert rule can't count rows in storage.objects directly
-- (uploads fail with "database schema is invalid"), so the photo cap goes through my_stamp_count().

create table public.live_nights (
  id text primary key check (id ~ '^[A-Za-z0-9]{10,16}$'),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan jsonb not null,
  updated_at timestamptz not null default now(),
  constraint live_nights_size check (octet_length(plan::text) < 30000)
);
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  friend_code text not null unique default upper(substr(md5(gen_random_uuid()::text),1,8)),
  on_leaderboard boolean not null default false,
  share_ratings boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id), check (user_id <> friend_id)
);
create table public.venue_ratings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  venue text not null check (char_length(venue) between 3 and 160),
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, venue)
);
-- Every table has row level security on, with "own rows only" rules for signed-in users and nothing for signed-out visitors.
-- Caps are enforced by the enforce_caps() trigger. See the Supabase dashboard (Database → Policies) for the full rules.
