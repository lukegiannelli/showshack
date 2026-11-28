/* ===== Tickets: one place to buy what you've starred or planned, right when it's time =====
   - "shack-tix" = {key: "YYYY-MM-DD"} shows you've marked "Got tickets" (synced by cloud.js when signed in)
   - key is the show's skey ("e:<id>") when we can find it, else "n:<title>|<date>" for a hand-typed night stop
   - Tap a Tickets link on a show you care about, come back to the Shack, and it asks once: "Get 'em?" */
(()=>{
const KEY="shack-tix";
let GOT=SH.store.get(KEY,{})||{};
addEventListener("shack:store",ev=>{if(ev.detail&&ev.detail.key===KEY)GOT=SH.store.get(KEY,{})||{};});   // cloud sync landed
const day=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>day(new Date());
const fmtDay=s=>{if(!s)return "";const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});};
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const allEv=()=>typeof state==="undefined"?[]:[...(state.events||[]),...(state.picks||[]).map(p=>({...p,added:true}))];

const has=k=>!!GOT[k];
function set(k,on){if(on)GOT[k]=today();else delete GOT[k];
  // forget shows that already happened (keys can't tell us the date, so keep at most 150, newest first)
  const ks=Object.keys(GOT);if(ks.length>150)ks.sort((a,b)=>GOT[a].localeCompare(GOT[b])).slice(0,ks.length-150).forEach(x=>delete GOT[x]);
  SH.store.set(KEY,GOT);sync(k);}

// a night stop -> the show it came from (title + "venue, city"), so starring and planning share one "Got tickets"
function evOfStop(s){const n=norm(s.n),p=norm(s.p);if(!n)return null;
  return allEv().find(e=>norm(e.title)===n&&(!p||norm([e.venue,e.city].filter(Boolean).join(", "))===p)&&(!s.sd||e.start===s.sd||(e.start<=s.sd&&(e.end||e.start)>=s.sd)))||null;}
function stopKey(s,d){const e=evOfStop(s);return e?skey(e):"n:"+norm(s.n)+"|"+(s.sd||d||"");}

// what buying looks like for this show (ignoring whether you already have tickets)
function need(e){const pi=priceInfo(e);
  if(pi.cancel)return "cancel";if(pi.sold)return "sold";
  if(typeof tixWord==="function"&&tixWord(e,pi)!=="Tickets")return "none";   // free, donation, open mic, sign-up: nothing to buy
  if(e.onSaleAt&&e.onSaleAt>today()&&e.status==="announced")return "soon";
  return safeUrl(e.url)?"buy":"none";}
const stateOf=e=>has(skey(e))?"got":need(e);

// everything you've starred or put in a night, still ahead of you
function items(){const t=today(),seen=new Set(),out=[];
  const add=(it)=>{if(seen.has(it.key))return;seen.add(it.key);out.push(it);};
  const fromEv=(e,src)=>{if(!e.start||(e.end||e.start)<t||e.recurrence)return;const st=stateOf(e);if(st==="none")return;
    add({key:skey(e),e,title:e.title,where:[e.venue,e.city].filter(Boolean).join(" · "),date:e.start<t?t:e.start,url:safeUrl(e.url),st,on:e.onSaleAt,src,price:priceInfo(e)});};
  const evs=allEv();
  if(typeof state!=="undefined")evs.forEach(e=>{if(state.stars.has(skey(e)))fromEv(e,"star");});
  const nights=window.NIGHT&&NIGHT.allNights?NIGHT.allNights():[];
  for(const {p} of nights)for(const s of p.s){if(s.k!=="show")continue;const e=evOfStop(s);
    if(e){fromEv(e,"night");continue;}
    const d=s.sd||p.d;if(!d||d<t||!s.u)continue;const k=stopKey(s,p.d);
    add({key:k,title:s.n||"Show",where:s.p||"",date:d,url:safeUrl(s.u),st:has(k)?"got":"buy",src:"night"});}
  const rank={buy:0,soon:1,sold:2,cancel:3,got:4};
  return out.sort((a,b)=>rank[a.st]-rank[b.st]||(a.st==="soon"?(a.on||"").localeCompare(b.on||""):0)||a.date.localeCompare(b.date));}

