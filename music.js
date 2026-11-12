/* ---- The Show Shack · Match my music. Optional, and private: your artists stay on THIS phone (never synced, never
   stored on a server). Three ways in, none needs a music login:
   · type a few artists you love (works right away)
   · a Last.fm username (public listening stats; needs the free Last.fm key in SH.music.lastfm)
   · a public Spotify playlist link (read by the "music" function with the app's own Spotify key; nothing kept)
   Then: shows by artists you listen to, plus shows in the genres you lean toward → "For your ears" on Home. ---- */
(()=>{
if(!window.SH)return;
const K="shack-music",$=id=>document.getElementById(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"null");}catch(e){return null;}};
const save=v=>{try{v?localStorage.setItem(K,JSON.stringify(v)):localStorage.removeItem(K);}catch(e){}};   // plain localStorage on purpose: not synced
let M=load(),msg="",busy=false;

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
(function wait(n){if(typeof state!=="undefined"&&state.loaded&&(state.events||[]).length&&window.SHACK_FLIP){drawRow();return;}if(n<60)setTimeout(()=>wait(n+1),500);})(0);
addEventListener("pageshow",()=>setTimeout(drawRow,300));

/* ===== You page section ===== */
function sectionHTML(){const r=matches(),has=M&&M.artists&&M.artists.length,lf=SH.music&&SH.music.lastfm;
  return `<section class="byou-sec" id="bMusic"><h3>🎧 Match my music</h3>
    <p class="bset-p">${has?`Using <b>${M.artists.length}</b> artist${M.artists.length===1?"":"s"} from ${E(M.src==="spotify"?"your Spotify playlist":M.src==="lastfm"?"Last.fm":"your list")}. <b>${r.mine.length}</b> show${r.mine.length===1?"":"s"} by artists you play${r.top&&r.top.length?`, plus picks in ${E(r.top.join(", "))}`:""}. They're in <b>For your ears</b> on Home.`:"Get show picks from the music you actually listen to. Your artists stay on this phone only: nothing goes to an account or server."}</p>
    <form class="bmiss-f" data-mus="typed"><textarea name="a" rows="2" maxlength="600" placeholder="Artists you love, separated by commas">${E(has&&M.src==="typed"?M.artists.map(a=>a.n).join(", "):"")}</textarea><button class="bpass-share">Use these artists</button></form>
    <form class="bmiss-f" data-mus="link"><input name="p" type="url" inputmode="url" autocapitalize="off" placeholder="Paste your SoundCloud profile or a YouTube Music playlist link"><button class="bpass-share">Add from this link</button></form>
    <p class="bset-p bmus-how">SoundCloud: your profile → Share → Copy link (we read who you follow and your public likes). YouTube Music: open a playlist you like → Share → Copy link (playlist must be Public or Unlisted). Add both, they stack.</p>
    ${lf?`<form class="bmiss-f" data-mus="lastfm"><input name="u" maxlength="40" autocapitalize="off" placeholder="Or your Last.fm username"><button class="bpass-share">Use Last.fm</button></form>`:""}
    ${has?`<div class="bset-acts"><button type="button" data-mus-forget>Forget my music</button></div>`:""}
    ${msg?`<p class="bset-msg">${E(msg)}</p>`:""}</section>`;}
function redraw(){const el=$("bMusic");if(el)el.outerHTML=sectionHTML();}
window.SHACK_MUSIC={sectionHTML,matches};
function setArtists(src,artists){M={src,artists:artists.slice(0,60),at:Date.now()};save(M);const r=matches();
  msg=`✓ Got ${M.artists.length} artist${M.artists.length===1?"":"s"}. ${r.mine.length} show${r.mine.length===1?"":"s"} by them coming up${r.vibe.length?`, ${r.vibe.length} more in your genres`:""}.`;
  const b=$("bEars");if(b)b.dataset.sig="";drawRow();redraw();}
document.addEventListener("submit",async ev=>{const f=ev.target.closest("[data-mus]");if(!f)return;ev.preventDefault();ev.stopPropagation();if(busy)return;busy=true;const k=f.dataset.mus;
  try{
    if(k==="typed"){const a=f.a.value.split(/[,\n]+/).map(s=>s.trim()).filter(s=>s.length>=2).slice(0,60);if(!a.length){msg="Type at least one artist.";redraw();}else setArtists("typed",a.map(n=>({n,g:[]})));}
    if(k==="link"){const link=f.p.value.trim(),src=/soundcloud/i.test(link)?"soundcloud":/youtu/i.test(link)?"youtube":"spotify";msg="Reading that link…";redraw();
      const r=await fetch(SH.sb.url+"/functions/v1/music",{method:"POST",headers:{"Content-Type":"application/json",apikey:SH.sb.key},body:JSON.stringify({link})});
      const j=await r.json();if(j.error)msg=j.error;else if(!(j.artists||[]).length)msg="We couldn't find any artists in that link.";
      else{// links stack: SoundCloud + YouTube Music together (typed artists are kept too)
        const keep=(M&&M.artists)||[],seen=new Set(keep.map(a=>N(a.n))),add=j.artists.filter(a=>!seen.has(N(a.n)));
        setArtists(src,[...keep,...add]);if(j.note)msg+=" "+j.note;redraw();busy=false;return;}redraw();}
    if(k==="lastfm"){const u=f.u.value.trim();msg="Asking Last.fm…";redraw();
      const api=(m,x)=>fetch(`https://ws.audioscrobbler.com/2.0/?method=${m}&api_key=${encodeURIComponent(SH.music.lastfm)}&format=json&${x}`).then(r=>r.json());
      const j=await api("user.gettopartists",`user=${encodeURIComponent(u)}&period=6month&limit=40`);
      const list=((j.topartists||{}).artist||[]).map(a=>({n:a.name,g:[]}));if(!list.length){msg=j.message||"No listening history for that username.";redraw();}
      else{for(const a of list.slice(0,15)){try{const t=await api("artist.gettoptags",`artist=${encodeURIComponent(a.n)}`);a.g=(((t.toptags||{}).tag)||[]).slice(0,4).map(x=>x.name.toLowerCase());}catch(e){}}setArtists("lastfm",list);}}
  }catch(e){msg="Couldn't reach that service. Check your connection and try again.";redraw();}
  busy=false;},true);
document.addEventListener("click",ev=>{if(!ev.target.closest("[data-mus-forget]"))return;ev.preventDefault();M=null;save(null);msg="Forgot your music on this phone.";const b=$("bEarsBox");if(b)b.hidden=true;redraw();},true);
})();
