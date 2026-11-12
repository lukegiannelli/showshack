/* ---- The Show Shack · flyers. Snap a flyer → the phone reads it (Tesseract OCR, on your device) → you check the details →
   we make sure it isn't already on the Shack → it goes live for everyone as "from a flyer · not verified yet".
   Supabase (free plan): community_shows table + public "flyers" picture bucket. Same show can only be added once
   (the database refuses exact repeats, and this file warns about close matches before that). ---- */
(()=>{
if(!window.SH||!window.SHACK_CLOUD)return;
const C=window.SHACK_CLOUD,$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OCR="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const KINDS=[["concert","Concert"],["club","Club / DJ night"],["festival","Festival"],["comedy","Comedy"],["theater","Theater"],["openmic","Open mic"],["social","Dance social"],["dance","Ecstatic dance"],["sound","Sound bath"],["drum","Drum circle"],["art","Art walk / market"],["volunteer","Volunteer"],["contact","Contact improv"]];
const pub=p=>p?SH.sb.url+"/storage/v1/object/public/flyers/"+p.split("/").map(encodeURIComponent).join("/"):"";

/* ===== matching: same show? ===== */
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const STOP=new Set(["the","a","an","and","of","at","live","in","with","w","feat","ft","presents","tour","night","show","tickets"]);
const words=s=>new Set(N(s).split(" ").filter(w=>w.length>1&&!STOP.has(w)));
function titleSim(a,b){const x=N(a).replace(/ /g,""),y=N(b).replace(/ /g,"");if(!x||!y)return 0;if(x===y)return 1;
  if(x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x)))return .9;
  const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(w=>{if(B.has(w))n++;});return n/Math.min(A.size,B.size);}
const venueSame=(a,b)=>{const x=N(a).replace(/ /g,""),y=N(b).replace(/ /g,"");return !!x&&!!y&&(x===y||(Math.min(x.length,y.length)>=5&&(x.includes(y)||y.includes(x))));};
const dayDiff=(a,b)=>Math.abs((new Date(a+"T12:00")-new Date(b+"T12:00"))/864e5);
// strong = it's the same show (block); weak = might be (ask first)
function matches(c,list){const strong=[],weak=[];
  for(const e of list){if(!e||!e.start||!e.title)continue;const dd=dayDiff(c.start,String(e.start).slice(0,10));if(dd>1)continue;
    const ts=titleSim(c.title,e.title),vs=venueSame(c.venue,e.venue);
    if(dd===0&&ts>=.6&&(vs||ts>=.9))strong.push(e);else if((dd===0&&vs)||(dd<=1&&ts>=.6))weak.push(e);}
  return {strong,weak};}

/* ===== known venues (for the venue box and map pins) ===== */
function venues(){const m=new Map();
  for(const e of state.events||[])if(e.venue&&e.city&&typeof e.lat==="number"){const k=e.venue+" · "+e.city;if(!m.has(k))m.set(k,{venue:e.venue,city:e.city,lat:e.lat,lon:e.lon});}
  try{for(const [n,o] of Object.entries(window.VOPEN||VOPEN||{}))if(o&&o.c&&typeof o.la==="number"){const k=n+" · "+o.c;if(!m.has(k))m.set(k,{venue:n,city:o.c,lat:o.la,lon:o.lo});}}catch(e){}
  return m;}
function findVenue(name,city){const vs=venues();const k=name+" · "+city;if(vs.has(k))return vs.get(k);
  for(const v of vs.values())if(venueSame(v.venue,name)&&(!city||N(v.city)===N(city)))return v;return null;}

/* ===== community shows → the app ===== */
let ROWS=[],EVS=[],loaded=false;
function toEvent(r){const v=findVenue(r.venue,r.city);
  return {id:"c-"+r.id,cid:r.id,mine:!!r.mine,community:true,flyer:pub(r.flyer_path),title:r.title,start:r.start,time:r.show_time||"",venue:r.venue,city:r.city,
    lat:v?v.lat:undefined,lon:v?v.lon:undefined,kind:r.kind,genres:[],priceFrom:r.price_from,priceTo:null,priceEst:false,status:"on sale",url:r.url||pub(r.flyer_path)||"",
    note:"Added from a flyer by a Shack user · not verified yet. Check the venue before you buy."};}
