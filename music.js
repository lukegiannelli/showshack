/* ---- The Show Shack · Match my music. Optional, and none of it needs a music login:
   · public links, as many as you like, they stack: SoundCloud profiles (everyone you follow + your likes) and YouTube Music /
     Spotify / Apple Music playlists. The "music" function reads the public page and hands back artist names; nothing is kept there.
   · or type a few artists you love (works right away)
   What syncs with your account (cloud.js, key "shack-music"): just your links, typed names and muted artists, so it stays tiny.
   The artists each link gave are kept on this device only ("shack-music-cache", can be thousands), and every device re-reads
   your links itself every couple of days, so new follows, likes and songs show up without pasting anything again.
   Then: shows by artists you listen to, plus shows in the genres those artists play at the Shack → "For your ears" on Home.
   You can see every artist it found, and mute any you don't want matched. ---- */
(()=>{
if(!window.SH)return;
const K="shack-music",KC="shack-music-cache",$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/\+/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const NAME={soundcloud:"SoundCloud",youtube:"YouTube Music",spotify:"Spotify",apple:"Apple Music",typed:"you typed"};
const ICON={soundcloud:"☁️",youtube:"▶️",spotify:"🟢",apple:"🍎"};
const GNAME={electronic:"electronic",hiphop:"hip-hop",indie:"indie & rock",reggae:"reggae",latin:"latin",pop:"pop",jazz:"jazz & soul"};
const srcOf=u=>/soundcloud/i.test(u)?"soundcloud":/youtu/i.test(u)?"youtube":/apple\.com/i.test(u)?"apple":"spotify";
// one id per playlist/profile, whatever extra bits the share link carries (?si=…, &feature=…, music. vs www.)
const keyOf=u=>{u=String(u||"");let m;
  if((m=/[?&]list=([A-Za-z0-9_-]+)/.exec(u)))return "yt:"+m[1];
  if((m=/spotify\.com\/(?:[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]+)/i.exec(u)))return "sp:"+m[2];
  if((m=/soundcloud\.com\/([A-Za-z0-9_-]+)/i.exec(u))&&!/^on$/i.test(m[1]))return "sc:"+m[1].toLowerCase();
  return u.replace(/^https?:\/\/(www\.)?/,"").split("?")[0].replace(/\/$/,"").toLowerCase();};
const AGE=2*864e5,MAXLINKS=12;   // re-read saved links older than 2 days; up to 12 links
const ago=t=>{const d=Math.floor((Date.now()-(t||0))/864e5);return d<1?"today":d===1?"yesterday":d+" days ago";};
const plural=(n,w)=>`${n.toLocaleString()} ${w}${n===1?"":"s"}`;

/* ===== saved state ===== */
// M (synced): {typed:[names], links:[{u,src,t}], mute:[names]}.  C (this device): {[link]: {a:[names], c:[counts], at, err}}
let M=null,C={},msg="",adding=false,refreshing=false,showArt=false,selfSave=false;
const blank=()=>({typed:[],links:[],mute:[]});
function loadM(){const v=SH.store.get(K,null);if(!v||typeof v!=="object")return null;
  const o={typed:[...new Set(v.typed||[])],links:[],mute:[...new Set(v.mute||[])]};
  // older saves: one flat list (typed or from one link), or links that carried their artists inside
  if(!v.typed&&!v.links&&Array.isArray(v.artists)){const n=v.artists.map(a=>a.n).filter(Boolean);if(v.src==="typed")o.typed=n;else if(n.length)o.links.push({u:"",src:v.src||"",t:"",old:n});}
  const seen=new Set();
  for(const l of v.links||[]){if(l.u){const k=keyOf(l.u);if(seen.has(k))continue;seen.add(k);}
    const x={u:l.u||"",src:l.src||srcOf(l.u||""),t:l.t||""};
    if(Array.isArray(l.a)&&l.a.length){if(l.u){if(!C[l.u])C[l.u]={a:l.a,at:l.at||0};}else x.old=l.a;}   // move old in-link lists to this device's cache
    else if(Array.isArray(l.old))x.old=l.old;
    o.links.push(x);}
  return (o.typed.length||o.links.length||o.mute.length)?o:null;}
function save(){selfSave=true;try{saveM();}finally{selfSave=false;}}
function saveM(){if(!M||(!M.typed.length&&!M.links.length)){M=null;SH.store.del(K);}else SH.store.set(K,{v:3,typed:M.typed,links:M.links.map(l=>({u:l.u,src:l.src,t:l.t||"",...(l.old?{old:l.old}:{})})),mute:M.mute});
  // keep the cache to links we still have
  const keep={};for(const l of (M&&M.links)||[])if(l.u&&C[l.u])keep[l.u]=C[l.u];C=keep;saveC();}
function saveC(){if(!SH.store.set(KC,C)){/* storage full: keep the biggest lists short */for(const u in C)C[u].a=(C[u].a||[]).slice(0,300);SH.store.set(KC,C);}}
try{C=SH.store.get(KC,{})||{};}catch(e){C={};}
M=loadM();if(M&&M.links.some(l=>l.u&&C[l.u]))saveC();

/* ===== your artists: typed first, then every link's artists (most-played first), minus muted ===== */
let ART=[];
function build(){ART=[];if(!M)return ART;const score=new Map(),mute=new Set(M.mute.map(N));
  const add=(n,s,w)=>{const k=N(n);if(!k||mute.has(k))return;const o=score.get(k);if(o){o.w+=w;if(!o.from.includes(s))o.from.push(s);}else score.set(k,{n,k,w,s,from:[s]});};
  for(const n of M.typed)add(n,"typed",1e6);
  for(const l of M.links){const c=l.u?C[l.u]:null,a=c?c.a||[]:l.old||[],w=c&&c.c;a.forEach((n,i)=>add(n,l.src,(w&&w[i])||Math.max(1,3-i/100)));}
  ART=[...score.values()].sort((a,b)=>b.w-a.w).slice(0,4000);return ART;}
build();

/* ===== typed lists: commas split artists, except names that have a comma in them ===== */
const COMMA=["Tyler, The Creator","Earth, Wind & Fire","Crosby, Stills, Nash & Young","Crosby, Stills & Nash","Emerson, Lake & Palmer","Peter, Bjorn and John",
  "Black Country, New Road","Blood, Sweat & Tears","Now, Now"];
function splitTyped(s){const held=[];let t=String(s||"");
  for(const n of COMMA)t=t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`\u0001${held.push(m)-1}\u0001`);
  return [...new Set(t.split(/[,\n]+/).map(x=>x.replace(/\u0001(\d+)\u0001/g,(_,i)=>held[+i]).trim()).filter(x=>x.length>=2))].slice(0,200);}

/* ===== matching ===== */
// an act counts only as a whole: the title starts with it and then ends or breaks (":", "-", "&", "w/", "with"…),
// or it's one of the listed artists. So "Drake" doesn't match "Drake Milligan". Names that have a comma or "&" in them
// ("Tyler, The Creator", "Mumford & Sons") are looked for as whole words in the title + lineup instead.
const acts=e=>{const t=String(e.title||"").toLowerCase(),parts=t.split(/\s*(?::|\s[-–—]\s|,|&|\+|\/|\(|\bw\/|\bwith\b|\bfeat\.?|\bft\.?|\band\b|\bx\b|\bpresents\b)\s*/);
  return [...parts,...String(e.artists||"").toLowerCase().split(/\s*(?:,|;|\/|&|\band\b|·)\s*/)].map(N).filter(Boolean);};
let IDX=null;
function index(){const one=new Map(),flat=new Map(),multi=[];
  for(const a of ART){if(a.k.length<3)continue;
    if(/[,&+]|\band\b/i.test(a.n)&&a.k.split(" ").length>=2)multi.push(a);
    else{if(!one.has(a.k))one.set(a.k,a);const f=a.k.replace(/ /g,"");if(f.length>=5&&!flat.has(f))flat.set(f,a);}}
  return IDX={one,flat,multi};}
function hitOf(e){const ix=IDX||index(),a=acts(e);
  for(const x of a){const h=ix.one.get(x)||ix.flat.get(x.replace(/ /g,""));if(h)return h;}
  if(ix.multi.length){const whole=" "+N(e.title+" "+(e.artists||""))+" ";for(const m of ix.multi)if(whole.includes(" "+m.k+" "))return m;}
  return null;}
let MEMO=null;
function matches(){if(!ART.length)return {mine:[],vibe:[],top:[]};
  const evs=(state._up||state.events||[]);const today=todayStr();if(MEMO&&MEMO.evs===evs&&MEMO.art===ART&&MEMO.today===today&&MEMO.n===evs.length)return MEMO.r;
  const up=evs.filter(e=>e.start&&e.start>=today&&["concert","club","festival"].includes(e.kind));
  const mine=[],ids=new Set(),w={};
  for(const e of up){const h=hitOf(e);if(h){mine.push({e,why:h.n,from:h.s});ids.add(e.id);for(const g of e.genres||[])w[g]=(w[g]||0)+1;}}
  const top=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  const score=e=>(e.genres||[]).reduce((s,g)=>s+(w[g]||0),0);
  const vibe=top.length?up.filter(e=>!ids.has(e.id)&&(e.genres||[]).some(g=>top.includes(g))).sort((a,b)=>score(b)-score(a)||a.start.localeCompare(b.start)).slice(0,10)
    .map(e=>({e,g:(e.genres||[]).filter(g=>top.includes(g)).sort((x,y)=>(w[y]||0)-(w[x]||0))[0]})):[];
  const r={mine:mine.sort((a,b)=>a.e.start.localeCompare(b.e.start)),vibe,top};MEMO={evs,art:ART,today,n:evs.length,r};return r;}

/* ===== Home row: For your ears (each pick says why it's there) ===== */
function drawRow(){if(!window.SHACK_FLIP||typeof state==="undefined")return;let box=$("bEarsBox");
  const r=matches(),list=[...r.mine.map(x=>({e:x.e,tag:`🎧 You play ${x.why}${x.from&&x.from!=="typed"&&NAME[x.from]?` · ${NAME[x.from]}`:""}`})),
    ...r.vibe.map(x=>({e:x.e,tag:`🎧 Your vibe: ${GNAME[x.g]||x.g||"your genres"}`}))].slice(0,12);
  if(!list.length){if(box)box.hidden=true;return;}
  if(!box){const anchor=$("bBecBox")||$("bDropBox");if(!anchor)return;anchor.insertAdjacentHTML("beforebegin",`<div class="bpicks bears" id="bEarsBox"><div class="bpicks-h"><h2 class="bsec">For your ears</h2><button type="button" class="blink" data-yopen="1">Your music</button></div><div class="bpick-row" id="bEars"></div></div>`);box=$("bEarsBox");$("bEars").addEventListener("click",SHACK_FLIP.click,true);}
  box.hidden=false;const sig=list.map(x=>x.e.id+x.tag).join("|");if($("bEars").dataset.sig===sig)return;$("bEars").dataset.sig=sig;
  $("bEars").innerHTML=list.map(x=>SHACK_FLIP.html(x.e,`<i style="--vc:#7FD4FF"></i>${E(x.tag)}`)).join("");}

/* ===== reading links ===== */
// the read gives up after 60 s so a stuck request can never lock the section
async function readLink(link){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),60000);
  try{const r=await fetch(SH.sb.url+"/functions/v1/music",{method:"POST",headers:{"Content-Type":"application/json",apikey:SH.sb.key},body:JSON.stringify({link}),signal:ctl.signal});
    let j=null;try{j=await r.json();}catch(e){}return j||{error:"Couldn't read that link right now. Try again in a minute."};}
  catch(e){return {error:navigator.onLine===false?"You're offline. Try again once you're back.":"That took too long. Try again in a minute."};}
  finally{clearTimeout(t);}}
