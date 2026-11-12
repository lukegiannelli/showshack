/* ---- The Show Shack · social (Supabase, free plan). Built on cloud.js's sign-in.
   Live night links (same link, plan keeps updating) · friends by code + "going together" on show cards ·
   opt-in leaderboard · opt-in public star ratings per venue · a photo per stamped venue (private to you).
   Anyone can see the leaderboard and venue ratings; everything else needs you signed in. ---- */
(()=>{
const C=window.SHACK_CLOUD;if(!C||!window.SH)return;
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);const ch="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";return [...a].map(x=>ch[x%ch.length]).join("");};
const base=()=>location.origin+location.pathname;
const say=m=>{if(window.NIGHT&&NIGHT.toast)NIGHT.toast(m);};

/* ===== live night links ===== */
const LIVE=()=>SH.store.get("shack-live",{})||{};   // {night id: link id}; syncs, so all your devices update the same link
const sent={};
async function liveLink(id,p){if(!C.user)return null;const sb=await C.client(),map=LIVE();let slug=map[id];
  if(!slug){slug=rid(12);map[id]=slug;SH.store.set("shack-live",map);}
  const {error}=await sb.from("live_nights").upsert({id:slug,owner:C.user.id,plan:p});if(error)throw error;
  sent[slug]=JSON.stringify(p);return base()+"#L="+slug;}
let liveT=0;
async function pushLive(){const map=LIVE();if(!C.user||!window.NIGHT||!NIGHT.allNights||!Object.keys(map).length)return;const sb=await C.client();
  for(const x of NIGHT.allNights()){const slug=map[x.id];if(!slug)continue;const j=JSON.stringify(x.p);if(sent[slug]===j)continue;
    const {error}=await sb.from("live_nights").update({plan:x.p}).eq("id",slug);if(!error)sent[slug]=j;}}
addEventListener("shack:store",ev=>{if(!ev.detail||ev.detail.key!=="shack-nights"||!C.user)return;clearTimeout(liveT);liveT=setTimeout(()=>pushLive().catch(()=>{}),2000);});
window.SHACK_LIVE={link:liveLink,on:()=>!!C.user};
// who you are on the Shack (for invite links): first name + friend code, or null when signed out
window.SHACK_ME=()=>prof?{name:String(prof.name||"").split(/\s+/)[0].slice(0,20),full:String(prof.name||"").trim().slice(0,30),code:prof.friend_code}:null;
// friend codes are two silly words (GRUMPY-RACCOON); people see and type them as "grumpy raccoon"
const pretty=c=>String(c||"").toLowerCase().replace(/-/g," ");

/* ===== profile, friends, leaderboard ===== */
let prof=null,friends=null,board=null,msg="",busy=false;
const myBeen=()=>new Set(SH.store.get("radar-been",[])||[]);
async function loadSocial(){if(!C.user)return;try{const sb=await C.client();
  const [p,f]=await Promise.all([sb.from("profiles").select("name,friend_code,on_leaderboard,share_ratings").maybeSingle(),sb.rpc("my_friends")]);
  prof=p.data||null;friends=f.data||[];
  // for the Crew builder badge (3 friends): just the count, kept on this phone
  try{if(SH.store.raw("shack-friends-n")!==String(friends.length))SH.store.put("shack-friends-n",String(friends.length));}catch(e){}}catch(e){msg="Couldn't load friends right now.";}
  redraw();decorate();if(prof&&prof.share_ratings)syncRatings().catch(()=>{});}
C.onUser(u=>{if(u){loadSocial();takePending();}else{prof=null;friends=null;msg="";redraw();decorate();}});

