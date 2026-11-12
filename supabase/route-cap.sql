-- The Show Shack · daily cap for Google road routes (already applied to the live project).
-- Google doesn't let the Routes API be capped, so the app asks this function before every Google route.
-- 150 a day for everyone together ≈ 4,650 a month, under Google's free monthly amount. Past the cap the app uses
-- the free OSRM router instead. Change the number in "cap" to raise or lower it.
create table if not exists public.route_quota (day date primary key, n int not null default 0);
alter table public.route_quota enable row level security;   -- no policies: only the function below touches it
revoke all on public.route_quota from anon, authenticated;

create or replace function public.take_route_slot()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare cap constant int := 150; got int;
begin
  insert into public.route_quota as q (day, n) values ((now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (day) do update set n = q.n + 1 where q.n < cap
  returning n into got;
  delete from public.route_quota where day < current_date - 40;   -- keep the table tiny
  return got is not null;
end $$;
revoke all on function public.take_route_slot() from public;
grant execute on function public.take_route_slot() to anon, authenticated;
