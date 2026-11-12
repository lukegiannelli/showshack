// The Show Shack · reminders (Supabase Edge Function, free plan).
// Called once a day by pg_cron (with the x-cron-token header): for everyone who turned on reminders, sends a phone
// notification the day before a show they're interested in (★), and when a show they're interested in drops in price.
// Also: a signed-in person can call it with {test:true} to get a test notification on their own devices.
// Each reminder is sent once (push_log). Dead subscriptions (the phone unsubscribed) are cleaned up.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const APP = "https://lukegiannelli.github.io/showshack/";
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" } });
const hid = (id: string) => "e-" + String(id).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
const laDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d);

type Sub = { endpoint: string; user_id: string; p256dh: string; auth_key: string; remind_day_before: boolean; price_drops: boolean };
type Msg = { title: string; body: string; url: string };

async function sendAll(db: any, subs: Sub[], msg: Msg) {
  let ok = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, JSON.stringify(msg), { TTL: 86400 }); ok++; }
    catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
  }
  return ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("app_secrets").select("key,value");
  const S: Record<string, string> = Object.fromEntries((sec || []).map((r: any) => [r.key, r.value]));
  webpush.setVapidDetails(APP, S.vapid_public, S.vapid_private);
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* no body */ }

  // a signed-in person testing their own devices
  if (body.test) {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
    const { data: u } = await db.auth.getUser(jwt);
    if (!u?.user) return json({ error: "sign in first" }, 401);
    const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", u.user.id);
    const sent = await sendAll(db, (subs || []) as Sub[], { title: "The Show Shack", body: "Reminders are on ✓ We'll ping you the day before shows you're interested in.", url: APP });
    return json({ sent });
  }

  // the daily run
  if (!S.cron_token || req.headers.get("x-cron-token") !== S.cron_token) return json({ error: "not allowed" }, 403);
  const dry = !!body.dry;
  const evs: any[] = (await (await fetch(APP + "events.json", { cache: "no-store" })).json()).events || [];
  const byKey = new Map(evs.map((e) => ["e:" + e.id, e]));
  const today = laDay(new Date()), tomorrow = laDay(new Date(Date.now() + 864e5));
  const { data: subsAll } = await db.from("push_subscriptions").select("*");
  const subs = (subsAll || []) as Sub[];
  const users = [...new Set(subs.map((s) => s.user_id))];
  if (!users.length) return json({ users: 0, planned: 0, sent: 0 });
  const { data: pp } = await db.from("passports").select("user_id,data").in("user_id", users);
  const plan: { user: string; key: string; subs: Sub[]; msg: Msg }[] = [];
  for (const p of pp || []) {
    const stars: string[] = p.data?.k?.["radar-stars"]?.v || [];
    const mine = subs.filter((s) => s.user_id === p.user_id);
    for (const k of stars) {
      const e = byKey.get(k); if (!e) continue;
      const where = [e.venue, e.city].filter(Boolean).join(", ");
      if (e.start === tomorrow) {
        const to = mine.filter((s) => s.remind_day_before);
        if (to.length) plan.push({ user: p.user_id, key: `tmrw:${k}:${e.start}`, subs: to, msg: { title: "Tomorrow: " + e.title, body: [e.time, where].filter(Boolean).join(" · "), url: APP + "#" + hid(e.id) } });
      }
      if (e.priceChangedAt === today && e.priceWas > e.priceFrom && e.start >= today) {
        const to = mine.filter((s) => s.price_drops);
        if (to.length) plan.push({ user: p.user_id, key: `drop:${k}:${e.priceFrom}`, subs: to, msg: { title: "Price drop: " + e.title, body: `Now from $${Math.round(e.priceFrom)} (was $${Math.round(e.priceWas)}) · ${where}`, url: APP + "#" + hid(e.id) } });
      }
    }
  }
  const { data: log } = await db.from("push_log").select("user_id,key").in("user_id", users);
  const done = new Set((log || []).map((r: any) => r.user_id + "|" + r.key));
  const todo = plan.filter((x) => !done.has(x.user + "|" + x.key));
  if (dry) return json({ users: users.length, planned: todo.length, sample: todo.slice(0, 3).map((x) => x.msg) });
  let sent = 0;
  for (const x of todo) { const n = await sendAll(db, x.subs, x.msg); if (n) { sent += n; await db.from("push_log").insert({ user_id: x.user, key: x.key }); } }
  return json({ users: users.length, planned: todo.length, sent });
});
