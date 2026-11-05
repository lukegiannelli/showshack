let origin = null; // {address, lat, lon, label} — per viewer, never shared
const CITIES = {"santa ana":[33.7455,-117.8677],"anaheim":[33.8366,-117.9143],"irvine":[33.6846,-117.8265],"costa mesa":[33.6411,-117.9187],"huntington beach":[33.6603,-117.9992],"garden grove":[33.7739,-117.9414],"fullerton":[33.8704,-117.9242],"orange":[33.7879,-117.8531],"tustin":[33.7458,-117.8262],"westminster":[33.7513,-117.9940],"fountain valley":[33.7092,-117.9537],"newport beach":[33.6189,-117.9289],"laguna beach":[33.5427,-117.7854],"mission viejo":[33.6000,-117.6720],"lake forest":[33.6469,-117.6892],"san clemente":[33.4270,-117.6120],"dana point":[33.4672,-117.6981],"san juan capistrano":[33.5017,-117.6625],"long beach":[33.7701,-118.1937],"los angeles":[34.0522,-118.2437],"hollywood":[34.0928,-118.3287],"pasadena":[34.1478,-118.1445],"santa monica":[34.0195,-118.4912],"inglewood":[33.9617,-118.3531],"torrance":[33.8358,-118.3406],"riverside":[33.9806,-117.3755],"san bernardino":[34.1083,-117.2898],"ontario":[34.0633,-117.6509],"corona":[33.8753,-117.5664],"temecula":[33.4936,-117.1484],"san diego":[32.7157,-117.1611],"oceanside":[33.1959,-117.3795],"palm springs":[33.8303,-116.5453],"ventura":[34.2746,-119.2290],"whittier":[33.9792,-118.0328],"buena park":[33.8675,-117.9981],"cypress":[33.8170,-118.0373],"yorba linda":[33.8886,-117.8131],"brea":[33.9167,-117.9001]};
function cityGuess(text){const t=text.toLowerCase();let best=null;for(const k in CITIES){if(t.includes(k)&&(!best||k.length>best.length))best=k;}return best?{lat:CITIES[best][0],lon:CITIES[best][1],approx:true}:null;}
const KINDS = [["all","All"],["starred","★ Starred"],["rave","Raves & DJs"],["festival","Festivals"],["concert","Concerts"],["comedy","Comedy"],["theater","Theater & arts"],["openmic","Open mics"],["dance","Ecstatic dance"],["contact","Contact improv"],["sound","Sound baths"],["drum","Drum circles"]];
const CONS=new Set(["dance","contact","sound","drum"]);
function isRec(e){return e.kind==="openmic"||(CONS.has(e.kind)&&!!e.recurrence);}
function isRave(e){return e.kind==="club"||(e.genres||[]).includes("electronic");}
let myUid=null, amOwner=false, dbRef=null;
const REGIONS = ["Orange County","Los Angeles","Inland Empire","San Diego","Desert","Ventura","Other"];
function region(e){const la=e.lat,lo=e.lon;if(typeof la!=="number"||typeof lo!=="number")return "Other";if(lo>-116.75)return "Desert";if(la<33.38)return "San Diego";if(lo<-118.65)return "Ventura";if(la<=33.95&&lo>=-118.12&&lo<=-117.41)return "Orange County";if(lo<=-117.65)return "Los Angeles";return "Inland Empire";}
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function nextOccurrence(r){
  if(!r||typeof r.weekday!=="number")return null;
  const t=new Date();t.setHours(0,0,0,0);
  if(r.freq==="monthly"&&r.nth){
    for(let i=0;i<3;i++){const m=new Date(t.getFullYear(),t.getMonth()+i,1);let d=1+((r.weekday-m.getDay()+7)%7)+7*(r.nth-1);const c=new Date(m.getFullYear(),m.getMonth(),d);if(c.getMonth()===m.getMonth()&&c>=t)return ymd(c);}
    return null;
  }
  const c=new Date(t);c.setDate(t.getDate()+((r.weekday-t.getDay()+7)%7));return ymd(c);
}
const GENRES = [["all","All"],["electronic","Electronic / house"],["hiphop","Hip-hop / R&B"],["indie","Indie / rock"],["reggae","Reggae / island"],["latin","Latin"],["pop","Pop / other"]];
const state = {flipped:new Set(), kind:"all", genre:"all", venue:"all", maxDrive:180, sort:"date", events:[], picks:[], stars:new Set(), loaded:false};
try{(JSON.parse(localStorage.getItem("radar-stars")||"[]")).forEach(k=>state.stars.add(String(k)));}catch(e){}
let starRef=null, starBusy=false, starAgain=false, starT, starCount=0;
function skey(e){return (e.added?"p:":"e:")+e.id;}
function saveStars(){try{localStorage.setItem("radar-stars",JSON.stringify([...state.stars]));}catch(e){} clearTimeout(starT); starT=setTimeout(flushStars,500);}
async function flushStars(){if(!starRef)return; if(starBusy){starAgain=true;return;} starBusy=true; try{await starRef.set({ids:[...state.stars]});}catch(e){if(e&&e.code==="invalid_argument")starRef=null;} starBusy=false; if(starAgain){starAgain=false;flushStars();}}
function updateStarChip(){const c=document.getElementById("kindRow-starred");if(c)c.textContent="★ Starred"+(starCount>0?" · "+starCount:"");}
try{const s=JSON.parse(localStorage.getItem("radar-prefs")||"{}");Object.assign(state,{kind:s.kind||"all",genre:s.genre||"all",maxDrive:s.maxDrive||180,sort:s.sort||"date",venue:"all",hideTBA:!!s.hideTBA,when:s.when||"any",flags:s.flags||{},car:s.car||1,mpg:+s.mpg>0?+s.mpg:25,gas:+s.gas>0?+s.gas:5.85,food:s.food!=null?+s.food:0,drinks:s.drinks!=null?+s.drinks:0,home:s.home||"drive",budget:+s.budget>0?+s.budget:0,pinV:Array.isArray(s.pinV)?s.pinV:[]});}catch(e){}
function savePrefs(){try{localStorage.setItem("radar-prefs",JSON.stringify({kind:state.kind,genre:state.genre,maxDrive:state.maxDrive,sort:state.sort,venue:state.venue,hideTBA:!!state.hideTBA,when:state.when,flags:state.flags,car:state.car,mpg:state.mpg,gas:state.gas,food:state.food,drinks:state.drinks,home:state.home,budget:state.budget,pinV:state.pinV}));}catch(e){}}