const keep=(u,j)=>{C[u]={a:j.artists.map(a=>a.n),c:j.artists.map(a=>a.c||1),at:Date.now()};};
function changed(){IDX=null;MEMO=null;build();const b=$("bEars");if(b)b.dataset.sig="";drawRow();redraw();upArtists();}
/* ===== "Just announced" alerts: your top 300 artists go to your own private row (follow_artists) when signed in, so the
   daily reminders function can ping you when one of them gets a new show. Only sent when the list changes. ===== */
const KU="shack-music-up";let upT=null;
function upArtists(){clearTimeout(upT);upT=setTimeout(async()=>{const cl=window.SHACK_CLOUD;if(!cl||!cl.user)return;
  const names=ART.slice(0,300).map(a=>String(a.n).slice(0,60)),sig=cl.user.id+"|"+names.join("|");
  if(SH.store.raw(KU)===String(sig.length)+":"+names.slice(0,20).join("|"))return;
  try{const sb=await cl.client();
    const {error}=names.length?await sb.from("follow_artists").upsert({user_id:cl.user.id,names,updated_at:new Date().toISOString()}):await sb.from("follow_artists").delete().eq("user_id",cl.user.id);
    if(!error)SH.store.put(KU,String(sig.length)+":"+names.slice(0,20).join("|"));}catch(e){}},2500);}
