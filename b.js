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
bar.insertBefore(controls.querySelector(".search"),$("bWhenRes").nextSibling);   // search sits under Tonight / This weekend / Anytime
tools.insertBefore($("maxDrive").closest("label"),$("bFilt"));
tools.insertBefore($("sortBy").closest("label"),$("bFilt"));
const flags=$("flagRow"); flags.hidden=true; bar.appendChild(flags);
$("bHome").appendChild($("disco"));
// bottom of the Plan page: the same ball, as the globe (plans a whole night). Flick it up there to get the disco ball back.
document.querySelector("section.add").insertAdjacentHTML("afterend",`<section class="bplanglobe" id="bPlanGlobe" aria-label="Plan a random night"><div class="bdisco-h"><h2 class="bsec">Spin up a whole night</h2><p></p></div></section>`);
function placeBall(s){const d=$("disco"),to=s==="budget"?$("bPlanGlobe"):s==="home"?$("bHome"):null;if(!d||!to)return;
  if(d.parentNode!==to)to.appendChild(d);if(window.DISCO)DISCO.set(s==="budget"?"globe":"disco");}
document.querySelector(".wrap").insertBefore($("budgetBar"),$("alertBar"));
const bStart=document.createElement("button");bStart.type="button";bStart.className="chip bstart";bStart.textContent="Set your start point for drive times";tools.appendChild(bStart);
bStart.onclick=()=>{state.view="list";show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);};
$("bFilt").onclick=()=>{flags.hidden=!flags.hidden;$("bFilt").setAttribute("aria-expanded",String(!flags.hidden));};

/* ---- when switch (home + results share it) ---- */
function segHtml(){return WHEN.map(([v,l])=>`<button type="button" data-when="${v}" aria-pressed="${state.when===v}">${l}</button>`).join("");}
["bWhenHome","bWhenRes","bMapWhen"].forEach(id=>{const el=$(id);el.innerHTML=segHtml();
  el.addEventListener("click",ev=>{const b=ev.target.closest("[data-when]");if(!b)return;state.when=b.dataset.when;savePrefs();render();});});
if(!["tonight","weekend","any"].includes(state.when))state.when="any";

state.poolOn=false; // the separate Pool layer is gone (pool shows under Afters); clear old saved prefs
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

/* ---- undo: one toast with an Undo button (the toast lives in night.js) ---- */
function undoToast(msg,fn){setTimeout(()=>{if(window.NIGHT&&NIGHT.toast)NIGHT.toast(esc(msg),"Undo",fn);},0);}
/* ---- offline banner: what still works without a connection, and a quick "back online" ---- */
(()=>{const off=document.createElement("div");off.className="boff";off.setAttribute("role","status");document.body.appendChild(off);let t=0;
  function net(){clearTimeout(t);if(navigator.onLine===false){const m=window.SHACK_META&&SHACK_META.lastRun?new Date(SHACK_META.lastRun).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
      off.className="boff on";off.textContent=`📴 You're offline. Showing the shows saved on this phone${m?` (list from ${m})`:""}. Maps, prices and previews need a connection.`;}
    else if(off.classList.contains("on")){off.className="boff on back";off.textContent="✓ Back online";t=setTimeout(()=>{off.className="boff";},2200);}}
  addEventListener("online",net);addEventListener("offline",net);net();})();
/* ---- recently added: shows venues just put on sale, newest first (fresh.json dates each show the day it first showed up) ---- */
let FRESH=null;
fetch("fresh.json?v="+Math.floor(Date.now()/36e5)).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.seen){FRESH=j;if(screen==="home")render();}}).catch(()=>{});
const isoDay=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function freshWord(d){const t=new Date();t.setHours(0,0,0,0);const [y,m,x]=d.split("-").map(Number),n=Math.round((t-new Date(y,m-1,x))/864e5);
  return n<=0?"Added today":n===1?"Added yesterday":n<7?"Added "+new Date(y,m-1,x).toLocaleDateString("en-US",{weekday:"short"}):"Added "+new Date(y,m-1,x).toLocaleDateString("en-US",{month:"short",day:"numeric"});}
function bFreshPicks(up,skip){if(!FRESH)return [];const S=FRESH.seen,base=FRESH.base||"",t=new Date();t.setDate(t.getDate()-14);const since=isoDay(t);
  const xs=up.filter(e=>!e.added&&S[e.id]&&S[e.id]>base&&S[e.id]>=since&&!skip.has(skey(e))&&!priceInfo(e).sold)
    .sort((a,b)=>S[b.id].localeCompare(S[a.id])||(state.stars.has(skey(b))-state.stars.has(skey(a)))||((a._drive?.mins??999)-(b._drive?.mins??999))||a.start.localeCompare(b.start));
  const per={},out=[];for(const e of xs){const v=venueKey(e);if((per[v]=(per[v]||0)+1)>2)continue;out.push(e);if(out.length>=10)break;}   // max 2 per venue so one big drop doesn't fill the row
  return out;}

/* ---- flip cards: real event cards in a row; tap flips to the details right there ---- */
const LISTEN=q=>[["YouTube Music","https://music.youtube.com/search?q="],["Spotify","https://open.spotify.com/search/"],["Apple Music","https://music.apple.com/us/search?term="],["SoundCloud","https://soundcloud.com/search/people?q="]].map(([n,u])=>`<a href="${u+encodeURIComponent(q)}" target="_blank" rel="noopener">${n}</a>`).join("");
/* ---- artist preview: a 30-second clip from Apple's free iTunes Search API (no key; falls back to JSONP if fetch is blocked) ---- */
const MUSIC_K=new Set(["concert","club","festival"]);
const artistQ=e=>String(e.title||"").replace(/\s*\(.*?\)\s*/g," ").split(/:| & Friends| w\/ | with | \+ | - | – | \| /i)[0].trim();
const pvNorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const PVC={};let PV={a:null,btn:null};
function itunes(q){if(PVC[q])return PVC[q];const u="https://itunes.apple.com/search?media=music&entity=song&limit=8&country=US&term="+encodeURIComponent(q);
  return PVC[q]=fetch(u).then(r=>r.ok?r.json():Promise.reject()).catch(()=>new Promise(res=>{const cb="shackIt"+Math.random().toString(36).slice(2);const sc=document.createElement("script");
    const done=j=>{res(j);try{delete window[cb];}catch(e){}sc.remove();};window[cb]=done;sc.onerror=()=>done(null);sc.src=u+"&callback="+cb;document.head.appendChild(sc);setTimeout(()=>done(null),7000);}))
    .then(j=>{const want=pvNorm(q),hits=((j&&j.results)||[]).filter(r=>r.previewUrl&&(pvNorm(r.artistName)===want||pvNorm(r.artistName).startsWith(want)||want.startsWith(pvNorm(r.artistName))));return hits[0]||null;});}
function pvStop(){if(PV.a){PV.a.pause();PV.a=null;}if(PV.btn){PV.btn.classList.remove("on");PV.btn.innerHTML=PV.btn.dataset.lbl;PV.btn=null;}}
async function pvPlay(btn,e){if(PV.btn===btn){pvStop();return;}pvStop();btn.dataset.lbl=btn.dataset.lbl||btn.innerHTML;btn.textContent="Finding a preview…";
  const q=artistQ(e),t=await itunes(q);const note=btn.parentNode.parentNode.querySelector(".bpv-note")||btn.closest(".bfc-b,article.card")?.querySelector(".bpv-note");
  if(!t){btn.innerHTML=btn.dataset.lbl;if(note){note.hidden=false;note.textContent=`No preview found for ${q}.`;}return;}
  try{SH.audio.solo();const a=new Audio(t.previewUrl);a.volume=.9;await a.play();PV={a,btn};btn.classList.add("on");btn.textContent="⏸︎ Stop preview";
    a.onended=pvStop;if(note){note.hidden=false;note.innerHTML=`♪ “${esc(t.trackName)}” · ${esc(t.artistName)} · <a href="${esc(t.trackViewUrl||"#")}" target="_blank" rel="noopener">Apple Music preview ↗</a>`;}}
  catch(err){btn.innerHTML=btn.dataset.lbl;if(note){note.hidden=false;note.textContent="Couldn't play the preview. Check your connection.";}}}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-apv]");if(!b)return;ev.stopPropagation();ev.preventDefault();
  const e=(state._up||[]).find(x=>hid(x)===b.dataset.apv)||(state.events||[]).find(x=>hid(x)===b.dataset.apv);if(e)pvPlay(b,e);},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden)pvStop();});