async function load(){try{const sb=C.user?await C.client():null;
    const rows=sb?(await sb.rpc("list_community_shows")).data:await SH.rpc("list_community_shows",{});ROWS=Array.isArray(rows)?rows:[];}catch(e){ROWS=[];}
  loaded=true;merge();}
// put community shows into the main list (only ones with a known venue location, and never a repeat of a listed show)
function merge(){if(!loaded||!state.loaded)return;const base=(state.events||[]).filter(e=>!e.community);
  EVS=ROWS.map(toEvent).filter(e=>!matches(e,base).strong.length);
  state.events=base.concat(EVS.filter(e=>typeof e.lat==="number"));
  if(typeof render==="function")render();drawRow();}
(function wait(n){if(state.loaded&&(state.events||[]).length){load();return;}if(n<60)setTimeout(()=>wait(n+1),500);})(0);
C.onUser(()=>{if(loaded)load();});

/* ===== the "From flyers" row on Home ===== */
function drawRow(){const row=$("bFly");if(!row||!window.SHACK_FLIP)return;const today=todayStr();
  const xs=EVS.filter(e=>e.start>=today).slice(0,12),sig=xs.map(e=>e.id).join("|");
  if(row.dataset.sig===sig)return;row.dataset.sig=sig;
  row.innerHTML=xs.length?xs.map(e=>SHACK_FLIP.html(e,`<i style="--vc:#ff8fd8"></i>📸 From a flyer`)).join("")
    :`<p class="bnone">No flyer shows yet. Be the first: tap <b>📸 Add a flyer</b>.</p>`;
  xs.forEach(e=>{const card=row.querySelector(`.bfc[data-k="${CSS.escape("e:"+e.id)}"]`);const acts=card&&card.querySelector(".bfb-acts");if(!acts)return;
    acts.insertAdjacentHTML("beforeend",`${e.flyer?`<a href="${E(e.flyer)}" target="_blank" rel="noopener">See the flyer</a>`:""}${e.mine?`<button type="button" data-fdel="${E(e.cid)}">Remove mine</button>`:`<button type="button" data-frep="${E(e.cid)}">Report</button>`}`);});}
const rowEl=$("bFly");
if(rowEl){rowEl.addEventListener("click",async ev=>{
  const rp=ev.target.closest("[data-frep]"),dl=ev.target.closest("[data-fdel]");
  if(rp){ev.stopPropagation();if(!C.user){alert("Sign in on Venues → Show passport to report a listing.");return;}
    if(!confirm("Report this show as wrong, fake or a repeat? After 3 reports it's hidden."))return;
    try{const sb=await C.client();const {error}=await sb.rpc("report_show",{p_id:rp.dataset.frep});if(error)throw error;rp.textContent="Reported ✓";rp.disabled=true;}catch(e){rp.textContent="Couldn't report";}return;}
  if(dl){ev.stopPropagation();if(!confirm("Remove the show you added?"))return;
    try{const sb=await C.client();const r=ROWS.find(x=>x.id===dl.dataset.fdel);const {error}=await sb.from("community_shows").delete().eq("id",dl.dataset.fdel);if(error)throw error;
      if(r&&r.flyer_path)sb.storage.from("flyers").remove([r.flyer_path]).catch(()=>{});await load();}catch(e){dl.textContent="Couldn't remove";}return;}
  if(window.SHACK_FLIP)SHACK_FLIP.click(ev);},true);}
// app.js re-renders Home often; keep the row filled
addEventListener("load",()=>setTimeout(drawRow,500));