function driveEstimate(lat,lon){
  if(!origin||typeof origin.lat!=="number"||typeof lat!=="number"||typeof lon!=="number") return null;
  const R=3958.8, toR=d=>d*Math.PI/180;
  const dLat=toR(lat-origin.lat), dLon=toR(lon-origin.lon);
  const a=Math.sin(dLat/2)**2+Math.cos(toR(origin.lat))*Math.cos(toR(lat))*Math.sin(dLon/2)**2;
  const straight=2*R*Math.asin(Math.sqrt(a));
  const road=straight*1.2;
  const mins = 6 + road/55*60;
  return {miles:Math.round(road), mins:Math.max(5,Math.round(mins/5)*5)};
}
function fmtMins(m){if(m<60)return m+" min";const h=Math.floor(m/60),r=m%60;return h+" hr"+(r?" "+r+" min":"");}
function parseDay(s){if(!s)return null;const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function todayStr(){const t=new Date();return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const TICKET_RE=/(tickpick|ticketmaster|livenation|axs\.com|gametime\.co|vividseats|stubhub|seatgeek|ticketsmarter|todaytix|boxofficeticketsales|discotech\.me|feverup|insomniac\.com\/events|eventbrite|dice\.fm|seetickets|tixr|rateyourseats|timeout\.com\/tickets|songkick\.com|bandsintown|stereoboard|coachella\.com|stagecoachfestival\.com|comedy\.tickets|jambase\.com\/show)/i;
function safeUrl(u){try{const x=new URL(u);return (x.protocol==="https:"||x.protocol==="http:")?x.href:null;}catch(e){return null;}}

function buildChips(rowId,items,key){
  const row=document.getElementById(rowId);
  items.forEach(([v,l])=>{const b=document.createElement("button");b.className="chip";b.type="button";b.id=rowId+"-"+v;if(typeof l==="string"&&l.startsWith("<svg"))b.innerHTML=l;else b.textContent=l;
    b.setAttribute("aria-pressed",String(state[key]===v));
    b.onclick=()=>{state[key]=v;row.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",String(c===b)));savePrefs();render();};
    row.appendChild(b);});
}
state.when=state.when||"any"; state.flags=state.flags||{}; state.view="list"; state.car=state.car||1;
buildChips("whenRow",[["any","Any day"],["tonight","Tonight"],["weekend","This weekend"]],"when");
buildChips("kindRow",KINDS,"kind");
(function(){const row=document.getElementById("flagRow");const first=row.querySelector(".range");
  [["cheap","Free / under $25"],["allages","All ages"],["over21","21+"],["local",ni("home")+" Small & local"],["transit",ni("sprout")+" Transit-friendly"]].forEach(([k,l])=>{const b=document.createElement("button");b.type="button";b.className="chip";if(l.startsWith("<svg"))b.innerHTML=l;else b.textContent=l;b.setAttribute("aria-pressed",String(!!state.flags[k]));
    b.onclick=()=>{state.flags[k]=!state.flags[k];if(k==="allages"&&state.flags.allages)state.flags.over21=false;if(k==="over21"&&state.flags.over21)state.flags.allages=false;row.querySelectorAll("button.chip").forEach(c=>{const kk=c.dataset.f;if(kk)c.setAttribute("aria-pressed",String(!!state.flags[kk]));});savePrefs();render();};
    b.dataset.f=k;row.insertBefore(b,first);});})();buildChips("genreRow",GENRES,"genre");
const md=document.getElementById("maxDrive"), mdo=document.getElementById("maxDriveOut"), sb=document.getElementById("sortBy");
md.value=state.maxDrive; sb.value=state.sort;
function syncDrive(){mdo.textContent = +md.value>=180 ? "Any" : "≤ "+fmtMins(+md.value);}
syncDrive();
md.oninput=()=>{state.maxDrive=+md.value;syncDrive();savePrefs();render();};

sb.onchange=()=>{state.sort=sb.value;savePrefs();render();};
const vChip=document.getElementById("venueChip");
vChip.onclick=()=>{state.venue="all";savePrefs();render();};
const sq=document.getElementById("q"), sqc=document.getElementById("qClear"); let qT;
function norm(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();}
function setQ(v){state.q=norm(v.trim());sqc.hidden=!v;render();}
sq.addEventListener("input",()=>{clearTimeout(qT);qT=setTimeout(()=>setQ(sq.value),120);});
sq.addEventListener("keydown",ev=>{if(ev.key==="Enter")sq.blur();if(ev.key==="Escape"){sq.value="";setQ("");}});
sqc.onclick=()=>{sq.value="";setQ("");sq.focus();};

function venueKey(e){return (e.venue||"")+" · "+(e.city||"");}
// "Been here": venues you've marked, plus venues of starred shows whose date has passed (remembered when you star them).
const BEEN=new Set(); let starVen={};
try{(JSON.parse(localStorage.getItem("radar-been")||"[]")).forEach(k=>BEEN.add(k));starVen=JSON.parse(localStorage.getItem("radar-starven")||"{}")||{};}catch(e){}
function saveBeen(){try{localStorage.setItem("radar-been",JSON.stringify([...BEEN]));localStorage.setItem("radar-starven",JSON.stringify(starVen));}catch(e){}}
function syncBeen(up){const today=new Date().toISOString().slice(0,10);let ch=false;
  for(const e of up||[]){const k=skey(e);if(state.stars.has(k)&&!starVen[k]){starVen[k]={v:venueKey(e),d:String(e.end||e.start).slice(0,10)};ch=true;}}
  for(const [k,o] of Object.entries(starVen)){if(!state.stars.has(k)&&o.d>=today){delete starVen[k];ch=true;continue;}
    if(o.d<today&&state.stars.has(k)&&!BEEN.has(o.v)){BEEN.add(o.v);ch=true;}}
  if(ch)saveBeen();}
function buildVenues(upcoming){
  const keys=new Set(upcoming.map(venueKey));
  if(state.venue!=="all"&&!keys.has(state.venue)) state.venue="all";
  vChip.hidden=true; // the venue page header (with ← All venues) replaces this chip
  vChip.textContent=state.venue==="all"?"":state.venue.split(" · ")[0]+"  ✕";
  vChip.setAttribute("aria-label","Showing one venue: "+state.venue+". Tap to show all venues");
  return keys.size;
}

const EST=[
 [/honda center|crypto\.com|kia forum|intuit dome|acrisure|viejas|pechanga arena|sofi|rose bowl|petco/i,[60,250]],
 [/hollywood bowl|greek|amphitheat|pacific amp|frontwave|humphreys|cal coast|rady shell/i,[45,200]],
 [/pantages|ahmanson|segerstrom|civic theat|la mirada|dolby|balboa|san diego civic/i,[45,180]],
 [/south coast rep|old globe|playhouse|la jolla playhouse|geffen|kirk douglas|mark taper/i,[35,110]],
 [/improv|ice house|comedy store|laugh factory|comedy co|flappers|hollywood comedy|largo/i,[20,65]],
 [/troubadour|roxy|viper|casbah|alex'?s bar|soma|constellation|echo|lodge room|moroccan|teragram|resident|zebulon|permanent records|catch one|peppermint|whisky|redwood|che cafe|space bar/i,[15,40]],
 [/wiltern|palladium|youtube theater|fonda|belasco|novo|observatory|el rey|avalon|house of blues|glass house|fox|music box|belly up|coach house|wayfarer|garden amp|regent|bellwether|shrine|orpheum|yaamava|pappy|time nightclub|sound nightclub|exchange|spin nightclub/i,[35,95]]];
const KEST={festival:[100,350],club:[20,60],comedy:[30,90],theater:[40,150],concert:[30,90]};
function priceInfo(e){
  if(e.status==="sold out") return {sold:true};
  if(e.priceFrom===0) return {free:true,lo:0,hi:0};
  if(isRec(e)) return e.priceFrom!=null?{lo:e.priceFrom,hi:e.priceTo??e.priceFrom}:{none:true};
  if(e.priceFrom!=null) return {lo:e.priceFrom,hi:e.priceTo??e.priceAvg??null,est:!!e.priceEst};
  const v=String(e.venue||"");
  let r=(e.kind==="comedy"&&/(theat|arena|bowl|hall|civic|observatory|humphreys)/i.test(v))?[45,150]:null;
  if(!r&&e.kind!=="festival") for(const [re,rg] of EST) if(re.test(v)){r=rg;break;}
  r=r||KEST[e.kind]||KEST.concert;
  return {lo:r[0],hi:r[1],est:true};
}
// 10 color bands, cool → hot: teal, sea-green, green, lime, yellow, amber, orange, red-orange, red, magenta
const BAND_H=[178,155,128,95,58,38,22,6,345,315];
const P_STEPS=[20,30,40,50,65,80,100,130,175];   // $ upper edges
const D_STEPS=[15,25,35,45,60,75,90,110,135];   // minutes upper edges
function band(v,steps){let i=steps.findIndex(x=>v<x);if(i<0)i=steps.length;const h=BAND_H[i];const l=(h>40&&h<110)?46:52;return `hsl(${h} 90% ${l}% / var(--tintA))`;}
const SMALL_RE=/casbah|alex'?s bar|viper room|troubadour|moroccan|lodge room|constellation|wayfarer|soma|che cafe|space bar|permanent records|zebulon|resident|catch one|gina woodruff|4th street market|beach hut|mystic water|durty nelly|callahan|pappy|ice house|american comedy|comedy store|whisky|echo\b|echoplex|teragram|redwood|alex|blue note/i;
const TRANSIT=[[/palladium|avalon|fonda|pantages|dolby|academy|sound nightclub|el rey|wiltern|crypto\.com|peacock|novo|belasco|orpheum|mayan|ahmanson|mark taper|walt disney concert|exchange la|regent|teragram|moroccan|lodge room|coliseum|bmo stadium|torch|grand park|pasadena playhouse|terrace theater|blue note|city market/i,"Metro rail"],
 [/honda center|yost|glass house|fox theater pomona|fox performing arts/i,"Metrolink"],
 [/belly up/i,"Coaster train"],
 [/balboa|san diego civic|rady shell|house of blues san diego|music box|petco|casbah/i,"SD Trolley"]];
// Rough last-ride cutoffs from agency notices (2023-25). Rail ends early or runs limited; always confirm in the maps link before relying on it.
const LASTRIDE={"Metro rail":"Metro rail trains stop around midnight","SD Trolley":"Trolleys stop around midnight (earlier on some lines)","Metrolink":"Metrolink has few evening trains, and weekend service is limited","Coaster train":"Coaster weekend trains end early in the evening"};
function lastRideHtml(e,nc){
  if(nc.home!=="transit"||!nc.tr)return "";
  const dest=encodeURIComponent((e.venue||"")+", "+(e.city||""));
  const home=origin&&origin.address?encodeURIComponent(origin.address):"";
  const link=`https://www.google.com/maps/dir/?api=1&origin=${dest}${home?"&destination="+home:""}&travelmode=transit`;
  return `<p class="nlast">${ni("train")} <b>Last ride home:</b> ${esc(LASTRIDE[nc.tr]||"check the schedule")}. <a href="${link}" target="_blank" rel="noopener">Check it in Maps ↗</a> <span>(set "Depart at" after the show)</span></p>`;
}
function transitOf(e){const v=String(e.venue||"");for(const [re,l] of TRANSIT)if(re.test(v))return l;return null;}
function shareText(e){const d=parseDay(e.start);const pi=priceInfo(e);
  const pr=pi.sold?"sold out":pi.free?"free":pi.est?`~$${pi.lo}–$${pi.hi} (est.)`:pi.lo!=null?`from $${Math.round(pi.lo)}`:"";
  return [e.title+(e.artists?` (${e.artists})`:""),d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+(e.time?" · "+e.time:""),`${e.venue}, ${e.city}`,pr,e.url?"Tickets: "+e.url:""].filter(Boolean).join(" · ")+"\n🛖 "+APP_URL+"#"+hid(e);}
function eatLink(e){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("local restaurants and bars near "+(e.venue||"")+", "+(e.city||""));}
const VOL_KNOWN=/coachella|stagecoach/i;
function volHtml(e){if(e.kind!=="festival")return "";const y=(e.start||"").slice(0,4);const name=String(e.title).replace(/·.*$/,"").replace(/\d{4}/,"").trim();
  const q=`https://www.google.com/search?q=${encodeURIComponent(name+" "+y+" volunteer nonprofit free entry")}`;
  return VOL_KNOWN.test(e.title)?`<div class="vol">${ni("hand")} Volunteer roles were posted last year (nonprofit concessions / guest services). Free entry isn't promised in the listings, so ask before you commit. <a href="${q}" target="_blank" rel="noopener">Find ${y} roles ↗</a></div>`
    :`<div class="vol">${ni("hand")} <a href="${q}" target="_blank" rel="noopener">Check for volunteer-for-entry roles ↗</a></div>`;}
function isSmall(e){return e.kind==="openmic"||CONS.has(e.kind)||SMALL_RE.test(e.venue||"");}
function tier(e){const v=String(e.venue||"");
  if(e.kind==="festival")return "Festival";
  if(EST[0][0].test(v))return "Arena / stadium";
  if(EST[1][0].test(v))return "Amphitheater";
  if(EST[2][0].test(v)||EST[3][0].test(v))return "Theater / arts hall";
  if(EST[4][0].test(v))return "Comedy club";
  if(isSmall(e))return "Small / DIY";
  if(e.kind==="club"||EST[6][0].test(v))return "Mid-size (1–3k)";
  return "Other";}
const PARK={"Festival":40,"Arena / stadium":35,"Amphitheater":25,"Theater / arts hall":20,"Mid-size (1–3k)":15,"Comedy club":10,"Small / DIY":5,"Other":15};
// Gas default = AAA Orange County regular average, early Nov 2026 (~$5.83). Food = typical SoCal per-person spend incl. tax & tip.
// UberX Los Angeles rate card (RideWise, July 2026): $1.65 base + $1.35/mi + $0.26/min, plus a ~$3 booking fee. Before surge and tip.
const RIDE={base:1.65,mile:1.35,min:0.26,fee:3};
// Round-trip transit fare per person: LA Metro $1.75 each way; Metrolink day pass $19 weekday ($12 weekends); SD MTS $3 each way (Oct 2026); Coaster rough estimate.
const TRANSIT_RT={"Metro rail":3.5,"Metrolink":19,"Coaster train":14,"SD Trolley":6};
const DRINK={"Arena / stadium":17,"Festival":16,"Amphitheater":16,"Mid-size (1–3k)":14,"Theater / arts hall":14,"Comedy club":12,"Small / DIY":9,"Other":12};
function nightCost(e,pi){
  const n=state.car||1, mpg=state.mpg||25, gal=state.gas||5.85, food=state.food??0;
  const t=tier(e), dPrice=DRINK[t]??12, minTwo=t==="Comedy club";
  const dCount=CONS.has(e.kind)?0:Math.max(state.drinks??0, minTwo?2:0), drinks=dCount*dPrice*n;
  const tixEach = pi.sold||pi.none||pi.lo==null ? null : pi.lo;
  const miles = e._drive ? e._drive.miles*2 : null;
  // Getting home: sober driver (gas + parking), rideshare (round trip, one car per 4 people), or transit (per person).
  let home=state.home||"drive", tr=transitOf(e), fell=false;
  if(home==="transit"&&!tr){home="ride";fell=true;}
  let gas=null, park=null, ride=null, transit=null, cars=Math.ceil(n/4);
  if(home==="drive"){gas = miles!=null ? miles/mpg*gal : null; park = e._drive ? (e.kind==="openmic"?0:(PARK[tier(e)]??15)) : null;}
  else if(home==="ride"&&e._drive){const oneWay=RIDE.base+RIDE.mile*e._drive.miles+RIDE.min*e._drive.mins+RIDE.fee; ride=oneWay*2*cars;}
  else if(home==="transit"){transit=(TRANSIT_RT[tr]??8)*n;}
  const move = home==="drive" ? (gas??0)+(park??0) : home==="ride" ? (ride??0) : (transit??0);
  const eat = food*n;
  const total = (tixEach??0)*n + move + eat + drinks;
  return {n,mpg,gal,food,dCount,dPrice,drinks,minTwo,sober:CONS.has(e.kind),tixEach,tixEst:!!pi.est,miles,gas,park,eat,home,fell,tr,ride,transit,cars,
    total:Math.round(total),each:Math.round(total/n),
    partial: tixEach==null || (home!=="transit" && !e._drive)};
}
function ageOf(e){if(e.ages)return e.ages;const t=[e.title,e.artists,e.note,e.priceNote].join(" ");
  if(/21\s*\+/.test(t))return "21+";if(/18\s*\+/.test(t))return "18+";if(/all[- ]ages/i.test(t))return "all";return null;}
function likelyAllAges(e){const a=ageOf(e);if(a)return a==="all";return e.kind==="theater"||e.kind==="openmic"||CONS.has(e.kind)||(e.kind==="concert"&&/bowl|amphitheat|arena|center|forum|theat|hall|civic|stadium|dome/i.test(e.venue||"")&&!/house of blues|belly up|coach house|casbah|alex|viper|troubadour|whisky|pappy/i.test(e.venue||""));}
function likely21(e){const a=ageOf(e);if(a)return a==="21+";return e.kind==="club";}
function dayRange(when){const t=new Date();t.setHours(0,0,0,0);const d=t.getDay();
  if(when==="tonight")return [ymd(t),ymd(t)];
  if(when==="weekend"){let a=new Date(t),b=new Date(t);if(d===0){}else if(d===6){b.setDate(t.getDate()+1);}else{a.setDate(t.getDate()+(5-d));b.setDate(t.getDate()+(7-d));}return [ymd(a),ymd(b)];}
  return null;}
function fmtShort(s){const d=parseDay(String(s).slice(0,10));return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";}
function parseTime(t){const m=String(t||"").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);if(!m)return null;let h=+m[1]%12;if(/pm/i.test(m[3]))h+=12;return h*60+(+m[2]||0);}
function fmtClock(mins){mins=((mins%1440)+1440)%1440;const h=Math.floor(mins/60),m=mins%60;return ((h%12)||12)+":"+String(m).padStart(2,"0")+(h<12?" AM":" PM");}
// Open mics: the sign-up time matters more than the start (the list fills). "6:00 PM (sign-up 5:00)" or "Sign-up 6:00 PM".
function signupOf(e){const m=String(e.time||"").match(/sign[- ]?up\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);if(!m)return null;
  let h=+m[1]%12;const ap=m[3]||((String(e.time).match(/(AM|PM)/i)||[])[1])||"PM";if(/pm/i.test(ap))h+=12;return h*60+(+m[2]||0);}
function leaveBy(e){const su=signupOf(e),st=su??parseTime(e.time);if(st==null||!e._drive)return null;return fmtClock(Math.floor((st-e._drive.mins-(su!=null?10:15))/5)*5);}
function calLink(e){const st=parseTime(e.time);const d=String(e.start).replace(/-/g,"");let dates;
  if(st!=null){const pad=n=>String(n).padStart(2,"0");const s1=pad(Math.floor(st/60))+pad(st%60)+"00";const en=st+180;const dd=en>=1440?ymd(new Date(parseDay(e.start).getTime()+86400000)).replace(/-/g,""):d;dates=d+"T"+s1+"/"+dd+"T"+pad(Math.floor((en%1440)/60))+pad(en%60)+"00";}
  else{const end=parseDay(e.kind==="festival"&&e.end?e.end:e.start);end.setDate(end.getDate()+1);dates=d+"/"+ymd(end).replace(/-/g,"");}
  const lb=leaveBy(e);const det=[e.artists,lb?"Leave by "+lb+" (no-traffic estimate)":"",e.url?"Tickets: "+e.url:"","From The Show Shack"].filter(Boolean).join("\n");
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(e.title)+"&dates="+dates+"&ctz=America/Los_Angeles&location="+encodeURIComponent((e.venue||"")+", "+(e.city||""))+"&details="+encodeURIComponent(det);}
function recent(s,days){if(!s)return false;const d=parseDay(String(s).slice(0,10));return d&&(Date.now()-d.getTime())<days*86400000;}
function alertOf(e){const out=[];
  if(e.priceWas!=null&&e.priceFrom!=null&&recent(e.priceChangedAt,7)&&Math.round(e.priceWas)!==Math.round(e.priceFrom))out.push(e.priceFrom<e.priceWas?{c:"down",t:"↓ was $"+Math.round(e.priceWas)}:{c:"up",t:"↑ was $"+Math.round(e.priceWas)});
  if(recent(e.onSaleAt,7))out.push({c:"sale",t:"Just went on sale"});
  return out;}
const pMid=pi=>pi.lo==null?null:(pi.hi!=null?(pi.lo+pi.hi)/2:pi.lo*1.3);
let listObs=null;
function render(){
  const list=document.getElementById("list");
  if(!state.loaded) return;
  const dsc=document.getElementById("disco");if(dsc)dsc.hidden=!(state.view==="list"||state.view==="venues");
  const today=todayStr();
  let evs=[...state.events, ...state.picks.map(p=>({...p,added:true}))].map(e=>{
      const x={...e,_drive:driveEstimate(e.lat,e.lon)};
      if(isRec(e)){x.start=nextOccurrence(e.recurrence);x.end=null;}
      // multi-day runs already underway: show today's date (counts forward each day until the run ends)
      else if(e.end&&e.start&&e.start<today&&e.end>=today){x.runStart=e.start;x.start=today;}
      return x;})
    .filter(e=>e.start&&(e.end||e.start)>=today);
  const upcoming=evs.length; state._up=evs; syncBeen(evs);
  starCount=evs.filter(e=>state.stars.has(skey(e))).length; updateStarChip(); updateBudget();
  const venueCount=buildVenues(evs);
  const qw = state.q ? state.q.split(/\s+/) : null;
  evs=evs.filter(e=>!qw||(h=>qw.every(w=>h.includes(w)))(norm([e.title,e.artists,e.venue,e.city].join(" "))))
    .filter(e=>state.venue==="all"||venueKey(e)===state.venue)
    .filter(e=>state.kind==="all"||(state.kind==="starred"?state.stars.has(skey(e)):state.kind==="picks"?e.added:state.kind==="rave"?isRave(e):e.kind===state.kind))
    .filter(e=>state.genre==="all"||(e.genres||[]).includes(state.genre))
    .filter(e=>state.maxDrive>=180||!origin||(e._drive&&e._drive.mins<=state.maxDrive))
    .filter(e=>{const r=dayRange(state.when);if(!r)return true;return e.start<=r[1]&&(e.end||e.start)>=r[0];})
    .filter(e=>{if(!state.flags.cheap)return true;const pi=priceInfo(e);if(pi.sold)return false;if(pi.free)return true;if(pi.none)return isRec(e);return pi.est?(pi.hi!=null&&pi.hi<=40):pi.lo<=25;})
    .filter(e=>!state.flags.allages||likelyAllAges(e))
    .filter(e=>!state.flags.over21||likely21(e))
    .filter(e=>!state.flags.local||isSmall(e))
    .filter(e=>!state.flags.transit||transitOf(e));
  state._shown=evs;
  const price=e=>{const m=pMid(priceInfo(e));return m??Infinity;};
  evs.sort((a,b)=> state.sort==="drive" ? ((a._drive?.mins??1e9)-(b._drive?.mins??1e9)) || a.start.localeCompare(b.start)
     : state.sort==="price" ? (price(a)-price(b)) || a.start.localeCompare(b.start)
     : a.start.localeCompare(b.start) || (a._drive?.mins??1e9)-(b._drive?.mins??1e9));
  document.getElementById("count").textContent = evs.length+" of "+upcoming+" shows · "+venueCount+" venues";
  updateAlertBar();
  if(state.view==="map"){renderMap(evs);return;}
  if(state.view==="ins"){renderInsights();return;}
  if(state.view==="venues"){renderVenues();return;}
  const vHead=state.venue!=="all"?venueHeader(state.venue):"";
  if(!state.events.length){list.innerHTML='<div class="empty"><strong>No shows yet</strong>The daily refresh adds concerts and festivals here with dates, prices and drive times. Check back after the next run.</div>';return;}
  if(!evs.length&&!state.surprise){list.innerHTML = vHead + (state.venue!=="all"&&(state._up||[]).some(e=>venueKey(e)===state.venue)?'<div class="empty"><strong>Filters are hiding this venue\'s shows</strong>Set Show and Genre to All, and When to Any day.</div>':""); if(state.venue!=="all")return; list.innerHTML = state.kind==="starred" ? '<div class="empty"><strong>Nothing starred yet</strong>Tap ☆ on any show to keep an eye on it. Your stars are private to you.</div>' : state.kind==="picks" ? '<div class="empty"><strong>No added shows yet</strong>Tap ＋ Add a show to pin a gig you heard about. It shows up here and at the top of the full list.</div>' : (state.q ? `<div class="empty"><strong>No shows match “${esc(sq.value.trim())}”</strong>Check the spelling, try part of the name, or set the filters above to All.</div>` : '<div class="empty"><strong>Nothing matches these filters</strong>Try a longer max drive or set Genre to All.</div>');return;}
  let surpriseHtml="";
  if(state.surprise){const pick=(state._up||evs).find(e=>skey(e)===state.surprise);
    if(pick){evs=[pick];surpriseHtml=`<div class="surprise">${ni("dice")} <b>Your pick</b><span>${esc(state.surpriseWhy||"")}</span><button type="button" class="chip" id="spAgain">Another</button><button type="button" class="chip" id="spDone">Show all</button></div>`;}
    else state.surprise=null;}
  const pinned=evs.filter(e=>e.added), rest=evs.filter(e=>!e.added);
  let html=vHead+surpriseHtml, lastMonth="", restStarted=false;
  if(pinned.length) html+='<h2 class="month pickh">＋ Added by you &amp; friends</h2>';
  // Cards are built in batches as you scroll (building all ~900 at once is what made the app feel heavy).
  const all=[...pinned,...rest]; let idx=0;
  const more=n=>{let html="";const stop=Math.min(all.length,idx+n);for(;idx<stop;idx++){const e=all[idx];
    const isPin=!!e.added;
    const d=parseDay(e.start), end=parseDay(e.end);
    const monthKey = state.sort==="date" && !isPin ? d.toLocaleDateString("en-US",{month:"long",year:"numeric"}) : "";
    if(!isPin && pinned.length && !restStarted && !monthKey){html+='<h2 class="month">All shows</h2>';}
    if(!isPin) restStarted=true;
    if(monthKey && monthKey!==lastMonth){html+=`<h2 class="month">${esc(monthKey)}</h2>`;lastMonth=monthKey;}
    const dow=d.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase();
    const mon=d.toLocaleDateString("en-US",{month:"short"}).toUpperCase();
    const mic = isRec(e);
    const thru = mic ? `<span class="every">${esc(e.recurrence?.freq==="monthly"?"Monthly":"Weekly")}</span>`
      : end && e.end!==e.start ? (e.runStart?`<span class="nowon">On now</span>`:"")+`<span class="thru">thru ${esc(end.toLocaleDateString("en-US",{month:"short",day:"numeric"}))}</span>`:"";
    const pi=priceInfo(e); let priceHtml;
    const $r=n=>"$"+Math.round(n);
    if(pi.sold) priceHtml='<span class="sold">Sold out</span>';
    else if(pi.free) priceHtml='<span class="price">Free</span>';
    else if(pi.none) priceHtml='<span class="na">—</span>';
    else if(pi.est) priceHtml=`<span class="price est">≈${$r(pi.lo)}–${$r(pi.hi)}</span><span class="pn">typical · not yet listed</span>`;
    else if(pi.hi!=null&&Math.round(pi.hi)>Math.round(pi.lo)) priceHtml=`<span class="price">${$r(pi.lo)}–${$r(pi.hi)}</span><span class="pn">cheapest seats listed</span>`;
    else priceHtml=`<span class="price">From ${$r(pi.lo)}</span><span class="pn">cheapest seat</span>`;
    if(!pi.est&&!pi.sold&&!pi.free&&!pi.none&&e.priceAsOf) priceHtml=priceHtml.replace(/<\/span>$/,` · checked ${fmtShort(e.priceAsOf)}</span>`);
    const nc=nightCost(e,pi), lb=leaveBy(e);
    const nightHtml = `<div class="flipbar"><button type="button" class="nightbtn" data-flip="1">🌙 Night out <b>≈ $${nc.n>1?nc.each+" each":nc.total}${nc.partial?"+":""}</b></button></div>`;
    const leaveHtml = lb ? `<span class="leave">Leave by ${lb}</span>` : "";
    const al = alertOf(e).map(a=>`<span class="badge ${a.c}">${a.c==="sale"?ni("ticket")+" ":""}${a.t}</span>`).join("");
    const ag = ageOf(e); const extraTags = (isSmall(e)?`<span class="tag local">${ni("home")} Small &amp; local</span>`:"")+(ag?`<span class="tag age">${ag==="all"?"All ages":ag}</span>`:"")+(transitOf(e)?`<span class="tag transit">${ni("sprout")} ${transitOf(e)}</span>`:"");
    const drv = e._drive ? `<span class="drive">~${fmtMins(e._drive.mins)} · ${e._drive.miles} mi</span>` : (origin ? '<span class="na">n/a</span>' : '<span class="na">Set start point</span>');
    const su=mic?signupOf(e):null, micTime=String(e.time||"").replace(/\s*\(?sign[- ]?up[^)]*\)?/i,"").trim();
    const time = mic ? `<span>${esc(e.recurrence?.text||"")}${micTime?" · "+esc(micTime):""}</span>${su!=null?`<span class="signup">${ni("mic")} Sign-up ${fmtClock(su)}</span>`:`<span class="signup none">${ni("mic")} Sign-up: arrive early</span>`}` : e.time ? `<span>${esc(e.time)}</span>` : '<span class="na">Time TBA</span>';
    const tix=safeUrl(e.url)||(mic?null:safeUrl("https://www.google.com/search?q="+encodeURIComponent([e.title,e.venue,e.city,"tickets"].filter(Boolean).join(" "))));
    const tixLabel = tix ? "Tickets" : "";
    const dest = encodeURIComponent((e.venue||"")+", "+(e.city||""));
    const maps=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}&travelmode=driving`;
    const tags=(e.genres||[]).map(g=>`<span class="tag">${esc((GENRES.find(x=>x[0]===g)||[g,g])[1])}</span>`).join("");
    const listenQ = (e.kind!=="openmic"&&e.kind!=="contact") ? String(e.title||"").replace(/\s*\(.*?\)\s*/g," ").split(/:| & Friends/)[0].trim() : "";
    const lq = encodeURIComponent(listenQ);
    const listen = listenQ ? `<button type="button" class="listenbtn" data-listen="1" aria-expanded="false">▶ Listen</button>` : "";
    const listenMenu = listenQ ? `<div class="lm listenmenu" hidden>`+
      `<a href="https://music.youtube.com/search?q=${lq}" target="_blank" rel="noopener">YouTube Music</a>`+
      `<a href="https://open.spotify.com/search/${lq}" target="_blank" rel="noopener">Spotify</a>`+
      `<a href="https://music.apple.com/us/search?term=${lq}" target="_blank" rel="noopener">Apple Music</a>`+
      `<a href="https://soundcloud.com/search/people?q=${lq}" target="_blank" rel="noopener">SoundCloud</a>`+
      `</div>` : "";

    const pv=pMid(pi);
    const lc=(pv!=null&&!pi.sold)?band(pv,P_STEPS):"transparent";
    const rc=e._drive?band(e._drive.mins,D_STEPS):"transparent";
    const canRm = isPin && (amOwner || (myUid && e.createdBy===myUid));
    const fl=state.flipped.has(hid(e));
    html+=`<article id="${hid(e)}" class="card${fl?" flipped":""}"><div class="flip"><div class="ev face front${isPin?" pick":""}" style="--lc:${lc};--rc:${rc}"${fl?' aria-hidden="true"':""}>
      <div class="stub"><span class="dow">${dow}</span><span class="day">${d.getDate()}</span><span class="mon">${mon}</span>${thru}${tix?`<a class="tix stubtix" href="${esc(tix)}" target="_blank" rel="noopener">${tixLabel}</a>`:""}</div>
      <div class="body">
        ${isPin?`<span class="who">＋ Luke's pick</span>`:""}
        <div class="top"><h3>${esc(e.title)}</h3><div class="tr"><div class="trr"><span class="kind ${CONS.has(e.kind)?"dance":e.kind==="festival"?"fest":mic?"mic":e.kind==="club"?"club":e.kind==="comedy"?"comedy":e.kind==="theater"?"theater":""}">${CONS.has(e.kind)?({dance:"Dance",contact:"Contact",sound:"Sound",drum:"Drums"})[e.kind]:e.kind==="festival"?"Fest":mic?"Open mic":e.kind==="club"?"Club":e.kind==="comedy"?"Comedy":e.kind==="theater"?"Theater":"Show"}</span><button type="button" class="starbtn" data-star="${esc(skey(e))}" aria-pressed="${state.stars.has(skey(e))}" aria-label="Star ${esc(e.title)}">${state.stars.has(skey(e))?"★":"☆"}</button></div>${e.start?`<a class="addcal" href="${esc(calLink(e))}" target="_blank" rel="noopener">＋ Add to calendar</a>`:""}</div></div>
        ${e.artists?`<div class="where">${esc(e.artists)}</div>`:""}
        <div class="where"><button type="button" class="vlink" data-venue="${esc(venueKey(e))}">${esc(e.venue)}</button> · ${esc(e.city)}</div>
        ${al?`<div class="row">${al}</div>`:""}
        <div class="facts">${time}${leaveHtml}${wxSpan(e)}</div>
        ${e.priceNote?`<div class="note">${esc(e.priceNote)}</div>`:""}
        ${e.note?`<div class="note">${esc(e.note)}</div>`:""}
        ${(tags||extraTags)?`<div class="tags">${extraTags}${tags}</div>`:""}
        ${volHtml(e)}
      </div>
      <div class="links wide"><a href="${maps}" target="_blank" rel="noopener">Directions</a><a href="${maps.replace("travelmode=driving","travelmode=transit")}" target="_blank" rel="noopener">${ni("train")} Transit</a><a href="${esc(eatLink(e))}" target="_blank" rel="noopener">Eat nearby</a><button type="button" class="share" data-share="${esc(skey(e))}">Share</button>${listen}${canRm?`<button type="button" class="rm" data-rm="${esc(e.id)}">Remove</button>`:""}</div>${listenMenu}
      <div class="sides"><div class="side l"><span class="sl">Price</span>${priceHtml}</div><div class="side r"><span class="sl">Drive</span>${drv}</div></div>${nightHtml}</div>
      ${backHtml(e,nc,fl)}</div></article>`;
  }
  return html;};
  if(listObs)listObs.disconnect();
  list.innerHTML=html+more(24)+(idx<all.length?'<div id="moreCards" class="morecards" aria-hidden="true"></div>':"");
  state._more=()=>{if(idx>=all.length)return false;const s=document.getElementById("moreCards");if(!s)return false;
    s.insertAdjacentHTML("beforebegin",more(40));fillWx();if(idx>=all.length){s.remove();if(listObs)listObs.disconnect();}return true;};
  const sent=document.getElementById("moreCards");
  if(sent&&"IntersectionObserver" in window){const fill=()=>{const el=document.getElementById("moreCards");if(el&&el.getBoundingClientRect().top<innerHeight+1600&&state._more())requestAnimationFrame(fill);};
    listObs=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting))fill();},{rootMargin:"1600px 0px"});listObs.observe(sent);}
  else if(sent){while(state._more());}
  fillWx();
  jumpToHash();
  const sa=document.getElementById("spAgain"),sd=document.getElementById("spDone");
  if(sa)sa.onclick=surpriseMe; if(sd)sd.onclick=()=>{state.surprise=null;render();};
}
function updateBudget(){
  const bar=document.getElementById("budgetBar"); if(!bar)return;
  const B=state.budget||0; if(!B){bar.hidden=true;return;}
  const now=new Date(), ym=ymd(now).slice(0,7), today=todayStr();
  let spent=0,count=0,partial=false;
  [...state.events,...state.picks.map(p=>({...p,added:true}))].forEach(e0=>{
    if(!state.stars.has(skey(e0)))return;
    const e={...e0,_drive:driveEstimate(e0.lat,e0.lon)};
    if(isRec(e0)){e.start=nextOccurrence(e0.recurrence);e.end=null;}
    else if(e.end&&e.start&&e.start<today&&e.end>=today)e.start=today;
    if(!e.start||e.start.slice(0,7)!==ym||(e.end||e.start)<today)return;
    const nc=nightCost(e,priceInfo(e)); spent+=nc.each; count++; if(nc.partial)partial=true;});
  const pct=Math.min(100,Math.round(spent/B*100)), over=spent>B;
  const mon=now.toLocaleDateString("en-US",{month:"long"});
  bar.hidden=false; bar.classList.toggle("over",over);
  bar.innerHTML=`<span class="bt"><b>${mon}: $${Math.round(spent)}${partial?"+":""} of $${B}</b><small>${count} starred show${count===1?"":"s"} left this month · your share${over?" · over budget":""}</small></span><span class="bm"><i style="width:${pct}%"></i></span>`;
}
/* ---- venues: directory (pinned favorites on top) + venue page header ---- */
function isPinned(k){return (state.pinV||[]).includes(k);}
function togglePin(k){const a=state.pinV=state.pinV||[];const i=a.indexOf(k);if(i>=0)a.splice(i,1);else a.push(k);savePrefs();}
const AGE_STEPS=[3,8,15,25,40,60,80,95,110];   // years since opening
const SAFE_H={5:128,4:95,3:58,2:22,1:6}, SAFE_L={5:"Easy",4:"Pretty easy",3:"Okay",2:"Plan ahead",1:"Plan carefully"};
function safetyOf(n){const o=VOPEN[n];if(!o||!o.s||!o.w)return null;const h=SAFE_H[o.s];return {s:o.s,w:o.w,label:SAFE_L[o.s],col:`hsl(${h} 100% 62%)`,tint:`hsl(${h} 90% ${(h>40&&h<110)?46:52}% / var(--tintA))`};}
const vYear=n=>(VOPEN[n]||{}).y||null;
function venueInfo(k){
  const evs=(state._up||[]).filter(e=>venueKey(e)===k).sort((a,b)=>a.start.localeCompare(b.start));
  const e=evs[0]||{}, name=k.split(" · ")[0], city=k.split(" · ")[1]||"";
  return {k,name,city,evs,next:evs[0],drive:e._drive||driveEstimate(e.lat,e.lon),tier:e.venue?tier(e):"Other",transit:e.venue?transitOf(e):null,lat:e.lat,lon:e.lon,cap:(SCOUT[e.venue]||{}).cap,year:vYear(name)};
}
function venueHeader(k){
  const v=venueInfo(k), pin=isPinned(k), park=PARK[v.tier]??15;
  const dest=encodeURIComponent(v.name+", "+v.city);
  const maps=`https://www.google.com/maps/dir/?api=1${origin&&origin.address?"&origin="+encodeURIComponent(origin.address):""}&destination=${dest}&travelmode=driving`;
  const g=q=>"https://www.google.com/search?q="+encodeURIComponent(v.name+" "+v.city+" "+q);
  const row=(k2,val)=>`<div class="vrow"><span class="k">${k2}</span><span>${val}</span></div>`;
  return `<section class="vhead">
    <div class="vtop"><button type="button" class="chip" data-allven="1">← All venues</button>
      <button type="button" class="vpin${pin?" on":""}" data-pinv="${esc(k)}" aria-pressed="${pin}">${ni("pin")}${pin?" Pinned":" Pin"}</button></div>
    <h2>${esc(v.name)}</h2><p class="vcity">${esc(v.city)} · ${v.evs.length} upcoming show${v.evs.length===1?"":"s"}</p>
    ${row("Drive",v.drive?`~${fmtMins(v.drive.mins)} · ${v.drive.miles} mi`:"set a start point")}
    ${v.year?row("Opened",v.year+" · "+(new Date().getFullYear()-v.year||"<1")+" yr"+((new Date().getFullYear()-v.year)===1?"":"s")+" old"):""}
    ${row("Size",esc(v.tier)+(v.cap?` · ~${v.cap} people`:""))}
    ${row("Parking",v.tier==="Small / DIY"?"usually street or small lots · ~$"+park:"typically ~$"+park+" · lots fill up before big shows")}
    ${row("Transit",v.transit?ni("sprout")+" "+esc(v.transit)+" nearby":"best by car or rideshare")}
    <div class="vlinks"><a href="${maps}" target="_blank" rel="noopener">Directions</a><a href="${maps.replace("travelmode=driving","travelmode=transit")}" target="_blank" rel="noopener">${ni("train")} Transit</a><a href="${g("parking")}" target="_blank" rel="noopener">Parking ↗</a><a href="${g("bag policy")}" target="_blank" rel="noopener">Bag policy ↗</a></div>
    <p class="vnote">Parking prices are typical for this size of venue. Check the venue for tonight's actual rules.</p>
  </section>`;
}
function renderVenues(){
  const list=document.getElementById("list");
  const keys=[...new Set((state._up||[]).map(venueKey))];
  const infos=keys.map(venueInfo);
  const sortV=(a,b)=>origin?((a.drive?.mins??1e9)-(b.drive?.mins??1e9))||a.name.localeCompare(b.name):a.name.localeCompare(b.name);
  const card=v=>{const n=v.next,nd=n?parseDay(n.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):"";
    const prices=v.evs.map(e=>priceInfo(e)).filter(p=>p&&!p.sold&&!p.none&&p.lo!=null).map(p=>p.lo);
    const lo=prices.length?Math.min(...prices):null;
    const ages=v.evs.map(ageOf).filter(Boolean), allAges=ages.length&&ages.every(a=>a==="all"), over21=ages.length&&ages.every(a=>a==="21+");
    const small=v.evs.length&&v.evs.some(isSmall), outdoor=v.evs.some(isOutdoor);
    const been=BEEN.has(v.k);
    const tags=[been?`<span class="tag been">✓ Been here</span>`:"",small?`<span class="tag local">${ni("home")} Small &amp; local</span>`:"",
      allAges?`<span class="tag age">All ages</span>`:over21?`<span class="tag age">21+</span>`:"",
      v.transit?`<span class="tag transit">${ni("sprout")} ${esc(v.transit)}</span>`:"",
      outdoor?`<span class="tag">Outdoor</span>`:"",
      v.cap?`<span class="tag">~${Number(v.cap).toLocaleString()} cap</span>`:"",
      lo!=null?`<span class="tag">${lo===0?"Free shows":"Shows from $"+Math.round(lo)}</span>`:""].filter(Boolean).join("");
    const vo=VOPEN[v.name]||{}, tips=vo.w||[], eats=vo.e||[], acc=vo.a||null;
    const eatQ=u=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(u+" near "+v.name+", "+v.city);
    const dest=encodeURIComponent(v.name+", "+v.city), org=origin&&origin.address?"&origin="+encodeURIComponent(origin.address):"";
    const maps=`https://www.google.com/maps/dir/?api=1${org}&destination=${dest}&travelmode=driving`;
    const fmt=e=>parseDay(e.start).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
    const more=`<div class="vmore" hidden>
        ${tips.length?`<div class="vsec"><span class="sl">${ni("car")} Getting there</span><ul>${tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}
        ${eats.length?`<div class="vsec"><span class="sl">${ni("food")} Local eats</span><ul>${eats.map(x=>`<li><a href="${eatQ(x.n)}" target="_blank" rel="noopener"><b>${esc(x.n)}</b></a> · ${esc(x.d)}</li>`).join("")}</ul></div>`:""}
        ${acc?`<div class="vsec"><span class="sl">${ni("hand")} Accessibility</span><p class="vacc">${esc(acc.t)}${acc.u?` <a href="${esc(acc.u)}" target="_blank" rel="noopener">Venue's access page ↗</a>`:""}</p></div>`:""}
        <div class="vsec"><span class="sl">${ni("ticket")} Coming up</span><ul>${v.evs.slice(0,3).map(e=>`<li><b>${esc(fmt(e))}</b> ${esc(e.title)}</li>`).join("")}${v.evs.length>3?`<li class="mut">+${v.evs.length-3} more</li>`:""}</ul></div>
        <div class="vlinks"><a href="${maps}" target="_blank" rel="noopener">${ni("car")} Directions</a><a href="${maps.replace("travelmode=driving","travelmode=transit")}" target="_blank" rel="noopener">${ni("train")} Transit</a><button type="button" class="vbeen${been?" on":""}" data-been="${esc(v.k)}" aria-pressed="${been}">${been?"✓ Been here":"I've been here"}</button><button type="button" class="vall" data-venue="${esc(v.k)}">All ${v.evs.length} show${v.evs.length===1?"":"s"} →</button></div>
      </div>`;
    return `<div class="vcard"><div class="vf"><button type="button" class="vopen" data-vmore="1" aria-expanded="false"><b>${esc(v.name)}</b>
      <span>${esc(v.city)}${v.drive?` · ~${fmtMins(v.drive.mins)}`:""}${v.year?` · since ${v.year}`:""}</span>
      <small>${v.evs.length} show${v.evs.length===1?"":"s"}${n?` · next ${esc(nd)}: ${esc(n.title)}`:""}</small>
      ${tags?`<span class="vtags">${tags}</span>`:""}</button>
      <button type="button" class="vpin${isPinned(v.k)?" on":""}" data-pinv="${esc(v.k)}" aria-pressed="${isPinned(v.k)}" aria-label="${isPinned(v.k)?"Unpin":"Pin"} ${esc(v.name)}">${ni("pin")}</button></div>${more}</div>`;};
  const pinned=infos.filter(v=>isPinned(v.k)).sort((a,b)=>(state.pinV.indexOf(a.k))-(state.pinV.indexOf(b.k)));
  let html=`<div class="venues">`;
  html+=`<h2 class="month pickh">${ni("pin")} Your venues</h2>`+(pinned.length?pinned.map(card).join(""):`<div class="empty"><strong>Pin your favorite spots</strong>Tap the pin on any venue and it stays at the top here.</div>`);
  const regionOf=k=>{const e=(state._up||[]).find(x=>venueKey(x)===k);return e?region(e):"Other";};
  for(const r of REGIONS){const vs=infos.filter(v=>!isPinned(v.k)&&regionOf(v.k)===r).sort(sortV);if(!vs.length)continue;
    html+=`<h2 class="month">${esc(r)}</h2>`+vs.map(card).join("");}
  list.innerHTML=html+`</div>`;
}
document.getElementById("list").addEventListener("click",ev=>{
  const vm=ev.target.closest("[data-vmore]");
  if(vm){const c=vm.closest(".vcard"),m=c.querySelector(".vmore"),open=m.hidden;m.hidden=!open;vm.setAttribute("aria-expanded",String(open));c.classList.toggle("open",open);return;}
  const vf=ev.target.closest("[data-vflip]");
  if(vf){const c=vf.closest(".vcard");c.classList.remove("turn");c.classList.toggle("flipped");void c.offsetWidth;c.classList.add("turn");return;}
  const bn=ev.target.closest("[data-been]");
  if(bn){const k=bn.dataset.been;BEEN.has(k)?BEEN.delete(k):BEEN.add(k);saveBeen();const c=bn.closest(".vcard");render();
    const again=[...document.querySelectorAll(".vcard")].find(x=>x.querySelector(`[data-been="${CSS.escape(k)}"]`));
    if(again){again.querySelector(".vmore").hidden=false;again.classList.add("open");again.querySelector("[data-vmore]").setAttribute("aria-expanded","true");}return;}
  const pin=ev.target.closest("[data-pinv]");
  if(pin){togglePin(pin.dataset.pinv);render();return;}
  const all=ev.target.closest("[data-allven]");
  if(all){state.venue="all";savePrefs();setView("venues");window.scrollTo({top:document.getElementById("viewBar").offsetTop-8,behavior:"smooth"});return;}
  const v=ev.target.closest("[data-venue]");
  if(v){state.venue=v.dataset.venue;state.surprise=null;savePrefs();setView("list");window.scrollTo({top:document.getElementById("viewBar").offsetTop-8,behavior:"smooth"});}
});
/* ---- weather for outdoor shows in the next 10 days (Open-Meteo, free, no key) ---- */
const OUTDOOR=/hollywood bowl|greek theat|amphithea|rady shell|humphreys|hollywood forever|ford theat|glen helen|frontwave|cal coast|dodger stadium|petco park|snapdragon|rose bowl|bmo stadium|grand park|marina green|city beach|aliso beach|state beach|\bpier\b|outdoor|lawn/i;
function isOutdoor(e){return OUTDOOR.test(e.venue||"")||e.kind==="festival"||e.kind==="drum";}
function wxSpan(e){
  if(!isOutdoor(e)||typeof e.lat!=="number"||!e.start)return "";
  const days=(parseDay(e.start)-parseDay(todayStr()))/864e5; if(days<0||days>10)return "";
  return `<span class="wx" data-wx="${e.lat.toFixed(2)},${e.lon.toFixed(2)}" data-day="${e.start}"></span>`;}
const wxCache={}, wxIcon=c=>ni(c===0?"sun":c<=2?"partly":c===3?"cloud":c<=48?"fog":c<=67?"rain":c<=77?"snow":c<=82?"rain":"storm");
function wxGet(key){
  if(wxCache[key])return wxCache[key];
  try{const c=JSON.parse(sessionStorage.getItem("wx:"+key)||"null");if(c&&Date.now()-c.t<3*36e5)return wxCache[key]=Promise.resolve(c.d);}catch(e){}
  const [la,lo]=key.split(",");
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles&forecast_days=12`;
  return wxCache[key]=fetch(u).then(r=>r.ok?r.json():null).then(j=>{const d=j&&j.daily;if(d){try{sessionStorage.setItem("wx:"+key,JSON.stringify({t:Date.now(),d}));}catch(e){}}return d;}).catch(()=>null);}
function fillWx(){
  document.querySelectorAll(".wx:not([data-done])").forEach(sp=>{sp.dataset.done="1";
    wxGet(sp.dataset.wx).then(d=>{if(!d||!sp.isConnected)return;const i=d.time.indexOf(sp.dataset.day);if(i<0)return;
      const hi=Math.round(d.temperature_2m_max[i]),lo=Math.round(d.temperature_2m_min[i]),rain=d.precipitation_probability_max[i];
      sp.innerHTML=`${wxIcon(d.weather_code[i])} ${hi}°/${lo}°${rain>=20?` · ${rain}% rain`:""}${lo<60?" · bring a layer":""}`;
      sp.title="Forecast for the venue on show day";});});}
function backHtml(e,nc,fl){
  const $=v=>"$"+Math.round(v), who=nc.n>1?`${nc.n} people`:"just you";
  const line=(ic,k,how,v)=>`<div class="nl"><span class="nk">${ic} ${k}</span><span class="nh">${how}</span><span class="nv">${v}</span></div>`;
  const tix = nc.tixEach==null ? line(ni("ticket"),"Tickets","price not listed yet","?")
    : line(ni("ticket"),"Tickets",`${nc.tixEach===0?"free":(nc.tixEst?"≈":"")+$(nc.tixEach)}${nc.n>1?" × "+nc.n:""}${nc.tixEst?" · typical, not listed":""}`,$(nc.tixEach*nc.n));
  let gas="", park="";
  if(nc.home==="drive"){
    gas = nc.gas==null ? line(ni("fuel"),"Gas","set a start point","?")
      : line(ni("fuel"),"Gas",`${nc.miles} mi round trip ÷ ${nc.mpg} mpg × $${nc.gal.toFixed(2)} · sober driver`,$(nc.gas));
    park = nc.park==null ? line(ni("parking"),"Parking","set a start point","?")
      : line(ni("parking"),"Parking",nc.park===0?"usually free":`typical for ${tier(e).toLowerCase()}`,$(nc.park));
  }else if(nc.home==="ride"){
    gas = nc.ride==null ? line(ni("taxi"),"Rideshare","set a start point","?")
      : line(ni("taxi"),"Rideshare",`round trip${nc.cars>1?` · ${nc.cars} cars`:""} · before surge & tip${nc.fell?" · no easy transit here":""}`,$(nc.ride));
  }else{
    gas = line(ni("train"),"Transit",`${esc(nc.tr)} round trip${nc.n>1?" × "+nc.n:""} · see last ride below`,$(nc.transit));
  }
  const food = line(ni("food"),"Food",nc.food?`${$(nc.food)} × ${nc.n} · typical SoCal spend`:"skipped",$(nc.eat));
  const drk = nc.sober ? line(ni("drink"),"Drinks","usually a sober space","$0")
    : line(ni("drink"),"Drinks",nc.dCount?`${nc.dCount} × ~${$(nc.dPrice)}${nc.n>1?" × "+nc.n:""}${nc.minTwo&&(state.drinks??0)<2?" · 2-item minimum":""}`:"none",$(nc.drinks));
  return `<div class="ev face back"${fl?"":' aria-hidden="true"'}>
    <div class="bh"><span class="sl">${ni("moon")} Night cost · ${who}</span></div>
    <div class="nlist">${tix}${gas}${park}${food}${drk}</div>
    <div class="ntot"><span>Total${nc.partial?" so far":""}</span><b>${$(nc.total)}${nc.partial?"+":""}</b>${nc.n>1?`<span class="each">${$(nc.each)}${nc.partial?"+":""} each</span>`:""}</div>
    ${lastRideHtml(e,nc)}
    <p class="nfoot">Estimates · ${nc.home==="drive"?"gas & parking split across the car":nc.home==="ride"?"rides split across the group":"fares are per person"} · <a href="${esc(eatLink(e))}" target="_blank" rel="noopener">food near the venue ↗</a></p>
    <div class="flipbar">${nc.n>1?`<button type="button" class="splitbtn" data-split="${esc(splitText(e,nc))}">${ni("car")} Send the split</button>`:""}<button type="button" class="daybtn" data-flip="1">${ni("sun")} Back to day</button></div>
  </div>`;
}
function splitText(e,nc){
  const $=v=>"$"+Math.round(v), lb=leaveBy(e), d=parseDay(String(e.start).slice(0,10));
  const day=d?d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):"";
  const parts=[];
  if(nc.tixEach!=null&&nc.tixEach>0)parts.push("tickets "+$(nc.tixEach));
  const mv=nc.home==="drive"?(nc.gas??0)+(nc.park??0):nc.home==="ride"?(nc.ride??0):(nc.transit??0);
  if(mv)parts.push((nc.home==="drive"?"gas & parking ":nc.home==="ride"?"rides ":"transit ")+$(mv/nc.n));
  return [`${e.title} @ ${e.venue||""}${e.city?", "+e.city:""}`,[day,e.time].filter(Boolean).join(" · "),
    lb?`Leaving by ${lb} (no-traffic estimate)`:"",
    `Split for ${nc.n}: about ${$(nc.tixEach!=null?nc.each:nc.each)} each${parts.length?" ("+parts.join(" + ")+" — food & drinks extra)":""}`,
    e.url?e.url:""].filter(Boolean).join("\n");
}
function surpriseMe(){
  state.surprise=null; state.venue="all"; state.view="list"; [vL,vM,vI,vV].forEach(b=>b.setAttribute("aria-pressed",String(b===vL)));
  render(); // refreshes state._up
  const pool=(state._up||[]).filter(e=>!priceInfo(e).sold);
  if(!pool.length)return;
  const prev=state._lastSurprise;let pick=pool[Math.floor(Math.random()*pool.length)];
  if(pool.length>1&&pick&&skey(pick)===prev)pick=pool.find(e=>skey(e)!==prev);
  state._lastSurprise=skey(pick);state.surprise=skey(pick);
  state.surpriseWhy=`Random pick from all ${pool.length} upcoming shows, filters ignored.`;
  render();
  const c=document.querySelector("#list .card");
  if(c){c.classList.add("emerge");c.scrollIntoView({block:"center",behavior:"smooth"});}
}

/* ---- flip a card to its night-cost back: double-tap (or tap the 🌙 pill / ↩) ---- */
function flipCard(card){if(!card)return;const on=!card.classList.contains("flipped");
  card.classList.toggle("flipped",on);on?state.flipped.add(card.id):state.flipped.delete(card.id);
  const f=card.querySelector(".front"),b=card.querySelector(".back");
  if(f)f.setAttribute("aria-hidden",String(on)); if(b)b.setAttribute("aria-hidden",String(!on));
  try{window.getSelection().removeAllRanges();}catch(e){}}
const listEl=document.getElementById("list");
listEl.addEventListener("click",ev=>{const b=ev.target.closest("[data-listen]");if(!b)return;
  const m=b.closest(".face").querySelector(".listenmenu");if(!m)return;m.hidden=!m.hidden;b.setAttribute("aria-expanded",String(!m.hidden));b.classList.toggle("on",!m.hidden);});
listEl.addEventListener("click",ev=>{const sp=ev.target.closest("[data-split]");if(sp){const t=sp.dataset.split;
  if(navigator.share){navigator.share({text:t}).catch(()=>{});}
  else if(navigator.clipboard){navigator.clipboard.writeText(t).then(()=>{const o=sp.innerHTML;sp.textContent="Copied ✓";setTimeout(()=>sp.innerHTML=o,1500);});}
  return;}
  const b=ev.target.closest("[data-flip]");if(!b)return;flipCard(b.closest(".card"));});

/* ---- views: list / map / insights ---- */
const vL=document.getElementById("vList"),vM=document.getElementById("vMap"),vI=document.getElementById("vIns"),vV=document.getElementById("vVen");
function setView(v){state.view=v;[vL,vM,vI,vV].forEach(b=>b.setAttribute("aria-pressed",String(b.id===({list:"vList",map:"vMap",ins:"vIns",venues:"vVen"})[v])));render();}
vV.onclick=()=>{state.surprise=null;state.venue="all";savePrefs();setView("venues");};
vL.onclick=()=>{state.surprise=null;if(state.venue!=="all"){state.venue="all";savePrefs();}setView("list");};vM.onclick=()=>setView("map");vI.onclick=()=>setView("ins");
const carSel=document.getElementById("carSel");carSel.value=String(state.car||1);carSel.onchange=()=>{state.car=+carSel.value;savePrefs();render();};
const mpgIn=document.getElementById("mpgIn"),gasIn=document.getElementById("gasIn"),foodSel=document.getElementById("foodSel");
mpgIn.value=state.mpg||25;gasIn.value=(state.gas||5.85).toFixed(2);foodSel.value=String(state.food??0);
function costCommit(){const m=+mpgIn.value,g=+gasIn.value;
  if(m>=5&&m<=150)state.mpg=m; if(g>=1&&g<=15)state.gas=g; state.food=+foodSel.value; savePrefs();}
let costT;function costChange(){costCommit();clearTimeout(costT);costT=setTimeout(render,150);}
// Typing stays instant: the 900+ cards only recalc when you finish (tap Done / leave the box / pause typing).
let costTyping;[mpgIn,gasIn].forEach(i=>{
  i.addEventListener("input",()=>{costCommit();clearTimeout(costTyping);costTyping=setTimeout(costChange,1200);});
  i.addEventListener("change",()=>{clearTimeout(costTyping);costChange();});
  i.addEventListener("keydown",e=>{if(e.key==="Enter")i.blur();});});
foodSel.onchange=costChange;
const homeSel=document.getElementById("homeSel"),budgetIn=document.getElementById("budgetIn");
homeSel.value=state.home||"drive";homeSel.onchange=()=>{state.home=homeSel.value;savePrefs();render();};
budgetIn.value=state.budget||"";
budgetIn.addEventListener("change",()=>{state.budget=Math.max(0,Math.round(+budgetIn.value||0));budgetIn.value=state.budget||"";savePrefs();updateBudget();});
budgetIn.addEventListener("keydown",e=>{if(e.key==="Enter")budgetIn.blur();});
document.getElementById("budgetBar").onclick=()=>{state.kind="starred";state.when="any";document.querySelectorAll("#kindRow .chip").forEach(c=>c.setAttribute("aria-pressed",String(c.id==="kindRow-starred")));document.querySelectorAll("#whenRow .chip").forEach(c=>c.setAttribute("aria-pressed",String(c.id==="whenRow-any")));savePrefs();setView("list");document.getElementById("viewBar").scrollIntoView({behavior:"smooth"});};
const drinkSel=document.getElementById("drinkSel");drinkSel.value=String(state.drinks??0);drinkSel.onchange=()=>{state.drinks=+drinkSel.value;savePrefs();render();};
[mpgIn,gasIn].forEach(i=>i.addEventListener("blur",()=>{costCommit();mpgIn.value=state.mpg;gasIn.value=state.gas.toFixed(2);}));
/* alerts on starred shows */
function updateAlertBar(){const bar=document.getElementById("alertBar");
  const hits=[...state.events,...state.picks.map(p=>({...p,added:true}))].filter(e=>state.stars.has(skey(e))&&alertOf(e).length&&(e.end||e.start)>=todayStr());
  if(!hits.length){bar.hidden=true;return;}
  bar.hidden=false;bar.innerHTML=`${ni("bell")} <span><b>${hits.length} update${hits.length>1?"s":""}</b> on your starred shows: ${hits.slice(0,3).map(e=>esc(e.title)+" ("+alertOf(e).map(a=>a.t).join(", ")+")").join(" · ")}${hits.length>3?" …":""}</span>`;
  bar.onclick=()=>{state.kind="starred";document.querySelectorAll("#kindRow .chip").forEach(c=>c.setAttribute("aria-pressed",String(c.id==="kindRow-starred")));savePrefs();setView("list");};}
/* map */
const COAST=[[35.1,-119.6],[34.39,-119.52],[34.27,-119.29],[34.15,-119.21],[34.08,-119.06],[34.03,-118.78],[34.01,-118.5],[33.98,-118.47],[33.84,-118.39],[33.74,-118.41],[33.71,-118.29],[33.76,-118.19],[33.74,-118.1],[33.65,-118.0],[33.6,-117.88],[33.54,-117.78],[33.46,-117.7],[33.42,-117.61],[33.37,-117.56],[33.19,-117.38],[33.16,-117.35],[33.04,-117.29],[32.96,-117.27],[32.85,-117.27],[32.79,-117.26],[32.75,-117.25],[32.67,-117.24],[32.71,-117.17],[32.68,-117.18],[32.58,-117.13],[32.53,-117.12],[32.2,-117.05],[32.2,-114.9],[35.1,-114.9]];
const MAPCITIES=[["Ventura",34.27,-119.23],["Los Angeles",34.05,-118.24],["Long Beach",33.77,-118.19],["Pasadena",34.15,-118.14],["Santa Ana",33.75,-117.87],["Riverside",33.98,-117.38],["San Bernardino",34.11,-117.29],["Temecula",33.49,-117.15],["Oceanside",33.2,-117.38],["San Diego",32.72,-117.16],["Palm Springs",33.83,-116.55],["Indio",33.72,-116.22]];
const MAPVIEWS=[["all","All",[32.45,-119.4,34.5,-116.0]],["oc","OC",[33.38,-118.15,34.0,-117.55]],["la","LA",[33.7,-118.6,34.3,-117.9]],["ie","Inland",[33.4,-117.8,34.25,-116.9]],["sd","San Diego",[32.55,-117.45,33.3,-116.9]],["desert","Desert",[33.5,-116.75,34.3,-116.0]]];
state.mapView=state.mapView||"all";
function renderMap(evs){const list=document.getElementById("list");
  const bb=(MAPVIEWS.find(m=>m[0]===state.mapView)||MAPVIEWS[0])[2];const k=Math.cos(33.8*Math.PI/180);const W=1000;
  const sx=W/((bb[3]-bb[1])*k);const H=Math.round((bb[2]-bb[0])*sx);
  const X=lon=>((lon-bb[1])*k*sx).toFixed(1),Y=lat=>((bb[2]-lat)*sx).toFixed(1);
  const groups={};evs.forEach(e=>{if(typeof e.lat!=="number")return;const key=venueKey(e);(groups[key]=groups[key]||{lat:e.lat,lon:e.lon,evs:[]}).evs.push(e);});
  const scale=state.mapView==="all"?2.6:2.2;
  let pins=Object.entries(groups).sort((a,b)=>b[1].evs.length-a[1].evs.length).map(([key,g])=>{const n=g.evs.length;const r=(5+Math.sqrt(n)*2.4)*scale;
    const pm=Math.min(...g.evs.map(e=>pMid(priceInfo(e))??999));const col=pm<999?band(pm,P_STEPS).replace("/ var(--tintA)","/ 0.95"):"hsl(0 0% 60%)";
    return `<g data-v="${esc(key)}" style="cursor:pointer"><circle class="pin" cx="${X(g.lon)}" cy="${Y(g.lat)}" r="${r.toFixed(1)}" fill="${col}"><title>${esc(key)} — ${n} show${n>1?"s":""}</title></circle>${n>1?`<text class="cnt" x="${X(g.lon)}" y="${(+Y(g.lat)+3.2*scale).toFixed(1)}" text-anchor="middle" style="font-size:${(9*scale).toFixed(1)}px">${n}</text>`:""}</g>`;}).join("");
  const land=COAST.map(([la,lo])=>X(lo)+","+Y(la)).join(" ");
  const cities=MAPCITIES.map(([n,la,lo])=>`<text class="city" x="${X(lo)}" y="${Y(la)}" ${+X(lo)>W*0.78?'dx="-8" text-anchor="end"':'dx="8"'} dy="-8" style="font-size:${(12*scale).toFixed(0)}px">${n}</text>`).join("");
  const home=origin?`<circle class="home" cx="${X(origin.lon)}" cy="${Y(origin.lat)}" r="${(7*scale).toFixed(1)}"><title>Your start point</title></circle>`:"";
  const btns=MAPVIEWS.map(([id,l])=>`<button type="button" class="chip" data-mv="${id}" aria-pressed="${state.mapView===id}">${l}</button>`).join("");
  list.innerHTML=`<div class="map"><div class="row">${btns}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of ${evs.length} shows"><rect class="sea" x="0" y="0" width="${W}" height="${H}"/><polygon class="land" points="${land}"/><line class="border" x1="${X(-117.12)}" y1="${Y(32.54)}" x2="${X(-114.9)}" y2="${Y(32.72)}"/>${cities}${home}${pins}</svg><p class="mhint">Dots are venues; bigger = more shows, color = cheapest show there (same scale as the cards). Tap a dot to list that venue's shows. Map is a simple outline, not to street level.</p></div>`;
  list.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{state.mapView=b.dataset.mv;render();});
  list.querySelectorAll("g[data-v]").forEach(g=>g.onclick=()=>{state.venue=g.dataset.v;savePrefs();setView("list");window.scrollTo({top:document.getElementById("viewBar").offsetTop-8,behavior:"smooth"});});}
/* Hivemind808 insights (owner only) */
function median(a){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;}
function bars(rows,fmt){const mx=Math.max(...rows.map(r=>r.v||0),1);return rows.map(r=>`<div class="bar"><span class="k">${esc(r.k)}</span><span class="t"><i style="width:${Math.round((r.v||0)/mx*100)}%"></i></span><span class="v">${fmt(r)}</span></div>`).join("");}
// Venue scouting data. src: "listed" = price published on a booking platform; "est" = my estimate by room size.
// contact.v = true when the contact came from the venue's own site or a tourism-board listing (checked Oct 30, 2026).
const SCOUT={
"Soda Bar":{cap:150,cost:"$1k–$3k",src:"est"},
"The Casbah":{cap:200,cost:"$1.2k–$2.5k/day",src:"listed",c:{t:"Hire Space listing",u:"https://hirespace.com/Spaces/San-Diego/207603/Casbah/Enclosed-Smoking-Patio/Events",v:true}},
"Alex's Bar":{cap:250,cost:"$1k–$3k",src:"est"},
"The Viper Room":{cap:250,cost:"$2k–$5k",src:"est",c:{t:"Request pricing (The Vendry)",u:"https://thevendry.com/venue/162700/the-viper-room-west-hollywood-ca",v:true}},
"Moroccan Lounge":{cap:250,cost:"$2k–$5k",src:"est",c:{t:"Private-event form",u:"https://themoroccan.com/private-events/",v:true}},
"Constellation Room, The Observatory":{cap:200,cost:"$2k–$5k",src:"est",c:{t:"Request pricing (The Vendry)",u:"https://thevendry.com/venue/224106/the-observatory-orange-county-santa-ana-ca",v:true}},
"The Wayfarer":{cap:250,cost:"$1k–$3k",src:"est"},
"Zebulon":{cap:300,cost:"$1.5k–$4k",src:"est"},
"Largo at the Coronet":{cap:280,cost:"$2k–$5k",src:"est"},
"Pappy & Harriet's":{cap:350,cost:"$3k–$8k",src:"est",c:{t:"(760) 228-2222",v:true}},
"SOMA":{cap:300,cost:"$2k–$5k",src:"est"},
"Lodge Room":{cap:450,cost:"$3k–$8k",src:"est",c:{t:"info@lodgeroomhlp.com",u:"mailto:info@lodgeroomhlp.com",v:true}},
"Troubadour":{cap:500,cost:"$4k–$10k",src:"est"},
"The Roxy Theatre":{cap:500,cost:"$4k–$10k",src:"est"},
"Whisky a Go Go":{cap:500,cost:"$3k–$8k",src:"est"},
"Sound Nightclub":{cap:500,cost:"$5k–$12k",src:"est"},
"The Coach House":{cap:660,cost:"$4k–$10k",src:"est",c:{t:"Contact page · 949-496-8930",u:"https://thecoachhouse.com/contact/",v:true}},
"Belly Up Tavern":{cap:600,cost:"$4k–$10k",src:"est",c:{t:"(858) 481-8140 · bellyup.com",u:"http://www.bellyup.com",v:true}},
"Teragram Ballroom":{cap:625,cost:"$4k–$10k",src:"est"},
"Echoplex":{cap:700,cost:"$4k–$10k",src:"est"},
"Music Box":{cap:705,cost:"$5k–$12k",src:"est",c:{t:"events@musicboxsd.com · 619-738-0736",u:"mailto:events@musicboxsd.com",v:true}},
"TIME Nightclub":{cap:700,cost:"$5k–$12k",src:"est"},
"Irvine Barclay Theatre":{cap:750,cost:"$3k–$10k + labor",src:"est",c:{t:"Rental inquiry form",u:"https://www.thebarclay.org/Online/article/rentalinquiry_new",v:true}},
"El Rey Theatre":{cap:770,cost:"$6k–$15k",src:"est"},
"The Glass House":{cap:800,cost:"$5k–$12k",src:"est"},
"Spin Nightclub":{cap:800,cost:"$5k–$12k",src:"est"},
"Yost Theater":{cap:1000,cost:"$5k min spend",src:"listed",c:{t:"Tagvenue listing",u:"https://tagvenue.com/us/rooms/los-angeles/65006/the-yost-theater/entire-venue",v:true}},
"Academy LA":{cap:1000,cost:"$15k min (patio/VIP)",src:"listed",c:{t:"Tagvenue listing",u:"https://www.tagvenue.com/us/venues/los-angeles/13903/academy-la",v:true}},
"Musco Center for the Arts":{cap:1044,cost:"$5k–$15k + labor",src:"est",c:{t:"Chapman external events",u:"https://www.chapman.edu/campus-services/event-operations/external-events/performance-venues.aspx",v:true}},
"The Observatory":{cap:1200,cost:"$8k–$20k",src:"est",c:{t:"Request pricing (The Vendry)",u:"https://thevendry.com/venue/224106/the-observatory-orange-county-santa-ana-ca",v:true}},
"Observatory North Park":{cap:1200,cost:"$8k–$20k",src:"est",c:{t:"646-242-8773 · observatorysd.com",u:"https://www.observatorysd.com/",v:true}},
"Regent Theater":{cap:1100,cost:"$8k–$20k",src:"est"},
"The Fonda Theatre":{cap:1200,cost:"$10k–$25k",src:"est"},
"Exchange LA":{cap:1050,cost:"$10k min spend",src:"listed",c:{t:"Tagvenue listing",u:"https://tagvenue.com/us/rooms/los-angeles/30202/exchange-la/whole-venue",v:true}}
};
function scoutTable(all){const g={};all.forEach(e=>{if(!SCOUT[e.venue])return;(g[e.venue]=g[e.venue]||[]).push(e);});
  Object.keys(SCOUT).forEach(v=>{if(!g[v])g[v]=[];});
  const rows=Object.entries(g).map(([v,a])=>{const info=SCOUT[v];const r=a.filter(e=>e.priceFrom>0&&!e.priceEst).map(e=>e.priceFrom);const gc={};a.forEach(e=>(e.genres||[]).forEach(x=>gc[x]=(gc[x]||0)+1));if(a.length&&a.every(e=>e.kind==="comedy"))gc.comedy=a.length;
    const top=Object.entries(gc).sort((x,y)=>y[1]-x[1]).slice(0,2).map(x=>(GENRES.find(q=>q[0]===x[0])||[0,x[0]])[1].split(" / ")[0]).join(", ");
    const dn={};a.forEach(e=>{const d=parseDay(e.start).toLocaleDateString("en-US",{weekday:"short"});dn[d]=(dn[d]||0)+1;});const bz=Object.entries(dn).sort((x,y)=>y[1]-x[1])[0];
    return {v,city:a[0]?.city||"",info,n:a.length,med:median(r),top,busy:bz?bz[0]:null};}).sort((x,y)=>x.info.cap-y.info.cap);
  const contact=(r)=>{const c=r.info.c;const q=`<a href="https://www.google.com/search?q=${encodeURIComponent(r.v+" "+r.city+" private events booking contact")}" target="_blank" rel="noopener">Search ↗</a>`;
    if(!c)return `<span class="sm">Not verified</span><br>${q}`;
    const link=c.u?(c.u.startsWith("mailto:")?`<a href="${esc(c.u)}">${esc(c.t)}</a>`:`<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.t)} ↗</a>`):esc(c.t);
    return `✓ ${link}`;};
  return `<div class="scl">${rows.map(r=>`<div class="sc"><div class="sch"><b>${esc(r.v.replace(", The Observatory",""))}</b><span class="n">~${r.info.cap} cap</span></div>
   <div class="sm">${esc([r.city,r.n?r.n+" upcoming show"+(r.n>1?"s":""):"no shows in the app right now",r.busy?"busiest "+r.busy:"",r.top,r.med!=null?"typical ticket $"+Math.round(r.med):""].filter(Boolean).join(" · "))}</div>
   <div class="scr"><span class="k">Est. to book</span><span><b>${esc(r.info.cost)}</b> <span class="sm">${r.info.src==="listed"?"(listed price)":"(estimate)"}</span></span></div>
   <div class="scr"><span class="k">Contact</span><span>${contact(r)}</span></div></div>`).join("")}</div>`;}
function clashRun(){const out=document.getElementById("clOut");if(!out)return;
  const c=state.clash={date:document.getElementById("clDate").value,area:document.getElementById("clArea").value,genre:document.getElementById("clGenre").value,tier:document.getElementById("clTier").value};
  if(!c.date){out.innerHTML="";return;}
  const today=todayStr();
  const pool=state.events.filter(e=>e.kind!=="openmic"&&e.start&&(e.end||e.start)>=today&&region(e)===c.area);
  const on=(e,d)=>e.start<=d&&(e.end||e.start)>=d;
  const score=e=>(c.genre==="all"||(e.genres||[]).includes(c.genre)?1:0)+(c.tier==="all"||tier(e)===c.tier?1:0);
  const base=parseDay(c.date);const days=[-3,-2,-1,0,1,2,3].map(o=>{const d=new Date(base);d.setDate(d.getDate()+o);const k=ymd(d);const m=pool.filter(e=>on(e,k));return {k,d,all:m.length,close:m.filter(e=>score(e)===2).length};});
  const sel=days[3];const list=pool.filter(e=>on(e,c.date)).sort((a,b)=>score(b)-score(a));
  const best=([...days].filter(x=>x.k>=today).sort((a,b)=>a.close-b.close||a.all-b.all)[0])||sel;
  out.innerHTML=`<div class="strip">${days.map(x=>`<button type="button" data-cd="${x.k}" aria-pressed="${x.k===c.date}"><span>${x.d.toLocaleDateString("en-US",{weekday:"short"})} ${x.d.getDate()}</span><span class="c">${x.close}</span><span class="sm">/${x.all}</span></button>`).join("")}</div>
   <p class="sm">Big number = shows matching your genre <i>and</i> size in ${esc(c.area)}; /small = all shows in the area that day. Quietest nearby night: <b>${best.d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</b> (${best.close} direct, ${best.all} total).</p>
   ${list.length?list.slice(0,12).map(e=>`<div class="cl-item"><i class="cdot ${score(e)===2?"r":score(e)===1?"o":"w"}"></i> <b>${esc(e.title)}</b> · ${esc(e.venue)}, ${esc(e.city)} · ${esc(tier(e))}${(e.genres||[]).length?" · "+esc((e.genres||[]).map(g=>(GENRES.find(q=>q[0]===g)||[0,g])[1].split(" / ")[0]).join(", ")):""}</div>`).join("")+(list.length>12?`<p class="sm">+${list.length-12} more</p>`:""):`<p class="sm">Nothing listed in ${esc(c.area)} that night yet — but far-out dates fill in as shows get announced, so recheck closer to the date.</p>`}
   <p class="sm"><i class="cdot r"></i> same genre & size · <i class="cdot o"></i> one match · <i class="cdot w"></i> other. Based only on shows in the app.</p>`;
  out.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{document.getElementById("clDate").value=b.dataset.cd;clashRun();});}
function renderInsights(){const list=document.getElementById("list");const today=todayStr();
  const all=state.events.filter(e=>e.kind!=="openmic"&&e.start&&(e.end||e.start)>=today);
  const real=all.filter(e=>e.priceFrom!=null&&e.priceFrom>0&&!e.priceEst);
  const group=(arr,fn)=>{const g={};arr.forEach(e=>{const k=fn(e);(g[k]=g[k]||[]).push(e);});return g;};
  const medRows=(g,min=1)=>Object.entries(g).filter(([,a])=>a.length>=min).map(([k,a])=>({k,v:median(a.map(e=>e.priceFrom)),n:a.length})).sort((a,b)=>b.v-a.v);
  const KN={festival:"Festivals",club:"Club / DJ nights",concert:"Concerts",comedy:"Comedy",theater:"Theater & arts"};
  const byKind=medRows(group(real,e=>KN[e.kind]||e.kind));
  const byTier=medRows(group(real,tier));
  const wk=group(real,e=>{const d=parseDay(e.start).getDay();return d===5||d===6?"Fri / Sat":d===0?"Sunday":"Mon–Thu";});
  const byDay=["Mon–Thu","Fri / Sat","Sunday"].filter(k=>wk[k]).map(k=>({k,v:median(wk[k].map(e=>e.priceFrom)),n:wk[k].length}));
  const cntDay={};all.forEach(e=>{const d=parseDay(e.start).toLocaleDateString("en-US",{weekday:"short"});cntDay[d]=(cntDay[d]||0)+1;});
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(k=>({k,v:cntDay[k]||0}));
  const sold=all.filter(e=>e.status==="sold out");
  const vg=group(all,venueKey);const topV=Object.entries(vg).sort((a,b)=>b[1].length-a[1].length).slice(0,10).map(([k,a])=>{const r=a.filter(e=>e.priceFrom>0&&!e.priceEst);return {k:k.split(" · ")[0],v:a.length,m:median(r.map(e=>e.priceFrom))};});
  const usd=r=>"$"+Math.round(r.v)+" · n="+r.n;
  list.innerHTML=`<div class="ins">
   <section><h2>${ni("chart")} Hivemind808 insights</h2><p class="sm">Only you see this. Built from the ${all.length} upcoming shows in the app; prices use the ${real.length} shows with a real listed price (cheapest resale seat, so treat them as "what the market will bear," not face value).</p></section>
   <section class="clash"><h3>${ni("cal")} Date clash checker</h3><p class="sm">Planning a night? See what's competing for the same crowd. Tap a day in the strip to compare nearby nights.</p>
     <div class="row"><input type="date" id="clDate" value="${state.clash?.date||ymd(new Date(Date.now()+30*86400000))}">
       <select id="clArea">${["Orange County","Los Angeles","Inland Empire","San Diego","Desert"].map(r=>`<option${(state.clash?.area||"Orange County")===r?" selected":""}>${r}</option>`).join("")}</select>
       <select id="clGenre"><option value="all">Any genre</option>${GENRES.slice(1).map(g=>`<option value="${g[0]}"${state.clash?.genre===g[0]?" selected":""}>${g[1]}</option>`).join("")}</select>
       <select id="clTier"><option value="all">Any size</option>${["Small / DIY","Mid-size (1–3k)","Comedy club","Theater / arts hall","Amphitheater","Arena / stadium","Festival"].map(t=>`<option${state.clash?.tier===t?" selected":""}>${t}</option>`).join("")}</select></div>
     <div id="clOut"></div></section>
   <section><h3>Typical cheapest ticket by event type</h3>${bars(byKind,usd)}</section>
   <section><h3>…by venue size</h3><p class="sm">Useful for pricing a Hivemind808 night against similar-size rooms.</p>${bars(byTier,usd)}</section>
   <section><h3>Weekend premium</h3>${bars(byDay,usd)}</section>
   <section><h3>Which nights have the most shows</h3><p class="sm">More shows = more competition for the same crowd.</p>${bars(days,r=>r.v+" shows")}</section>
   <section><h3>Busiest venues</h3>${bars(topV,r=>r.v+" shows"+(r.m!=null?" · ~$"+Math.round(r.m):""))}</section>
   <section><h3>${ni("search")} Venue scouting: small & mid rooms</h3><p class="sm">Rooms sized for a Hivemind808 night. <b>✓</b> = contact found on the venue's own site or a tourism/booking listing (checked Oct 30). "Est. to book" is a private buyout / minimum-spend ballpark: <b>listed price</b> came from a booking platform; <b>estimate</b> is my guess from room size. For a ticketed show most rooms prefer a door split (they keep the bar, you split tickets) over a flat rental, so ask about both.</p>${scoutTable(all)}</section>
   <section><h3>Sell-outs</h3><p class="sm">${sold.length?sold.length+" marked sold out: "+sold.slice(0,8).map(e=>esc(e.title)+" ("+esc(tier(e))+")").join(", ")+".":"None marked sold out right now."} Sell-out tracking is thin — the daily refresh only flags it when a ticket site says so.</p></section>
  </div>`;
  ["clDate","clArea","clGenre","clTier"].forEach(id=>{const el=document.getElementById(id);if(el)el.onchange=clashRun;});clashRun();}

/* ---- start point: per viewer ---- */
const sv=document.getElementById("startView"), sf=document.getElementById("startForm"), sa=document.getElementById("startAddr"),
      sl=document.getElementById("startLabel"), se=document.getElementById("startEdit"), ss=document.getElementById("startSave"),
      sc=document.getElementById("startCancel"), sm=document.getElementById("startMsg");
const HINT = sm.textContent;
let settingsRef=null, sampleFn=null;
function showStart(){
  sl.textContent = origin ? (origin.label||origin.address) + (origin.approx?" (approx.)":"") : "Not set";
  se.textContent = origin ? "Change" : "Set start point";
  document.querySelector(".controls .range").hidden = !origin;
}
function openForm(){sf.hidden=false;sv.hidden=true;sa.value=origin?.address||"";sm.textContent=HINT;sm.classList.remove("err");sa.focus();}
function closeForm(){sf.hidden=true;sv.hidden=false;}
se.onclick=openForm; sc.onclick=closeForm;
function applyOrigin(o){origin=o;showStart();render();}
try{const s=JSON.parse(localStorage.getItem("radar-origin")||"null");if(s&&typeof s.lat==="number")origin=s;}catch(e){}
showStart();
async function geocode(text){
  if(sampleFn){
    try{
      const r=await sampleFn.json('Geocode this address in Southern California. Reply with only JSON like {"lat":33.7455,"lon":-117.8677,"label":"Santa Ana"} where label is the neighborhood or city name (never the street address). If you cannot place it, reply {"lat":null,"lon":null,"label":null}.\n\nAddress: '+text,{modelTier:"quick"});
      if(r&&typeof r.lat==="number"&&typeof r.lon==="number"&&Math.abs(r.lat-34)<3&&Math.abs(r.lon+118)<3) return {lat:r.lat,lon:r.lon,label:String(r.label||"")};
    }catch(e){}
  }
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q="+encodeURIComponent(text));
    const j=await r.json();
    if(j&&j[0]){const la=+j[0].lat,lo=+j[0].lon;if(Math.abs(la-34)<3&&Math.abs(lo+118)<3){const nm=String(j[0].display_name||"").split(",");return {lat:la,lon:lo,label:(nm[2]||nm[1]||"").trim()};}}
  }catch(e){}
  const g=cityGuess(text);
  if(g){const k=Object.keys(CITIES).find(k=>CITIES[k][0]===g.lat);return {...g,label:k.replace(/\b\w/g,c=>c.toUpperCase())};}
  return null;
}
sf.addEventListener("submit",async ev=>{
  ev.preventDefault();
  const text=sa.value.trim(); if(!text){sm.textContent="Type an address or a city name.";sm.classList.add("err");return;}
  ss.disabled=true; sm.classList.remove("err"); sm.textContent="Finding that location…";
  const g=await geocode(text);
  ss.disabled=false;
  if(!g){sm.textContent="Couldn't place that address. Try adding the city, like \"Main St, Costa Mesa\".";sm.classList.add("err");return;}
  const o={address:text,lat:g.lat,lon:g.lon,label:g.label||text,approx:!!g.approx};
  try{localStorage.setItem("radar-origin",JSON.stringify(o));}catch(e){}
  if(settingsRef){try{await settingsRef.set(o);}catch(e){}}
  applyOrigin(o); closeForm();
});

/* ---- add a pick ---- */
const ao=document.getElementById("addOpen"), af=document.getElementById("addForm"), am=document.getElementById("addMsg"), asv=document.getElementById("addSave");
const AHINT=am.textContent;
const $=id=>document.getElementById(id);
ao.onclick=()=>{af.hidden=false;ao.hidden=true;am.textContent=AHINT;am.classList.remove("err");$("addTitle").focus();};
$("addCancel").onclick=()=>{af.hidden=true;ao.hidden=false;};
function to12(t){if(!t)return null;const [h,m]=t.split(":").map(Number);return ((h%12)||12)+":"+String(m).padStart(2,"0")+(h<12?" AM":" PM");}
function addErr(msg){am.textContent=msg;am.classList.add("err");}
af.addEventListener("submit",async ev=>{
  ev.preventDefault();
  const title=$("addTitle").value.trim(), date=$("addDate").value, venue=$("addVenue").value.trim(), city=$("addCity").value.trim();
  if(!title||!date||!venue||!city){addErr("Fill in the artist, date, venue and city.");return;}
  if(date<todayStr()){addErr("That date has passed. Pick today or later.");return;}
  const priceRaw=$("addPrice").value.trim(), urlRaw=$("addUrl").value.trim();
  const url = urlRaw ? safeUrl(/^https?:\/\//i.test(urlRaw)?urlRaw:"https://"+urlRaw) : null;
  if(urlRaw && !url){addErr("That link doesn't look right. Paste the full web address.");return;}
  asv.disabled=true; am.classList.remove("err"); am.textContent="Saving…";
  const g = await geocode(venue+", "+city);
  const genre=$("addGenre").value;
  const doc={title,artists:null,kind:$("addKind").value,genres:genre?[genre]:[],venue,city,lat:g?g.lat:null,lon:g?g.lon:null,
    start:date,end:null,time:to12($("addTime").value),priceFrom:priceRaw===""?null:Math.max(0,Number(priceRaw)),priceAvg:null,priceNote:null,note:null,
    url,status:"on sale",createdBy:myUid,createdAt:new Date().toISOString()};
  try{
    const q=new URLSearchParams({template:"add-show.yml",title:"Add: "+title+" · "+date,labels:"add-show",
      show:title,date,time:doc.time||"",venue,city,kind:doc.kind,genre:genre||"",price:priceRaw,url:url||"",
      lat:doc.lat==null?"":String(doc.lat),lon:doc.lon==null?"":String(doc.lon)});
    const gh="https://github.com/lukegiannelli/showshack/issues/new?"+q.toString();
    am.innerHTML='Almost there — tap <b>Create</b> on the GitHub page that opens. It goes live in about a minute. <a href="'+gh+'" target="_blank" rel="noopener">Open it again</a>';
    const w=window.open(gh,"_blank"); if(!w) location.href=gh;
    af.reset();
  }catch(e){
    addErr("Couldn't open GitHub. Check your connection and try again.");
  }finally{asv.disabled=false;}
});
document.getElementById("list").addEventListener("click",ev=>{
  const b=ev.target.closest("button[data-star]"); if(!b)return;
  const k=b.dataset.star, on=!state.stars.has(k);
  if(on)state.stars.add(k); else state.stars.delete(k);
  b.setAttribute("aria-pressed",String(on)); b.textContent=on?"★":"☆";
  starCount+=on?1:-1; updateStarChip(); saveStars(); updateBudget();
  if(state.kind==="starred")render();
});
document.getElementById("list").addEventListener("click",async ev=>{
  const b=ev.target.closest("button[data-share]"); if(!b)return;
  const all=[...state.events,...state.picks.map(p=>({...p,added:true}))].map(e=>isRec(e)?{...e,start:nextOccurrence(e.recurrence)}:e);
  const e=all.find(x=>skey(x)===b.dataset.share); if(!e)return;
  const t=shareText(e); let ok=false;
  try{await navigator.clipboard.writeText(t);ok=true;}catch(err){}
  const links=b.parentElement; let box=links.querySelector(".sharebox");
  if(ok){b.textContent="✓ Copied — paste in a text";setTimeout(()=>{if(b.isConnected)b.textContent="Share";},2500);if(box)box.remove();}
  else{if(!box){box=document.createElement("div");box.className="sharebox";links.appendChild(box);}box.textContent=t;b.textContent="Press & hold to copy ↓";}
});
document.getElementById("list").addEventListener("click",async ev=>{
  const b=ev.target.closest("button[data-rm]"); if(!b||!dbRef)return;
  if(b.dataset.confirm!=="1"){b.dataset.confirm="1";b.textContent="Tap again to remove";setTimeout(()=>{if(b.isConnected){b.dataset.confirm="";b.textContent="Remove";}},4000);return;}
  b.disabled=true;
  try{await dbRef.doc("picks/"+b.dataset.rm).delete();}catch(e){b.disabled=false;b.textContent="Couldn't remove";}
});


const APP_URL="https://lukegiannelli.github.io/showshack/";
function hid(e){return (e.added?"p-":"e-")+String(e.id).toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,80);}
let hashDone="";
function jumpToHash(){const h=(location.hash||"").slice(1);if(!h||h===hashDone)return;let el=document.getElementById(h);while(!el&&state._more&&state._more())el=document.getElementById(h);if(!el)return;hashDone=h;el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("hl");setTimeout(()=>el.classList.remove("hl"),4000);}
let shownDay=todayStr();
function dayCheck(){if(todayStr()!==shownDay){shownDay=todayStr();render();}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)dayCheck();});
setInterval(dayCheck,60000);
window.addEventListener("hashchange",()=>{hashDone="";jumpToHash();});
async function copyOut(text,btn){
  const old=btn.textContent;
  try{await navigator.clipboard.writeText(text);btn.textContent="Copied ✓";setTimeout(()=>btn.textContent=old,1800);return;}catch(err){}
  let box=document.getElementById("copybox");
  if(!box){box=document.createElement("div");box.id="copybox";box.className="copybox";box.innerHTML='<textarea readonly></textarea><button type="button" class="sharebtn">Done</button>';document.body.appendChild(box);box.querySelector("button").onclick=()=>box.remove();}
  const ta=box.querySelector("textarea");ta.value=text;ta.focus();ta.select();
}
/* Easter egg: tap the shack to play the Shack song; the hut spins like a record, locked to the beat. */
(function(){
  // To change the song: drop the file in, set its tempo (bpm) and where the first downbeat lands (offset, seconds).
  // gapless:true decodes the whole song for a seamless loop (keep that for short loops); long songs use a normal player.
  const SHACK={src:"brain-dance.mp3?v=1", bpm:123, offset:0.46, beatsPerTurn:4, gapless:false}; // "Brain Dance" by Kevin MacLeod, measured at 123 bpm
  let SONG=SHACK, mine=null;   // mine = {name,bpm,offset} when you've swapped in your own song (kept on this device only)
  const btn=document.getElementById("hutBtn"), img=btn.querySelector("img");
  const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx=null, buf=null, src=null, gain=null, el=null, playing=false, loading=false, t0=0;
  try{if(navigator.audioSession)navigator.audioSession.type="playback";}catch(e){} // iPhone: play even with the silent switch on
  async function start(){
    if(loading)return; loading=true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!SONG.gapless||!AC)throw 0;
      if(!ctx){ctx=new AC();gain=ctx.createGain();gain.connect(ctx.destination);}
      await ctx.resume();
      if(!buf){const r=await fetch(SONG.src);buf=await ctx.decodeAudioData(await r.arrayBuffer());}
      src=ctx.createBufferSource();src.buffer=buf;src.loop=true;src.connect(gain);
      gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(1,ctx.currentTime+0.3);
      t0=ctx.currentTime+0.05; src.start(t0);
    }catch(e){
      src=null; if(!el){el=new Audio(SONG.src);el.loop=true;el.preload="auto";}
      try{el.currentTime=0;await el.play();}catch(_){loading=false;return;}
    }
    loading=false; set(true);
  }
  function stop(){
    if(src&&ctx){const s=src;gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setValueAtTime(gain.gain.value,ctx.currentTime);gain.gain.linearRampToValueAtTime(0,ctx.currentTime+0.4);setTimeout(()=>{try{s.stop();}catch(e){}},450);src=null;}
    if(el)el.pause();
    set(false);
  }
  function set(on){playing=on;document.getElementById("songCredit").hidden=!on;credit();btn.setAttribute("aria-pressed",String(on));btn.setAttribute("aria-label",on?"Stop the Shack song":"Play the Shack song");if(!still)kick();}
  btn.addEventListener("click",()=>{playing?stop():start();});
  // seconds until the song's next beat (div=1) or 16th note (div=4); null when the song isn't playing. The disco ball uses it to land its sounds on the beat.
  window.shackBeat=function(div){if(!playing)return null;let pos=null;if(src&&ctx)pos=ctx.currentTime-t0;else if(el&&!el.paused)pos=el.currentTime;if(pos==null||pos<0)return null;
    const g=60/SONG.bpm/(div||1),ph=(((pos-SONG.offset)%g)+g)%g;return ph<.02?0:g-ph;};

  // ---- Song swap: play your own song from your phone (stored on this device only, never uploaded) ----
  const cred=document.getElementById("songCredit"), shackCred=cred.innerHTML;
  const pick=document.createElement("input");pick.type="file";pick.accept="audio/*";pick.hidden=true;document.body.appendChild(pick);
  function credit(){
    cred.innerHTML=(mine?`♪ ${esc(mine.name)} · ~${Math.round(mine.bpm)} bpm`:shackCred)+
      ` · <button type="button" class="swapbtn" data-swap="pick">${mine?"Swap":"Swap song"}</button>`+(mine?` <button type="button" class="swapbtn" data-swap="reset">Shack song</button>`:"");}
  cred.addEventListener("click",ev=>{const b=ev.target.closest("[data-swap]");if(!b)return;
    if(b.dataset.swap==="pick")pick.click(); else useSong(null);});
  const db=()=>new Promise((ok,no)=>{const r=indexedDB.open("shack-song",1);r.onupgradeneeded=()=>r.result.createObjectStore("s");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
  async function store(v){try{const d=await db();await new Promise(ok=>{const t=d.transaction("s","readwrite");v?t.objectStore("s").put(v,"mine"):t.objectStore("s").delete("mine");t.oncomplete=ok;t.onerror=ok;});}catch(e){}}
  async function load(){try{const d=await db();return await new Promise(ok=>{const r=d.transaction("s").objectStore("s").get("mine");r.onsuccess=()=>ok(r.result||null);r.onerror=()=>ok(null);});}catch(e){return null;}}
  function useSong(rec){
    const was=playing; if(playing)stop();
    if(el){el.pause();el=null;} buf=null;
    if(SONG.src&&SONG.src.startsWith("blob:"))URL.revokeObjectURL(SONG.src);
    if(rec){mine={name:rec.name,bpm:rec.bpm,offset:rec.offset};SONG={src:URL.createObjectURL(rec.blob),bpm:rec.bpm,offset:rec.offset,beatsPerTurn:4,gapless:false};}
    else{mine=null;SONG=SHACK;store(null);}
    credit(); if(was)setTimeout(start,450);
  }
  // Tempo guess: energy onsets from the first ~40s, autocorrelated over 75–180 bpm; then the beat phase with the most onsets.
  async function tempo(ab){
    const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!AC)return {bpm:120,offset:0};
    const tmp=new AC(1,44100,44100); const b=await tmp.decodeAudioData(ab);
    const sr=b.sampleRate, n=Math.min(b.length,sr*40), hop=Math.round(sr/100), ch=b.getChannelData(0);
    const env=[];for(let i=0;i+hop<=n;i+=hop){let e=0;for(let j=i;j<i+hop;j++)e+=ch[j]*ch[j];env.push(Math.sqrt(e/hop));}
    const on=env.map((v,i)=>i?Math.max(0,v-env[i-1]):0);
    let best=0,lag=50;for(let L=Math.round(6000/180);L<=Math.round(6000/75);L++){let c=0;for(let i=L;i<on.length;i++)c+=on[i]*on[i-L];c/=on.length-L;if(c>best){best=c;lag=L;}}
    let bpm=6000/lag; while(bpm<90)bpm*=2; while(bpm>180)bpm/=2;
    const per=6000/bpm;let bp=0,ph=0;for(let p=0;p<per;p++){let c=0;for(let t=p;t<on.length;t+=per)c+=on[Math.round(t)]||0;if(c>bp){bp=c;ph=p;}}
    return {bpm:Math.round(bpm*10)/10,offset:ph/100};
  }
  pick.addEventListener("change",async()=>{
    const f=pick.files&&pick.files[0]; pick.value=""; if(!f)return;
    if(f.size>40e6){alert("That file is over 40 MB — try a shorter song.");return;}
    cred.hidden=false; cred.textContent="♪ Finding the beat…";
    let t={bpm:120,offset:0}; try{t=await tempo(await f.arrayBuffer());}catch(e){}
    const rec={name:f.name.replace(/\.[^.]+$/,"").slice(0,40),blob:f,bpm:t.bpm,offset:t.offset};
    await store(rec); useSong(rec); if(!playing)start();
  });
  load().then(r=>{if(r&&r.blob)useSong(r);});

  // Spin runs as a compositor animation (Web Animations), so it stays buttery even while you scroll.
  // One full turn per bar of the song; started so the turn lines up with the first beat.
  const barMs=()=>SONG.beatsPerTurn*60000/SONG.bpm;
  let spin=null, brake=null;
  function curAngle(){
    if(spin&&spin.currentTime!=null){const t=spin.currentTime;return t<0?0:(t%barMs())/barMs()*360;}
    if(brake){const m=getComputedStyle(img).transform;if(m&&m!=="none"){const v=m.match(/matrix\(([^)]+)\)/);if(v){const p=v[1].split(",").map(Number);let d=Math.atan2(p[1],p[0])*180/Math.PI;return (d+360)%360;}}}
    return 0;}
  function kick(){
    if(playing){
      const from=curAngle(); if(brake){brake.cancel();brake=null;}
      spin=img.animate([{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],{duration:barMs(),iterations:Infinity,easing:"linear"});
      // line the turn up with the beat grid: start at the angle we're already at, offset by the song's first downbeat
      spin.currentTime=from/360*barMs() - (from?0:SONG.offset*1000);
    }else if(spin){
      const from=curAngle(); spin.cancel(); spin=null;
      let to=360; if(to-from<120)to+=360;                     // always coast a bit, like a turntable losing power
      const speed=360/barMs();                                 // deg per ms
      const dur=2*(to-from)/speed;                             // ease-out quad starts at full speed, ends at zero
      brake=img.animate([{transform:`rotate(${from}deg)`},{transform:`rotate(${to}deg)`}],{duration:dur,easing:"cubic-bezier(.33,.66,.66,1)",fill:"forwards"});
      brake.onfinish=()=>{if(brake){brake.cancel();brake=null;}};
    }}
})();
/* ---- Get the app: one-tap install on Android, a short guide on iPhone ---- */
(function(){
  const bar=document.getElementById("getApp"),bg=document.getElementById("sheetBg"),sh=document.getElementById("sheet"),body=document.getElementById("sheetBody");
  const ua=navigator.userAgent;
  const installed=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  const iOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const inApp=/Instagram|FBAN|FBAV|FB_IAB|TikTok|Line\/|Snapchat|LinkedInApp|Twitter/i.test(ua);
  let deferred=null, pointer=null;
  if(installed)return;
  const snoozed=()=>{try{return +localStorage.getItem("shack-getapp-x")>Date.now();}catch(e){return false;}};
  function showBar(){if(!snoozed())bar.hidden=false;}
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;showBar();});   // Android / desktop Chrome
  window.addEventListener("appinstalled",()=>{bar.hidden=true;close();});
  if(iOS)showBar();
  document.getElementById("getX").onclick=()=>{bar.hidden=true;try{localStorage.setItem("shack-getapp-x",String(Date.now()+14*864e5));}catch(e){}};
  function close(){sh.hidden=true;bg.hidden=true;if(pointer){pointer.remove();pointer=null;}}
  bg.onclick=close;document.getElementById("sheetDone").onclick=close;
  function open(){
    if(deferred){deferred.prompt();deferred.userChoice.finally(()=>{deferred=null;});return;}
    const step=(n,h)=>`<div class="step"><span class="n">${n}</span><span>${h}</span></div>`;
    if(inApp){
      body.innerHTML=step(1,"This app's built-in browser can't install it. Tap <kbd>⋯</kbd> or <kbd>Share</kbd> and choose <b>Open in Safari</b> (or your browser).")+
        step(2,"Then tap <b>Get</b> again from there.");
    }else if(iOS){
      body.innerHTML=step(1,"Tap <kbd>⋯</kbd> at the bottom right of Safari, then <kbd>Share&nbsp;⬆</kbd>. <span class='note'>(Older iPhones: the <kbd>⬆</kbd> button is right on the bottom bar.)</span>")+
        step(2,"Scroll down and tap <kbd>Add to Home Screen</kbd>.")+
        step(3,"Make sure <b>Open as Web App</b> is on, then tap <kbd>Add</kbd>. 🛖")+
        `<p class="note">The Shack lands on your home screen and opens full screen, like any app.</p>`;
      pointer=document.createElement("div");pointer.className="pointer";pointer.textContent="👇";document.body.appendChild(pointer);
    }else{
      body.innerHTML=step(1,"Open your browser menu <kbd>⋮</kbd>.")+step(2,"Tap <kbd>Install app</kbd> or <kbd>Add to Home screen</kbd>.");
    }
    sh.hidden=false;bg.hidden=false;
  }
  document.getElementById("getBtn").onclick=open;
  window.shackGetApp=open;
  if(/[?&]get=1/.test(location.search)){showBar();setTimeout(open,700);}   // links from "Share the Shack" / the QR code
})();
document.getElementById("shareApp").addEventListener("click",ev=>{
  const url=APP_URL+"?get=1", text="🛖 The Show Shack: SoCal shows, raves, comedy, open mics & more, with prices, drive times and what your night will cost. Free, no login. Tap to get it:";
  if(navigator.share){navigator.share({title:"The Show Shack",text,url}).catch(()=>{});return;}
  copyOut(text+"\n"+url,ev.currentTarget);
});
// Owner mode: open the site once with #owner to show the Add button on this device.
try{if(location.hash==="#owner"){localStorage.setItem("shack-owner","1");history.replaceState(null,"",location.pathname);}
  if(localStorage.getItem("shack-owner")==="1")document.getElementById("addOpen").hidden=false;}catch(e){}
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
// Shows come from events.json (works for everyone, no login). The database is only a fallback.
let VOPEN={};fetch("venues.json").then(r=>r.ok?r.json():{}).then(j=>{VOPEN=j||{};if(state.view==="venues"||state.venue!=="all")render();}).catch(()=>{});
let fileLoaded=false;
(async()=>{
  try{
    const r=await fetch("events.json",{cache:"no-store"});
    if(!r.ok) throw 0;
    const d=await r.json();
    const evs=(d.events||[]).filter(e=>e.title&&(e.start||isRec(e)));
    if(!evs.length) throw 0;
    fileLoaded=true; state.events=evs; state.loaded=true;
    const el=document.getElementById("refreshed");
    if(d.lastRun){const t=new Date(d.lastRun);el.innerHTML="Updated <b>"+esc(t.toLocaleDateString("en-US",{month:"short",day:"numeric"}))+"</b>";}
    render();
  }catch(err){
    setTimeout(()=>{if(!fileLoaded&&!dbRef&&!state.loaded){state.loaded=true;document.getElementById("refreshed").textContent="Couldn't load shows";render();}},12000);
  }
})();