window.SHACK_PV=e=>MUSIC_K.has(e.kind)&&!!artistQ(e)?`<button type="button" class="bpv" data-apv="${esc(hid(e))}">▶&#xFE0E; 30s preview</button>`:"";
function backSide(e){const pi=priceInfo(e),d=parseDay(e.start);
  const tix=safeUrl(e.url),dest=encodeURIComponent((e.venue||"")+", "+(e.city||""));
  const maps=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}&travelmode=driving`;
  const pr=pi.sold?"Sold out":pi.free?"Free":pi.none?"Price not listed yet":pi.est?`≈$${Math.round(pi.lo)}–${Math.round(pi.hi)} typical`:`From $${Math.round(pi.lo)}${!pi.est&&e.priceAsOf?" · checked "+fmtShort(e.priceAsOf)+(priceStale(e)?" · may have changed":""):""}`;
  const lq=(e.kind!=="openmic"&&e.kind!=="contact")?String(e.title||"").replace(/\s*\(.*?\)\s*/g," ").split(/:| & Friends/)[0].trim():"";
  const when=(isRec(e)&&e.recurrence?e.recurrence.text+" · next ":"")+d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(e.time?" · "+e.time:"");
  const note=e.note||e.priceNote||"";
  return `<div class="bfb-top"><b>${esc(e.title)}</b><span>${esc(when)}</span><span>${esc(e.venue)} · ${esc(e.city)}${e._drive?` · ${e._drive.real?"":"~"}${fmtMins(e._drive.mins)} drive`:""}</span></div>
    <div class="bfb-price">${esc(pr)}</div>
    ${note?`<p class="bfb-note">${esc(note)}</p>`:""}
    <div class="bfb-acts">${tix?`<a class="bfb-main" href="${esc(tix)}" target="_blank" rel="noopener">${tixWord(e,pi)} ↗</a>`:""}<a href="${maps}" target="_blank" rel="noopener">Directions</a>
      ${window.SHACK_PV(e)}${lq?`<button type="button" class="bfb-listen" aria-expanded="false"><span class="lt">Listen on…</span></button>`:""}<button type="button" data-share="${esc(skey(e))}">Share</button></div>
    <p class="bpv-note" hidden></p>
    ${lq?`<div class="bfb-lm" hidden>${LISTEN(lq)}</div>`:""}
    <div class="bfb-foot"><button type="button" class="bfb-full" data-full="${esc(hid(e))}">Full card</button><button type="button" class="bfb-hint">Flip back ↻</button></div>`;}
function flipCardHtml(e,tag){const front=cardHtml(e).replace(/^\s*<article id="[^"]*"/,'<article').replace(/class="card( flipped)?"/,'class="card"');
  const free=priceInfo(e).free;
  return `<div class="bfc" data-k="${esc(skey(e))}"><div class="bfc-in"><div class="bfc-f"><button type="button" class="bfc-sr sr-only">Flip ${esc(e.title)} for details</button>${tag?`<span class="bfc-tag">${tag}</span>`:""}${free?`<span class="bfc-free">FREE</span>`:""}${front}</div><div class="bfc-b" aria-hidden="true">${backSide(e)}</div></div></div>`;}
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
$("bFresh").addEventListener("click",flipRowClick,true);
window.SHACK_FLIP={html:flipCardHtml,click:flipRowClick};   // flyer.js builds its "From flyers" row with these
$("bDrop").addEventListener("click",flipRowClick,true);
$("bBec").addEventListener("click",flipRowClick,true);
/* ---- because you starred X: one of your starred shows (a new one each day), and upcoming shows that share its genre, venue or kind ---- */
function bBecause(up){const starred=up.filter(e=>state.stars.has(skey(e)));if(!starred.length)return null;
  const day=Math.floor(Date.now()/864e5),order=starred.map((e,i)=>starred[(i+day)%starred.length]);
  for(const s of order){const g=new Set(s.genres||[]),vk=venueKey(s);
    const xs=up.filter(e=>!state.stars.has(skey(e))&&!e.added&&!priceInfo(e).sold).map(e=>{let sc=0;(e.genres||[]).forEach(x=>{if(g.has(x))sc+=3;});
      if(venueKey(e)===vk)sc+=2;if(e.kind===s.kind)sc+=1;if(e._drive&&e._drive.mins<=40)sc+=1;return {e,sc};}).filter(x=>x.sc>=3)
      .sort((a,b)=>b.sc-a.sc||a.e.start.localeCompare(b.e.start)).slice(0,8).map(x=>x.e);
    if(xs.length>=3)return {s,xs};}
  return null;}
/* ---- going-out streak: weeks in a row (Mon–Sun) with a night out: logged passport shows, starred shows that happened, past nights ---- */
function weekNo(iso){const [y,m,d]=iso.split("-").map(Number),t=new Date(y,m-1,d);t.setDate(t.getDate()-((t.getDay()+6)%7));return Math.round(t.getTime()/6048e5);}
function outDays(){const today=todayStr(),days=new Set();
  for(const k of BEEN)pastShows(k).forEach(x=>{if(x.d<=today)days.add(x.d);});
  if(window.NIGHT&&NIGHT.allNights)NIGHT.allNights().forEach(x=>{if(x.p.d&&x.p.d<=today&&x.p.s.length)days.add(x.p.d);});
  return days;}
function streak(){const wk=new Set([...outDays()].map(weekNo)),now=weekNo(todayStr());let w=wk.has(now)?now:now-1,n=0;while(wk.has(w)){n++;w--;}
  let best=0,run=0;[...wk].sort((a,b)=>a-b).forEach((x,i,a)=>{run=i&&x===a[i-1]+1?run+1:1;best=Math.max(best,run);});
  return {n,thisWeek:wk.has(now),best};}
/* ---- price dropped: tickets that got cheaper since the Shack last checked (priceWas → priceFrom), biggest drop first ---- */
function bDrops(up){return up.filter(e=>!e.added&&e.priceWas!=null&&e.priceFrom!=null&&Math.round(e.priceWas)>Math.round(e.priceFrom)&&!priceInfo(e).sold)
  .map(e=>({e,pct:(e.priceWas-e.priceFrom)/e.priceWas})).sort((a,b)=>b.pct-a.pct||a.e.start.localeCompare(b.e.start)).slice(0,8).map(x=>x.e);}

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
  ["home","results","map","venues","saved","budget","spots"].forEach(x=>root.classList.toggle("b-"+x,x===s));
  document.body.classList.toggle("nebtiles",s==="home");
  const tab=s==="home"||s==="results"||s==="spots"?"shows":s;
  document.querySelectorAll("#bTabs [data-tab]").forEach(b=>{if(b.dataset.tab===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  bar.hidden=!(s==="results"||s==="saved");
  placeBall(s);
  if(s!=="home"&&!noPush&&!pushed){try{history.pushState({b:1},"");pushed=true;}catch(e){}}
  if(s==="home"&&pushed&&!noPush){pushed=false;try{history.back();}catch(e){}}
  render(); window.scrollTo(0,0);
}
// Opening a venue's shows from the Venues tab remembers where you were, so Back (the ‹ button or a back swipe)
// returns to that venue card on Venues instead of Home.
let backTo=null,subPushed=false;
function openVenueShows(k){backTo={s:"venues",y:window.scrollY,k};state.venue=k;state.view="list";state.kind="all";state.sub=null;cur="venue";show("results");
  try{history.pushState({b:2},"");subPushed=true;}catch(e){subPushed=false;}}
function restoreBack(){const b=backTo;backTo=null;state.venue="all";state.kind="all";state.sub=null;state.view="venues";show("venues",true);
  setTimeout(()=>{const pin=b.k&&$("list").querySelector(`[data-pinv="${CSS.escape(b.k)}"]`),card=pin&&pin.closest(".vcard");
    if(card){const o=card.querySelector("[data-vmore]");if(o&&o.getAttribute("aria-expanded")!=="true")o.click();card.scrollIntoView({block:"center"});}else window.scrollTo(0,b.y);},60);}
window.addEventListener("popstate",()=>{
  if(subPushed){subPushed=false;if(backTo&&screen==="results"){restoreBack();return;}}
  if(pushed){pushed=false;backTo=null;if(screen!=="home"){state.kind="all";state.sub=null;show("home",true);}}});
$("bBack").onclick=()=>{if(backTo&&screen==="results"){if(subPushed){history.back();return;}restoreBack();return;}goHome();};
window.BUI={show,goHome,get screen(){return screen;}};
function goHome(){backTo=null;state.venue="all";state.kind="all";state.sub=null;state.genre="all";state.view="list";show("home");}
$("bTabs").addEventListener("click",ev=>{const b=ev.target.closest("[data-tab]");if(!b)return;const t=b.dataset.tab;
  if(t==="shows"){goHome();return;}
  backTo=null;state.sub=null;state.surprise=null;state.venue="all";
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
  try{importNights();}catch(e){}
  if((state._up||[]).length)try{syncFollowDot();}catch(e){}
  if(screen==="map"){closeSheet();drawMapUI();}
  if(pendingOpen)setTimeout(tryOpen,30);
  document.querySelectorAll("[data-when]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.when===state.when)));
  const up=state._up||[];
  if(screen==="home"&&state.loadErr&&$("bPicks").dataset.sig!=="err"){$("bPicks").dataset.sig="err";$("bPicks").innerHTML=loadErrHtml();}
  if(screen==="home"&&state.loaded&&!state.loadErr){
    for(const v of VIBES){const n=up.filter(e=>GROUPS[v.k].has(e.kind)&&inWhen(e)).length;
      const el=document.querySelector(`[data-count="${v.k}"]`);if(el)el.textContent=n+" "+WHEN_WORD[state.when];}
    const wp=bWeekendPicks(up);
    const sig=wp?wp.picks.slice(0,5).map(p=>skey(p.e)).join("|")+(origin?"o":""):"";
    if(sig!==$("bPicks").dataset.sig){$("bPicks").dataset.sig=sig;
      $("bPicks").innerHTML=wp?wp.picks.slice(0,5).map(p=>flipCardHtml(p.e,p.v?`<i style="--vc:${p.v.c}"></i>${p.v.name.split(" & ")[0]}`:"")).join(""):'<p class="bnone">Weekend picks show up here once the weekend list fills in.</p>';}
    const st=streak(),sk=$("bStreak");sk.hidden=!st.n&&!st.best;
    if(!sk.hidden)sk.innerHTML=st.n?`🔥 <b>${st.n} week${st.n>1?"s":""} in a row</b> out${st.thisWeek?"":" · nothing logged this week yet, keep it going"}${st.best>st.n?` · best ${st.best}`:""}`:`💤 Streak ended · your best was ${st.best} week${st.best>1?"s":""} in a row`;
    const bc=bBecause(up),bsig=bc?skey(bc.s)+bc.xs.map(skey).join("|"):"";$("bBecBox").hidden=!bc;
    if(bsig!==$("bBec").dataset.sig){$("bBec").dataset.sig=bsig;if(bc){const tt=String(bc.s.title).split(/[:(]/)[0].trim();$("bBecH").textContent="Because you're into "+(tt.length>30?tt.slice(0,30).replace(/\s+\S*$/,"")+"…":tt);
      $("bBec").innerHTML=bc.xs.map(e=>flipCardHtml(e,`<i style="--vc:#FFC66B"></i>${esc((e.genres||[]).find(x=>(bc.s.genres||[]).includes(x))||(venueKey(e)===venueKey(bc.s)?"Same venue":"Same vibe"))}`)).join("");}}
    const dr=bDrops(up),dsig=dr.map(e=>skey(e)+e.priceFrom).join("|");$("bDropBox").hidden=!dr.length;
    if(dsig!==$("bDrop").dataset.sig){$("bDrop").dataset.sig=dsig;$("bDropN").textContent=dr.length?"cheaper than last check":"";
      $("bDrop").innerHTML=dr.map(e=>flipCardHtml(e,`<i style="--vc:#7ee0b8"></i>↓ $${Math.round(e.priceWas)} → $${Math.round(e.priceFrom)}`)).join("");}
    const fr=bFreshPicks(up,new Set(wp?wp.picks.slice(0,5).map(p=>skey(p.e)):[]));
    const fsig=fr.map(skey).join("|")+(origin?"o":"");
    $("bFreshBox").hidden=!fr.length;
    if(FRESH&&fsig!==$("bFresh").dataset.sig){$("bFresh").dataset.sig=fsig;   // FRESH (fresh.json) can arrive after the show list
      $("bFresh").innerHTML=fr.map(e=>flipCardHtml(e,`<i style="--vc:#7ee0b8"></i>${freshWord(FRESH.seen[e.id])}`)).join("");
      const wa=isoDay(new Date(Date.now()-6*864e5)),wk=up.filter(e=>!e.added&&FRESH.seen[e.id]>(FRESH.base||"")&&FRESH.seen[e.id]>=wa).length;$("bFreshN").textContent=wk?wk+" new this week":"";}
    trust();
    if(window.SPOTS)SPOTS.home();
  }
  if(screen==="results"||screen==="saved"){
    const v=VIBES.find(x=>x.k===cur);
    $("bTitle").textContent=cur==="ins"?"Hivemind808 insights":screen==="saved"?"Saved":state.venue&&state.venue!=="all"?state.venue.split(" · ")[0]:v?v.name:cur==="surprise"?"Surprise pick":state.q?"Search":"All shows";
    const n=(state._shown||[]).length;$("bCount").textContent=n+(n===1?" event":" events")+(screen==="saved"?"":" · "+WHEN_WORD[state.when]);
    const subs=$("bSubs");let items=null,key="sub";
    if(cur==="music"){if(state.genre==="electronic"){state.genre="all";state.sub="dj";}items=[["","All"],["k:festival","Festival"],["k:dj","DJ / rave"],...GENRES.filter(([g])=>g!=="all"&&g!=="electronic")];key="music";} else if(SUBS[cur])items=SUBS[cur];
    if(screen==="saved")items=null;
    subs.hidden=!items;
    if(items){const val=key==="music"?(state.sub?"k:"+state.sub:state.genre==="all"?"":state.genre):(state.sub||"");
      subs.innerHTML=items.map(([x,l])=>`<button type="button" class="chip" data-sub="${x}" data-key="${key}" aria-pressed="${x===val}">${esc(l)}</button>`).join("");}
    bStart.hidden=!!origin;
    $("bWhenRes").hidden=screen==="saved"||cur==="ins";
    tools.hidden=screen==="saved"||cur==="ins";if(cur==="ins")$("bCount").textContent="Only you see this";
  }
  if(window.SPOTS)SPOTS.after(screen,cur);
  if(window.NIGHT&&NIGHT.savedRow)NIGHT.savedRow(screen==="saved");
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
/* ---- What's new: a one-time sheet (again from Settings) with a "Show me" for each thing ---- */
const WN_VER="2026-11";
const WHATSNEW=[["🍜","Space ramen","Pull the disco ball down. Four swipes serve a random food spot and afters.",()=>{goHome();setTimeout(()=>$("disco").scrollIntoView({behavior:"smooth",block:"center"}),250);}],
  ["🆕","New rows on Home","Recently added, Price dropped, Because you're into, and your going-out streak.",()=>{goHome();setTimeout(()=>{const t=[$("bBecBox"),$("bDropBox"),$("bFreshBox")].find(x=>x&&!x.hidden);if(t)t.scrollIntoView({behavior:"smooth",block:"start"});},250);}],
  ["🌙","Your nights, saved","Every plan you build is kept in Saved. Do a past night again with one tap.",()=>{const t=document.querySelector('#bTabs [data-tab="saved"]');if(t)t.click();}],
  ["⏱","Smarter planning","Drag stops to reorder, Tighten the night, the forecast, and drive vs rideshare home.",()=>{const t=document.querySelector('#bTabs [data-tab="budget"]');if(t)t.click();setTimeout(()=>{const n=$("bNight");if(n)n.scrollIntoView({behavior:"smooth",block:"start"});},200);}],
  ["🎟️","Show passport","Your stamps and badges live together on the You tab. Tap a stamp to log past shows, and compare with a friend.",()=>{if(window.SHACK_YOU)SHACK_YOU.open("pass");}],
  ["🔥","Map extras","Tonight heatmap, Now button, route costs and Build a night here.",()=>{MAPV.heat=true;state.when="tonight";const t=document.querySelector('#bTabs [data-tab="map"]');if(t)t.click();}]];
const dlgOpen=d=>{if(d.showModal)d.showModal();else d.setAttribute("open","");},dlgClose=d=>{d.close?d.close():d.removeAttribute("open");};
function whatsNew(){$("bNewList").innerHTML=WHATSNEW.map(([ic,t,p],i)=>`<li><i aria-hidden="true">${ic}</i><div><b>${esc(t)}</b><p>${esc(p)}</p></div><button type="button" data-wn="${i}">Show me</button></li>`).join("");dlgOpen($("bNew"));
  try{SH.store.put("shack-new",WN_VER);}catch(e){}}
$("bNew").addEventListener("click",ev=>{const d=$("bNew");if(ev.target===d||ev.target.closest("[data-close]")){dlgClose(d);return;}
  const b=ev.target.closest("[data-wn]");if(b){dlgClose(d);WHATSNEW[+b.dataset.wn][3]();}});
/* ---- Settings → Your data ---- */
function setStats(){const nn=window.NIGHT&&NIGHT.allNights?NIGHT.allNights().length:0;
  $("bSetStats").innerHTML=[[state.stars.size,"interested"],[nn,"nights"],[BEEN.size,"stamps"],[showCount(),"shows logged"],[(state.pinV||[]).length,"following"]].map(([n,l])=>`<span><b>${n}</b>${l}</span>`).join("");}
$("bSetBtn").onclick=()=>{setStats();$("bSetOwner").hidden=SH.store.raw("shack-owner")!=="1";$("bSetMsg").textContent="";const c=$("bSet").querySelector("[data-sclear]");c.classList.remove("sure");c.textContent="Clear everything on this phone";dlgOpen($("bSet"));};
$("bSet").addEventListener("click",ev=>{const d=$("bSet");if(ev.target===d||ev.target.closest("[data-close]")){dlgClose(d);return;}
  if(ev.target.closest("[data-sback]")){backupPassport();$("bSetMsg").textContent="Backup file saved. Keep it somewhere safe (Files, iCloud, email to yourself).";return;}
  if(ev.target.closest("[data-snew]")){dlgClose(d);whatsNew();return;}
  // owner only: the insights view (it lived behind a View bar this layout hides)
  if(ev.target.closest("[data-sins]")){dlgClose(d);state.venue="all";state.kind="all";state.when="any";state.sub=null;state.surprise=null;cur="ins";show("results");state.view="ins";render();return;}
  if(ev.target.closest("[data-stour]")){try{SH.store.del("shack-ballhint");}catch(e){}$("bSetMsg").textContent="The ghost finger is back. Reloading…";setTimeout(()=>location.reload(),600);return;}
  const c=ev.target.closest("[data-sclear]");if(c){if(!c.classList.contains("sure")){c.classList.add("sure");c.textContent="Tap again: wipes stars, nights, passport and settings";$("bSetMsg").textContent="Back up first if you might want any of it.";return;}
    try{SH.store.keys().filter(k=>/^(radar-|shack-)/.test(k)).forEach(k=>SH.store.del(k));}catch(e){}$("bSetMsg").textContent="Cleared. Reloading…";setTimeout(()=>location.reload(),600);}});
$("bSet").addEventListener("change",async ev=>{const f=ev.target.closest("[data-srest]");if(!f||!f.files||!f.files[0])return;const m=await restorePassport(f.files[0]);$("bSetMsg").textContent=m||"Restored ✓";setStats();f.value="";});
$("bInfoBtn").onclick=()=>{trust();const d=$("bInfo");if(d.showModal)d.showModal();else d.setAttribute("open","");};
$("bInfo").addEventListener("click",ev=>{const d=$("bInfo");if(ev.target===d||ev.target.closest("[data-close]")){d.close?d.close():d.removeAttribute("open");}});

/* ---- map: dark street map + drive rings from your start point + "build your night" per venue ---- */
// price: ""|"free"|"u30"; age: ""|"all"|"21"; t: time slider step (0 = any time); route: draw My night; half: friend's spot for Meet halfway (never saved)
// pass: Passport map (stamped venues glow)
const MAPV={heat:false,vibe:"all",price:"",age:"",t:0,route:true,transit:false,half:null,pass:false,nv:null,only:false};
// nights you can show on the map: the one you're working on first, then your other saved nights (any with a mapped stop)
function mapNights(){if(!window.NIGHT)return [];const id=NIGHT.id,has=p=>p&&(p.s||[]).some(x=>typeof x.la==="number");
  const xs=[{id,p:NIGHT.plan},...(NIGHT.allNights?NIGHT.allNights():[]).filter(x=>x.id!==id)];return xs.filter(x=>has(x.p));}
function routeNight(){const xs=mapNights();return xs.find(x=>x.id===MAPV.nv)||xs[0]||null;}
const routeStops=()=>{const n=routeNight();return n?(n.p.s||[]).filter(x=>typeof x.la==="number"):[];};let LM=null,LMG=null,lfLoad=null,fitSig="",CUR=[];
function loadLeaflet(){if(window.L)return Promise.resolve();if(lfLoad)return lfLoad;
  const l=document.createElement("link");l.rel="stylesheet";l.href="vendor/leaflet.css?v=1";document.head.appendChild(l);
  return lfLoad=new Promise((res,rej)=>{const sc=document.createElement("script");sc.src="vendor/leaflet.js?v=1";sc.onload=res;sc.onerror=()=>{lfLoad=null;rej();};document.head.appendChild(sc);});}
const RINGS=[[15,"#7ee0b8"],[30,"#FFC66B"],[60,"#FF6FA5"]];
const ringM=m=>(m-6)*55/60/1.2*1609.34;            // inverse of driveEstimate()
const vibeOf=e=>VIBES.find(v=>GROUPS[v.k].has(e.kind));
function miles(a,b,c,d){return SH.miles(a,b,c,d);}
/* ---- map extras: filters, time slider, starred/followed pins, clusters, My night route, Meet halfway, transit ---- */
const estMin=(a,b,c,d)=>SH.driveMin(SH.roadMi(a,b,c,d));   // same rough formula as driveEstimate()
function startMin(e){return SH.minOfText(e.time);}   // minutes after midnight; 1 AM counts as 25:00
const tMin=()=>MAPV.t?18*60+(MAPV.t-1)*30:null;   // slider steps: 6 PM, 6:30 … 2 AM
const tLbl=v=>{if(!v)return "Any time";const m=18*60+(v-1)*30,h=Math.floor(m/60)%24,mm=m%60;return (h%12||12)+(mm?":"+String(mm).padStart(2,"0"):"")+(h<12?" AM":" PM");};
const evOn=(e,T)=>{const s=startMin(e);return s!=null&&s<=T&&T<s+180;};   // a show "is on" from its start for about 3 hours
function passF(e){const pi=priceInfo(e);
  if(MAPV.price==="free"&&!pi.free)return false;
  if(MAPV.price==="u30"&&!(pi.free||(!pi.none&&!pi.sold&&pi.lo!=null&&pi.lo<=30)))return false;
  const a=ageOf(e);if(MAPV.age==="all"&&!(a==="all"||(!a&&likelyAllAges(e))))return false;if(MAPV.age==="21"&&a!=="21+")return false;return true;}
function mapGroups(){const g={};(state._up||[]).forEach(e=>{if(typeof e.lat!=="number"||!inWhen(e)||!passF(e))return;if(MAPV.vibe!=="all"&&!GROUPS[MAPV.vibe].has(e.kind))return;
  const k=venueKey(e);(g[k]=g[k]||{k,lat:e.lat,lon:e.lon,evs:[]}).evs.push(e);});
  return Object.values(g).map(x=>{x.evs.sort((a,b)=>a.start.localeCompare(b.start));const cnt={};x.evs.forEach(e=>{const v=vibeOf(e);if(v)cnt[v.k]=(cnt[v.k]||0)+1;});
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];x.v=VIBES.find(v=>top&&v.k===top[0])||VIBES[0];x.d=driveEstimate(x.lat,x.lon);return x;});}
// the same neon line icons as the home tiles, for map chips, pins and the venue sheet
const vIcon=(v,cls="bmc-ic")=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" style="--ic:${v.c}">${v.icon}</svg>`;
function drawMapUI(){
  $("bMapChips").innerHTML=`<button type="button" class="chip" data-mv="all" aria-pressed="${MAPV.vibe==="all"}">All</button>`+VIBES.map(v=>`<button type="button" class="chip bmc" data-mv="${v.k}" style="--vc:${v.c}" aria-pressed="${MAPV.vibe===v.k}">${vIcon(v)}${v.name.split(" & ")[0]}</button>`).join("")
    +(window.NIGHT?NIGHT.chip():"");   // pool lives inside 🌙 Afters now
  const stops=routeStops();
  // My night leads the row (before Free) so your route is one tap away
  $("bMapTools").innerHTML=(stops.length?`<button type="button" class="chip bmt bmt-route" data-mroute aria-pressed="${MAPV.route}">${ni("pin")} My night</button>`:"")
    +[["price","free","Free"],["price","u30","Under $30"],["age","all","All ages"],["age","21","21+"]].map(([k,v,l])=>`<button type="button" class="chip bmt" data-mf="${k}:${v}" aria-pressed="${MAPV[k]===v}">${l}</button>`).join("")
    +`<button type="button" class="chip bmt" data-mhalf aria-pressed="${!!MAPV.half}">↔︎ Meet halfway</button>`
    +`<button type="button" class="chip bmt" data-mtransit aria-pressed="${MAPV.transit}">${ni("train")} Transit</button>`
    +`<button type="button" class="chip bmt" data-mheat aria-pressed="${MAPV.heat}">🔥 Tonight heatmap</button>`
    +`<button type="button" class="chip bmt bmt-pass" data-mpass aria-pressed="${MAPV.pass}">${ni("ticket")} Passport${MAPV.pass?` · ${BEEN.size} stamped`:""}</button>`;
  const tr=$("bMapTime");tr.querySelector("input").value=MAPV.t;tr.querySelector("b").textContent=tLbl(MAPV.t);lateNote();
  $("bMapStart").hidden=!!origin;
  loadLeaflet().then(drawMap).catch(()=>{$("bMapCanvas").innerHTML='<p class="bmap-err">The map couldn\'t load. Check your connection and tap Map again.</p>';});}
