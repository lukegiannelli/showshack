/* ---- The Show Shack · Match my music. Optional. Ways in, none needs a music login:
   · type a few artists you love (works right away)
   · a public link: SoundCloud profile, or a YouTube Music / Spotify / Apple Music playlist. The "music" function reads
     the public page and hands back artist names; nothing is kept there. Saved links re-read themselves every couple of
     days, so new follows, likes and songs show up without pasting the link again.
   · a Last.fm username (only if the free Last.fm key is set in SH.music.lastfm)
   Saved on this phone; when you're signed in it syncs with your passport (cloud.js), so your links follow you to every device.
   Then: shows by artists you listen to, plus shows in the genres those artists play at the Shack → "For your ears" on Home.
   You can see every artist it found, and mute any you don't want matched. ---- */
(()=>{
if(!window.SH)return;
const K="shack-music",$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/\+/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const NAME={soundcloud:"SoundCloud",youtube:"YouTube Music",spotify:"Spotify",apple:"Apple Music",typed:"your list",lastfm:"Last.fm"};
const GNAME={electronic:"electronic",hiphop:"hip-hop",indie:"indie & rock",reggae:"reggae",latin:"latin",pop:"pop",jazz:"jazz & soul"};
const srcOf=u=>/soundcloud/i.test(u)?"soundcloud":/youtu/i.test(u)?"youtube":/apple\.com/i.test(u)?"apple":"spotify";
const AGE=2*864e5;   // re-read saved links when they're older than 2 days
// SH.store: saved on this phone, and synced to your account when you're signed in (cloud.js lists "shack-music")
const load=()=>SH.store.get(K,null);
function save(v){if(!v){SH.store.del(K);return;}const o={...v};if(o.src!=="lastfm")delete o.artists;SH.store.set(K,o);}   // artists are rebuilt from links + typed
let M=load(),msg="",busy=false,showArt=false;
// older saves had one flat list: keep it (typed names stay typed; names from an old link become a link we can't re-read)
if(M&&M.src!=="lastfm"&&M.artists&&!M.typed&&!M.links){const n=M.artists.map(a=>a.n);if(M.src==="typed")M.typed=n;else M.links=[{u:"",src:M.src,a:n,at:M.at}];}
// a synced copy merged from two phones can hold the same link twice: keep the freshest
function tidy(){if(!M||M.src==="lastfm")return;const by=new Map();for(const l of M.links||[]){const k=l.u||("old:"+l.src);const o=by.get(k);if(!o||(l.at||0)>(o.at||0))by.set(k,l);}
  M.links=[...by.values()];M.typed=[...new Set(M.typed||[])];M.mute=[...new Set(M.mute||[])];M.artists=build();}

/* ===== typed lists: commas split artists, except names that have a comma in them ===== */
const COMMA=["Tyler, The Creator","Earth, Wind & Fire","Crosby, Stills, Nash & Young","Crosby, Stills & Nash","Emerson, Lake & Palmer","Peter, Bjorn and John",
  "Black Country, New Road","Blood, Sweat & Tears","Now, Now"];
function splitTyped(s){const held=[];let t=String(s||"");
  for(const n of COMMA)t=t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`\u0001${held.push(m)-1}\u0001`);
  return t.split(/[,\n]+/).map(x=>x.replace(/\u0001(\d+)\u0001/g,(_,i)=>held[+i]).trim()).filter(x=>x.length>=2).slice(0,60);}

// Last.fm tags → the Shack's genres
const GMAP=[[/house|techno|edm|electro|dubstep|trance|drum and bass|dnb|bass music|garage|hardstyle|electronic|dance/,"electronic"],[/hip hop|hip-hop|rap|r&b|rnb|trap|drill/,"hiphop"],
  [/indie|rock|punk|alt|emo|shoegaze|grunge|metal|folk|singer-songwriter|americana|country/,"indie"],[/reggae|dub|ska|dancehall/,"reggae"],
  [/latin|reggaeton|cumbia|banda|corrido|regional mexican|bachata|salsa|norte/,"latin"],[/pop|k-pop|kpop/,"pop"],[/jazz|soul|funk|blues|neo soul/,"jazz"]];

/* ===== matching ===== */
// an act counts only as a whole: the title starts with it and then ends or breaks (":", "-", "&", "w/", "with"…),
// or it's one of the listed artists. So "Drake" doesn't match "Drake Milligan". Names that have a comma or "&" in them
// ("Tyler, The Creator", "Mumford & Sons") are looked for as whole words in the title + lineup instead.
const acts=e=>{const t=String(e.title||"").toLowerCase(),parts=t.split(/\s*(?::|\s[-–—]\s|,|&|\+|\/|\(|\bw\/|\bwith\b|\bfeat\.?|\bft\.?|\band\b|\bx\b|\bpresents\b)\s*/);
  return [...parts,...String(e.artists||"").toLowerCase().split(/\s*(?:,|;|\/|&|\band\b|·)\s*/)].map(N).filter(Boolean);};
function hitOf(e,names){const a=acts(e),flat=new Set(a.map(x=>x.replace(/ /g,""))),whole=" "+N(e.title+" "+(e.artists||""))+" ";
  return names.find(x=>x.multi?whole.includes(" "+x.k+" "):(a.includes(x.k)||(x.k.replace(/ /g,"").length>=5&&flat.has(x.k.replace(/ /g,"")))));}
function matches(){if(!M||!M.artists||!M.artists.length)return {mine:[],vibe:[],top:[]};
  const today=todayStr(),up=(state._up||state.events||[]).filter(e=>e.start&&e.start>=today&&["concert","club","festival"].includes(e.kind));
  const names=M.artists.map(a=>({k:N(a.n),a,multi:/[,&+]|\band\b/i.test(a.n)&&N(a.n).split(" ").length>=2})).filter(x=>x.k.length>=3);
  const mine=[],ids=new Set(),w={};
  for(const e of up){const h=hitOf(e,names);if(h){mine.push({e,why:h.a.n,from:h.a.s});ids.add(e.id);for(const g of e.genres||[])w[g]=(w[g]||0)+1;}}
  // genres: what your artists play here at the Shack (plus Last.fm tags when that's the source)
  for(const a of M.artists)for(const g of a.g||[]){const m=GMAP.find(([re])=>re.test(g));if(m)w[m[1]]=(w[m[1]]||0)+1;}
  const top=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  const score=e=>(e.genres||[]).reduce((s,g)=>s+(w[g]||0),0);
  const vibe=top.length?up.filter(e=>!ids.has(e.id)&&(e.genres||[]).some(g=>top.includes(g))).sort((a,b)=>score(b)-score(a)||a.start.localeCompare(b.start)).slice(0,10)
    .map(e=>({e,g:(e.genres||[]).filter(g=>top.includes(g)).sort((x,y)=>(w[y]||0)-(w[x]||0))[0]})):[];
  return {mine:mine.sort((a,b)=>a.e.start.localeCompare(b.e.start)),vibe,top};}

/* ===== Home row: For your ears (each pick says why it's there) ===== */
function drawRow(){if(!window.SHACK_FLIP)return;let box=$("bEarsBox");
  const r=matches(),list=[...r.mine.map(x=>({e:x.e,tag:`🎧 You play ${x.why}${x.from&&x.from!=="typed"&&NAME[x.from]?` · ${NAME[x.from]}`:""}`})),
    ...r.vibe.map(x=>({e:x.e,tag:`🎧 Your vibe: ${GNAME[x.g]||x.g||"your genres"}`}))].slice(0,12);
  if(!list.length){if(box)box.hidden=true;return;}
  if(!box){const anchor=$("bBecBox")||$("bDropBox");if(!anchor)return;anchor.insertAdjacentHTML("beforebegin",`<div class="bpicks bears" id="bEarsBox"><div class="bpicks-h"><h2 class="bsec">For your ears</h2><button type="button" class="blink" data-yopen="1">Your music</button></div><div class="bpick-row" id="bEars"></div></div>`);box=$("bEarsBox");$("bEars").addEventListener("click",SHACK_FLIP.click,true);}
  box.hidden=false;const sig=list.map(x=>x.e.id+x.tag).join("|");if($("bEars").dataset.sig===sig)return;$("bEars").dataset.sig=sig;
  $("bEars").innerHTML=list.map(x=>SHACK_FLIP.html(x.e,`<i style="--vc:#7FD4FF"></i>${E(x.tag)}`)).join("");}

/* ===== Your artists = typed names + every saved link's artists, minus the ones you muted ===== */
function build(){const out=[],seen=new Set(),mute=new Set((M.mute||[]).map(N)),add=(n,s)=>{const k=N(n);if(k&&!seen.has(k)&&!mute.has(k)){seen.add(k);out.push({n,g:[],s});}};
  for(const n of M.typed||[])add(n,"typed");for(const l of M.links||[])for(const n of l.a||[])add(n,l.src);return out.slice(0,150);}
const readLink=link=>fetch(SH.sb.url+"/functions/v1/music",{method:"POST",headers:{"Content-Type":"application/json",apikey:SH.sb.key},body:JSON.stringify({link})}).then(r=>r.json());
const ago=t=>{const d=Math.floor((Date.now()-(t||0))/864e5);return d<1?"today":d===1?"yesterday":d+" days ago";};
function changed(){const b=$("bEars");if(b)b.dataset.sig="";drawRow();redraw();}
function commit(){M.src=M.links&&M.links.length?"links":"typed";M.artists=build();M.at=Date.now();save(M);const r=matches();
  msg=`✓ Using ${M.artists.length} artist${M.artists.length===1?"":"s"}. ${r.mine.length} show${r.mine.length===1?"":"s"} by them coming up${r.vibe.length?`, ${r.vibe.length} more in your genres`:""}.`;changed();}
if(M&&M.src!=="lastfm")tidy();
// saved links re-read themselves, so new follows / likes / playlist songs count without pasting the link again
async function refresh(force){if(!M||!(M.links||[]).some(l=>l.u)||busy)return;busy=true;let got=false;
  for(const l of M.links){if(!l.u||(!force&&Date.now()-(l.at||0)<AGE))continue;
    try{const j=await readLink(l.u);if(j&&!j.error&&(j.artists||[]).length){l.a=j.artists.map(a=>a.n);got=true;}l.at=Date.now();}catch(e){/* offline: try next time */}}
  if(got){M.artists=build();save(M);}busy=false;if(got||force){if(force)msg=`✓ Re-read your link${M.links.length===1?"":"s"}: ${M.artists.length} artists now.`;changed();}}
(function wait(n){if(typeof state!=="undefined"&&state.loaded&&(state.events||[]).length&&window.SHACK_FLIP){drawRow();setTimeout(()=>refresh(false),4000);return;}if(n<60)setTimeout(()=>wait(n+1),500);})(0);
addEventListener("pageshow",()=>setTimeout(drawRow,300));

/* ===== You page section ===== */
function artistsHTML(r){if(!M||!M.artists||!M.artists.length)return "";const hit=new Set(r.mine.map(x=>N(x.why))),mute=M.mute||[];
  const list=[...M.artists].sort((a,b)=>(hit.has(N(b.n))?1:0)-(hit.has(N(a.n))?1:0));
  return `<div class="bmus-art"><button type="button" class="bmus-tog" data-mus-art aria-expanded="${showArt}">${showArt?"Hide":"See"} your ${M.artists.length} artist${M.artists.length===1?"":"s"}${mute.length?` · ${mute.length} muted`:""}</button>
    ${showArt?`<p class="bset-p">Tap ✕ to stop matching an artist. <b>●</b> = has a show coming up.</p>
      <div class="bmus-chips">${list.map(a=>`<span class="bmus-chip${hit.has(N(a.n))?" on":""}">${hit.has(N(a.n))?"● ":""}${E(a.n)}<small>${E(NAME[a.s]||"")}</small>${M.src==="lastfm"?"":`<button type="button" data-mus-mute="${E(a.n)}" aria-label="Mute ${E(a.n)}">✕</button>`}</span>`).join("")}</div>
      ${mute.length?`<p class="bset-p">Muted: ${mute.map(n=>`<button type="button" class="bmus-un" data-mus-unmute="${E(n)}">${E(n)} ↺</button>`).join(" ")}</p>`:""}`:""}</div>`;}
function sectionHTML(){const r=matches(),has=M&&M.artists&&M.artists.length,lf=SH.music&&SH.music.lastfm,links=(M&&M.links)||[],signed=window.SHACK_CLOUD&&SHACK_CLOUD.user;
  return `<section class="byou-sec" id="bMusic"><h3>🎧 Match my music</h3>
    <p class="bset-p">${has?`Using <b>${M.artists.length}</b> artist${M.artists.length===1?"":"s"}${M.src==="lastfm"?" from Last.fm":""}. <b>${r.mine.length}</b> show${r.mine.length===1?"":"s"} by artists you play${r.top&&r.top.length?`, plus picks in ${E(r.top.map(g=>GNAME[g]||g).join(", "))}`:""}. They're in <b>For your ears</b> on Home.`:"Get show picks from the music you actually listen to."}
      ${signed?"Synced with your account, so it follows you to your other devices.":"Saved on this phone. Sign in above and it follows you to your other devices too."}</p>
    ${links.length?`<ul class="bmus-links">${links.map((l,i)=>`<li><span><b>${E(NAME[l.src]||"Link")}</b> · ${(l.a||[]).length} artists · ${l.u?"updated "+ago(l.at):"old link, paste it again to keep it fresh"}</span><button type="button" data-mus-drop="${i}" aria-label="Remove this link">✕</button></li>`).join("")}</ul>`:""}
    ${artistsHTML(r)}
    <form class="bmiss-f" data-mus="link"><input name="p" type="url" inputmode="url" autocapitalize="off" placeholder="Paste a SoundCloud, YouTube Music, Spotify or Apple Music link"><button class="bpass-share">Add this link</button></form>
    <p class="bset-p bmus-how"><b>SoundCloud:</b> your profile → Share → Copy link (who you follow + your public likes). <b>YouTube Music, Spotify, Apple Music:</b> open a playlist you play a lot → Share → Copy link (it has to be public). Add as many as you like, they stack. Links update by themselves every couple of days, no need to paste them again.</p>
    <form class="bmiss-f" data-mus="typed"><textarea name="a" rows="2" maxlength="600" placeholder="Or type artists you love, separated by commas">${E(((M&&M.typed)||[]).join(", "))}</textarea><button class="bpass-share">Use these artists</button></form>
    ${lf?`<form class="bmiss-f" data-mus="lastfm"><input name="u" maxlength="40" autocapitalize="off" placeholder="Or your Last.fm username"><button class="bpass-share">Use Last.fm</button></form>`:""}
    ${has?`<div class="bset-acts">${links.some(l=>l.u)?`<button type="button" data-mus-now>Update now</button>`:""}<button type="button" data-mus-forget>Forget my music</button></div>`:""}
    ${msg?`<p class="bset-msg">${E(msg)}</p>`:""}</section>`;}
function redraw(){const el=$("bMusic");if(el){const box=el.closest(".binfo-in"),top=box?box.scrollTop:0;el.outerHTML=sectionHTML();if(box)box.scrollTop=top;}}
window.SHACK_MUSIC={sectionHTML,matches};
// another device changed your music (sync): pick it up
addEventListener("shack:store",ev=>{if(!ev.detail||ev.detail.key!==K||busy)return;const v=load();if(JSON.stringify(v)===JSON.stringify(M&&{...M,artists:M.src==="lastfm"?M.artists:undefined}))return;M=v;if(M&&M.src!=="lastfm")tidy();changed();});
const fresh=()=>{if(!M||M.src==="lastfm")M={typed:[],links:[],mute:[]};M.typed=M.typed||[];M.links=M.links||[];M.mute=M.mute||[];return M;};
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-mus]");if(!f)return;ev.preventDefault();ev.stopPropagation();if(busy)return;busy=true;const k=f.dataset.mus;
  try{
    if(k==="typed"){const a=splitTyped(f.a.value);fresh().typed=a;
      if(!a.length&&!M.links.length){M=null;save(null);msg="Type at least one artist.";changed();}else commit();}
    if(k==="link"){const link=f.p.value.trim();if(!link){msg="Paste a link first.";redraw();busy=false;return;}msg="Reading that link…";redraw();
      const j=await readLink(link);if(j.error)msg=j.error;else if(!(j.artists||[]).length)msg="We couldn't find any artists in that link.";
      else{fresh();M.links=M.links.filter(l=>l.u!==link&&l.u);   // same link again replaces itself; old unrefreshable lists give way
        M.links.push({u:link,src:srcOf(link),a:j.artists.map(a=>a.n),at:Date.now()});commit();if(j.note)msg+=" "+j.note;redraw();busy=false;return;}redraw();}
    if(k==="lastfm"){const u=f.u.value.trim();msg="Asking Last.fm…";redraw();
      const api=(m,x)=>fetch(`https://ws.audioscrobbler.com/2.0/?method=${m}&api_key=${encodeURIComponent(SH.music.lastfm)}&format=json&${x}`).then(r=>r.json());
      const j=await api("user.gettopartists",`user=${encodeURIComponent(u)}&period=6month&limit=40`);
      const list=((j.topartists||{}).artist||[]).map(a=>({n:a.name,g:[],s:"lastfm"}));if(!list.length){msg=j.message||"No listening history for that username.";redraw();}
      else{for(const a of list.slice(0,15)){try{const t=await api("artist.gettoptags",`artist=${encodeURIComponent(a.n)}`);a.g=(((t.toptags||{}).tag)||[]).slice(0,4).map(x=>x.name.toLowerCase());}catch(e){}}
        M={src:"lastfm",artists:list,at:Date.now()};save(M);msg=`✓ Got ${list.length} artists from Last.fm.`;changed();}}
  }catch(e){msg="Couldn't reach that service. Check your connection and try again.";redraw();}
  busy=false;},true);
