/* ---- The Show Shack · neon icons for every emoji on screen.
   The app's text is written with emoji (easy to read in the code); this swaps each one, as it appears on the page,
   for a matching neon line icon in the app's style. Text that leaves the app (share messages, calendar files,
   the passport picture) keeps real emoji, since other apps can't draw these. Dropdown options stay emoji too
   (browsers can't put pictures in them). Food and afters icons come from night.js's set so they always match. ---- */
(()=>{
const U=n=>`<use href="#i-${n}"/>`;   // reuse a symbol from index.html
// emoji → [glow color, svg inside a 24×24 box] (or a night.js category key as a string)
const MAP={
  "🛖":["#FFC66B",'<path d="M2.5 11.5 12 4l9.5 7.5"/><path d="M5 10v10h14V10M10 20v-5h4v5M7.5 13h.01M16.5 13h.01"/>'],
  "🌙":["#B48CFF",U("moon")],
  "👋":["#FFC66B",U("hand")],"🤙":["#FFC66B",U("hand")],
  "🌱":["#7EE0B8",U("sprout")],
  "👇":["#FFC66B",'<path d="M12 3v14M6.5 11.5 12 17l5.5-5.5"/>'],"👆":["#FFC66B",'<path d="M12 21V7M6.5 12.5 12 7l5.5 5.5"/>'],
  "📴":["#FF6B6B",'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2M3.5 4l17 16"/>'],
  "🪩":["#FF8AD8",'<path d="M12 1.5v3.5"/><circle cx="12" cy="12.5" r="7.5"/><path d="M4.5 12.5h15M6 8.5h12M6 16.5h12M12 5c-2.6 2.2-2.6 12.8 0 15M12 5c2.6 2.2 2.6 12.8 0 15"/>'],
  "🔥":["#FF8A5C",'<path d="M12 2.5c.5 3-1.5 4.5-3 6.5-1.5 2-3 3.7-3 6.2a6 6 0 0 0 12 0c0-2.4-1.2-4.3-2.6-5.7-.3 1.4-1 2.3-2 2.8.5-3.7-.5-6.7-1.4-9.8Z"/><path d="M12 21c-1.7 0-3-1.2-3-3 0-1.7 1.3-2.5 2-3.8.7 1.2 2 1.8 2 3.8 0 1.8-.3 3-1 3Z" opacity=".7"/>'],
  "💤":["#8FB4FF",'<path d="M3.5 7.5h5l-5 6h5M12 11.5h4l-4 5h4M17.5 3.5h3l-3 3.5h3"/>'],
  "🆕":["#7EE0B8",'<path d="M12 2.5l2.1 5.6 5.9 1.9-5.9 1.9L12 17.5l-2.1-5.6L4 10l5.9-1.9Z"/><path d="M19 16v4M17 18h4" opacity=".8"/>'],
  "⏱":["#7FD4FF",'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9.5 2.5h5M12 2.5V5M18.5 6.5l1.5-1.5"/>'],
  "🎟":["#FF6FA5",U("ticket")],
  "🚕":["#FFD84D",U("taxi")],
  "🚗":"drive",
  "📍":["#FF6FA5",'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'],
  "🚆":["#7FD4FF",U("train")],"🚇":["#7FD4FF",U("train")],
  "🚶":["#7EE0B8",'<circle cx="13.5" cy="4.2" r="1.7"/><path d="M12.8 7.8 11 14l3.5 3.2 1 4.3M11 14l-2.6 7.5M12.8 7.8l3.4 3.7 2.6.6M12.8 7.8 9.3 9.8 7.8 13"/>'],
  "🍸":["#FF8AD8",U("drink")],
  "🅿":["#7FD4FF",U("parking")],
  "🧭":["#7EE0B8",'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>'],
  "🕘":["#7FD4FF",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5H8"/>'],
  "🌋":["#FF6B6B",'<path d="M2.5 20.5h19L16 10h-2.5L12 12.5 10.5 10H8Z"/><path d="M9.5 6.5c.4-1.4 1.4-2 2.5-2M14.5 6.5c-.4-1.4-1.4-2-2.5-2M12 4.5V2" opacity=".8"/>'],
  "⛺":"fest",
  "🔔":["#FFD27A",U("bell")],"🛎":"hotel",
  "💃":["#FF6FA5",'<circle cx="14" cy="4.2" r="1.7"/><path d="M13.5 7.5 10 12l3 2.2-1.8 7.3M10 12 6.5 10.3M13.5 7.5l3.6 1 2-2.6M13 14.2l4.2 1.6 1.4 3.7"/>'],
  "🥁":["#FFC66B",'<ellipse cx="12" cy="10" rx="8" ry="3"/><path d="M4 10v6.5c0 1.7 3.6 3 8 3s8-1.3 8-3V10M4 10l6 9.4M20 10l-6 9.4M6.5 2.5l3.5 5M17.5 2.5 14 7.5"/>'],
  "🤝":["#7EE0B8",'<path d="M2.5 11.5 6 8l4 1.4 3-1.9 4 .5 4.5 3.5"/><path d="M6 8v6.5l4.5 4.5 1.5-1.5M10.5 10l3.2 3.2M12.5 17.2l1.8 1.5 1.5-1.5-3-3M15 14.8l1.8 1.5 1.5-1.5-3.3-3.3M17.5 11.5l3.5 3"/>'],
  "🎤":["#FF6FA5",U("mic")],
  "🔁":["#7FD4FF",'<path d="M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4"/>'],
  "🏠":["#7FD4FF",U("home")],
  "✨":["#FFE7A3",'<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8Z"/><path d="M19 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>'],
  "🥩":"kbbq","🕹":"arcade","🎳":"bowl","♨":"spa","🎷":"jazz","🌃":"roof","🔭":"stars","🌊":"beach","🎱":"pool",
  "🍜":"ramen","🌮":"tacos","🍲":"pho","🥘":"korean","🍳":"diner","🦀":"boil","🥂":"fine","🥟":"dimsum","🍛":"thai","🍕":"pizza","🍨":"dessert","🏪":"hall",
  "📅":["#7FD4FF",U("cal")],
  "⚠":["#FFC66B",'<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4.5M12 17.5h.01"/>'],
  "💸":["#7EE0B8",U("money")],
  "🙌":["#7EE0B8",'<path d="M12 2.5l2 2.5 3.1-.6.6 3.1 2.5 2-2.5 2-.6 3.1-3.1-.6-2 2.5-2-2.5-3.1.6-.6-3.1L3.8 11.5l2.5-2 .6-3.1 3.1.6Z"/><path d="m8.8 11.5 2.3 2.3 4.2-4.2"/>'],
  "🎉":["#FFC66B",'<path d="M3 21l4.5-12 7.5 7.5Z"/><path d="M9 4.5c1 1 1 2.5 0 3.5M15 3l.5 2M19 8.5l2-.5M15.5 12c1.5-1.5 3.5-1.5 5 0M13 7l3-3"/>'],
  "🔎":["#7FD4FF",U("search")],
  "🔗":["#7FD4FF",'<path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1.5-1.5"/>'],
  "🌍":["#7EE0B8",'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
  "✏":["#FFC66B",'<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19Z"/><path d="M14 6.5l3.5 3.5"/>'],
  "🌴":["#7EE0B8",U("palm")],
  "🎲":["#FF8AD8",U("dice")],
  "🌅":["#FFC66B",'<path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 9V4.5M9.5 7 12 4.5 14.5 7M4 12.5l1.5 1M20 12.5l-1.5 1M5 21h14"/>'],
  "☁":["#8FB4FF",U("cloud")],
  "👥":["#7EE0B8",'<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6"/>'],
  "🏆":["#FFD27A",'<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H3.5a3.5 3.5 0 0 0 4 4.5M17 6h3.5a3.5 3.5 0 0 1-4 4.5M12 14v3.5M9.5 17.5h5V21h-5ZM7.5 21h9"/>'],
  "🙂":["#FFC66B",'<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>'],
  "📷":["#FF8AD8",'<path d="M4 7.5h3.5L9 5h6l1.5 2.5H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="4"/>'],
  "📡":["#7FD4FF",'<path d="M12 12v9M8.5 21h7M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13M12 12h.01"/>'],
  "🏷":["#FFC66B",'<path d="M3 12V4h8l10 10-8 8Z"/><path d="M7.5 8h.01"/>'],
  "📊":["#7FD4FF",U("chart")],
  "🎧":["#7FD4FF",'<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.5"/>']};
MAP["📸"]=MAP["📷"];
const keys=Object.keys(MAP).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
const RE=new RegExp("("+keys.join("|")+")\\uFE0F?","gu"),TEST=new RegExp(keys.join("|"),"u");
function svg(ch){let v=MAP[ch];if(typeof v==="string"){const N=window.NIGHT&&NIGHT.IC&&NIGHT.IC[v];v=N||["#E6DCFF",'<circle cx="12" cy="12" r="8"/>'];}
  const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("class","nic nemo");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("aria-hidden","true");
  s.style.setProperty("--ic",v[0]);s.innerHTML=v[1];return s;}
const SKIP=new Set(["SCRIPT","STYLE","TEXTAREA","INPUT","OPTION","SELECT","TITLE","NOSCRIPT","svg","SVG"]);
function swapText(t){const p=t.parentNode;if(!p||SKIP.has(p.nodeName)||p.closest&&p.closest("[data-emoji],svg,option,select,textarea"))return;
  const s=t.nodeValue;if(!s||!TEST.test(s))return;RE.lastIndex=0;
  const frag=document.createDocumentFragment();let last=0,m,hit=false;
  while((m=RE.exec(s))){hit=true;if(m.index>last)frag.appendChild(document.createTextNode(s.slice(last,m.index)));frag.appendChild(svg(m[1]));last=m.index+m[0].length;}
  if(!hit)return;if(last<s.length)frag.appendChild(document.createTextNode(s.slice(last)));p.replaceChild(frag,t);}
function sweep(root){if(!root)return;if(root.nodeType===3){swapText(root);return;}if(root.nodeType!==1||SKIP.has(root.nodeName))return;
  if(!TEST.test(root.textContent||""))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>TEST.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  const xs=[];while(w.nextNode())xs.push(w.currentNode);xs.forEach(swapText);}
new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")swapText(m.target);else m.addedNodes.forEach(sweep);}})
  .observe(document.documentElement,{childList:true,subtree:true,characterData:true});
sweep(document.body);
window.SHACK_NEON={MAP,sweep};
})();
