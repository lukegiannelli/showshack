// The Show Shack · music (Supabase Edge Function, free plan).
// Turns a PUBLIC Spotify playlist link into a list of artist names + their genres, so the app can match them with shows.
// No Spotify login, no personal data: it uses the app's own Spotify key (client credentials) to read a public playlist,
// returns artists, and keeps nothing (no table, no log of who asked). Keys live in public.app_secrets
// (spotify_client_id / spotify_client_secret); until they're added it answers {error:"not set up"}.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" } });
let token = "", tokenUntil = 0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* none */ }
  const m = /playlist[/:]([A-Za-z0-9]{10,40})/.exec(String(body.playlist || ""));
  if (!m) return json({ error: "Paste a Spotify playlist link (open.spotify.com/playlist/…)" }, 400);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("app_secrets").select("key,value").in("key", ["spotify_client_id", "spotify_client_secret"]);
  const S: Record<string, string> = Object.fromEntries((sec || []).map((r: any) => [r.key, r.value]));
  if (!S.spotify_client_id || !S.spotify_client_secret) return json({ error: "not set up" }, 503);
  if (!token || Date.now() > tokenUntil) {
    const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(S.spotify_client_id + ":" + S.spotify_client_secret) }, body: "grant_type=client_credentials" });
    const t = await r.json(); if (!t.access_token) return json({ error: "Spotify said no" }, 502);
    token = t.access_token; tokenUntil = Date.now() + (t.expires_in - 60) * 1000;
  }
  const H = { Authorization: "Bearer " + token };
  const tr = await fetch(`https://api.spotify.com/v1/playlists/${m[1]}/tracks?limit=100&fields=items(track(artists(id,name)))`, { headers: H });
  if (tr.status === 404) return json({ error: "That playlist is private or doesn't exist. Make it public and try again." }, 404);
  if (!tr.ok) return json({ error: "Couldn't read that playlist." }, 502);
  const items = (await tr.json()).items || [];
  const count = new Map<string, { id: string; n: string; c: number }>();
  for (const it of items) for (const a of (it.track?.artists || [])) { if (!a?.id) continue; const x = count.get(a.id) || { id: a.id, n: a.name, c: 0 }; x.c++; count.set(a.id, x); }
  const top = [...count.values()].sort((a, b) => b.c - a.c).slice(0, 50);
  let genres: Record<string, string[]> = {};
  if (top.length) {
    const ar = await fetch("https://api.spotify.com/v1/artists?ids=" + top.map((a) => a.id).join(","), { headers: H });
    if (ar.ok) for (const a of ((await ar.json()).artists || [])) if (a) genres[a.id] = (a.genres || []).slice(0, 4);
  }
  return json({ artists: top.map((a) => ({ n: a.n, g: genres[a.id] || [] })) });
});