if(window.SHACK_CLOUD&&SHACK_CLOUD.onUser)SHACK_CLOUD.onUser(u=>{if(u)upArtists();});
upArtists();
// re-read saved links: ones this device has never read (added on another device) right away, the rest every couple of days
async function refresh(force){if(!M||refreshing)return;refreshing=true;let got=0,bad=0;
  try{const due=M.links.filter(l=>l.u&&(force||!C[l.u]||!(C[l.u].a||[]).length||Date.now()-(C[l.u].at||0)>AGE));
    if(!due.length)return;if(force){msg=`Re-reading ${plural(due.length,"link")}…`;redraw();}
    for(const l of due){const j=await readLink(l.u);
      if(!M||!M.links.some(x=>x.u===l.u))continue;   // removed while we were reading
      if(j&&!j.error&&(j.artists||[]).length){keep(l.u,j);if(j.title&&!l.t)l.t=j.title;got++;}
      else{bad++;C[l.u]={...(C[l.u]||{a:[]}),err:j.error||"Couldn't update",at:(C[l.u]&&C[l.u].at)||0};}
      saveC();changed();}
    if(got)save();
    if(force)msg=bad?`Updated ${got}, ${bad} couldn't be read (see below).`:`✓ Updated. Using ${plural(ART.length,"artist")} now.`;
  }finally{refreshing=false;if(force)redraw();}}
