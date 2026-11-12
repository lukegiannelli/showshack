/* ---- The Show Shack · cloud (Supabase, free plan). Optional: nothing loads or uploads until you sign in with your email.
   Syncs your passport, saved nights and settings between your devices. Every saved key carries the time it last changed
   (core.js stamps it), so the newest copy of each key wins. The first sign-in on a device combines both sides instead.
   Also hands other files a signed-in client (window.SHACK_CLOUD) for live night links, friends, ratings and photos. ---- */
(()=>{
const {url:SB_URL,key:SB_KEY}=SH.sb;
const LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const K_AT="shack-sync-at",K_SESS="sb-tdahsfxcfsgalfqhsnal-auth-token",K_MSG="shack-sync-msg";
// what syncs. Arrays and objects are combined on a device's first sign-in; after that the newest copy of each key wins.
const KEYS=["radar-stars","radar-been","radar-starven","radar-prefs","radar-origin","shack-plog","shack-pshows","shack-nimp","shack-nights","shack-favfood","shack-fppl","shack-fseen","shack-live","shack-photos","shack-bseen"];
const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const put=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
let sb=null,user=null,ui="idle",email="",status="",busy=false,again=false,pushT=null,applying=false,pulling=false;
const subs=[];

function loadLib(){if(window.supabase&&window.supabase.createClient)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement("script");s.src=LIB;s.onload=ok;s.onerror=()=>no(new Error("lib"));document.head.appendChild(s);});}
async function client(){if(sb)return sb;await loadLib();
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  sb.auth.onAuthStateChange((ev,s)=>{const u=s?s.user:null,was=user&&user.id;user=u;
    if((u&&u.id)!==was){if(u){ui="idle";setTimeout(pull,0);}else{status="";redraw();}subs.forEach(f=>{try{f(u);}catch(e){}});}});
  return sb;}

/* ---- the synced copy ---- */
const parse=s=>{try{return JSON.parse(s);}catch(e){return s;}};
function snap(){const k={};for(const key of KEYS){const raw=SH.store.raw(key);if(raw==null)continue;k[key]={v:parse(raw),t:SH.store.changed(key)||1};}return {v:2,k};}
const isObj=x=>x&&typeof x==="object"&&!Array.isArray(x);
// combine two copies of one key (first sign-in on a device): lists join, objects join (this device wins a tie)
function combine(key,mine,theirs){
  if(key==="shack-nights"&&Array.isArray(mine)&&Array.isArray(theirs)){const by={};
    for(const x of [...theirs,...mine])if(x&&x.id){const o=by[x.id];if(!o||((x.p&&x.p.up)||0)>=((o.p&&o.p.up)||0))by[x.id]=x;}
    return Object.values(by).sort((a,b)=>((b.p&&b.p.up)||0)-((a.p&&a.p.up)||0)).slice(0,24);}
  if(Array.isArray(mine)&&Array.isArray(theirs)){const seen=new Set(),out=[];for(const x of [...mine,...theirs]){const s=JSON.stringify(x);if(!seen.has(s)){seen.add(s);out.push(x);}}return out;}
  if(isObj(mine)&&isObj(theirs)){const out={...theirs};for(const [k,v] of Object.entries(mine))out[k]=k in theirs?combine("",v,theirs[k]):v;return out;}
  return mine==null?theirs:mine;}
function write(key,val){applying=true;try{SH.store.put(key,typeof val==="string"?val:JSON.stringify(val));}finally{applying=false;}}

async function pull(){if(!user||pulling)return;pulling=true;status="Syncing…";redraw();
  try{const {data,error}=await sb.from("passports").select("data,updated_at").eq("user_id",user.id).maybeSingle();
    if(error)throw error;
    const cloud=(data&&data.data&&data.data.v===2&&data.data.k)||{};let wrote=0,mineNewer=!data;
    const first=!get(K_AT);
    for(const key of KEYS){const c=cloud[key],raw=SH.store.raw(key),t=SH.store.changed(key)||0;
      if(!c){if(raw!=null)mineNewer=true;continue;}
      if(raw==null){write(key,c.v);wrote++;continue;}
      if(first){const m=combine(key,parse(raw),c.v);if(JSON.stringify(m)!==JSON.stringify(parse(raw))){write(key,m);wrote++;}mineNewer=true;continue;}
      if(c.t>t&&JSON.stringify(c.v)!==JSON.stringify(parse(raw))){write(key,c.v);wrote++;}
      else if(t>c.t)mineNewer=true;}
    if(mineNewer||wrote)await push();else{put(K_AT,data.updated_at);done();}
    if(wrote){try{sessionStorage.setItem(K_MSG,"Updated from your other device ✓");}catch(e){}location.reload();}
  }catch(e){status="Couldn't sync. Will try again.";redraw();}
  finally{pulling=false;}}
async function push(){if(!user)return;if(busy){again=true;return;}busy=true;
  try{const {data,error}=await sb.from("passports").upsert({user_id:user.id,data:snap()}).select("updated_at").single();
    if(error)throw error;put(K_AT,data.updated_at);done();
  }catch(e){status=/passports_size/.test(String(e&&e.message))?"Too much to sync. Delete some old nights.":"Couldn't sync. Will try again.";redraw();}
  busy=false;if(again){again=false;push();}}
function done(){status="Synced ✓ "+new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});redraw();}

// any change to a synced key (core.js announces every save) goes up a moment later
addEventListener("shack:store",ev=>{const k=ev.detail&&ev.detail.key;if(applying||!user||!KEYS.includes(k))return;clearTimeout(pushT);pushT=setTimeout(push,1500);});

