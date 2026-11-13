// The Show Shack · music (Supabase Edge Function, free plan).
// Turns a PUBLIC music link into a list of artist names, so the app can match them with shows. No logins, nothing kept
// (no table, no log of who asked). Works with:
//   · SoundCloud profile (soundcloud.com/<you>): EVERY artist you follow + the artists in your public likes (SoundCloud's
//     own web API with the public key their website uses; falls back to the plain page, which only shows the first ~20)
//   · YouTube / YouTube Music playlist (…?list=…): the artists in the whole playlist (the playlist page + its "load more"
//     pages, up to ~1,000 songs; public or unlisted). YouTube's playlist RSS feed stopped working, so it's only a fallback.
//   · Spotify playlist (open.spotify.com/playlist/…): read from Spotify's public embed player page
//   · Apple Music playlist (music.apple.com/…/playlist/…): read from the shared playlist page
// Answers { artists: [{n, c}], title, note? } (c = how often the artist came up) or { error }.

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" } });
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" };
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
// every outside request gives up after 12 s, so one slow site can't hang the whole read
const get = (url: string, init: RequestInit = {}) => fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(12000) });
const MAX = 1000;   // artists per link

// count names, most-mentioned first
function rank(names: string[], max = MAX) {
  const c = new Map<string, number>(), shown = new Map<string, string>();
  for (let n of names) {
    n = n.trim(); if (n.length < 2 || n.length > 60) continue;
    const k = n.toLowerCase(); if (!shown.has(k)) shown.set(k, n); c.set(k, (c.get(k) || 0) + 1);
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k, n]) => ({ n: shown.get(k)!, c: n }));
}

