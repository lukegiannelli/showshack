// The Show Shack · leave-now (Supabase Edge Function, free plan).
// Called every hour by pg_cron (x-cron-token header). On show day, for people who turned on reminders + "when to leave"
// (push_subscriptions.leave_now) and set a start point (radar-prefs synced as radar-origin): one ping in the hour
// before they should leave for a show they starred: start time − drive time (no traffic) − 15 min. Same drive math as
// the app (core.js SH.driveMin). Sent once per show (push_log "leave:<id>:<date>"). Shows with no listed time, or
// that start before 6 AM, are skipped. {dry:true} previews without sending.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const APP = "https://lukegiannelli.github.io/showshack/";
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const hid = (id: string) => "e-" + String(id).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80);
type Sub = { endpoint: string; user_id: string; p256dh: string; auth_key: string; leave_now?: boolean };

// LA wall clock now: date + minutes after midnight
function laNow() {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date()).forEach((x) => (p[x.type] = x.value));
  return { day: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
}
// first clock time in the listing ("8 PM", "Doors 7 PM · show 8", "7–10 PM" → 7 PM), minutes after midnight, or null
function startMin(t: string): number | null {
  t = String(t || "");
  const r = /\b(\d{1,2})(?::(\d\d))?\s*(?:[–—-]|to)\s*(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b/i.exec(t);
  const m = /(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b/i.exec(t);
  if (r && (!m || r.index < m.index)) {
    const pm = /p/i.test(r[5]), end = (+r[3] % 12 + (pm ? 12 : 0)) * 60 + (+r[4] || 0);
    let h = +r[1] % 12 + (pm ? 12 : 0); if (h * 60 + (+r[2] || 0) > end) h = (h + 12) % 24; return h * 60 + (+r[2] || 0);
  }
  if (!m) return null;
  return (+m[1] % 12 + (/p/i.test(m[3]) ? 12 : 0)) * 60 + (+m[2] || 0);
}
const miles = (a: number, b: number, c: number, d: number) => { const t = (x: number) => x * Math.PI / 180, x = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * 3958.8 * Math.asin(Math.sqrt(x)); };
const driveMin = (roadMi: number) => Math.max(5, Math.round((6 + roadMi / 55 * 60) / 5) * 5);   // = core.js SH.driveMin
const clock = (m: number) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`; };

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("app_secrets").select("key,value");
  const S: Record<string, string> = Object.fromEntries((sec || []).map((r: any) => [r.key, r.value]));
  if (!S.cron_token || req.headers.get("x-cron-token") !== S.cron_token) return json({ error: "not allowed" }, 403);
  let body: any = {}; try { body = await req.json(); } catch (_) { /* none */ }
  const dry = !!body.dry, now = laNow(), at = typeof body.at === "number" && dry ? body.at : now.min;   // dry runs can preview another time of day
  webpush.setVapidDetails(APP, S.vapid_public, S.vapid_private);

  const { data: subsAll } = await db.from("push_subscriptions").select("*");
  const subs = ((subsAll || []) as Sub[]).filter((s) => s.leave_now !== false);
  const users = [...new Set(subs.map((s) => s.user_id))];
  if (!users.length) return json({ users: 0, planned: 0, sent: 0 });
  const evs: any[] = (await (await fetch(APP + "events.json", { cache: "no-store" })).json()).events || [];
  const today = evs.filter((e) => e.start === now.day && e.status !== "cancelled" && typeof e.lat === "number");
  const byKey = new Map(today.map((e) => ["e:" + e.id, e]));
  const { data: pp } = await db.from("passports").select("user_id,data").in("user_id", users);
  const { data: log } = await db.from("push_log").select("user_id,key").in("user_id", users).like("key", "leave:%");
  const done = new Set((log || []).map((r: any) => r.user_id + "|" + r.key));

  const plan: { user: string; key: string; subs: Sub[]; msg: any }[] = [];
  for (const p of pp || []) {
    const o = p.data?.k?.["radar-origin"]?.v;
    if (!o || typeof o.lat !== "number" || typeof o.lon !== "number") continue;   // no start point: no drive time, no ping
    const to = subs.filter((s) => s.user_id === p.user_id);
    for (const k of (p.data?.k?.["radar-stars"]?.v || []) as string[]) {
      const e = byKey.get(k); if (!e) continue;
      const st = startMin(e.time); if (st == null || st < 6 * 60) continue;
      const mi = miles(o.lat, o.lon, e.lat, e.lon) * 1.2, dr = driveMin(mi), leave = st - dr - 15;
      if (!(leave >= at && leave < at + 60)) continue;   // only in the hour before it's time to go
      const key = `leave:${e.id}:${e.start}`; if (done.has(p.user_id + "|" + key)) continue;
      plan.push({ user: p.user_id, key, subs: to, msg: { title: `Leave by ${clock(leave)} for ${e.title}`.slice(0, 90),
        body: `~${dr} min drive (no traffic) to ${e.venue}${e.city ? ", " + e.city : ""} · starts ${clock(st)}`, url: APP + "#" + hid(e.id) } });
    }
  }
  if (dry) return json({ users: users.length, planned: plan.length, at: clock(at), sample: plan.slice(0, 4).map((x) => x.msg) });
  let sent = 0;
  for (const x of plan) {
    let n = 0;
    for (const s of x.subs) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, JSON.stringify(x.msg), { TTL: 3600 }); n++; }
      catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
    }
    if (n) { sent += n; await db.from("push_log").insert({ user_id: x.user, key: x.key }); }
  }
  return json({ users: users.length, planned: plan.length, sent });
});