(function wait(n){if(typeof state!=="undefined"&&state.loaded&&(state.events||[]).length&&window.SHACK_FLIP){drawRow();setTimeout(()=>refresh(false),4000);return;}if(n<60)setTimeout(()=>wait(n+1),500);})(0);
addEventListener("pageshow",()=>setTimeout(drawRow,300));
// another device changed your music (sync): pick it up, and read any link this device hasn't seen
addEventListener("shack:store",ev=>{if(selfSave||!ev.detail||ev.detail.key!==K)return;const v=loadM();if(JSON.stringify(v)===JSON.stringify(M))return;M=v;changed();setTimeout(()=>refresh(false),500);});

/* ===== You page section ===== */
function linksHTML(){if(!M||!M.links.length)return "";
  return `<ul class="bmus-links">${M.links.map((l,i)=>{const c=l.u?C[l.u]:null,n=c?(c.a||[]).length:(l.old||[]).length;
    const sub=!l.u?"old link, paste it again to keep it fresh":c&&c.err&&!n?`<span class="bmus-err">${E(c.err)}</span>`:!c?"reading…":`${plural(n,"artist")} · updated ${ago(c.at)}${c.err?` · <span class="bmus-err">last update failed</span>`:""}`;
    return `<li><i aria-hidden="true">${ICON[l.src]||"🎵"}</i><span><b>${E(l.t||NAME[l.src]||"Link")}</b><small>${l.t?E(NAME[l.src]||"")+" · ":""}${sub}</small></span><button type="button" data-mus-drop="${i}" aria-label="Remove ${E(l.t||NAME[l.src]||"this link")}">✕</button></li>`;}).join("")}</ul>`;}
