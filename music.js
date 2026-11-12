/* ---- The Show Shack · Match my music. Optional, and private: your artists stay on THIS phone (never synced, never
   stored on a server). Ways in, none needs a music login:
   · type a few artists you love (works right away)
   · a public link: SoundCloud profile, or a YouTube Music / Spotify / Apple Music playlist. The "music" function reads
     the public page and hands back artist names; nothing is kept there. Saved links re-read themselves every couple of
     days, so new follows, likes and songs show up without pasting the link again.
   · a Last.fm username (only if the free Last.fm key is set in SH.music.lastfm)
   Then: shows by artists you listen to, plus shows in the genres you lean toward → "For your ears" on Home. ---- */
(()=>{
if(!window.SH)return;
const K="shack-music",$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"null");}catch(e){return null;}};
const save=v=>{try{v?localStorage.setItem(K,JSON.stringify(v)):localStorage.removeItem(K);}catch(e){}};   // plain localStorage on purpose: not synced
const NAME={soundcloud:"SoundCloud",youtube:"YouTube Music",spotify:"Spotify",apple:"Apple Music"};
const srcOf=u=>/soundcloud/i.test(u)?"soundcloud":/youtu/i.test(u)?"youtube":/apple\.com/i.test(u)?"apple":"spotify";
const AGE=2*864e5;   // re-read saved links when they're older than 2 days
let M=load(),msg="",busy=false;
// older saves had one flat list: keep it (typed names stay typed; names from an old link become a link we can't re-read)
if(M&&M.src!=="lastfm"&&M.artists&&!M.typed&&!M.links){const n=M.artists.map(a=>a.n);if(M.src==="typed")M.typed=n;else M.links=[{u:"",src:M.src,a:n,at:M.at}];}

// streaming genres → the Shack's genres
const GMAP=[[/house|techno|edm|electro|dubstep|trance|drum and bass|dnb|bass music|garage|hardstyle|electronic|dance/,"electronic"],[/hip hop|hip-hop|rap|r&b|rnb|trap|drill/,"hiphop"],
  [/indie|rock|punk|alt|emo|shoegaze|grunge|metal|folk|singer-songwriter|americana|country/,"indie"],[/reggae|dub|ska|dancehall/,"reggae"],
  [/latin|reggaeton|cumbia|banda|corrido|regional mexican|bachata|salsa|norte/,"latin"],[/pop|k-pop|kpop/,"pop"],[/jazz|soul|funk|blues|neo soul/,"jazz"]];
