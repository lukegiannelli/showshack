/* ---- The Show Shack · Tonight mode. From 4 PM to 1 AM, Home leads with "Still on tonight": today's shows that
   haven't started yet (or just did), soonest first, each with a countdown. Different from the Tonight filter:
   it knows the clock, hides what's already over, and sorts by start time. Rechecks every 5 minutes. ---- */
(()=>{
const $=id=>document.getElementById(id),E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nowMin=()=>{const d=new Date();let m=d.getHours()*60+d.getMinutes();if(d.getHours()<SH.LATE)m+=1440;return m;};
const showDay=()=>{const d=new Date();if(d.getHours()<SH.LATE)d.setDate(d.getDate()-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
function on(){const h=new Date().getHours();return h>=16||h<1;}
// "8:00–11:00 PM" → starts 8 PM, ends 11 PM (the AM/PM after the range belongs to both ends)
function span(t){const r=/(\d{1,2})(?::(\d\d))?\s*[–-]\s*(\d{1,2})(?::(\d\d))?\s*([ap])\.?\s?m/i.exec(String(t||""));
  if(!r)return {m:SH.minOfText(t),end:null};const ap=r[5].toLowerCase(),to24=h=>(+h%12)+(ap==="p"?12:0);
  let s=to24(r[1])*60+(+r[2]||0),e=to24(r[3])*60+(+r[4]||0);if(s>e)s-=720;if(s<SH.LATE*60)s+=1440;if(e<SH.LATE*60)e+=1440;return {m:s,end:e};}
function picks(){const day=showDay(),now=nowMin();
  // one-night shows only: a run like "every Monday in November" has an end date and would show on the wrong nights
  return (state._up||[]).filter(e=>e.start===day&&(!e.end||e.end===e.start)&&!["art","market","volunteer"].includes(e.kind)&&e.status!=="cancelled").map(e=>({e,...span(e.time)}))
    .filter(x=>x.m!=null&&(x.m>=now-30||(x.end&&x.end>now))).sort((a,b)=>a.m-b.m||((a.e._drive?.mins??999)-(b.e._drive?.mins??999)));}   // trimmed to 12 after the near-you pass
const clock=m=>SH.hhmmOfMin(m).replace(/^(\d\d):(\d\d)$/,(x,h,mm)=>((+h%12)||12)+(mm!=="00"?":"+mm:"")+(+h>=12?" PM":" AM"));
function when(m){const d=m-nowMin();return d<=0?"Starting now":d<60?`In ${d} min`:d<180?`In ${Math.floor(d/60)} hr${d%60>=10?` ${d%60} min`:""}`:SH.hhmmOfMin(m).replace(/^(\d\d):(\d\d)$/,(x,h,mm)=>((+h%12)||12)+(mm!=="00"?":"+mm:"")+(+h>=12?" PM":" AM"));}
// Near you (once you've set a start point, so shows have a drive time): drop what you can't reach in time (more than
// 30 min after it starts, unless it's still on), then the closest of what starts in the next 4 hours goes first.
const drv=x=>x.e._drive&&typeof x.e._drive.mins==="number"?x.e._drive.mins:null;
function nearFirst(xs){const now=nowMin();if(!xs.some(x=>drv(x)!=null))return {xs:xs.slice(0,12),near:false};
  const ok=xs.filter(x=>{const d=drv(x);if(d==null)return true;const arrive=now+d;return arrive<=x.m+30||(x.end&&arrive<x.end-30);});
  const soon=ok.filter(x=>x.m-now<=240&&drv(x)!=null).sort((a,b)=>drv(a)-drv(b)||a.m-b.m),rest=ok.filter(x=>!soon.includes(x));
  return {xs:[...soon,...rest].slice(0,12),near:true};}
function draw(){if(!window.SHACK_FLIP||!window.BUI)return;let box=$("bTonightBox");const nf=nearFirst(on()?picks():[]),xs=nf.xs;
  if(!xs.length){if(box)box.hidden=true;return;}
  if(!box){const anchor=document.querySelector("#bHome .bpicks");if(!anchor)return;anchor.insertAdjacentHTML("beforebegin",`<div class="bpicks btonight-row" id="bTonightBox"><div class="bpicks-h"><h2 class="bsec">Still on tonight</h2><span class="blbl" id="bTonightN"></span></div><div class="bpick-row" id="bTonight"></div></div>`);
    box=$("bTonightBox");$("bTonight").addEventListener("click",SHACK_FLIP.click,true);}
  box.hidden=false;box.querySelector(".bsec").textContent=nf.near?"Tonight near you":"Still on tonight";
  $("bTonightN").textContent=nf.near?xs.length+" you can still make":xs.length+" still to go";
  const sig=(nf.near?"n":"")+xs.map(x=>x.e.id+when(x.m)).join("|");if($("bTonight").dataset.sig===sig)return;$("bTonight").dataset.sig=sig;
  $("bTonight").innerHTML=xs.map(x=>SHACK_FLIP.html(x.e,`<i style="--vc:#FF8A5C"></i>${E((x.end&&x.m<=nowMin()?"On now till "+clock(x.end):when(x.m))+(nf.near&&drv(x)!=null?" · 🚗 "+drv(x)+" min":""))}`)).join("");}
(function wait(n){if(typeof state!=="undefined"&&state.loaded&&(state._up||[]).length&&window.SHACK_FLIP){draw();setInterval(draw,5*60e3);return;}if(n<80)setTimeout(()=>wait(n+1),500);})(0);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")draw();});
window.SHACK_TONIGHT={draw};
})();
