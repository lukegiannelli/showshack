/* ===== Spots: the Food and Afters tiles, their screen of place cards, and the "Chill spots" row
   on the Chill & community results. Places, not events: no dates or tickets, just where, how late and how far.
   Data and "+ My night" come from night.js (window.NIGHT); screens come from b.js (window.BUI). ===== */
(function(){
if(!window.UI_B||!window.NIGHT||!window.BUI)return;
const $=id=>document.getElementById(id), N=window.NIGHT;
const KINDS={
  food:{name:"Food & late eats",c:"#FF8A5C",title:"Food",blurb:"Eat before the show.",
    icon:'<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>'},
  after:{name:"Afters & late night",c:"#B48CFF",title:"Afters",blurb:"Where the night goes after the show.",
    icon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v4M15 5h4"/>'}};
const CHILL={c:"#8FB4FF",title:"Chill spots",blurb:"Beaches, coves and stargazing. Most close by 10 PM, a few run till midnight."};
const SCR=k=>KINDS[k]||CHILL, TAGF=["Fire rings","Tide pools","Sunset"];
const hasTag=(p,t)=>(p.t||[]).some(x=>x.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
let cur="after", sub="", late=false, tag="";
const label=p=>p.c==="pool"?["🎱","Pool"]:(N.AC[p.c]||["✨","Spot"]);
const late24=p=>p.til>=24;
function list(g){return N.spots().map((p,i)=>({p,i})).filter(x=>N.grp(x.p)===g);}
function sorted(xs){return xs.map(x=>({...x,d:driveEstimate(x.p.lat,x.p.lon)}))
  // closest first when we know where you start; otherwise known hours first, latest-open first
  .sort((a,b)=>(a.d?.mins??1e9)-(b.d?.mins??1e9)||(!!b.p.h-!!a.p.h)||((b.p.til||0)-(a.p.til||0))||a.p.n.localeCompare(b.p.n));}

/* ---- the card ---- */
function card({p,i,d},vc){const [em,cat]=label(p),q=encodeURIComponent([p.n,p.a,p.city,"CA"].filter(Boolean).join(", "));
  const sub=p.bt||(p.c==="pool"?(p.t||[])[0]:"");
  const tags=(p.t||[]).filter(t=>t!==sub).slice(0,3);
  const hrs=!p.h?`<span class="spc-hrs none">🕘 Hours not listed</span>`:`<span class="spc-hrs${p.hq?" est":""}">🕘 ${esc(p.h)}${p.hq?" <em>usually</em>":""}</span>`;
  return `<article class="spc" style="--vc:${vc}">
    <div class="spc-top"><span class="spc-cat">${em} ${esc(cat)}${sub?` · ${esc(sub)}`:""}</span>${d?`<span class="spc-dr">~${fmtMins(d.mins)} · ${d.miles} mi</span>`:""}</div>
    <h3>${esc(p.n)}</h3>
    <p class="spc-where">${esc([p.a,p.city].filter(Boolean).join(", "))}</p>
    ${hrs}
    ${tags.length?`<div class="spc-tags">${tags.map(t=>`<i>${esc(t)}</i>`).join("")}</div>`:""}
    <div class="spc-act"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">🧭 Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Hours ↗</a><button type="button" class="nadd" data-naft="${i}">＋ My night</button></div>
  </article>`;}

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
    <p class="bsp-note">Hours marked <em>usually</em> come from listings that don't fully agree. Check before you go.</p>`;
  $("bHome").after(sec);
  sec.addEventListener("click",ev=>{if(ev.target.closest("[data-sback]")){if(cur==="chill")BUI.show("results");else BUI.goHome();return;}
    const c=ev.target.closest("[data-ssub]");if(c){sub=c.dataset.ssub;draw();return;}
    if(ev.target.closest("[data-slate]")){late=!late;draw();return;}
    const tg=ev.target.closest("[data-stag]");if(tg){tag=tag===tg.dataset.stag?"":tg.dataset.stag;draw();}});}
function open(k){cur=k;sub="";late=false;tag="";mount();BUI.show("spots");}
function draw(){mount();const K=SCR(cur),all=list(cur);
  $("bSpTitle").textContent=K.title;$("bSpBlurb").textContent=K.blurb;
  const cats=[...new Set(all.map(x=>x.p.c))];
  $("bSpSubs").innerHTML=(cats.length>1?[["","All"],...cats.map(c=>[c,label({c}).join(" ")])]:[]).map(([v,l])=>`<button type="button" class="chip" data-ssub="${v}" aria-pressed="${v===sub}">${esc(l)}</button>`).join("")
    +(cur!=="food"?`<button type="button" class="chip" data-slate="1" aria-pressed="${late}">🌙 ${cur==="chill"?"Open till midnight":"Past midnight"}</button>`:"")
    +(cur==="chill"?TAGF.map(t=>`<button type="button" class="chip" data-stag="${t}" aria-pressed="${tag===t}">${t==="Fire rings"?"🔥":t==="Tide pools"?"🦀":"🌅"} ${t}</button>`).join(""):"");
  const xs=sorted(all.filter(x=>(!sub||x.p.c===sub)&&(!late||late24(x.p))&&(!tag||hasTag(x.p,tag))));
  $("bSpCount").textContent=xs.length+(xs.length===1?" spot":" spots")+(origin?" · closest first":"");
  $("bSpList").innerHTML=xs.length?xs.map(x=>card(x,K.c)).join(""):'<p class="bnone">Nothing here yet.</p>';}

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