/* ===== reading the flyer ===== */
let ocrLib=null;
function loadOCR(){return ocrLib||(ocrLib=new Promise((ok,no)=>{const s=document.createElement("script");s.src=OCR;s.onload=()=>ok(window.Tesseract);s.onerror=()=>{ocrLib=null;no(new Error("ocr"));};document.head.appendChild(s);}));}
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function nextDate(m,d,y){const t=new Date();t.setHours(0,0,0,0);let yr=y?(y<100?2000+y:y):t.getFullYear();let dt=new Date(yr,m-1,d);
  if(!y&&dt<new Date(t.getTime()-864e5))dt=new Date(yr+1,m-1,d);if(dt.getMonth()!==m-1)return "";
  return dt.getFullYear()+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
function parse(text,lines){const T=" "+text.replace(/\s+/g," ")+" ",low=T.toLowerCase(),out={};
  // date: "NOV 22", "November 22nd", "22 NOV", "11/22", "11.22.26"
  let m=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i.exec(T);
  if(m)out.start=nextDate(MON[m[1].toLowerCase()],+m[2],m[3]?+m[3]:0);
  if(!out.start){m=/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i.exec(T);if(m)out.start=nextDate(MON[m[2].toLowerCase().slice(0,3)],+m[1],0);}
  if(!out.start){m=/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/.exec(T);if(m&&+m[1]<=12&&+m[2]<=31)out.start=nextDate(+m[1],+m[2],m[3]?+m[3]:0);}
  // time: prefer the one next to "show", else the last "doors" isn't it, else the first
  const times=[...T.matchAll(/(doors?|show|music|starts?)?[^0-9a-z]{0,6}(\d{1,2})(?::(\d\d))?\s*(a\.?m\.?|p\.?m\.?)/gi)];
  const pick=times.find(x=>/show|music|start/i.test(x[1]||""))||times.find(x=>!/door/i.test(x[1]||""))||times[0];
  if(pick)out.time=`${+pick[2]}:${pick[3]||"00"} ${/p/i.test(pick[4])?"PM":"AM"}`;
  // price
  if(/\bfree\b/.test(low)&&!/free parking/.test(low))out.price=0;
  const ps=[...T.matchAll(/\$\s?(\d{1,4})(?:\.\d\d)?/g)].map(x=>+x[1]).filter(x=>x>0&&x<2000);if(ps.length)out.price=Math.min(...ps);
  // link
  m=/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:com|net|org|co|link|events|tickets|fm|io|la)(?:\/[^\s]*)?)/i.exec(T);if(m&&!/@/.test(m[1]))out.url=/^https?:/i.test(m[1])?m[1]:"https://"+m[1];
  // venue: the longest known venue name that shows up on the flyer
  const flat=" "+N(text)+" ";let best=null;
  for(const v of venues().values()){const n=N(v.venue);if(n.length>=4&&flat.includes(" "+n+" ")&&(!best||n.length>N(best.venue).length))best=v;}
  if(best){out.venue=best.venue;out.city=best.city;}
  // kind
  out.kind=/comedy|stand.?up|comedian/.test(low)?"comedy":/open mic/.test(low)?"openmic":/festival|fest\b/.test(low)?"festival":/\bdj\b|rave|techno|house music|club/.test(low)?"club":/sound bath/.test(low)?"sound":"concert";
  // title: the biggest text on the flyer that isn't a date, time, price, link or the venue
  const skip=l=>/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\d{1,2}[:\/.]\d|\b\d{1,2}\s*(am|pm)\b|\$|www\.|\.com|tickets|doors|all ages|21\+|18\+/i.test(l.text)||(best&&N(l.text).includes(N(best.venue)));
  const cand=(lines||[]).map(l=>({text:String(l.text||"").replace(/[^A-Za-z0-9&'!?.,:\- ]+/g," ").replace(/\s+/g," ").trim(),h:l.bbox?l.bbox.y1-l.bbox.y0:0,conf:l.confidence||0}))
    .filter(l=>l.text.length>=3&&/[A-Za-z]{2}/.test(l.text)&&l.conf>=45&&!skip(l)).sort((a,b)=>b.h-a.h);
  if(cand.length){let t=cand[0].text;if(cand[1]&&cand[1].h>=cand[0].h*.8&&t.length<18)t+=" "+cand[1].text;out.title=t.replace(/\b([A-Z])([A-Z]+)\b/g,(w,a,b)=>a+b.toLowerCase()).slice(0,120);}
  return out;}

/* ===== shrinking the photo before upload ===== */
async function shrink(file,max){const src=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
  const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);let blob=null;for(const q of [.82,.7,.6,.5]){blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q));if(blob&&blob.size<390000)break;}return {blob,canvas:c};}
  finally{URL.revokeObjectURL(src);}}

