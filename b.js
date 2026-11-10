/* The Show Shack — "Pick a vibe" layout (option B).
   Reuses app.js for data, filters, cards, map, venues, song, disco ball. This file only adds the
   home screen, the results bar, the bottom tabs, and moves a few existing controls into place. */
(function(){
if(!window.UI_B)return;
const $=id=>document.getElementById(id);
const VIBES=[
  {k:"music",name:"Music & nightlife",c:"#FF6FE0",icon:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'},
  {k:"stage",name:"Comedy & stage",c:"#FFC66B",icon:'<path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'},
  {k:"move",name:"Move & groove",c:"#4FC7B6",icon:'<circle cx="13" cy="4.5" r="2"/><path d="m8 21 3-6 3 2v4M6 12l3-4h5l3 4M11 15l1-7"/>'},
  {k:"chill",name:"Chill & community",c:"#8FB4FF",icon:'<path d="M12 21c4-3.5 7-6.6 7-10a7 7 0 0 0-14 0c0 3.4 3 6.5 7 10Z"/><path d="M9.5 11a2.5 2.5 0 0 0 5 0"/>'}];
const SUBS={
  stage:[["","All"],["comedy","Comedy"],["theater","Theater & arts"],["openmic","Open mics"]],
  move:[["","All"],["social","Dance socials"],["dance","Ecstatic dance"],["contact","Contact improv"]],
  chill:[["","All"],["art","Art walks & markets"],["sound","Sound baths"],["drum","Drum circles"],["volunteer","Volunteer"]]};
const WHEN=[["tonight","Tonight"],["weekend","This weekend"],["any","Anytime"]];
const WHEN_WORD={tonight:"tonight",weekend:"this weekend",any:"coming up"};
let screen="home", cur=null, pushed=false;

/* ---- move existing controls into the new layout (their handlers come along) ---- */
const bar=$("bBar"), tools=$("bTools"), controls=document.querySelector(".controls");
bar.insertBefore(controls.querySelector(".search"),$("bWhenRes"));
tools.insertBefore($("maxDrive").closest("label"),$("bFilt"));
tools.insertBefore($("sortBy").closest("label"),$("bFilt"));
const flags=$("flagRow"); flags.hidden=true; bar.appendChild(flags);
$("bHome").appendChild($("disco"));
document.querySelector(".wrap").insertBefore($("budgetBar"),$("alertBar"));
const bStart=document.createElement("button");bStart.type="button";bStart.className="chip bstart";bStart.textContent="Set your start point for drive times";tools.appendChild(bStart);
bStart.onclick=()=>{state.view="list";show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);};
$("bFilt").onclick=()=>{flags.hidden=!flags.hidden;$("bFilt").setAttribute("aria-expanded",String(!flags.hidden));};

/* ---- when switch (home + results share it) ---- */
function segHtml(){return WHEN.map(([v,l])=>`<button type="button" data-when="${v}" aria-pressed="${state.when===v}">${l}</button>`).join("");}
["bWhenHome","bWhenRes","bMapWhen"].forEach(id=>{const el=$(id);el.innerHTML=segHtml();
  el.addEventListener("click",ev=>{const b=ev.target.closest("[data-when]");if(!b)return;state.when=b.dataset.when;savePrefs();render();});});
if(!["tonight","weekend","any"].includes(state.when))state.when="any";

/* ---- vibe tiles ---- */
$("bTiles").innerHTML=VIBES.map(v=>`<button type="button" class="btile t-${v.k}" data-vibe="${v.k}" style="--vc:${v.c}">
  <svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span><b>${v.name}</b><small data-count="${v.k}">&nbsp;</small></span></button>`).join("");
$("bTiles").addEventListener("click",ev=>{const b=ev.target.closest("[data-vibe]");if(b)openResults(b.dataset.vibe);});
$("bSearchAll").onclick=()=>{openResults("all");setTimeout(()=>{const q=$("q");if(q){q.focus();}},60);};
$("bAllWeekend").onclick=()=>{state.when="weekend";savePrefs();openResults("all");};
/* ---- weekend picks: one from each vibe when the weekend has one, then the best of the rest ---- */
function bWeekendPicks(up){const r=dayRange("weekend");if(!r)return null;
  const pool=up.filter(e=>!e.added&&e.start<=r[1]&&(e.end||e.start)>=r[0]&&!priceInfo(e).sold);if(pool.length<3)return null;
  const score=e=>{const pi=priceInfo(e);let sc=0;if(state.stars.has(skey(e)))sc+=100;if(pi.free)sc+=20;else if(!pi.none&&pi.lo!=null&&pi.lo<=25)sc+=10;
    if(e._drive)sc+=e._drive.mins<=30?15:e._drive.mins<=60?8:0;if(isSmall(e))sc+=5;if(!isRec(e))sc+=3;if(logoOf(e))sc+=2;return sc;};
  const ranked=pool.map(e=>({e,s:score(e)})).sort((a,b)=>b.s-a.s||a.e.start.localeCompare(b.e.start)).map(x=>x.e);
  const used=new Set(),picks=[];
  for(const v of VIBES){const e=ranked.find(x=>!used.has(skey(x))&&GROUPS[v.k].has(x.kind));if(e){used.add(skey(e));picks.push({e,v});}}
  for(const e of ranked){if(picks.length>=5)break;if(!used.has(skey(e))){used.add(skey(e));picks.push({e});}}
  return {picks};}

/* ---- flip cards: real event cards in a row; tap flips to the details right there ---- */
const LISTEN=q=>[["YouTube Music","https://music.youtube.com/search?q="],["Spotify","https://open.spotify.com/search/"],["Apple Music","https://music.apple.com/us/search?term="],["SoundCloud","https://soundcloud.com/search/people?q="]].map(([n,u])=>`<a href="${u+encodeURIComponent(q)}" target="_blank" rel="noopener">${n}</a>`).join("");
function backSide(e){const pi=priceInfo(e),d=parseDay(e.start);
  const tix=safeUrl(e.url),dest=encodeURIComponent((e.venue||"")+", "+(e.city||""));
  const maps=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}&travelmode=driving`;
  const pr=pi.sold?"Sold out":pi.free?"Free":pi.none?"Price not listed yet":pi.est?`≈$${Math.round(pi.lo)}–${Math.round(pi.hi)} typical`:`From $${Math.round(pi.lo)}${!pi.est&&e.priceAsOf?" · checked "+fmtShort(e.priceAsOf):""}`;
  const lq=(e.kind!=="openmic"&&e.kind!=="contact")?String(e.title||"").replace(/\s*\(.*?\)\s*/g," ").split(/:| & Friends/)[0].trim():"";
  const when=(isRec(e)&&e.recurrence?e.recurrence.text+" · next ":"")+d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(e.time?" · "+e.time:"");
  const note=e.note||e.priceNote||"";
  return `<div class="bfb-top"><b>${esc(e.title)}</b><span>${esc(when)}</span><span>${esc(e.venue)} · ${esc(e.city)}${e._drive?` · ${e._drive.real?"":"~"}${fmtMins(e._drive.mins)} drive`:""}</span></div>
    <div class="bfb-price">${esc(pr)}</div>
    ${note?`<p class="bfb-note">${esc(note)}</p>`:""}
    <div class="bfb-acts">${tix?`<a class="bfb-main" href="${esc(tix)}" target="_blank" rel="noopener">${tixWord(e,pi)} ↗</a>`:""}<a href="${maps}" target="_blank" rel="noopener">Directions</a>
      ${lq?`<button type="button" class="bfb-listen" aria-expanded="false"><span class="lt">▶&#xFE0E; Listen</span></button>`:""}<button type="button" data-share="${esc(skey(e))}">Share</button></div>
    ${lq?`<div class="bfb-lm" hidden>${LISTEN(lq)}</div>`:""}
    <div class="bfb-foot"><button type="button" class="bfb-full" data-full="${esc(hid(e))}">Full card</button><span class="bfb-hint">Tap to flip back ↻</span></div>`;}
function flipCardHtml(e,tag){const front=cardHtml(e).replace(/^\s*<article id="[^"]*"/,'<article').replace(/class="card( flipped)?"/,'class="card"');
  const free=priceInfo(e).free;
  return `<div class="bfc" data-k="${esc(skey(e))}"><div class="bfc-in"><div class="bfc-f">${tag?`<span class="bfc-tag">${tag}</span>`:""}${free?`<span class="bfc-free">FREE</span>`:""}${front}</div><div class="bfc-b" aria-hidden="true">${backSide(e)}</div></div></div>`;}
function flipRowClick(ev){const fc=ev.target.closest(".bfc");if(!fc)return;
  const st=ev.target.closest("button[data-star]");if(st){starBtn(st);return;}
  const sh=ev.target.closest("button[data-share]");if(sh){shareBtn(sh);return;}
  const ls=ev.target.closest(".bfb-listen");if(ls){const m=fc.querySelector(".bfb-lm");m.hidden=!m.hidden;ls.setAttribute("aria-expanded",String(!m.hidden));ls.classList.toggle("on",!m.hidden);return;}
  const full=ev.target.closest("[data-full]");if(full){state.when="any";openResults("all");openCard(full.dataset.full);return;}
  if(ev.target.closest("a,input,select,label"))return;
  if(ev.target.closest(".vlink")){ev.stopPropagation();}
  setFlip(fc,!fc.classList.contains("on"));}
function setFlip(fc,on){const inn=fc.querySelector(".bfc-in");
  if(fc._busy)return;if(!inn.animate||matchMedia("(prefers-reduced-motion: reduce)").matches){swapFlip(fc,on);return;}
  fc._busy=true;const half={duration:150,easing:"cubic-bezier(.5,0,.75,.4)",fill:"forwards"};
  inn.animate([{transform:"scaleX(1)"},{transform:"scaleX(0.02)"}],half).onfinish=()=>{swapFlip(fc,on);
    const a=inn.animate([{transform:"scaleX(0.02)"},{transform:"scaleX(1)"}],{duration:170,easing:"cubic-bezier(.25,.6,.4,1)",fill:"forwards"});
    a.onfinish=()=>{a.cancel();inn.getAnimations().forEach(x=>x.cancel());fc._busy=false;};};}
function swapFlip(fc,on){fc.classList.toggle("on",on);fc.querySelector(".bfc-b").setAttribute("aria-hidden",String(!on));fc.querySelector(".bfc-f").setAttribute("aria-hidden",String(on));}
$("bPicks").addEventListener("click",flipRowClick,true);

/* ---- screens ---- */
function inWhen(e){const r=dayRange(state.when);return !r||(e.start<=r[1]&&(e.end||e.start)>=r[0]);}
function openResults(key,noPush){
  openIds.clear(); cur=key; state.view="list"; state.venue="all"; state.sub=null; state.surprise=null;
  if(GROUPS[key]){state.kind="g:"+key;} else state.kind="all";
  if(key!=="music")state.genre="all";
  flags.hidden=true;$("bFilt").setAttribute("aria-expanded","false");
  show("results",noPush);
}
function show(s,noPush){
  screen=s; const root=document.documentElement;
  ["home","results","map","venues","saved","budget"].forEach(x=>root.classList.toggle("b-"+x,x===s));
  document.body.classList.toggle("nebtiles",s==="home");
  const tab=s==="home"||s==="results"?"shows":s;
  document.querySelectorAll("#bTabs [data-tab]").forEach(b=>{if(b.dataset.tab===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  bar.hidden=!(s==="results"||s==="saved");
  if(s!=="home"&&!noPush&&!pushed){try{history.pushState({b:1},"");pushed=true;}catch(e){}}
  if(s==="home"&&pushed&&!noPush){pushed=false;try{history.back();}catch(e){}}
  render(); window.scrollTo(0,0);
}
window.addEventListener("popstate",()=>{if(pushed){pushed=false;if(screen!=="home"){state.kind="all";state.sub=null;show("home",true);}}});
$("bBack").onclick=()=>goHome();
function goHome(){state.venue="all";state.kind="all";state.sub=null;state.genre="all";state.view="list";show("home");}
$("bTabs").addEventListener("click",ev=>{const b=ev.target.closest("[data-tab]");if(!b)return;const t=b.dataset.tab;
  if(t==="shows"){goHome();return;}
  state.sub=null;state.surprise=null;state.venue="all";
  if(t==="map"){state.kind="all";state.view="map";}
  else if(t==="venues"){state.view="venues";}
  else if(t==="saved"){state.kind="starred";state.when="any";state.view="list";cur="saved";}
  else if(t==="budget"){state.view="list";}
  show(t);});

/* ---- tap a card to open its details (buttons and links inside still work as before) ---- */
const openIds=new Set();
function setOpen(card,on){card.classList.toggle("open",on);const m=card.querySelector("[data-bmore]");if(m){m.setAttribute("aria-expanded",String(on));m.textContent=on?"Less":"Details";}}
function toggleCard(card,on){if(!card)return;on=on??!card.classList.contains("open");setOpen(card,on);if(on)openIds.add(card.id);else openIds.delete(card.id);}
// cards are rebuilt on every render and added in batches while scrolling: keep opened ones open
new MutationObserver(()=>{if(!openIds.size)return;for(const id of openIds){const c=document.getElementById(id);if(c&&!c.classList.contains("open"))setOpen(c,true);}}).observe($("list"),{childList:true,subtree:false});
$("list").addEventListener("click",ev=>{
  const more=ev.target.closest("[data-bmore]");
  if(!more&&ev.target.closest("a,button,input,select,label,textarea,.listenmenu,.back"))return;
  const card=ev.target.closest("article.card");if(!card||card.classList.contains("flipped"))return;
  if(!more&&window.getSelection&&String(window.getSelection()).length)return;
  toggleCard(card);});
let pendingOpen=null;
function openCard(id){pendingOpen=id;setTimeout(tryOpen,60);}
let tries=0;
function tryOpen(){if(!pendingOpen)return;if(!state.loaded){if(tries++<80)setTimeout(tryOpen,150);return;}const id=pendingOpen;
  let el=document.getElementById(id);while(!el&&state._more&&state._more())el=document.getElementById(id);
  if(!el){if(tries++<80)setTimeout(tryOpen,150);else pendingOpen=null;return;}
  pendingOpen=null;tries=0;toggleCard(el,true);jumpToHash(id);}

/* ---- disco ball: a surprise opens the results with that show on top, already open ---- */
let spins=[];
surpriseMe=function(){state.kind="all";state.sub=null;state.genre="all";const w=state.when;state.when="any";state.venue="all";state.surprise=null;
  _render();state.when=w;
  const pool=(state._up||[]).filter(e=>!priceInfo(e).sold&&!spins.some(s=>skey(s)===skey(e)));if(!pool.length)return;
  const pick=pool[Math.floor(Math.random()*pool.length)];spins=[pick,...spins].slice(0,5);
  drawSpins(true);render();};
function drawSpins(fresh){const box=$("bSpins");box.hidden=!spins.length;if(!spins.length)return;
  $("bSpinRow").innerHTML=spins.map((e,i)=>flipCardHtml(e,i===0?"🪩 New spin":"")).join("");
  if(fresh){const f=$("bSpinRow").firstElementChild;f.classList.add("emerge");$("bSpinRow").scrollLeft=0;
    setTimeout(()=>box.scrollIntoView({block:"center",behavior:"smooth"}),60);}}
$("bSpinRow").addEventListener("click",flipRowClick,true);
$("bSpinClear").onclick=()=>{spins=[];drawSpins();};

/* ---- search also finds pool spots ---- */
const poolHits=document.createElement("section");poolHits.id="bPoolHits";poolHits.className="bpoolhits";poolHits.hidden=true;$("list").before(poolHits);
const POOLWORD=/\b(pool|billiards?|snooker|8 ?ball|eight ball|cue)\b/;
function drawPoolHits(){const q=state.q||"";if(screen!=="results"||!q||!POOL.length){poolHits.hidden=true;return;}
  const all=POOLWORD.test(q),ws=q.split(/\s+/).filter(w=>!POOLWORD.test(w));
  const hit=POOL.filter(p=>{const t=norm([p.n,p.city,(p.t||[]).join(" "),p.c==="hall"?"pool hall":"bar"].join(" "));return ws.length?ws.every(w=>t.includes(w)):all;})
    .map(p=>({p,d:driveEstimate(p.lat,p.lon)})).sort((a,b)=>(a.d?.mins??1e9)-(b.d?.mins??1e9)||a.p.n.localeCompare(b.p.n));
  if(!hit.length){poolHits.hidden=true;return;}
  poolHits.hidden=false;
  poolHits.innerHTML=`<h2 class="month">${NEON8} Pool spots · ${hit.length}</h2>`+hit.slice(0,8).map(({p,d})=>{const q2=encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA");
    return `<div class="bph"><div><b>${esc(p.n)}</b><span>${esc(p.city)} · ${p.c==="hall"?"pool hall":"bar with pool"}${d?` · ~${fmtMins(d.mins)}`:""}</span>${(p.t||[]).length?`<small>${p.t.map(esc).join(" · ")}</small>`:""}</div>
      <span class="bph-a"><a href="https://www.google.com/maps/dir/?api=1&destination=${q2}" target="_blank" rel="noopener">Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${q2}" target="_blank" rel="noopener">Hours</a></span></div>`;}).join("")
    +(hit.length>8?`<p class="bph-more">+${hit.length-8} more. Turn on Pool in the Map tab to see them all.</p>`:"");}

/* ---- after every render: counts, titles, sub-filters ---- */
const _render=render;
render=function(){_render();try{after();}catch(e){console.error(e);}};
function after(){
  try{drawPoolHits();}catch(e){}
  if((state._up||[]).length)try{syncFollowDot();}catch(e){}
  if(screen==="map"){closeSheet();drawMapUI();}
  if(pendingOpen)setTimeout(tryOpen,30);
  document.querySelectorAll("[data-when]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.when===state.when)));
  const up=state._up||[];
  if(screen==="home"){
    for(const v of VIBES){const n=up.filter(e=>GROUPS[v.k].has(e.kind)&&inWhen(e)).length;
      const el=document.querySelector(`[data-count="${v.k}"]`);if(el)el.textContent=n+" "+WHEN_WORD[state.when];}
    const wp=bWeekendPicks(up);
    const sig=wp?wp.picks.slice(0,5).map(p=>skey(p.e)).join("|")+(origin?"o":""):"";
    if(sig!==$("bPicks").dataset.sig){$("bPicks").dataset.sig=sig;
      $("bPicks").innerHTML=wp?wp.picks.slice(0,5).map(p=>flipCardHtml(p.e,p.v?`<i style="--vc:${p.v.c}"></i>${p.v.name.split(" & ")[0]}`:"")).join(""):'<p class="bnone">Weekend picks show up here once the weekend list fills in.</p>';}
    trust();
  }
  if(screen==="results"||screen==="saved"){
    const v=VIBES.find(x=>x.k===cur);
    $("bTitle").textContent=screen==="saved"?"Saved":state.venue&&state.venue!=="all"?state.venue.split(" · ")[0]:v?v.name:cur==="surprise"?"Surprise pick":state.q?"Search":"All shows";
    const n=(state._shown||[]).length;$("bCount").textContent=n+(n===1?" event":" events")+(screen==="saved"?"":" · "+WHEN_WORD[state.when]);
    const subs=$("bSubs");let items=null,key="sub";
    if(cur==="music"){if(state.genre==="electronic"){state.genre="all";state.sub="dj";}items=[["","All"],["k:festival","Festival"],["k:dj","DJ / rave"],...GENRES.filter(([g])=>g!=="all"&&g!=="electronic")];key="music";} else if(SUBS[cur])items=SUBS[cur];
    if(screen==="saved")items=null;
    subs.hidden=!items;
    if(items){const val=key==="music"?(state.sub?"k:"+state.sub:state.genre==="all"?"":state.genre):(state.sub||"");
      subs.innerHTML=items.map(([x,l])=>`<button type="button" class="chip" data-sub="${x}" data-key="${key}" aria-pressed="${x===val}">${esc(l)}</button>`).join("");}
    bStart.hidden=!!origin;
    $("bWhenRes").hidden=screen==="saved";
    tools.hidden=screen==="saved";
  }
}
$("bSubs").addEventListener("click",ev=>{const b=ev.target.closest("[data-sub]");if(!b)return;
  const v=b.dataset.sub;
  if(b.dataset.key==="music"){if(v.startsWith("k:")){state.sub=v.slice(2);state.genre="all";}else{state.sub=null;state.genre=v||"all";}savePrefs();}
  else state.sub=v||null;render();});

/* ---- "?" on the shack card: where the info comes from ---- */
function trust(){const m=window.SHACK_META||{},el=$("bInfo");if(!el||!state.events.length)return;
  const ago=t=>{if(!t)return "";const h=(Date.now()-new Date(t))/36e5;return h<1?"<1h ago":h<24?Math.round(h)+"h ago":Math.round(h/24)+"d ago";};
  const tm=/([\d,]+) listings checked/.exec(m.tmNote||"");
  const set=(k,v)=>el.querySelectorAll(`[data-t=${k}]`).forEach(x=>x.textContent=v);
  set("n",state.events.length.toLocaleString());set("upd",m.lastRun?ago(m.lastRun):"daily");
  set("tmn",tm?tm[1]:"daily");set("tm",tm?`Ticketmaster prices got re-checked ${ago(m.tmRun)}.`:"Ticketmaster prices get re-checked daily.");
  set("rec",state.events.filter(isRec).length+" weekly and monthly series");}
$("bInfoBtn").onclick=()=>{trust();const d=$("bInfo");if(d.showModal)d.showModal();else d.setAttribute("open","");};
$("bInfo").addEventListener("click",ev=>{const d=$("bInfo");if(ev.target===d||ev.target.closest("[data-close]")){d.close?d.close():d.removeAttribute("open");}});

/* ---- map: dark street map + drive rings from your start point + "build your night" per venue ---- */
const MAPV={vibe:"all"};let LM=null,LMG=null,lfLoad=null,fitSig="";
function loadLeaflet(){if(window.L)return Promise.resolve();if(lfLoad)return lfLoad;
  const l=document.createElement("link");l.rel="stylesheet";l.href="vendor/leaflet.css?v=1";document.head.appendChild(l);
  return lfLoad=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="vendor/leaflet.js?v=1";sc.onload=res;sc.onerror=()=>{lfLoad=null;rej();};document.head.appendChild(sc);});}