function artistsHTML(r){if(!ART.length)return "";const hit=new Set(r.mine.map(x=>N(x.why))),mute=(M&&M.mute)||[];
  const list=[...ART].sort((a,b)=>(hit.has(b.k)?1:0)-(hit.has(a.k)?1:0)),shown=list.slice(0,showArt===true?300:showArt);
  return `<div class="bmus-art"><button type="button" class="bmus-tog" data-mus-art aria-expanded="${!!showArt}">${showArt?"Hide":"See"} your ${plural(ART.length,"artist")}${mute.length?` · ${mute.length} muted`:""}</button>
    ${showArt?`<p class="bset-p">Tap ✕ to stop matching an artist. <b>●</b> = has a show coming up.</p>
      <div class="bmus-chips">${shown.map(a=>`<span class="bmus-chip${hit.has(a.k)?" on":""}">${hit.has(a.k)?"● ":""}${E(a.n)}<small>${E(a.from.map(s=>NAME[s]||"").filter(Boolean).join(" · "))}</small><button type="button" data-mus-mute="${E(a.n)}" aria-label="Mute ${E(a.n)}">✕</button></span>`).join("")}
        ${list.length>shown.length?`<button type="button" class="bmus-more" data-mus-more>Show ${Math.min(300,list.length-shown.length)} more</button>`:""}</div>
      ${mute.length?`<p class="bset-p">Muted: ${mute.map(n=>`<button type="button" class="bmus-un" data-mus-unmute="${E(n)}">${E(n)} ↺</button>`).join(" ")}</p>`:""}`:""}</div>`;}
