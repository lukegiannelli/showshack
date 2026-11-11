/* ===== Spots: the Food and Afters tiles, their screen of place cards, and the "Chill spots" row
   on the Chill & community results. Places, not events: no dates or tickets, just where, how late and how far.
   Data and "+ My night" come from night.js (window.NIGHT); screens come from b.js (window.BUI). ===== */
(function(){
if(!window.UI_B||!window.NIGHT||!window.BUI)return;
const $=id=>document.getElementById(id), N=window.NIGHT;
const KINDS={
  food:{name:"Food & late eats",c:"#FF8A5C",title:"Food",blurb:"Eat before the show: Korean BBQ, ramen, tacos, pho and 24-hour diners.",
    icon:'<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>'},
  after:{name:"Afters & late night",c:"#B48CFF",title:"Afters",blurb:"Where the night goes after the show.",
    icon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v4M15 5h4"/>'}};
const CHILL={c:"#8FB4FF",title:"Chill spots",blurb:"Beaches, coves and stargazing. Most close by 10 PM, a few run till midnight."};
const SCR=k=>KINDS[k]||CHILL, TAGF=["Fire rings","Tide pools","Sunset"];
const hasTag=(p,t)=>(p.t||[]).some(x=>x.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
let cur="after", sub="", late=false, tag="";
/* neon line icons, one per category: [color, svg paths] (drawn with currentColor; spots.css adds the glow) */
const IC={
  kbbq:["#FF6B6B",'<circle cx="12" cy="13" r="7"/><path d="M5.5 11h13M5.2 14.2h13.6M8 6.5 7 3.5M12 6V3M16 6.5l1-3"/>'],
  ramen:["#FFC66B",'<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="m13 3-3 9M21 4l-7 8"/><path d="M7 15h10" opacity=".6"/>'],
  tacos:["#FFD84D",'<path d="M2.5 18a9.5 9.5 0 0 1 19 0Z"/><path d="M6.5 14c1-1.2 2-.2 3-1.2s2-.2 3-1.2 2-.2 3-1.2" opacity=".75"/>'],
  pho:["#7EE0B8",'<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>'],
  korean:["#FF8A5C",'<path d="M4 10h16v3a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7Z"/><path d="M2 10h20M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5"/>'],
  diner:["#7FD4FF",'<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1.5-1 1.5-1 3M12 3c0 1.5-1 1.5-1 3M3 22h14"/>'],
  karaoke:["#FF6FA5",'<circle cx="15.5" cy="8.5" r="4.5"/><path d="m12.3 11.7-8 8.3 1.7 1.7 8.3-8M13 6.5l4.5 4.5"/>'],
  arcade:["#7FD4FF",'<rect x="3" y="14" width="18" height="7" rx="2"/><path d="M12 14V9"/><circle cx="12" cy="6" r="3"/><path d="M17 17.5h.01M7 17.5h2"/>'],
  bowl:["#FFC66B",'<circle cx="16" cy="16" r="5.5"/><path d="M14.5 14h.01M17.5 14h.01M16 16.5h.01"/><path d="M7 2.5c-1.6 0-2 1.6-1.6 3 .3 1.1-.9 2-1.3 4-.6 2.6.4 6.2 1.4 8.5h3c1-2.3 2-5.9 1.4-8.5-.4-2-1.6-2.9-1.3-4 .4-1.4 0-3-1.6-3Z"/>'],
  spa:["#7EE0B8",'<path d="M2 16c2.5 2 4.5 2 6.7 0s4.5-2 6.7 0 4.5 2 6.6 0M2 20.5c2.5 2 4.5 2 6.7 0s4.5-2 6.7 0 4.5 2 6.6 0"/><path d="M8 12c0-2 2-2 2-4s-2-2-2-4M14 12c0-2 2-2 2-4s-2-2-2-4"/>'],
  jazz:["#B48CFF",'<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'],
  roof:["#FF8AD8",'<path d="M4 4h16l-8 9Z"/><path d="M12 13v7.5M8 20.5h8M15.5 4 18 1.5"/><circle cx="9" cy="6.5" r="1"/>'],
  stars:["#E6DCFF",'<path d="m3.5 15 13-7 2.2 4.2-13 7Z"/><path d="m10 16.5-2.5 5.5M12.5 15.2l3 6.8"/><path d="M20 2.5v3M18.5 4h3" opacity=".8"/>'],
  beach:["#8FB4FF",'<path d="M2 14.5c3.3 0 3.3-3 6.7-3s3.3 3 6.6 3 3.4-3 6.7-3M2 19.5c3.3 0 3.3-3 6.7-3s3.3 3 6.6 3 3.4-3 6.7-3"/><circle cx="17.5" cy="6" r="2.5"/>'],
  pool:["#7FD4FF",'<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="11" r="4.5"/><circle cx="12" cy="9.6" r="1.1"/><circle cx="12" cy="12.3" r="1.4"/>']};
const ic=(c,cls="")=>{const [col,d]=IC[c]||["#E6DCFF",'<path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>'];
  return `<svg class="nic ${cls}" viewBox="0 0 24 24" aria-hidden="true" style="--ic:${col}">${d}</svg>`;};
const label=p=>p.c==="pool"?[ic("pool"),"Pool"]:[ic(p.c),(N.AC[p.c]||["","Spot"])[1]];
const SVC={sit:"Sit-down, 20% tip",bar:"20% tip on drinks",counter:"Counter service, tip optional",none:"No tip needed"};
const $r=(a,b)=>a===b?"$"+a:`$${a}–${b}`;
/* price block: total per person with ~9% tax and tip folded in, then the breakdown */
function price(p){const c=N.cost?N.cost(p):null;if(!c)return "";
  if(c.free)return `<div class="spc-price free"><b>Free</b><span>${esc(c.what)}</span></div>`;
  const parts=[`${esc(c.what)} ${$r(c.lo,c.hi)}`,`tax ~${$r(c.tax[0],c.tax[1])}`];if(c.tip[1])parts.push(`tip ~${$r(c.tip[0],c.tip[1])}`);
  return `<div class="spc-price"><b>≈ ${$r(c.all[0],c.all[1])}</b><span>per person, ${c.tip[1]?"with tax and tip":"with tax"}</span>
    <small>${parts.join(" · ")}</small><small class="spc-svc">${SVC[c.svc]||""}${p.pp?"":" · typical price, not from the place"}</small></div>`;}
const late24=p=>p.til>=24;
function list(g){return N.spots().map((p,i)=>({p,i})).filter(x=>N.grp(x.p)===g);}
function sorted(xs){return xs.map(x=>({...x,d:driveEstimate(x.p.lat,x.p.lon)}))
  // closest first when we know where you start; otherwise known hours first, latest-open first
  .sort((a,b)=>(a.d?.mins??1e9)-(b.d?.mins??1e9)||(!!b.p.h-!!a.p.h)||((b.p.til||0)-(a.p.til||0))||a.p.n.localeCompare(b.p.n));}

/* ---- the card ---- */
function card({p,i,d},vc){const [em,cat]=label(p),q=encodeURIComponent([p.n,p.a,p.city,"CA"].filter(Boolean).join(", "));
  const sub=p.bt||(p.c==="pool"?(p.t||[])[0]:"");
  const tags=(p.t||[]).filter(t=>t!==sub).slice(0,3);
  const hrs=!p.h?`<span class="spc-hrs none">Hours not listed</span>`:`<span class="spc-hrs${p.hq?" est":""}">${esc(p.h)}${p.hq?" <em>usually</em>":""}</span>`;
  const icc=(IC[p.c]||["#E6DCFF"])[0];
  return `<article class="spc" style="--vc:${vc};--ic:${icc}">
    <div class="spc-top"><span class="spc-badge">${em}</span><span class="spc-cat">${esc(cat)}${sub?` · ${esc(sub)}`:""}</span>${d?`<span class="spc-dr">${ic("drive","sm")}${fmtMins(d.mins)} · ${d.miles} mi</span>`:""}</div>
    <h3>${esc(p.n)}</h3>
    <p class="spc-where">${esc([p.a,p.city].filter(Boolean).join(", "))}</p>
    <div class="spc-facts"><span class="spc-f">${CLOCK}${hrs}</span>${late24(p)?`<span class="spc-late">Open past midnight</span>`:""}</div>
    ${price(p)}
    ${tags.length?`<div class="spc-tags">${tags.map(t=>`<i>${esc(t)}</i>`).join("")}</div>`:""}
    <div class="spc-act"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Hours ↗</a><button type="button" class="nadd" data-naft="${i}">＋ Add to my night</button></div>
  </article>`;}
const CLOCK='<svg class="nic sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
IC.drive=["#7EE0B8",'<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3Z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/><path d="M5 11h14"/>'];

/* ---- home tiles (after the four vibes, same look) ---- */
function tiles(){const t=$("bTiles");if(!t||t.querySelector("[data-spots]"))return;
  t.insertAdjacentHTML("beforeend",Object.entries(KINDS).map(([k,v])=>`<button type="button" class="btile t-${k}" data-spots="${k}" style="--vc:${v.c}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span><b>${v.name}</b><small data-scount="${k}">&nbsp;</small></span></button>`).join(""));
  t.addEventListener("click",ev=>{const b=ev.target.closest("[data-spots]");if(b){ev.stopPropagation();open(b.dataset.spots);}},true);}
function home(){tiles();if(!N.ready())return;
  for(const k in KINDS){const xs=list(k),el=document.querySelector(`[data-scount="${k}"]`);if(!el)continue;
    const l=xs.filter(x=>late24(x.p)).length;el.textContent=xs.length+" spots"+(k==="after"&&l?` · ${l} past midnight`:"");}}

/* ---- the spots screen ---- */
function mount(){if($("bSpots"))return;const sec=document.createElement("section");sec.id="bSpots";sec.className="bspots";sec.setAttribute("aria-label","Spots");
  sec.innerHTML=`<div class="bbar-top"><button type="button" class="bback" data-sback aria-label="Back to vibes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><div class="btitle"><h1 id="bSpTitle"></h1><span class="blbl" id="bSpCount"></span></div></div>
    <p class="bsp-blurb" id="bSpBlurb"></p><div class="bsubs" id="bSpSubs"></div><div class="spc-list" id="bSpList"></div>
    <p class="bsp-note">Hours marked <em>usually</em> come from listings that don't fully agree. Prices are typical Southern California prices per person with about 9% sales tax, not quotes from the places. Check before you go.</p>`;
  $("bHome").after(sec);
  sec.addEventListener("click",ev=>{if(ev.target.closest("[data-sback]")){if(cur==="chill")BUI.show("results");else BUI.goHome();return;}
    const c=ev.target.closest("[data-ssub]");if(c){sub=c.dataset.ssub;draw();return;}
    if(ev.target.closest("[data-slate]")){late=!late;draw();return;}
    // same path as the Map's "set start" button: open the start-point form on the Plan screen
    if(ev.target.closest("[data-sstart]")){state.view="list";BUI.show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);return;}
    const tg=ev.target.closest("[data-stag]");if(tg){tag=tag===tg.dataset.stag?"":tg.dataset.stag;draw();}});}
function open(k){cur=k;sub="";late=false;tag="";mount();BUI.show("spots");}
function draw(){mount();const K=SCR(cur),all=list(cur);
  $("bSpTitle").textContent=K.title;$("bSpBlurb").textContent=K.blurb;
  $("bSpots").dataset.k=cur;
  // Pool goes right after "All" so it isn't lost off the end of the scrolling chip row
  const cats=[...new Set(all.map(x=>x.p.c))].sort((a,b)=>(b==="pool")-(a==="pool"));
  $("bSpSubs").innerHTML=(cats.length>1?[["","","All"],...cats.map(c=>[c,...label({c})])]:[]).map(([v,i,l])=>`<button type="button" class="chip spchip" data-ssub="${v}" aria-pressed="${v===sub}">${i}${esc(l)}</button>`).join("")
    +(cur!=="food"?`<button type="button" class="chip" data-slate="1" aria-pressed="${late}">🌙 ${cur==="chill"?"Open till midnight":"Past midnight"}</button>`:"")
    +(cur==="chill"?TAGF.map(t=>`<button type="button" class="chip" data-stag="${t}" aria-pressed="${tag===t}">${t==="Fire rings"?"🔥":t==="Tide pools"?"🦀":"🌅"} ${t}</button>`).join(""):"");
  const xs=sorted(all.filter(x=>(!sub||x.p.c===sub)&&(!late||late24(x.p))&&(!tag||hasTag(x.p,tag))));
  $("bSpCount").textContent=xs.length+(xs.length===1?" spot":" spots")+(origin?" · closest first":"");
  const hint=origin?"":`<button type="button" class="spc-start" data-sstart>${ic("drive")}<span><b>See drive times</b><small>Set where you're starting from</small></span></button>`;
  $("bSpList").innerHTML=hint+(xs.length?xs.map(x=>card(x,K.c)).join(""):'<p class="bnone">Nothing here yet.</p>');}

/* ---- Chill & community results: a row of chill spots (beaches, stargazing) above the events ---- */
function chillRow(on){let el=$("bChillSpots");
  if(!on||!N.ready()){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement("section");el.id="bChillSpots";el.className="bchill";$("list").before(el);}
  const xs=sorted(list("chill"));el.hidden=!xs.length;
  const sig=xs.map(x=>x.i).join(",")+(origin?origin.lat:"");if(el.dataset.sig===sig)return;el.dataset.sig=sig;
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">Chill spots · ${xs.length}</h2><button type="button" class="blink" data-sall>See all</button></div><div class="spc-row">${xs.slice(0,8).map(x=>card(x,CHILL.c)).join("")}</div>`;
  el.querySelector("[data-sall]").onclick=()=>open("chill");}

window.SPOTS={home,after(screen,c){if(screen==="spots")draw();chillRow(screen==="results"&&c==="chill");}};
document.addEventListener("shack:spots",()=>{home();const s=BUI.screen;if(s==="spots")draw();else if(s==="results")render();});
tiles();
})();
