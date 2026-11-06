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
$("bHome").appendChild($("disco"));$("bHome").appendChild($("bTrust"));
document.querySelector(".wrap").insertBefore($("budgetBar"),$("alertBar"));
const bStart=document.createElement("button");bStart.type="button";bStart.className="chip bstart";bStart.textContent="Set your start point for drive times";tools.appendChild(bStart);
bStart.onclick=()=>{state.view="list";show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);};
$("bFilt").onclick=()=>{flags.hidden=!flags.hidden;$("bFilt").setAttribute("aria-expanded",String(!flags.hidden));};

/* ---- when switch (home + results share it) ---- */
function segHtml(){return WHEN.map(([v,l])=>`<button type="button" data-when="${v}" aria-pressed="${state.when===v}">${l}</button>`).join("");}
["bWhenHome","bWhenRes"].forEach(id=>{const el=$(id);el.innerHTML=segHtml();
  el.addEventListener("click",ev=>{const b=ev.target.closest("[data-when]");if(!b)return;state.when=b.dataset.when;savePrefs();render();});});
if(!["tonight","weekend","any"].includes(state.when))state.when="any";

/* ---- vibe tiles ---- */
$("bTiles").innerHTML=VIBES.map(v=>`<button type="button" class="btile t-${v.k}" data-vibe="${v.k}" style="--vc:${v.c}">
  <svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span><b>${v.name}</b><small data-count="${v.k}">&nbsp;</small></span></button>`).join("");
