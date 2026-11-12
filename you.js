/* ---- The Show Shack · You tab. One place for your account, sync, reminders, friends, sharing and help:
   · You sheet (bottom tab): sign-in + sync (cloud.js), reminders (push), friends + leaderboard (social.js), Share, report a
     missing show, settings, and for the owner: Review (flyer shows + missing-show reports + weekly coverage gaps).
   · Share sheet: one place for every kind of share (passport picture, compare passports, invite a friend, send a night).
   · Gentle sign-in nudge after your 3rd ★ (once). One-time explainer of ★ Interested / Follow / ✓ Been on Saved.
   · Offline: anything that needs the internet says so instead of failing quietly.
   · Empty search: venue suggestions + "add it from a flyer" / "tell us it's missing". ---- */
(()=>{
if(!window.SH||!window.SHACK_CLOUD)return;
const C=window.SHACK_CLOUD,$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(m,a,f)=>{if(window.NIGHT&&NIGHT.toast)NIGHT.toast(m,a,f);};
const dlgOpen=d=>{if(!d.open){if(d.showModal)d.showModal();else d.setAttribute("open","");}},dlgClose=d=>{d.close?d.close():d.removeAttribute("open");};
const VAPID="BEtEpmMDVDp_B9DwYCAcK_whdpEXTK1sHCgId6DHcv1EFGUWwJoieTdvSiy01DmAExShwfzWu4PA3yJzIhb9-nc";   // public half of the push key (safe to publish)
let admin=false,review=null,remState=null,remMsg="",missMsg="",missDraft="";

/* ===== offline: say so up front for things that need the internet ===== */
const NEEDS_NET="[data-cl],[data-cl-form] button,[data-so],[data-so-form] button,#bFlyAdd,[data-fly='signin'],[data-rem],[data-miss-form] button,[data-adm],[data-qflyer]";
addEventListener("click",ev=>{if(navigator.onLine)return;const t=ev.target.closest(NEEDS_NET);if(!t||t.matches("[data-cl='x'],[data-rem='close']"))return;
  ev.preventDefault();ev.stopImmediatePropagation();say("That needs internet. You're offline right now, so try again once you're back.");},true);
addEventListener("submit",ev=>{if(navigator.onLine)return;if(!ev.target.closest("[data-cl-form],[data-so-form],[data-fly-form],[data-miss-form]"))return;
  ev.preventDefault();ev.stopImmediatePropagation();say("That needs internet. You're offline right now, so try again once you're back.");},true);

/* ===== the You sheet ===== */
function youHTML(){const u=C.user,owner=SH.store.raw("shack-owner")==="1";
  return `<button type="button" class="binfo-x" data-close aria-label="Close">✕</button>
    <p class="binfo-kick"><img class="bshack-ic" src="hut.webp?v=2" alt="">you</p>
    <h2 id="bYouH">${u?"Hey"+(u.email?", <span class='byou-mail'>"+E(u.email)+"</span>":""):"Make the Shack yours"}</h2>
    ${u?"":`<p class="bset-p">Everything works without an account. Sign in (just your email, free) to sync across devices, get reminders and see friends.</p>`}
    ${badgeSec()}
    <section class="byou-sec"><h3>☁ Account &amp; sync</h3>${window.shackCloudHTML?shackCloudHTML():""}</section>
    <section class="byou-sec"><h3>🔔 Reminders</h3><div id="bRem">${remHTML()}</div></section>
    <section class="byou-sec"><h3>👥 Friends &amp; leaderboard</h3>${window.shackSocialHTML?shackSocialHTML():""}</section>
    <section class="byou-sec"><h3>↗ Share</h3><p class="bset-p">Your year, your passport, a night plan, or the Shack itself.</p><div class="bset-acts"><button type="button" data-yshare="all">Open the Share sheet</button></div></section>
    <section class="byou-sec"><h3>🏷 Missing a show?</h3><div id="bMiss">${missHTML()}</div></section>
    ${u&&(admin||owner)?`<section class="byou-sec byou-adm"><h3>📊 Owner: review</h3><div id="bAdm">${admHTML(owner)}</div></section>`:""}
    <div class="bset-acts"><button type="button" data-yset>Settings &amp; your data</button></div>
    <button type="button" class="binfo-ok" data-close>Done</button>`;}
// your badge tracker: same badges as the passport, earned ones first, locked ones filling in
function badgeSec(){const P=window.SHACK_PASS;if(!P||!P.badgesHtml)return "";let b;try{b=P.badgesHtml();}catch(e){return "";}
  const st=P.stamps,sh=P.shows;
  return `<section class="byou-sec byou-badges"><h3>🏆 Your badges <span class="byou-n">${b.earned} of ${b.total}</span></h3>
    <div class="byou-bar" role="img" aria-label="${b.earned} of ${b.total} badges earned"><i style="width:${Math.round(b.earned/b.total*100)}%"></i></div>
    <p class="bset-p">${st} venue${st===1?"":"s"} stamped · ${sh} show${sh===1?"":"s"} logged</p>
    <div class="bbadges${allBadges?"":" clip"}">${b.html}</div>
    <div class="bset-acts"><button type="button" data-yball>${allBadges?"Show fewer":`Show all ${b.total} badges`}</button><button type="button" data-ypass>Open my passport</button></div></section>`;}
let allBadges=false;
document.addEventListener("click",ev=>{const t=ev.target.closest("[data-yball]");if(!t)return;ev.preventDefault();allBadges=!allBadges;
  const g=t.closest(".byou-badges").querySelector(".bbadges");g.classList.toggle("clip",!allBadges);t.textContent=allBadges?"Show fewer":t.textContent.replace("Show fewer","Show all badges");if(!allBadges)t.closest(".byou-badges").scrollIntoView({block:"start",behavior:"smooth"});},true);
function ensureDialog(id,label){let d=$(id);if(!d){d=document.createElement("dialog");d.id=id;d.className="binfo bset byou";d.setAttribute("aria-labelledby",label);d.innerHTML=`<div class="binfo-in"></div>`;document.body.appendChild(d);
  d.addEventListener("click",ev=>{if(ev.target===d||ev.target.closest("[data-close]"))dlgClose(d);});}return d;}
function openYou(focus){const d=ensureDialog("bYou","bYouH");d.querySelector(".binfo-in").innerHTML=youHTML();dlgOpen(d);
  if(C.user)refreshAdmin();refreshRem();
  if(focus==="signin"){const b=d.querySelector('[data-cl="in"]');if(b)b.click();}
  if(focus==="missing"){const i=d.querySelector("[data-miss-form] textarea");if(i){i.scrollIntoView({block:"center"});i.focus();}}}
function redrawYou(){const d=$("bYou");if(d&&d.open){const top=d.querySelector(".binfo-in").scrollTop;d.querySelector(".binfo-in").innerHTML=youHTML();d.querySelector(".binfo-in").scrollTop=top;}}
C.onUser(()=>{admin=false;review=null;redrawYou();if(C.user)refreshAdmin();});
window.SHACK_YOU={open:openYou};

// bottom tab + header gear → You / Settings
const tabs=$("bTabs");
if(tabs&&!$("bYouTab")){tabs.insertAdjacentHTML("beforeend",`<button type="button" id="bYouTab" aria-haspopup="dialog"><svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>You</button>`);}
document.addEventListener("click",ev=>{
  if(ev.target.closest("#bYouTab,[data-yopen]")){ev.preventDefault();ev.stopPropagation();openYou();return;}
  if(ev.target.closest("[data-ypass]")){const y=$("bYou");if(y)dlgClose(y);if(window.SHACK_PASS)SHACK_PASS.open();return;}
  if(ev.target.closest("[data-yset]")){const y=$("bYou");if(y)dlgClose(y);const g=$("bSetBtn");if(g)g.click();return;}
  const sh=ev.target.closest("[data-yshare]");if(sh){ev.preventDefault();ev.stopPropagation();openShare();return;}},true);

/* ===== reminders (web push) ===== */
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const canPush=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const b64=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");const r=atob(s+"===".slice((s.length+3)%4));return Uint8Array.from(r,c=>c.charCodeAt(0));};
async function swReg(){if(!("serviceWorker" in navigator))return null;return Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),2500))]);}
async function refreshRem(){if(!C.user){remState=null;drawRem();return;}
  try{const reg=await swReg();const sub=reg&&await reg.pushManager.getSubscription();let row=null;
    if(sub){const sb=await C.client();const {data}=await sb.from("push_subscriptions").select("remind_day_before,price_drops").eq("endpoint",sub.endpoint).maybeSingle();row=data;}
    remState={on:!!(sub&&row),tmrw:row?row.remind_day_before:true,drop:row?row.price_drops:true,reg:!!reg};}catch(e){remState={on:false,tmrw:true,drop:true,reg:false};}
  drawRem();}
