/* ---- The Show Shack · private feature counts. Counts how many devices use each feature per day: just
   "feature + day + number", no account, no device id, nothing about who. Each device counts a feature at most
   once a day (remembered on the phone). The owner sees the totals under You → Owner: review. ---- */
(()=>{
if(!window.SH||!SH.rpc)return;
const KEY="shack-counted";
function count(f){try{const day=new Date().toLocaleDateString("en-CA");let s=JSON.parse(localStorage.getItem(KEY)||"{}");if(s.d!==day)s={d:day,f:[]};
  if(s.f.includes(f))return;s.f.push(f);localStorage.setItem(KEY,JSON.stringify(s));if(navigator.onLine)SH.rpc("count_feature",{p_feature:f}).catch(()=>{});}catch(e){}}
SH.track=count;
// taps that count (matched by what was tapped; no changes needed in the other files)
const TAPS=[['#bTabs [data-tab="shows"]',"tab_shows"],['#bTabs [data-tab="map"]',"tab_map"],['#bTabs [data-tab="venues"]',"tab_venues"],['#bTabs [data-tab="saved"]',"tab_saved"],
  ['#bTabs [data-tab="budget"]',"tab_plan"],["#bYouTab","tab_you"],["[data-shr]","share"],["#bFlyAdd","flyer_open"],['[data-rem="on"]',"reminders_on"],
  ["#bEars .bfc","ears_tap"],["#bTonight .bfc","tonight_tap"],["button[data-star]","star"],["[data-been]","stamp"],["[data-qflyer],[data-qmiss]","add_missing"],
  ["[data-pinv]","follow"],['[data-send="1"]',"night_send"]];
document.addEventListener("click",ev=>{for(const [sel,f] of TAPS)if(ev.target.closest(sel)){count(f);break;}},true);
document.addEventListener("submit",ev=>{const t=ev.target;
  if(t.closest("[data-fly-form]"))count("flyer_add");else if(t.closest("[data-mus]"))count("music_match");
  else if(t.closest('[data-cl-form="code"]'))count("signin");else if(t.closest('[data-so-form="add"]'))count("friend_add");},true);
// a search that found nothing
new MutationObserver(()=>{if(document.querySelector(".bnomatch"))count("search_none");}).observe(document.getElementById("list")||document.body,{childList:true});
})();
