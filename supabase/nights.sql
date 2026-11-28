-- The Show Shack · leaderboard v2: nights planned / played + "this month". Applied 2026-11-28.
-- Reads the synced passport copy (public.passports.data, written by cloud.js):
--   radar-been  = stamped venues (no dates, so "this month" can't count new venues)
--   shack-nlog  = {nightId: {d:"YYYY-MM-DD", g:1 we went | 0 didn't happen}}  (night.js)
-- planned = dated nights with at least one stop; played = nights you said happened.
-- p_period 'all'   → ranked by venues, then nights played
-- p_period 'month' → this calendar month in LA: ranked by nights played, then planned (venues shown for context)
-- Counts are self-reported (like venues always were); it's a friendly board, not a contest with prizes.
drop function if exists public.leaderboard();
create or replace function public.leaderboard(p_period text default 'all')
returns table(name text, venues integer, planned integer, played integer, is_me boolean)
language sql stable security definer set search_path to ''
as $$
  with m as (
    select to_char(date_trunc('month', now() at time zone 'America/Los_Angeles'), 'YYYY-MM') as ym
  ), rows as (
    select p.name, p.user_id,
      coalesce(jsonb_array_length(case when jsonb_typeof(ps.data->'k'->'radar-been'->'v') = 'array' then ps.data->'k'->'radar-been'->'v' end), 0) as venues,
      case when jsonb_typeof(ps.data->'k'->'shack-nlog'->'v') = 'object' then ps.data->'k'->'shack-nlog'->'v' else '{}'::jsonb end as nlog
    from public.profiles p left join public.passports ps on ps.user_id = p.user_id
    where p.on_leaderboard
  ), counted as (
    select r.name, r.user_id, r.venues,
      (select count(*) from jsonb_each(r.nlog) e, m
        where jsonb_typeof(e.value) = 'object' and (e.value->>'d') ~ '^\d{4}-\d\d-\d\d$'
          and (p_period <> 'month' or left(e.value->>'d', 7) = m.ym))::int as planned,
      (select count(*) from jsonb_each(r.nlog) e, m
        where jsonb_typeof(e.value) = 'object' and (e.value->>'d') ~ '^\d{4}-\d\d-\d\d$' and e.value->>'g' = '1'
          and (p_period <> 'month' or left(e.value->>'d', 7) = m.ym))::int as played
    from rows r
  )
  select c.name, c.venues, c.planned, c.played, c.user_id = auth.uid()
  from counted c
  where p_period <> 'month' or c.planned > 0
  order by case when p_period = 'month' then c.played else c.venues end desc,
           case when p_period = 'month' then c.planned else c.played end desc,
           c.venues desc, c.name
  limit 25
$$;
grant execute on function public.leaderboard(text) to anon, authenticated;
