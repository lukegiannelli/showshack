/* ---- Show passport sync (Supabase, free plan). Optional: nothing loads or uploads until you sign in with your email.
   What syncs: venue stamps, star ratings + notes, bucket list, starred shows. One small row per person, locked to that person. ---- */
(()=>{
const SB_URL="https://tdahsfxcfsgalfqhsnal.supabase.co";
const SB_KEY="sb_publishable_ybHSIncwmDBn5nuUByG9vg_D194O2qo";   // publishable key: safe in a public page, the database rules do the locking
const LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const K_AT="shack-sync-at",K_DIRTY="shack-sync-dirty",K_SESS="sb-tdahsfxcfsgalfqhsnal-auth-token";
const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const put=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
let sb=null,user=null,ui="idle",email="",status="",busy=false,again=false,pushT=null,applying=false,pulling=false;

function loadLib(){if(window.supabase&&window.supabase.createClient)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement("script");s.src=LIB;s.onload=ok;s.onerror=()=>no(new Error("lib"));document.head.appendChild(s);});}
async function client(){if(sb)return sb;await loadLib();
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  sb.auth.onAuthStateChange((ev,s)=>{const u=s?s.user:null,was=user&&user.id;user=u;
    if(u&&was!==u.id){ui="idle";setTimeout(pull,0);}       // don't call Supabase inside this callback
    if(!u&&was){status="";redraw();}});
  return sb;}

// what goes up: everything the passport needs on another device (b.js shares its log + bucket list via window.shackPass)
const P=()=>window.shackPass||{PLOG:{},WANT:new Set(),savePlog(){},saveWant(){}};
const snap=()=>({v:1,been:[...BEEN],starven:starVen,want:[...P().WANT],log:P().PLOG,stars:[...state.stars]});
const okK=k=>typeof k==="string"&&k.length<200;
// merge = keep both devices' stuff (first sign-in, or offline edits on both); otherwise the cloud copy replaces this device's
function apply(d,merge){if(!d||typeof d!=="object")return;applying=true;
  try{const {PLOG,WANT,savePlog,saveWant}=P(),arr=a=>Array.isArray(a)?a.filter(okK):[];
    if(!merge){BEEN.clear();WANT.clear();state.stars.clear();for(const k of Object.keys(PLOG))delete PLOG[k];for(const k of Object.keys(starVen))delete starVen[k];}
    arr(d.been).forEach(k=>BEEN.add(k));arr(d.want).forEach(k=>WANT.add(k));arr(d.stars).forEach(k=>state.stars.add(k));
    if(d.starven&&typeof d.starven==="object")for(const [k,o] of Object.entries(d.starven))if(okK(k)&&o&&!starVen[k])starVen[k]=o;
    if(d.log&&typeof d.log==="object")for(const [k,o] of Object.entries(d.log)){if(!okK(k)||!o||typeof o!=="object")continue;
      const mine=PLOG[k];if(merge&&mine&&(mine.r||mine.n))continue;
      PLOG[k]={r:Math.min(5,Math.max(0,Math.round(+o.r||0))),n:String(o.n||"").slice(0,140)};}
    saveBeen();saveWant();savePlog();saveStars();
  }finally{applying=false;}
  if(typeof render==="function")render();}

async function pull(){if(!user||pulling)return;pulling=true;status="Syncing…";redraw();
  try{const {data,error}=await sb.from("passports").select("data,updated_at").eq("user_id",user.id).maybeSingle();
    if(error)throw error;
    const at=get(K_AT),dirty=get(K_DIRTY)==="1";
    if(!data){await push();return;}                                  // first device ever: upload this one
    if(!at){apply(data.data,true);await push();return;}              // first time on this device: combine both
    if(data.updated_at!==at){apply(data.data,dirty);if(dirty){await push();return;}put(K_AT,data.updated_at);}
    else if(dirty){await push();return;}
    done();
  }catch(e){status="Couldn't sync. Will try again.";redraw();}
  finally{pulling=false;}}
