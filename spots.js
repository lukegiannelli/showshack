/* ===== Spots: the Food and Afters tiles, their screen of place cards, and the "Chill spots" row
   on the Chill & community results. Places, not events: no dates or tickets, just where, how late and how far.
   Data and "+ My night" come from night.js (window.NIGHT); screens come from b.js (window.BUI). ===== */
(function(){
if(!window.UI_B||!window.NIGHT||!window.BUI)return;
const $=id=>document.getElementById(id), N=window.NIGHT;
const KINDS={
  food:{name:"Food & late eats",c:"#FF8A5C",title:"Food",blurb:"Eat before or after the show: seafood boils, hot pot, dim sum, Korean BBQ, ramen, sushi, Thai, tacos, burgers, pizza, dessert, food halls, food trucks, 24-hour diners and tasting menus.",
    icon:'<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>'},
  after:{name:"Afters & late night",c:"#B48CFF",title:"Afters",blurb:"Where the night goes after the show: speakeasies, karaoke, pool, rooftops and hotel bars anyone can walk into.",
    icon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v4M15 5h4"/>'}};
const CHILL={c:"#8FB4FF",title:"Chill spots",blurb:"Beaches, coves and stargazing. Most close by 10 PM, a few run till midnight."};
const SCR=k=>KINDS[k]||CHILL, TAGF=["Fire rings","Tide pools","Sunset"];
const hasTag=(p,t)=>(p.t||[]).some(x=>x.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
let cur="after", sub="", late=false, tag="";
const IC=N.IC, ic=N.ic;   // neon icon set lives in night.js (shared with the map)
const label=p=>p.c==="pool"?[ic("pool"),"Pool"]:[ic(p.c),(N.AC[p.c]||["","Spot"])[1]];
const SVC={sit:"Sit-down, 20% tip",bar:"20% tip on drinks",counter:"Counter service, tip optional",none:"No tip needed"};
const $r=(a,b)=>a===b?"$"+a:`$${a}–${b}`;
/* ---- Food extras: plan around a show (near it / still open after), $–$$$, saved, dietary, group bill, booking, Feed me ---- */
const F={show:"",open:false,price:"",diet:"",fav:false,spun:"",deal:false};let LASTX=[];
// Afters search: name, address, city, area/vibe tags, kind of place. Accents and punctuation don't matter.
let nowOnly=false;
/* "Open now", from the listed hours (most list only a closing time): 24-hour spots; an explicit "6 AM–10 PM" range that
   covers now; or "Till 2 AM" (with "2 AM Fri–Sat" / "closed Mon" exceptions) between 5 PM and closing. Before 6 AM counts
   as the night before. No hours listed = not shown as open. */
const DAYS=["sun","mon","tue","wed","thu","fri","sat"];
const tmin=t=>{t=String(t).trim().toLowerCase();if(t==="midnight")return 1440;if(t==="noon")return 720;
  const m=/^(\d{1,2})(?::(\d\d))?\s*(am|pm)$/.exec(t);if(!m)return null;const v=(+m[1]%12+(m[3]==="pm"?12:0))*60+(+m[2]||0);return v<360?v+1440:v;};   // minutes; before 6 AM = after midnight
const daySet=(a,b)=>{const i=DAYS.indexOf(a.slice(0,3).toLowerCase()),j=b?DAYS.indexOf(b.slice(0,3).toLowerCase()):i;if(i<0||j<0)return null;const out=new Set();for(let k=i;;k=(k+1)%7){out.add(k);if(k===j)break;}return out;};
const DAYRX="(sun|mon|tue|wed|thu|fri|sat)[a-z]*";
function openNow(p,at){
  // full weekly hours from Google (afters.json "wk", filled in by the daily hours run): exact, so it decides on its own
  if(Array.isArray(p.wk)&&p.wk.length){const d=at||new Date(),w=d.getDay()*1440+d.getHours()*60+d.getMinutes();
    return p.wk.some(([dy,o,c])=>{const a=dy*1440+o,b=dy*1440+c;return (w>=a&&w<b)||(w+10080>=a&&w+10080<b);});}
  const h=String(p.h||"");if(!h)return false;if(/24 hours/i.test(h))return true;
  const d=at||new Date();let mins=d.getHours()*60+d.getMinutes(),dow=d.getDay();if(d.getHours()<6){mins+=1440;dow=(dow+6)%7;}
  const cl=new RegExp("closed\\s+"+DAYRX+"(?:\\s*[–-]\\s*"+DAYRX+")?","i").exec(h);if(cl){const ds=daySet(cl[1],cl[2]);if(ds&&ds.has(dow))return false;}
  const lead=new RegExp("^"+DAYRX+"(?:\\s*[–-]\\s*"+DAYRX+")?\\b","i").exec(h);if(lead){const ds=daySet(lead[1],lead[2]);if(ds&&!ds.has(dow))return false;}
  const r=/(\d{1,2}(?::\d\d)?)\s*(AM|PM)?\s*[–-]\s*(\d{1,2}(?::\d\d)?\s*(AM|PM)|midnight)/i.exec(h);
  if(r&&!/^till/i.test(h)){let a=tmin(r[1]+" "+(r[2]||r[4]||"pm")),b=tmin(r[3]);if(a==null||b==null)return false;if(a>=1440)a-=1440;if(b<=a)b+=1440;return (mins>=a&&mins<b)||(mins-1440>=a&&mins-1440<b);}
  const rr=/till\s+~?(\d{1,2})\s*[–-]\s*\d{1,2}\s*(AM|PM)/i.exec(h);   // "Till ~1–2 AM": the earlier one
  const t=rr?[0,rr[1]+" "+rr[2]]:/till\s+~?(midnight|noon|\d{1,2}(?::\d\d)?\s*(?:AM|PM))/i.exec(h);if(!t)return false;let close=tmin(t[1]);
  const ov=new RegExp(",\\s*(midnight|\\d{1,2}(?::\\d\\d)?\\s*(?:AM|PM))\\s+"+DAYRX+"(?:\\s*[–-]\\s*"+DAYRX+")?","ig");let m;
  while((m=ov.exec(h))){const ds=daySet(m[2],m[3]);if(ds&&ds.has(dow))close=tmin(m[1]);}
  return close!=null&&mins>=17*60&&mins<close;}
let AQ="";const qn=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const aMatch=p=>{const q=qn(AQ);if(!q)return true;const hay=qn([p.n,p.a,p.city,(p.t||[]).join(" "),label(p)[1]].join(" "));return q.split(" ").every(w=>hay.includes(w));};
let PPL=1;try{PPL=Math.min(12,Math.max(1,+SH.store.raw("shack-fppl")||1));}catch(e){}
const FAV=new Set((()=>{try{return JSON.parse(SH.store.raw("shack-favfood")||"[]");}catch(e){return [];}})());
const saveFav=()=>{try{SH.store.put("shack-favfood",JSON.stringify([...FAV]));}catch(e){}};
const fkey=p=>p.n+"|"+(p.a||"");
const tierOf=p=>{const c=N.cost?N.cost(p):null;if(!c||c.free)return 1;const m=(c.all[0]+c.all[1])/2;return m<=25?1:m<=60?2:3;};   // $ ≤ $25, $$ ≤ $60, $$$ above (per person, all-in)
function sMin(e){return SH.minOfText(e.time);}
const clockS=m=>{const h=Math.floor(m/60)%24,mm=m%60;return (h%12||12)+(mm?":"+String(mm).padStart(2,"0"):"")+(h<12?" AM":" PM");};
const showEnd=e=>{const s=sMin(e);return {end:(s??20*60)+150,guess:s==null};};   // about 2.5 hours after the listed start (8 PM if no time listed)
const dayS=e=>parseDay(e.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const mi2=SH.miles;
function fromShow(p,e){const m=mi2(e.lat,e.lon,p.lat,p.lon);
  return m<=1.2?{mi:m,txt:`🚶 ~${Math.max(2,Math.round(m*20))} min walk from ${e.venue}`}:{mi:m,txt:`🚗 ~${fmtMins(SH.driveMin(m*1.2))} drive from ${e.venue}`};}
const pickedShow=()=>F.show?(state._up||[]).find(e=>hid(e)===F.show)||null:null;
// Afters: as you type, matching shows show up under the box (tap one to plan afters around it: closest to it, still open
// after it ends). Starred shows first, then soonest. No dropdown.
function showHits(){const q=qn(AQ);if(q.length<2)return [];const ws=q.split(" ");
  return (state._up||[]).filter(e=>typeof e.lat==="number"&&e.start&&ws.every(w=>qn([e.title,e.artists,e.venue,e.city].join(" ")).includes(w)))
    .sort((a,b)=>(state.stars.has(skey(b))-state.stars.has(skey(a)))||a.start.localeCompare(b.start)).slice(0,4);}
function aftQx(){const e=pickedShow();
  if(e){const se=showEnd(e);return `<div class="bsp-around"><span>${ic("fest","sm")}<span>After <b>${esc(String(e.title).slice(0,48))}</b><small>${esc(e.venue)} · ${esc(dayS(e))}</small></span></span><button type="button" data-ashowx aria-label="Stop planning around this show">✕</button></div>
    <div class="bft-row"><button type="button" class="chip" data-fopen aria-pressed="${F.open}">🌙 Still open after it ends</button><span class="bft-note">Ends around ${clockS(se.end)}${se.guess?" (guess, no start time listed)":""}. Closest to ${esc(e.venue)} first.</span></div>`;}
  const hs=showHits();if(!hs.length)return "";
  return `<div class="bsp-sug"><p>Plan afters around a show</p>${hs.map(x=>`<button type="button" data-ashow="${esc(hid(x))}">${state.stars.has(skey(x))?"★ ":""}<b>${esc(String(x.title).slice(0,44))}</b><small>${esc(x.venue)} · ${esc(dayS(x))}</small></button>`).join("")}</div>`;}
function foodTools(all){const aft=cur==="after",up=(state._up||[]).filter(e=>typeof e.lat==="number"),r=dayRange("tonight");
  const starred=up.filter(e=>state.stars.has(skey(e))).slice(0,15),tn=r?up.filter(e=>e.start<=r[1]&&(e.end||e.start)>=r[0]&&!state.stars.has(skey(e))).slice(0,25):[];
  const opt=x=>`<option value="${esc(hid(x))}"${F.show===hid(x)?" selected":""}>${esc(String(x.title).slice(0,38))} · ${esc(x.venue)} · ${esc(dayS(x))}</option>`;
  const e=pickedShow(),se=e&&showEnd(e),diets=[...new Set(all.flatMap(x=>x.p.diet||[]))];
  const box=`<label class="bvsearch bsp-q">${ni("search")}<input type="search" data-aq placeholder="${aft?"Search spots, or a show":`Search ${all.length} spots: name, area or food`}" value="${esc(AQ)}" autocomplete="off" enterkeyhint="search" aria-label="${aft?"Search afters or pick a show":"Search food"}"></label>`;
  if(aft)return box+`<div class="bsp-qx" id="bSpQx">${aftQx()}</div>`;
  return box+`<label class="bft-show">${ic("fest","sm")}<select data-fshow aria-label="Plan ${aft?"afters":"food"} around a show"><option value="">${aft?"After which show?":"Plan around a show…"}</option>
      ${starred.length?`<optgroup label="Your starred shows">${starred.map(opt).join("")}</optgroup>`:""}${tn.length?`<optgroup label="Tonight">${tn.map(opt).join("")}</optgroup>`:""}</select></label>
    ${e?`<div class="bft-row"><button type="button" class="chip" data-fopen aria-pressed="${F.open}">🌙 Still open after it ends</button><span class="bft-note">Ends around ${clockS(se.end)}${se.guess?" (guess, no start time listed)":""}. Closest to ${esc(e.venue)} first.</span></div>`:""}
    ${aft?"":`<div class="bft-row bft-chips">${["1","2","3"].map(v=>`<button type="button" class="chip" data-fprice="${v}" aria-pressed="${F.price===v}">${"$".repeat(+v)}</button>`).join("")}
      ${(()=>{const n=all.filter(x=>dealOf(x.p)).length;return n||F.deal?`<button type="button" class="chip bdeal-chip" data-fdeal aria-pressed="${F.deal}">🏷 Deals</button>`:"";})()}
      <button type="button" class="chip" data-ffav aria-pressed="${F.fav}">♥ Saved${FAV.size?" · "+FAV.size:""}</button>
      ${diets.map(d=>`<button type="button" class="chip" data-fdiet="${esc(d)}" aria-pressed="${F.diet===d}">🌱 ${esc(d)}</button>`).join("")}
      <span class="bft-ppl" role="group" aria-label="Group size for the bill"><button type="button" data-fppl="-1" aria-label="Fewer people">−</button><b>${PPL} ${PPL===1?"person":"people"}</b><button type="button" data-fppl="1" aria-label="More people">＋</button></span>
      <button type="button" class="chip bft-spin" data-fspin>🎲 Feed me</button></div>`}`;}
/* price block: total per person with ~9% tax and tip folded in, then the breakdown (+ the group bill on Food) */
function price(p){const c=N.cost?N.cost(p):null;if(!c)return "";
  const $r2=(a,b)=>c.plus?`$${a}+`:$r(a,b);
  if(c.free)return `<div class="spc-price free"><b>Free</b><span>${esc(c.what)}</span></div>`;
  const parts=[`${esc(c.what)} ${$r2(c.lo,c.hi)}`,`tax ~${$r2(c.tax[0],c.tax[1])}`];if(c.tip[1])parts.push(`tip ~${$r2(c.tip[0],c.tip[1])}`);
  const grp=cur==="food"&&PPL>1?`<small class="spc-grp">For ${PPL}: ≈ ${$r2(c.all[0]*PPL,c.all[1]*PPL)} total, about ${$r2(c.all[0],c.all[1])} each to split</small>`:"";
  const from=c.src==="google"?"Google diners' price per person":c.src==="pp"?"estimate for this place, not a quote":"typical price, not from the place";
  return `<div class="spc-price${c.src==="google"?" g":""}"><b>≈ ${$r2(c.all[0],c.all[1])}</b><span>per person, ${c.tip[1]?"with tax and tip":"with tax"}</span>
    <small>${parts.join(" · ")}</small>${grp}<small class="spc-svc">${SVC[c.svc]||""} · ${from}</small></div>`;}
const late24=p=>p.til>=24;
/* ---- deals: ones the daily refresh found on the place's own site (afters.json "deal"), plus ones the owner adds on the
   You page (Supabase food_deals). A deal shows until its end date; ones without an end date need a check in the last 120 days. ---- */
let DBD=null;
const dk=(n,c)=>String(n||"").toLowerCase().trim()+"|"+String(c||"").toLowerCase().trim();
function loadDeals(){SH.rpc("list_food_deals").then(r=>{DBD=Array.isArray(r)?r:[];home();if($("bSpots")&&BUI.screen==="spots")draw();}).catch(()=>{DBD=DBD||[];});}
loadDeals();
function dealOf(p){const t=todayStr(),old=new Date(Date.now()-120*864e5).toISOString().slice(0,10);
  const own=(DBD||[]).find(x=>dk(x.spot,x.city)===dk(p.n,p.city)||(!x.city&&dk(x.spot,"")===dk(p.n,"")));if(own)return own;
  const d=p.deal;return d&&d.t&&(d.until?d.until>=t:(d.chk||"")>=old)?d:null;}
const DOW={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
function clockMin(h,m,ap){h=+h%12+(ap.toLowerCase()==="pm"?12:0);return h*60+(+m||0);}
function dealWhen(txt){const out=[];
  for(const part of String(txt||"").split(/[,;]/)){const c=part.trim();if(!c)continue;
    let days=null;const dm=c.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?(?:\s*[–-]\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*)?/i);
    if(dm){const a=DOW[dm[1].toLowerCase()],b=dm[2]!=null?DOW[dm[2].toLowerCase()]:a;days=new Set();for(let i=a;;i=(i+1)%7){days.add(i);if(i===b)break;}}
    if(/\bdaily\b|every day/i.test(c))days=null;
    let from=null,to=null;const r=c.match(/(\d{1,2})(?::(\d\d))?\s*(am|pm)?\s*[–-]\s*(\d{1,2})(?::(\d\d))?\s*(am|pm)/i);
    if(r){to=clockMin(r[4],r[5],r[6]);from=clockMin(r[1],r[2],r[3]||r[6]);if(from>to&&!r[3])from-=720;}
    else{const f=c.match(/from\s+(\d{1,2})(?::(\d\d))?\s*(am|pm)/i);if(f)from=clockMin(f[1],f[2],f[3]);}
    if(from==null&&!days)continue;out.push({days,from,to});}
  return out;}
const fmtMin=m=>{const h=Math.floor(m/60)%24;return (h%12||12)+(m%60?":"+String(m%60).padStart(2,"0"):"")+(h<12?" AM":" PM");};
// 0 = on now, 1 = later today, 2 = not today / ended / unknown (sort key) + a short label
function dealNow(dl){const W=dealWhen(dl&&dl.d);if(!W.length)return {k:2,txt:""};const n=new Date(),day=n.getDay(),m=n.getHours()*60+n.getMinutes();
  const today=W.filter(w=>!w.days||w.days.has(day));if(!today.length)return {k:2,txt:"Not today"};
  const hol=typeof holidayOn==="function"&&holidayOn(todayStr());if(hol)return {k:2,txt:`${hol}: may not run`};
  for(const w of today){if(w.from==null)return {k:2,txt:""};if(m>=w.from&&(w.to==null||m<w.to))return {k:0,txt:w.to!=null?`On now · till ${fmtMin(w.to)}`:"On now"};}
  const later=today.filter(w=>w.from!=null&&m<w.from).sort((a,b)=>a.from-b.from)[0];
  return later?{k:1,txt:`Today from ${fmtMin(later.from)}`}:{k:2,txt:"Done for today"};}
function dealHtml(dl){if(!dl)return "";const u=dl.u&&safeUrl(dl.u),till=dl.until?parseDay(dl.until).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
  const st=dealNow(dl),chk=dl.chk?parseDay(dl.chk).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
  return `<p class="spc-deal${st.k===0?" on":""}"><span aria-hidden="true">🏷</span><span>${st.txt?`<em class="spc-dnow">${esc(st.txt)}</em>`:""}<b>${esc(dl.t)}</b>${dl.d?` · ${esc(dl.d)}`:""}${till?` · until ${esc(till)}`:""}${u?` · <a href="${esc(u)}" target="_blank" rel="noopener">Details ↗</a>`:""}${chk?` <small class="spc-dchk">✓ checked ${esc(chk)}</small>`:""}</span></p>`;}
window.SHACK_DEALS={reload:loadDeals,spots:()=>N.ready()?N.spots().filter(p=>N.grp(p)!=="chill").map(p=>({n:p.n,city:p.city||""})):[]};
function list(g){return N.spots().map((p,i)=>({p,i})).filter(x=>N.grp(x.p)===g);}
function sorted(xs){return xs.map(x=>({...x,d:driveEstimate(x.p.lat,x.p.lon)}))
  // closest first when we know where you start; otherwise known hours first, latest-open first
  .sort((a,b)=>(a.d?.mins??1e9)-(b.d?.mins??1e9)||(!!b.p.h-!!a.p.h)||((b.p.til||0)-(a.p.til||0))||a.p.n.localeCompare(b.p.n));}

/* ---- the card ---- */
function card({p,i,d,fs},vc){const [em,cat]=label(p),q=encodeURIComponent([p.n,p.a,p.city,"CA"].filter(Boolean).join(", "));
  const sub=p.bt||(p.c==="pool"?(p.t||[])[0]:"");
  const tags=[...(p.diet||[]).map(x=>"🌱 "+x),...(p.t||[]).filter(t=>t!==sub)].slice(0,4);
  const hrs=(!p.h?`<span class="spc-hrs none">Hours not listed</span>`:`<span class="spc-hrs${p.hq?" est":""}">${esc(p.h)}${p.hq?" <em>usually</em>":""}</span>`)+checkedTag(p);
  const icc=(IC[p.c]||["#E6DCFF"])[0],food=cur==="food",k=fkey(p),fav=FAV.has(k),spun=food&&F.spun===k,c=N.cost?N.cost(p):null;
  const book=food&&c&&c.svc==="sit"?`<p class="spc-book">Reserve: <a href="https://www.opentable.com/s?term=${encodeURIComponent(p.n+" "+p.city)}" target="_blank" rel="noopener">OpenTable ↗</a> · <a href="https://www.yelp.com/search?find_desc=${encodeURIComponent(p.n)}&find_loc=${encodeURIComponent((p.city||"")+", CA")}" target="_blank" rel="noopener">Yelp waitlist ↗</a></p>`:"";
  return `<article class="spc${spun?" spun":""}" style="--vc:${vc};--ic:${icc}">
    ${spun?'<span class="spc-spun">🎲 Picked for you</span>':""}
    <div class="spc-top"><span class="spc-badge">${em}</span><span class="spc-cat">${esc(cat)}${sub?` · ${esc(sub)}`:""}</span>${d?`<span class="spc-dr">${ic("drive","sm")}${fmtMins(d.mins)} · ${d.miles} mi</span>`:""}${food?`<button type="button" class="spc-fav${fav?" on":""}" data-fav="${esc(k)}" aria-pressed="${fav}" aria-label="${fav?"Remove from":"Save to"} your food spots">♥</button>`:""}</div>
    <h3>${esc(p.n)}</h3>
    ${p.area?`<p class="spc-where spc-area">📍 Parks around ${esc(p.area.t)}, ${esc(p.city)} <i>${p.area.r<=0.2?"within a block or two":"within ~"+p.area.r+" mi"}</i></p>`:`<p class="spc-where">${esc([p.a,p.city].filter(Boolean).join(", "))}</p>`}
    ${fs?`<p class="spc-from">${esc(fs.txt)}</p>`:""}
    <div class="spc-facts"><span class="spc-f">${CLOCK}${hrs}</span>${late24(p)?`<span class="spc-late">Open past midnight</span>`:""}</div>
    ${dealHtml(dealOf(p))}
    ${price(p)}
    ${tags.length?`<div class="spc-tags">${tags.map(t=>`<i>${esc(t)}</i>`).join("")}</div>`:""}
    ${book}
    <div class="spc-act"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">${p.area?"Directions to the area":"Directions"}</a>${p.c==="hotel"&&p.u&&safeUrl(p.u)?`<a href="${esc(safeUrl(p.u))}" target="_blank" rel="noopener">Schedule ↗</a>`:`<a href="https://www.google.com/maps/search/?api=1&query=${q}${p.gid?"&query_place_id="+encodeURIComponent(p.gid):""}" target="_blank" rel="noopener">${p.c==="beach"||p.c==="stars"?"Photos ↗":"Photos & hours ↗"}</a>`}<button type="button" class="nadd" data-naft="${i}">＋ Add to my night</button></div>
  </article>`;}
// when the hours were checked: Google-checked hours say so with the date; anything not re-checked in 30 days gets an amber line
function checkedTag(p){if(p.c==="beach"||p.c==="stars"||!p.hu)return "";
  const d=parseDay(p.hu),days=Math.floor((Date.now()-d)/864e5),when=d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  if(days>30)return `<small class="spc-chk old">Not re-checked since ${esc(when)}</small>`;
  return p.hs==="g"&&p.h?`<small class="spc-chk">✓ Google · ${esc(when)}</small>`:"";}
const CLOCK='<svg class="nic sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

/* ---- home tiles (after the four vibes, same look) ---- */
function tiles(){const t=$("bTiles");if(!t||t.querySelector("[data-spots]"))return;
  t.insertAdjacentHTML("beforeend",Object.entries(KINDS).map(([k,v])=>`<button type="button" class="btile t-${k}" data-spots="${k}" style="--vc:${v.c}">
    <svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span><b>${v.name}</b><small data-scount="${k}">&nbsp;</small></span></button>`).join(""));
  t.addEventListener("click",ev=>{const b=ev.target.closest("[data-spots]");if(b){ev.stopPropagation();open(b.dataset.spots);}},true);
  // Food and Afters arrive after the four vibe tiles: restart every tile's glow at once so all six stay in step
  const all=t.querySelectorAll(".btile");all.forEach(b=>b.classList.add("bt-sync"));void t.offsetWidth;all.forEach(b=>b.classList.remove("bt-sync"));}
function home(){tiles();if(!N.ready())return;
  for(const k in KINDS){const xs=list(k),el=document.querySelector(`[data-scount="${k}"]`);if(!el)continue;
    el.textContent=xs.length+" spots";}}

/* ---- the spots screen ---- */
function mount(){if($("bSpots"))return;const sec=document.createElement("section");sec.id="bSpots";sec.className="bspots";sec.setAttribute("aria-label","Spots");
  sec.innerHTML=`<div class="bbar-top"><button type="button" class="bback" data-sback aria-label="Back to vibes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><div class="btitle"><h1 id="bSpTitle"></h1><span class="blbl" id="bSpCount"></span></div></div>
    <p class="bsp-blurb" id="bSpBlurb"></p><div class="bsubs" id="bSpSubs"></div><div class="bft" id="bSpTools"></div><div class="spc-list" id="bSpList"></div>
    <p class="bsp-note">Hours marked <em>usually</em> come from listings that don't fully agree. Prices are typical Southern California prices per person with about 9% sales tax, not quotes from the places. Check before you go.</p>`;
  $("bHome").after(sec);
  sec.addEventListener("click",ev=>{if(ev.target.closest("[data-sback]")){if(cur==="chill")BUI.show("results");else BUI.goHome();return;}
    const c=ev.target.closest("[data-ssub]");if(c){sub=c.dataset.ssub;draw();return;}
    if(ev.target.closest("[data-slate]")){late=!late;draw();return;}
    // same path as the Map's "set start" button: open the start-point form on the Plan screen
    if(ev.target.closest("[data-sstart]")){state.view="list";BUI.show("budget");setTimeout(()=>{const b=$("startEdit");if(b)b.click();},80);return;}
    const tg=ev.target.closest("[data-stag]");if(tg){tag=tag===tg.dataset.stag?"":tg.dataset.stag;draw();return;}
    // Food extras
    const fv=ev.target.closest("[data-fav]");if(fv){const k=fv.dataset.fav;if(FAV.has(k))FAV.delete(k);else FAV.add(k);saveFav();draw();return;}
    if(ev.target.closest("[data-fopen]")){F.open=!F.open;draw();return;}
    const fp=ev.target.closest("[data-fprice]");if(fp){F.price=F.price===fp.dataset.fprice?"":fp.dataset.fprice;draw();return;}
    if(ev.target.closest("[data-ffav]")){F.fav=!F.fav;draw();return;}
    if(ev.target.closest("[data-fdeal]")){F.deal=!F.deal;draw();return;}
    const fd=ev.target.closest("[data-fdiet]");if(fd){F.diet=F.diet===fd.dataset.fdiet?"":fd.dataset.fdiet;draw();return;}
    const pp=ev.target.closest("[data-fppl]");if(pp){PPL=Math.min(12,Math.max(1,PPL+ +pp.dataset.fppl));try{SH.store.put("shack-fppl",PPL);}catch(e){}draw();return;}
    if(ev.target.closest("[data-fspin]")){const pool=LASTX.slice(0,12).filter(x=>fkey(x.p)!==F.spun);if(!pool.length)return;
      F.spun=fkey(pool[Math.floor(Math.random()*pool.length)].p);draw();const c=$("bSpList").querySelector(".spc.spun");if(c)c.scrollIntoView({behavior:"smooth",block:"center"});return;}});
  sec.addEventListener("input",ev=>{const q=ev.target.closest("[data-aq]");if(q){AQ=q.value;F.spun="";draw();}});
  sec.addEventListener("click",ev=>{
    const as=ev.target.closest("[data-ashow]");if(as){F.show=as.dataset.ashow;F.open=true;AQ="";F.spun="";const q=sec.querySelector("[data-aq]");if(q){q.value="";q.blur();}draw();$("bSpTools").scrollIntoView({block:"start",behavior:"smooth"});return;}
    if(ev.target.closest("[data-ashowx]")){F.show="";F.open=false;draw();return;}
    if(ev.target.closest("[data-snow]")){nowOnly=!nowOnly;draw();return;}
    if(ev.target.closest("[data-aqx]")){AQ="";const q=sec.querySelector("[data-aq]");if(q){q.value="";q.focus();}draw();}});
  sec.addEventListener("change",ev=>{const s=ev.target.closest("[data-fshow]");if(s){F.show=s.value;F.open=cur==="after"&&!!s.value;F.spun="";draw();}});}
function open(k){if(k!==cur){F.show="";F.open=false;AQ="";nowOnly=false;}cur=k;sub="";late=false;tag="";F.spun="";F.deal=false;mount();BUI.show("spots");}
function draw(){mount();const K=SCR(cur),all=list(cur);
  $("bSpTitle").textContent=K.title;$("bSpBlurb").textContent=K.blurb;
  $("bSpots").dataset.k=cur;
  // Pool goes right after "All" so it isn't lost off the end of the scrolling chip row
  const FRONT=["speak","truck","pool","hotel"],fr=c=>{const i=FRONT.indexOf(c);return i<0?99:i;};   // Pool and Hotel first so they aren't lost off the end of the row
  const cats=[...new Set(all.map(x=>x.p.c))].sort((a,b)=>fr(a)-fr(b)),nDeals=all.filter(x=>dealOf(x.p)).length;
  // Food: "Fun experiences" and "Splurge" chips first (just filters), then the categories
  const xch=cur==="food"?[["x:fun",ic("boil"),"Fun experiences"],["x:splurge",ic("fine"),"Splurge"]]:[];
  $("bSpSubs").innerHTML=(cats.length>1?[["","","All"],...xch,...cats.map(c=>[c,...label({c})])]:[]).map(([v,i,l])=>`<button type="button" class="chip spchip" data-ssub="${v}" aria-pressed="${v===sub}">${i}${esc(l)}</button>`).join("")
    +(cur!=="chill"?`<button type="button" class="chip" data-snow aria-pressed="${nowOnly}">🟢 Open now</button>`:"")
    +`<button type="button" class="chip" data-slate="1" aria-pressed="${late}">🌙 ${cur==="chill"?"Open till midnight":cur==="food"?"Late eats":"Past midnight"}</button>`
    +(cur==="after"&&(nDeals||F.deal)?`<button type="button" class="chip bdeal-chip" data-fdeal aria-pressed="${F.deal}">🏷 Deals</button>`:"")
    +(cur==="chill"?TAGF.map(t=>`<button type="button" class="chip" data-stag="${t}" aria-pressed="${tag===t}">${t==="Fire rings"?"🔥":t==="Tide pools"?"🦀":"🌅"} ${t}</button>`).join(""):"");
  const E=N.EXP||{},subOk=p=>!sub||(sub.startsWith("x:")?E[p.c]===sub.slice(2):p.c===sub);
  let xs=sorted(all.filter(x=>subOk(x.p)&&(!late||late24(x.p))&&(!tag||hasTag(x.p,tag))&&(!F.deal||dealOf(x.p))&&(cur==="chill"||aMatch(x.p))&&(!nowOnly||openNow(x.p))));
  if(F.deal&&(cur==="food"||cur==="after"))xs=xs.map((x,j)=>({x,j,k:dealNow(dealOf(x.p)).k})).sort((a,b)=>a.k-b.k||a.j-b.j).map(o=>o.x);
  const tools=cur==="food"||cur==="after",e=tools?pickedShow():null;
  if(cur==="food")xs=xs.filter(x=>(!F.price||String(tierOf(x.p))===F.price)&&(!F.fav||FAV.has(fkey(x.p)))&&(!F.diet||(x.p.diet||[]).includes(F.diet)));
  if(tools){
    if(e){xs.forEach(x=>x.fs=fromShow(x.p,e));if(F.open){const end=showEnd(e).end;xs=xs.filter(x=>x.p.til&&x.p.til*60>=end);}xs.sort((a,b)=>a.fs.mi-b.fs.mi);}
    LASTX=xs.slice();
    if(F.spun){const i=xs.findIndex(x=>fkey(x.p)===F.spun);if(i>0)xs.unshift(xs.splice(i,1)[0]);}}
  const tb=$("bSpTools");const qi=tb.querySelector("[data-aq]");
  if(tools&&tb.dataset.k===cur&&qi&&qi===document.activeElement){const qx=$("bSpQx");if(qx)qx.innerHTML=aftQx();}   // typing: keep the box (and the keyboard), refresh the show suggestions
  else{tb.innerHTML=tools?foodTools(all):"";tb.dataset.k=cur;}tb.hidden=!tools;
  $("bSpCount").textContent=xs.length+(xs.length===1?" spot":" spots")+(e?" · closest to the show":origin?" · closest first":"");
  const hint=origin?"":`<button type="button" class="spc-start" data-sstart>${ic("drive")}<span><b>See drive times</b><small>Set where you're starting from</small></span></button>`;
  $("bSpList").innerHTML=hint+(nowOnly?`<p class="bsp-nownote">🟢 Going by listed hours.${xs.some(x=>!x.p.wk)?" Where we only know closing time, \"open now\" starts at 5 PM, so daytime shows fewer.":""} Check before you go.</p>`:"")
    +(xs.length?xs.map(x=>card(x,K.c)).join(""):AQ&&cur!=="chill"?`<p class="bnone">No ${cur==="after"?"afters":"food spots"} match “${esc(AQ)}”${cur==="after"&&showHits().length?" (pick a show above to plan around it)":""}. <button type="button" class="blink" data-aqx>Clear search</button></p>`
      :nowOnly?'<p class="bnone">None of these list hours that put them open right now.</p>':'<p class="bnone">Nothing here yet.</p>');}

/* ---- Chill & community results: a row of chill spots (beaches, stargazing) above the events ---- */
function chillRow(on){let el=$("bChillSpots");
  if(!on||!N.ready()){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement("section");el.id="bChillSpots";el.className="bchill";$("list").before(el);}
  const xs=sorted(list("chill"));el.hidden=!xs.length;
  const sig=xs.map(x=>x.i).join(",")+(origin?origin.lat:"");if(el.dataset.sig===sig)return;el.dataset.sig=sig;
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">Chill spots · ${xs.length}</h2><button type="button" class="blink" data-sall>See all</button></div><div class="spc-row">${xs.slice(0,8).map(x=>card(x,CHILL.c)).join("")}</div>`;
  el.querySelector("[data-sall]").onclick=()=>open("chill");}

/* ---- Chill & community results: "Back next summer" for seasonal series (community.json "seasonal") ---- */
function seasonRow(on){let el=$("bSeason");const S=window.SHACK_SEASONAL||[];
  if(!on||!S.length){if(el)el.hidden=true;return;}
  if(!el){el=document.createElement("section");el.id="bSeason";el.className="bchill bback-f";$("list").after(el);}
  el.hidden=false;if(el.dataset.n==S.length)return;el.dataset.n=S.length;
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">Back next summer · ${S.length}</h2></div>
    <p class="bsp-note">Free summer series that ran in 2026. 2027 dates aren't announced yet.</p>
    <div class="spc-row">${S.map(f=>`<article class="spc" style="--vc:${CHILL.c};--ic:${CHILL.c}">
      <div class="spc-top"><span class="spc-badge">${ic("jazz")}</span><span class="spc-cat">${esc(f.g||"Summer series")}</span></div>
      <h3>${esc(f.n)}</h3><p class="spc-where">${esc([f.venue,f.city].filter(Boolean).join(", "))}</p>
      <div class="spc-facts"><span class="spc-f">${CLOCK}<span class="spc-hrs">Last: ${esc(f.last)}</span></span></div>
      <p class="spc-where">Usually: ${esc(f.usual)} · <b>2027 dates TBA</b></p>${f.note?`<p class="spc-where">${esc(f.note)}</p>`:""}
      <div class="spc-act"><a href="${esc(safeUrl(f.url)||"#")}" target="_blank" rel="noopener">Source ↗</a></div></article>`).join("")}</div>`;}

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

/* ---- space ramen (pull the disco ball down, swipe the bowl 4 times): a random food spot + an afters spot pop up ----
   Food: within ~35 min if we know your start point. Afters: near that food spot when one is close, so the two make a night. */
let RLAST=[];
function ramenPick(){const rnd=a=>a[Math.floor(Math.random()*a.length)];
  const near=xs=>{if(!origin)return xs;const n=xs.filter(x=>{const d=driveEstimate(x.p.lat,x.p.lon);return d&&d.mins<=35;});return n.length>=5?n:xs;};
  let foods=near(list("food")).filter(x=>!RLAST.includes(x.i));if(!foods.length)foods=list("food");
  const f=rnd(foods);if(!f)return null;
  const aft=list("after").filter(x=>!RLAST.includes(x.i)),close=aft.filter(x=>mi2(f.p.lat,f.p.lon,x.p.lat,x.p.lon)<=6);
  const a=rnd(close.length>=2?close:near(aft.length?aft:list("after")));
  RLAST=[f.i,a&&a.i].filter(x=>x!=null);
  return {f,a};}
let POPENER=null;
function ramenPop(){if(!N.ready())return;const pk=ramenPick();if(!pk)return;let el=$("rPop");if(!el||el.hidden)POPENER=document.activeElement;
  const keepCur=cur;cur="pop";   // pop-up cards skip the Food-screen extras (save heart, group bill)
  const one=(x,vc,lbl)=>x?`<div class="rpop-slot"><span class="rpop-l" style="--vc:${vc}">${lbl}</span>${card({...x,d:driveEstimate(x.p.lat,x.p.lon)},vc)}</div>`:"";
  const html=one(pk.f,KINDS.food.c,"🍜 Eat")+one(pk.a,KINDS.after.c,"🌙 Afters")+(pk.a&&pk.f?`<p class="rpop-gap">${(()=>{const m=mi2(pk.f.p.lat,pk.f.p.lon,pk.a.p.lat,pk.a.p.lon);return m<=1.2?`🚶 ~${Math.max(2,Math.round(m*20))} min walk between them`:`🚗 ~${fmtMins(Math.max(5,Math.round((6+m*1.2/55*60)/5)*5))} between them`;})()}</p>`:"");
  cur=keepCur;
  if(!el){el=document.createElement("div");el.id="rPop";el.className="rpop";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Space ramen picks");document.body.appendChild(el);
    el.addEventListener("click",ev=>{if(ev.target===el||ev.target.closest("[data-rx]")){closePop();return;}
      if(ev.target.closest("[data-ragain]")){ramenPop();return;}
      const both=ev.target.closest("[data-rboth]");if(both&&N.addStop&&N.stopFor){const A=N.spots(),ids=[...el.querySelectorAll("[data-naft]")].map(b=>+b.dataset.naft);let n=0;
        ids.forEach(i=>{const p=A[i];if(p&&N.addStop(N.stopFor(p),true))n++;});
        el.querySelectorAll("[data-naft]").forEach(b=>{b.classList.add("done");b.textContent="✓ Added";});both.disabled=true;both.textContent=n?"✓ Both in your night":"Your night is full";
        if(n&&N.toast)N.toast("Food and afters are in your night","Open",()=>{closePop();const t=document.querySelector('#bTabs [data-tab="budget"]');if(t)t.click();});}});
    document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&$("rPop")&&!$("rPop").hidden)closePop();});}
  el.innerHTML=`<div class="rpop-in"><div class="rpop-top"><span class="rpop-k">🍜 The bowl has spoken</span><button type="button" class="rpop-x" data-rx aria-label="Close">✕</button></div>
    <div class="rpop-cards">${html}</div>
    <div class="rpop-go"><button type="button" class="rpop-main" data-rboth>＋ Add both to my night</button><button type="button" data-ragain>🍜 Slurp again</button></div>
    <p class="rpop-fine">Random picks from the Shack's food and afters lists. Hours and prices are typical, so check before you go.</p></div>`;
  el.hidden=false;document.documentElement.classList.add("rpop-on");
  const box=el.querySelector(".rpop-in");if(box.animate&&!matchMedia("(prefers-reduced-motion: reduce)").matches)box.animate([{transform:"translateY(40px) scale(.94)",opacity:0},{transform:"none",opacity:1}],{duration:320,easing:"cubic-bezier(.2,1.3,.4,1)"});
  el.querySelector(".rpop-x").focus({preventScroll:true});}
function closePop(){const el=$("rPop");if(el){el.hidden=true;document.documentElement.classList.remove("rpop-on");if(POPENER&&POPENER.focus)POPENER.focus({preventScroll:true});}}

window.SPOTS={home,ramenPop,after(screen,c){if(screen==="spots")draw();chillRow(screen==="results"&&c==="chill"&&!state.sub);seasonRow(screen==="results"&&c==="chill"&&(!state.sub||state.sub==="market"));
  backRow(screen==="results"&&c==="music"&&state.sub==="festival");}};
document.addEventListener("shack:spots",()=>{home();const s=BUI.screen;if(s==="spots")draw();else if(s==="results")render();});
tiles();
})();