const RINGS=[[15,"#7ee0b8"],[30,"#FFC66B"],[60,"#FF6FA5"]];
const ringM=m=>(m-6)*55/60/1.2*1609.34;            // inverse of driveEstimate()
const vibeOf=e=>VIBES.find(v=>GROUPS[v.k].has(e.kind));
function miles(a,b,c,d){const R=3958.8,t=x=>x*Math.PI/180,x=Math.sin(t(c-a)/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(t(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function mapGroups(){const g={};(state._up||[]).forEach(e=>{if(typeof e.lat!=="number"||!inWhen(e))return;if(MAPV.vibe!=="all"&&!GROUPS[MAPV.vibe].has(e.kind))return;
  const k=venueKey(e);(g[k]=g[k]||{k,lat:e.lat,lon:e.lon,evs:[]}).evs.push(e);});
  return Object.values(g).map(x=>{x.evs.sort((a,b)=>a.start.localeCompare(b.start));const cnt={};x.evs.forEach(e=>{const v=vibeOf(e);if(v)cnt[v.k]=(cnt[v.k]||0)+1;});
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];x.v=VIBES.find(v=>top&&v.k===top[0])||VIBES[0];x.d=driveEstimate(x.lat,x.lon);return x;});}
function drawMapUI(){
  $("bMapChips").innerHTML=`<button type="button" class="chip" data-mv="all" aria-pressed="${MAPV.vibe==="all"}">All</button>`+VIBES.map(v=>`<button type="button" class="chip bmc" data-mv="${v.k}" style="--vc:${v.c}" aria-pressed="${MAPV.vibe===v.k}"><i></i>${v.name.split(" & ")[0]}</button>`).join("")
    +`<button type="button" class="chip poolchip" data-mpool="1" aria-pressed="${!!state.poolOn}">${NEON8} Pool</button>`+(window.NIGHT?NIGHT.chip():"");
  $("bMapStart").hidden=!!origin;
  loadLeaflet().then(drawMap).catch(()=>{$("bMapCanvas").innerHTML='<p class="bmap-err">The map couldn\'t load. Check your connection and tap Map again.</p>';});}
function drawMap(){const L=window.L;
  if(!LM){LM=L.map("bMapCanvas",{zoomControl:false,attributionControl:true,tap:true}).setView([33.82,-117.9],9);
    L.control.zoom({position:"topright"}).addTo(LM);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,className:"bmap-tiles",
      attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(LM);
    LM.attributionControl.setPrefix(false);
    LMG={rings:L.layerGroup().addTo(LM),pool:L.layerGroup().addTo(LM),pins:L.layerGroup().addTo(LM)};
    LM.on("click",closeSheet);}
  setTimeout(()=>LM.invalidateSize(),0);
  const groups=mapGroups(),hasO=origin&&typeof origin.lat==="number";
  LMG.rings.clearLayers();LMG.pins.clearLayers();LMG.pool.clearLayers();
  if(hasO){RINGS.forEach(([m,c])=>{const r=ringM(m);
      L.circle([origin.lat,origin.lon],{radius:r,color:c,weight:1.5,dashArray:"5 7",fillColor:c,fillOpacity:.035,interactive:false,className:"bring"}).addTo(LMG.rings);
      L.marker([origin.lat+r/111320,origin.lon],{interactive:false,keyboard:false,icon:L.divIcon({className:"bring-l",html:`<span style="--rc:${c}">${m} min</span>`,iconSize:[60,18],iconAnchor:[30,9]})}).addTo(LMG.rings);});
    L.marker([origin.lat,origin.lon],{interactive:false,keyboard:false,zIndexOffset:900,icon:L.divIcon({className:"bmaphome",html:'<span></span>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(LMG.rings);}
  groups.sort((a,b)=>a.evs.length-b.evs.length).forEach(g=>{const n=g.evs.length,sz=Math.round(16+Math.min(14,Math.sqrt(n)*4));
    const far=hasO&&g.d&&g.d.mins>60;
    const mk=L.marker([g.lat,g.lon],{title:`${g.k.split(" · ")[0]}: ${n} show${n>1?"s":""}`,riseOnHover:true,icon:L.divIcon({className:"bpin-w"+(far?" far":""),html:`<span class="bpin" style="--pc:${g.v.c};--ps:${sz}px">${n>1?n:""}</span>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]})});
    mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);openSheet(g);});mk.addTo(LMG.pins);});
  if(state.poolOn&&POOL.length)POOL.forEach(p=>{const mk=L.marker([p.lat,p.lon],{title:p.n,icon:L.divIcon({className:"bpool-w",html:NEON8,iconSize:[22,22],iconAnchor:[11,11]})});
    mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);openPool(p);});mk.addTo(LMG.pool);});
  if(window.NIGHT)NIGHT.map(L,LM,sheetOpen);
  if(focusK){const g=groups.find(x=>x.k===focusK);focusK=null;if(g){fitSig=state.when+MAPV.vibe+(hasO?origin.lat:"");LM.setView([g.lat,g.lon],14);setTimeout(()=>openSheet(g),60);}}
  const sig=state.when+MAPV.vibe+(hasO?origin.lat:"");
  if(sig!==fitSig){fitSig=sig;
    if(hasO)LM.setView([origin.lat,origin.lon],10);
    else if(groups.length)LM.fitBounds(L.latLngBounds(groups.map(g=>[g.lat,g.lon])).pad(.08),{maxZoom:12});}
  // reach summary under the map
  const tot=groups.reduce((s,g)=>s+g.evs.length,0);
  if(carGo){}else if(hasO){const cnt=m=>groups.filter(g=>g.d&&g.d.mins<=m).reduce((s,g)=>s+g.evs.length,0);
    $("bMapReach").innerHTML=`<b>${tot} ${tot===1?"show":"shows"} ${WHEN_WORD[state.when]}<button type="button" class="breach-btn${carOn?" on":""}" aria-label="The Fiscar (tap it)"><img class="breach-car" src="car.svg?v=2" alt=""></button></b>`+RINGS.map(([m,c])=>`<span style="--rc:${c}"><i></i>${cnt(m)} within ${m} min</span>`).join("")+(()=>{const r=dayRange("tonight");if(!r)return "";const n=(state._up||[]).filter(e=>typeof e.lat==="number"&&e.start<=r[1]&&(e.end||e.start)>=r[0]).filter(e=>{const d=driveEstimate(e.lat,e.lon);return d&&d.mins<=15;}).length;return `<span class="btonite">🌙 ${n} tonight within 15 min</span>`;})()+`<small>The dot is your start point. Rings are rough drive estimates. Times without a "~" are real road times from Google. Tap a dot to plan the night around it.</small>`;}
  else if(!carGo)$("bMapReach").innerHTML=`<b>${tot} ${tot===1?"show":"shows"} ${WHEN_WORD[state.when]}<button type="button" class="breach-btn${carOn?" on":""}" aria-label="The Fiscar (tap it)"><img class="breach-car" src="car.svg?v=2" alt=""></button></b><small>Tap a dot to see what's playing there and what's nearby. Set a start point to see what's in reach.</small>`;}
function sheetOpen(html){const sh=$("bMapSheet");sh.innerHTML=`<button type="button" class="bms-x" aria-label="Close">✕</button>`+html;sh.hidden=false;sh.scrollTop=0;sh.querySelector(".bms-x").onclick=closeSheet;}
function closeSheet(){$("bMapSheet").hidden=true;}
function openSheet(g){const e0=g.evs[0],name=g.k.split(" · ")[0],city=g.k.split(" · ")[1]||e0.city||"";
  const dest=encodeURIComponent(name+", "+city);
  const dir=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}`;
  const rows=g.evs.slice(0,6).map(e=>{const pi=priceInfo(e),d=parseDay(e.start),tix=safeUrl(e.url);
    const pr=pi.sold?"Sold out":pi.free?"Free":pi.none?"":pi.est?"≈$"+Math.round(pi.lo):"From $"+Math.round(pi.lo);
    return `<div class="bms-row"><span class="bms-d">${esc(d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}))}${e.time?" · "+esc(String(e.time).replace(/\s*\(.*\)/,"")):""}</span>
      <b>${esc(e.title)}</b><span class="bms-p">${esc(pr)}</span>
      <span class="bms-a">${tix?`<a href="${esc(tix)}" target="_blank" rel="noopener">${tixWord(e,pi)} ↗</a>`:""}<button type="button" data-card="${esc(hid(e))}">Full card</button></span></div>`;}).join("");
  const more=g.evs.length>6?`<p class="bms-more">+${g.evs.length-6} more here</p>`:"";
  const pools=POOL.map(p=>({p,mi:miles(g.lat,g.lon,p.lat,p.lon)})).filter(x=>x.mi<=8).sort((a,b)=>a.mi-b.mi).slice(0,2);
  const near=(q,label,ic)=>`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+name+", "+city)}" target="_blank" rel="noopener">${ic} ${label}</a>`;
  const fol=isPinned(g.k);
  sheetOpen(`<div class="bms-h" style="--pc:${g.v.c}"><i></i><div><b>${esc(name)}</b><span>${esc(city)}${g.d?` · ${g.d.real?"":"~"}${fmtMins(g.d.mins)} · ${g.d.miles} mi${g.d.real?" by road":""}`:""}</span></div><button type="button" class="bms-fol${fol?" on":""}" data-mfol="${esc(g.k)}" aria-pressed="${fol}">${ni("bell")} ${fol?"Following":"Follow"}</button></div>
    <div class="gplace" data-gq="${esc(name+", "+city)}"></div>
    <div class="bms-list">${rows}${more}</div>
    <h3 class="bms-sub">Build your night here</h3>
    <div class="bms-night">${near("restaurants","Eat before","🍜")}${near("bars","Drinks after","🍸")}${near("parking","Parking","🅿️")}<a href="${dir}" target="_blank" rel="noopener">🧭 Directions</a></div>
    ${pools.length?`<div class="bms-pool">${pools.map(({p,mi})=>`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">${NEON8}<span><b>${esc(p.n)}</b><small>${mi<1?"under a mile":mi.toFixed(1)+" mi"} away · ${p.c==="hall"?"pool hall":"bar with pool"}</small></span></a>`).join("")}</div>`:""}`);
  const fb=$("bMapSheet").querySelector("[data-mfol]");if(fb)fb.onclick=()=>{const k=fb.dataset.mfol,on=!isPinned(k);if(on)markSeen(k);togglePin(k);fb.classList.toggle("on",on);fb.setAttribute("aria-pressed",String(on));fb.innerHTML=ni("bell")+(on?" Following":" Follow");syncFollowDot();};
  $("bMapSheet").querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{state.when="any";state.view="list";openResults("all");openCard(b.dataset.card);});
  if(window.NIGHT)NIGHT.sheet(g);}
function openPool(p){const d=driveEstimate(p.lat,p.lon);
  sheetOpen(`<div class="bms-h" style="--pc:#ff6fe0"><i></i><div><b>${esc(p.n)}</b><span>${esc(p.city)} · ${p.c==="hall"?"pool hall":"bar with pool"}${d?` · ~${fmtMins(d.mins)}`:""}</span></div></div>
    ${(p.t||[]).length?`<p class="bms-more">${p.t.map(esc).join(" · ")}</p>`:""}
    <div class="bms-night"><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">🧭 Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">🕘 Hours</a></div>`);}
$("bMapChips").addEventListener("click",ev=>{const b=ev.target.closest("[data-mv]");if(b){MAPV.vibe=b.dataset.mv;closeSheet();drawMapUI();return;}
  if(ev.target.closest("[data-mpool]")){state.poolOn=!state.poolOn;savePrefs();drawMapUI();}});
$("bMapStart").onclick=()=>{state.view="list";show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);};


/* ---- venues: what's playing first, a one-line personality, follow + new-show dots, passport, jump to map ---- */
const FSEEN=(()=>{try{return JSON.parse(localStorage.getItem("shack-fseen")||"{}")||{};}catch(e){return {};}})();
const saveSeen=()=>{try{localStorage.setItem("shack-fseen",JSON.stringify(FSEEN));}catch(e){}};
const KIND_WORD={concert:"music room",club:"dance club",festival:"festival grounds",comedy:"comedy club",theater:"theater",openmic:"open-mic spot",social:"dance-social spot",dance:"ecstatic-dance space",contact:"movement studio",sound:"sound-bath space",drum:"drum-circle spot"};
function vibeLine(v){const cnt={};v.evs.forEach(e=>cnt[e.kind]=(cnt[e.kind]||0)+1);
  const kind=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];let type=kind?KIND_WORD[kind[0]]||"venue":"venue";
  const cap=+v.cap||0,small=v.evs.some(isSmall),out=v.evs.some(isOutdoor);
  const size=cap?(cap<=350?"Intimate":cap<=1500?"Mid-size":cap<=6000?"Big":"Arena-size"):small?"Small, local":"";
  const ages=v.evs.map(ageOf).filter(Boolean),age=ages.length&&ages.every(a=>a==="all")?"all ages":ages.length&&ages.every(a=>a==="21+")?"21+":"";
  let head=[size,out?"open-air":"",type].filter(Boolean).join(" ");head=head.charAt(0).toUpperCase()+head.slice(1)+(cap?` (~${cap.toLocaleString()})`:"")+(age?`, ${age}`:"")+".";
  const tip=((VOPEN[v.name]||{}).w||[])[0]||(v.transit?`Near ${v.transit}`:"");
  return head+(tip?" "+tip.replace(/\.?$/,"."):"");}
function newCount(v){const s=FSEEN[v.k];if(!s)return 0;const have=new Set(s);return v.evs.filter(e=>!have.has(skey(e))).length;}
function markSeen(k){const v=venueInfo(k);FSEEN[k]=v.evs.map(skey);saveSeen();}
function syncFollowDot(){if(!(state._up||[]).length)return;let n=0;(state.pinV||[]).forEach(k=>{if(!FSEEN[k])markSeen(k);n+=newCount(venueInfo(k));});
  const t=document.querySelector('#bTabs [data-tab="venues"]');if(t)t.classList.toggle("bdot",n>0);}
renderVenues=function(){const list=$("list");
  const keys=[...new Set((state._up||[]).filter(e=>e.kind!=="art"&&e.kind!=="volunteer").map(venueKey))];
  const infos=keys.map(venueInfo),r=dayRange(state.when);
  infos.forEach(v=>{v.inR=r?v.evs.filter(e=>e.start<=r[1]&&(e.end||e.start)>=r[0]):v.evs;});
  const byNext=(a,b)=>(a.inR[0]?.start||"9").localeCompare(b.inR[0]?.start||"9")||(a.drive?.mins??1e9)-(b.drive?.mins??1e9);
  const byDrive=(a,b)=>origin?((a.drive?.mins??1e9)-(b.drive?.mins??1e9))||byNext(a,b):byNext(a,b);
  const card=v=>{const n=v.inR[0]||v.evs[0],when=n?parseDay(n.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(n.time?" · "+String(n.time).replace(/\s*\(.*\)/,""):""):"";
    const fol=isPinned(v.k),nw=fol?newCount(v):0,been=BEEN.has(v.k);
    const prices=v.evs.map(priceInfo).filter(p=>p&&!p.sold&&!p.none&&p.lo!=null).map(p=>p.lo);
    const tags=[nw?`<span class="tag bnew">● ${nw} new</span>`:"",been?`<span class="tag been">✓ Been here</span>`:"",v.evs.some(isSmall)?`<span class="tag local">${ni("home")} Small &amp; local</span>`:"",prices.length&&Math.min(...prices)===0?`<span class="tag">Free shows</span>`:""].filter(Boolean).join("");
    const vo=VOPEN[v.name]||{},eats=vo.e||[],acc=vo.a||null,tips=(vo.w||[]).slice(1);
    const eatQ=u=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(u+" near "+v.name+", "+v.city);
    const fmt=e=>parseDay(e.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
    const more=`<div class="vmore" hidden>
      ${tips.length?`<div class="vsec"><span class="sl">${ni("car")} Getting there</span><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}
      ${eats.length?`<div class="vsec"><span class="sl">${ni("food")} Local eats</span><ul>${eats.map(x=>`<li><a href="${eatQ(x.n)}" target="_blank" rel="noopener"><b>${esc(x.n)}</b></a> · ${esc(x.d)}</li>`).join("")}</ul></div>`:""}
      ${acc?`<div class="vsec"><span class="sl">${ni("hand")} Accessibility</span><p class="vacc">${esc(acc.t)}${acc.u?` <a href="${esc(acc.u)}" target="_blank" rel="noopener">Venue's access page ↗</a>`:""}</p></div>`:""}
      <div class="vsec"><span class="sl">${ni("ticket")} Coming up</span><ul>${v.evs.slice(0,3).map(e=>`<li><b>${esc(fmt(e))}</b> ${esc(e.title)}</li>`).join("")}${v.evs.length>3?`<li class="mut">+${v.evs.length-3} more</li>`:""}</ul></div>
      <div class="vlinks"><button type="button" class="bvmap" data-vmap="${esc(v.k)}">${ni("map")} On the map</button><button type="button" class="vbeen${been?" on":""}" data-been="${esc(v.k)}" aria-pressed="${been}">${been?"✓ Been here":"I've been here"}</button><button type="button" class="vall" data-venue="${esc(v.k)}">All ${v.evs.length} show${v.evs.length===1?"":"s"} →</button></div></div>`;
    return `<div class="vcard${nw?" hasnew":""}"><div class="vf"><button type="button" class="vopen" data-vmore="1" aria-expanded="false"><b>${esc(v.name)}</b>
      <span>${esc(v.city)}${v.drive?` · ${v.drive.real?"":"~"}${fmtMins(v.drive.mins)}`:""}${v.year?` · since ${v.year}`:""}</span>
      <em class="bvibe">${esc(vibeLine(v))}</em>
      <small>${n?`${v.inR.length&&r?"":"Next "}${esc(when)}: ${esc(n.title)}${v.inR.length>1?` +${v.inR.length-1} more`:""}`:"No shows listed"}</small>
      ${tags?`<span class="vtags">${tags}</span>`:""}</button>
      <button type="button" class="vpin bfollow${fol?" on":""}" data-pinv="${esc(v.k)}" aria-pressed="${fol}" aria-label="${fol?"Unfollow":"Follow"} ${esc(v.name)}">${ni("bell")}<span>${fol?"Following":"Follow"}</span></button></div>${more}</div>`;};
  // passport
  const tot=infos.length,beenV=infos.filter(v=>BEEN.has(v.k));
  const regs=REGIONS.map(rg=>{const all=infos.filter(v=>regionOfK(v.k)===rg);return [rg,all.filter(v=>BEEN.has(v.k)).length,all.length];}).filter(x=>x[2]);
  const stamps=beenV.slice(0,10).map((v,i)=>`<span class="bstamp" style="--sr:${(i*37%30)-15}deg;--sc:${VIBES[i%4].c}" title="${esc(v.name)}"><b>${esc(initials(v))}</b><small>${RABBR[regionOfK(v.k)]||""}</small></span>`).join("")+(beenV.length>10?`<span class="bstamp more">+${beenV.length-10}</span>`:"");
  const pass=`<div class="vcard bpass"><div class="vf"><div class="bpass-in">
    <div class="bpass-h"><span class="bpass-k"><img class="bshack-ic" src="hut.webp?v=2" alt="">Show passport</span><b>${beenV.length} <small>of ${tot} venues</small></b></div>
    ${beenV.length?`<div class="bstamps">${stamps}</div><div class="bpass-regs">${regs.filter(x=>x[1]).map(([rg,a,b])=>`<span>${esc(rg)} <b>${a}</b>/${b}</span>`).join("")}</div><button type="button" class="bpass-share" data-pshare="1">${ni("share")} Share my passport</button>`
      :`<p>Tap <b>I've been here</b> on any venue you've been to. Shows you star stamp themselves the day after.</p>`}
  </div></div></div>`;
  const fol=infos.filter(v=>isPinned(v.k)).sort((a,b)=>newCount(b)-newCount(a)||byNext(a,b));
  const seg=`<div class="bseg bven-when">${WHEN.map(([w,l])=>`<button type="button" data-when="${w}" aria-pressed="${state.when===w}">${l}</button>`).join("")}</div>`;
  let html=`<div class="venues bven">${seg}${pass}<h2 class="month pickh">${ni("bell")} Following</h2>`+(fol.length?fol.map(card).join(""):`<div class="empty"><strong>Follow your spots</strong>Tap Follow on a venue. When it adds a show, you'll see a dot on the Venues tab.</div>`);
  const rest=infos.filter(v=>!isPinned(v.k));
  if(r){const on=rest.filter(v=>v.inR.length).sort(byDrive);
    html+=`<h2 class="month">Playing ${WHEN_WORD[state.when]} · ${on.length}</h2>`+(on.length?on.map(card).join(""):`<div class="empty"><strong>Nothing listed ${WHEN_WORD[state.when]}</strong>Try This weekend or Anytime.</div>`);
    html+=`<h2 class="month bquiet">Quiet ${WHEN_WORD[state.when]}</h2>`;
    for(const rg of REGIONS){const vs=rest.filter(v=>!v.inR.length&&regionOfK(v.k)===rg).sort((a,b)=>(a.evs[0]?.start||"9").localeCompare(b.evs[0]?.start||"9"));if(vs.length)html+=`<h3 class="bvreg">${esc(rg)}</h3>`+vs.map(card).join("");}}
  else for(const rg of REGIONS){const vs=rest.filter(v=>regionOfK(v.k)===rg).sort(byNext);if(vs.length)html+=`<h2 class="month">${esc(rg)}</h2>`+vs.map(card).join("");}
  list.innerHTML=html+`</div>`;syncFollowDot();};
const RABBR={"Orange County":"OC","Los Angeles":"LA","Inland Empire":"IE","San Diego":"SD","Desert":"DST","Ventura":"VC","Other":""};
const STOPW=new Set(["the","of","at","and","a","an","on","in","&","+","-","·"]);
function initials(v){const city=new Set(String(v.city||"").toLowerCase().split(/\s+/));
  let w=v.name.replace(/[(),.'’!]/g," ").split(/\s+/).filter(x=>x&&!STOPW.has(x.toLowerCase()));
  const nc=w.filter(x=>!city.has(x.toLowerCase()));if(nc.length)w=nc;
  if(w.length===1)return w[0].slice(0,2).toUpperCase();
  return w.slice(0,3).map(x=>/^\d/.test(x)?x.replace(/\D.*$/,""):x[0]).join("").toUpperCase().slice(0,3);}
function regionOfK(k){const e=(state._up||[]).find(x=>venueKey(x)===k);return e?region(e):"Other";}
// B-only clicks inside the venues list (capture so they run before app.js's handlers)
$("list").addEventListener("click",ev=>{if(screen!=="venues")return;
  const w=ev.target.closest("[data-when]");if(w){ev.stopPropagation();state.when=w.dataset.when;savePrefs();render();return;}
  const vm=ev.target.closest("[data-vmore]");if(vm){const k=vm.closest(".vf").querySelector("[data-pinv]")?.dataset.pinv;if(k&&isPinned(k)&&newCount(venueInfo(k))){markSeen(k);setTimeout(()=>{const c=vm.closest(".vcard");c.classList.remove("hasnew");const t=c.querySelector(".bnew");if(t)t.remove();syncFollowDot();},0);}return;}
  const pn=ev.target.closest("[data-pinv]");if(pn){const k=pn.dataset.pinv;if(!isPinned(k))markSeen(k);return;}
  const mp=ev.target.closest("[data-vmap]");if(mp){ev.stopPropagation();focusVenue(mp.dataset.vmap);return;}
  const vv=ev.target.closest("[data-venue]");if(vv){ev.stopPropagation();state.venue=vv.dataset.venue;state.view="list";state.kind="all";state.sub=null;cur="venue";show("results");return;}
  const ps=ev.target.closest("[data-pshare]");if(ps){ev.stopPropagation();const n=[...BEEN].length;
    const t=`My Show Shack passport: ${n} SoCal venue${n===1?"":"s"} stamped 🛖🎟️\n${APP_URL}`;
    if(navigator.share)navigator.share({text:t}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>{ps.textContent="Copied ✓";});}},true);
let focusK=null;
/* ---- Easter egg: tap the Fiscar to wake it (silent, it's electric), tap again and it peels out ---- */
let carOn=false,carGo=false,AC=null;
/* Fiscar drive-off, modelled on the shape of a real Karma recording (measured, not copied):
   a dense, rounded loudness curve: full pull-away, drop as it leaves, a big round swell as it comes
   back around, a smaller one as it parks, then a soft trail. Thin electric whine (~2.4 -> 4.4 kHz)
   over road rumble, a ~650 Hz body resonance and tyre hiss; gently compressed so it sounds full. */
const K_ENV=[[0,0],[.22,.8],[.5,.88],[.85,1],[.95,.86],[1.15,.17],[1.3,.16],[1.6,.88],[1.8,.8],[2,.22],[2.12,.21],[2.38,.62],[2.6,.35],[2.85,.13],[3,0]];
function curve(keys,dur,n){const out=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*dur;let k=0;while(k<keys.length-2&&keys[k+1][0]<x)k++;
  const [x0,y0]=keys[k],[x1,y1]=keys[k+1],u=Math.min(1,Math.max(0,(x-x0)/(x1-x0||1))),c=(1-Math.cos(u*Math.PI))/2;out[i]=y0+(y1-y0)*c;}return out;}
function karmaSound(ctx,dest){const t=ctx.currentTime+.02,sr=ctx.sampleRate,D=3,end=t+D;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=2.5;comp.attack.value=.003;comp.release.value=.2;
  const master=ctx.createGain();master.gain.value=.12;comp.connect(master).connect(dest);
  const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  if(pan){pan.connect(comp);pan.pan.setValueCurveAtTime(curve([[0,-.1],[.9,.8],[1.2,.8],[1.33,-.7],[2.4,0],[3,0]],D,200),t,D);}
  const far=ctx.createBiquadFilter();far.type="lowpass";far.Q.value=.5;far.frequency.setValueCurveAtTime(curve([[0,7000],[.9,7000],[1.25,1500],[1.6,4500],[2,2500],[2.38,3500],[3,1500]],D,200),t,D);far.connect(pan||comp);
  const env=ctx.createGain();env.gain.setValueCurveAtTime(curve(K_ENV,D,400),t,D);env.connect(far);
  const noise=(brown)=>{const b=ctx.createBuffer(1,sr*D,sr),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5;}else d[i]=w;}const n=ctx.createBufferSource();n.buffer=b;n.start(t);n.stop(end);return n;};
  const chain=(src,...nodes)=>{let x=src;nodes.forEach(nn=>{x.connect(nn);x=nn;});x.connect(env);};
  const bq=(type,f,q)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q)b.Q.value=q;return b;},gn=v=>{const g=ctx.createGain();g.gain.value=v;return g;};
  chain(noise(true),bq("highpass",70),bq("lowpass",380),gn(1));                         // road rumble
  const mf=bq("bandpass",640,4);mf.frequency.setValueCurveAtTime(curve([[0,600],[.86,700],[1.2,570],[1.6,680],[2.4,600],[3,560]],D,100),t,D);
  chain(noise(false),mf,gn(.8));                                                           // body resonance
  chain(noise(false),bq("bandpass",1600,.7),gn(.09));                                       // tyre hiss
  const wg=gn(.03);wg.connect(env);                                                        // electric whine
  const wf=curve([[0,2400],[.9,4400],[1.2,4200],[1.33,3300],[1.8,3000],[2.45,2300],[3,2200]],D,300);
  [[1,1],[2,.18]].forEach(([m,g])=>{const o=ctx.createOscillator();o.type="sine";o.frequency.setValueCurveAtTime(wf.map(v=>v*m),t,D);
    const v=ctx.createOscillator(),vg=gn(6*m);v.frequency.value=7;v.connect(vg).connect(o.frequency);v.start(t);v.stop(end);
    const og=gn(g);o.connect(og).connect(wg);o.start(t);o.stop(end);});}
window.karmaSound=karmaSound;
function evWhoosh(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();karmaSound(AC,AC.destination);}catch(e){}}
const fx=document.createElement("div");fx.className="bcarfx";document.body.appendChild(fx);
function puff(x,y,big){const m=document.createElement("i");m.className="bmist";m.style.left=x+"px";m.style.top=y+"px";m.style.setProperty("--h",Math.round(Math.random()*360));
  if(big)m.style.setProperty("--s",1.6);fx.appendChild(m);setTimeout(()=>m.remove(),1300);}
function spark(x,y){const k=document.createElement("b");k.className="bspark";k.style.left=x+"px";k.style.top=y+"px";
  k.style.setProperty("--dx",(-30-Math.random()*60)+"px");k.style.setProperty("--dy",(-14+Math.random()*34)+"px");fx.appendChild(k);setTimeout(()=>k.remove(),650);}
function driveOff(btn,img){img=img||btn.querySelector("img");const r=img.getBoundingClientRect();carGo=true;btn.classList.add("go");evWhoosh();
  const out=innerWidth-r.left+40,back=-(r.right+40);let alive=true;
  (function trail(){if(!alive)return;const b=img.getBoundingClientRect();if(b.right>0&&b.left<innerWidth){
      puff(b.left+6,b.top+b.height*.55);if(Math.random()<.9){spark(b.left+b.width*.22,b.bottom-3);spark(b.left+b.width*.8,b.bottom-3);}}
    requestAnimationFrame(trail);})();
  img.animate([{transform:"translateX(0)"},{transform:"translateX(-6px)",offset:.12},{transform:`translateX(${out}px)`}],{duration:950,easing:"cubic-bezier(.55,0,.85,.35)"}).onfinish=()=>{
    img.style.transform=`translateX(${back}px)`;
    setTimeout(()=>{img.animate([{transform:`translateX(${back}px)`},{transform:"translateX(4px)",offset:.86},{transform:"translateX(0)"}],{duration:1100,easing:"cubic-bezier(.2,.75,.3,1)"}).onfinish=()=>{
      img.style.transform="";alive=false;carGo=false;carOn=false;btn.classList.remove("go","on");};},380);};}
function carTap(btn,img){if(carGo)return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){btn.classList.toggle("on");return;}
  if(!btn.classList.contains("on")){carOn=true;btn.classList.add("on");const r=(img||btn).getBoundingClientRect();for(let i=0;i<3;i++)setTimeout(()=>puff(r.left+4,r.top+r.height*.6,true),i*120);}
  else driveOff(btn,img);}
$("bMapReach").addEventListener("click",ev=>{const btn=ev.target.closest(".breach-btn");if(btn)carTap(btn);});
// same egg on the Max drive slider: a tap right on the car (no drag) wakes it, a second tap sends it
(()=>{const md=$("maxDrive"),rw=md.parentNode,car=rw.querySelector(".car");if(!car)return;let d=null;
  md.addEventListener("pointerdown",e=>{const r=car.getBoundingClientRect();d={x:e.clientX,y:e.clientY,v:md.value,t:Date.now(),on:e.clientX>=r.left-6&&e.clientX<=r.right+6&&e.clientY>=r.top-12&&e.clientY<=r.bottom+12};});
  md.addEventListener("pointerup",e=>{if(!d)return;const tap=d.on&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<8&&Date.now()-d.t<450&&md.value===d.v;d=null;if(tap)carTap(rw,car);});
  md.addEventListener("input",()=>{if(d&&md.value!==d.v)d.on=false;});})();
function focusVenue(k){focusK=k;MAPV.vibe="all";const v=venueInfo(k);
  if(!v.evs.some(inWhen)){state.when="any";savePrefs();}
  state.kind="all";state.view="map";show("map");}

/* ---- start on the home screen, unless a shared link points at a show ---- */
state.kind="all";state.sub=null;state.genre="all";state.view="list";
const target=(location.hash||"").slice(1);
if(target&&/^[ep]-/.test(target)){cur="all";state.when="any";show("results",true);openCard(target);}
else show("home",true);
})();