window.shackSocialHTML=()=>{const u=C.user;let h="";
  if(u&&!prof)h+=`<form class="bcloud-f" data-so-form="name"><input name="n" maxlength="30" required placeholder="Your name for friends" aria-label="Your name for friends" autocomplete="nickname"><button class="bpass-share">Save</button></form>
    <span class="bcloud-t">Pick a name to add friends, see who's going to the same shows and join the leaderboard.</span>`;
  if(u&&prof){const mine=myBeen();
    h+=`<span class="bcloud-t">👥 Your friend code: <b class="bso-code">${E(pretty(prof.friend_code))}</b> (you're <b>${E(prof.name)}</b>)</span>
      <div class="bso-acts"><button type="button" class="bpass-share" data-so="invite">Invite a friend</button><button type="button" class="bpass-share" data-so="reroll">🎲 New code</button></div>
      <form class="bcloud-f" data-so-form="add"><input name="c" maxlength="40" required placeholder="Friend's code, e.g. grumpy raccoon" aria-label="Friend's code" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="bpass-share">Add friend</button></form>`;
    if(friends&&friends.length)h+=`<ul class="bso-list">${friends.map(f=>{const b=Array.isArray(f.been)?f.been:[],common=b.filter(k=>mine.has(k)).length,only=b.length-common;
      return `<li><b>${E(f.name)}</b><span>${b.length} venue${b.length===1?"":"s"} · ${common} in common${only?` · ${only} you haven't hit`:""}</span><button type="button" class="bso-x" data-so="rm" data-id="${E(f.friend_id)}" aria-label="Remove ${E(f.name)}">✕</button></li>`;}).join("")}</ul>`;
    else if(friends)h+=`<span class="bcloud-t">No friends yet. Send your invite link or trade codes.</span>`;
    h+=`<label class="bso-t"><input type="checkbox" data-so-t="on_leaderboard"${prof.on_leaderboard?" checked":""}> Show me on the leaderboard (name + venue count)</label>
      <label class="bso-t"><input type="checkbox" data-so-t="share_ratings"${prof.share_ratings?" checked":""}> Share my star ratings on venue cards (never your notes)</label>`;}
  h+=`<button type="button" class="bpass-share" data-so="board" aria-expanded="${!!board}">🏆 ${board?"Hide":"SoCal"} leaderboard</button>`;
  if(board)h+=board.length?`<ol class="bso-board">${board.map(r=>`<li${r.is_me?' class="me"':""}><b>${E(r.name)}</b><span>${r.venues} venue${r.venues===1?"":"s"}</span></li>`).join("")}</ol>`
    :`<span class="bcloud-t">Nobody's on it yet. Sign in and turn it on to be first.</span>`;
  if(msg)h+=`<span class="bcloud-s" aria-live="polite">${E(msg)}</span>`;
  return `<div class="bcloud bsocial" id="bSocial">${h}</div>`;};
function redraw(){const el=document.getElementById("bSocial");if(el)el.outerHTML=window.shackSocialHTML();
  // the You page says hi by your Shack name once it's loaded
  const h=document.getElementById("bYouName");if(h)h.textContent=prof&&prof.name?String(prof.name).trim():"there";}

async function addFriend(code){const sb=await C.client();const {data,error}=await sb.rpc("add_friend",{p_code:code});
  if(error)throw error;msg=`You and ${data} are friends now ✓`;await loadSocial();}
// invite links: #F=CODE. If you're not signed in yet, it waits until you are.
const PK="shack-pending-friend";
function takePending(){let c=null;try{c=localStorage.getItem(PK);}catch(e){}if(!c||!C.user)return;try{localStorage.removeItem(PK);}catch(e){}
  if(!prof){setTimeout(()=>{if(prof)addFriend(c).catch(e=>{msg=errMsg(e);redraw();});else{msg="Pick your name first, then add code "+c;redraw();}},1500);return;}
  addFriend(c).catch(e=>{msg=errMsg(e);redraw();});}