const gotBtn=(k,on,label)=>`<button type="button" class="tx-got${on?" on":""}" data-tixgot="${esc(k)}" aria-pressed="${on}">${on?"✓ Got tickets":label||"Got 'em?"}</button>`;
const buyBtn=(k,url,label)=>url?`<a class="tx-buy" href="${esc(url)}" target="_blank" rel="noopener" data-tixbuy="${esc(k)}">${ni("ticket")} ${label||"Buy tickets"} ↗</a>`:"";
function rowHTML(it){const p=it.price,fee=it.e&&it.e.priceSrc==="ticketmaster";
  const pr=p&&!p.sold&&p.lo!=null&&!p.free?(p.est?"≈ $"+Math.round(p.lo)+" typical":fee?"≈ $"+allIn(it.e,p.lo)+" w/ fees":"from $"+Math.round(p.lo)):"";
  const pre=it.e&&it.e.presaleAt&&it.e.presaleAt>=today()?`<span class="tx-pill soon">Presale ${esc(fmtDay(it.e.presaleAt))}</span>`:"";
  const when=it.st==="soon"?pre+`<span class="tx-pill soon">On sale ${esc(fmtDay(it.on))}</span>`:it.st==="sold"?`<span class="tx-pill sold">Sold out</span>`
    :it.st==="cancel"?`<span class="tx-pill sold">Cancelled</span>`:it.st==="got"?`<span class="tx-pill got">You're set</span>`:`<span class="tx-pill buy">On sale now</span>`;
  const acts=it.st==="buy"?buyBtn(it.key,it.url)+gotBtn(it.key,false)
    :it.st==="soon"?`<button type="button" class="tx-cal" data-tixcal="${esc(it.key)}">⏰ Remind me</button>`+buyBtn(it.key,it.url,"Ticket page")
    :it.st==="sold"?buyBtn(it.key,it.url,"Check for resale")+gotBtn(it.key,false)
    :it.st==="got"?gotBtn(it.key,true):"";
  const calB=it.st==="cancel"?"":`<button type="button" class="tx-cal" data-tixshow="${esc(it.key)}" aria-label="Add ${esc(it.title)} to your calendar">📅 Calendar</button>`;
  return `<li class="tx-row tx-s-${it.st}"><div class="tx-d"><b>${esc(fmtDay(it.date).split(", ")[1]||"")}</b><small>${esc(fmtDay(it.date).split(", ")[0])}</small></div>
    <div class="tx-b"><div class="tx-top">${when}${pr?`<span class="tx-pr">${pr}</span>`:""}${it.src==="night"?`<span class="tx-src">🌙 in a night</span>`:""}</div>
    <b class="tx-t">${esc(it.title)}</b><span class="tx-w">${esc(it.where)}</span>${acts||calB?`<div class="tx-acts">${acts}${calB}</div>`:""}</div></li>`;}

function sectionHTML(){const xs=items(),need=xs.filter(x=>x.st==="buy"),soon=xs.filter(x=>x.st==="soon"),got=xs.filter(x=>x.st==="got"),rest=xs.filter(x=>x.st==="sold"||x.st==="cancel");
  const lede=!xs.length?`<p class="bset-p">Star a show (☆) or add it to a night, and it lands here with a buy button the moment tickets are on sale.</p>`
    :`<p class="bset-p tx-lede">${need.length?`<b>${need.length} to buy</b>`:"Nothing to buy right now"}${soon.length?` · ${soon.length} on sale soon`:""}${got.length?` · ${got.length} sorted ✓`:""}</p>`;
  return `<section class="byou-sec tx-sec" id="bTix"><h3>🎟 Your tickets</h3>${lede}
    ${need.length||soon.length||rest.length?`<ul class="tx-list">${[...need,...soon,...rest].slice(0,12).map(rowHTML).join("")}</ul>`:""}
    ${got.length?`<details class="tx-gotlist"><summary>Got tickets (${got.length})</summary><ul class="tx-list">${got.map(rowHTML).join("")}</ul></details>`:""}
    ${xs.length?`<p class="tx-fine">Ticketmaster prices include an estimated ~30% in fees; other sellers' prices are all-in. "Got tickets" lives on this phone (and syncs if you're signed in).</p>`:""}</section>`;}
function redraw(){const el=document.getElementById("bTix");if(el)el.outerHTML=sectionHTML();}
// flip every "Got 'em" button for this show in place, wherever it's showing (You page, night builder, Night Card)
function sync(k){document.querySelectorAll("[data-tixgot]").forEach(b=>{if(b.dataset.tixgot!==k)return;const on=has(k);b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));b.textContent=on?"✓ Got tickets":"Got 'em?";
    const row=b.closest(".bn-tix");if(row)row.classList.toggle("got",on);});
  clearTimeout(sync.t);sync.t=setTimeout(redraw,700);}   // let the tap land before the list re-sorts

// for the night builder / Night Card: one strip under a show stop
function stopHTML(s,d){const k=stopKey(s,d),e=evOfStop(s),on=has(k),st=e?need(e):"buy",u=safeUrl(s.u||(e&&e.url)||"");
  if(st==="none")return "";   // everything renders; CSS hides the buy bits once it's marked "got", so un-marking brings them back
  const lead=st==="soon"?`<span class="tx-pill soon">On sale ${esc(fmtDay(e.onSaleAt))}</span>`:st==="sold"?`<span class="tx-pill sold">Sold out</span>`:st==="cancel"?`<span class="tx-pill sold">Cancelled</span>`:`<span class="tx-pill buy">Need tickets</span>`;
  return `<div class="bn-tix${on?" got":""}">${lead}${u?buyBtn(k,u,st==="soon"?"Ticket page":st==="sold"?"Resale":"Buy"):""}${st==="soon"?`<button type="button" class="tx-cal" data-tixcal="${esc(k)}">⏰ Remind me</button>`:""}${gotBtn(k,on)}</div>`;}

