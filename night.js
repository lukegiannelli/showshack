/* ===== Night Card (beta). The whole plan lives in the link (#n=…). Nothing is sent to a server, no sign-in. =====
   Loaded only by pages that set window.NIGHT_BETA. Uses app.js globals (state, esc, safeUrl, hid, POOL, origin, driveEstimate, fmtMins, NEON8). */
(function(){
if(!window.NIGHT_BETA)return;
const $=id=>document.getElementById(id);
const KEY="shack-night", MAXS=12;
const TYPES={meet:["📍","Meet up","#7ee0b8"],eat:["🍜","Eat","#FFC66B"],show:["🎟️","Show","#FF6FA5"],after:["🌙","Afters","#b48cff"],house:["🏠","Someone's place","#7fd4ff"],other:["✨","Other","#e6dcff"]};
const AC={kbbq:["🥩","Korean BBQ"],karaoke:["🎤","Karaoke"],arcade:["🕹️","Arcades & barcades"],bowl:["🎳","Bowling"],spa:["♨️","24h Korean spa"],jazz:["🎷","Jazz & listening bars"],roof:["🌃","Rooftops"],stars:["🔭","Stargazing"],beach:["🌊","Beaches"],pool:["🎱","Pool"],
  ramen:["🍜","Ramen"],tacos:["🌮","Tacos & Mexican"],pho:["🍲","Pho & Vietnamese"],korean:["🥘","Korean comfort food"],diner:["🍳","24h diners"],
  boil:["🦀","Seafood boils"],hotpot:["🍲","Hot pot"],hibachi:["🔥","Hibachi"],fine:["🥂","Tasting menus"],
  hotel:["🛎️","Hotel bars"],
  dimsum:["🥟","Dim sum"],thai:["🍛","Thai"],pizza:["🍕","Pizza"],dessert:["🍨","Dessert & boba"],hall:["🏪","Food halls & markets"]};
/* food that's an experience, not just a meal: fun = cheap-ish and hands-on, splurge = high-end night out */
const EXP={kbbq:"fun",boil:"fun",hotpot:"fun",hibachi:"fun",fine:"splurge"};
/* Typical SoCal prices per person (estimates, not from the places themselves). svc: sit = 20% tip on food, bar = 20% on drinks,
   counter = tip optional, none = no tip. A place can override with pp:[lo,hi] and svc in afters.json. */
const PRICE={kbbq:[35,50,"sit","All-you-can-eat"],ramen:[17,24,"sit","Bowl and a side"],tacos:[10,18,"counter","3 or 4 tacos and a drink"],
  pho:[15,22,"sit","Big bowl and a drink"],korean:[18,28,"sit","Main dish, banchan included"],diner:[16,26,"sit","Plate and coffee"],
  karaoke:[12,25,"none","Room split 4 ways, about 2 hrs"],arcade:[15,30,"none","Game card"],bowl:[18,30,"none","2 games and shoes"],
  spa:[25,40,"none","Day entry"],jazz:[20,40,"bar","Cover and a drink or two"],roof:[30,45,"bar","Two cocktails"],
  pool:[8,15,"none","Table split 2 ways, about 1.5 hrs"],
  boil:[25,40,"sit","A pound of seafood and sides"],hotpot:[30,50,"sit","Broth, meats and sides"],hibachi:[35,55,"sit","Hibachi dinner"],
  fine:[175,350,"sit","Tasting menu before drinks (varies a lot)"],
  hotel:[20,40,"bar","A drink or two; some nights have a table minimum"],
  dimsum:[25,40,"sit","Dim sum to share"],thai:[15,25,"sit","A main and a drink"],pizza:[8,15,"counter","A couple of slices"],
  dessert:[7,14,"counter","A treat or a boba"],hall:[15,30,"counter","A plate from one stall"],stars:[0,0,"none","Free"],beach:[0,0,"none","Free, parking may cost"]};
const TAX=.09,TIP=.2;
function cost(p){const r=PRICE[p.c];if(!r&&!p.pp)return null;const [lo,hi]=p.pp||r,svc=p.svc||(r?r[2]:"sit"),what=r&&!p.pp?r[3]:"Food";
  const tip=svc==="sit"||svc==="bar"?TIP:0,f=x=>Math.round(x);
  return {lo,hi,svc,what,tax:[f(lo*TAX),f(hi*TAX)],tip:[f(lo*tip),f(hi*tip)],all:[f(lo*(1+TAX+tip)),f(hi*(1+TAX+tip))],free:!hi};}
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
IC.drive=["#7EE0B8",'<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3Z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/><path d="M5 11h14"/>'];
IC.boil=["#FF6B6B",'<ellipse cx="12" cy="14" rx="6" ry="4.5"/><path d="M6.5 12.5 3 9.5l1.5-3M17.5 12.5 21 9.5l-1.5-3M3 9.5l2.5.5M21 9.5l-2.5.5M7 17.5l-2.5 2.5M17 17.5l2.5 2.5M10 10V8M14 10V8"/>'];
IC.hotpot=["#FFC66B",'<path d="M3 11h18v2a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7Z"/><path d="M12 11v9M1.5 11h2M20.5 11h2M8 7.5c0-1.2 1-1.2 1-2.5M15 7.5c0-1.2 1-1.2 1-2.5"/>'];
IC.hibachi=["#FF8A5C",'<path d="M2.5 20h19M5 20v-3h14v3"/><path d="M12 15c-3 0-4-2.2-3-4.5.7 1.2 1.6 1.4 1.6 1.4C10 9 11.5 6.5 13.5 5c-.4 2.2.8 3.2 1.6 4.4.9 1.4.6 5.6-3.1 5.6Z"/>'];
IC.fine=["#FFE7A3",'<path d="M7 2.5h4l-.5 6a1.5 1.5 0 0 1-3 0Z"/><path d="M9 10v9.5M6.5 19.5h5"/><path d="M15.5 4h3.5l-.6 7.5a1.2 1.2 0 0 1-2.3 0Z"/><path d="M17.2 13v6.5M15 19.5h4.5"/><path d="M20.5 2l.6 1.2M22 4.5l-1.2.4" opacity=".8"/>'];
IC.hotel=["#FFD27A",'<path d="M3 18h18M4.5 18a7.5 7.5 0 0 1 15 0"/><path d="M12 10.5V9M10.5 9h3"/><path d="M3 21h18"/><path d="M17.5 3.5v4.2"/><circle cx="16.3" cy="7.9" r="1.2"/><path d="M17.5 3.5l2.5.8" opacity=".85"/>'];
IC.dimsum=["#FFE7A3",'<ellipse cx="12" cy="9" rx="8" ry="2.5"/><path d="M4 9v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V9M4 12.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/><path d="M10 5.5c0-1 1-1 1-2M14 5.5c0-1 1-1 1-2" opacity=".8"/>'];
IC.thai=["#7EE0B8",'<path d="M3 12h18a9 8 0 0 1-18 0Z"/><path d="M8 9c1-2 3-2.5 4-4.5M13 9c.5-1.5 2-2 2.5-3.5"/><path d="M17 4.5c1.5.3 2.5 1.6 2 3.5" opacity=".8"/>'];
IC.pizza=["#FFC66B",'<path d="M3.5 6.5C9 2.5 15 2.5 20.5 6.5L12 21.5Z"/><path d="M5.3 8.6c4.4-2.7 9-2.7 13.4 0"/><circle cx="10" cy="11" r="1.2"/><circle cx="14" cy="13" r="1.1"/><circle cx="12" cy="16.5" r="1"/>'];
IC.dessert=["#FF8AD8",'<path d="M8 11 12 21.5 16 11"/><path d="M7.5 11a4.5 4.5 0 1 1 9 0Z"/><path d="M10 13.5l4 2M9.5 16l3 1.5" opacity=".7"/>'];
IC.hall=["#7FD4FF",'<path d="M3 10h18M4 10V20h16V10"/><path d="M3 10l2-5h14l2 5"/><path d="M6 10c0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0 0 1.5 3 1.5 3 0"/><path d="M10 20v-5h4v5"/>'];
IC.fest=["#FF6FA5",'<path d="M2.5 20.5 12 4l9.5 16.5Z"/><path d="M8.5 20.5 12 13l3.5 7.5M12 4V1.5l3 1-3 1"/>'];
const GO={drive:"🚗",ride:"🚕",walk:"🚶",transit:"🚇",there:"📍"};
const GOW={drive:"Driving",ride:"Rideshare",walk:"Walk",transit:"Transit",there:"Meet there"};
let AFTERS=[];
fetch("afters.json?v=8").then(r=>r.ok?r.json():{}).then(j=>{AFTERS=((j||{}).places||[]).filter(p=>typeof p.lat==="number"&&!p.gone);if(mapOn)drawLayer();document.dispatchEvent(new Event("shack:spots"));}).catch(()=>{});
const allAfters=()=>[...AFTERS,...(typeof POOL!=="undefined"?POOL:[]).map(p=>({...p,c:"pool",t:[p.c==="hall"?"Pool hall":"Bar with pool",...(p.t||[])]}))];
const GRP={dimsum:"food",thai:"food",pizza:"food",dessert:"food",hall:"food",boil:"food",hotpot:"food",hibachi:"food",fine:"food",kbbq:"food",ramen:"food",tacos:"food",pho:"food",korean:"food",diner:"food",beach:"chill",stars:"chill"},grp=p=>GRP[p.c]||"after";
const icon=c=>c==="pool"&&typeof NEON8==="string"?NEON8:`<span class="nemo">${(AC[c]||TYPES.other)[0]}</span>`;
// hours label: firm, "usually" (sources disagree / third-party only), or unknown
const hrs=p=>!p.h?"Hours not listed, check before you go":p.hq?`Usually ${p.h[0].toLowerCase()+p.h.slice(1)}, check before you go`:p.h;
function miles(a,b,c,d){return SH.miles(a,b,c,d);}

/* ---------- plan model + cleaning (links come from other people, so everything is re-checked) ---------- */
const S=(v,n)=>String(v??"").replace(/[\u0000-\u001f]/g," ").slice(0,n).trim();
const handle=v=>S(v,30).replace(/^[@$]/,"").replace(/[^A-Za-z0-9_-]/g,"");
const num=v=>{const x=parseFloat(v);return isFinite(x)&&x>=0&&x<100000?Math.round(x*100)/100:"";};
const hhmm=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v||"")?v:"";
function cleanStop(s){s=s||{};const k=TYPES[s.k]?s.k:"other";
  const o={k,n:S(s.n,80),p:S(s.p,90),a:k==="house"?"":S(s.a,120),tm:hhmm(s.tm),w:GO[s.w]?s.w:"",dr:S(s.dr,30),vh:handle(s.vh),ch:handle(s.ch).replace(/-/g,""),amt:num(s.amt),c:num(s.c),no:S(s.no,200),u:""};
  if(s.u&&typeof safeUrl==="function"){const u=safeUrl(s.u);if(u)o.u=String(u).slice(0,300);}
  if(k==="show"&&/^\d{4}-\d\d-\d\d$/.test(s.sd||""))o.sd=s.sd;
  if(typeof s.cl==="number"&&s.cl>=12&&s.cl<=36)o.cl=s.cl;
  if(k!=="house"&&typeof s.la==="number"&&typeof s.lo==="number"&&Math.abs(s.la)<=90&&Math.abs(s.lo)<=180){o.la=Math.round(s.la*1e5)/1e5;o.lo=Math.round(s.lo*1e5)/1e5;}
  Object.keys(o).forEach(x=>{if(o[x]===""||o[x]==null)delete o[x];});o.k=k;return o;}
function cleanPlan(p){p=p||{};return {v:1,t:S(p.t,70),d:/^\d{4}-\d\d-\d\d$/.test(p.d||"")?p.d:"",h:S(p.h,30),ph:S(p.ph,20).replace(/[^0-9+]/g,""),up:typeof p.up==="number"?p.up:0,s:(Array.isArray(p.s)?p.s:[]).slice(0,MAXS).map(cleanStop)};}
function load(){try{return cleanPlan(JSON.parse(SH.store.raw(KEY)||"null")||{});}catch(e){return cleanPlan({});}}
let plan=load();
/* ---------- saved nights: every plan you build is kept (this device only) so you can flip between several ---------- */
const NKEY="shack-nights",IDKEY="shack-night-id",MAXN=24;
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let NIGHTS=(()=>{try{const a=JSON.parse(SH.store.raw(NKEY)||"[]");return Array.isArray(a)?a.filter(x=>x&&typeof x.id==="string").map(x=>({id:x.id.slice(0,20),p:cleanPlan(x.p)})).slice(0,MAXN):[];}catch(e){return [];}})();
let planId=(()=>{try{return SH.store.raw(IDKEY)||"";}catch(e){return "";}})()||newId();
const keep=p=>p.s.length>0||!!p.t;   // an empty, unnamed night isn't worth a slot
function putNights(){try{SH.store.put(NKEY,JSON.stringify(NIGHTS));SH.store.put(IDKEY,planId);}catch(e){}}
function upsertNight(){const i=NIGHTS.findIndex(x=>x.id===planId);
  if(keep(plan)){const rec={id:planId,p:cleanPlan(plan)};if(i>=0)NIGHTS[i]=rec;else NIGHTS.unshift(rec);NIGHTS.sort((a,b)=>(b.p.up||0)-(a.p.up||0));if(NIGHTS.length>MAXN)NIGHTS.length=MAXN;}
  else if(i>=0)NIGHTS.splice(i,1);
  putNights();drawSaved();}
function save(){try{SH.store.put(KEY,JSON.stringify(plan));}catch(e){}upsertNight();}
// switch the Plan tab to another night (the one you were on stays saved)
function useNight(id,p){plan=cleanPlan(p||{});planId=id||newId();openI=-1;pickK="";flipped=false;save();drawBuilder();}

/* ---------- link encoding: JSON → deflate → base64url ("1…"), or plain base64url ("0…") where the browser can't compress ---------- */
const b64u=b=>{let s="";for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const unb64u=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");const r=atob(s+"===".slice((s.length+3)%4));return Uint8Array.from(r,c=>c.charCodeAt(0));};
async function pack(obj){const s=JSON.stringify(obj);
  if(window.CompressionStream){try{const st=new Blob([s]).stream().pipeThrough(new CompressionStream("deflate-raw"));return "1"+b64u(new Uint8Array(await new Response(st).arrayBuffer()));}catch(e){}}
  return "0"+b64u(new TextEncoder().encode(s));}
async function unpack(code){const f=code[0],b=unb64u(code.slice(1));let s;
  if(f==="1"){const st=new Blob([b]).stream().pipeThrough(new DecompressionStream("deflate-raw"));s=await new Response(st).text();}
  else if(f==="0")s=new TextDecoder().decode(b);else throw new Error("bad");
  if(s.length>40000)throw new Error("big");return JSON.parse(s);}
async function encode(p){const s=JSON.stringify(cleanPlan(p));
  if(window.CompressionStream){try{const st=new Blob([s]).stream().pipeThrough(new CompressionStream("deflate-raw"));return "1"+b64u(new Uint8Array(await new Response(st).arrayBuffer()));}catch(e){}}
  return "0"+b64u(new TextEncoder().encode(s));}
async function decode(code){const f=code[0],b=unb64u(code.slice(1));let s;
  if(f==="1"){const st=new Blob([b]).stream().pipeThrough(new DecompressionStream("deflate-raw"));s=await new Response(st).text();}
  else if(f==="0")s=new TextDecoder().decode(b);else throw new Error("bad");
  if(s.length>20000)throw new Error("big");return cleanPlan(JSON.parse(s));}
const base=()=>location.origin+location.pathname;
async function linkFor(p){return base()+"#n="+await encode(p);}

/* ---------- formatting ---------- */
const fmtT=t=>{if(!t)return "";let [h,m]=t.split(":").map(Number);const ap=h>=12?"PM":"AM";h=h%12||12;return h+(m?":"+String(m).padStart(2,"0"):"")+" "+ap;};
const fmtD=d=>{if(!d)return "";const [y,m,x]=d.split("-").map(Number);return new Date(y,m-1,x).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});};
const fmtUp=ms=>ms?new Date(ms).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
const dirQ=s=>s.a?[s.p||s.n,s.a].filter(Boolean).join(", "):(s.p||s.n||"");
const dirUrl=s=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dirQ(s))}`;
const venmo=s=>`https://venmo.com/u/${encodeURIComponent(s.vh)}`;
const cash=s=>`https://cash.app/$${encodeURIComponent(s.ch)}${s.amt?"/"+s.amt:""}`;
function parseTime(txt){return SH.hhmmOfText(txt);}
function goLine(s){if(!s.w)return "";const w=s.w==="drive"&&s.dr?`${esc(s.dr)} is driving`:GOW[s.w];return `${GO[s.w]} ${w}`;}