/* ===== the sheet ===== */
let F=null;   // {file, blob, fields, ack}
function sheet(html){let el=$("flySheet");if(!el){el=document.createElement("div");el.id="flySheet";el.className="fly-sheet";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Add a show from a flyer");document.body.appendChild(el);}
  el.innerHTML=`<div class="fly-card"><div class="fly-h"><b>📸 Add a show from a flyer</b><button type="button" class="fly-x" data-fly="close" aria-label="Close">✕</button></div>${html}</div>`;el.hidden=false;document.documentElement.classList.add("fly-open");}
function close(){const el=$("flySheet");if(el)el.hidden=true;document.documentElement.classList.remove("fly-open");F=null;}
function start(){
  if(!C.user){sheet(`<p class="fly-p">Sign in first so the Shack knows who added what (it keeps out spam). It's free and takes a minute.</p>
      <button type="button" class="fly-main" data-fly="signin">Sign in with email</button>`);return;}
  F={};sheet(`<p class="fly-p">Take a clear, straight-on photo of the flyer. Your phone reads it and fills in the details. You check them before anything is added.</p>
    <label class="fly-main">📷 Take or choose a photo<input type="file" accept="image/*" capture="environment" data-fly-file hidden></label>
    <p class="fly-small">The flyer picture is shown to everyone with the listing. Nothing else about you is.</p>`);}
function form(v,status){const vs=[...venues().keys()].sort();
  sheet(`${F&&F.preview?`<img class="fly-img" src="${F.preview}" alt="Your flyer">`:""}
    ${status?`<p class="fly-status" aria-live="polite">${status}</p>`:""}
    <form class="fly-f" data-fly-form>
      <label>What's the show?<input name="title" required maxlength="120" value="${E(v.title||"")}" placeholder="Artist or event name"></label>
      <div class="fly-2"><label>Date<input name="start" type="date" required value="${E(v.start||"")}" min="${todayStr()}"></label>
        <label>Show time<input name="time" maxlength="20" value="${E(v.time||"")}" placeholder="8:00 PM"></label></div>
      <label>Venue<input name="venue" required maxlength="100" list="flyVenues" value="${E(v.venue||"")}" placeholder="Start typing… pick from the list if it's there" autocomplete="off"></label>
      <datalist id="flyVenues">${vs.map(k=>`<option value="${E(k)}">`).join("")}</datalist>
      <label>City<input name="city" required maxlength="60" value="${E(v.city||"")}" placeholder="e.g. Santa Ana"></label>
      <div class="fly-2"><label>Kind<select name="kind">${KINDS.map(([k,l])=>`<option value="${k}"${(v.kind||"concert")===k?" selected":""}>${l}</option>`).join("")}</select></label>
        <label>Price from ($)<input name="price" type="number" min="0" max="5000" step="1" inputmode="numeric" value="${v.price!=null?E(v.price):""}" placeholder="0 = free"></label></div>
      <label>Ticket or info link (optional)<input name="url" type="url" maxlength="300" value="${E(v.url||"")}" placeholder="https://…"></label>
      <div class="fly-dupe" id="flyDupe" aria-live="polite"></div>
      <button class="fly-main" type="submit">Check and add</button>
    </form>`);}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-fly]");if(!b)return;ev.preventDefault();const a=b.dataset.fly;
  if(a==="close")close();
  if(a==="signin"){close();const t=document.querySelector('#bTabs [data-tab="venues"]');if(t)t.click();setTimeout(()=>{if(!C.signIn())setTimeout(()=>C.signIn(),600);},500);}
  if(a==="again")start();});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&$("flySheet")&&!$("flySheet").hidden)close();});
const add=$("bFlyAdd");if(add)add.addEventListener("click",start);
window.SHACK_FLYER={open:start};