function remHTML(){if(!C.user)return `<p class="bset-p">Sign in above, then turn on a ping the day before shows you're interested in (★) and when their price drops.</p>`;
  if(!canPush())return `<p class="bset-p">This browser can't show notifications. Try Chrome or Safari, or add the Shack to your Home Screen.</p>`;
  if(isIOS&&!standalone)return `<p class="bset-p">On iPhone, reminders work from the Home Screen app: tap <b>Share → Add to Home Screen</b>, open the Shack from there, then turn this on.</p>`;
  const s=remState||{on:false,tmrw:true,drop:true,reg:true};
  return `<label class="bso-t"><input type="checkbox" data-rem="tmrw"${s.tmrw?" checked":""}> The day before a show I'm interested in</label>
    <label class="bso-t"><input type="checkbox" data-rem="drop"${s.drop?" checked":""}> When a show I'm interested in drops in price</label>
    <div class="bset-acts">${s.on?`<button type="button" data-rem="test">Send me a test</button><button type="button" data-rem="off">Turn reminders off on this device</button>`:`<button type="button" data-rem="on">Turn on reminders</button>`}</div>
    ${remMsg?`<p class="bset-msg">${E(remMsg)}</p>`:""}${s.on?`<p class="bset-p">On for this device · sent around 9 AM.</p>`:""}`;}