// "on sale" reminder: 9:50 AM on the on-sale day (most on-sales start at 10), with the ticket link. Shared calendar (SH.cal in core.js).
function cal(k){const e=allEv().find(x=>skey(x)===k);if(!e||!e.onSaleAt)return;const u=safeUrl(e.url)||"";
  SH.cal.add({uid:"onsale-"+e.id,title:"🎟 Tickets on sale: "+e.title,date:e.onSaleAt,min:9*60+50,dur:25,alarm:10,location:[e.venue,e.city].filter(Boolean).join(", "),url:u,
    desc:`${e.title} at ${e.venue} on ${fmtDay(e.start)}.\nOn-sale time isn't listed; 10 AM is most common, so check the page.`});}
// the show itself → your calendar (Your tickets rows)
function showCal(k){const it=items().find(x=>x.key===k);if(!it)return;
  if(it.e&&window.shackCalEv){SH.cal.add(shackCalEv(it.e));return;}
  SH.cal.add({uid:"tix-"+k,title:it.title,date:it.date,min:null,location:it.where.replace(" · ",", "),url:it.url||"",desc:"Time TBA. Check the seller's page before you go. From The Show Shack"});}

// tapped a ticket link, then came back: ask once
let pending=null;
function keyFromCard(a){const fc=a.closest(".bfc[data-k]");if(fc)return fc.dataset.k;const art=a.closest("article.card[id]");if(!art)return null;
  const e=allEv().find(x=>hid(x)===art.id);return e?skey(e):null;}
function care(k){if(typeof state==="undefined")return false;if(state.stars.has(k))return true;
  return (window.NIGHT&&NIGHT.allNights?NIGHT.allNights():[]).some(({p})=>p.s.some(s=>s.k==="show"&&stopKey(s,p.d)===k));}
document.addEventListener("click",ev=>{
  const g=ev.target.closest("[data-tixgot]");if(g){ev.preventDefault();ev.stopPropagation();const k=g.dataset.tixgot,on=!has(k);set(k,on);
    if(on&&window.NIGHT&&NIGHT.toast)NIGHT.toast("Nice. Marked as got tickets 🎟","Undo",()=>set(k,false));return;}
  const sc=ev.target.closest("[data-tixshow]");if(sc){ev.preventDefault();ev.stopPropagation();showCal(sc.dataset.tixshow);return;}
  const c=ev.target.closest("[data-tixcal]");if(c){ev.preventDefault();ev.stopPropagation();cal(c.dataset.tixcal);return;}
  const b=ev.target.closest("[data-tixbuy]");
  const a=b||ev.target.closest("a.tix,a.bfb-main");if(!a)return;
  const k=b?b.dataset.tixbuy:keyFromCard(a);if(!k||has(k)||(!b&&!care(k)))return;   // plain cards only ask about shows you starred or planned
  const t=(a.closest(".tx-row,.bn-stop,.nv-b,.card,.bfc")||document).querySelector(".tx-t,.bn-nm b,b,h3");
  pending={k,title:t?t.textContent.trim():"this show",at:Date.now()};},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden||!pending)return;const p=pending;pending=null;
  if(Date.now()-p.at<4000||has(p.k)||!(window.NIGHT&&NIGHT.toast))return;   // bounced right back: they didn't buy anything
  setTimeout(()=>NIGHT.toast(`Get tickets for <b>${esc(p.title.slice(0,60))}</b>?`,"✓ Got 'em",()=>set(p.k,true),9000),400);});

// a dot on the You tab when a show you care about just went on sale (last 3 days) or has a presale/on-sale today.
// Opening You clears it until something new opens.
const SEENK="shack-tix-seen";
function alerts(){const t=today(),d3=day(new Date(Date.now()-3*864e5));
  return items().filter(it=>it.e&&((it.st==="buy"&&it.e.onSaleAt&&it.e.onSaleAt>=d3&&it.e.onSaleAt<=t)||(it.st!=="got"&&(it.e.presaleAt===t||it.e.onSaleAt===t))))
    .map(it=>it.key+"|"+(it.e.presaleAt===t?"pre":it.e.onSaleAt));}
function dot(){const b=document.getElementById("bYouTab");if(!b)return;let seen=[];try{seen=SH.store.get(SEENK,[])||[];}catch(e){}
  const n=alerts().filter(x=>!seen.includes(x)).length;b.classList.toggle("bdot",n>0);
  if(n)b.setAttribute("aria-label",`You: ${n} show${n>1?"s":""} on sale`);else b.removeAttribute("aria-label");}
function clearDot(){const a=alerts();try{SH.store.set(SEENK,a.slice(-60));}catch(e){}dot();}
document.addEventListener("click",ev=>{if(ev.target.closest("#bYouTab"))setTimeout(clearDot,300);},true);
addEventListener("shack:store",ev=>{const k=ev.detail&&ev.detail.key;if(k==="radar-stars"||k===KEY||k==="shack-nights"){clearTimeout(dot.t);dot.t=setTimeout(dot,800);}});
[2500,7000].forEach(ms=>setTimeout(dot,ms));   // after the show list (and any cloud sync) has landed
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(dot,500);});

window.SHACK_TIX={has,set,items,sectionHTML,stopHTML,stopKey,redraw,dot};
})();