/* ---- the sign-in box (on the Show passport card) ---- */
const esc2=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.shackCloudHTML=()=>{let body;
  if(user)body=`<span class="bcloud-t">☁ Synced to <b>${esc2(user.email||"your account")}</b>: passport, saved nights and settings.</span><span class="bcloud-s" aria-live="polite">${esc2(status)}</span><button type="button" class="bpass-share" data-cl="out">Sign out</button>`;
  // plain text boxes (not type=email / pattern) so a stray space can't block the button; spaces are stripped as you type
  else if(ui==="email")body=`<form class="bcloud-f" data-cl-form="email" novalidate><input type="text" inputmode="email" name="e" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="you@email.com" value="${esc2(email)}" aria-label="Your email" data-cl-strip="email"><button class="bpass-share">Email me a code</button><button type="button" class="bpass-share" data-cl="x">Cancel</button></form><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  else if(ui==="code")body=`<span class="bcloud-t">We emailed a code to <b>${esc2(email)}</b>. Type it here (check spam if it's not there in a minute):</span><form class="bcloud-f" data-cl-form="code" novalidate><input name="c" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Code" aria-label="Code from the email" maxlength="12" data-cl-strip="code"><button class="bpass-share">Sign in</button><button type="button" class="bpass-share" data-cl="resend">Send a new code</button><button type="button" class="bpass-share" data-cl="x">Cancel</button></form><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  else body=`<span class="bcloud-t">☁ Sign in with your email to keep your passport, nights and settings on all your devices, share live night links, and see friends. Free.</span><button type="button" class="bpass-share" data-cl="in">Sign in with email</button><span class="bcloud-s" aria-live="polite">${esc2(status)}</span>`;
  return `<div class="bcloud" id="bCloud">${body}</div>`;};
function redraw(){const el=document.getElementById("bCloud");if(!el)return;el.outerHTML=window.shackCloudHTML();
  const f=document.querySelector("#bCloud input");if(f&&ui!=="idle"&&!user)f.focus();}
function startSignIn(){ui="email";status="";const el=document.getElementById("bCloud");
  if(el){redraw();el.scrollIntoView&&document.getElementById("bCloud").scrollIntoView({block:"center",behavior:"smooth"});return true;}return false;}

document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-cl]");if(!b)return;ev.stopPropagation();ev.preventDefault();
  const a=b.dataset.cl;
  if(a==="in"){ui="email";status="";redraw();return;}
  if(a==="x"){ui="idle";status="";redraw();return;}
  if(a==="resend"){ui="email";status="";redraw();return;}
  if(a==="out"){try{await sb.auth.signOut();}catch(e){}user=null;put(K_AT,null);ui="idle";status="Signed out. Everything stays on this device.";redraw();subs.forEach(f=>{try{f(null);}catch(e){}});}},true);
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-cl-form]");if(!f)return;ev.preventDefault();ev.stopPropagation();
  const btn=f.querySelector("button:not([type=button])");btn.disabled=true;
  try{await client();
    if(f.dataset.clForm==="email"){email=f.e.value.replace(/\s+/g,"").toLowerCase();
      if(!/^[^@]+@[^@]+\.[a-z]{2,}$/i.test(email)){status="That email doesn't look right. Check it and try again.";redraw();return;}
      status="Sending…";redraw();
      const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error)throw error;ui="code";status="";redraw();}
    else{const token=f.c.value.replace(/\D+/g,"");
      if(token.length<6){status="Type the whole code from the email (6 or more numbers).";redraw();return;}
      status="Checking…";redraw();
      const {error}=await sb.auth.verifyOtp({email,token,type:"email"});
      if(error)throw error;}
  }catch(e){const m=String(e&&e.message||"");
    status=/rate|too many|seconds/i.test(m)?"Too many emails for now. Try again in an hour.":/expired|invalid/i.test(m)?"That code didn't work. Check it or send a new email.":/lib/.test(m)?"Can't reach the sync service. Check your connection.":"Something went wrong. Try again.";
    redraw();}},true);

// strip spaces as you type (email) / keep only numbers (code), so a stray space bar tap can't get in the way
document.addEventListener("input",ev=>{const i=ev.target.closest("[data-cl-strip]");if(!i)return;
  const v=i.dataset.clStrip==="code"?i.value.replace(/\D+/g,""):i.value.replace(/\s+/g,"");if(v!==i.value)i.value=v;},true);

// pull again when you come back to the app (picks up changes from your other devices)
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user&&!busy)pull();});

// for other files: SHACK_CLOUD.user (or null), .client() (signed-in Supabase client), .onUser(fn), .signIn() (opens the box)
window.SHACK_CLOUD={get user(){return user;},client,onUser(f){subs.push(f);if(user)f(user);},signIn:startSignIn};

// start only if you've signed in before, or you're arriving from the sign-in email link
try{const m=sessionStorage.getItem(K_MSG);if(m){status=m;sessionStorage.removeItem(K_MSG);}}catch(e){}
const q=new URLSearchParams(location.search),fromLink=q.has("code")||q.has("error_description");
if(get(K_SESS)||fromLink)client().then(async c=>{
  if(fromLink){if(q.get("error_description")){status="That sign-in link didn't work: "+q.get("error_description");ui="email";}
    try{await c.auth.getSession();}catch(e){}
    try{history.replaceState(null,"",location.pathname+location.hash);}catch(e){}}
  const {data}=await c.auth.getSession();if(data&&data.session&&!user){user=data.session.user;subs.forEach(f=>{try{f(user);}catch(e){}});pull();}else redraw();
}).catch(()=>{});
})();