function drawRem(){const el=$("bRem");if(el)el.innerHTML=remHTML();}
async function remOn(){remMsg="";const reg=await swReg();if(!reg){remMsg="Open the Shack from its web address or Home Screen app (not a preview) and try again.";drawRem();return;}
  const perm=await Notification.requestPermission();if(perm!=="granted"){remMsg="Notifications are blocked. Allow them for the Shack in your browser or phone settings, then try again.";drawRem();return;}
  const sub=(await reg.pushManager.getSubscription())||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
  const j=sub.toJSON(),sb=await C.client(),box=$("bRem");
  const tm=box?box.querySelector('[data-rem="tmrw"]').checked:true,dr=box?box.querySelector('[data-rem="drop"]').checked:true;
  const {error}=await sb.from("push_subscriptions").upsert({endpoint:j.endpoint,user_id:C.user.id,p256dh:j.keys.p256dh,auth_key:j.keys.auth,remind_day_before:tm,price_drops:dr});
  if(error){remMsg=/cap/.test(error.message)?"Reminders are already on for 6 devices. Turn one off first.":"Couldn't save that. Try again.";drawRem();return;}
  remMsg="Reminders are on ✓";await refreshRem();}
async function remOff(){const reg=await swReg();const sub=reg&&await reg.pushManager.getSubscription();
  if(sub){try{const sb=await C.client();await sb.from("push_subscriptions").delete().eq("endpoint",sub.endpoint);}catch(e){}try{await sub.unsubscribe();}catch(e){}}
  remMsg="Reminders are off on this device.";await refreshRem();}
async function remSave(){const reg=await swReg();const sub=reg&&await reg.pushManager.getSubscription();if(!sub)return;const box=$("bRem");
  const sb=await C.client();await sb.from("push_subscriptions").update({remind_day_before:box.querySelector('[data-rem="tmrw"]').checked,price_drops:box.querySelector('[data-rem="drop"]').checked}).eq("endpoint",sub.endpoint);remMsg="Saved ✓";drawRem();}