document.addEventListener("change",async ev=>{const i=ev.target.closest("[data-fly-file]");if(!i||!i.files||!i.files[0])return;const file=i.files[0];
  try{const {blob,canvas}=await shrink(file,1400);F={blob,preview:canvas.toDataURL("image/jpeg",.6)};}catch(e){sheet(`<p class="fly-p">Couldn't open that picture. Try another one.</p><button type="button" class="fly-main" data-fly="again">Try again</button>`);return;}
  form({},"Reading the flyer… (the first time takes a little longer)");
  try{const T=await loadOCR();const w=await T.createWorker("eng");const {data}=await w.recognize(F.blob);await w.terminate();
    const lines=data.lines||(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
    const v=parse(data.text||"",lines);if(!$("flySheet")||$("flySheet").hidden)return;
    form(v,v.title||v.start||v.venue?"✓ Read it. Check everything below and fix anything it got wrong.":"Couldn't read much from that one. Fill it in below.");}
  catch(e){if($("flySheet")&&!$("flySheet").hidden)form({},"Couldn't read the flyer on this device. Fill it in below.");}},true);

document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-fly-form]");if(!f)return;ev.preventDefault();ev.stopPropagation();
  const btn=f.querySelector(".fly-main"),box=$("flyDupe");let venue=f.venue.value.trim(),city=f.city.value.trim();
  const pick=venue.split(" · ");if(pick.length===2){venue=pick[0].trim();city=city||pick[1].trim();}
  const c={title:f.title.value.trim(),start:f.start.value,time:f.time.value.trim(),venue,city,kind:f.kind.value,price:f.price.value===""?null:+f.price.value,url:f.url.value.trim()};
  if(c.url&&!/^https?:\/\//i.test(c.url))c.url="https://"+c.url;
  // the duplicate check: listed shows + flyer shows already in
  const all=(state.events||[]).filter(e=>!e.community).concat(EVS);
  const {strong,weak}=matches(c,all);
  const line=e=>`<b>${E(e.title)}</b> · ${E(new Date(e.start+"T12:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}))} · ${E(e.venue)}`;
  if(strong.length){box.innerHTML=`<p class="fly-warn">Good news, it's already on the Shack:<br>${strong.slice(0,2).map(line).join("<br>")}</p><p class="fly-small">No need to add it. If something on the listing is wrong, use Report on it.</p>`;return;}
  if(weak.length&&!F.ack){F.ack=true;box.innerHTML=`<p class="fly-warn">Is it one of these? ${weak.slice(0,3).map(line).join("<br>")}</p><p class="fly-small">If yes, close this. If it's a different show, tap <b>Check and add</b> again.</p>`;btn.textContent="It's different, add it";return;}
  btn.disabled=true;btn.textContent="Adding…";
  try{const sb=await C.client();let path=null;
    if(F&&F.blob){path=`${C.user.id}/${Date.now().toString(36)}.jpg`;const up=await sb.storage.from("flyers").upload(path,F.blob,{contentType:"image/jpeg"});if(up.error)path=null;}
    const {error}=await sb.from("community_shows").insert({submitted_by:C.user.id,title:c.title,start:c.start,show_time:c.time||null,venue:c.venue,city:c.city,kind:c.kind,price_from:c.price,url:c.url||null,flyer_path:path});
    if(error){if(path)sb.storage.from("flyers").remove([path]).catch(()=>{});throw error;}
    sheet(`<p class="fly-p">🎉 <b>${E(c.title)}</b> is on the Shack. Thanks for adding it!</p><p class="fly-small">It shows in <b>From flyers</b> on Home${findVenue(c.venue,c.city)?" and in the show list":""}.</p>
      <button type="button" class="fly-main" data-fly="again">Add another flyer</button>`);await load();}
  catch(e){const m=String(e&&(e.message||e.code)||"");btn.disabled=false;btn.textContent="Check and add";
    box.innerHTML=`<p class="fly-warn">${/duplicate|unique|23505/i.test(m)?"Someone already added this exact show. 🙌":/cap: 5/.test(m)?"That's 5 flyers today, thanks! Try again tomorrow.":/cap: 40/.test(m)?"You have 40 upcoming flyer shows already.":/date out/.test(m)?"That date doesn't look right. Pick a date from today to a year out.":"Couldn't add it. Check your connection and try again."}</p>`;}},true);
})();
