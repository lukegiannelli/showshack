// The Show Shack · music (Supabase Edge Function, free plan).
// Turns a PUBLIC music link into a list of artist names, so the app can match them with shows. No logins, nothing kept
// (no table, no log of who asked). Works with:
//   · SoundCloud profile (soundcloud.com/<you>): the artists you follow + the artists in your public likes
//   · YouTube / YouTube Music playlist (…?list=…): the artists in the playlist (public or unlisted)
//   · Spotify playlist (open.spotify.com/playlist/…): needs the app's own Spotify key in app_secrets (optional)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" } });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
let token = "", tokenUntil = 0;

// count names, most-mentioned first
function rank(names: string[], max = 60) {
  const c = new Map<string, number>();
  for (let n of names) { n = n.trim(); if (n.length < 2 || n.length > 60) continue; c.set(n, (c.get(n) || 0) + 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([n]) => ({ n, g: [] as string[] }));
}

async function soundcloud(user: string) {
  const names: string[] = [];
  for (const page of ["following", "likes"]) {
    const r = await fetch(`https://soundcloud.com/${user}/${page}`, { headers: UA });
    if (r.status === 404) return { error: "No SoundCloud profile with that link." };
    if (!r.ok) continue;
    const ns = ((await r.text()).match(/<noscript>[\s\S]*?<\/noscript>/g) || []).join("\n");
    if (page === "following") for (const m of ns.matchAll(/<article><h2 itemprop="name"><a itemprop="url" href="\/[^"]+">([^<]+)<\/a><\/h2>/g)) names.push(dec(m[1]), dec(m[1]));   // follows count double
    else for (const m of ns.matchAll(/<h2 itemprop="name"><a itemprop="url" href="\/[^"]+">[^<]+<\/a>\s*by\s*<a href="\/[^"]+">([^<]+)<\/a>/g)) names.push(dec(m[1]));
  }
  if (!names.length) return { error: "That SoundCloud profile has no public follows or likes we could read." };
  return { artists: rank(names) };
}

async function youtube(list: string) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(list)}`, { headers: UA });
  if (!r.ok) return { error: "That playlist is private or doesn't exist. Set it to Public or Unlisted and try again." };
  const x = await r.text();
  const names: string[] = [];
  for (const e of x.split("<entry>").slice(1)) {
    const title = dec((/<title>([^<]+)<\/title>/.exec(e) || [])[1] || ""), author = dec((/<author>\s*<name>([^<]+)<\/name>/.exec(e) || [])[1] || "");
    // "Artist - Song" titles name the artist; otherwise the channel ("Artist - Topic", "ArtistVEVO") does
    const fromTitle = /^(.{2,40}?)\s[-–]\s/.exec(title);
    const ch = author.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").replace(/\s*(Official|Music)$/i, "").trim();
    // "Artist - Topic" / "ArtistVEVO" channels are the artist for sure; otherwise use the title's "Artist - " part
    // unless the channel name is in the title (then the channel is the artist)
    const n = /-\s*Topic$|VEVO$/i.test(author) || !fromTitle || (ch && title.toLowerCase().includes(ch.toLowerCase())) ? ch : fromTitle[1];
    for (const part of n.split(/\s*(?:,|&| x | feat\.? | ft\.? )\s*/i)) if (!/\(|video|oficial|official|lyrics/i.test(part)) names.push(part);
  }
  if (!names.length) return { error: "That playlist looks empty." };
  return { artists: rank(names), note: "YouTube shares the newest 15 songs of a playlist." };
}

async function spotify(id: string) {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: sec } = await db.from("app_secrets").select("key,value").in("key", ["spotify_client_id", "spotify_client_secret"]);
  const S: Record<string, string> = Object.fromEntries((sec || []).map((r: any) => [r.key, r.value]));
  if (!S.spotify_client_id || !S.spotify_client_secret) return { error: "Spotify links aren't switched on. Paste a SoundCloud or YouTube Music link, or type your artists." };
  if (!token || Date.now() > tokenUntil) {
    const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(S.spotify_client_id + ":" + S.spotify_client_secret) }, body: "grant_type=client_credentials" });
    const t = await r.json(); if (!t.access_token) return { error: "Spotify said no." };
    token = t.access_token; tokenUntil = Date.now() + (t.expires_in - 60) * 1000;
  }
  const H = { Authorization: "Bearer " + token };
  const tr = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&fields=items(track(artists(id,name)))`, { headers: H });
  if (!tr.ok) return { error: "That playlist is private or doesn't exist." };
  const names: string[] = [];
  for (const it of ((await tr.json()).items || [])) for (const a of (it.track?.artists || [])) if (a?.name) names.push(a.name);
  return { artists: rank(names) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* none */ }
  let link = String(body.link || body.playlist || "").trim();
  let out: any;
  try {
    // the SoundCloud app shares short links (on.soundcloud.com/…): follow them to the real page
    if (/on\.soundcloud\.com\//i.test(link)) { const r = await fetch(link.startsWith("http") ? link : "https://" + link, { headers: UA, redirect: "follow" }); link = r.url; }
    const sc = /soundcloud\.com\/([A-Za-z0-9_-]{2,60})/i.exec(link), yt = /[?&]list=([A-Za-z0-9_-]{10,60})/.exec(link), sp = /spotify\.com\/playlist\/([A-Za-z0-9]{10,40})/.exec(link);
    if (sc && !/^(discover|search|charts|you|stream|upload|pages)$/i.test(sc[1])) out = await soundcloud(sc[1]);
    else if (yt) out = await youtube(yt[1]);
    else if (sp) out = await spotify(sp[1]);
    else out = { error: "Paste your SoundCloud profile link or a YouTube Music playlist link." };
  } catch (_) { out = { error: "Couldn't read that link right now. Try again in a minute." }; }
  return json(out, out.error ? 400 : 200);
});