async function remTest(){try{const sb=await C.client();const {data}=await sb.auth.getSession();const r=await fetch(SH.sb.url+"/functions/v1/reminders",{method:"POST",headers:{"Content-Type":"application/json",apikey:SH.sb.key,Authorization:"Bearer "+data.session.access_token},body:JSON.stringify({test:true})});
  const j=await r.json();remMsg=j.sent?"Test sent ✓ It should pop up in a few seconds.":"Couldn't reach this device. Turn reminders off and on again.";}catch(e){remMsg="Couldn't send the test. Try again.";}drawRem();}
document.addEventListener("click",ev=>{const b=ev.target.closest("button[data-rem]");if(!b)return;ev.preventDefault();const a=b.dataset.rem;b.disabled=true;
  (a==="on"?remOn():a==="off"?remOff():a==="test"?remTest():Promise.resolve()).catch(()=>{remMsg="Something went wrong. Try again.";drawRem();});},true);
document.addEventListener("change",ev=>{if(ev.target.closest("input[data-rem]")&&remState&&remState.on)remSave().catch(()=>{});},true);

/* ===== report a missing show ===== */
function missHTML(){if(!C.user)return `<p class="bset-p">Know a show that's not on here? Sign in above and tell us, or add it yourself from a flyer on Home.</p><div class="bset-acts"><button type="button" data-qflyer>📸 Add one from a flyer</button></div>`;
  return `<form class="bmiss-f" data-miss-form><textarea name="w" maxlength="300" rows="2" required placeholder="Artist, venue and date, e.g. Khruangbin at the Observatory, Dec 12">${E(missDraft)}</textarea>
    <input name="l" type="url" maxlength="300" placeholder="Link to the listing (optional)"><button type="submit" class="bpass-share">Send it in</button></form>${missMsg?`<p class="bset-msg">${E(missMsg)}</p>`:""}`;}
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-miss-form]");if(!f)return;ev.preventDefault();ev.stopPropagation();
  const what=f.w.value.trim(),link=f.l.value.trim();if(what.length<3)return;
  try{const sb=await C.client();const {error}=await sb.from("missing_reports").insert({user_id:C.user.id,what,link:/^https?:\/\//.test(link)?link:null});if(error)throw error;missMsg="Thanks! We'll look for it and add it.";missDraft="";}
  catch(e){missMsg=/cap/.test(String(e&&e.message))?"That's 10 for today, thanks! Try again tomorrow.":"Couldn't send that. Try again.";}
  const el=$("bMiss");if(el)el.innerHTML=missHTML();if(admin)refreshAdmin();},true);

/* ===== owner review: flyer shows, missing-show reports, coverage gaps ===== */
async function refreshAdmin(){if(!C.user)return;try{const sb=await C.client();const {data}=await sb.rpc("is_admin");admin=!!data;
  if(admin){const r=await sb.rpc("admin_review");review=r.data||null;}
  const s=$("bYou");if(s&&s.open&&(admin||SH.store.raw("shack-owner")==="1")){if(!$("bAdm"))redrawYou();else $("bAdm").innerHTML=admHTML(SH.store.raw("shack-owner")==="1");}}catch(e){}}
let COV=null;fetch("coverage.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).then(j=>{COV=j;}).catch(()=>{});
function admHTML(owner){if(!admin)return owner?`<p class="bset-p">You opened owner mode on this phone. Make this account the Shack's admin to review flyer shows and reports. (Only works once, for the first person.)</p><div class="bset-acts"><button type="button" data-adm="claim">Make me the admin</button></div>`:"";
  if(!review)return `<p class="bset-p">Loading…</p>`;
  const fl=review.flyers||[],ms=review.missing||[],d=s=>new Date(s+"T12:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const listed=new Set((state.events||[]).filter(e=>!e.community).map(e=>e.start+"|"+String(e.venue).toLowerCase()));
  return `<p class="bset-p"><b>${fl.length}</b> flyer show${fl.length===1?"":"s"} · <b>${ms.length}</b> missing-show report${ms.length===1?"":"s"}</p>
    ${fl.length?`<ul class="badm-list">${fl.map(x=>`<li class="${x.status==="hidden"?"off":""}"><div><b>${E(x.title)}</b><span>${E(d(x.start))} · ${E(x.venue)}, ${E(x.city)}${x.reports?` · ⚠ ${x.reports} report${x.reports>1?"s":""}`:""}${listed.has(x.start+"|"+String(x.venue).toLowerCase())?" · now on the official list":""}</span></div>
      ${x.flyer_path?`<a class="bpass-share" href="${E(SH.sb.url+"/storage/v1/object/public/flyers/"+x.flyer_path)}" target="_blank" rel="noopener">Flyer</a>`:""}<button type="button" class="bpass-share" data-adm="${x.status==="hidden"?"show":"hide"}" data-id="${E(x.id)}">${x.status==="hidden"?"Restore":"Hide"}</button></li>`).join("")}</ul>`:""}
    ${ms.length?`<h4 class="badm-h">Missing shows people asked for</h4><ul class="badm-list">${ms.map(x=>`<li><div><b>${E(x.what)}</b><span>${E(new Date(x.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}))}${x.link?` · <a href="${E(x.link)}" target="_blank" rel="noopener">link ↗</a>`:""}</span></div><button type="button" class="bpass-share" data-adm="added" data-id="${E(x.id)}">Added</button><button type="button" class="bpass-share" data-adm="skip" data-id="${E(x.id)}">Skip</button></li>`).join("")}</ul>`:""}
    ${COV&&COV.gaps&&COV.gaps.length?`<h4 class="badm-h">Venues that may be missing shows (weekly check, ${E(COV.checked||"")})</h4><ul class="badm-list">${COV.gaps.slice(0,12).map(g=>`<li><div><b>${E(g.venue)}</b><span>We list ${g.ours} · Ticketmaster has ${g.tm} in the next 60 days</span></div></li>`).join("")}</ul>`:""}`;}
document.addEventListener("click",async ev=>{const b=ev.target.closest("[data-adm]");if(!b)return;ev.preventDefault();ev.stopPropagation();const a=b.dataset.adm,id=b.dataset.id;b.disabled=true;
  try{const sb=await C.client();
    if(a==="claim"){const {data,error}=await sb.rpc("claim_admin");if(error)throw error;say(data?"You're the admin ✓":"Someone already claimed admin.");}
    if(a==="hide"||a==="show")await sb.rpc("admin_set_show",{p_id:id,p_status:a==="hide"?"hidden":"live"});
    if(a==="added"||a==="skip")await sb.rpc("admin_set_missing",{p_id:id,p_status:a==="added"?"added":"skipped"});
    await refreshAdmin();}catch(e){b.disabled=false;say("Couldn't do that. Try again.");}},true);

/* ===== the Share sheet ===== */
function shareHTML(){const nights=window.NIGHT&&NIGHT.allNights?NIGHT.allNights().filter(x=>x.p.s.length).slice(0,4):[],stamps=window.SHACK_PASS?SHACK_PASS.stamps:0;
  const row=(k,ic,t,p)=>`<button type="button" class="bshr" data-shr="${k}"><i aria-hidden="true">${ic}</i><span><b>${t}</b><small>${p}</small></span></button>`;
  return `<button type="button" class="binfo-x" data-close aria-label="Close">✕</button><p class="binfo-kick"><img class="bshack-ic" src="hut.webp?v=2" alt="">share</p><h2 id="bShareH">What do you want to share?</h2>
    <div class="bshr-list">
      ${nights.length?`<p class="bshr-h">A night plan ${C.user?"(the link keeps updating as you edit)":"(sign in on You and the link keeps updating)"}</p>${nights.map(x=>`<button type="button" class="bshr" data-shr="night" data-id="${E(x.id)}"><i aria-hidden="true">🌙</i><span><b>${E(x.p.t||"Our night")}</b><small>${E([x.p.d?new Date(x.p.d+"T12:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):"",x.p.s.length+" stop"+(x.p.s.length>1?"s":"")].filter(Boolean).join(" · "))}</small></span></button>`).join("")}`:""}
      <p class="bshr-h">Your passport</p>
      ${stamps?row("year","🎟","My year in shows","A picture of your stamps and badges"):""}
      ${stamps?row("compare","👥","Compare passports","A link a friend opens to see what you both have"):""}
      ${!stamps?`<p class="bset-p">Stamp a venue (Venues → I've been here) to share your passport.</p>`:""}
      <p class="bshr-h">The Shack</p>
      ${row("invite","🤙",C.user?"Invite a friend":"Share the Shack",C.user?"They join as your friend on the Shack":"Send the app to a friend")}
    </div><button type="button" class="binfo-ok" data-close>Done</button>`;}
function openShare(){const y=$("bYou");if(y&&y.open)dlgClose(y);const d=ensureDialog("bShareDlg","bShareH");d.querySelector(".binfo-in").innerHTML=shareHTML();dlgOpen(d);}
window.SHACK_SHARE={open:openShare};
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-shr]");if(!b)return;ev.preventDefault();ev.stopPropagation();const k=b.dataset.shr;
  if(k==="year"&&window.SHACK_PASS)SHACK_PASS.shareYear(b.querySelector("b"));
  if(k==="compare"&&window.SHACK_PASS)SHACK_PASS.compare(b.querySelector("b"));
  if(k==="night"&&window.NIGHT&&NIGHT.shareNight){const x=NIGHT.allNights().find(n=>n.id===b.dataset.id);if(x)NIGHT.shareNight(x.p,b.querySelector("b"),x.id);}
  if(k==="invite"){const inv=document.querySelector('[data-so="invite"]');if(C.user&&inv)inv.click();else if(C.user){openYou();setTimeout(()=>{const i=document.querySelector('[data-so="invite"]');if(i)i.click();else say("Pick your name in Friends first, then invite.");},400);}else{const s=$("shareApp");if(s)s.click();}}},true);

/* ===== sign-in nudge after your 3rd ★ (once) ===== */
addEventListener("shack:store",ev=>{if(!ev.detail||ev.detail.key!=="radar-stars"||C.user||SH.store.raw("shack-nudge-signin"))return;
  if((state.stars||new Set()).size>=3){SH.store.put("shack-nudge-signin","1");setTimeout(()=>say("Keep your ★ shows on all your devices, with reminders the day before?","Sign in",()=>openYou("signin")),400);}});

/* ===== Saved: a one-time explainer of ★ / Follow / ✓ ===== */
function explainer(){if(!window.BUI||BUI.screen!=="saved"||SH.store.raw("shack-explain-saved"))return;const list=$("list");if(!list||list.querySelector(".bexpl"))return;
  list.insertAdjacentHTML("afterbegin",`<div class="bexpl" role="note"><b>Three ways to keep track</b>
    <span><i>★</i><b>Interested</b> shows you might go to. They live here, and remind you the day before.</span>
    <span><i>🔔</i><b>Follow</b> venues to watch. A dot on Venues means they added a show.</span>
    <span><i>✓</i><b>Been</b> venues you've been to. They stamp your passport.</span>
    <button type="button" class="bpass-share" data-explx>Got it</button></div>`);}
document.addEventListener("click",ev=>{if(ev.target.closest("[data-explx]")){SH.store.put("shack-explain-saved","1");const x=document.querySelector(".bexpl");if(x)x.remove();}},true);
const L=$("list");if(L)new MutationObserver(()=>explainer()).observe(L,{childList:true});

/* ===== empty search: venue suggestions + add it ===== */
document.addEventListener("click",ev=>{
  const v=ev.target.closest("[data-qvenue]");if(v){ev.preventDefault();ev.stopPropagation();const q=$("q");if(q){q.value="";q.dispatchEvent(new Event("input",{bubbles:true}));}state.q="";state.venue=v.dataset.qvenue;state.kind="all";state.when="any";render();return;}
  if(ev.target.closest("[data-qflyer]")){ev.preventDefault();ev.stopPropagation();const y=$("bYou");if(y&&y.open)dlgClose(y);if(window.SHACK_FLYER)SHACK_FLYER.open();return;}
  const m=ev.target.closest("[data-qmiss]");if(m){ev.preventDefault();ev.stopPropagation();missDraft=m.dataset.qmiss;openYou(C.user?"missing":"signin");}},true);
})();