/* ===== SoundCloud ===== */
let SC_ID = "";   // SoundCloud's public web key, found in their site's script (kept while this function stays warm)
async function scKey(fresh = false) {
  if (SC_ID && !fresh) return SC_ID;
  const html = await (await get("https://soundcloud.com/")).text();
  const scripts = [...html.matchAll(/<script[^>]+src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map((m) => m[1]).reverse();
  for (const s of scripts) {
    const m = /client_id:"([A-Za-z0-9]{32})"/.exec(await (await get(s)).text());
    if (m) return (SC_ID = m[1]);
  }
  throw new Error("no key");
}
async function scApi(path: string): Promise<any> {
  for (let i = 0; i < 2; i++) {
    const id = await scKey(i > 0), r = await get(`${path}${path.includes("?") ? "&" : "?"}client_id=${id}`);
    if (r.status === 401 || r.status === 403) continue;   // the key changed: find the new one once
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("sc " + r.status);
    return r.json();
  }
  throw new Error("sc key");
}
async function scPages(first: string, pages: number, take: (x: any) => void) {
  let url: string | null = first;
  for (let i = 0; url && i < pages; i++) {
    const j = await scApi(url); if (!j) break;
    for (const x of j.collection || []) take(x);
    url = j.next_href || null;
  }
}
async function soundcloud(user: string) {
  try {
    const u = await scApi(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent("https://soundcloud.com/" + user)}`);
    if (!u) return { error: "No SoundCloud profile with that link." };
    if (u.kind === "user") {
      const names: string[] = [];
      // follows count double: you picked them on purpose. Up to 3,000 follows and 1,000 likes.
      await scPages(`https://api-v2.soundcloud.com/users/${u.id}/followings?limit=200`, 15, (x) => { if (x.username) names.push(x.username, x.username); });
      await scPages(`https://api-v2.soundcloud.com/users/${u.id}/likes?limit=200`, 5, (x) => {
        const t = x.track || x.playlist; if (!t) return;
        const a = (t.publisher_metadata && t.publisher_metadata.artist) || (t.user && t.user.username);
        if (a) for (const p of split(String(a))) names.push(p);
      });
      if (!names.length) return { error: "That SoundCloud profile doesn't follow or like anyone publicly yet." };
      return { artists: rank(names), title: u.username || user, note: `Read ${u.followings_count ?? "your"} follows and your likes.` };
    }
  } catch (_) { /* SoundCloud's API is down or changed: read the plain page instead */ }
  return soundcloudPage(user);
}
async function soundcloudPage(user: string) {
  const names: string[] = [];
  for (const page of ["following", "likes"]) {
    const r = await get(`https://soundcloud.com/${user}/${page}`);
    if (r.status === 404) return { error: "No SoundCloud profile with that link." };
    if (!r.ok) continue;
    const ns = ((await r.text()).match(/<noscript>[\s\S]*?<\/noscript>/g) || []).join("\n");
    if (page === "following") for (const m of ns.matchAll(/<article><h2 itemprop="name"><a itemprop="url" href="\/[^"]+">([^<]+)<\/a><\/h2>/g)) names.push(dec(m[1]), dec(m[1]));
    else for (const m of ns.matchAll(/<h2 itemprop="name"><a itemprop="url" href="\/[^"]+">[^<]+<\/a>\s*by\s*<a href="\/[^"]+">([^<]+)<\/a>/g)) names.push(dec(m[1]));
  }
  if (!names.length) return { error: "That SoundCloud profile has no public follows or likes we could read." };
  return { artists: rank(names), title: user, note: "SoundCloud only showed us your first few follows this time. Tap Update later to get the rest." };
}

/* ===== YouTube / YouTube Music ===== */
// one song → its artist(s): "Artist - Topic" / "ArtistVEVO" channels are the artist for sure; otherwise the "Artist - " part
// of the title, unless the channel's name is in the title (then the channel is the artist)
function ytArtists(title: string, author: string) {
  const fromTitle = /^(.{2,40}?)\s[-–—]\s/.exec(title);
  const ch = author.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").replace(/\s*(Official|Music)$/i, "").trim();
  const n = /-\s*Topic$|VEVO$/i.test(author) || !fromTitle || (ch && title.toLowerCase().includes(ch.toLowerCase())) ? ch : fromTitle[1];
  return split(n).filter((p) => !/\(|video|oficial|official|lyrics|^various artists$/i.test(p));
}
// walk YouTube's page data and pick out every song (new "lockup" layout and the older one) + the "load more" token
function ytWalk(o: any, songs: [string, string][], conts: string[], depth = 0) {
  if (!o || typeof o !== "object" || depth > 60) return;
  if (Array.isArray(o)) { for (const x of o) ytWalk(x, songs, conts, depth + 1); return; }
  const lm = o.lockupMetadataViewModel;
  if (lm && lm.title) {
    const parts = lm.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || [];
    songs.push([String(lm.title.content || ""), String(parts[0]?.text?.content || "")]);
    return;
  }
  const pv = o.playlistVideoRenderer || o.playlistPanelVideoRenderer;
  if (pv) {
    const t = (pv.title?.runs || []).map((r: any) => r.text).join("") || pv.title?.simpleText || "";
    const a = (pv.shortBylineText?.runs || pv.longBylineText?.runs || []).map((r: any) => r.text).join("");
    songs.push([t, a]); return;
  }
  if (o.continuationCommand?.token) conts.push(o.continuationCommand.token);
  for (const k in o) ytWalk(o[k], songs, conts, depth + 1);
}
const CK = { Cookie: "SOCS=CAI; CONSENT=YES+1" };   // skips the cookie banner page YouTube shows some servers
async function youtube(list: string) {
  if (/^(LM|WL|LL)$/.test(list)) return { error: "That's your Liked songs / Watch later, which YouTube keeps private. Make a playlist (or copy those songs into one), set it to Public or Unlisted, and share that." };
  const songs: [string, string][] = [];
  let title = "";
  try {
    const html = await (await get(`https://www.youtube.com/playlist?list=${encodeURIComponent(list)}&hl=en`, { headers: CK })).text();
    const m = /var ytInitialData = (\{[\s\S]*?\});<\/script>/.exec(html) || /ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/.exec(html);
    if (m) {
      const data = JSON.parse(m[1]), conts: string[] = [];
      title = dec((/<meta property="og:title" content="([^"]*)"/.exec(html) || [])[1] || "");
      ytWalk(data.contents, songs, conts);
      const ver = (/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html) || [])[1] || "2.20261112.00.00";
      // "load more": 100 songs a page, up to ~1,000
      for (let i = 0; conts.length && i < 9; i++) {
        const token = conts.shift()!;
        const r = await get("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", { method: "POST", headers: { "Content-Type": "application/json", ...CK },
          body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "en", gl: "US" } }, continuation: token }) });
        if (!r.ok) break;
        const before = songs.length;
        ytWalk(await r.json(), songs, conts);
        if (songs.length === before) break;
      }
    }
  } catch (_) { /* fall through to the feed */ }
  let note: string | undefined;
  if (!songs.length) {
    // old way, still works for some playlists: the newest 15 songs
    const r = await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(list)}`);
    if (r.ok) {
      const x = await r.text();
      title = title || dec((/<title>([^<]+)<\/title>/.exec(x) || [])[1] || "");
      for (const e of x.split("<entry>").slice(1)) songs.push([dec((/<title>([^<]+)<\/title>/.exec(e) || [])[1] || ""), dec((/<author>\s*<name>([^<]+)<\/name>/.exec(e) || [])[1] || "")]);
      note = "YouTube only shared the newest 15 songs this time.";
    }
  }
  if (!songs.length) return { error: /^RD/.test(list) ? "That's a YouTube Mix, which YouTube makes on the fly and doesn't share. Save some songs to a playlist and share that instead." : "We couldn't open that playlist. Make sure it's set to Public or Unlisted (not Private), then copy the link again." };
  const names: string[] = [];
  for (const [t, a] of songs) for (const n of ytArtists(t, a)) names.push(n);
  if (!names.length) return { error: "That playlist looks empty." };
  return { artists: rank(names), title: title.replace(/\s*-\s*YouTube( Music)?$/, ""), songs: songs.length, note };
}

// split "Drake & Don Toliver", "KAROL G, Judeline" into single artists, but keep acts whose name has a comma or "&" in it
// ("Tyler, The Creator", "Earth, Wind & Fire", "Mumford & Sons", "Kool & the Gang") in one piece
const KEEP = ["Tyler, The Creator", "Earth, Wind & Fire", "Crosby, Stills, Nash & Young", "Crosby, Stills & Nash", "Emerson, Lake & Palmer",
  "Peter, Bjorn and John", "Black Country, New Road", "Blood, Sweat & Tears", "Now, Now", "Ruby, My Dear", "Hello, Dolly",
  "Mumford & Sons", "Simon & Garfunkel", "Hall & Oates", "Daryl Hall & John Oates", "Iron & Wine", "Chase & Status", "Above & Beyond",
  "Brooks & Dunn", "Big & Rich", "Angus & Julia Stone", "Matt & Kim", "Sylvan Esso", "Kool & the Gang", "Sly & the Family Stone",
  "Florence + The Machine", "Marina & the Diamonds", "Edward Sharpe & the Magnetic Zeros", "Hootie & the Blowfish",
  "Tom Petty & the Heartbreakers", "Bob Marley & The Wailers", "Huey Lewis & the News", "Prince & The Revolution",
  "Nathaniel Rateliff & The Night Sweats", "Jason Isbell & the 400 Unit", "Smokey Robinson & The Miracles", "Lewis & Clarke",
  "Dan + Shay", "Maddie & Tae", "Thompson Square", "Jack & Jack", "Bob Seger & The Silver Bullet Band", "Echo & the Bunnymen",
  "Siouxsie & the Banshees", "Belle & Sebastian", "Sam & Dave", "Ike & Tina Turner", "Peaches & Herb", "Disclosure & Friends",
  "Bob Moses & Friends", "Gorgon City & Friends"].filter((n) => /[,&+]/.test(n));
const KEEP_RE = new RegExp(KEEP.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
function split(s: string) {
  const held: string[] = [];
  // hold known names, and "X & the Y" bands, aside while splitting
  const t = s.replace(KEEP_RE, (m) => `\u0001${held.push(m) - 1}\u0001`).replace(/\b([^,&]+?)\s+&\s+(the\s[^,&]+)/gi, (m) => `\u0001${held.push(m) - 1}\u0001`);
  return t.split(/\s*(?:,|&| x | feat\.? | ft\.? | with | vs\.? )\s*/i).map((x) => x.replace(/\u0001(\d+)\u0001/g, (_, i) => held[+i]).trim()).filter(Boolean);
}

// Spotify: the public embed player page lists the playlist's tracks with their artists (no key, no login)
async function spotify(id: string, kind = "playlist") {
  const r = await get(`https://open.spotify.com/embed/${kind}/${id}`);
  const m = (await r.text()).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  const ent = m ? JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity : null, list = (ent && ent.trackList) || [];
  if (!list.length) return { error: "That Spotify playlist is private or empty. Make it public (… → Add to profile) and try again." };
  const names: string[] = [];
  for (const t of list) for (const a of split(String(t.subtitle || ""))) names.push(a);
  return { artists: rank(names), title: String(ent.name || ent.title || ""), songs: list.length, note: list.length >= 100 ? "Spotify shares the first 100 songs of a playlist." : undefined };
}

