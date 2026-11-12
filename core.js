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
// "8 PM", "8:30pm", "7 p.m.", "Doors 7 PM · show 8" (first time wins) → {h, m} on a 24-hour clock, or null
SH.clock=t=>{const m=/(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m\b/i.exec(String(t||""));if(!m)return null;let h=+m[1]%12;if(/p/i.test(m[3]))h+=12;return {h,m:+m[2]||0};};
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

window.SH=SH;
})();