$("bTiles").addEventListener("click",ev=>{const b=ev.target.closest("[data-vibe]");if(b)openResults(b.dataset.vibe);});
$("bSearchAll").onclick=()=>{openResults("all");setTimeout(()=>{const q=$("q");if(q){q.focus();}},60);};
$("bAllWeekend").onclick=()=>{state.when="weekend";savePrefs();openResults("all");};
/* ---- flip cards: real event cards in a row; tap flips to the details right there ---- */
const LISTEN=q=>[["YouTube Music","https://music.youtube.com/search?q="],["Spotify","https://open.spotify.com/search/"],["Apple Music","https://music.apple.com/us/search?term="],["SoundCloud","https://soundcloud.com/search/people?q="]].map(([n,u])=>`<a href="${u+encodeURIComponent(q)}" target="_blank" rel="noopener">${n}</a>`).join("");
function backSide(e){const pi=priceInfo(e),d=parseDay(e.start);
  const tix=safeUrl(e.url),dest=encodeURIComponent((e.venue||"")+", "+(e.city||""));
  const maps=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}&travelmode=driving`;
  const pr=pi.sold?"Sold out":pi.free?"Free":pi.none?"Price not listed yet":pi.est?`≈$${Math.round(pi.lo)}–${Math.round(pi.hi)} typical`:`From $${Math.round(pi.lo)}${!pi.est&&e.priceAsOf?" · checked "+fmtShort(e.priceAsOf):""}`;
  const lq=(e.kind!=="openmic"&&e.kind!=="contact")?String(e.title||"").replace(/\s*\(.*?\)\s*/g," ").split(/:| & Friends/)[0].trim():"";
  const when=(isRec(e)&&e.recurrence?e.recurrence.text+" · next ":"")+d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(e.time?" · "+e.time:"");
  const note=e.note||e.priceNote||"";
  return `<div class="bfb-top"><b>${esc(e.title)}</b><span>${esc(when)}</span><span>${esc(e.venue)} · ${esc(e.city)}${e._drive?` · ~${fmtMins(e._drive.mins)} drive`:""}</span></div>
    <div class="bfb-price">${esc(pr)}</div>
    ${note?`<p class="bfb-note">${esc(note)}</p>`:""}
    <div class="bfb-acts">${tix?`<a class="bfb-main" href="${esc(tix)}" target="_blank" rel="noopener">${tixWord(e,pi)} ↗</a>`:""}<a href="${maps}" target="_blank" rel="noopener">Directions</a>
      ${lq?`<button type="button" class="bfb-listen" aria-expanded="false"><span class="lt">▶&#xFE0E; Listen</span></button>`:""}<button type="button" data-share="${esc(skey(e))}">Share</button></div>
    ${lq?`<div class="bfb-lm" hidden>${LISTEN(lq)}</div>`:""}
    <div class="bfb-foot"><button type="button" class="bfb-full" data-full="${esc(hid(e))}">Full card</button><button type="button" class="bfb-back">↩ Flip back</button></div>`;}
function flipCardHtml(e,tag){const front=cardHtml(e).replace(/^\s*<article id="[^"]*"/,'<article').replace(/class="card( flipped)?"/,'class="card"');
  return `<div class="bfc" data-k="${esc(skey(e))}"><div class="bfc-in"><div class="bfc-f">${tag?`<span class="bfc-tag">${tag}</span>`:""}${front}</div><div class="bfc-b" aria-hidden="true">${backSide(e)}</div></div></div>`;}
function flipRowClick(ev){const fc=ev.target.closest(".bfc");if(!fc)return;
  const st=ev.target.closest("button[data-star]");if(st){starBtn(st);return;}
  const sh=ev.target.closest("button[data-share]");if(sh){shareBtn(sh);return;}
  const ls=ev.target.closest(".bfb-listen");if(ls){const m=fc.querySelector(".bfb-lm");m.hidden=!m.hidden;ls.setAttribute("aria-expanded",String(!m.hidden));ls.classList.toggle("on",!m.hidden);return;}
  const full=ev.target.closest("[data-full]");if(full){state.when="any";openResults("all");openCard(full.dataset.full);return;}
  if(ev.target.closest(".bfb-back")){setFlip(fc,false);return;}
  if(ev.target.closest("a,input,select,label"))return;
  if(ev.target.closest(".vlink")){ev.stopPropagation();}
  if(!fc.classList.contains("on"))setFlip(fc,true);}
function setFlip(fc,on){fc.classList.toggle("on",on);fc.querySelector(".bfc-b").setAttribute("aria-hidden",String(!on));fc.querySelector(".bfc-f").setAttribute("aria-hidden",String(on));}
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
  const tab=s==="home"||s==="results"?"shows":s;
  document.querySelectorAll("#bTabs [data-tab]").forEach(b=>{if(b.dataset.tab===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  bar.hidden=!(s==="results"||s==="saved");
  if(s!=="home"&&!noPush&&!pushed){try{history.pushState({b:1},"");pushed=true;}catch(e){}}
  if(s==="home"&&pushed&&!noPush){pushed=false;try{history.back();}catch(e){}}
  render(); window.scrollTo(0,0);
}
window.addEventListener("popstate",()=>{if(pushed){pushed=false;if(screen!=="home"){state.kind="all";state.sub=null;show("home",true);}}});
$("bBack").onclick=()=>goHome();
function goHome(){state.kind="all";state.sub=null;state.genre="all";state.view="list";show("home");}
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

/* ---- after every render: counts, titles, sub-filters ---- */
const _render=render;
render=function(){_render();try{after();}catch(e){console.error(e);}};
function after(){
  if(pendingOpen)setTimeout(tryOpen,30);
  document.querySelectorAll("[data-when]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.when===state.when)));
  const up=state._up||[];
  if(screen==="home"){
    for(const v of VIBES){const n=up.filter(e=>GROUPS[v.k].has(e.kind)&&inWhen(e)).length;
      const el=document.querySelector(`[data-count="${v.k}"]`);if(el)el.textContent=n+" "+WHEN_WORD[state.when];}
    const wp=weekendPicks(up);
    const sig=wp?wp.picks.slice(0,5).map(p=>skey(p.e)).join("|")+(origin?"o":""):"";
    if(sig!==$("bPicks").dataset.sig){$("bPicks").dataset.sig=sig;
      $("bPicks").innerHTML=wp?wp.picks.slice(0,5).map(p=>flipCardHtml(p.e,"")).join(""):'<p class="bnone">Weekend picks show up here once the weekend list fills in.</p>';}
    trust();
  }
  if(screen==="results"||screen==="saved"){
    const v=VIBES.find(x=>x.k===cur);
    $("bTitle").textContent=screen==="saved"?"Saved":v?v.name:cur==="surprise"?"Surprise pick":state.q?"Search":"All shows";
    const n=(state._shown||[]).length;$("bCount").textContent=n+(n===1?" event":" events")+(screen==="saved"?"":" · "+WHEN_WORD[state.when]);
    const subs=$("bSubs");let items=null,key="sub";
    if(cur==="music"){items=GENRES.map(([g,l])=>[g==="all"?"":g,l]);key="genre";} else if(SUBS[cur])items=SUBS[cur];
    if(screen==="saved")items=null;
    subs.hidden=!items;
    if(items){const val=key==="genre"?(state.genre==="all"?"":state.genre):(state.sub||"");
      subs.innerHTML=items.map(([x,l])=>`<button type="button" class="chip" data-sub="${x}" data-key="${key}" aria-pressed="${x===val}">${esc(l)}</button>`).join("");}
    bStart.hidden=!!origin;
    $("bWhenRes").hidden=screen==="saved";
    tools.hidden=screen==="saved";
  }
}
$("bSubs").addEventListener("click",ev=>{const b=ev.target.closest("[data-sub]");if(!b)return;
  if(b.dataset.key==="genre"){state.genre=b.dataset.sub||"all";savePrefs();}else state.sub=b.dataset.sub||null;render();});

/* ---- where the info comes from ---- */
function trust(){const m=window.SHACK_META||{},el=$("bTrust");if(!el||!state.events.length)return;
  const ago=t=>{if(!t)return "";const h=(Date.now()-new Date(t))/36e5;return h<1?"less than an hour ago":h<24?Math.round(h)+" hours ago":Math.round(h/24)+" days ago";};
  const tm=/([\d,]+) listings checked/.exec(m.tmNote||"");
  const n=state.events.length, rec=state.events.filter(isRec).length;
  el.querySelector("[data-t=upd]").textContent=m.lastRun?"Updated "+ago(m.lastRun):"Updated daily";
  el.querySelector("[data-t=n]").textContent=n.toLocaleString()+" listings";
  el.querySelector("[data-t=tm]").textContent=tm?tm[1]+" Ticketmaster listings re-checked "+ago(m.tmRun)+".":"Ticketmaster prices are re-checked every day.";
  el.querySelector("[data-t=rec]").textContent=rec+" weekly and monthly series";}

/* ---- start on the home screen, unless a shared link points at a show ---- */
state.kind="all";state.sub=null;state.genre="all";state.view="list";
const target=(location.hash||"").slice(1);
if(target&&/^[ep]-/.test(target)){cur="all";state.when="any";show("results",true);openCard(target);}
else show("home",true);
})();
