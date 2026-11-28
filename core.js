/* The Show Shack · core. Loaded first. The small helpers every other file shares, so there is one copy of each:
   distance + drive time, reading show times, saving on this phone, and sound. (Before this file there were three
   distance formulas, five time parsers with two different "late night" cut-offs, and four ways to start sound.) */
(function(){
const SH={};

/* ---- distance and drive time (rough: straight line × 1.2 for roads, 55 mph + 6 min to park; Google times override where app.js has them) ---- */
SH.miles=(a,b,c,d)=>{const R=3958.8,t=x=>x*Math.PI/180,x=Math.sin(t(c-a)/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(t(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
SH.roadMi=(a,b,c,d)=>SH.miles(a,b,c,d)*1.2;
SH.driveMin=roadMi=>Math.max(5,Math.round((6+roadMi/55*60)/5)*5);

/* ---- show times. Anything before 6 AM belongs to the night before, so 1 AM sorts after 11 PM (counts as 25:00) ---- */
SH.LATE=6;
// "8 PM", "8:30pm", "7 p.m.", "Doors 7 PM · show 8" (first time wins) → {h, m} on a 24-hour clock, or null.
// Ranges start at the START: "6:00–8:00 PM" → 6 PM (the AM/PM after a range belongs to both ends; "11–1 AM" → 11 PM).
SH.clock=t=>{t=String(t||"");const m=/(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b/i.exec(t);
  const r=/\b(\d{1,2})(?::(\d\d))?\s*(?:[–—-]|to)\s*(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b/i.exec(t);
  if(r&&(!m||r.index<m.index)){const pm=/p/i.test(r[5]),end=(+r[3]%12+(pm?12:0))*60+(+r[4]||0);let h=+r[1]%12+(pm?12:0);if(h*60+(+r[2]||0)>end)h=(h+12)%24;return {h,m:+r[2]||0};}
  if(!m)return null;let h=+m[1]%12;if(/p/i.test(m[3]))h+=12;return {h,m:+m[2]||0};};
const late=h=>h<SH.LATE?h+24:h;
SH.minOfText=t=>{const c=SH.clock(t);return c?late(c.h)*60+c.m:null;};          // "1 AM" → 1500
SH.hhmmOfText=t=>{const c=SH.clock(t);return c?String(c.h).padStart(2,"0")+":"+String(c.m).padStart(2,"0"):"";};
SH.minOfHHMM=s=>{const [h,m]=String(s||"0:0").split(":").map(Number);return late(h||0)*60+(m||0);};   // "01:30" → 1530
SH.hhmmOfMin=m=>{const t=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");};

/* ---- saving on this phone. Every read and write goes through here, so the coming Supabase sync has one place to hook:
   each write of an app key is stamped with when it changed (shack-meta) and announced as a "shack:store" event. ---- */
const META="shack-meta",APP=/^(shack-|radar-)/;
let meta=null;
const ls=()=>{try{return window.localStorage;}catch(e){return null;}};
function loadMeta(){if(meta)return meta;try{meta=JSON.parse((ls()&&ls().getItem(META))||"{}")||{};}catch(e){meta={};}return meta;}
function stamp(k,gone){if(!APP.test(k)||k===META)return;const m=loadMeta();if(gone)delete m[k];else m[k]=Date.now();try{ls().setItem(META,JSON.stringify(m));}catch(e){}
  try{window.dispatchEvent(new CustomEvent("shack:store",{detail:{key:k,removed:!!gone}}));}catch(e){}}
SH.store={
  raw(k){try{return ls()?ls().getItem(k):null;}catch(e){return null;}},                       // the stored string, or null
  put(k,v){try{ls().setItem(k,String(v));stamp(k);return true;}catch(e){return false;}},      // false when storage is full or blocked
  del(k){try{ls().removeItem(k);stamp(k,true);}catch(e){}},
  get(k,d){try{const v=JSON.parse(SH.store.raw(k)||"null");return v==null?d:v;}catch(e){return d;}},
  set(k,v){return SH.store.put(k,JSON.stringify(v));},
  keys(){try{return Object.keys(ls()||{});}catch(e){return [];}},
  changed(k){return loadMeta()[k]||0;}};                                                        // when this phone last changed a key (ms)

/* ---- sound: one shared engine. Effects MIX with whatever's playing (YouTube, Spotify keep going, silent switch is respected); the disco games use game() so they're heard on silent too;
   music you start on purpose (the shack song, a 30-second preview) takes over playback. ---- */
let ctx=null;
const session=type=>{try{if(navigator.audioSession)navigator.audioSession.type=type;}catch(e){}};
SH.audio={
  mix(){session("ambient");},
  // the disco ball games: short sounds that play even with the silent switch on and only dip (not stop) your music.
  // "ambient" (mix) goes quiet on silent, which is why the games sounded broken. Leaves the session alone while the shack song plays.
  game(){if(window.shackBeat&&window.shackBeat(1)!=null)return;session("transient");},
  solo(){session("playback");},
  ctx(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    if(!ctx){try{ctx=new AC({latencyHint:"interactive"});}catch(e){ctx=new AC();}}
    if(ctx.state!=="running")try{ctx.resume();}catch(e){}return ctx;}};

/* ---- Supabase project (free plan). The publishable key is meant to be public: the database's own rules do the locking. ---- */
SH.sb={url:"https://tdahsfxcfsgalfqhsnal.supabase.co",key:"sb_publishable_ybHSIncwmDBn5nuUByG9vg_D194O2qo"};
// Match my music (music.js): the free Last.fm API key (public by design; empty = the Last.fm option stays hidden)
SH.music={lastfm:""};
// call a public database function without signing in (used for live night links): SH.rpc("get_live_night",{p_id})
SH.rpc=async(fn,args)=>{const r=await fetch(SH.sb.url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:SH.sb.key,"Content-Type":"application/json"},body:JSON.stringify(args||{})});
  if(!r.ok)throw new Error("rpc "+r.status);return r.json();};

/* ---- add to calendar: ONE way for every button in the app (shows, Your tickets, night plans, on-sale reminders).
   iPhone / iPad / Mac: a calendar file (opens Apple Calendar's "Add" sheet). Everything else: Google Calendar in a new tab
   (Android's Google Calendar can't open calendar files). Times are LA wall-clock times sent as UTC, so they land right
   even on a phone set to another time zone. Shows before 6 AM belong to the night before (same rule as SH.clock).
   ev = {uid, title, date:"YYYY-MM-DD", min: minutes after midnight or null (all day), dur: minutes (default 180),
         endDate:"YYYY-MM-DD" (all-day spans), location, desc, url, alarm: minutes before (files only)} ---- */
const pad2=n=>String(n).padStart(2,"0");
function laUTC(y,mo,d,min){const want=Date.UTC(y,mo-1,d,0,min);let t=want;   // LA wall time → real instant (handles DST)
  const fmt=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hourCycle:"h23",year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric"});
  for(let i=0;i<2;i++){const p={};fmt.formatToParts(new Date(t)).forEach(x=>p[x.type]=+x.value);t+=want-Date.UTC(p.year,p.month-1,p.day,p.hour%24,p.minute);}
  return new Date(t);}
const zstamp=x=>x.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
const dplus=(s,n)=>{const [y,m,d]=s.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d+n));return x.getUTCFullYear()+pad2(x.getUTCMonth()+1)+pad2(x.getUTCDate());};
function calTimes(ev){const [y,m,d]=String(ev.date).split("-").map(Number);
  if(ev.min==null)return {all:true,a:dplus(ev.date,0),b:dplus(ev.endDate&&ev.endDate>ev.date?ev.endDate:ev.date,1)};
  const st=laUTC(y,m,d,ev.min<SH.LATE*60?ev.min+1440:ev.min);return {all:false,a:zstamp(st),b:zstamp(new Date(st.getTime()+(ev.dur||180)*6e4))};}
const icsEsc=v=>String(v==null?"":v).replace(/\\/g,"\\\\").replace(/[,;]/g,c=>"\\"+c).replace(/\r?\n/g,"\\n");
SH.cal={
  apple:()=>/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent),
  ics(ev){const t=calTimes(ev),u=ev.url||"";
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//The Show Shack//EN","CALSCALE:GREGORIAN","BEGIN:VEVENT",
      "UID:"+String(ev.uid||Date.now()).replace(/[^\w.:-]+/g,"-").slice(0,80)+"@showshack","DTSTAMP:"+zstamp(new Date()),
      t.all?"DTSTART;VALUE=DATE:"+t.a:"DTSTART:"+t.a,t.all?"DTEND;VALUE=DATE:"+t.b:"DTEND:"+t.b,
      "SUMMARY:"+icsEsc(ev.title),...(ev.location?["LOCATION:"+icsEsc(ev.location)]:[]),"DESCRIPTION:"+icsEsc(ev.desc||""),...(u?["URL:"+u]:[]),
      ...(ev.alarm?["BEGIN:VALARM","TRIGGER:-PT"+ev.alarm+"M","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(ev.title),"END:VALARM"]:[]),
      "END:VEVENT","END:VCALENDAR"].join("\r\n");},
  google(ev){const t=calTimes(ev),desc=[ev.desc,ev.url&&!String(ev.desc||"").includes(ev.url)?ev.url:""].filter(Boolean).join("\n");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(ev.title||"")+"&dates="+t.a+"/"+t.b
      +(t.all?"&ctz=America/Los_Angeles":"")+"&location="+encodeURIComponent(ev.location||"")+"&details="+encodeURIComponent(desc);},
  // call straight from a tap (the new tab needs it). Returns false when there's no date to add.
  add(ev){if(!ev||!/^\d{4}-\d\d-\d\d$/.test(String(ev.date||""))){SH.cal.say("No date for that yet");return false;}
    if(SH.cal.apple()){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([SH.cal.ics(ev)],{type:"text/calendar"}));
      a.download=String(ev.title||"show").replace(/[^\w-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)+".ics";document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);SH.cal.say("Calendar file ready. Tap Add to put it in your calendar");}
    else{const w=window.open(SH.cal.google(ev),"_blank");if(w)try{w.opener=null;}catch(e){}else location.href=SH.cal.google(ev);}
    return true;},
  say(m){if(window.NIGHT&&NIGHT.toast)NIGHT.toast(m);}
};

/* ---- error reports: when something breaks on someone's phone, a short note goes to the Shack's database (client_errors,
   see supabase/feedback.sql): the message, which file and line, which tab, the browser, the app version. No account, no
   personal data, nothing read back. At most 5 per visit, each error once; skipped offline and on test copies. ---- */
(()=>{const sent=new Set();let n=0;
  const live=()=>/github\.io$|showshack/i.test(location.hostname)&&!/^(localhost|127\.|shack\.test)/.test(location.hostname);
  const ver=()=>{const m=[...document.scripts].map(s=>/\/app\.js\?v=(\d+)/.exec(s.src)).find(Boolean);return m?"app"+m[1]:"";};
  const page=()=>{if(document.documentElement.classList.contains("b-you"))return "you";const t=document.querySelector("#bTabs [data-tab][aria-current]");return t?t.dataset.tab:"";};
  const short=(u)=>String(u||"").replace(location.origin+location.pathname.replace(/[^/]*$/,""),"").replace(/\?.*$/,"").slice(0,200);
  function report(msg,src,line){msg=String(msg||"").trim().slice(0,300);
    if(!msg||n>=5||!navigator.onLine||!live())return;
    if(/^Script error\.?$|ResizeObserver loop|extension:\/\/|^Load failed$|^Failed to fetch$|NetworkError|AbortError/i.test(msg+" "+(src||"")))return;   // noise we can't act on
    if(src&&!/^https?:/.test(src)&&!/\.js/.test(src))return;
    const k=msg+"|"+src+"|"+line;if(sent.has(k))return;sent.add(k);n++;
    try{fetch(SH.sb.url+"/rest/v1/client_errors",{method:"POST",keepalive:true,headers:{apikey:SH.sb.key,"Content-Type":"application/json",Prefer:"return=minimal"},
      body:JSON.stringify({msg,src:short(src),line:line|0,page:page().slice(0,60),ua:navigator.userAgent.slice(0,160),ver:ver().slice(0,20)})}).catch(()=>{});}catch(e){}}
  addEventListener("error",ev=>{if(ev.target&&ev.target!==window)return;report(ev.message,ev.filename,ev.lineno);});   // script errors only, not broken images
  addEventListener("unhandledrejection",ev=>{const r=ev.reason;const st=String(r&&r.stack||"");const m=/(https?:\/\/[^\s)]+?\.js[^\s):]*):(\d+)/.exec(st);
    report(r&&r.message?r.message:String(r),m?m[1]:"",m?+m[2]:0);});
  SH.report=report;})();

window.SH=SH;
})();
