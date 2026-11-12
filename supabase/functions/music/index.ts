// The Show Shack · music (Supabase Edge Function, free plan).
// Turns a PUBLIC music link into a list of artist names, so the app can match them with shows. No logins, nothing kept
// (no table, no log of who asked). Works with:
//   · SoundCloud profile (soundcloud.com/<you>): the artists you follow + the artists in your public likes
//   · YouTube / YouTube Music playlist (…?list=…): the artists in the playlist (public or unlisted)
//   · Spotify playlist (open.spotify.com/playlist/…): read from Spotify's public embed player page
//   · Apple Music playlist (music.apple.com/…/playlist/…): read from the shared playlist page

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" } });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

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

// split "Drake & Don Toliver", "KAROL G, Judeline" into single artists
const split = (s: string) => s.split(/\s*(?:,|&| x | feat\.? | ft\.? | with )\s*/i).map((x) => x.trim()).filter(Boolean);

// Spotify: the public embed player page lists the playlist's tracks with their artists (no key, no login)
async function spotify(id: string) {
  const r = await fetch(`https://open.spotify.com/embed/playlist/${id}`, { headers: UA });
  const m = (await r.text()).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  const list = m ? (JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity?.trackList || []) : [];
  if (!list.length) return { error: "That Spotify playlist is private or empty. Make it public (… → Add to profile) and try again." };
  const names: string[] = [];
  for (const t of list) for (const a of split(String(t.subtitle || ""))) names.push(a);
  return { artists: rank(names) };
}

// Apple Music: a shared playlist page carries its songs' artist names (no key, no login)
async function apple(url: string) {
  const r = await fetch(url.split("?")[0], { headers: UA });
  if (!r.ok) return { error: "That Apple Music playlist isn't public. In Apple Music: … → Share Playlist → Copy, then paste that link." };
  const m = (await r.text()).match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
  const names: string[] = [];
  if (m) for (const x of m[1].matchAll(/"artistName":"([^"]+)"/g)) for (const a of split(dec(x[1]))) names.push(a);
  if (!names.length) return { error: "We couldn't find any songs in that Apple Music link." };
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
    const sc = /soundcloud\.com\/([A-Za-z0-9_-]{2,60})/i.exec(link), yt = /[?&]list=([A-Za-z0-9_-]{10,60})/.exec(link), sp = /spotify\.com\/(?:[a-z-]+\/)?playlist\/([A-Za-z0-9]{10,40})/.exec(link), am = /^https:\/\/music\.apple\.com\/[a-z]{2}\/(?:playlist|album)\//i.test(link);
    if (sc && !/^(discover|search|charts|you|stream|upload|pages)$/i.test(sc[1])) out = await soundcloud(sc[1]);
    else if (yt) out = await youtube(yt[1]);
    else if (sp) out = await spotify(sp[1]);
    else if (am) out = await apple(link);
    else out = { error: "Paste a SoundCloud profile, or a YouTube Music, Spotify or Apple Music playlist link." };
  } catch (_) { out = { error: "Couldn't read that link right now. Try again in a minute." }; }
  return json(out, out.error ? 400 : 200);
});
