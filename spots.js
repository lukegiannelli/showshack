/* ===== Spots: the Food and Afters tiles, their screen of place cards, and the "Chill spots" row
   on the Chill & community results. Places, not events: no dates or tickets, just where, how late and how far.
   Data and "+ My night" come from night.js (window.NIGHT); screens come from b.js (window.BUI). ===== */
(function(){
if(!window.UI_B||!window.NIGHT||!window.BUI)return;
const $=id=>document.getElementById(id), N=window.NIGHT;
const KINDS={
  food:{name:"Food & late eats",c:"#FF8A5C",title:"Food",blurb:"Eat before the show: seafood boils, hot pot, Korean BBQ, ramen, tacos, pho, 24-hour diners and tasting menus.",
    icon:'<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>'},
  after:{name:"Afters & late night",c:"#B48CFF",title:"Afters",blurb:"Where the night goes after the show, including hotel bars and rooftops anyone can walk into.",
    icon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v4M15 5h4"/>'}};
const CHILL={c:"#8FB4FF",title:"Chill spots",blurb:"Beaches, coves and stargazing. Most close by 10 PM, a few run till midnight."};
const SCR=k=>KINDS[k]||CHILL, TAGF=["Fire rings","Tide pools","Sunset"];
const hasTag=(p,t)=>(p.t||[]).some(x=>x.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
let cur="after", sub="", late=false, tag="";
const IC=N.IC, ic=N.ic;   // neon icon set lives in night.js (shared with the map)
const label=p=>p.c==="pool"?[ic("pool"),"Pool"]:[ic(p.c),(N.AC[p.c]||["","Spot"])[1]];
const SVC={sit:"Sit-down, 20% tip",bar:"20% tip on drinks",counter:"Counter service, tip optional",none:"No tip needed"};
const $r=(a,b)=>a===b?"$"+a:`$${a}–${b}`;
/* price block: total per person with ~9% tax and tip folded in, then the breakdown */
function price(p){const c=N.cost?N.cost(p):null;if(!c)return "";
  if(c.free)return `<div class="spc-price free"><b>Free</b><span>${esc(c.what)}</span></div>`;
  const parts=[`${esc(c.what)} ${$r(c.lo,c.hi)}`,`tax ~${$r(c.tax[0],c.tax[1])}`];if(c.tip[1])parts.push(`tip ~${$r(c.tip[0],c.tip[1])}`);
  return `<div class="spc-price"><b>≈ ${$r(c.all[0],c.all[1])}</b><span>per person, ${c.tip[1]?"with tax and tip":"with tax"}</span>
    <small>${parts.join(" · ")}</small><small class="spc-svc">${SVC[c.svc]||""} · typical price, not from the place</small></div>`;}
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
  const icc=(IC[p.c]||["#E6DCFF"])[0],x=(N.EXP||{})[p.c];
  return `<article class="spc${x?" exp exp-"+x:""}" style="--vc:${vc};--ic:${icc}">
    ${x?`<span class="spc-exp">${XLBL[x]}</span>`:""}
    <div class="spc-top"><span class="spc-badge">${em}</span><span class="spc-cat">${esc(cat)}${sub?` · ${esc(sub)}`:""}</span>${d?`<span class="spc-dr">${ic("drive","sm")}${fmtMins(d.mins)} · ${d.miles} mi</span>`:""}</div>
    <h3>${esc(p.n)}</h3>
    <p class="spc-where">${esc([p.a,p.city].filter(Boolean).join(", "))}</p>
    <div class="spc-facts"><span class="spc-f">${CLOCK}${hrs}</span>${late24(p)?`<span class="spc-late">Open past midnight</span>`:""}</div>
    ${price(p)}
    ${tags.length?`<div class="spc-tags">${tags.map(t=>`<i>${esc(t)}</i>`).join("")}</div>`:""}
    <div class="spc-act"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Directions</a>${p.u&&safeUrl(p.u)?`<a href="${esc(safeUrl(p.u))}" target="_blank" rel="noopener">Schedule ↗</a>`:`<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Hours ↗</a>`}<button type="button" class="nadd" data-naft="${i}">＋ Add to my night</button></div>
  </article>`;}
const XLBL={fun:"✦ Fun experience",splurge:"✦ Splurge"};
const XROW={fun:["Fun experiences","Crack crab with your hands, watch noodles fly, grill it yourself. A show of its own without the big bill."],
  splurge:["Splurge-worthy","Tasting menus for a big night. Book ahead, and check the menu price first."]};
const CLOCK='<svg class="nic sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

/* ---- home tiles (after the four vibes, same look) ---- */
function tiles(){const t=$("bTiles");if(!t||t.querySelector("[data-spots]"))return;
  t.insertAdjacentHTML("beforeend",Object.entries(KINDS).map(([k,v])=>`<button type="button" class="btile t-${k}" data-spots="${k}" style="--vc:${v.c}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span><b>${v.name}</b><small data-scount="${k}">&nbsp;</small></span></button>`).join(""));
  t.addEventListener("click",ev=>{const b=ev.target.closest("[data-spots]");if(b){ev.stopPropagation();open(b.dataset.spots);}},true);
  // Food and Afters arrive after the four vibe tiles: restart every tile's shimmer at once so all six stay in step
  const all=t.querySelectorAll(".btile");all.forEach(b=>b.classList.add("bt-sync"));void t.offsetWidth;all.forEach(b=>b.classList.remove("bt-sync"));}
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
  const FRONT=["pool","hotel"],fr=c=>{const i=FRONT.indexOf(c);return i<0?99:i;};   // Pool and Hotel first so they aren't lost off the end of the row
  const cats=[...new Set(all.map(x=>x.p.c))].sort((a,b)=>fr(a)-fr(b));
  // Food: two "experience" chips up front, then the categories
  const xch=cur==="food"?[["x:fun",ic("boil"),"Fun experiences"],["x:splurge",ic("fine"),"Splurge"]]:[];
  $("bSpSubs").innerHTML=(cats.length>1?[["","","All"],...xch,...cats.map(c=>[c,...label({c})])]:[]).map(([v,i,l])=>`<button type="button" class="chip spchip" data-ssub="${v}" aria-pressed="${v===sub}">${i}${esc(l)}</button>`).join("")
    +(cur!=="food"?`<button type="button" class="chip" data-slate="1" aria-pressed="${late}">🌙 ${cur==="chill"?"Open till midnight":"Past midnight"}</button>`:"")
    +(cur==="chill"?TAGF.map(t=>`<button type="button" class="chip" data-stag="${t}" aria-pressed="${tag===t}">${t==="Fire rings"?"🔥":t==="Tide pools"?"🦀":"🌅"} ${t}</button>`).join(""):"");
  const E=N.EXP||{},subOk=p=>!sub||(sub.startsWith("x:")?E[p.c]===sub.slice(2):p.c===sub);
  const xs=sorted(all.filter(x=>subOk(x.p)&&(!late||late24(x.p))&&(!tag||hasTag(x.p,tag))));
  $("bSpCount").textContent=xs.length+(xs.length===1?" spot":" spots")+(origin?" · closest first":"");
  const hint=origin?"":`<button type="button" class="spc-start" data-sstart>${ic("drive")}<span><b>See drive times</b><small>Set where you're starting from</small></span></button>`;
  // Food, All: the experiences get their own glowing rows up top, then everything
  const XORD=["boil","hotpot","hibachi","kbbq","fine"];   // no start point yet: lead with the boils and hot pot
  let top="";if(cur==="food"&&!sub)top=["fun","splurge"].map(t=>{const r=xs.filter(x=>E[x.p.c]===t);if(!origin)r.sort((a,b)=>XORD.indexOf(a.p.c)-XORD.indexOf(b.p.c));return r.length?`<section class="spx spx-${t}">
      <div class="bpicks-h"><h2 class="bsec">${XROW[t][0]} · ${r.length}</h2><button type="button" class="blink" data-ssub="x:${t}">See all</button></div>
      <p class="bsp-note">${XROW[t][1]}</p><div class="spc-row">${r.slice(0,10).map(x=>card(x,K.c)).join("")}</div></section>`:"";}).join("")
    +(xs.length?`<h2 class="bsec spx-all">Everything · ${xs.length}</h2>`:"");
  $("bSpList").innerHTML=hint+top+(xs.length?xs.map(x=>card(x,K.c)).join(""):'<p class="bnone">Nothing here yet.</p>');}

/* ---- Chill & community results: a row of chill spots (beaches, stargazing) above the events ---- */
function chillRow(on){let el=$("bChillSpots");
  if(!on||!N.ready()){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement("section");el.id="bChillSpots";el.className="bchill";$("list").before(el);}
  const xs=sorted(list("chill"));el.hidden=!xs.length;
  const sig=xs.map(x=>x.i).join(",")+(origin?origin.lat:"");if(el.dataset.sig===sig)return;el.dataset.sig=sig;
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">Chill spots · ${xs.length}</h2><button type="button" class="blink" data-sall>See all</button></div><div class="spc-row">${xs.slice(0,8).map(x=>card(x,CHILL.c)).join("")}</div>`;
  el.querySelector("[data-sall]").onclick=()=>open("chill");}

/* ---- Festival results: "Back next year" row for yearly festivals that already ran and have no new dates yet ---- */
let BACK=[];fetch("returning.json?v=1").then(r=>r.ok?r.json():{}).then(j=>{BACK=(j&&j.fests)||[];if(BUI.screen==="results")render();}).catch(()=>{});
function backRow(on){let el=$("bBackFests");
  if(!on||!BACK.length){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement("section");el.id="bBackFests";el.className="bchill bback-f";$("list").after(el);}
  el.hidden=false;if(el.dataset.n==BACK.length)return;el.dataset.n=BACK.length;
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">Back next year · ${BACK.length}</h2></div>
    <p class="bsp-note">These ran in 2026 and come back every year. 2027 dates aren't announced yet.</p>
    <div class="spc-row">${BACK.map(f=>`<article class="spc" style="--vc:#FF6FA5;--ic:#FF6FA5">
      <div class="spc-top"><span class="spc-badge">${ic("fest")}</span><span class="spc-cat">${esc(f.g||"Festival")}</span></div>
      <h3>${esc(f.n)}</h3><p class="spc-where">${esc([f.venue,f.city].filter(Boolean).join(", "))}</p>
      <div class="spc-facts"><span class="spc-f">${CLOCK}<span class="spc-hrs">Last: ${esc(f.last)}</span></span></div>
      <p class="spc-where">Usually: ${esc(f.usual)} · <b>2027 dates TBA</b></p>
      <div class="spc-act"><a href="${esc(safeUrl(f.url)||"#")}" target="_blank" rel="noopener">Official site ↗</a></div></article>`).join("")}</div>`;}

window.SPOTS={home,after(screen,c){if(screen==="spots")draw();chillRow(screen==="results"&&c==="chill");
  backRow(screen==="results"&&c==="music"&&state.sub==="festival");}};
document.addEventListener("shack:spots",()=>{home();const s=BUI.screen;if(s==="spots")draw();else if(s==="results")render();});
tiles();
})();