(()=>{const m=/^#F=([A-Z0-9-]{4,40})$/i.exec(window.NIGHT_HASH||location.hash||"");if(!m)return;
  let by="";try{by=decodeURIComponent((/[?&]by=([^&#]+)/.exec(window.SHACK_SEARCH||location.search)||[])[1]||"").replace(/[^\p{L}\p{N} .'-]/gu,"").trim().slice(0,20);}catch(e){}
  try{localStorage.setItem(PK,m[1].toUpperCase());history.replaceState(null,"",location.pathname);}catch(e){}
  // wait until the "get the app" sheet is closed so the two don't stack
  const nudge=()=>{const sh=document.getElementById("sheet");if(sh&&!sh.hidden){setTimeout(nudge,1500);return;}
    if(C.user)takePending();else if(window.NIGHT&&NIGHT.toast)NIGHT.toast((by||"A friend")+" invited you! Sign in to connect.","Sign in",()=>{if(window.SHACK_YOU)SHACK_YOU.open("signin");});};
  setTimeout(nudge,2500);})();
const errMsg=e=>{const m=String(e&&e.message||"");return /no one has/.test(m)?"No one has that code. Check it and try again.":/own code/.test(m)?"That's your own code 🙂":/cap:/.test(m)?"You've hit the limit for that.":/name/.test(m)?"Names need 1 to 30 characters.":"Something went wrong. Try again.";};

document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-so]");if(!b)return;ev.stopPropagation();ev.preventDefault();const a=b.dataset.so;
  try{if(a==="board"){if(board){board=null;redraw();return;}board=await SH.rpc("leaderboard",{});redraw();return;}
    if(a==="invite"&&prof){const url=base()+"?get=1&by="+encodeURIComponent(String(prof.name||"").split(/\s+/)[0].slice(0,20))+"#F="+prof.friend_code,text=`Add me on The Show Shack so we can see who's going to what 🛖 My code: ${pretty(prof.friend_code)}`;
      if(navigator.share){try{await navigator.share({text,url});}catch(e){}return;}
      try{await navigator.clipboard.writeText(text+"\n"+url);b.textContent="Invite copied ✓";}catch(e){prompt("Copy your invite link",url);}return;}
    if(a==="reroll"&&prof){if(!confirm("Roll a new friend code? Invite links you already sent stop working. Friends you have stay friends."))return;
      const sb=await C.client();const {data,error}=await sb.rpc("new_friend_code");if(error)throw error;prof.friend_code=data;msg=`Your new code: ${pretty(data)} ✓`;redraw();return;}
    if(a==="rm"){const f=(friends||[]).find(x=>x.friend_id===b.dataset.id);if(!confirm(`Remove ${f?f.name:"this friend"}? You'll both stop seeing each other.`))return;
      const sb=await C.client();const {error}=await sb.rpc("remove_friend",{p_friend:b.dataset.id});if(error)throw error;msg="Removed.";await loadSocial();return;}
  }catch(e){msg=a==="board"?"Couldn't load the leaderboard.":errMsg(e);redraw();}},true);
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-so-form]");if(!f)return;ev.preventDefault();ev.stopPropagation();if(busy)return;busy=true;
  try{const sb=await C.client(),k=f.dataset.soForm;
    if(k==="name"){const name=f.n.value.trim();const {error}=await sb.from("profiles").insert({user_id:C.user.id,name});if(error)throw error;msg="Saved ✓";await loadSocial();takePending();}
    if(k==="add")await addFriend(f.c.value.trim());
  }catch(e){msg=errMsg(e);redraw();}busy=false;},true);
document.addEventListener("change",async ev=>{const t=ev.target.closest("[data-so-t]");if(!t||!prof)return;ev.stopPropagation();const col=t.dataset.soT,on=t.checked;
  try{const sb=await C.client();const {error}=await sb.from("profiles").update({[col]:on}).eq("user_id",C.user.id);if(error)throw error;prof[col]=on;
    if(col==="share_ratings"){if(on)await syncRatings();else await sb.from("venue_ratings").delete().eq("user_id",C.user.id);SCORES=null;decorate();}
    if(col==="on_leaderboard"&&board)board=await SH.rpc("leaderboard",{});msg="Saved ✓";
  }catch(e){t.checked=!on;msg=errMsg(e);}redraw();},true);