/* ---------- toast ---------- */
let tt=0;function toast(msg,act,fn){let el=$("nToast");if(!el){el=document.createElement("div");el.id="nToast";el.className="ntoast";el.setAttribute("role","status");document.body.appendChild(el);}
  el.innerHTML=`<span>${msg}</span>${act?`<button type="button">${act}</button>`:""}`;if(act)el.querySelector("button").onclick=()=>{el.classList.remove("on");fn();};
  el.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>el.classList.remove("on"),3800);}
const openPlan=()=>{const b=document.querySelector('#bTabs [data-tab="budget"]');if(b)b.click();setTimeout(()=>{const n=$("bNight");if(n)n.scrollIntoView({behavior:"smooth",block:"start"});},120);};

/* ---------- adding stops from anywhere ---------- */
// neon line icons for the Plan page (stop types, gas, money, search), drawn like the rest of the app's icons
const TP={meet:'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  eat:'<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3"/>',
  show:'<path d="M3 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" transform="translate(0 1)"/><path d="M14 5v14" stroke-dasharray="2 2.5"/>',
  after:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v4M15 5h4"/>',
  house:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  other:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  gas:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  money:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
  trash:'<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4l1-13"/><path d="M10 10.5v6.5M14 10.5v6.5"/>'};
const TPC={gas:"#7FD4FF",money:"#7EE0B8",search:"#FFC66B",trash:"#FF5C8A"};
const QUICKDEL=new Set(["meet","eat","show","after"]);   // meet-up, food, show and afters stops get a one-tap trash can
const tic=(k,cls="")=>`<svg class="nic ${cls}" viewBox="0 0 24 24" aria-hidden="true" style="--ic:${(TYPES[k]||[])[2]||TPC[k]||"#e6dcff"}">${TP[k]||TP.other}</svg>`;
// Eat and Afters land around the show: a timed show gives them times (eat 90 min before, afters ~2.5 h after);
// without a show time they're slotted just before / just after it in the list
const shiftT=(tm,m)=>{const [h,mm]=tm.split(":").map(Number);const t=(((h*60+mm+m)%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");};
const AROUND={eat:-90,after:150};
let lastAdded=null;
// the night's name and date follow its show: set when a show is added (unless you typed your own), reset when it's removed
const autoT=n=>{const t=String(n||"").split(/[:(–—]| - /)[0].trim().slice(0,40);return t?t+" night":"";};
function nameFromShow(c){if(!c.n)return;const shows=plan.s.filter(x=>x.k==="show");
  if(!plan.t||shows.some(x=>autoT(x.n)===plan.t))plan.t=autoT(c.n);
  if(c.sd&&(!plan.d||shows.some(x=>x.sd===plan.d)))plan.d=c.sd;}
function unnameShow(r){if(!r||r.k!=="show")return;const rest=plan.s.filter(x=>x.k==="show");
  if(plan.t&&plan.t===autoT(r.n))plan.t=rest.length?autoT(rest[0].n):"";
  if(r.sd&&plan.d===r.sd)plan.d=(rest.find(x=>x.sd)||{}).sd||"";}
function addStop(st,quiet){if(plan.s.length>=MAXS){toast("A night tops out at "+MAXS+" stops");return false;}
  const c=cleanStop(st),sh=plan.s.find(x=>x.k==="show");let at=-1;
  if(c.k==="show")nameFromShow(c);
  if(c.k==="meet")at=0;
  if(c.k==="show"&&c.tm)plan.s.forEach(x=>{if(!x.tm&&AROUND[x.k]!=null)x.tm=shiftT(c.tm,AROUND[x.k]);});
  if(sh&&!c.tm&&AROUND[c.k]!=null){if(sh.tm)c.tm=shiftT(sh.tm,AROUND[c.k]);else at=c.k==="eat"?plan.s.indexOf(sh):plan.s.lastIndexOf(plan.s.filter(x=>x.k==="show").pop())+1;}
  if(at>=0)plan.s.splice(at,0,c);else plan.s.push(c);lastAdded=c;sortStops();plan.up=Date.now();save();drawBuilder();
  if(!quiet)toast(`Added to your night${sh&&AROUND[c.k]!=null?(c.k==="eat"?", before the show":", after the show"):""}`,"Open",openPlan);return true;}
const allEv=()=>[...((typeof state!=="undefined"&&state.events)||[]),...((typeof state!=="undefined"&&state.picks)||[]).map(p=>({...p,added:true}))];
const evById=h=>allEv().find(e=>hid(e)===h);
function showStop(e,quiet){const st={k:"show",n:e.title,p:[e.venue,e.city].filter(Boolean).join(", "),tm:parseTime(e.time),u:e.url,la:e.lat,lo:e.lon};
  try{const pi=priceInfo(e);if(pi.free)st.c=0;else if(!pi.sold&&!pi.none&&pi.lo)st.c=Math.round(pi.lo);}catch(_){}
  if(e.start)st.sd=e.start<todayISO()?todayISO():String(e.start).slice(0,10);return st;}
function afterStop(p){return {cl:typeof p.til==="number"?p.til:undefined,k:grp(p)==="food"?"eat":"after",n:p.n,p:[p.a,p.city].filter(Boolean).join(", "),la:p.lat,lo:p.lon,no:"Hours: "+hrs(p)};}
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
// capture phase so the flip cards / card toggles never see these taps
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-nadd],[data-naft]");if(!b)return;ev.stopPropagation();ev.preventDefault();
  if(b.dataset.nadd){const e=evById(b.dataset.nadd);if(!e){toast("Couldn't find that show");return;}if(addStop(showStop(e))){b.classList.add("done");b.textContent="✓ In your night";}}
  else{const p=allAfters()[+b.dataset.naft];if(p&&addStop(afterStop(p))){b.classList.add("done");b.textContent="✓ Added";}}},true);
const addBtn=h=>`<button type="button" class="nadd" data-nadd="${esc(h)}">＋ My night</button><button type="button" class="ncal" data-ncal="${esc(h)}" aria-label="Add to calendar">📅</button>`;
// one show → a calendar file (start time from the listing, about 3 hours long; all-day when no time is listed)
function evIcs(e){const pad=n=>String(n).padStart(2,"0"),[y,m,d]=String(e.start).split("-").map(Number),tm=parseTime(e.time);
  const f=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00",escI=v=>String(v).replace(/\\/g,"\\\\").replace(/[,;]/g,c=>"\\"+c).replace(/\n/g,"\\n");
  let a,b;if(tm){const [h,mi]=tm.split(":").map(Number);const st=new Date(y,m-1,d,h,mi);a="DTSTART:"+f(st);b="DTEND:"+f(new Date(st.getTime()+3*3600e3));}
  else{const nx=new Date(y,m-1,d+1);a="DTSTART;VALUE=DATE:"+y+pad(m)+pad(d);b="DTEND;VALUE=DATE:"+nx.getFullYear()+pad(nx.getMonth()+1)+pad(nx.getDate());}
  const u=e.url&&typeof safeUrl==="function"?safeUrl(e.url):"";
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//The Show Shack//Show//EN","BEGIN:VEVENT","UID:"+hid(e)+"@showshack","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,""),a,b,
    "SUMMARY:"+escI(e.title),"LOCATION:"+escI([e.venue,e.city].filter(Boolean).join(", ")),"DESCRIPTION:"+escI((e.time?e.time+"\n":"")+(u?"Tickets: "+u+"\n":"")+"Check the seller's page before you go."),...(u?["URL:"+u]:[]),"END:VEVENT","END:VCALENDAR"].join("\r\n");}
