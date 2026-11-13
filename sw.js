// The Show Shack service worker: app shell cached; show list is network-first so it's always fresh when online.
const CACHE = "shack-v161";   // only ever delete "shack-" caches: the Hoedown House shares this origin
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "header.jpg", "hut.webp", "water.jpg", "chime.mp3", "app.css", "core.js", "app.js", "b.css", "b.js", "polish.css", "bg.js", "water.js", "disco.js", "wave.jpg", "nebula.js", "nebula.jpg", "sky.jpg", "car.svg", "night.js", "night.css", "afters.json", "spots.js", "spots.css", "afters-bg.svg", "food-bg.svg", "returning.json", "stations.json", "google.js", "cloud.js", "social.js", "flyer.js", "neon.js", "you.js", "music.js", "tonight.js", "track.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("shack-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// reminders (you.js turns them on; the Supabase "reminders" function sends them)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "The Show Shack", { body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => { for (const w of ws) { if ("focus" in w) { w.navigate(url); return w.focus(); } } return clients.openWindow(url); }));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // Network first for everything same-origin (fresh list + fresh app), cache as offline fallback.
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