/* ===== public venue ratings: your 1–5 stars from the passport log, only if you opted in ===== */
async function syncRatings(){if(!C.user||!prof||!prof.share_ratings)return;const sb=await C.client(),log=SH.store.get("shack-plog",{})||{};
  const want={};for(const [k,o] of Object.entries(log)){const r=o&&Math.round(+o.r);if(r>=1&&r<=5&&k.length>=3&&k.length<=160)want[k]=r;}
  const {data,error}=await sb.from("venue_ratings").select("venue,stars");if(error)throw error;const have={};(data||[]).forEach(r=>have[r.venue]=r.stars);
  const up=Object.entries(want).filter(([k,s])=>have[k]!==s).map(([venue,stars])=>({user_id:C.user.id,venue,stars}));
  const del=Object.keys(have).filter(k=>!want[k]);
  if(up.length){const {error:e1}=await sb.from("venue_ratings").upsert(up);if(e1)throw e1;}
  if(del.length){const {error:e2}=await sb.from("venue_ratings").delete().in("venue",del);if(e2)throw e2;}
  if(up.length||del.length)SCORES=null;}
let rateT=0;addEventListener("shack:store",ev=>{if(!ev.detail||ev.detail.key!=="shack-plog"||!prof||!prof.share_ratings)return;clearTimeout(rateT);rateT=setTimeout(()=>syncRatings().catch(()=>{}),3000);});
let SCORES=null,scoresAt=0,scoring=false;
async function scores(){if(SCORES&&Date.now()-scoresAt<10*60e3)return SCORES;if(scoring)return null;scoring=true;
  try{const rows=await SH.rpc("venue_scores",{});SCORES={};(rows||[]).forEach(r=>SCORES[r.venue]=r);scoresAt=Date.now();}catch(e){SCORES=SCORES||{};}
  scoring=false;return SCORES;}

/* ===== photo stamps: one photo per stamped venue, shrunk on your phone first, kept private in your own folder ===== */
const PH=()=>SH.store.get("shack-photos",{})||{};   // {venue key: storage path}; syncs, so the photo shows on all your devices
const urls={};
async function urlFor(path){if(urls[path])return urls[path];const sb=await C.client();const {data}=await sb.storage.from("stamps").createSignedUrl(path,3600);
  if(data&&data.signedUrl)urls[path]=data.signedUrl;return urls[path]||null;}
async function shrink(file){const src=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src;});
  const s=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*s);c.height=Math.round(img.naturalHeight*s);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);let blob=null;
  for(const q of [.82,.7,.6,.5,.4]){blob=await new Promise(r=>c.toBlob(r,"image/jpeg",q));if(blob&&blob.size<290000)return blob;}return blob;}finally{URL.revokeObjectURL(src);}}
async function addPhoto(k,file,box){if(!C.user)return;box.querySelector(".bphoto-s").textContent="Uploading…";
  try{const blob=await shrink(file);if(!blob||blob.size>=300000)throw new Error("big");const sb=await C.client(),path=`${C.user.id}/${rid(10)}.jpg`;
    const {error}=await sb.storage.from("stamps").upload(path,blob,{contentType:"image/jpeg",upsert:false});if(error)throw error;
    const map=PH(),old=map[k];map[k]=path;SH.store.set("shack-photos",map);if(old)sb.storage.from("stamps").remove([old]).catch(()=>{});
    box.dataset.done="";decorate();}
  catch(e){box.querySelector(".bphoto-s").textContent=/big/.test(String(e&&e.message))?"That photo's too big even after shrinking.":/limit|policy|row-level/i.test(String(e&&e.message))?"You've hit the 100-photo limit. Remove one first.":"Couldn't upload. Try again.";}}
async function removePhoto(k){const map=PH(),old=map[k];if(!old)return;delete map[k];SH.store.set("shack-photos",map);
  try{const sb=await C.client();await sb.storage.from("stamps").remove([old]);}catch(e){}decorate();}
document.addEventListener("change",ev=>{const i=ev.target.closest("[data-so-photo]");if(!i||!i.files||!i.files[0])return;ev.stopPropagation();addPhoto(i.dataset.soPhoto,i.files[0],i.closest(".bphoto"));},true);
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-so-unphoto]");if(!b)return;ev.stopPropagation();ev.preventDefault();if(confirm("Remove this photo?"))removePhoto(b.dataset.soUnphoto);},true);