(async()=>{
  const db = window.claude ? await window.claude.use("db") : null;
  if(window.claude){
    window.claude.use("sample").then(s=>{sampleFn=s;});
    const user=await window.claude.use("user");
    const uid = user ? await user.id() : null;
    myUid=uid; amOwner = user ? !!(await user.isOwner()) : false;
    if(amOwner) document.getElementById("vIns").hidden=false;
    if(db&&uid){
      try{
        settingsRef=db.doc("data/users/"+uid+"/settings");
        const snap=await settingsRef.get();
        if(snap.exists){const d=snap.data();if(typeof d.lat==="number"){applyOrigin(d);try{localStorage.setItem("radar-origin",JSON.stringify(d));}catch(e){}}}
      }catch(e){settingsRef=null;}
      try{
        starRef=db.doc("data/users/"+uid+"/starred");
        const ss=await starRef.get(); const ids=ss.exists?(ss.data().ids||[]):[];
        ids.forEach(k=>state.stars.add(String(k)));
        if(state.stars.size!==ids.length) flushStars();
        try{localStorage.setItem("radar-stars",JSON.stringify([...state.stars]));}catch(e){}
        render();
      }catch(e){starRef=null;}
    }
  }
  if(!db){if(!fileLoaded){state.loaded=true;render();}return;}
  dbRef=db;
  if(!fileLoaded){
    db.collection("events").onSnapshot(snap=>{
      if(fileLoaded)return;
      state.events=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.title&&(e.start||isRec(e)));
      state.loaded=true;render();
    },err=>{if(!fileLoaded){state.loaded=true;document.getElementById("list").innerHTML='<div class="empty"><strong>Couldn\'t load shows</strong>Reload the page to try again.</div>';}});
    db.doc("meta/refresh").onSnapshot(s=>{
      if(fileLoaded)return;
      const el=document.getElementById("refreshed");
      if(s.exists&&s.data().lastRun){const t=new Date(s.data().lastRun);el.innerHTML="Updated <b>"+esc(t.toLocaleDateString("en-US",{month:"short",day:"numeric"}))+"</b>";}
      else el.textContent="Not refreshed yet";
    },()=>{});
  }
  if(myUid) document.getElementById("addOpen").hidden=false;
  db.collection("picks").onSnapshot(snap=>{
    state.picks=snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.title&&e.start);
    render();
  },()=>{});
})();