function sectionHTML(){const r=matches(),has=ART.length,signed=window.SHACK_CLOUD&&SHACK_CLOUD.user,links=(M&&M.links)||[];
  return `<section class="byou-sec bmus" id="bMusic"><h3>🎧 Match my music</h3>
    ${has?`<div class="bmus-stats"><span><b>${ART.length.toLocaleString()}</b>artists</span><span><b>${r.mine.length}</b>their shows</span><span><b>${links.length}</b>link${links.length===1?"":"s"}</span></div>
      <p class="bset-p">${r.top&&r.top.length?`Your vibe here: <b>${E(r.top.map(g=>GNAME[g]||g).join(", "))}</b>. `:""}Picks are in <b>For your ears</b> on Home.</p>`
      :`<p class="bset-p">Get show picks from the music you actually listen to. Add every account and playlist you like, they stack.</p>`}
    ${linksHTML()}
    ${artistsHTML(r)}
    ${links.length<MAXLINKS?`<form class="bmiss-f" data-mus="link"><input name="p" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Paste a SoundCloud, YouTube, Spotify or Apple Music link"${adding?" disabled":""}><button class="bpass-share"${adding?" disabled":""}>${adding?"Reading… this can take 20 s":"＋ Add link"}</button></form>`:`<p class="bset-p">That's ${MAXLINKS} links, the most it holds. Remove one to add another.</p>`}
    <details class="bmus-how"><summary>Where do I find my link?</summary><p><b>SoundCloud:</b> your profile → Share → Copy link. We read everyone you follow + your public likes.<br><b>YouTube Music / YouTube:</b> a playlist → Share → Copy link. Set it to Public or Unlisted. (Liked songs is private; copy them into a playlist.)<br><b>Spotify, Apple Music:</b> a playlist → Share → Copy link (it has to be public).</p></details>
    <form class="bmiss-f" data-mus="typed"><textarea name="a" rows="2" maxlength="3000" placeholder="Or type artists you love, separated by commas">${E(((M&&M.typed)||[]).join(", "))}</textarea><button class="bpass-share">Save typed artists</button></form>
    <p class="bset-p bmus-sync">${signed?"☁ Synced: your links follow you to every device you sign in on.":"Saved on this phone. Sign in above and your links follow you to your other devices."}</p>
    ${has||links.length?`<div class="bset-acts bmus-acts">${links.some(l=>l.u)?`<button type="button" data-mus-now${refreshing?" disabled":""}>${refreshing?"Updating…":"↻ Update all now"}</button>`:""}<button type="button" class="bset-clear" data-mus-forget>Forget my music</button></div>`:""}
    ${msg?`<p class="bset-msg" role="status">${E(msg)}</p>`:""}</section>`;}
function redraw(){const el=$("bMusic");if(el){const box=el.closest(".binfo-in"),top=box?box.scrollTop:0,inp=el.querySelector('[data-mus="link"] input'),draft=inp?inp.value:"";
  el.outerHTML=sectionHTML();const ni=document.querySelector('#bMusic [data-mus="link"] input');if(ni&&draft&&adding)ni.value=draft;if(box)box.scrollTop=top;}}
window.SHACK_MUSIC={sectionHTML,matches};

/* ===== actions ===== */
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-mus]");if(!f)return;ev.preventDefault();ev.stopPropagation();const k=f.dataset.mus;
  if(k==="typed"){M=M||blank();M.typed=splitTyped(f.a.value);save();changed();
    msg=M?`✓ Saved. Using ${plural(ART.length,"artist")}, ${plural(matches().mine.length,"show")} by them coming up.`:"Cleared.";redraw();return;}
  if(k!=="link"||adding)return;
  const raw=f.p.value.trim(),link=(/https?:\/\/\S+/.exec(raw)||[raw])[0];
  if(!link){msg="Paste a link first.";redraw();return;}
  if(M&&M.links.some(l=>l.u&&keyOf(l.u)===keyOf(link))){msg="That one's already added. Tap ↻ Update all now to re-read it.";redraw();return;}
  adding=true;msg="";redraw();
  try{const j=await readLink(link);
    if(j.error){msg=j.error;}
    else if(!(j.artists||[]).length){msg="We couldn't find any artists in that link.";}
    else{M=M||blank();M.links=M.links.filter(l=>l.u&&keyOf(l.u)!==keyOf(link));   // old unrefreshable lists give way
      M.links.push({u:link,src:srcOf(link),t:j.title||""});keep(link,j);save();changed();
      const r=matches();msg=`✓ Added ${j.title?`“${j.title}”`:NAME[srcOf(link)]}: ${plural(j.artists.length,"artist")}${j.songs?` from ${plural(j.songs,"song")}`:""}. ${plural(r.mine.length,"show")} by your artists coming up.${j.note&&/only|first/.test(j.note)?" "+j.note:""}`;
      f.p.value="";}
  }catch(e){msg="Something went wrong. Try again.";}
  finally{adding=false;redraw();}},true);
document.addEventListener("click",ev=>{
  if(ev.target.closest("[data-mus-art]")){ev.preventDefault();showArt=showArt?false:120;redraw();return;}
  if(ev.target.closest("[data-mus-more]")){ev.preventDefault();showArt=(showArt||0)+300;redraw();return;}
  const mu=ev.target.closest("[data-mus-mute]");if(mu){ev.preventDefault();M=M||blank();const n=mu.dataset.musMute;if(!M.mute.includes(n))M.mute.push(n);save();changed();msg=`Muted ${n}. Tap it under Muted to bring it back.`;redraw();return;}
  const un=ev.target.closest("[data-mus-unmute]");if(un){ev.preventDefault();M.mute=M.mute.filter(x=>x!==un.dataset.musUnmute);save();changed();return;}
  const drop=ev.target.closest("[data-mus-drop]");
  if(drop){ev.preventDefault();if(!M)return;const l=M.links[+drop.dataset.musDrop];if(!l)return;M.links.splice(+drop.dataset.musDrop,1);delete C[l.u];save();changed();
    msg=M?`Removed ${l.t?`“${l.t}”`:"that link"}. Using ${plural(ART.length,"artist")} now.`:"Removed. No music saved now.";redraw();return;}
  if(ev.target.closest("[data-mus-now]")){ev.preventDefault();refresh(true);return;}
  const fg=ev.target.closest("[data-mus-forget]");if(!fg)return;ev.preventDefault();
  if(!fg.classList.contains("sure")){fg.classList.add("sure");fg.textContent="Tap again to forget all your music";return;}
  M=null;C={};save();SH.store.del(KC);changed();msg="Forgot your music.";const b=$("bEarsBox");if(b)b.hidden=true;redraw();},true);
})();
