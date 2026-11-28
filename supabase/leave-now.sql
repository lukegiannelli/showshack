-- The Show Shack · "Leave now" pings. Applied 2026-11-28.
-- push_subscriptions.leave_now: the switch (You -> Reminders -> "On show day: when to leave…"), on by default.
-- Edge Function "leave-now" (supabase/functions/leave-now): hourly; one ping in the hour before you should leave for a
-- show you starred today (start - drive time with no traffic - 15 min), only if you've set a start point. Once per show.
alter table public.push_subscriptions add column if not exists leave_now boolean not null default true;
select cron.schedule('show-shack-leave-now', '7 * * * *', $$
  select net.http_post(
    url := 'https://tdahsfxcfsgalfqhsnal.supabase.co/functions/v1/leave-now',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select value from public.app_secrets where key='cron_token')),
    body := '{}'::jsonb)
$$);