document.addEventListener("click",ev=>{
  if(ev.target.closest("[data-mus-art]")){ev.preventDefault();showArt=!showArt;redraw();return;}
  const mu=ev.target.closest("[data-mus-mute]");if(mu){ev.preventDefault();fresh();const n=mu.dataset.musMute;if(!M.mute.includes(n))M.mute.push(n);commit();msg=`Muted ${n}. Tap it under Muted to bring it back.`;redraw();return;}
  const un=ev.target.closest("[data-mus-unmute]");if(un){ev.preventDefault();fresh();M.mute=M.mute.filter(x=>x!==un.dataset.musUnmute);commit();return;}
  const drop=ev.target.closest("[data-mus-drop]");
  if(drop){ev.preventDefault();M.links.splice(+drop.dataset.musDrop,1);if(!M.links.length&&!(M.typed||[]).length){M=null;save(null);msg="Removed. No music saved now.";changed();}else{commit();msg="Removed that link. "+msg;redraw();}return;}
  if(ev.target.closest("[data-mus-now]")){ev.preventDefault();msg="Re-reading your links…";redraw();refresh(true);return;}
  if(!ev.target.closest("[data-mus-forget]"))return;ev.preventDefault();M=null;save(null);msg="Forgot your music.";const b=$("bEarsBox");if(b)b.hidden=true;redraw();},true);
})();