function drawMap(){const L=window.L;
  if(!LM){LM=L.map("bMapCanvas",{zoomControl:false,attributionControl:true,tap:true}).setView([33.82,-117.9],9);
    L.control.zoom({position:"topright"}).addTo(LM);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,className:"bmap-tiles",
      attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(LM);
    LM.attributionControl.setPrefix(false);
    LMG={rings:L.layerGroup().addTo(LM),transit:L.layerGroup().addTo(LM),pool:L.layerGroup().addTo(LM),heat:L.layerGroup().addTo(LM),pins:L.layerGroup().addTo(LM),half:L.layerGroup().addTo(LM),route:L.layerGroup().addTo(LM)};
    LM.on("click",closeSheet);LM.on("zoomend",()=>{drawPins();drawTransit();drawRoute();});LM.on("moveend",()=>{if(MAPV.transit)drawTransit();});}
  setTimeout(()=>LM.invalidateSize(),0);
  const groups=mapGroups(),hasO=origin&&typeof origin.lat==="number";
  LMG.rings.clearLayers();LMG.pins.clearLayers();LMG.pool.clearLayers();
  loadStations();
  if(hasO){RINGS.forEach(([m,c])=>{const r=ringM(m);
      L.circle([origin.lat,origin.lon],{radius:r,color:c,weight:1.5,dashArray:"5 7",fillColor:c,fillOpacity:.035,interactive:false,className:"bring"}).addTo(LMG.rings);
      L.marker([origin.lat+r/111320,origin.lon],{interactive:false,keyboard:false,icon:L.divIcon({className:"bring-l",html:`<span style="--rc:${c}">${m} min</span>`,iconSize:[60,18],iconAnchor:[30,9]})}).addTo(LMG.rings);});
    L.marker([origin.lat,origin.lon],{interactive:false,keyboard:false,zIndexOffset:900,icon:L.divIcon({className:"bmaphome",html:'<span></span>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(LMG.rings);}
  CUR=groups.sort((a,b)=>a.evs.length-b.evs.length);drawHeat();drawPins();drawRoute();routeCost();drawTransit();drawHalf();
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
// pins: starred shows glow brighter (★), followed venues get an outer ring, the time slider dims venues with nothing on,
// and below street zoom, venues closer than ~38px share one numbered bubble (tap it to zoom in)
function drawPins(){const L=window.L;if(!LM||!L||!LMG)return;LMG.pins.clearLayers();if(MAPV.route&&MAPV.only&&routeStops().length)return;
  const hasO=origin&&typeof origin.lat==="number",T=tMin(),z=LM.getZoom();
  CUR.forEach(g=>{g.star=g.evs.some(e=>state.stars.has(skey(e)));g.fol=isPinned(g.k);g.on=T==null||g.evs.some(e=>evOn(e,T));g.fair=false;
    g.stamp=MAPV.pass&&BEEN.has(g.k);if(MAPV.pass&&!g.stamp)g.on=false;});
  if(MAPV.half&&hasO){CUR.forEach(g=>{g.ya=estMin(origin.lat,origin.lon,g.lat,g.lon);g.fb=estMin(MAPV.half.lat,MAPV.half.lon,g.lat,g.lon);});
    CUR.slice().sort((a,b)=>Math.max(a.ya,a.fb)-Math.max(b.ya,b.fb)||Math.abs(a.ya-a.fb)-Math.abs(b.ya-b.fb)).slice(0,8).forEach(g=>g.fair=true);}
  const cells=[];
  if(z<13){const used=new Set(),pts=CUR.map(g=>LM.latLngToLayerPoint([g.lat,g.lon]));
    const solo=g=>g.fair||g.stamp;   // Meet-halfway picks and stamped venues always get their own pin
    CUR.forEach((g,i)=>{if(used.has(i))return;used.add(i);const c=[g];if(!solo(g))CUR.forEach((h,j)=>{if(!used.has(j)&&!solo(h)&&pts[i].distanceTo(pts[j])<38){used.add(j);c.push(h);}});cells.push(c);});}
  else CUR.forEach(g=>cells.push([g]));
  cells.forEach(c=>{if(c.length===1)return pin(c[0],hasO);
    const n=c.reduce((s,g)=>s+g.evs.length,0),lat=c.reduce((s,g)=>s+g.lat,0)/c.length,lon=c.reduce((s,g)=>s+g.lon,0)/c.length;
    const cnt={};c.forEach(g=>cnt[g.v.k]=(cnt[g.v.k]||0)+g.evs.length);const v=VIBES.find(x=>x.k===Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0])||VIBES[0];
    const sz=Math.round(36+Math.min(14,Math.sqrt(n)*1.6)),st=c.some(g=>g.star),on=c.some(g=>g.on);
    const mk=L.marker([lat,lon],{title:`${c.length} venues, ${n} shows. Tap to zoom in.`,zIndexOffset:st?400:0,icon:L.divIcon({className:"bpin-w"+(on?"":" dim"),
      html:`<span class="bclu${st?" star":""}" style="--pc:${v.c};--ps:${sz}px"><b>${n}</b><small>${c.length} spots</small></span>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]})});
    mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);LM.flyToBounds(L.latLngBounds(c.map(g=>[g.lat,g.lon])).pad(.35),{maxZoom:14,duration:.5});});mk.addTo(LMG.pins);});}
function pin(g,hasO){const L=window.L,n=g.evs.length,sz=Math.round(26+Math.min(10,Math.sqrt(n)*3)),far=hasO&&g.d&&g.d.mins>60&&!g.fair;
  const mk=L.marker([g.lat,g.lon],{title:`${g.k.split(" · ")[0]}: ${n} show${n>1?"s":""}`,riseOnHover:true,zIndexOffset:g.fair?800:g.star?500:g.fol?300:0,
    icon:L.divIcon({className:"bpin-w"+(far?" far":"")+(g.on?"":" dim"),html:`<span class="bpin${g.star?" star":""}${g.fol?" fol":""}${g.fair?" fair":""}${g.stamp?" stamp":""}" style="--pc:${g.v.c};--ps:${sz}px">${vIcon(g.v,"bpin-ic")}${n>1?`<b>${n}</b>`:""}${g.star?'<i class="bpin-star">★</i>':""}</span>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]})});
  mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);openSheet(g);});mk.addTo(LMG.pins);}
// My night: the Night Card's stops in order, joined by a dashed neon line with a rough drive time on each leg
// tonight heatmap: every show on tonight (ignores the other filters) as soft stacked glows, so busy pockets light up
function drawHeat(){const L=window.L;if(!LMG||!LMG.heat)return;LMG.heat.clearLayers();if(!MAPV.heat||MAPV.route&&MAPV.only&&routeStops().length)return;const r=dayRange("tonight");if(!r)return;
  const g={};(state._up||[]).forEach(e=>{if(typeof e.lat!=="number"||!(e.start<=r[1]&&(e.end||e.start)>=r[0]))return;const k=e.lat.toFixed(3)+","+e.lon.toFixed(3);(g[k]=g[k]||{la:e.lat,lo:e.lon,n:0}).n++;});
  Object.values(g).forEach(p=>[[2600,.07],[1500,.1],[700,.16]].forEach(([rad,op],j)=>L.circle([p.la,p.lo],{radius:rad*(1+Math.min(1.5,Math.sqrt(p.n)*.35)),stroke:false,fillColor:j===2?"#FFE08A":j?"#FF8A5C":"#FF6FA5",fillOpacity:op,interactive:false,className:"bheat"}).addTo(LMG.heat)));}
// real roads: google.js (SHACK_ROUTE) finds the driving path + time per leg; until it answers (or if it can't) the legs are straight dashed lines
function routePts(){const s=routeStops(),hasO=origin&&typeof origin.lat==="number";return [...(hasO?[[origin.lat,origin.lon]]:[]),...s.map(x=>[x.la,x.lo])];}
function routeWhen(){const n=routeNight();if(!n||!n.p.d)return 0;const t=(n.p.s||[]).map(x=>x.tm).find(Boolean)||"19:00",[h,m]=t.split(":").map(Number);
  const d=parseDay(n.p.d);d.setHours(h<5?h+24:h,m||0,0,0);return d.getTime();}
function drawRoute(fit){const L=window.L;if(!LMG)return;LMG.route.clearLayers();if(!MAPV.route||!window.NIGHT)return;
  const s=routeStops();if(!s.length)return;
  const pts=routePts(),R=window.SHACK_ROUTE,road=pts.length>1&&R?R.cached(pts):null;
  if(pts.length>1&&!road&&R){const key=JSON.stringify(pts);R.get(pts,routeWhen()).then(v=>{if(v&&JSON.stringify(routePts())===key){drawRoute(false);routeCost();}});}
  if(road)road.legs.forEach(l=>{if(l.line.length>1){L.polyline(l.line,{color:"#FFC66B",weight:9,opacity:.18,interactive:false}).addTo(LMG.route);L.polyline(l.line,{color:"#FFC66B",weight:3.5,opacity:.95,lineCap:"round",lineJoin:"round",className:"broute broad",interactive:false}).addTo(LMG.route);}});
  else if(pts.length>1)L.polyline(pts,{color:"#FFC66B",weight:3,opacity:.9,dashArray:"1 9",lineCap:"round",className:"broute",interactive:false}).addTo(LMG.route);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],lg=road&&road.legs[i-1],m=lg?lg.min:estMin(a[0],a[1],b[0],b[1]);
    // legs too short to fit a label at this zoom skip it (zoom in and it comes back), so stops never hide under labels
    if(!fit&&LM.latLngToLayerPoint(a).distanceTo(LM.latLngToLayerPoint(b))<150)continue;
    const rf=NIGHT.rideFare?NIGHT.rideFare(lg?lg.mi:miles(a[0],a[1],b[0],b[1])*1.2):null;
    const at=lg&&lg.line.length>1?lg.line[Math.floor(lg.line.length/2)]:[(a[0]+b[0])/2,(a[1]+b[1])/2];
    L.marker(at,{interactive:false,keyboard:false,icon:L.divIcon({className:"brt-w",html:`<span class="brt-leg">${lg?"":"~"}${fmtMins(m)}${rf?` · 🚕 $${rf[0]}–${rf[1]}`:""}</span>`,iconSize:[130,18],iconAnchor:[65,9]})}).addTo(LMG.route);}
  s.forEach((x,i)=>L.marker([x.la,x.lo],{title:`${i+1}. ${x.n}`,zIndexOffset:1000,icon:L.divIcon({className:"brt-w",html:`<span class="brt">${i+1}</span>`,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(LMG.route));
  if(fit){const all=road?[].concat(pts,...road.legs.map(l=>l.line)):pts;LM.flyToBounds(L.latLngBounds(all),{maxZoom:15,duration:.5,paddingTopLeft:[40,90],paddingBottomRight:[40,110]});}}
// cost of getting around My night: rideshare for every leg (incl. home) vs driving (gas) + typical parking at the show
function routeCost(){const el=$("bMapRoute");if(!el)return;const s=routeStops();
  if(!MAPV.route||!s.length||!NIGHT.rideFare){el.hidden=true;const f=$("bMapNv");if(f)f.hidden=true;return;}
  const hasO=origin&&typeof origin.lat==="number",pts=[...(hasO?[[origin.lat,origin.lon]]:[]),...s.map(x=>[x.la,x.lo]),...(hasO?[[origin.lat,origin.lon]]:[])];
  const road=window.SHACK_ROUTE?SHACK_ROUTE.cached(routePts()):null;   // real road miles for the legs we have (the ride home stays an estimate)
  let mi=0,lo=0,hi=0;for(let i=1;i<pts.length;i++){const lg=road&&road.legs[i-1],m=lg?lg.mi:miles(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1])*1.2;mi+=m;if(m>=.5){const f=NIGHT.rideFare(m);lo+=f[0];hi+=f[1];}}
  const ppl=Math.max(1,+(state.carLink||state.car||1)),gas=mi/(state.mpg||25)*(state.gas||5.85);
  const sh=s.find(x=>x.k==="show"),e=sh&&(state._up||[]).find(x=>x.title===sh.n),pk=e?(PARK[tier(e)]??15):0;
  const late=s.some(x=>x.tm&&+x.tm.slice(0,2)>=22||x.tm&&+x.tm.slice(0,2)<4);
  const xs=mapNights(),cur=routeNight(),ix=Math.max(0,xs.findIndex(x=>x.id===cur.id)),nd=cur.p.d?parseDay(cur.p.d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):"No date";
  const nav=`<div class="bmr-nav">${xs.length>1?`<button type="button" data-mnv="-1" aria-label="Previous night">‹</button>`:""}<span><b>${esc(cur.p.t||(cur.id===NIGHT.id?"The night you're planning":"A saved night"))}</b><small>${esc(nd)} · ${s.length} stop${s.length===1?"":"s"}${xs.length>1?` · ${ix+1} of ${xs.length}`:""}${cur.id===NIGHT.id?" · planning now":""}</small></span>${xs.length>1?`<button type="button" data-mnv="1" aria-label="Next night">›</button>`:""}</div>
    <button type="button" class="chip bmr-only" data-monly aria-pressed="${MAPV.only}">${MAPV.only?"Showing only this night · show everything":"Show only this night"}</button>`;
  // the same switcher floats on the map itself, so you can flip nights and watch the route change
  let fl=$("bMapNv");if(!fl){fl=document.createElement("div");fl.id="bMapNv";fl.className="bmap-nv";$("bMapCanvas").after(fl);fl.addEventListener("click",ev=>{ev.stopPropagation();mapNvClick(ev);});}
  fl.hidden=false;fl.innerHTML=(xs.length>1?`<button type="button" data-mnv="-1" aria-label="Previous night">‹</button>`:"")+`<span><b>${esc(cur.p.t||(cur.id===NIGHT.id?"The night you're planning":"A saved night"))}</b><small>${esc(nd)}${xs.length>1?` · ${ix+1}/${xs.length}`:""}</small></span>`+(xs.length>1?`<button type="button" data-mnv="1" aria-label="Next night">›</button>`:"")+`<button type="button" data-monly aria-pressed="${MAPV.only}" class="bmap-nv-only">${MAPV.only?"Only this night":"All shows"}</button>`;
  el.hidden=false;el.innerHTML=nav+`<b>${ni("pin")} My night · ${Math.round(mi)} mi${hasO?" round trip":" between stops"}</b>
    <span>🚗 Drive: gas ~$${gas.toFixed(0)}${pk?` + parking ~$${pk}${e?` at ${esc(e.venue)}`:""}`:""} = <b>$${Math.round(gas+pk)}</b>${ppl>1?` ($${Math.round((gas+pk)/ppl)} each for ${ppl})`:""}</span>
    <span>🚕 Rideshare every leg: <b>$${lo}–${hi}</b>${ppl>1?` ($${Math.round(lo/ppl)}–${Math.round(hi/ppl)} each if you share)`:""}</span>
    ${late&&MAPV.transit?`<span class="bmr-warn">🌙 Taking the train home? ${esc(NIGHT.LASTTRAIN.Metro)}. Metrolink and Coaster are usually done by evening.</span>`:""}
    <small>${road?`Drive times follow real roads (${road.src==="google"?"Google, with typical traffic for that night":"OpenStreetMap routing, no live traffic"})`:"Rough estimates: straight-line miles"}, typical parking for the venue's size, rideshare before surge.</small>`;}
// Meet halfway: your start point + a friend's spot (kept only while the page is open) → the 8 venues that are fairest for both
function drawHalf(){const L=window.L;if(!LMG)return;LMG.half.clearLayers();if(!MAPV.half)return;
  L.marker([MAPV.half.lat,MAPV.half.lon],{interactive:false,keyboard:false,zIndexOffset:900,icon:L.divIcon({className:"bmaphome bfriend",html:'<span></span>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(LMG.half);}
function halfList(){const fair=CUR.filter(g=>g.fair).sort((a,b)=>Math.max(a.ya,a.fb)-Math.max(b.ya,b.fb)||Math.abs(a.ya-a.fb)-Math.abs(b.ya-b.fb));
  sheetOpen(`<div class="bms-h" style="--pc:#7ee0b8"><i></i><div><b>Fair for both of you</b><span>From your start and ${esc(MAPV.half.label||"your friend")} · rough drive times</span></div></div>
    <div class="bms-list">${fair.map(g=>`<button type="button" class="bms-row bhalf-row" data-hk="${esc(g.k)}"><b>${esc(g.k.split(" · ")[0])}</b><span class="bms-d">${esc(g.k.split(" · ")[1]||"")} · ${g.evs.length} show${g.evs.length>1?"s":""}</span><span class="bms-p">You ~${fmtMins(g.ya)} · Them ~${fmtMins(g.fb)}</span></button>`).join("")||'<p class="bms-more">No venues match the current filters.</p>'}</div>
    <div class="bms-night"><button type="button" data-hclear>Clear friend's spot</button></div>`);
  const sh=$("bMapSheet");sh.querySelectorAll("[data-hk]").forEach(b=>b.onclick=()=>{const g=CUR.find(x=>x.k===b.dataset.hk);if(g){LM.setView([g.lat,g.lon],14);openSheet(g);}});
  sh.querySelector("[data-hclear]").onclick=()=>{MAPV.half=null;closeSheet();drawMapUI();};}
function halfForm(){if(!(origin&&typeof origin.lat==="number")){sheetOpen(`<div class="bms-h" style="--pc:#7ee0b8"><i></i><div><b>Meet halfway</b><span>Set your own start point first</span></div></div><div class="bms-night"><button type="button" data-hstart>📍 Set start point</button></div>`);
    $("bMapSheet").querySelector("[data-hstart]").onclick=()=>$("bMapStart").click();return;}
  sheetOpen(`<div class="bms-h" style="--pc:#7ee0b8"><i></i><div><b>Meet halfway</b><span>Where is your friend coming from? It stays on this screen and isn't saved.</span></div></div>
    <form class="bhalf-f"><input type="text" id="bHalfIn" placeholder="City or address, e.g. Pasadena" autocomplete="off" aria-label="Friend's city or address"><button type="submit">Find</button></form><p class="bms-more" id="bHalfMsg"></p>`);
  const f=$("bMapSheet").querySelector("form");f.onsubmit=async ev=>{ev.preventDefault();const t=$("bHalfIn").value.trim();if(!t)return;$("bHalfMsg").textContent="Finding that spot…";
    const g=typeof geocode==="function"?await geocode(t):null;if(!g){$("bHalfMsg").textContent="Couldn't place that. Try a city name.";return;}
    MAPV.half={lat:g.lat,lon:g.lon,label:g.label||t};drawMapUI();setTimeout(()=>{halfList();const fair=CUR.filter(x=>x.fair);
      LM.flyToBounds(L.latLngBounds([[origin.lat,origin.lon],[g.lat,g.lon],...fair.map(x=>[x.lat,x.lon])]).pad(.15),{maxZoom:12,duration:.5});},150);};
  setTimeout(()=>{const i=$("bHalfIn");if(i)i.focus();},50);}
// Transit: rail stations from OpenStreetMap (stations.json), colored by system; the venue sheet names the nearest one
let STA=null,staLoad=null;const SYS={Metro:"#FF8A5C",Metrolink:"#7FD4FF",Trolley:"#FF6B6B",NCTD:"#7EE0B8",Amtrak:"#B48CFF"};
const TRAIN='<path d="M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z"/><path d="M5 10h14M9 14h.01M15 14h.01M8 21l2-4M16 21l-2-4"/>';
function loadStations(){if(STA||staLoad)return;staLoad=fetch("stations.json?v=1").then(r=>r.ok?r.json():{}).then(j=>{STA=(j&&j.stations)||[];if(MAPV.transit)drawTransit();}).catch(()=>{staLoad=null;});}
function drawTransit(){const L=window.L;if(!LMG)return;LMG.transit.clearLayers();if(!MAPV.transit||!STA)return;
  const z=LM.getZoom(),tb=$("bMapTools").querySelector("[data-mtransit]");if(tb)tb.lastChild.textContent=z<11?" Transit (zoom in)":" Transit";
  if(z<11)return;   // zoomed out, 243 stations would bury the venue pins
  const bb=LM.getBounds().pad(.2);
  STA.forEach(s=>{if(!bb.contains([s.lat,s.lon]))return;const c=SYS[s.s]||"#cfc6e8";const mk=L.marker([s.lat,s.lon],{title:`${s.n} (${s.s})`,zIndexOffset:-1000,icon:L.divIcon({className:"bsta-w",html:`<span class="bsta" style="--ic:${c}"><svg viewBox="0 0 24 24" aria-hidden="true">${TRAIN}</svg></span>`,iconSize:[20,20],iconAnchor:[10,10]})});
    mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);const q=encodeURIComponent(s.n+" station");
      sheetOpen(`<div class="bms-h" style="--pc:${c}"><i></i><div><b>${esc(s.n)}</b><span>${esc(s.s)}${s.l?" · "+esc(s.l):""}</span></div></div>
        <p class="bms-more bms-late">🌙 Last train home: ${esc((window.NIGHT&&NIGHT.LASTTRAIN&&NIGHT.LASTTRAIN[s.s])||"trains can stop early at night")}. Check the last one on the agency's site before you go.</p>
        <div class="bms-night"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=transit" target="_blank" rel="noopener">🚆 Transit directions</a></div>`);});
    mk.addTo(LMG.transit);});}
function walkScore(lat,lon){if(typeof lat!=="number")return null;const W=.27;
  const A=window.NIGHT&&NIGHT.ready()?NIGHT.spots():[],near=A.filter(p=>miles(lat,lon,p.lat,p.lon)<=W);
  const food=near.filter(p=>NIGHT.grp(p)==="food"),aft=near.filter(p=>NIGHT.grp(p)==="after"),late=near.filter(p=>p.til>=24).length;
  const st=STA?STA.find(s=>miles(lat,lon,s.lat,s.lon)<=.45):null;
  const vens=new Set((state._up||[]).filter(e=>typeof e.lat==="number"&&miles(lat,lon,e.lat,e.lon)<=W).map(venueKey)).size-1;
  const score=Math.min(100,Math.min(40,food.length*8)+Math.min(25,aft.length*9)+(st?20:0)+Math.min(10,Math.max(0,vens)*5)+(late?5:0));
  const word=score>=70?"Great on foot":score>=40?"Some walkable":score>=15?"A little nearby":"Car night";
  return {score,word,food:food.length,aft:aft.length,late,st,vens:Math.max(0,vens)};}
const walkHtml=w=>w?`<div class="bwalk" style="--ws:${w.score}%"><b>🚶 Walk score ${w.score}<small>/100 · ${esc(w.word)}</small></b><span>Within a 5-min walk: ${w.food} food · ${w.aft} afters${w.late?` (${w.late} open past midnight)`:""}${w.vens?` · ${w.vens} other venue${w.vens>1?"s":""}`:""}${w.st?` · 🚆 ${esc(w.st.n)}`:""}</span></div>`:"";
function nearSta(lat,lon){if(!STA)return null;let b=null;STA.forEach(s=>{const mi=miles(lat,lon,s.lat,s.lon);if(mi<=1.5&&(!b||mi<b.mi))b={s,mi};});return b;}
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
  sheetOpen(`<div class="bms-h bms-hic" style="--pc:${g.v.c}">${vIcon(g.v,"bms-ic")}<div><b>${esc(name)}</b><span>${esc(city)}${g.d?` · ${g.d.real?"":"~"}${fmtMins(g.d.mins)} · ${g.d.miles} mi${g.d.real?" by road":""}`:""}</span></div><button type="button" class="bms-fol${fol?" on":""}" data-mfol="${esc(g.k)}" aria-pressed="${fol}">${ni("bell")} ${fol?"Following":"Follow"}</button></div>
    <div class="gplace" data-gq="${esc(name+", "+city)}"></div>
    ${walkHtml(walkScore(g.lat,g.lon))}
    <div class="bms-list">${rows}${more}</div>
    <h3 class="bms-sub">Build your night here</h3>
    ${window.NIGHT&&NIGHT.nightAt?`<button type="button" class="bms-build" data-mbuild="1">🌙 Build a night here <small>food → ${esc(String((g.evs.find(inWhen)||g.evs[0]).title).slice(0,28))} → afters</small></button>`:""}
    <div class="bms-night">${near("restaurants","Eat before","🍜")}${near("bars","Drinks after","🍸")}${near("parking","Parking","🅿️")}<a href="${dir}" target="_blank" rel="noopener">🧭 Directions</a></div>
    ${(()=>{const ns=nearSta(g.lat,g.lon),pk=((VOPEN[name]||{}).w||[])[0];return ns||pk?`<div class="bms-go">${ns?`<p><b style="color:${SYS[ns.s.s]||"#cfc6e8"}">🚆 ${esc(ns.s.n)}</b> · ${esc(ns.s.s)} · ${ns.mi<.3?"steps away":ns.mi.toFixed(1)+" mi"}</p>`:""}${pk?`<p>🅿️ ${esc(pk)}</p>`:""}</div>`:"";})()}
    ${pools.length?`<div class="bms-pool">${pools.map(({p,mi})=>`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">${NEON8}<span><b>${esc(p.n)}</b><small>${mi<1?"under a mile":mi.toFixed(1)+" mi"} away · ${p.c==="hall"?"pool hall":"bar with pool"}</small></span></a>`).join("")}</div>`:""}`);
  const fb=$("bMapSheet").querySelector("[data-mfol]");if(fb)fb.onclick=()=>{const k=fb.dataset.mfol,on=!isPinned(k);if(on)markSeen(k);togglePin(k);fb.classList.toggle("on",on);fb.setAttribute("aria-pressed",String(on));fb.innerHTML=ni("bell")+(on?" Following":" Follow");syncFollowDot();
    if(!on)undoToast(`Unfollowed ${k.split(" · ")[0]}`,()=>{togglePin(k);markSeen(k);fb.classList.add("on");fb.setAttribute("aria-pressed","true");fb.innerHTML=ni("bell")+" Following";syncFollowDot();});};
  $("bMapSheet").querySelectorAll("[data-card]").forEach(b=>b.onclick=()=>{state.when="any";state.view="list";openResults("all");openCard(b.dataset.card);});
  const bb=$("bMapSheet").querySelector("[data-mbuild]");if(bb)bb.onclick=()=>NIGHT.nightAt(g.evs.find(inWhen)||g.evs[0]);
  if(window.NIGHT)NIGHT.sheet(g);}
function openPool(p){const d=driveEstimate(p.lat,p.lon);
  sheetOpen(`<div class="bms-h" style="--pc:#ff6fe0"><i></i><div><b>${esc(p.n)}</b><span>${esc(p.city)} · ${p.c==="hall"?"pool hall":"bar with pool"}${d?` · ~${fmtMins(d.mins)}`:""}</span></div></div>
    ${(p.t||[]).length?`<p class="bms-more">${p.t.map(esc).join(" · ")}</p>`:""}
    <div class="bms-night"><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">🧭 Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+", "+p.a+", "+p.city+", CA")}" target="_blank" rel="noopener">🕘 Hours</a></div>`);}
$("bMapChips").addEventListener("click",ev=>{const b=ev.target.closest("[data-mv]");if(b){MAPV.vibe=b.dataset.mv;closeSheet();drawMapUI();return;}
  if(ev.target.closest("[data-mpool]")){state.poolOn=!state.poolOn;savePrefs();drawMapUI();}});
// second row: price + age filters, My night route, Meet halfway, Transit; then the time-of-night slider
$("bMapChips").insertAdjacentHTML("afterend",`<div class="bmap-chips bmap-tools" id="bMapTools"></div>
  <div class="bmap-timew"><label class="bmap-time" id="bMapTime"><span>${ni("moon")} What's on at</span><input type="range" min="0" max="17" step="1" value="0" aria-label="Time of night"><b>Any time</b></label><button type="button" class="chip bmap-now" id="bMapNow">Now</button></div>`);
$("bMapTools").addEventListener("click",ev=>{const f=ev.target.closest("[data-mf]");
  if(f){const [k,v]=f.dataset.mf.split(":");MAPV[k]=MAPV[k]===v?"":v;closeSheet();drawMapUI();return;}
  if(ev.target.closest("[data-mroute]")){MAPV.route=!MAPV.route;MAPV.only=MAPV.route;closeSheet();routeCost();drawMapUI();setTimeout(()=>drawRoute(MAPV.route),120);return;}
  if(ev.target.closest("[data-mhalf]")){if(MAPV.half){MAPV.half=null;closeSheet();drawMapUI();}else halfForm();return;}
  if(ev.target.closest("[data-mtransit]")){MAPV.transit=!MAPV.transit;loadStations();drawMapUI();return;}
  if(ev.target.closest("[data-mpass]")){MAPV.pass=!MAPV.pass;closeSheet();drawMapUI();return;}
  if(ev.target.closest("[data-mheat]")){MAPV.heat=!MAPV.heat;if(MAPV.heat&&state.when!=="tonight"){state.when="tonight";savePrefs();render();}else drawMapUI();}});
// My night panel under the map: flip through your nights (‹ ›) and show only the one you're looking at
const mapNvClick=ev=>{const nb=ev.target.closest("[data-mnv]"),ob=ev.target.closest("[data-monly]");if(!nb&&!ob)return;
  if(nb){const xs=mapNights();if(xs.length<2)return;const i=Math.max(0,xs.findIndex(x=>x.id===(routeNight()||{}).id));MAPV.nv=xs[(i+ +nb.dataset.mnv+xs.length)%xs.length].id;MAPV.only=true;}
  else MAPV.only=!MAPV.only;
  closeSheet();drawPins();drawHeat();routeCost();drawRoute(true);};
$("bMapRoute").addEventListener("click",mapNvClick);
// past ~10:30 PM with Transit on: a heads-up that most trains are about done
function lateNote(){let el=$("bMapLate");if(!el){el=document.createElement("p");el.id="bMapLate";el.className="bmap-late";$("bMapTime").closest(".bmap-timew").after(el);}
  const T=tMin();el.hidden=!(MAPV.transit&&T!=null&&T>=22*60+30);if(!el.hidden&&window.NIGHT&&NIGHT.LASTTRAIN)el.textContent=`🌙 Late for trains: ${NIGHT.LASTTRAIN.Metro}; ${NIGHT.LASTTRAIN.Trolley.toLowerCase()}. Metrolink and Coaster are usually done by evening. Line up a ride home.`;}
$("bMapTime").querySelector("input").addEventListener("input",ev=>{MAPV.t=+ev.target.value;$("bMapTime").querySelector("b").textContent=tLbl(MAPV.t);lateNote();
  window.MAPT=tMin();drawPins();if(window.NIGHT&&window.L&&LM)NIGHT.map(window.L,LM,sheetOpen);});
// "Now": jump the slider to the current half hour (before 6 PM it lands on 6 PM; after 2 AM it goes back to Any time)
$("bMapNow").onclick=()=>{const d=new Date();let m=d.getHours()*60+d.getMinutes();if(m<5*60)m+=24*60;
  const v=m<18*60?1:m>26*60?0:Math.min(17,Math.floor((m-18*60)/30)+1);const inp=$("bMapTime").querySelector("input");inp.value=v;inp.dispatchEvent(new Event("input"));
  if(state.when!=="tonight"&&v){state.when="tonight";savePrefs();render();}};
$("bMapStart").onclick=()=>{state.view="list";show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);};


/* ---- venues: what's playing first, a one-line personality, follow + new-show dots, passport, jump to map ---- */
let VQ="";const QUIET={};   // venue search text; venues.json spots with no listed shows (key → {c,ad,la,lo})
/* ---- Show passport extras: log (rating + note per stamp), badges, backup/restore. On this device, plus optional email sync (cloud.js). ---- */
const ld=(k,d)=>{try{return JSON.parse(SH.store.raw(k)||"null")||d;}catch(e){return d;}};
const PLOG=ld("shack-plog",{});let PASS=null;try{SH.store.del("shack-want");}catch(e){}
// past shows you've seen, per stamped venue: {venueKey: [{t:title, d:"YYYY-MM-DD", id}]}. Starred shows that already happened join in on their own.
const PSHOWS=ld("shack-pshows",{});let PSEL="",PALL=false;
const savePshows=()=>{try{SH.store.put("shack-pshows",JSON.stringify(PSHOWS));}catch(e){}};
function pastShows(k){const today=todayStr(),mine=(PSHOWS[k]||[]).map(x=>({...x,own:1}));
  const starred=Object.entries(starVen).filter(([sk,o])=>o&&o.v===k&&o.d<today&&state.stars.has(sk)).map(([sk,o])=>({t:o.t||"A show you starred",d:o.d,star:1,id:sk}));
  return [...mine,...starred.filter(x=>!mine.some(m=>m.d===x.d&&m.t===x.t))].sort((a,b)=>b.d.localeCompare(a.d));}
const NIMP=new Set(ld("shack-nimp",[]));
function importNights(){if(!window.NIGHT||!NIGHT.allNights)return;const today=todayStr();let ch=false;
  NIGHT.allNights().forEach(x=>{if(!x.p.d||x.p.d>=today)return;x.p.s.forEach((s,i)=>{if(s.k!=="show"||!s.p)return;const id="n:"+x.id+":"+i;if(NIMP.has(id))return;NIMP.add(id);ch=true;
    const parts=s.p.split(", "),city=parts.length>1?parts.pop():"",k=parts.join(", ")+" · "+city;if(!city)return;
    const a=PSHOWS[k]=PSHOWS[k]||[];if(!a.some(y=>y.d===x.p.d&&y.t===(s.n||"")))a.push({t:String(s.n||"A show from your night").slice(0,100),d:x.p.d,id});BEEN.add(k);});});
  if(ch){try{SH.store.put("shack-nimp",JSON.stringify([...NIMP]));}catch(e){}savePshows();saveBeen();}}
const showCount=()=>[...BEEN].reduce((n,k)=>n+pastShows(k).length,0);
const savePlog=()=>{try{SH.store.put("shack-plog",JSON.stringify(PLOG));}catch(e){}};
function badges(infos){const bv=infos.filter(v=>BEEN.has(v.k)),n=BEEN.size,rg=new Set([...BEEN].map(regionOfK).filter(r=>r!=="Other")),cnt=f=>bv.filter(f).length;
  // a stamped venue counts as a festival / comedy / sound-bath (etc.) spot only when that's mostly what it hosts,
  // or when a show of that kind you starred there has happened. One festival on an arena's calendar doesn't make it a festival.
  const td=todayStr(),spot=kd=>v=>{const m=v.evs.filter(e=>e.kind===kd).length;return (m>0&&m*2>=v.evs.length)||Object.values(starVen).some(o=>o&&o.v===v.k&&o.kd===kd&&o.d<td);};
  // each badge: [icon, name, how to earn, how far you are, how far you need]. Locked ones show faded and fill up as you go.
  const st=streak().best,rep=Math.max(0,...[...BEEN].map(k=>pastShows(k).length)),nights=window.NIGHT&&NIGHT.allNights?NIGHT.allNights().filter(x=>x.p.d&&x.p.d<todayStr()).length:0;
  return [[ni("ticket"),"First stamp","Stamp 1 venue",n,1],[ni("chart"),"Regular","Stamp 10 venues",n,10],[ni("map"),"Region hopper","Stamps in 3 regions",rg.size,3],
    [ni("palm"),"All of SoCal","Stamps in all 6 regions",rg.size,6],[ni("sun"),"Desert trip","Stamp a desert venue",+rg.has("Desert"),1],
    [ni("home"),"Small & local","Stamp 5 small venues",cnt(v=>v.evs.some(isSmall)),5],[ni("venue"),"Big room","Stamp an arena or stadium",cnt(v=>(+v.cap||0)>6000||/arena|stadium|forum|bowl|dome/i.test(v.name)),1],
    [ni("mic"),"Comedy regular","Stamp 3 comedy clubs",cnt(spot("comedy")),3],[ni("list"),"Stub collector","Log 10 past shows",showCount(),10],
    ["🔥","On a roll","3 weeks in a row out",st,3],["🌋","Hot streak","8 weeks in a row out",st,8],
    ["⛺","First festival","Stamp a festival venue",cnt(spot("festival")),1],["🔔","Sound bath","Stamp a sound-bath space",cnt(spot("sound")),1],
    ["💃","Free mover","Stamp an ecstatic dance or contact improv space",cnt(v=>spot("dance")(v)||spot("contact")(v)),1],
    ["🥁","Drum circle","Stamp a drum circle",cnt(spot("drum")),1],["🤝","Community helper","Stamp a volunteer spot",cnt(spot("volunteer")),1],
    ["🎤","Open mic brave","Stamp 3 open-mic spots",cnt(spot("openmic")),3],["🔁","Repeat customer","Log 3 shows at one venue",rep,3],
    ["🌙","Night architect","Plan 3 nights that happened",nights,3],
    ["👥","Crew builder","Get 3 friends on the Shack (You → Friends)",+(SH.store.raw("shack-friends-n")||0),3]]
    .map(([ic,n2,how,have,need])=>({ic,n:n2,how,have:Math.min(have,need),need,on:have>=need}));}
// badges you earned since you last looked fill in with a little animation, once
const BSEEN=new Set(ld("shack-bseen",[]));
function badgeHtml(b){const fresh=b.on&&!BSEEN.has(b.n),p=b.on?1:b.have/b.need;
  return `<span class="bbadge${b.on?" on":""}${fresh?" fresh":""}" style="--bp:${p.toFixed(3)}" title="${esc(b.how)}"><i>${b.ic}</i><b>${esc(b.n)}</b><small>${esc(b.on?"Earned":b.need>1?`${b.have} of ${b.need} · ${b.how}`:b.how)}</small></span>`;}
function markBadgesSeen(bdg){let ch=false;bdg.forEach(b=>{if(b.on&&!BSEEN.has(b.n)){BSEEN.add(b.n);ch=true;}});if(ch)try{SH.store.put("shack-bseen",JSON.stringify([...BSEEN]));}catch(e){}}
// backup = a small JSON file you keep; restore merges it back in (nothing is uploaded anywhere)
function backupPassport(){const data={app:"show-shack-passport",v:3,saved:new Date().toISOString(),been:[...BEEN],starven:starVen,log:PLOG,shows:PSHOWS,nights:window.NIGHT&&NIGHT.allNights?NIGHT.allNights():[]};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));a.download=`show-passport-${todayStr()}.json`;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}
async function restorePassport(f){let msg="Restored ✓";
  try{const d=JSON.parse(await f.text());if(!d||d.app!=="show-shack-passport")throw new Error("not a passport file");
    const ok=k=>typeof k==="string"&&k.length<200;(d.been||[]).filter(ok).forEach(k=>BEEN.add(k));
    if(d.log&&typeof d.log==="object")for(const [k,o] of Object.entries(d.log))if(ok(k)&&o&&typeof o==="object")PLOG[k]={r:Math.min(5,Math.max(0,Math.round(+o.r||0))),n:String(o.n||"").slice(0,140)};
    if(d.starven&&typeof d.starven==="object")for(const [k,o] of Object.entries(d.starven))if(ok(k))starVen[k]=o;
    if(d.shows&&typeof d.shows==="object")for(const [k,a] of Object.entries(d.shows))if(ok(k)&&Array.isArray(a)){const have=PSHOWS[k]=PSHOWS[k]||[];
      a.filter(x=>x&&typeof x.t==="string"&&/^\d{4}-\d\d-\d\d$/.test(x.d||"")).slice(0,200).forEach(x=>{if(!have.some(h=>h.t===x.t&&h.d===x.d))have.push({t:x.t.slice(0,100),d:x.d,id:String(x.id||Math.random().toString(36).slice(2,9)).slice(0,20)});});}
    if(Array.isArray(d.nights)&&window.NIGHT&&NIGHT.mergeNights){const n=NIGHT.mergeNights(d.nights);if(n)msg=`Restored ✓ (+${n} night${n>1?"s":""})`;}
    saveBeen();saveWant();savePlog();savePshows();}catch(e){msg="That file isn't a Show passport backup";}
  prender();const box=document.querySelector("#bYouPass .bpass-acts");if(box)box.insertAdjacentHTML("beforeend",`<span class="bpass-msg">${esc(msg)}</span>`);return msg;}
const FSEEN=(()=>{try{return JSON.parse(SH.store.raw("shack-fseen")||"{}")||{};}catch(e){return {};}})();
const saveSeen=()=>{try{SH.store.put("shack-fseen",JSON.stringify(FSEEN));}catch(e){}};
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
/* ---- venue filter chips (like Food / Afters): one type, any number of quick toggles, one region ---- */
const VF={t:"",f:new Set(),rg:""};
const allAgesV=e=>{const a=ageOf(e);return a==="all"||(!a&&likelyAllAges(e));};
const VQF=[["fol",ni("bell")+" Following",v=>isPinned(v.k)],["been","✓ Been here",v=>BEEN.has(v.k)],
  ["small",ni("home")+" Small &amp; local",v=>v.evs.some(isSmall)],["free","Free shows",v=>v.evs.some(e=>priceInfo(e).free)],
  ["all","All ages",v=>v.evs.some(allAgesV)],["21","21+",v=>v.evs.some(e=>ageOf(e)==="21+")],["out",ni("sun")+" Open-air",v=>v.evs.some(isOutdoor)],
  ["acc",ni("hand")+" Access info",v=>!!(VOPEN[v.name]||{}).a],["crawl","🚶 Walkable crawl",v=>CRAWL.has(v.k)]];
// walkable crawl: venues with at least 3 other venues within ~0.4 mi (about an 8-minute walk)
let CRAWL=new Map();
function crawlCalc(infos){CRAWL=new Map();const pts=infos.filter(v=>typeof v.lat==="number");
  pts.forEach(v=>{const nb=pts.filter(w=>w!==v&&miles(v.lat,v.lon,w.lat,w.lon)<=.4);if(nb.length>=3)CRAWL.set(v.k,nb.map(w=>w.name));});}
const vfOn=()=>!!(VF.t||VF.f.size||VF.rg);
function vMatch(v,skip){if(skip!=="t"&&VF.t&&!v.evs.some(e=>GROUPS[VF.t].has(e.kind)))return false;
  if(skip!=="rg"&&VF.rg&&regionOfK(v.k)!==VF.rg)return false;
  for(const [k,,ok] of VQF)if(skip!==k&&VF.f.has(k)&&!ok(v))return false;return true;}
function vChips(infos){const n=f=>infos.filter(f).length;
  const typ=`<div class="bsubs bvf" role="group" aria-label="Venue type"><button type="button" class="chip" data-vft="" aria-pressed="${!VF.t}">All</button>`
    +VIBES.map(v=>{const c=n(x=>vMatch(x,"t")&&x.evs.some(e=>GROUPS[v.k].has(e.kind)));return `<button type="button" class="chip spchip bvfc" data-vft="${v.k}" style="--vc:${v.c}" aria-pressed="${VF.t===v.k}">${vIcon(v,"nic")}${esc(v.name)}<small>${c}</small></button>`;}).join("")+`</div>`;
  const quick=VQF.map(([k,l,ok])=>{const c=n(x=>vMatch(x,k)&&ok(x));return c||VF.f.has(k)?`<button type="button" class="chip" data-vff="${k}" aria-pressed="${VF.f.has(k)}">${l}<small>${c}</small></button>`:"";}).join("");
  const regs=REGIONS.filter(r=>r!=="Other").map(r=>{const c=n(x=>vMatch(x,"rg")&&regionOfK(x.k)===r);return c||VF.rg===r?`<button type="button" class="chip" data-vfr="${esc(r)}" aria-pressed="${VF.rg===r}">${esc(RABBR[r]||r)}<small>${c}</small></button>`:"";}).join("");
  return typ+`<div class="bsubs bvf bvf2" role="group" aria-label="Venue filters">${vfOn()?`<button type="button" class="chip bvf-x" data-vfx="1">✕ Clear</button>`:""}${quick}<i class="bvf-sep" aria-hidden="true"></i>${regs}</div>`;}
// quiet-venue nudge: remember (on this device) the last day each venue had shows listed
const VLAST=ld("shack-vlast",{});
// every venue the Shack knows: ones with shows listed, plus venues.json places that are quiet right now
// (withBeen: also stamped venues that are in neither, so the passport never loses a stamp)
function allInfos(withBeen){const keys=[...new Set((state._up||[]).filter(e=>e.kind!=="art"&&e.kind!=="volunteer").map(venueKey))];
  const named=new Set(keys.map(k=>k.split(" · ")[0]));
  const quietK=Object.entries(VOPEN).filter(([n,o])=>o&&o.c&&typeof o.la==="number"&&!named.has(n)).map(([n,o])=>{const k=n+" · "+o.c;QUIET[k]=o;return k;});
  const all=[...keys,...quietK];if(withBeen){const have=new Set(all);BEEN.forEach(k=>{if(!have.has(k))all.push(k);});}
  return all.map(k=>{const v=venueInfo(k),o=QUIET[k];if(o&&!v.evs.length){v.lat=o.la;v.lon=o.lo;v.drive=driveEstimate(o.la,o.lo);v.addr=o.ad;}return v;});}
renderVenues=function(){const list=$("list");loadStations();
  const infos=allInfos(),r=dayRange(state.when);
  infos.forEach(v=>{v.inR=r?v.evs.filter(e=>e.start<=r[1]&&(e.end||e.start)>=r[0]):v.evs;});
  {const t=todayStr();let ch=false;infos.forEach(v=>{if(v.evs.length&&VLAST[v.k]!==t){VLAST[v.k]=t;ch=true;}});if(ch)try{SH.store.put("shack-vlast",JSON.stringify(VLAST));}catch(e){}}
  const quietTag=v=>{if(v.evs.length){const nx=v.evs[0].start,dd=Math.round((parseDay(nx)-parseDay(todayStr()))/864e5);return dd>=42?`💤 Next show is ${Math.round(dd/7)} weeks out`:"";}
    const ls=VLAST[v.k];if(ls){const dd=Math.round((parseDay(todayStr())-parseDay(ls))/864e5);if(dd>=30)return `💤 No new shows in ${dd} days`;if(dd>=1)return `💤 Nothing listed since ${parseDay(ls).toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;}
    return "💤 Nothing listed right now";};
  const socials=v=>`https://www.google.com/search?q=${encodeURIComponent(v.name+" "+v.city+" instagram")}`;
  const byNext=(a,b)=>(a.inR[0]?.start||"9").localeCompare(b.inR[0]?.start||"9")||(a.drive?.mins??1e9)-(b.drive?.mins??1e9);
  const byDrive=(a,b)=>origin?((a.drive?.mins??1e9)-(b.drive?.mins??1e9))||byNext(a,b):byNext(a,b);
  const card=v=>{const n=v.inR[0]||v.evs[0],when=n?parseDay(n.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(n.time?" · "+String(n.time).replace(/\s*\(.*\)/,""):""):"";
    const fol=isPinned(v.k),nw=fol?newCount(v):0,been=BEEN.has(v.k);
    const prices=v.evs.map(priceInfo).filter(p=>p&&!p.sold&&!p.none&&p.lo!=null).map(p=>p.lo);
    const tags=[nw?`<span class="tag bnew">● ${nw} new</span>`:"",been?`<span class="tag been">✓ Been here${(PLOG[v.k]||{}).r?" · "+"★".repeat(PLOG[v.k].r):""}</span>`:"",v.evs.some(isSmall)?`<span class="tag local">${ni("home")} Small &amp; local</span>`:"",VF.f.has("crawl")&&CRAWL.has(v.k)?`<span class="tag bcrawl">🚶 ${CRAWL.get(v.k).length} more in walking distance: ${esc(CRAWL.get(v.k).slice(0,3).join(", "))}</span>`:"",prices.length&&Math.min(...prices)===0?`<span class="tag">Free shows</span>`:"",quietTag(v)?`<span class="tag bquiet-t">${esc(quietTag(v))}</span>`:""].filter(Boolean).join("");
    const vo=VOPEN[v.name]||{},eats=vo.e||[],acc=vo.a||null,tips=(vo.w||[]).slice(1);
    const eatQ=u=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(u+" near "+v.name+", "+v.city);
    const fmt=e=>parseDay(e.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
    const more=`<div class="vmore" hidden>
      ${walkHtml(walkScore(v.lat,v.lon))}
      ${tips.length?`<div class="vsec"><span class="sl">${ni("car")} Getting there</span><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}
      ${eats.length?`<div class="vsec"><span class="sl">${ni("food")} Local eats</span><ul>${eats.map(x=>`<li><a href="${eatQ(x.n)}" target="_blank" rel="noopener"><b>${esc(x.n)}</b></a> · ${esc(x.d)}</li>`).join("")}</ul></div>`:""}
      ${acc?`<div class="vsec"><span class="sl">${ni("hand")} Accessibility</span><p class="vacc">${esc(acc.t)}${acc.u?` <a href="${esc(acc.u)}" target="_blank" rel="noopener">Venue's access page ↗</a>`:""}</p></div>`:""}
      ${v.evs.length?`<div class="vsec"><span class="sl">${ni("ticket")} Coming up</span><ul>${v.evs.slice(0,3).map(e=>`<li><b>${esc(fmt(e))}</b> ${esc(e.title)}</li>`).join("")}${v.evs.length>3?`<li class="mut">+${v.evs.length-3} more</li>`:""}</ul></div>`
        :`<div class="vsec"><span class="sl">${ni("ticket")} Coming up</span><p class="vacc">${esc(quietTag(v))}. They may just not post here: <a href="${socials(v)}" target="_blank" rel="noopener">check their socials ↗</a> or the venue's own calendar.${v.addr?` ${esc(v.addr)}, ${esc(v.city)}.`:""}</p></div>`}
      ${been?`<div class="vsec vlog"><span class="sl">★ Your log</span><div class="vrate" role="group" aria-label="Rate ${esc(v.name)}">${[1,2,3,4,5].map(x=>`<button type="button" data-rate="${x}" data-rk="${esc(v.k)}" aria-pressed="${(PLOG[v.k]||{}).r>=x}" aria-label="${x} star${x>1?"s":""}">★</button>`).join("")}</div>
        <input class="vnote" data-vnote="${esc(v.k)}" maxlength="140" value="${esc((PLOG[v.k]||{}).n||"")}" placeholder="Who you went with, best moment, what you saw…" aria-label="Note for ${esc(v.name)}">
        ${(()=>{const xs=pastShows(v.k);return `<p class="vacc">${xs.length?`Seen here: ${xs.slice(0,3).map(x=>esc(x.t)).join(" · ")}${xs.length>3?` +${xs.length-3}`:""}. `:""}<button type="button" class="vlogadd" data-pstamp="${esc(v.k)}">＋ Log a past show</button></p>`;})()}</div>`:""}
      <div class="vlinks">${v.evs.length?`<button type="button" class="bvmap" data-vmap="${esc(v.k)}">${ni("map")} On the map</button>`:`<a class="bvmap" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name+", "+(v.addr||"")+", "+v.city)}" target="_blank" rel="noopener">${ni("map")} Map ↗</a>`}<button type="button" class="vbeen${been?" on":""}" data-been="${esc(v.k)}" aria-pressed="${been}">${been?"✓ Been here":"I've been here"}</button>${v.evs.length?`<button type="button" class="vall" data-venue="${esc(v.k)}">All ${v.evs.length} show${v.evs.length===1?"":"s"} →</button>`:""}</div></div>`;
    return `<div class="vcard${nw?" hasnew":""}"><div class="vf"><button type="button" class="vopen" data-vmore="1" aria-expanded="false"><b>${esc(v.name)}</b>
      <span>${esc(v.city)}${v.drive?` · ${v.drive.real?"":"~"}${fmtMins(v.drive.mins)}`:""}${v.year?` · since ${v.year}`:""}</span>
      <em class="bvibe">${esc(v.evs.length||VOPEN[v.name]?.w?vibeLine(v):(v.addr||""))}</em>
      <small>${n?`${v.inR.length&&r?"":"Next "}${esc(when)}: ${esc(n.title)}${v.inR.length>1?` +${v.inR.length-1} more`:""}`:"No shows listed"}</small>
      ${tags?`<span class="vtags">${tags}</span>`:""}</button>
      <button type="button" class="vpin bfollow${fol?" on":""}" data-pinv="${esc(v.k)}" aria-pressed="${fol}" aria-label="${fol?"Unfollow":"Follow"} ${esc(v.name)}">${ni("bell")}<span>${fol?"Following":"Follow"}</span></button></div>${more}</div>`;};
  // the passport itself lives on the You page now (passSection); Venues keeps a one-line way in
  const tot=infos.length;
  const pass=`<div class="vcard bpass bpass-mini"><button type="button" class="bpass-go" data-ypass><img class="bshack-ic" src="hut.webp?v=2" alt=""><span><b>Show passport &amp; badges</b><small>${BEEN.size} stamped · on the You page</small></span><i aria-hidden="true">→</i></button></div>`;
  crawlCalc(infos);
  const chips=vChips(infos),shown=vfOn()?infos.filter(v=>vMatch(v)):infos;
  const fol=shown.filter(v=>isPinned(v.k)).sort((a,b)=>newCount(b)-newCount(a)||byNext(a,b));
  const seg=`<div class="bseg bven-when">${WHEN.map(([w,l])=>`<button type="button" data-when="${w}" aria-pressed="${state.when===w}">${l}</button>`).join("")}</div>`;
  const search=`<label class="bvsearch">${ni("search")}<input type="search" id="bVq" placeholder="Search ${tot} venues by name or city" value="${esc(VQ)}" autocomplete="off" enterkeyhint="search" aria-label="Search venues"><span id="bVqN" class="bvq-n" aria-live="polite"></span></label>`;
  let html=`<div class="venues bven${vfOn()?" vfiltering":""}">${seg}${search}${chips}${vfOn()?`<p class="bvf-n">${shown.length} venue${shown.length===1?"":"s"} match</p>`:pass}`;
  if(vfOn()&&!shown.length)html+=`<div class="empty"><strong>No venues match all of those</strong>Turn a chip off, or tap ✕ Clear.</div>`;
  if(fol.length||!vfOn())html+=`<h2 class="month pickh">${ni("bell")} Following</h2>`+(fol.length?fol.map(card).join(""):`<div class="empty"><strong>Follow your spots</strong>Tap Follow on a venue. When it adds a show, you'll see a dot on the Venues tab.</div>`);
  const rest=shown.filter(v=>!isPinned(v.k));
  if(r){const on=rest.filter(v=>v.inR.length).sort(byDrive);
    if(on.length||!vfOn())html+=`<h2 class="month">Playing ${WHEN_WORD[state.when]} · ${on.length}</h2>`+(on.length?on.map(card).join(""):`<div class="empty"><strong>Nothing listed ${WHEN_WORD[state.when]}</strong>Try This weekend or Anytime.</div>`);
    if(rest.some(v=>!v.inR.length))html+=`<h2 class="month bquiet">Quiet ${WHEN_WORD[state.when]}</h2>`;
    for(const rg of REGIONS){const vs=rest.filter(v=>!v.inR.length&&regionOfK(v.k)===rg).sort((a,b)=>(a.evs[0]?.start||"9").localeCompare(b.evs[0]?.start||"9"));if(vs.length)html+=`<h3 class="bvreg">${esc(rg)}</h3>`+vs.map(card).join("");}}
  else for(const rg of REGIONS){const vs=rest.filter(v=>regionOfK(v.k)===rg).sort(byNext);if(vs.length)html+=`<h2 class="month">${esc(rg)}</h2>`+vs.map(card).join("");}
  list.innerHTML=html+`</div>`;syncFollowDot();vFilter();
  list.querySelectorAll(".bvf").forEach(r=>{const on=r.querySelector('[aria-pressed="true"]:not([data-vft=""])');if(on)r.scrollLeft=Math.max(0,on.offsetLeft-r.clientWidth/2+on.offsetWidth/2);});};
/* ---- Show passport + badges, one card on the You page: stamps, the show log, regions, then your badges ---- */
let PBALL=false;
function passSection(){const infos=allInfos(true),tot=infos.length,beenV=infos.filter(v=>BEEN.has(v.k));
  const regs=REGIONS.map(rg=>{const all=infos.filter(v=>regionOfK(v.k)===rg);return [rg,all.filter(v=>BEEN.has(v.k)).length,all.length];}).filter(x=>x[2]);
  const cap=PALL?beenV.length:10;
  const stamps=beenV.slice(0,cap).map((v,i)=>{const n=pastShows(v.k).length;return `<button type="button" class="bstamp${PSEL===v.k?" sel":""}" data-pstamp="${esc(v.k)}" aria-pressed="${PSEL===v.k}" style="--sr:${(i*37%30)-15}deg;--sc:${VIBES[i%4].c}" title="${esc(v.name)}" aria-label="${esc(v.name)}: ${n} show${n===1?"":"s"} logged. Tap to add past shows"><b>${esc(initials(v))}</b><small>${RABBR[regionOfK(v.k)]||""}</small>${n?`<i class="bstamp-n">${n}</i>`:""}</button>`;}).join("")
    +(beenV.length>10?`<button type="button" class="bstamp more" data-pall="1" aria-expanded="${PALL}">${PALL?"Less":"+"+(beenV.length-10)}</button>`:"");
  if(PSEL&&!BEEN.has(PSEL))PSEL="";
  const selV=PSEL?beenV.find(v=>v.k===PSEL)||venueInfo(PSEL):null;
  const plogPanel=selV?(()=>{const xs=pastShows(selV.k);return `<div class="bplog" style="--sc:${VIBES[Math.max(0,beenV.indexOf(selV))%4].c}">
      <div class="bplog-h"><div><b>${esc(selV.name)}</b><span>${esc(selV.city)} · ${xs.length} show${xs.length===1?"":"s"} in your passport</span></div><button type="button" class="bplog-x" data-pclose="1" aria-label="Close">✕</button></div>
      ${xs.length?`<ul class="bplog-list">${xs.map(x=>`<li><em>${esc(parseDay(x.d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}))}</em><span>${esc(x.t)}${x.star?' <small>★ starred</small>':""}</span>${x.own?`<button type="button" class="bplog-del" data-pdel="${esc(x.id)}" data-pk="${esc(selV.k)}" aria-label="Remove ${esc(x.t)}">✕</button>`:""}</li>`).join("")}</ul>`
        :`<p class="bplog-none">No shows logged here yet. Who did you see?</p>`}
      <form class="bplog-f" data-pform="${esc(selV.k)}"><input name="t" maxlength="100" required placeholder="Artist or show, e.g. Khruangbin" aria-label="Show you saw" autocomplete="off"><input name="d" type="date" required max="${todayStr()}" aria-label="Date you went"><button type="submit">＋ Add to passport</button></form>
    </div>`;})():"";
  const bdg=badges(infos);PASS={bdg,regs,n:BEEN.size};
  setTimeout(()=>markBadgesSeen(bdg),2500);   // after the fill-in animation has played
  const on=bdg.filter(b=>b.on),order=[...on,...bdg.filter(b=>!b.on).sort((p,q)=>q.have/q.need-p.have/p.need)],sc=showCount();
  return `<section class="byou-sec byou-pass" id="bYouPass" aria-label="Show passport and badges"><div class="bpass-in">
    <div class="bpass-h"><span class="bpass-k"><img class="bshack-ic" src="hut.webp?v=2" alt="">Show passport</span><b>${beenV.length} <small>of ${tot} venues${sc?` · ${sc} show${sc===1?"":"s"}`:""}</small></b></div>
    ${beenV.length?`<p class="bpass-tip">Tap a stamp to log shows you've seen there.</p><div class="bstamps">${stamps}</div>${plogPanel}<div class="bpass-regs">${regs.filter(x=>x[1]).map(([rg,a,b])=>`<span style="--pp:${Math.round(a/b*100)}%">${esc(rg)} <b>${a}</b>/${b}</span>`).join("")}</div>`
      :`<p>Tap <b>I've been here</b> on any venue you've been to (Venues tab). Shows you star stamp themselves the day after.</p>`}
    <div class="bpass-bdg">
      <div class="bpass-bh"><span class="bpass-k">🏆 Badges</span><span class="byou-n">${on.length} of ${bdg.length}</span></div>
      <div class="byou-bar" role="img" aria-label="${on.length} of ${bdg.length} badges earned"><i style="width:${Math.round(on.length/bdg.length*100)}%"></i></div>
      <div class="bbadges${PBALL?"":" clip"}">${order.map(badgeHtml).join("")}</div>
    </div>
    <div class="bpass-acts">${beenV.length?`<button type="button" class="bpass-share" data-yshare="passport">${ni("share")} Share</button><button type="button" class="bpass-share" data-ppmap="1">${ni("map")} Passport map</button>`:""}
      <button type="button" class="bpass-share" data-pball aria-expanded="${PBALL}">${PBALL?"Fewer badges":`All ${bdg.length} badges`}</button></div>
  </div></section>`;}
// redraw the passport where it's showing (You page), keeping the scroll spot; the Venues list re-renders too
function prender(){const el=document.getElementById("bYouPass");
  if(el){const box=el.closest(".binfo-in"),top=box?box.scrollTop:0;el.outerHTML=passSection();if(box)box.scrollTop=top;}
  if(!el||screen==="venues")render();}
/* venue search: filters the cards already on the page (no re-render, so the keyboard stays up) */
const vnorm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
function vFilter(){const box=$("list").querySelector(".bven");if(!box)return;const q=vnorm(VQ),words=q?q.split(" "):[];let n=0;
  box.querySelectorAll(".vcard:not(.bpass)").forEach(c=>{const t=vnorm(c.querySelector(".vopen")?.textContent);const ok=words.every(w=>t.includes(w));c.hidden=!ok;if(ok)n++;});
  box.classList.toggle("vsearching",!!q);
  // hide section headings and empty notes whose cards are all filtered out
  box.querySelectorAll("h2.month,h3.bvreg").forEach(h=>{let el=h.nextElementSibling,any=false;while(el&&!el.matches("h2,h3")){if(el.matches(".vcard:not([hidden])"))any=true;el=el.nextElementSibling;}h.hidden=!!q&&!any;});
  const nEl=$("bVqN");if(nEl)nEl.textContent=q?(n?`${n} match${n===1?"":"es"}`:"No venues match"):"";}
$("list").addEventListener("input",ev=>{if(ev.target.id!=="bVq")return;VQ=ev.target.value;vFilter();});
const RABBR={"Orange County":"OC","Los Angeles":"LA","Inland Empire":"IE","San Diego":"SD","Desert":"DST","Ventura":"VC","Other":""};
const STOPW=new Set(["the","of","at","and","a","an","on","in","&","+","-","·"]);
function initials(v){const city=new Set(String(v.city||"").toLowerCase().split(/\s+/));
  let w=v.name.replace(/[(),.'’!]/g," ").split(/\s+/).filter(x=>x&&!STOPW.has(x.toLowerCase()));
  const nc=w.filter(x=>!city.has(x.toLowerCase()));if(nc.length)w=nc;
  if(w.length===1)return w[0].slice(0,2).toUpperCase();
  return w.slice(0,3).map(x=>/^\d/.test(x)?x.replace(/\D.*$/,""):x[0]).join("").toUpperCase().slice(0,3);}
function regionOfK(k){const e=(state._up||[]).find(x=>venueKey(x)===k);if(e)return region(e);
  const o=QUIET[k];return o?region({venue:k.split(" · ")[0],city:o.c,lat:o.la,lon:o.lo}):"Other";}
// B-only clicks inside the venues list (capture so they run before app.js's handlers)
$("list").addEventListener("click",ev=>{if(screen!=="venues")return;
  const w=ev.target.closest("[data-when]");if(w){ev.stopPropagation();state.when=w.dataset.when;savePrefs();render();return;}
  const vt=ev.target.closest("[data-vft]");if(vt){ev.stopPropagation();VF.t=VF.t===vt.dataset.vft?"":vt.dataset.vft;render();return;}
  const vq=ev.target.closest("[data-vff]");if(vq){ev.stopPropagation();const k=vq.dataset.vff;VF.f.has(k)?VF.f.delete(k):VF.f.add(k);if(k==="all"&&VF.f.has("all"))VF.f.delete("21");if(k==="21"&&VF.f.has("21"))VF.f.delete("all");render();return;}
  const vr=ev.target.closest("[data-vfr]");if(vr){ev.stopPropagation();VF.rg=VF.rg===vr.dataset.vfr?"":vr.dataset.vfr;render();return;}
  if(ev.target.closest("[data-vfx]")){ev.stopPropagation();VF.t="";VF.f.clear();VF.rg="";render();return;}
  const vm=ev.target.closest("[data-vmore]");if(vm){const k=vm.closest(".vf").querySelector("[data-pinv]")?.dataset.pinv;if(k&&isPinned(k)&&newCount(venueInfo(k))){markSeen(k);setTimeout(()=>{const c=vm.closest(".vcard");c.classList.remove("hasnew");const t=c.querySelector(".bnew");if(t)t.remove();syncFollowDot();},0);}return;}
  const pn=ev.target.closest("[data-pinv]");if(pn){const k=pn.dataset.pinv;if(!isPinned(k))markSeen(k);else undoToast(`Unfollowed ${k.split(" · ")[0]}`,()=>{togglePin(k);markSeen(k);render();syncFollowDot();});return;}
  const bnn=ev.target.closest("[data-been]");if(bnn&&BEEN.has(bnn.dataset.been)){const k=bnn.dataset.been;undoToast(`Took ${k.split(" · ")[0]} out of your passport`,()=>{BEEN.add(k);saveBeen();render();});}
  const mp=ev.target.closest("[data-vmap]");if(mp){ev.stopPropagation();focusVenue(mp.dataset.vmap);return;}
  const vv=ev.target.closest("[data-venue]");if(vv){ev.stopPropagation();openVenueShows(vv.dataset.venue);return;}
  const pc=ev.target.closest("[data-pcmp]");if(pc){ev.stopPropagation();comparLink(pc);return;}
  const ps=ev.target.closest("[data-pshare]");if(ps){ev.stopPropagation();shareYear(ps);return;}
  // show log: star rating per stamped venue
  const rt=ev.target.closest("[data-rate]");if(rt){ev.stopPropagation();const k=rt.dataset.rk,x=+rt.dataset.rate,o=PLOG[k]||{};o.r=o.r===x?0:x;PLOG[k]=o;savePlog();
    rt.parentNode.querySelectorAll("[data-rate]").forEach(b=>b.setAttribute("aria-pressed",String(o.r>=+b.dataset.rate)));return;}
  passClicks2(ev);},true);
// "Share my year": a picture + a line of text (also used by the Share sheet in you.js)
function shareYear(ps){const n=[...BEEN].length,P=PASS||{};
    const top=(P.regs||[]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1])[0],earned=(P.bdg||[]).filter(b=>b.on).map(b=>b.n);
    const fav=Object.entries(PLOG).filter(([,o])=>o.r>=5).map(([k])=>k.split(" · ")[0]).slice(0,3);
    const yr=String(new Date().getFullYear()),ns=[...BEEN].reduce((c,k)=>c+pastShows(k).filter(x=>x.d.startsWith(yr)).length,0);
    const t=`My ${new Date().getFullYear()} in shows 🛖🎟️\n${ns?`${ns} show${ns===1?"":"s"} at `:""}${n} SoCal venue${n===1?"":"s"} stamped${top?` · most in ${top[0]} (${top[1]})`:""}${earned.length?`\nBadges: ${earned.join(", ")}`:""}${fav.length?`\n5 stars: ${fav.join(", ")}`:""}\n${APP_URL}`;
    yearImage(ns,top).then(file=>{
      if(file&&navigator.canShare&&navigator.canShare({files:[file]}))return navigator.share({files:[file],text:t}).catch(()=>{});
      if(file){const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);ps.textContent="Image saved ✓";}
      if(navigator.clipboard)navigator.clipboard.writeText(t).catch(()=>{});else if(navigator.share)navigator.share({text:t}).catch(()=>{});});}
// badges right now, for the You page (same rules as the passport card)
function badgesNow(){const ks=new Set([...(state._up||[]).filter(e=>e.kind!=="art"&&e.kind!=="volunteer").map(venueKey),...BEEN]);return badges([...ks].map(k=>venueInfo(k)));}
window.SHACK_PASS={shareYear:btn=>shareYear(btn),compare:btn=>comparLink(btn),get stamps(){return BEEN.size;},get shows(){return showCount();},
  badgesHtml(){const b=badgesNow(),on=b.filter(x=>x.on);return {earned:on.length,total:b.length,html:[...on,...b.filter(x=>!x.on).sort((p,q)=>q.have/q.need-p.have/p.need)].map(badgeHtml).join("")};},
  passHtml:()=>passSection(),
  open(){if(window.SHACK_YOU)SHACK_YOU.open("pass");}};
// the rest of the passport clicks (stamps, log, backup): on the You page, plus "Log a past show" on venue cards
function passClicks2(ev){
  const stp=ev.target.closest("[data-pstamp]");if(stp){ev.stopPropagation();const fromCard=stp.classList.contains("vlogadd");
    PSEL=fromCard?stp.dataset.pstamp:PSEL===stp.dataset.pstamp?"":stp.dataset.pstamp;
    if(fromCard){if(window.SHACK_YOU)SHACK_YOU.open("pass");}else prender();
    if(PSEL)setTimeout(()=>{const f=document.querySelector("#bYouPass .bplog");if(f)f.scrollIntoView({behavior:"smooth",block:"nearest"});},fromCard?350:40);return;}
  if(ev.target.closest("[data-pall]")){ev.stopPropagation();PALL=!PALL;prender();return;}
  if(ev.target.closest("[data-pclose]")){ev.stopPropagation();PSEL="";prender();return;}
  const pb=ev.target.closest("[data-pball]");if(pb){ev.stopPropagation();PBALL=!PBALL;const g=pb.closest("#bYouPass").querySelector(".bbadges");g.classList.toggle("clip",!PBALL);
    pb.setAttribute("aria-expanded",String(PBALL));pb.textContent=PBALL?"Fewer badges":`All ${g.children.length} badges`;if(!PBALL)g.scrollIntoView({block:"nearest",behavior:"smooth"});return;}
  const pd=ev.target.closest("[data-pdel]");if(pd){ev.stopPropagation();const k=pd.dataset.pk,gone=(PSHOWS[k]||[]).find(x=>x.id===pd.dataset.pdel);PSHOWS[k]=(PSHOWS[k]||[]).filter(x=>x.id!==pd.dataset.pdel);if(!PSHOWS[k].length)delete PSHOWS[k];savePshows();prender();
    if(gone)undoToast(`Removed ${gone.t}`,()=>{(PSHOWS[k]=PSHOWS[k]||[]).push(gone);savePshows();prender();});return;}
  if(ev.target.closest("[data-ppmap]")){ev.stopPropagation();const y=document.getElementById("bYou");if(y&&y.open)dlgClose(y);MAPV.pass=true;show("map");return;}
  if(ev.target.closest("[data-pback]")){ev.stopPropagation();backupPassport();return;}}
// note on a stamped venue: saved as you type
$("list").addEventListener("input",ev=>{const n=ev.target.closest("[data-vnote]");if(!n)return;const k=n.dataset.vnote,o=PLOG[k]||{};o.n=n.value.slice(0,140);PLOG[k]=o;savePlog();});
$("list").addEventListener("change",ev=>{const f=ev.target.closest("[data-prest]");if(f&&f.files&&f.files[0])restorePassport(f.files[0]);});
// the passport on the You page (a dialog, outside #list) gets the same clicks
document.addEventListener("click",ev=>{if(ev.target.closest("#bYouPass"))passClicks2(ev);},true);
document.addEventListener("submit",ev=>{const f=ev.target.closest("[data-pform]");if(!f)return;ev.preventDefault();
  const k=f.dataset.pform,t=f.elements.t.value.trim().slice(0,100),d=f.elements.d.value;if(!t||!/^\d{4}-\d\d-\d\d$/.test(d)||d>todayStr())return;
  (PSHOWS[k]=PSHOWS[k]||[]).push({t,d,id:Date.now().toString(36)});BEEN.add(k);saveBeen();savePshows();prender();
  setTimeout(()=>{const i=document.querySelector("#bYouPass .bplog-f input[name=t]");if(i)i.focus({preventScroll:true});},30);});
/* ---- "Share my year": a 1080×1350 image in the app's neon style (stats, stamps, latest shows) ---- */
async function yearImage(ns,top){try{const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  try{await document.fonts.ready;}catch(e){}
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#160a2e");bg.addColorStop(.6,"#2a1650");bg.addColorStop(1,"#5a2a5e");g.fillStyle=bg;g.fillRect(0,0,W,H);
  for(let i=0;i<160;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.6})`;g.beginPath();g.arc(Math.random()*W,Math.random()*H*.8,Math.random()*2.2,0,6.283);g.fill();}
  const yr=new Date().getFullYear(),glow=(col,b)=>{g.shadowColor=col;g.shadowBlur=b;};
  g.textAlign="center";glow("#ff6fe0",30);g.fillStyle="#fff";g.font="900 92px 'Big Shoulders Display',Impact,sans-serif";g.fillText(`MY ${yr} IN SHOWS`,W/2,170);
  g.shadowBlur=0;g.fillStyle="#bfeaff";g.font="600 34px 'JetBrains Mono',monospace";g.fillText("🛖 THE SHOW SHACK · SHOW PASSPORT",W/2,230);
  const stats=[[ns,"shows"],[BEEN.size,"venues"],[(PASS&&PASS.regs||[]).filter(x=>x[1]).length,"regions"],[(PASS&&PASS.bdg||[]).filter(b=>b.on).length,"badges"]];
  stats.forEach(([v,l],i)=>{const x=W/8+i*W/4,col=VIBES[i%4].c;glow(col,24);g.fillStyle=col;g.font="900 120px 'Big Shoulders Display',Impact,sans-serif";g.fillText(String(v),x,410);g.shadowBlur=0;g.fillStyle="#e4dcf5";g.font="600 32px 'Instrument Sans',sans-serif";g.fillText(l,x,460);});
  const been=[...BEEN].slice(0,12);been.forEach((k,i)=>{const cx=150+(i%6)*156,cy=600+Math.floor(i/6)*170,col=VIBES[i%4].c,v={name:k.split(" · ")[0],city:k.split(" · ")[1]||""};
    g.save();g.translate(cx,cy);g.rotate(((i*37%30)-15)*Math.PI/180);glow(col,18);g.strokeStyle=col;g.lineWidth=5;g.setLineDash([12,8]);g.beginPath();g.arc(0,0,64,0,6.283);g.stroke();g.setLineDash([]);
    g.shadowBlur=0;g.fillStyle=col;g.font="800 40px 'JetBrains Mono',monospace";g.fillText(initials(v),0,8);g.font="700 20px 'JetBrains Mono',monospace";g.fillText(RABBR[regionOfK(k)]||"",0,40);g.restore();});
  const shows=[...BEEN].flatMap(k=>pastShows(k).map(x=>({...x,v:k.split(" · ")[0]}))).filter(x=>x.d.startsWith(String(yr))).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,4);
  g.textAlign="left";let y=been.length?600+Math.ceil(been.length/6)*170+20:600;
  if(shows.length){g.fillStyle="#FFC66B";g.font="800 38px 'Big Shoulders Display',Impact,sans-serif";g.fillText("LATELY",90,y);y+=56;
    shows.forEach(x=>{g.fillStyle="#fff";g.font="600 34px 'Instrument Sans',sans-serif";g.fillText(x.t.slice(0,34),90,y);g.fillStyle="#cfc6e8";g.font="500 26px 'JetBrains Mono',monospace";g.fillText(x.v.slice(0,40),90,y+34);y+=84;});}
  else if(top){g.fillStyle="#fff";g.font="600 38px 'Instrument Sans',sans-serif";g.fillText(`Most stamps in ${top[0]} (${top[1]})`,90,y);}
  g.textAlign="center";g.fillStyle="#bfeaff";g.font="600 28px 'JetBrains Mono',monospace";g.fillText(APP_URL.replace(/^https?:\/\//,""),W/2,H-50);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));return blob?new File([blob],`my-${yr}-in-shows.png`,{type:"image/png"}):null;}catch(e){return null;}}
/* ---- compare passports: your stamps travel inside a link (#pp=…), nothing is uploaded ---- */
async function comparLink(btn){if(!window.NIGHT||!NIGHT.pack)return;
  const data={v:1,h:String((NIGHT.plan&&NIGHT.plan.h)||"").slice(0,30),b:[...BEEN].slice(0,300).map(k=>[k,pastShows(k).length])};
  const url=location.origin+location.pathname+"#pp="+await NIGHT.pack(data),text=`Compare Show passports with me 🛖🎟️ ${BEEN.size} venue${BEEN.size===1?"":"s"} stamped so far`;
  if(navigator.share){try{await navigator.share({text,url});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  try{await navigator.clipboard.writeText(text+"\n"+url);btn.textContent="Link copied ✓";}catch(e){prompt("Copy this link",url);}}
async function compareFrom(code){let d;try{d=await NIGHT.unpack(code);}catch(e){NIGHT.toast&&NIGHT.toast("That passport link looks broken");return;}
  const ok=k=>typeof k==="string"&&k.length<200&&k.includes(" · ");
  const theirs=new Map((Array.isArray(d.b)?d.b:[]).slice(0,300).filter(x=>Array.isArray(x)&&ok(x[0])).map(x=>[x[0],Math.max(0,Math.min(999,+x[1]||0))]));
  const who=String(d.h||"").replace(/[<>]/g,"").slice(0,30)||"Your friend",both=[...theirs.keys()].filter(k=>BEEN.has(k)),onlyT=[...theirs.keys()].filter(k=>!BEEN.has(k)),onlyY=[...BEEN].filter(k=>!theirs.has(k));
  const nm=k=>esc(k.split(" · ")[0]),row=(k,btn)=>`<li><span><b>${nm(k)}</b><small>${esc(k.split(" · ")[1]||"")}${theirs.get(k)?` · ${theirs.get(k)} show${theirs.get(k)>1?"s":""} for them`:""}</small></span></li>`;
  const opener=document.activeElement;let el=$("bCmp");if(!el){el=document.createElement("div");el.id="bCmp";el.className="rpop bcmp";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");document.body.appendChild(el);
    el.addEventListener("click",ev=>{if(ev.target===el||ev.target.closest("[data-cx]"))cmpClose();});document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!el.hidden)cmpClose();});}
  const cmpClose=()=>{el.hidden=true;document.documentElement.classList.remove("rpop-on");if(el._opener&&el._opener.focus)el._opener.focus({preventScroll:true});};el._opener=opener;
  el.setAttribute("aria-label","Compare passports");
  el.innerHTML=`<div class="rpop-in"><div class="rpop-top"><span class="rpop-k">↔︎ ${esc(who)} vs you</span><button type="button" class="rpop-x" data-cx aria-label="Close">✕</button></div>
    <div class="bcmp-stats"><span><b>${theirs.size}</b>theirs</span><span><b>${both.length}</b>both</span><span><b>${BEEN.size}</b>yours</span></div>
    ${both.length?`<h3>You've both been to</h3><ul>${both.map(k=>row(k)).join("")}</ul>`:""}
    ${onlyT.length?`<h3>Only ${esc(who)} has been to · ideas for your next night</h3><ul>${onlyT.map(k=>row(k,1)).join("")}</ul>`:""}
    ${onlyY.length?`<h3>Only you</h3><ul>${onlyY.slice(0,40).map(k=>row(k)).join("")}</ul>`:""}
    <p class="rpop-fine">The link carried their stamps. Nothing was uploaded and nothing about you was sent back.</p></div>`;
  el.hidden=false;document.documentElement.classList.add("rpop-on");const x=el.querySelector("[data-cx]");if(x)x.focus({preventScroll:true});}
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
function evWhoosh(){try{SH.audio.mix();AC=SH.audio.ctx();if(AC.state==="suspended")AC.resume();karmaSound(AC,AC.destination);}catch(e){}}
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
if(/^pp=[01][A-Za-z0-9_-]+$/.test(target)){try{history.replaceState(null,"",location.pathname);}catch(e){}setTimeout(()=>compareFrom(target.slice(3)),300);}
if(target&&/^[ep]-/.test(target)){cur="all";state.when="any";show("results",true);openCard(target);}
else show("home",true);
setTimeout(()=>{let seen="";try{seen=SH.store.raw("shack-new")||"";}catch(e){}if(seen!==WN_VER&&screen==="home"&&!document.querySelector("dialog[open],#nightView,#bCmp:not([hidden])"))whatsNew();},1600);
})();

