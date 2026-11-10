/* The Show Shack · Google extras: real road drive times (Routes API) and venue details (Places API New).
   Loaded last. Uses app.js globals (origin, render, esc). If Google can't load (no network, bad key,
   billing off), the app keeps working on its own straight-line estimates.

   The key below is meant to be public: it only works from lukegiannelli.github.io and localhost,
   and only for Maps JavaScript API, Routes API and Places API (New). Set those limits in Google Cloud. */
(function(){
const GKEY = "AIzaSyA2xKGmdvsTlSvaqBcW7nwdKnAza5QmmyE";

// Cost guards. Each new start point asks Google for at most DRIVE_MAX venues (one "element" each),
// picking the closest ones within DRIVE_WITHIN_MIN by the old estimate. Everything else keeps the estimate.
const DRIVE_MAX = 60, DRIVE_WITHIN_MIN = 120, CHUNK = 25;
// Per-visit limits so one visitor can't run up the bill: at most DRIVE_SYNCS start points get
// Google drive times, and at most PLACE_MAX venues get Google details, PLACE_GAP_MS apart.
const DRIVE_SYNCS = 3, PLACE_MAX = 25, PLACE_GAP_MS = 1500;
let driveSyncs = 0, placeCalls = 0, placeLast = 0;

let ok = !!GKEY && !GKEY.startsWith("__");
window.gm_authFailure = () => { ok = false; console.warn("[shack-google] key rejected; using estimates"); };

// Google's official loader: defines google.maps.importLibrary and loads the script on first use.
if (ok) ((g)=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({key:GKEY,v:"weekly"});
const lib = name => ok ? google.maps.importLibrary(name) : Promise.reject(new Error("google off"));

/* ---------- real drive times ---------- */
// Kept in memory only for this visit (Google's terms limit storing their results).
const ptKey = (la,lo) => la.toFixed(3)+","+lo.toFixed(3);
const oKey = () => origin && typeof origin.lat==="number" ? origin.lat.toFixed(4)+","+origin.lon.toFixed(4) : "";
let drive = {o:"", d:new Map()}, busy = "";

window.realDrive = (lat,lon) => {
  if (!drive.o || drive.o!==oKey() || typeof lat!=="number" || typeof lon!=="number") return null;
  return drive.d.get(ptKey(lat,lon)) || null;
};

async function syncDrives(){
  const ok2 = oKey();
  if (!ok || !ok2 || drive.o===ok2 || busy===ok2) return;
  if (driveSyncs >= DRIVE_SYNCS) return;      // keep estimates for the rest of this visit
  driveSyncs++;
  busy = ok2;
  // Unique venue spots, nearest first by the old estimate.
  const seen = new Map();
  for (const e of (state._up||state.events||[])) {
    if (typeof e.lat!=="number" || typeof e.lon!=="number") continue;
    const k = ptKey(e.lat,e.lon); if (seen.has(k)) continue;
    const est = driveEstimate(e.lat,e.lon); if (!est || est.mins>DRIVE_WITHIN_MIN) continue;
    seen.set(k, {k, lat:e.lat, lon:e.lon, mins:est.mins});
  }
  const pts = [...seen.values()].sort((a,b)=>a.mins-b.mins).slice(0,DRIVE_MAX);
  const got = new Map();
  try {
    const {RouteMatrix} = await lib("routes");
    for (let i=0; i<pts.length; i+=CHUNK) {
      const part = pts.slice(i,i+CHUNK);
      const {matrix} = await RouteMatrix.computeRouteMatrix({
        origins:[{lat:origin.lat,lng:origin.lon}],
        destinations: part.map(p=>({lat:p.lat,lng:p.lon})),
        travelMode:"DRIVING",
        fields:["durationMillis","distanceMeters","condition"]
      });
      const items = (matrix && matrix.rows && matrix.rows[0] && matrix.rows[0].items) || [];
      items.forEach((it,j)=>{
        if (!it || it.error || it.condition!=="ROUTE_EXISTS" || it.durationMillis==null) return;
        got.set(part[j].k, {mins:Math.max(1,Math.round(it.durationMillis/60000)), miles:Math.round((it.distanceMeters||0)/1609.34), real:true});
      });
    }
  } catch (err) { console.warn("[shack-google] drive times unavailable:", err && err.message || err); }
  if (busy!==ok2) return;          // start point changed mid-way; a newer sync will run
  busy = "";
  drive = {o:ok2, d:got};          // even if empty, so we don't retry in a loop
  if (got.size && typeof render==="function") render();
}

// Re-check after every render (cheap when nothing changed).
const _render = render;
render = function(){ _render(); setTimeout(syncDrives, 0); };
setTimeout(syncDrives, 0);

/* ---------- venue details ---------- */
// Any element with class "gplace" and data-gq="Venue, City" gets filled when it scrolls into view.
const placeMem = new Map();
const FIELDS = ["displayName","rating","userRatingCount","regularOpeningHours","websiteURI","googleMapsURI","businessStatus"];

async function lookPlace(q){
  if (placeMem.has(q)) return placeMem.get(q);
  if (placeCalls >= PLACE_MAX) return null;   // visit limit reached: skip Google details quietly
  placeCalls++;
  const p = (async()=>{
    const wait = placeLast + PLACE_GAP_MS - Date.now();
    placeLast = Math.max(Date.now(), placeLast + PLACE_GAP_MS);
    if (wait > 0) await new Promise(r=>setTimeout(r, wait));
    const {Place} = await lib("places");
    const {places} = await Place.searchByText({textQuery:q+", CA", fields:FIELDS, maxResultCount:1});
    const pl = places && places[0]; if (!pl) return null;
    return {name:pl.displayName, rating:pl.rating, n:pl.userRatingCount, hours:pl.regularOpeningHours?.weekdayDescriptions||null,
      web:pl.websiteURI, maps:pl.googleMapsURI, status:pl.businessStatus};
  })().catch(err=>{ console.warn("[shack-google] venue lookup failed:", err && err.message || err); placeMem.delete(q); return null; });
  placeMem.set(q, p);
  return p;
}

function placeHTML(d){
  const bits = [];
  if (d.status==="CLOSED_PERMANENTLY") bits.push(`<span class="gp-warn">Google lists this place as permanently closed</span>`);
  else if (d.status==="CLOSED_TEMPORARILY") bits.push(`<span class="gp-warn">Google lists this place as temporarily closed</span>`);
  if (typeof d.rating==="number") bits.push(`<span class="gp-star">★ ${d.rating.toFixed(1)}</span>${d.n?` <span class="gp-mut">(${Number(d.n).toLocaleString()})</span>`:""}`);
  if (d.hours && d.hours.length===7) {
    const t = d.hours[(new Date().getDay()+6)%7] || "";     // Google lists Monday first
    const v = t.split(/:\s(.+)/)[1];
    if (v) bits.push(`<span>Today ${esc(v)}</span>`);
  }
  const links = [d.web?`<a href="${esc(d.web)}" target="_blank" rel="noopener">Website ↗</a>`:"", d.maps?`<a href="${esc(d.maps)}" target="_blank" rel="noopener">Google Maps ↗</a>`:""].filter(Boolean).join("");
  if (!bits.length && !links) return "";
  return `<div class="gp-row">${bits.join('<span class="gp-dot">·</span>')}</div>${links?`<div class="gp-links">${links}</div>`:""}<small class="gp-src">Venue info from Google Maps</small>`;
}

const io = "IntersectionObserver" in window ? new IntersectionObserver(ents=>{
  for (const en of ents) {
    if (!en.isIntersecting) continue;
    const el = en.target; io.unobserve(el);
    const q = el.dataset.gq; if (!q) continue;
    lookPlace(q).then(d=>{ if (d && el.isConnected) { const h = placeHTML(d); if (h) { el.innerHTML = h; el.hidden = false; } } });
  }
}) : null;

function scan(root){
  if (!ok || !io) return;
  root.querySelectorAll(".gplace:not([data-gw])").forEach(el=>{ el.dataset.gw="1"; io.observe(el); });
}
let q2 = 0;
new MutationObserver(()=>{ if (q2) return; q2 = 1; queueMicrotask(()=>{ q2 = 0; scan(document.body); }); })
  .observe(document.body, {childList:true, subtree:true});
scan(document.body);
})();