async function push(){if(!user)return;if(busy){again=true;return;}busy=true;
  try{const {data,error}=await sb.from("passports").upsert({user_id:user.id,data:snap()}).select("updated_at").single();
    if(error)throw error;put(K_AT,data.updated_at);put(K_DIRTY,null);done();
  }catch(e){status=/passports_size/.test(String(e&&e.message))?"Passport too big to sync":"Couldn't sync. Will try again.";redraw();}
  busy=false;if(again){again=false;push();}}
function done(){status="Synced ✓ "+new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});redraw();}

// app.js / b.js call this from their save functions
window.shackCloudDirty=()=>{if(applying)return;put(K_DIRTY,"1");if(user){clearTimeout(pushT);pushT=setTimeout(push,1500);}};

const esc2=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.shackCloudHTML=()=>{let body;
  if(user)body=`<span class="bcloud-t">☁ Synced to <b>${esc2(user.email||"your account")}</b></span><span class="bcloud-s" aria-live="polite">${esc2(status)}</span><button type="button" class="bpass-share" data-cl="out">Sign out</button>`;
  else if(ui==="email")body=`<form class="bcloud-f" data-cl-form="email"><input type="email" name="e" required autocomplete="email" placeholder="you@email.com" value="${esc2(email)}" aria-label="Your email"><button class="bpass-share">Send sign-in email</button><button type="button" class="bpass-share" data-cl="x">Cancel</button></form><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  else if(ui==="code")body=`<span class="bcloud-t">Check <b>${esc2(email)}</b>. Tap the link in it, or type the code here:</span><form class="bcloud-f" data-cl-form="code"><input name="c" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" required placeholder="Code" aria-label="Code from the email"><button class="bpass-share">Sign in</button><button type="button" class="bpass-share" data-cl="x">Cancel</button></form><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  else body=`<span class="bcloud-t">☁ Keep your passport on all your devices. Free, just your email.</span><button type="button" class="bpass-share" data-cl="in">Sync with email</button><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  return `<div class="bcloud" id="bCloud">${body}</div>`;};
function redraw(){const el=document.getElementById("bCloud");if(!el)return;el.outerHTML=window.shackCloudHTML();
  const f=document.querySelector("#bCloud input");if(f&&ui!=="idle"&&!user)f.focus();}

document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-cl]");if(!b)return;ev.stopPropagation();ev.preventDefault();
  const a=b.dataset.cl;
  if(a==="in"){ui="email";status="";redraw();return;}
  if(a==="x"){ui="idle";status="";redraw();return;}
  if(a==="out"){try{await sb.auth.signOut();}catch(e){}user=null;put(K_AT,null);ui="idle";status="Signed out. Your passport stays on this device.";redraw();}},true);
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-cl-form]");if(!f)return;ev.preventDefault();ev.stopPropagation();
  const btn=f.querySelector("button:not([type=button])");btn.disabled=true;
  try{await client();
    if(f.dataset.clForm==="email"){email=f.e.value.trim();status="Sending…";redraw();
      const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error)throw error;ui="code";status="";redraw();}
    else{status="Checking…";redraw();
      const {error}=await sb.auth.verifyOtp({email,token:f.c.value.trim(),type:"email"});
      if(error)throw error;}
  }catch(e){const m=String(e&&e.message||"");
    status=/rate|too many|seconds/i.test(m)?"Too many emails for now. Try again in an hour.":/expired|invalid/i.test(m)?"That code didn't work. Check it or send a new email.":/lib/.test(m)?"Can't reach the sync service. Check your connection.":"Something went wrong. Try again.";
    redraw();}},true);

// pull again when you come back to the app (picks up changes from your other devices)
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user&&!busy)pull();});

// start only if you've signed in before, or you're arriving from the sign-in email link
const q=new URLSearchParams(location.search),fromLink=q.has("code")||q.has("error_description");
if(get(K_SESS)||fromLink)client().then(async c=>{
  if(fromLink){if(q.get("error_description")){status="That sign-in link didn't work: "+q.get("error_description");ui="email";}
    try{await c.auth.getSession();}catch(e){}
    try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){}}
  const {data}=await c.auth.getSession();if(data&&data.session&&!user){user=data.session.user;pull();}else redraw();
}).catch(()=>{});
})();
