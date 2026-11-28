-- The Show Shack · feedback loop. Applied 2026-11-28.
-- client_errors   JavaScript errors from people's phones (no user id, no personal data): message, file, line, page, browser,
--                 app version. Anyone can add a row (signed in or not); nobody can read them through the API except the
--                 admin via admin_errors(). Capped at 300 a hour for everyone combined, rows older than 30 days are pruned.
-- missing_reports gains kind ('missing' | 'wrong') + show_id, so "Something wrong?" on a show card lands in the same
--                 Owner -> Review queue as missing-show reports (same 10-a-day cap per person).
-- push_subscriptions gains weekend_picks: the Thursday "your weekend" ping (reminders function), on by default for
--                 people who already turned reminders on; they can switch it off in You -> Reminders.
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  msg text not null check (char_length(msg) between 1 and 300),
  src text check (char_length(src) <= 200),
  line int,
  page text check (char_length(page) <= 60),
  ua text check (char_length(ua) <= 160),
  ver text check (char_length(ver) <= 20)
);
alter table public.client_errors enable row level security;
drop policy if exists "anyone can report an error" on public.client_errors;
create policy "anyone can report an error" on public.client_errors for insert to anon, authenticated with check (true);
grant insert on public.client_errors to anon, authenticated;
revoke select, update, delete on public.client_errors from anon, authenticated;

create or replace function public.client_errors_cap() returns trigger
language plpgsql security definer set search_path to '' as $$
declare n int; begin
  select count(*) into n from public.client_errors where at > now() - interval '1 hour';
  if n >= 300 then raise exception 'cap: errors'; end if;
  if random() < 0.02 then delete from public.client_errors where at < now() - interval '30 days'; end if;
  return new; end $$;
drop trigger if exists client_errors_cap on public.client_errors;
create trigger client_errors_cap before insert on public.client_errors for each row execute function public.client_errors_cap();

-- admin only: the last 7 days, same error grouped, most frequent first
create or replace function public.admin_errors() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return coalesce((select jsonb_agg(x order by x.n desc, x.last desc) from (
    select msg, src, line, page, count(*) as n, max(at) as last, max(ver) as ver,
      count(distinct ua) as browsers, (array_agg(ua order by at desc))[1] as ua
    from public.client_errors where at > now() - interval '7 days'
    group by msg, src, line, page order by count(*) desc limit 40) x), '[]'::jsonb);
end $$;
revoke all on function public.admin_errors() from public, anon;
grant execute on function public.admin_errors() to authenticated;

alter table public.missing_reports add column if not exists kind text not null default 'missing' check (kind in ('missing','wrong'));
alter table public.missing_reports add column if not exists show_id text check (char_length(show_id) <= 120);

create or replace function public.admin_review() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  return jsonb_build_object(
    'flyers', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select c.id, c.title, c.start, c.venue, c.city, c.status, c.created_at, c.flyer_path,
          (select count(*) from public.show_reports r where r.show_id = c.id) as reports
        from public.community_shows c where c.start >= current_date - 1 order by c.created_at desc limit 100) x), '[]'::jsonb),
    'missing', coalesce((select jsonb_agg(m order by m.created_at desc) from (
        select id, what, link, status, created_at, kind, show_id from public.missing_reports where status = 'new' order by created_at desc limit 100) m), '[]'::jsonb));
end $$;

alter table public.push_subscriptions add column if not exists weekend_picks boolean not null default true;