/* ===== decorate whatever's on screen: photo row in the passport log, ratings on venue cards, friends on show cards ===== */
let decoT=0;
function decorate(){clearTimeout(decoT);decoT=setTimeout(doDecorate,200);}
// only touch the page when something changed (keeps the watcher quiet). Compares what we last wrote, not textContent,
// because neon.js swaps the emoji for an icon after we write it.
const setText=(el,t)=>{if(el.dataset.t!==t){el.dataset.t=t;el.textContent=t;}};
async function doDecorate(){const list=document.body;
  // sign-in box gets the friends panel right under it
  const cl=document.getElementById("bCloud");if(cl&&!document.getElementById("bSocial"))cl.insertAdjacentHTML("afterend",window.shackSocialHTML());
  // photo on the open passport stamp
  const pf=list.querySelector(".bplog [data-pform]");
  if(pf){const k=pf.dataset.pform,panel=pf.closest(".bplog");let box=panel.querySelector(".bphoto");
    const path=PH()[k],sig=(C.user?"u":"")+(path||"");
    if(!box||box.dataset.k!==k||box.dataset.done!==sig){if(box)box.remove();
      panel.querySelector(".bplog-h").insertAdjacentHTML("afterend",C.user?`<div class="bphoto" data-k="${E(k)}" data-done="${E(sig)}">${path?`<img alt="Your photo from here" loading="lazy">`:""}
        <label class="bpass-share">📷 ${path?"Change photo":"Add a photo"}<input type="file" accept="image/*" data-so-photo="${E(k)}" hidden></label>${path?`<button type="button" class="bpass-share" data-so-unphoto="${E(k)}">Remove</button>`:""}<span class="bphoto-s bcloud-s" aria-live="polite"></span></div>`
        :`<div class="bphoto" data-k="${E(k)}" data-done=""><button type="button" class="bpass-share" data-yopen="1">📷 Sign in on You to add a photo to this stamp</button></div>`);
      box=panel.querySelector(".bphoto");
      if(path){const img=box.querySelector("img");urlFor(path).then(u=>{if(u&&img)img.src=u;else if(img)img.remove();}).catch(()=>{});}}}
  // Shack ratings on venue cards
  const vcards=list.querySelectorAll(".vcard [data-pinv]");
  if(vcards.length){const S=await scores();if(S)vcards.forEach(b=>{const c=b.closest(".vcard"),s=S[b.dataset.pinv],old=c.querySelector(".vscore");
    if(!s){if(old)old.remove();return;}const txt=`★ ${(+s.avg_stars).toFixed(1)} · ${s.n} Shack rating${s.n===1?"":"s"}`;if(old){setText(old,txt);return;}
    let tags=c.querySelector(".vtags");if(!tags){const o=c.querySelector(".vopen");if(!o)return;o.insertAdjacentHTML("beforeend",'<span class="vtags"></span>');tags=c.querySelector(".vtags");}
    tags.insertAdjacentHTML("afterbegin",`<span class="tag vscore" data-t="${E(txt)}">${E(txt)}</span>`);});}
  // friends who starred the same show
  const who={};(friends||[]).forEach(f=>(Array.isArray(f.stars)?f.stars:[]).forEach(k=>{(who[k]=who[k]||[]).push(f.name);}));
  list.querySelectorAll("button[data-star]").forEach(b=>{const face=b.closest(".body")||b.closest(".ev")||b.parentNode,old=face.querySelector(".fgo"),ns=who[b.dataset.star];
    if(!ns){if(old)old.remove();return;}const txt=`👥 ${ns.slice(0,3).join(", ")}${ns.length>3?` +${ns.length-3}`:""} starred this too`;
    if(old){setText(old,txt);return;}face.insertAdjacentHTML("beforeend",`<p class="fgo" data-t="${E(txt)}">${E(txt)}</p>`);});}
// cards show up in several places (Shows, home picks, Saved, Venues), so watch the whole page for new ones
new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&!(n.matches&&n.matches(".fgo,.vscore,.vtags,.bphoto,#bSocial")))))decorate();}).observe(document.body,{childList:true,subtree:true});
addEventListener("shack:store",ev=>{if(ev.detail&&(ev.detail.key==="shack-photos"))decorate();});
decorate();
})();