function saveIcs(text,name){const blob=new Blob([text],{type:"text/calendar"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name.replace(/[^\w-]+/g,"-").slice(0,40)+".ics";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-ncal]");if(!b)return;ev.stopPropagation();ev.preventDefault();const e=evById(b.dataset.ncal);
  if(!e||!e.start){toast("No date for that show yet");return;}saveIcs(evIcs(e),e.title||"show");toast("Calendar file ready. Open it to add the show");},true);
// inject "+ My night" into flip-card backs, full cards, and map-sheet rows as they appear
function inject(root){
  root.querySelectorAll(".bfb-foot:not([data-nx])").forEach(f=>{f.dataset.nx=1;const full=f.querySelector("[data-full]");if(full)full.insertAdjacentHTML("afterend",addBtn(full.dataset.full));});
  root.querySelectorAll("article.card[id] .links.wide:not([data-nx])").forEach(l=>{l.dataset.nx=1;const c=l.closest("article.card");if(!/^[ep]-/.test(c.id))return;l.insertAdjacentHTML("beforeend",addBtn(c.id));
    const e=evById(c.id),pv=e&&window.SHACK_PV?window.SHACK_PV(e):"";if(pv)l.insertAdjacentHTML("beforeend",pv+'<p class="bpv-note" hidden></p>');});
  root.querySelectorAll(".bms-a:not([data-nx])").forEach(a=>{a.dataset.nx=1;const c=a.querySelector("[data-card]");if(c)a.insertAdjacentHTML("beforeend",addBtn(c.dataset.card));});}
let iq=0;new MutationObserver(()=>{if(iq)return;iq=1;queueMicrotask(()=>{iq=0;inject(document.body);});}).observe(document.body,{childList:true,subtree:true});

/* ---------- map hooks (called from b.js only when this file is loaded) ---------- */
let mapOn=false,foodOn=false,LG=null,mapRef=null,sheetFn=null;
function chip(){return `<button type="button" class="chip nafchip" data-mafter="1" aria-pressed="${mapOn}">${ic("jazz","sm")} Afters</button><button type="button" class="chip nafchip nfdchip" data-mfood="1" aria-pressed="${foodOn}">${ic("pho","sm")} Food</button>`;}
const icCol=c=>(IC[c]||["#E6DCFF"])[0];
function drawLayer(){if(!LG||!window.L)return;LG.clearLayers();if(!mapOn&&!foodOn)return;const L=window.L;
  // pool spots ride along with afters; skipped while the Pool chip is on so the two layers don't stack
  const poolOn=typeof state!=="undefined"&&state.poolOn;
  allAfters().forEach((p,i)=>{const g=grp(p);if((p.c==="pool"&&poolOn)||!((g==="after"&&mapOn)||(g==="food"&&foodOn)))return;
    // Map time slider (b.js sets window.MAPT, minutes after midnight): dim spots known to be closed by then
    const shut=window.MAPT!=null&&p.til&&p.til*60<=window.MAPT;
    const mk=L.marker([p.lat,p.lon],{title:p.n,icon:L.divIcon({className:"naf-w"+(shut?" dim":""),html:`<span class="naf${g==="food"?" naf-food":""}" style="--ic:${icCol(p.c)}">${ic(p.c)}</span>`,iconSize:[30,30],iconAnchor:[15,15]})});
    mk.on("click",ev=>{L.DomEvent.stopPropagation(ev);openAfter(i);});mk.addTo(LG);});}
function priceLine(p){const c=cost(p);if(!c)return "";return c.free?"Free":`≈ $${c.all[0]}–${c.all[1]} per person ${c.tip[1]?"with tax and tip":"with tax"}`;}
function openAfter(i){const p=allAfters()[i];if(!p||!sheetFn)return;const d=typeof driveEstimate==="function"?driveEstimate(p.lat,p.lon):null;const q=encodeURIComponent([p.n,p.a,p.city,"CA"].filter(Boolean).join(", "));
  const pl=priceLine(p);
  sheetFn(`<div class="bms-h naf-h" style="--pc:${icCol(p.c)};--ic:${icCol(p.c)}">${ic(p.c)}<div><b>${esc(p.n)}</b><span>${esc((AC[p.c]||["",""])[1])} · ${esc(p.city)}${d?` · ~${fmtMins(d.mins)}`:""}</span></div></div>
    <p class="bms-more">${[...(p.t||[]),"🕘 "+hrs(p)].map(esc).join(" · ")}</p>${pl?`<p class="bms-more naf-price">${esc(pl)}</p>`:""}
    <div class="bms-night"><a href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">🧭 Directions</a><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">🕘 Hours</a><button type="button" class="nadd" data-naft="${i}">＋ My night</button></div>`);}
function nearAfters(lat,lon,n,max){const A=allAfters();return A.map((p,i)=>({p,i,mi:miles(lat,lon,p.lat,p.lon)})).filter(x=>x.mi<=max).sort((a,b)=>a.mi-b.mi).slice(0,n);}
function sheet(g){const sh=$("bMapSheet");if(!sh||typeof g.lat!=="number")return;const all=nearAfters(g.lat,g.lon,80,10);
  const four=gr=>{const pick=[],seen=new Set();all.filter(x=>x.p.c!=="pool"&&grp(x.p)===gr).forEach(x=>{if(pick.length<4&&!seen.has(x.p.c)){seen.add(x.p.c);pick.push(x);}});return pick;};
  const row=({p,i,mi})=>`<div class="naf-row" style="--ic:${icCol(p.c)}">${ic(p.c)}<span><b>${esc(p.n)}</b><small>${esc(AC[p.c][1])} · ${mi<1?"under a mile":mi.toFixed(1)+" mi"}${cost(p)&&!cost(p).free?` · ≈ $${cost(p).all[0]}–${cost(p).all[1]}`:""}</small></span><button type="button" class="nadd" data-naft="${i}">＋</button></div>`;
  const food=four("food"),aft=four("after");if(!food.length&&!aft.length)return;
  sh.insertAdjacentHTML("beforeend",(food.length?`<h3 class="bms-sub">Food nearby</h3><div class="naf-list">${food.map(row).join("")}</div>`:"")
    +(aft.length?`<h3 class="bms-sub">Afters nearby</h3><div class="naf-list">${aft.map(row).join("")}</div>`:""));
  inject(sh);}
function map(L,LM,sheetOpen){mapRef=LM;sheetFn=sheetOpen;if(!LG)LG=L.layerGroup().addTo(LM);drawLayer();}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-mafter],[data-mfood]");if(!b)return;const isF=!!b.dataset.mfood;
  if(isF)foodOn=!foodOn;else mapOn=!mapOn;const on=isF?foodOn:mapOn;b.setAttribute("aria-pressed",String(on));drawLayer();
  const A=allAfters().filter(p=>grp(p)===(isF?"food":"after"));if(on&&mapRef&&A.length&&!(typeof origin!=="undefined"&&origin&&origin.lat))mapRef.fitBounds(window.L.latLngBounds(A.map(p=>[p.lat,p.lon])).pad(.05),{maxZoom:11});});

/* ---------- builder (Plan tab) ---------- */
let openI=-1,pickK="";
function mount(){if($("bNight"))return;const h=document.querySelector(".bbudget-h");if(!h)return;
  h.insertAdjacentHTML("afterend",`<section class="bnight" id="bNight" aria-label="Your night"></section>`);
  const el=$("bNight");el.addEventListener("input",onInput);el.addEventListener("change",onInput);el.addEventListener("click",onClick);
  el.addEventListener("pointerdown",dragStart);el.addEventListener("pointermove",dragMove);el.addEventListener("pointerup",dragEnd);el.addEventListener("pointercancel",dragEnd);drawBuilder();}
const MINSTAY={meet:10,eat:40,show:90,after:30,house:30,other:15};
const go2=(a,b)=>typeof a.la==="number"&&typeof b.la==="number"?(road(a.la,a.lo,b.la,b.lo)<.5?10:legMin(road(a.la,a.lo,b.la,b.lo))):15;
const clk=m=>fmtT(String(Math.floor(((m%1440)+1440)%1440/60)).padStart(2,"0")+":"+String(((m%60)+60)%60).padStart(2,"0"));
let CHK={rows:[],list:[],home:""};
function checkNight(){const S=plan.s,rows=S.map(()=>({})),list=[];
  S.forEach((s,i)=>{if(!s.tm)return;const t=tmin(s.tm),nm=esc(s.n||TYPES[s.k][1]);
    if(s.cl!=null&&t>=s.cl*60){rows[i].err=1;list.push({e:1,i,txt:`${nm} closes around ${clk(s.cl*60)}, but you'd get there at ${clk(t)}.`});}
    else if(s.cl!=null&&t+MINSTAY[s.k]>s.cl*60){rows[i].warn=1;list.push({i,txt:`${nm} closes around ${clk(s.cl*60)}. You'd only get ${s.cl*60-t} min there.`});}
    let j=i+1;while(j<S.length&&!S[j].tm)j++;if(j>=S.length)return;const n=S[j],tn=tmin(n.tm),leg=go2(s,n),leave=tn-leg,nn=esc(n.n||TYPES[n.k][1]);
    rows[i].leave=`Leave by ${clk(leave)} for ${n.n?esc(String(n.n).slice(0,28)):TYPES[n.k][1]} (~${leg} min)`;
    if(tn<t){rows[j].err=1;list.push({e:1,i:j,txt:`Out of order: ${nn} (${clk(tn)}) is listed after ${nm} (${clk(t)}).`});return;}
    const stay=leave-t;if(stay<MINSTAY[s.k]){const miss=n.k==="show";rows[i][miss?"err":"warn"]=1;
      list.push({e:miss,i,txt:miss?`You'd miss the start of ${nn}: ${stay<=0?"you can't even get there in time":`only ${stay} min at ${nm}`} with a ~${leg} min trip. Leave ${nm} by ${clk(leave)} or push things earlier.`:`Tight: only ${Math.max(0,stay)} min at ${nm} before you have to leave for ${nn}.`});}});
  let home="";const f=S.find(x=>x.tm&&typeof x.la==="number");if(f&&typeof origin!=="undefined"&&origin&&typeof origin.lat==="number"){const leg=legMin(road(origin.lat,origin.lon,f.la,f.lo));home=`Leave home by ${clk(tmin(f.tm)-leg)} (~${leg} min to ${esc(String(f.n||"your first stop").slice(0,28))})`;}
  CHK={rows,list,home};return CHK;}