function weights(){const w={};for(const a of (M&&M.artists)||[])for(const g of a.g||[]){const m=GMAP.find(([re])=>re.test(g));if(m)w[m[1]]=(w[m[1]]||0)+1;}return w;}
// shows by your artists (whole-name match in the title or lineup), then shows in your genres
function matches(){if(!M||!M.artists||!M.artists.length)return {mine:[],vibe:[]};
  const today=todayStr(),up=(state._up||state.events||[]).filter(e=>e.start&&e.start>=today&&["concert","club","festival"].includes(e.kind));
  const names=M.artists.map(a=>N(a.n)).filter(n=>n.length>=3);const mine=[],ids=new Set();
  // whole-name match; also without spaces for names squashed by YouTube channels ("BeckyG" = "Becky G"), 5+ letters only
  // an act counts only as a whole: the title starts with it and then ends or breaks (":", "-", "&", "w/", "with"…),
  // or it's one of the listed artists. So "Drake" doesn't match "Drake Milligan".
  const acts=e=>{const t=String(e.title||"").toLowerCase(),parts=t.split(/\s*(?::|\s[-–—]\s|,|&|\+|\/|\(|\bw\/|\bwith\b|\bfeat\.?|\bft\.?|\band\b|\bx\b|\bpresents\b)\s*/);
    return [...parts,...String(e.artists||"").toLowerCase().split(/\s*(?:,|;|\/|&|\band\b|·)\s*/)].map(N).filter(Boolean);};
  for(const e of up){const a=acts(e),flat=new Set(a.map(x=>x.replace(/ /g,"")));
    const hit=names.find(n=>a.includes(n)||(n.replace(/ /g,"").length>=5&&flat.has(n.replace(/ /g,""))));if(hit){mine.push({e,why:M.artists.find(a=>N(a.n)===hit).n});ids.add(e.id);}}
  const w=weights(),top=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  const vibe=top.length?up.filter(e=>!ids.has(e.id)&&(e.genres||[]).some(g=>top.includes(g))).sort((a,b)=>(b.genres||[]).reduce((s,g)=>s+(w[g]||0),0)-(a.genres||[]).reduce((s,g)=>s+(w[g]||0),0)||a.start.localeCompare(b.start)).slice(0,10):[];
  return {mine:mine.sort((a,b)=>a.e.start.localeCompare(b.e.start)),vibe,top};}

/* ===== Home row: For your ears ===== */
function drawRow(){if(!window.SHACK_FLIP)return;let box=$("bEarsBox");
  const r=matches(),list=[...r.mine.map(x=>({e:x.e,tag:"🎧 You play "+x.why})),...r.vibe.map(e=>({e,tag:"🎧 Your vibe"}))].slice(0,12);
  if(!list.length){if(box)box.hidden=true;return;}
  if(!box){const anchor=$("bBecBox")||$("bDropBox");if(!anchor)return;anchor.insertAdjacentHTML("beforebegin",`<div class="bpicks bears" id="bEarsBox"><div class="bpicks-h"><h2 class="bsec">For your ears</h2><button type="button" class="blink" data-yopen="1">Your music</button></div><div class="bpick-row" id="bEars"></div></div>`);box=$("bEarsBox");$("bEars").addEventListener("click",SHACK_FLIP.click,true);}
  box.hidden=false;const sig=list.map(x=>x.e.id).join("|");if($("bEars").dataset.sig===sig)return;$("bEars").dataset.sig=sig;
  $("bEars").innerHTML=list.map(x=>SHACK_FLIP.html(x.e,`<i style="--vc:#7FD4FF"></i>${E(x.tag)}`)).join("");}

/* ===== Your artists = typed names + every saved link's artists ===== */
function build(){const out=[],seen=new Set(),add=n=>{const k=N(n);if(k&&!seen.has(k)){seen.add(k);out.push({n,g:[]});}};
  for(const n of M.typed||[])add(n);for(const l of M.links||[])for(const n of l.a||[])add(n);return out.slice(0,150);}
const readLink=link=>fetch(SH.sb.url+"/functions/v1/music",{method:"POST",headers:{"Content-Type":"application/json",apikey:SH.sb.key},body:JSON.stringify({link})}).then(r=>r.json());
const ago=t=>{const d=Math.floor((Date.now()-(t||0))/864e5);return d<1?"today":d===1?"yesterday":d+" days ago";};
function changed(){const b=$("bEars");if(b)b.dataset.sig="";drawRow();redraw();}
function commit(){M.src=M.links&&M.links.length?"links":"typed";M.artists=build();M.at=Date.now();save(M);const r=matches();
  msg=`✓ Using ${M.artists.length} artist${M.artists.length===1?"":"s"}. ${r.mine.length} show${r.mine.length===1?"":"s"} by them coming up${r.vibe.length?`, ${r.vibe.length} more in your genres`:""}.`;changed();}
// saved links re-read themselves, so new follows / likes / playlist songs count without pasting the link again
async function refresh(force){if(!M||!(M.links||[]).some(l=>l.u)||busy)return;busy=true;let got=false;
  for(const l of M.links){if(!l.u||(!force&&Date.now()-(l.at||0)<AGE))continue;
    try{const j=await readLink(l.u);if(j&&!j.error&&(j.artists||[]).length){l.a=j.artists.map(a=>a.n);got=true;}l.at=Date.now();}catch(e){/* offline: try next time */}}
  if(got){M.artists=build();}save(M);busy=false;if(got||force){if(force)msg=`✓ Re-read your link${M.links.length===1?"":"s"}: ${M.artists.length} artists now.`;changed();}}
(function wait(n){if(typeof state!=="undefined"&&state.loaded&&(state.events||[]).length&&window.SHACK_FLIP){drawRow();setTimeout(()=>refresh(false),4000);return;}if(n<60)setTimeout(()=>wait(n+1),500);})(0);
addEventListener("pageshow",()=>setTimeout(drawRow,300));

/* ===== You page section ===== */
function sectionHTML(){const r=matches(),has=M&&M.artists&&M.artists.length,lf=SH.music&&SH.music.lastfm,links=(M&&M.links)||[];
  return `<section class="byou-sec" id="bMusic"><h3>🎧 Match my music</h3>
    <p class="bset-p">${has?`Using <b>${M.artists.length}</b> artist${M.artists.length===1?"":"s"}${M.src==="lastfm"?" from Last.fm":""}. <b>${r.mine.length}</b> show${r.mine.length===1?"":"s"} by artists you play${r.top&&r.top.length?`, plus picks in ${E(r.top.join(", "))}`:""}. They're in <b>For your ears</b> on Home.`:"Get show picks from the music you actually listen to. Your artists stay on this phone only: nothing goes to an account or server."}</p>
    ${links.length?`<ul class="bmus-links">${links.map((l,i)=>`<li><span><b>${E(NAME[l.src]||"Link")}</b> · ${(l.a||[]).length} artists · ${l.u?"updated "+ago(l.at):"old link, paste it again to keep it fresh"}</span><button type="button" data-mus-drop="${i}" aria-label="Remove this link">✕</button></li>`).join("")}</ul>`:""}
    <form class="bmiss-f" data-mus="link"><input name="p" type="url" inputmode="url" autocapitalize="off" placeholder="Paste a SoundCloud, YouTube Music, Spotify or Apple Music link"><button class="bpass-share">Add this link</button></form>
    <p class="bset-p bmus-how"><b>SoundCloud:</b> your profile → Share → Copy link (who you follow + your public likes). <b>YouTube Music, Spotify, Apple Music:</b> open a playlist you play a lot → Share → Copy link (it has to be public). Add as many as you like, they stack. Links update by themselves every couple of days, no need to paste them again.</p>
    <form class="bmiss-f" data-mus="typed"><textarea name="a" rows="2" maxlength="600" placeholder="Or type artists you love, separated by commas">${E(((M&&M.typed)||[]).join(", "))}</textarea><button class="bpass-share">Use these artists</button></form>
    ${lf?`<form class="bmiss-f" data-mus="lastfm"><input name="u" maxlength="40" autocapitalize="off" placeholder="Or your Last.fm username"><button class="bpass-share">Use Last.fm</button></form>`:""}
    ${has?`<div class="bset-acts">${links.some(l=>l.u)?`<button type="button" data-mus-now>Update now</button>`:""}<button type="button" data-mus-forget>Forget my music</button></div>`:""}
    ${msg?`<p class="bset-msg">${E(msg)}</p>`:""}</section>`;}
function redraw(){const el=$("bMusic");if(el)el.outerHTML=sectionHTML();}
window.SHACK_MUSIC={sectionHTML,matches};
const fresh=()=>{if(!M||M.src==="lastfm")M={typed:[],links:[]};M.typed=M.typed||[];M.links=M.links||[];return M;};
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-mus]");if(!f)return;ev.preventDefault();ev.stopPropagation();if(busy)return;busy=true;const k=f.dataset.mus;
  try{
    if(k==="typed"){const a=f.a.value.split(/[,\n]+/).map(s=>s.trim()).filter(s=>s.length>=2).slice(0,60);fresh().typed=a;
      if(!a.length&&!M.links.length){M=null;save(null);msg="Type at least one artist.";changed();}else commit();}
    if(k==="link"){const link=f.p.value.trim();if(!link){msg="Paste a link first.";redraw();busy=false;return;}msg="Reading that link…";redraw();
      const j=await readLink(link);if(j.error)msg=j.error;else if(!(j.artists||[]).length)msg="We couldn't find any artists in that link.";
      else{fresh();M.links=M.links.filter(l=>l.u!==link&&l.u);   // same link again replaces itself; old unrefreshable lists give way
        M.links.push({u:link,src:srcOf(link),a:j.artists.map(a=>a.n),at:Date.now()});commit();if(j.note)msg+=" "+j.note;redraw();busy=false;return;}redraw();}
    if(k==="lastfm"){const u=f.u.value.trim();msg="Asking Last.fm…";redraw();
      const api=(m,x)=>fetch(`https://ws.audioscrobbler.com/2.0/?method=${m}&api_key=${encodeURIComponent(SH.music.lastfm)}&format=json&${x}`).then(r=>r.json());
      const j=await api("user.gettopartists",`user=${encodeURIComponent(u)}&period=6month&limit=40`);
      const list=((j.topartists||{}).artist||[]).map(a=>({n:a.name,g:[]}));if(!list.length){msg=j.message||"No listening history for that username.";redraw();}
      else{for(const a of list.slice(0,15)){try{const t=await api("artist.gettoptags",`artist=${encodeURIComponent(a.n)}`);a.g=(((t.toptags||{}).tag)||[]).slice(0,4).map(x=>x.name.toLowerCase());}catch(e){}}
        M={src:"lastfm",artists:list,at:Date.now()};save(M);msg=`✓ Got ${list.length} artists from Last.fm.`;changed();}}
  }catch(e){msg="Couldn't reach that service. Check your connection and try again.";redraw();}
  busy=false;},true);
document.addEventListener("click",ev=>{
  const drop=ev.target.closest("[data-mus-drop]");
  if(drop){ev.preventDefault();M.links.splice(+drop.dataset.musDrop,1);if(!M.links.length&&!(M.typed||[]).length){M=null;save(null);msg="Removed. No music saved now.";changed();}else{commit();msg="Removed that link. "+msg;redraw();}return;}
  if(ev.target.closest("[data-mus-now]")){ev.preventDefault();msg="Re-reading your links…";redraw();refresh(true);return;}
  if(!ev.target.closest("[data-mus-forget]"))return;ev.preventDefault();M=null;save(null);msg="Forgot your music on this phone.";const b=$("bEarsBox");if(b)b.hidden=true;redraw();},true);
})();