// Apple Music: a shared playlist page carries its songs' artist names (no key, no login)
async function apple(url: string) {
  const r = await get(url.split("?")[0]);
  if (!r.ok) return { error: "That Apple Music playlist isn't public. In Apple Music: … → Share Playlist → Copy, then paste that link." };
  const html = await r.text(), m = html.match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
  const names: string[] = [];
  if (m) for (const x of m[1].matchAll(/"artistName":"([^"]+)"/g)) for (const a of split(dec(x[1]))) names.push(a);
  if (!names.length) return { error: "We couldn't find any songs in that Apple Music link." };
  return { artists: rank(names), title: dec((/<meta property="og:title" content="([^"]*)"/.exec(html) || [])[1] || "").replace(/ on Apple Music$/, "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  let body: any = {};
  try { body = await req.json(); } catch (_) { /* none */ }
  // people paste "Check out my playlist https://…": use the first link in what they pasted
  let link = String(body.link || body.playlist || "").trim();
  const inText = /https?:\/\/\S+/.exec(link); if (inText) link = inText[0];
  let out: any;
  try {
    // the SoundCloud app shares short links (on.soundcloud.com/…): follow them to the real page
    if (/on\.soundcloud\.com\/|spotify\.link\//i.test(link)) { const r = await get(link.startsWith("http") ? link : "https://" + link, { redirect: "follow" }); link = r.url; }
    const sc = /soundcloud\.com\/([A-Za-z0-9_-]{2,60})/i.exec(link), yt = /[?&]list=([A-Za-z0-9_-]{2,60})/.exec(link),
      sp = /spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]{10,40})/.exec(link), am = /^https:\/\/music\.apple\.com\/[a-z]{2}\/(?:playlist|album)\//i.test(link);
    if (sc && !/^(discover|search|charts|you|stream|upload|pages|feed)$/i.test(sc[1])) out = await soundcloud(sc[1]);
    else if (yt) out = await youtube(yt[1]);
    else if (sp) out = await spotify(sp[2], sp[1]);
    else if (am) out = await apple(link);
    else if (/youtu/i.test(link)) out = { error: "That's a YouTube video or channel. Open a playlist instead → Share → Copy link (the link has list= in it)." };
    else if (/spotify\.com\/(?:[a-z-]+\/)?(user|artist)\//i.test(link)) out = { error: "Spotify keeps profiles and follows private from other apps. Share a playlist you play a lot instead." };
    else out = { error: "Paste a SoundCloud profile, or a YouTube Music, Spotify or Apple Music playlist link." };
  } catch (_) { out = { error: "Couldn't read that link right now. Try again in a minute." }; }
  return json(out, out.error ? 400 : 200);
});