function stopRow(s,i){const T=TYPES[s.k],open=i===openI,f=(n,l,v,x)=>`<label class="bn-f"><span>${l}</span><input data-f="${n}" value="${esc(v??"")}" ${x||""}></label>`;
  const head=`<button type="button" class="bn-sh" data-open="${i}" aria-expanded="${open}"><span class="bn-ic">${tic(s.k)}</span><span class="bn-tm">${s.tm?fmtT(s.tm):"—"}</span><span class="bn-nm"><b>${esc(s.n||T[1])}</b>${s.p||s.a?`<small>${esc(s.p||s.a)}</small>`:s.k==="house"?"<small>Address stays in your group chat</small>":""}${(CHK.rows[i]||{}).leave?`<small class="bn-leave${CHK.rows[i].err?" err":CHK.rows[i].warn?" warn":""}">🚶 ${CHK.rows[i].leave}</small>`:""}</span><span class="bn-ch">${open?"▴":"▾"}</span></button>`;
  const del=QUICKDEL.has(s.k)?`<button type="button" class="bn-trash" data-qdel="${i}" aria-label="Remove ${esc(s.n||T[1])} from your night">${tic("trash")}</button>`:"";
  const cls=(QUICKDEL.has(s.k)?" hasdel":"")+(plan.s.length>1?" hasgrip":"")+((CHK.rows[i]||{}).err?" bad":(CHK.rows[i]||{}).warn?" tight":"");
  const grip=plan.s.length>1?`<span class="bn-grip" data-grip="${i}" role="button" tabindex="-1" aria-label="Drag to reorder ${esc(s.n||T[1])}"><i></i><i></i><i></i><i></i><i></i><i></i></span>`:"";
  if(!open)return `<li class="bn-stop${cls}" style="--sc:${T[2]}">${grip}${head}${del}</li>`;
  return `<li class="bn-stop open${cls}" style="--sc:${T[2]}" data-i="${i}">${grip}${head}${del}<div class="bn-ed">
    <div class="bn-two">${f("n","What",s.n,`placeholder="${esc(T[1])}" maxlength="80"`)}${f("tm","Time",s.tm,'type="time"')}</div>
    ${s.k==="house"?`<p class="bn-hint">${tic("house","sm")} No address here on purpose. Links get forwarded, so drop the address in your group chat.</p>${f("p","Whose place",s.p,'placeholder="e.g. Sam\'s place" maxlength="90"')}`
      :`${f("p","Where",s.p,'placeholder="Place name" maxlength="90"')}${f("a","Address (optional)",s.a,'placeholder="Street, city" maxlength="120"')}`}
    <label class="bn-f"><span>Getting there</span><select data-f="w"><option value="">—</option>${Object.keys(GO).map(k=>`<option value="${k}"${s.w===k?" selected":""}>${GOW[k]}</option>`).join("")}</select></label>
    ${s.w==="drive"?f("dr","Who's driving",s.dr,'placeholder="Name" maxlength="30"'):""}
    <div class="bn-two">${f("c","Cost each $",s.c,'type="number" inputmode="decimal" min="0" step="1"')}${f("amt","Pay back $",s.amt,'type="number" inputmode="decimal" min="0" step="1"')}</div>
    <div class="bn-two">${f("vh","Venmo @",s.vh,'placeholder="handle" autocapitalize="off" maxlength="30"')}${f("ch","Cash App $",s.ch,'placeholder="cashtag" autocapitalize="off" maxlength="30"')}</div>
    ${f("u","Tickets or link",s.u,'type="url" placeholder="https://…" autocapitalize="off"')}
    <label class="bn-f"><span>Note</span><textarea data-f="no" maxlength="200" rows="2" placeholder="Parking, dress code, bring cash…">${esc(s.no||"")}</textarea></label>
    ${s.k==="eat"&&near0()?`<a class="bn-find" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("restaurants near "+near0())}" target="_blank" rel="noopener">${tic("search","sm")} Food near ${esc(near0())}</a>`:""}
    <div class="bn-row"><button type="button" data-mv="-1"${i?"":" disabled"}>↑</button><button type="button" data-mv="1"${i<plan.s.length-1?"":" disabled"}>↓</button><button type="button" class="bn-del" data-del="${i}">Remove</button><button type="button" class="bn-done" data-open="${i}">Done</button></div>
  </div></li>`;}
let flipped=false;
function flipTo(on){const el=$("bNight");if(!el)return;
  if(!el.animate||matchMedia("(prefers-reduced-motion: reduce)").matches){flipped=on;drawBuilder();return;}
  if(el._busy)return;el._busy=true;
  el.animate([{transform:"scaleX(1)"},{transform:"scaleX(0.02)"}],{duration:150,easing:"cubic-bezier(.5,0,.75,.4)",fill:"forwards"}).onfinish=()=>{flipped=on;drawBuilder();
    const a=el.animate([{transform:"scaleX(0.02)"},{transform:"scaleX(1)"}],{duration:170,easing:"cubic-bezier(.25,.6,.4,1)",fill:"forwards"});
    a.onfinish=()=>{a.cancel();el.getAnimations().forEach(x=>x.cancel());el._busy=false;const r=el.getBoundingClientRect();if(r.top<0)el.scrollIntoView({block:"start",behavior:"smooth"});};};}
const road=(a,b,c,d)=>SH.roadMi(a,b,c,d),legMin=mi=>SH.driveMin(mi);
// rough SoCal rideshare fare: ~$5 booking + base, ~$1.40/mi, ~$0.35/min, $10 minimum; late night often surges, so a range
const rideFare=mi=>{const v=Math.max(10,5+1.4*mi+.35*legMin(mi));return [Math.round(v),Math.round(v*1.4)];};
// last trains: honest, not exact (agencies change schedules); always point to the agency
const LASTTRAIN={Metro:"Metro rail's last trains leave around midnight (a little later on some lines)",Trolley:"Trolley service mostly wraps up around midnight",
  Metrolink:"Metrolink is a commuter line and is usually done by evening",NCTD:"Coaster and Sprinter trains are usually done by evening",Amtrak:"Amtrak has only a few trains a day"};
const tmin=t=>SH.minOfHHMM(t);
function showPrice(s){if(s.c!=null&&s.c!=="")return {v:+s.c,txt:+s.c?`$${s.c}`:"Free"};
  const e=allEv().find(x=>x.title===s.n);if(e)try{const pi=priceInfo(e);
    if(pi.free)return {v:0,txt:"Free"};if(pi.sold)return {v:0,txt:"Sold out",warn:1};if(!pi.none&&pi.lo)return {v:Math.round(pi.lo),txt:(pi.est?"≈":"from ")+"$"+Math.round(pi.lo),est:1};}catch(_){}
  return {v:0,txt:"Price not listed",warn:1};}
// one source of truth for what a night costs each: the summary line, Saved cards, Night Cards and The damage all use it
let DMG={tot:0,approx:false};
function dmg(p){backHtml(p,"calc");return DMG;}
function backHtml(p=plan,mode=""){const S=p.s,st=typeof state!=="undefined"?state:{},view=mode==="view";
  const ppl=Math.max(1,+(st.carLink||st.car||1)),mpg=st.mpg||25,gal=st.gas||5.85;
  const hasO=typeof origin!=="undefined"&&origin&&typeof origin.lat==="number";
  // money per person
  const rows=[];let tot=0,approx=false,guessed=false;const bucket={show:0,eat:0,after:0,other:0};
  S.forEach(s=>{const T=TYPES[s.k];let pr;
    if(s.k==="show")pr=showPrice(s);else if(s.c!=null&&s.c!=="")pr={v:+s.c,txt:+s.c?`$${s.c}`:"Free"};else pr=guessCost(s,st);
    if(!pr)return;
    tot+=pr.v;if(pr.est||pr.warn||pr.g)approx=true;if(pr.g)guessed=true;
    bucket[bucket[s.k]!=null?s.k:"other"]+=pr.v;
    rows.push(`<li><span>${tic(s.k,"sm")} ${esc(s.n||T[1])}</span><b class="${pr.warn?"w":pr.g?"g":""}">${esc(pr.txt)}</b></li>`);});
  // driving: start → stops with a location → back to start
  const pts=S.filter(s=>typeof s.la==="number");const route=[];if(hasO)route.push({n:"Start",la:origin.lat,lo:origin.lon});pts.forEach(s=>route.push({n:s.n||TYPES[s.k][1],la:s.la,lo:s.lo,s}));if(hasO&&pts.length)route.push({n:"Home",la:origin.lat,lo:origin.lon});
  let mi=0;const legs=[];for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],m=road(a.la,a.lo,b.la,b.lo);mi+=m;
    let tight="";if(a.s&&b.s&&a.s.tm&&b.s.tm){const gap=tmin(b.s.tm)-tmin(a.s.tm),need=legMin(m);if(gap>0&&gap<need+30)tight=` <em>⚠️ only ${gap} min between</em>`;}
    legs.push(`<li><span>${esc(a.n)} → ${esc(b.n)}</span><b>${m<0.5?"walk":"~"+legMin(m)+" min"}</b>${tight}</li>`);}
  const gas=mi/mpg*gal,gasEach=gas/ppl;
  if(mi>=1){rows.push(`<li><span>${tic("gas","sm")} Gas ·${Math.round(mi)} mi ${hasO?"round trip":"between stops"}${ppl>1?` ÷ ${ppl}`:""}</span><b>$${gasEach.toFixed(2)}</b></li>`);tot+=gasEach;}
  // pay-backs
  const pays=S.filter(s=>s.vh||s.ch||s.amt).map(s=>`<li><span>${esc(s.dr||(s.vh?"@"+s.vh:s.ch?"$"+s.ch:"the host"))}${s.n?` · ${esc(s.n)}`:""}</span><b>${s.amt?"$"+s.amt:"—"}${s.vh?" Venmo":s.ch?" Cash App":""}</b></li>`);
  // timing
  const tms=S.map(s=>s.tm).filter(Boolean);let span="";if(tms.length>1){const a=tmin(tms[0]),z=tmin(tms[tms.length-1]);span=`${fmtT(tms[0])} → ${fmtT(tms[tms.length-1])}${z>a?` · ${Math.floor((z-a)/60)}h${(z-a)%60?" "+(z-a)%60+"m":""} of plans`:""}`;}
  const late=tms.some(t=>tmin(t)>=22*60);const drives=S.some(s=>s.w==="drive"),drinks=S.some(s=>/bar|karaoke|rooftop|barcade|jazz|lounge/i.test((s.n||"")+(s.no||"")))||S.some(s=>["after"].includes(s.k));
  const notes=[];
  // getting home: drive (gas for the last leg ÷ carpool + parking at the show) vs rideshare (fare ÷ people riding)
  let homeCmp="";const lastS=[...pts].pop();
  if(hasO&&lastS){const hm=road(lastS.la,lastS.lo,origin.lat,origin.lon),gasH=hm/mpg*gal/ppl,shw=S.find(s=>s.k==="show"),pk=shw?parkFor(shw):0,rf=rideFare(hm);
    const driveEach=gasH+pk/ppl,rideEach=[rf[0]/ppl,rf[1]/ppl],cheaper=driveEach<=rideEach[0]?"drive":"ride";
    homeCmp=`<h3 class="bn-sub">Getting home: drive or rideshare?</h3><ul class="bn-list bn-home">
      <li class="${cheaper==="drive"?"best":""}"><span>${tic("gas","sm")} Drive · gas ${Math.round(hm)} mi${ppl>1?` ÷ ${ppl}`:""}${pk?` + ~$${pk} parking`:""}</span><b>$${driveEach.toFixed(2)}</b></li>
      <li class="${cheaper==="ride"?"best":""}"><span>🚕 Rideshare from ${esc(lastS.n||"the last stop")}${ppl>1?` ÷ ${ppl}`:""}</span><b>$${Math.round(rideEach[0])}–${Math.round(rideEach[1])}</b></li></ul>
      <p class="bn-hint">${drinks?"There are drinks in this plan: if nobody's staying sober, rideshare is the answer whatever it costs. ":""}Rideshare is a rough range (late-night surge can push it higher). Driving counts gas for the ride home and typical parking at the show.</p>`;}
  if(late&&st.home==="transit")notes.push("Taking transit home late: "+Object.values(LASTTRAIN).slice(0,3).join(". ")+". Check your line's last train on the agency's site before you go.");
  if(!hasO)notes.push("Set a start point below to add driving there and home.");
  if(guessed)notes.push("Prices marked \"guess\" are rough typical spends, not real prices. Tap a stop and fill in \"Cost each\" for the real number.");
  if(late&&(drives||drinks))notes.push("Late night: lock in a sober driver or a rideshare home before you go.");
  if(S.some(s=>s.k==="show"&&showPrice(s).warn))notes.push("A show price isn't listed. Check the ticket page.");
  if(S.some(s=>s.k==="after"&&!(s.no||"").startsWith("Hours")))notes.push("Afters hours aren't always listed. Check before you head over.");
  const B=st.budget||0,pct=B?Math.round(tot/B*100):0;
  DMG={tot,approx};if(mode==="calc")return "";
  if(view){const i=notes.indexOf("Set a start point below to add driving there and home.");if(i>=0)notes[i]="Set your start point in the Show Shack's Plan tab to add your drive there and home.";
    const j=notes.findIndex(x=>x.startsWith("Prices marked"));if(j>=0)notes[j]="Prices marked \"guess\" are rough typical spends, not real prices.";}
  return `<div class="bn-h"><button type="button" class="bn-flipb" ${view?'data-vflip="1"':'data-flip="1"'}>↻ The ${view?"night":"plan"}</button><h2>The damage</h2><p>${esc(p.t||"Your night")}${p.d?" · "+esc(fmtD(p.d)):""}${span?"<br>"+esc(span):""}</p></div>
    <div class="bn-big"><span>Each</span><b>${approx?"≈ ":""}$${Math.round(tot)}</b>${ppl>1?`<small>gas split ${ppl} ways</small>`:""}${B?`<small>${pct}% of your $${B} monthly fun budget</small>`:""}</div>
    ${rows.length?`<h3 class="bn-sub">Per person</h3><ul class="bn-list">${rows.join("")}</ul>`:'<p class="bn-hint">No costs yet. Add "Cost each" to a stop.</p>'}
    ${legs.length?`<h3 class="bn-sub">Getting around</h3><ul class="bn-list">${legs.join("")}</ul><p class="bn-hint">Straight-line estimates at ${mpg} mpg and $${(+gal).toFixed(2)}/gal, not live traffic.</p>`:""}
    ${homeCmp}
    ${pays.length?`<h3 class="bn-sub">Pay back</h3><ul class="bn-list">${pays.join("")}</ul>`:""}
    ${notes.length?`<h3 class="bn-sub">Heads up</h3><ul class="bn-notes">${notes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    ${tot?`<h3 class="bn-sub">Total per person</h3><ul class="bn-list bn-tot">${[[tic("show","sm")+" Tickets",bucket.show],[tic("eat","sm")+" Food",bucket.eat],[tic("after","sm")+" Afters",bucket.after],[tic("other","sm")+" Other",bucket.other],[tic("gas","sm")+" Gas",mi>=1?gasEach:0]].filter(x=>x[1]>0).map(([l,v])=>`<li><span>${l}</span><b>$${v%1?v.toFixed(2):v}</b></li>`).join("")}<li class="sum"><span>Total</span><b>${approx?"≈ ":""}$${tot.toFixed(2)}</b></li></ul>`:""}
    ${view?`<p class="bn-hint">Gas and getting home are worked out from your own start point and carpool settings on this phone, not the planner's.</p><div class="bn-go"><button type="button" data-vflip="1">↻ Back to the night</button></div>`:`<div class="bn-go"><button type="button" class="bn-send" data-send="1">Send the link</button><button type="button" data-split="1">💸 Split it evenly</button><button type="button" data-flip="1">↻ Back to the plan</button></div>`}
    ${view?"":`<p class="bn-fine">Split it evenly fills in "Pay back" on every stop with its cost each, so friends know what to send. Edit any stop to change it.</p>`}`;}
// no cost entered: a rough typical spend, clearly marked as a guess
// a listed spot's guess = middle of its price range with tax and tip (see PRICE)
const spotGuess=s=>{const a=allAfters().find(x=>x.n===s.n&&(!s.p||s.p.startsWith(x.a||"")));const c=a&&cost(a);return c?Math.round((c.all[0]+c.all[1])/2):null;};
function guessCost(s,st){if(s.k==="eat"){const g=spotGuess(s);if(g!=null)return {v:g,txt:`≈$${g} guess`,g:1};const bbq=/bbq|korean/i.test((s.n||"")+(s.no||""));const v=bbq?40:(st.food||30);return {v,txt:`≈$${v} guess`,g:1};}
  if(s.k==="after"){const g=spotGuess(s),v=g!=null?g:20;return v?{v,txt:`≈$${v} guess`,g:1}:{v:0,txt:"Free"};}
  return null;}
// typical parking at a show stop: from the venue's size (app.js PARK / tier), 0 when unknown
function parkFor(s){try{const e=allEv().find(x=>x.title===s.n&&s.p&&s.p.startsWith(x.venue||"\u0000"));return e&&typeof PARK!=="undefined"&&typeof tier==="function"?(PARK[tier(e)]??0):0;}catch(_){return 0;}}
const near0=()=>{const s=plan.s.find(x=>x.k==="show"&&x.p);return s?s.p:"";};
function anchor(){const s=[...plan.s].reverse().find(x=>typeof x.la==="number");if(s)return [s.la,s.lo];if(typeof origin!=="undefined"&&origin&&typeof origin.lat==="number")return [origin.lat,origin.lon];return null;}
function picker(){if(pickK==="show"){
    const now=todayISO(),sv=allEv().filter(e=>typeof state!=="undefined"&&state.stars.has(skey(e))&&(e.end||e.start)>=now).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,8);
    return `<div class="bn-pick"><p class="bn-pt">Pick a saved show, or tap <b>＋ My night</b> on any card.</p>${sv.map(e=>`<button type="button" class="bn-pi" data-nadd="${esc(hid(e))}"><b>${esc(e.title)}</b><small>${esc(fmtD(e.start))} · ${esc(e.venue||"")}</small></button>`).join("")||'<p class="bn-pt">No saved shows yet.</p>'}
      <div class="bn-row"><button type="button" data-blank="show">Type one in</button><button type="button" data-find="1">Browse shows</button><button type="button" data-pick="">Close</button></div></div>`;}
  // Eat / Afters: recommended around the show in the plan (closest to its venue first); afters that close
  // before the show ends drop to the bottom. Picks are slotted before / after the show automatically.
  if(pickK==="after"||pickK==="eat"){const eat=pickK==="eat",sh=plan.s.find(x=>x.k==="show"&&typeof x.la==="number");
    const an=sh?[sh.la,sh.lo]:anchor(),endM=sh&&sh.tm?tmin(sh.tm)+150:null;
    const A=allAfters().map((p,i)=>({p,i,mi:an?miles(an[0],an[1],p.lat,p.lon):null})).filter(x=>eat?grp(x.p)==="food":grp(x.p)!=="food");
    const cats=Object.keys(AC).filter(c=>A.some(x=>x.p.c===c)),f=pickK2&&cats.includes(pickK2)?pickK2:"";
    const late=x=>!eat&&endM&&x.p.til&&x.p.til*60<endM?1:0;
    const rows=A.filter(x=>!f||x.p.c===f).sort((a,b)=>late(a)-late(b)||(an?a.mi-b.mi:a.p.city.localeCompare(b.p.city))).slice(0,8);
    const where=sh?esc((sh.p||sh.n||"the show").split(",")[0]):"";
    return `<div class="bn-pick"><p class="bn-pt">${sh?`Near ${where}, closest first. ${eat?"It goes in before the show.":"It goes in after the show."}`:an?"Closest to your last stop first. Add a show and these follow it.":"Add a show (or a start point) and these sort by distance."}</p>
      <div class="bn-cats"><button type="button" class="chip" data-cat="" aria-pressed="${!f}">Closest</button>${cats.map(c=>`<button type="button" class="chip spchip" data-cat="${c}" aria-pressed="${c===f}">${ic(c,"sm")}${AC[c][1]}</button>`).join("")}</div>
      ${rows.map(({p,i,mi})=>{const c=cost(p);return `<button type="button" class="bn-pi bn-pi-ic" data-naft="${i}" style="--ic:${(IC[p.c]||["#e6dcff"])[0]}">${ic(p.c)}<span><b>${esc(p.n)}</b><small>${esc(p.city)}${mi!=null?` · ${mi<1?"under a mile":mi.toFixed(1)+" mi"}`:""}${p.h?" · "+esc(p.h):""}${c&&!c.free?` · ≈ $${c.all[0]}–${c.all[1]}`:""}${late({p})?" · may close before the show ends":""}</small></span></button>`;}).join("")}
      <div class="bn-row">${eat?`<button type="button" data-blank="eat">${tic("eat","sm")} Type one in</button>`:`<button type="button" data-blank="house">${tic("house","sm")} Someone's place</button><button type="button" data-blank="other">${tic("other","sm")} Other</button>`}<button type="button" data-pick="">Close</button></div></div>`;}
  return "";}
let pickK2="";
function drawBuilder(){const el=$("bNight");if(!el)return;const n=plan.s.length,D=n?dmg(plan):{tot:0,approx:false},tot=D.tot;
  if(flipped&&!n)flipped=false;
  el.classList.toggle("flipped",flipped);
  if(flipped){el.innerHTML=backHtml();return;}
  el.innerHTML=`<div class="bn-h">${n?`<button type="button" class="bn-flipb" data-flip="1">${tic("money","sm")} Costs ↻</button>`:""}<h2>Your night</h2><p>Pre-game to afters, then send one link. No sign-in. The whole plan lives in the link.</p></div>
    ${NIGHTS.length>1||(NIGHTS.length===1&&NIGHTS[0].id!==planId)?`<div class="bn-nights" role="group" aria-label="Your saved nights">${NIGHTS.map(x=>`<button type="button" class="chip" data-nuse="${esc(x.id)}" aria-pressed="${x.id===planId}">${esc(nName(x.p))}</button>`).join("")}<button type="button" class="chip bn-nnew" data-nnew="1">＋ New</button></div>`:""}
    <div class="bn-meta"><input data-m="t" value="${esc(plan.t)}" placeholder="Name the night" maxlength="70" aria-label="Name the night"><label class="bn-dw${plan.d?"":" empty"}"><input data-m="d" type="date" value="${esc(plan.d)}" aria-label="Date"></label></div>
    <p class="bn-wx" id="bnWx" hidden></p>
    ${(()=>{checkNight();const L=CHK.list;return (L.length?`<div class="bn-chk${L.some(x=>x.e)?" err":""}" role="alert"><b>${L.some(x=>x.e)?"⚠️ This night won't work as timed":"Heads up on timing"}</b><ul>${L.map(x=>`<li class="${x.e?"e":""}">${x.txt}</li>`).join("")}</ul>${n>1?`<small>Tap ⏱ Tighten the night to re-time it, or change a stop's time.</small>`:""}</div>`:"")
      +(CHK.home?`<p class="bn-leavehome">🏠 ${CHK.home}</p>`:"");})()}
    ${n?`<ol class="bn-stops">${plan.s.map(stopRow).join("")}</ol>`:`<p class="bn-empty">Nothing yet. Add stops below, or tap <b>＋ My night</b> on any show.</p>`}
    ${n>1&&plan.s.some(x=>x.tm)?`<button type="button" class="bn-tight" data-tight="1">⏱ Tighten the night <small>re-time every stop from the drive times</small></button>`:""}
    <div class="bn-add">${["meet","eat","show","after"].map(k=>`<button type="button" class="chip bn-addc" data-addk="${k}" aria-pressed="${pickK===k}">${tic(k,"sm")} ${TYPES[k][1]}</button>`).join("")}</div>
    ${picker()}
    <details class="bn-host"${plan.h||plan.ph?" open":""}><summary>Who's hosting (for "I'm in" texts)</summary>
      <div class="bn-two"><label class="bn-f"><span>Your name</span><input data-m="h" value="${esc(plan.h)}" maxlength="30"></label><label class="bn-f"><span>Phone (optional)</span><input data-m="ph" type="tel" value="${esc(plan.ph)}" maxlength="20"></label></div>
      <p class="bn-hint">Your number only goes inside the link you send, so friends' "I'm in" texts reach you. Leave it blank and they'll pick who to text.</p></details>
    ${n?`<div class="bn-sum">${n} stop${n>1?"s":""}${tot?` · ${D.approx?"≈ ":""}$${Math.round(tot)} each`:""}<button type="button" class="bn-sumlink" data-flip="1">See the damage ↻</button></div>`:""}
    <div class="bn-go"><button type="button" class="bn-send" data-send="1"${n?"":" disabled"}>Send the link</button><button type="button" data-prev="1"${n?"":" disabled"}>Preview</button>${n?'<button type="button" class="bn-clr" data-nnew="1">＋ New night</button>':""}</div>
    ${NIGHTS.length?`<p class="bn-fine">Every night you build is kept in <button type="button" class="bn-lnk" data-gosaved="1">Saved → Your nights</button>.</p>`:""}
    <p class="bn-fine">Changed something after you sent it? Send the new link. Every card shows when it was last updated, so the newest one is easy to spot.</p>`;
  nightWx();}
/* weather for the night: forecast at the show (or the first stop with a place, or your start) when the date is within ~11 days */
function nightWx(){const el=$("bnWx");if(!el||!plan.d||typeof wxGet!=="function")return;
  const days=Math.round((new Date(plan.d+"T12:00")-new Date(todayISO()+"T12:00"))/864e5);if(days<0||days>11)return;
  const s=plan.s.find(x=>x.k==="show"&&typeof x.la==="number")||plan.s.find(x=>typeof x.la==="number");
  const la=s?s.la:(typeof origin!=="undefined"&&origin&&origin.lat),lo=s?s.lo:(origin&&origin.lon);if(typeof la!=="number")return;
  const d0=plan.d;wxGet(la.toFixed(2)+","+lo.toFixed(2)).then(d=>{if(!d||!el.isConnected||plan.d!==d0)return;const i=d.time.indexOf(d0);if(i<0)return;
    const hi=Math.round(d.temperature_2m_max[i]),low=Math.round(d.temperature_2m_min[i]),rain=d.precipitation_probability_max[i];
    el.innerHTML=`${wxIcon(d.weather_code[i])} <b>${hi}°/${low}°</b>${rain>=20?` · ${rain}% rain`:""}${low<60?" · bring a layer":""}<small>${esc(s?(s.p||s.n||"").split(",")[0]:"near you")}</small>`;el.hidden=false;});}
/* drag a stop by its grip to reorder (the ↑↓ buttons inside a stop still work too) */
let drag=null;
function dragStart(ev){const g=ev.target.closest("[data-grip]");if(!g)return;ev.preventDefault();const li=g.closest(".bn-stop"),ol=li.parentNode,items=[...ol.children];
  const from=items.indexOf(li),rects=items.map(x=>x.getBoundingClientRect()),h=rects[from].height+8;
  drag={li,items,from,to:from,rects,h,y0:ev.clientY,id:ev.pointerId};li.classList.add("dragging");try{g.setPointerCapture(ev.pointerId);}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(8);}catch(e){}}
function dragMove(ev){if(!drag||ev.pointerId!==drag.id)return;const dy=ev.clientY-drag.y0,{items,from,rects,h}=drag;drag.li.style.transform=`translateY(${dy}px)`;
  const mid=rects[from].top+rects[from].height/2+dy;let to=from;rects.forEach((r,j)=>{const m=r.top+r.height/2;if(j<from&&mid<m)to=Math.min(to,j);if(j>from&&mid>m)to=Math.max(to,j);});
  drag.to=to;items.forEach((x,j)=>{if(j===from)return;x.style.transform=j>=to&&j<from?`translateY(${h}px)`:j<=to&&j>from?`translateY(${-h}px)`:"";});}
function dragEnd(ev){if(!drag||ev.pointerId!==drag.id)return;const {from,to,items}=drag;drag=null;items.forEach(x=>{x.style.transform="";x.classList.remove("dragging");});
  if(to!==from){const [m]=plan.s.splice(from,1);plan.s.splice(to,0,m);meetFirst();const was=m.tm,now=retime(plan.s.indexOf(m));openI=-1;plan.up=Date.now();save();drawBuilder();
    toast("Moved "+esc(m.n||TYPES[m.k][1])+(now&&now!==was?" · now "+fmtT(now):""),was&&now!==was?"Undo time":"",()=>{m.tm=was;sortStops();save();drawBuilder();});}}
/* tighten: keep the show's time (or the first timed stop) fixed and lay every other stop around it, using how long each
   kind of stop usually takes plus the drive between them (5-minute steps) */
const STAY={meet:20,eat:75,show:150,after:120,house:90,other:45};
function tighten(){const S=plan.s;if(S.length<2)return 0;let ai=S.findIndex(x=>x.k==="show"&&x.tm);if(ai<0)ai=S.findIndex(x=>x.tm);if(ai<0)return 0;
  const go=(a,b)=>typeof a.la==="number"&&typeof b.la==="number"?(road(a.la,a.lo,b.la,b.lo)<.5?10:legMin(road(a.la,a.lo,b.la,b.lo))):15;
  const t=[];t[ai]=tmin(S[ai].tm);for(let i=ai-1;i>=0;i--)t[i]=t[i+1]-go(S[i],S[i+1])-STAY[S[i].k];for(let i=ai+1;i<S.length;i++)t[i]=t[i-1]+STAY[S[i-1].k]+go(S[i-1],S[i]);
  let ch=0;S.forEach((x,i)=>{const m=Math.round(t[i]/5)*5,v=String(Math.floor(((m%1440)+1440)%1440/60)).padStart(2,"0")+":"+String(((m%60)+60)%60).padStart(2,"0");if(x.tm!==v){x.tm=v;ch++;}});
  if(ch)plan.up=Date.now();return ch;}
/* dragging re-times the stop you moved so the night still runs in order: halfway between its new neighbours
   (rounded to 15 min), or an hour after the stop above / before the stop below when only one side has a time */
function retime(i){const s=plan.s[i];if(!s)return "";const tm=x=>x&&x.tm?tmin(x.tm):null;
  let a=null,b=null;for(let j=i-1;j>=0;j--)if(tm(plan.s[j])!=null){a=tm(plan.s[j]);break;}
  for(let j=i+1;j<plan.s.length;j++)if(tm(plan.s[j])!=null){b=tm(plan.s[j]);break;}
  let m=a!=null&&b!=null?(b>a?(a+b)/2:a+15):a!=null?a+60:b!=null?b-60:null;if(m==null)return s.tm||"";
  if(s.tm&&tm(s)!=null&&(a==null||tm(s)>a)&&(b==null||tm(s)<b))return s.tm;   // its time already fits where it landed: leave it
  m=Math.round(m/15)*15;const h=Math.floor(((m%1440)+1440)%1440/60),mm=((m%60)+60)%60;s.tm=String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0");return s.tm;}
function sortStops(){let last=-1;const k=plan.s.map((x,i)=>{if(x.tm)last=SH.minOfHHMM(x.tm);return {x,i,t:last};});
  const open=plan.s[openI];k.sort((a,b)=>(b.x.k==="meet")-(a.x.k==="meet")||a.t-b.t||a.i-b.i);plan.s=k.map(o=>o.x);if(open)openI=plan.s.indexOf(open);}
// meet-up always leads the night, whatever gets dragged or moved
function meetFirst(){const m=plan.s.filter(x=>x.k==="meet");if(!m.length)return;const open=plan.s[openI];plan.s=[...m,...plan.s.filter(x=>x.k!=="meet")];if(open)openI=plan.s.indexOf(open);}
function onInput(ev){const t=ev.target;
  if(t.dataset.m){plan[t.dataset.m]=t.value;plan.up=Date.now();save();if(t.dataset.m==="d")t.parentNode.classList.toggle("empty",!t.value);return;}
  const li=t.closest("[data-i]");if(!li||!t.dataset.f)return;const s=plan.s[+li.dataset.i];s[t.dataset.f]=t.value;
  if(t.dataset.f==="a"||t.dataset.f==="p"){delete s.la;delete s.lo;}
  plan.s[+li.dataset.i]=cleanStop(s);plan.up=Date.now();save();
  if(ev.type==="change"&&(t.dataset.f==="w"||t.dataset.f==="tm")){if(t.dataset.f==="tm")sortStops();save();drawBuilder();}}
async function onClick(ev){const b=ev.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.flip){flipTo(!flipped);return;}
  if(d.tight){const before=plan.s.map(x=>x.tm),ch=tighten();
    if(!ch){toast("Already tight. Nothing to change");return;}save();drawBuilder();
    toast(`Re-timed ${ch} stop${ch>1?"s":""}`,"Undo",()=>{plan.s.forEach((x,i)=>{if(before[i])x.tm=before[i];else delete x.tm;});save();drawBuilder();});return;}
  if(d.split){const st=typeof state!=="undefined"?state:{},h=plan.s.find(x=>x.vh||x.ch);let n=0;
    plan.s.forEach(x=>{let v=x.k==="show"?showPrice(x).v:x.c!=null&&x.c!==""?+x.c:(guessCost(x,st)||{}).v;v=Math.round(v||0);if(!v)return;
      x.amt=v;if(!x.vh&&!x.ch&&h){if(h.vh)x.vh=h.vh;else x.ch=h.ch;}n++;});
    if(!n){toast("No costs to split yet. Add \"Cost each\" to a stop");return;}
    plan.s=plan.s.map(cleanStop);plan.up=Date.now();save();drawBuilder();
    toast(h?`Pay back filled on ${n} stop${n>1?"s":""}, all to ${esc(h.vh?"@"+h.vh:"$"+h.ch)}`:`Pay back filled on ${n} stop${n>1?"s":""}. Add a Venmo or Cash App handle so friends can pay`);return;}
  if(d.addk){const k=d.addk;if(k==="show"||k==="after"||k==="eat"){pickK=pickK===k?"":k;pickK2="";drawBuilder();return;}
    if(addStop({k},true)){openI=plan.s.indexOf(lastAdded);pickK="";drawBuilder();focusFirst();}return;}
  if("cat" in d){pickK2=d.cat;drawBuilder();return;}   // "" = Closest (all categories)
  if("pick" in d){pickK="";drawBuilder();return;}
  if(d.blank){if(addStop({k:d.blank},true)){openI=plan.s.indexOf(lastAdded);pickK="";drawBuilder();focusFirst();}return;}
  if(d.find){const t=document.querySelector('#bTabs [data-tab="shows"]');if(t)t.click();return;}
  if(d.open!=null){openI=openI===+d.open?-1:+d.open;drawBuilder();return;}
  if(d.mv){const i=+b.closest("[data-i]").dataset.i,j=i+ +d.mv;if(j<0||j>=plan.s.length)return;[plan.s[i],plan.s[j]]=[plan.s[j],plan.s[i]];openI=j;meetFirst();plan.up=Date.now();save();drawBuilder();return;}
  if(d.del!=null){const [r]=plan.s.splice(+d.del,1);unnameShow(r);openI=-1;plan.up=Date.now();save();drawBuilder();return;}
  // neon trash: remove right from the row, with Undo in the toast
  if(d.qdel!=null){const i=+d.qdel,gone=plan.s[i];if(!gone)return;const li=b.closest(".bn-stop"),t0=plan.t,d0=plan.d,done=()=>{plan.s.splice(plan.s.indexOf(gone),1);unnameShow(gone);openI=-1;plan.up=Date.now();save();drawBuilder();
      toast(`Removed ${esc(gone.n||TYPES[gone.k][1])}`,"Undo",()=>{if(plan.s.length>=MAXS)return;plan.s.splice(Math.min(i,plan.s.length),0,gone);plan.t=t0;plan.d=d0;sortStops();plan.up=Date.now();save();drawBuilder();});};
    if(li&&li.animate&&!matchMedia("(prefers-reduced-motion: reduce)").matches)li.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateX(40px) scale(.96)"}],{duration:200,easing:"ease-in"}).onfinish=done;else done();return;}
  if(d.nnew){const had=keep(plan);useNight(newId(),{});if(had)toast("Your last night is kept in Saved","Open",goSaved);return;}
  if(d.nuse){const x=NIGHTS.find(n=>n.id===d.nuse);if(x&&x.id!==planId)useNight(x.id,x.p);return;}
  if(d.gosaved){goSaved();return;}
  if(d.prev){view(cleanPlan({...plan,up:plan.up||Date.now()}),true);return;}
  if(d.send){if(!plan.up)plan.up=Date.now();save();shareNight(plan,b,planId);return;}}
function focusFirst(){setTimeout(()=>{const i=document.querySelector("#bNight .bn-stop.open input");if(i)i.focus({preventScroll:false});},30);}
const sumText=p=>[`🌙 ${p.t||"Our night"}${p.d?" · "+fmtD(p.d):""}`,...p.s.map(s=>`${s.tm?fmtT(s.tm)+" ":""}${TYPES[s.k][0]} ${s.n||TYPES[s.k][1]}${s.p?" @ "+s.p:""}`)].join("\n");
// signed in (social.js): a live link that keeps showing your latest changes; otherwise a snapshot link with the plan inside it
async function shareNight(p,btn,id){let url=null;if(id&&window.SHACK_LIVE)try{url=await SHACK_LIVE.link(id,cleanPlan(p));}catch(e){url=null;}
  if(!url){url=await linkFor(p);if(id&&window.SHACK_LIVE&&!SHACK_LIVE.on())toast("Tip: sign in on Venues → Show passport and your links update by themselves");}
  const text=sumText(cleanPlan(p));
  if(navigator.share){try{await navigator.share({title:p.t||"Our night",text:text+"\n",url});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  if(typeof copyOut==="function")copyOut(text+"\n"+url,btn);else{try{await navigator.clipboard.writeText(text+"\n"+url);toast("Link copied");}catch(e){prompt("Copy this link",url);}}}

/* ---------- viewer: opens from a #n= link ---------- */
function ics(p){const pad=n=>String(n).padStart(2,"0"),stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const tms=p.s.map(s=>s.tm).filter(Boolean).sort(),[y,m,d]=p.d.split("-").map(Number);
  const st=tms[0]||"19:00",[h1,m1]=st.split(":").map(Number);let lastH,lastM;if(tms.length>1){[lastH,lastM]=tms[tms.length-1].split(":").map(Number);}
  const startD=new Date(y,m-1,d,h1,m1),endD=lastH!=null?new Date(y,m-1,d+(lastH<h1?1:0),lastH+2,lastM):new Date(startD.getTime()+4*3600e3);
  const f=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";
  const escI=s=>String(s).replace(/\\/g,"\\\\").replace(/[,;]/g,c=>"\\"+c).replace(/\n/g,"\\n");
  const desc=sumText(p)+"\n\n"+location.href;
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//The Show Shack//Night Card//EN","BEGIN:VEVENT","UID:night-"+Date.now()+"@showshack",`DTSTAMP:${stamp}`,`DTSTART:${f(startD)}`,`DTEND:${f(endD)}`,`SUMMARY:${escI("🌙 "+(p.t||"Our night"))}`,`DESCRIPTION:${escI(desc)}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");}
let VOPENER=null;
function view(p,preview){if(!$("nightView"))VOPENER=document.activeElement;close();const auto=preview==="auto";const D=p.s.length?dmg(p):{tot:0,approx:false},tot=D.tot,ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
  const body=encodeURIComponent(`I'm in for ${p.t||"the night"}${p.d?" ("+fmtD(p.d)+")":""}! 🙌`);
  const sms=`sms:${p.ph||""}${ios?"&":"?"}body=${body}`;
  const rows=p.s.map(s=>{const T=TYPES[s.k],u=s.u?safeUrl(s.u):"";
    const acts=[s.k!=="house"&&(s.p||s.a)?`<a href="${esc(dirUrl(s))}" target="_blank" rel="noopener">🧭 Directions</a>`:"",
      u?`<a href="${esc(u)}" target="_blank" rel="noopener">${s.k==="show"?"🎟️ Tickets":/google\.com\/maps\/search/.test(u)?"🔎 Find a spot":"🔗 Link"} ↗</a>`:"",
      s.vh?`<a class="nv-pay" href="${esc(venmo(s))}" target="_blank" rel="noopener">Venmo <b>@${esc(s.vh)}</b>${s.amt?` · $${s.amt}`:""}</a>`:"",
      s.ch?`<a class="nv-pay" href="${esc(cash(s))}" target="_blank" rel="noopener">Cash App <b>$${esc(s.ch)}</b>${s.amt?` · $${s.amt}`:""}</a>`:""].filter(Boolean).join("");
    return `<li style="--sc:${T[2]}"><span class="nv-dot">${T[0]}</span><div class="nv-b"><span class="nv-tm">${s.tm?fmtT(s.tm):T[1]}</span><b>${esc(s.n||T[1])}</b>
      ${s.p?`<span class="nv-p">${esc(s.p)}</span>`:""}${s.a?`<span class="nv-p">${esc(s.a)}</span>`:""}${s.k==="house"?'<span class="nv-p">Address in the group chat</span>':""}
      ${s.w?`<span class="nv-go">${goLine(s)}</span>`:""}${s.c?`<span class="nv-c">≈ $${s.c} each</span>`:""}${s.no?`<p class="nv-no">${esc(s.no)}</p>`:""}
      ${acts?`<div class="nv-acts">${acts}</div>`:""}</div></li>`;}).join("");
  const pays=p.s.some(s=>s.vh||s.ch);
  const el=document.createElement("div");el.id="nightView";el.className="nview";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Night Card");
  el.innerHTML=`<div class="nv-card"><div class="nv-top"><span class="nv-kick">${auto?"🌍 Spun by the globe":"🌙 Night Card"+(preview?" · preview":"")}</span><span class="nv-topr">${tot?`<button type="button" class="nv-flipb" data-vflip="1">💸 The damage ↻</button>`:""}<button type="button" class="nv-x" aria-label="Close">✕</button></span></div>
    <h1 class="nv-title">${esc(p.t||"Our night")}</h1><p class="nv-date">${esc(fmtD(p.d)||"Date TBD")}${p.h?` · planned by ${esc(p.h)}`:""}</p>
    ${p.up?`<p class="nv-up">Updated ${esc(fmtUp(p.up))}</p>`:""}
    <ol class="nv-line">${rows||'<li><div class="nv-b"><b>No stops yet</b></div></li>'}</ol>
    ${tot?`<button type="button" class="nv-sum" data-vflip="1">${D.approx?"≈ ":""}$${Math.round(tot)} each for the whole night <span>See the damage ↻</span></button>`:""}
    <div class="nv-main">${auto?'<button type="button" class="nv-in" data-vmine="1">✏️ Make it mine</button><button type="button" data-vspin="1">🌍 Spin again</button><button type="button" data-vshare="1">↗ Share</button>':`${preview?"":`<a class="nv-in" href="${esc(sms)}">🙌 I'm in${p.h?" (text "+esc(p.h)+")":""}</a>`}${p.d?'<button type="button" data-ics="1">📅 Add to calendar</button>':""}<button type="button" data-vshare="1">↗ Share</button>${preview?'<button type="button" data-vedit="1">✏️ Keep editing</button>':'<button type="button" data-vcopy="1">✏️ Make my own copy</button>'}`}</div>
    <p class="nv-priv">${auto?"Picked at random from real listings near the show. Food and afters times are suggestions, and hours aren't always listed, so check before you go.":`This plan lives only in this link. The Shack doesn't store it and nobody signs in.${pays?" Pay buttons open Venmo or Cash App: check the name there before you send money.":""}`}</p>
    ${preview?"":'<button type="button" class="nv-shack" data-vclose="1">🌴 Open the Show Shack</button>'}</div>`;
  document.body.appendChild(el);document.documentElement.classList.add("nview-on");
  el.addEventListener("click",async ev=>{if(ev.target===el){close();return;}const b=ev.target.closest("button");if(!b)return;
    if(b.dataset.vflip){flipCard(el,p);return;}
    if(b.classList.contains("nv-x")||b.dataset.vclose||b.dataset.vedit){close();if(b.dataset.vedit)openPlan();return;}
    if(b.dataset.vshare){shareNight(p,b);return;}
    if(b.dataset.vspin){surpriseNight();return;}
    if(b.dataset.vmine){useNight(newId(),{...p,up:Date.now()});close();openPlan();toast("It's in your Plan tab (and Saved). Tweak it, then send");return;}
    if(b.dataset.ics){const blob=new Blob([ics(p)],{type:"text/calendar"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(p.t||"night").replace(/[^\w-]+/g,"-").slice(0,40)+".ics";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);return;}
    if(b.dataset.vcopy){useNight(newId(),{...p,up:Date.now()});close();openPlan();toast("Copied into your Plan tab. Your other nights are in Saved");}});
  el.querySelector(".nv-x").focus({preventScroll:true});}
// Night Card ↔ The damage: same quarter-turn flip as the plan card
function flipCard(el,p){const card=el.querySelector(".nv-card");if(!card||card._busy)return;
  const swap=()=>{if(card.classList.contains("dmg")){card.classList.remove("dmg");card.innerHTML=card._front;}
    else{card._front=card.innerHTML;card.classList.add("dmg");card.innerHTML=`<div class="bnight nv-dmg flipped">${backHtml(p,"view")}</div>`;}el.scrollTop=0;};
  if(!card.animate||matchMedia("(prefers-reduced-motion: reduce)").matches){swap();return;}card._busy=true;
  card.animate([{transform:"scaleX(1)"},{transform:"scaleX(0.02)"}],{duration:150,easing:"cubic-bezier(.5,0,.75,.4)",fill:"forwards"}).onfinish=()=>{swap();
    const a=card.animate([{transform:"scaleX(0.02)"},{transform:"scaleX(1)"}],{duration:170,easing:"cubic-bezier(.25,.6,.4,1)",fill:"forwards"});a.onfinish=()=>{a.cancel();card.getAnimations().forEach(x=>x.cancel());card._busy=false;};};}
function close(){const v=$("nightView");if(v){v.remove();document.documentElement.classList.remove("nview-on");if(VOPENER&&VOPENER.isConnected&&VOPENER.focus)VOPENER.focus({preventScroll:true});VOPENER=null;}}
document.addEventListener("keydown",ev=>{if(ev.key==="Escape")close();});
// live link (#L=…): fetch the latest plan, and check again every 45 s while it's open so changes show up on their own
let liveT=0;
async function fromLive(id){let seen="";clearInterval(liveT);
  const get=async quiet=>{const r=await SH.rpc("get_live_night",{p_id:id});const row=r&&r[0];
    if(!row){if(!quiet)toast("That night link was turned off by its owner.");return false;}
    if(row.updated_at===seen)return true;const again=!!seen;seen=row.updated_at;view(cleanPlan(row.plan),false);if(again)toast("Plan updated ✓");return true;};
  try{try{history.replaceState(null,"",location.pathname);}catch(e){}if(!await get(false))return;
    liveT=setInterval(()=>{if(!$("nightView")){clearInterval(liveT);return;}if(document.visibilityState==="visible")get(true).catch(()=>{});},45000);}
  catch(e){toast("Couldn't load that night. Check your connection and open the link again.");}}
async function fromHash(h){const L=/^#L=([A-Za-z0-9]{10,16})$/.exec(h||"");if(L){fromLive(L[1]);return;}
  const m=/^#n=([01][A-Za-z0-9_-]+)$/.exec(h||"");if(!m)return;
  try{const p=await decode(m[1]);try{history.replaceState(null,"",location.pathname);}catch(e){}view(p,false);}
  catch(e){toast("That Night Card link looks broken. Ask for it again.");}}
addEventListener("hashchange",ev=>fromHash(new URL(ev.newURL).hash));

/* ---------- the globe: plans a whole night at random (food → show → afters) ---------- */
const plusMin=(t,m)=>{let [h,x]=t.split(":").map(Number);let v=((h*60+x+m)%1440+1440)%1440;return String(v/60|0).padStart(2,"0")+":"+String(v%60).padStart(2,"0");};
const addDays=(iso,n)=>{const [y,m,d]=iso.split("-").map(Number),x=new Date(y,m-1,d+n);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");};
let spun=[];
function nightFor(e){const now=todayISO();
  const show=showStop(e,true),st=show.tm||"20:00";show.tm=st;
  const near=nearAfters(e.lat,e.lon,60,12),rnd=a=>a[Math.floor(Math.random()*a.length)];
  const food=near.filter(x=>grp(x.p)==="food"&&EXP[x.p.c]!=="splurge"&&x.mi<=6).slice(0,3),fp=food.length?rnd(food).p:null;
  const eat=fp?{...afterStop(fp),k:"eat",no:AC[fp.c][1]+" before the show"}:{k:"eat",n:"Dinner near the venue",u:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("restaurants near "+show.p)};
  eat.tm=plusMin(st,-90);
  const late=new Set(["karaoke","arcade","bowl","spa","jazz","roof","pool","hotel"]),opts=near.filter(x=>late.has(x.p.c)&&!(x.p.til&&x.p.til<23)).slice(0,6);
  const after=opts.length?afterStop(rnd(opts).p):{k:"after",n:"Late eats",u:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("late night food near "+show.p)};
  after.tm=plusMin(st,150);
  const d=e.start<now?now:e.start,short=String(e.title).split(/[:(–—-]/)[0].trim().slice(0,40);
  return cleanPlan({t:short+" night",d,up:Date.now(),s:[eat,show,after]});}
// map: "Build a night here" → a fresh saved night (food → this show → afters), opened in the Plan tab
function nightAt(e){if(!e||typeof e.lat!=="number")return;useNight(newId(),nightFor(e));openPlan();toast("Night built around "+esc(String(e.title).slice(0,40))+". Your other nights are in Saved");}
function surpriseNight(){const now=todayISO(),hasO=typeof origin!=="undefined"&&origin&&typeof origin.lat==="number";
  let pool=allEv().filter(e=>typeof e.lat==="number"&&e.start&&(e.end||e.start)>=now&&e.start<=addDays(now,14)&&!["openmic","contact"].includes(e.kind)&&!(typeof priceInfo==="function"&&priceInfo(e).sold)&&!spun.includes(hid(e)));
  if(hasO){const near=pool.filter(e=>{const d=driveEstimate(e.lat,e.lon);return d&&d.mins<=50;});if(near.length>=5)pool=near;}
  if(!pool.length){spun=[];toast("No shows to spin right now");return;}
  const e=pool[Math.floor(Math.random()*pool.length)];spun=[hid(e),...spun].slice(0,8);
  view(nightFor(e),"auto");}

/* ---------- Saved tab: "Your nights" (every plan you've built, newest first) ---------- */
function nName(p){return p.t||(p.s.find(x=>x.k==="show")||{}).n||(p.d?"Night of "+fmtD(p.d):"Untitled night");}
const goSaved=()=>{const t=document.querySelector('#bTabs [data-tab="saved"]');if(t)t.click();setTimeout(()=>{const n=$("bNights");if(n)n.scrollIntoView({behavior:"smooth",block:"start"});},120);};
let savedOn=false;
function nightCard(x){const p=x.p,cur=x.id===planId,tot=p.s.length?dmg(p).tot:0,sh=p.s.find(s=>s.k==="show");
  return `<article class="bnc${cur?" cur":""}" style="--sc:${sh?TYPES.show[2]:TYPES[(p.s[0]||{}).k||"other"][2]}">
    <div class="bnc-top">${cur?'<span class="bnc-tag">Editing now</span>':""}<b>${esc(nName(p))}</b><span>${esc(p.d?fmtD(p.d):"Date TBD")} · ${p.s.length} stop${p.s.length===1?"":"s"}${tot?` · ≈ $${Math.round(tot)} each`:""}</span></div>
    <ol class="bnc-stops">${p.s.slice(0,4).map(s=>`<li>${tic(s.k,"sm")}<span>${s.tm?`<em>${esc(fmtT(s.tm))}</em> `:""}${esc(s.n||TYPES[s.k][1])}</span></li>`).join("")}${p.s.length>4?`<li class="more">+${p.s.length-4} more</li>`:""}</ol>
    ${p.up?`<small class="bnc-up">Updated ${esc(fmtUp(p.up))}</small>`:""}
    <div class="bnc-act">${p.d&&p.d<todayISO()?`<button type="button" class="bnc-open" data-nagain="${esc(x.id)}">🔁 Do it again</button>`:`<button type="button" class="bnc-open" data-nopen="${esc(x.id)}">${cur?"Keep building":"Open in Plan"}</button>`}<button type="button" data-nshare="${esc(x.id)}">Share</button><button type="button" class="bn-trash bnc-del" data-ndel="${esc(x.id)}" aria-label="Delete ${esc(nName(p))}">${tic("trash")}</button></div></article>`;}
function drawSaved(){if(!savedOn)return;let el=$("bNights");const list=$("list");if(!list)return;
  if(!el){el=document.createElement("section");el.id="bNights";el.className="bnights";el.setAttribute("aria-label","Your nights");list.before(el);
    el.addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;const d=b.dataset,x=NIGHTS.find(n=>n.id===(d.nopen||d.nshare||d.ndel||d.nagain));
      if(d.nnew!=null){useNight(newId(),{});openPlan();return;}
      if(!x)return;
      if(d.nopen){if(x.id!==planId)useNight(x.id,x.p);openPlan();return;}
      // same crew, same spots, next week: same weekday, the show slot opens up for a new pick
      if(d.nagain){const [y,m,dd]=x.p.d.split("-").map(Number),wd=new Date(y,m-1,dd).getDay(),t=new Date();t.setHours(12);let k=(wd-t.getDay()+7)%7;if(k<2)k+=7;t.setDate(t.getDate()+k);
        const s2=x.p.s.map(s=>s.k==="show"?{k:"show",tm:s.tm,no:"Last time: "+(s.n||"a show")+(s.p?" @ "+s.p:"")+". Pick this week's show."}:{...s});
        useNight(newId(),{...x.p,t:(x.p.t||"Our night").replace(/ \(again\)$/,"")+" (again)",d:t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),up:Date.now(),s:s2});
        openPlan();toast("Copied for next "+t.toLocaleDateString("en-US",{weekday:"long"})+". Pick the show");return;}
      if(d.nshare){shareNight(x.p,b,x.id);return;}
      if(d.ndel){if(!b.classList.contains("sure")){b.classList.add("sure");b.setAttribute("aria-label","Tap again to delete");const c=b.closest(".bnc");c.classList.add("sure");setTimeout(()=>{b.classList.remove("sure");c.classList.remove("sure");},2500);return;}
        NIGHTS=NIGHTS.filter(n=>n.id!==x.id);if(x.id===planId){plan=cleanPlan({});planId=newId();try{SH.store.put(KEY,JSON.stringify(plan));}catch(e){}drawBuilder();}
        putNights();drawSaved();toast(`Deleted ${esc(nName(x.p))}`,"Undo",()=>{NIGHTS.push(x);NIGHTS.sort((a,b)=>(b.p.up||0)-(a.p.up||0));putNights();drawSaved();drawBuilder();});}});}
  el.hidden=false;
  const today=todayISO(),past=NIGHTS.filter(x=>x.p.d&&x.p.d<today),up=NIGHTS.filter(x=>!(x.p.d&&x.p.d<today))
    .sort((a,b)=>(a.p.d||"9999").localeCompare(b.p.d||"9999")||(b.p.up||0)-(a.p.up||0));
  el.innerHTML=`<div class="bpicks-h"><h2 class="bsec">${tic("after","sm")} Your nights${NIGHTS.length?` · ${NIGHTS.length}`:""}</h2><button type="button" class="blink" data-nnew="1">＋ New night</button></div>
    ${up.length?`<h3 class="bnc-h">Coming up · soonest first</h3><div class="bnc-row">${up.map(nightCard).join("")}</div>`:NIGHTS.length?"":`<p class="bnone">Nights you build in the Plan tab land here, so you can work on a few and flip between them.</p>`}
    ${past.length?`<h3 class="bnc-h">Past nights · their shows are in your Show passport</h3><div class="bnc-row bnc-past">${past.map(nightCard).join("")}</div>`:""}
    <h2 class="bsec bnights-sh">${tic("show","sm")} Saved shows</h2>`;}
function savedRow(on){savedOn=on;if(on)drawSaved();else{const el=$("bNights");if(el)el.hidden=true;}}

// backup / restore (b.js passport file carries your nights too)
const allNights=()=>NIGHTS.map(x=>({id:x.id,p:cleanPlan(x.p)}));
function mergeNights(arr){if(!Array.isArray(arr))return 0;let n=0;arr.slice(0,MAXN).forEach(x=>{if(!x||typeof x.id!=="string"||NIGHTS.some(y=>y.id===x.id))return;NIGHTS.push({id:x.id.slice(0,20),p:cleanPlan(x.p)});n++;});
  NIGHTS.sort((a,b)=>(b.p.up||0)-(a.p.up||0));if(NIGHTS.length>MAXN)NIGHTS.length=MAXN;putNights();drawSaved();drawBuilder();return n;}
window.NIGHT={rideFare,LASTTRAIN,spots:allAfters,savedRow,stopFor:afterStop,toast,nightAt,allNights,mergeNights,pack,unpack,AC,IC,ic,EXP,cost,hrs,grp,ready:()=>AFTERS.length>0,surpriseNight,chip,map,sheet,encode,decode,cleanPlan,addStop,view,get plan(){return plan;}};
if(keep(plan)&&!NIGHTS.some(x=>x.id===planId))upsertNight();else putNights();
const go=()=>{mount();inject(document.body);fromHash(window.NIGHT_HASH||location.hash);};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();
