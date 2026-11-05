(function(){
  const box=document.getElementById("disco"),ball=document.getElementById("dball"),cv=document.getElementById("dcv");if(!box||!ball||!cv)return;
  const sparks=document.getElementById("dsparks"),flash=box.querySelector(".dflash"),g=cv.getContext("2d");
  const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SZ=320,DPR=Math.min(2,devicePixelRatio||1);cv.width=cv.height=SZ*DPR;g.scale(DPR,DPR);
  // mirror tiles on a sphere
  const R=15,TILT=.32,tiles=[];
  for(let j=0;j<R;j++){const lat=-Math.PI/2+(j+.5)*Math.PI/R,cl=Math.cos(lat),n=Math.max(5,Math.round(2*Math.PI*cl/(Math.PI/R)));
    for(let i=0;i<n;i++)tiles.push({lat,lon:(i+(j%2?.5:0))*2*Math.PI/n,hl:Math.PI/R/2*.86,ho:Math.PI/n*.86,jx:Math.random()-.5,jy:Math.random()-.5,jz:Math.random()-.5,st:Math.random()});}
  const norm=v=>{const l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];};
  const LIGHTS=[[norm([-.55,.55,.62]),[255,255,255],38,1],[norm([.7,.1,.7]),[255,70,170],26,.9],[norm([-.75,-.2,.62]),[70,220,255],26,.9],[norm([.2,-.7,.68]),[255,200,90],26,.8],[norm([.1,.8,.6]),[150,110,255],24,.7]];
  const ct=Math.cos(TILT),stl=Math.sin(TILT);
  function pt(lat,lon,th){const cl=Math.cos(lat),x=cl*Math.sin(lon+th),y0=Math.sin(lat),z0=cl*Math.cos(lon+th);return[x,y0*ct-z0*stl,y0*stl+z0*ct];}
  // cracks live on the ball's surface (they turn with it): a main fault, side branches, then hairlines at the burst
  function walk(lat,lon,hd,n,st){const p=[[lat,lon]];for(let i=0;i<n;i++){hd+=(Math.random()-.5)*1.3;lat+=Math.sin(hd)*st;lon+=Math.cos(hd)*st/Math.max(.3,Math.cos(lat));p.push([lat,lon]);}return p;}
  let CR=[];   // cracks start where your finger lands, one or two per swipe
  const LC=0;
  let th=-.05,spin=0,lv=0,busy=false,raf=0,vis=false,idle=0,x0=null,xs=0,moved=0,dir=1,last=0,burstT=0;
  const BASE=[.0035,.005,.007];
  function draw(){
    const now=performance.now(),bp=burstT?Math.min(1,(now-burstT)/750):0;
    g.clearRect(0,0,SZ,SZ);
    const c=SZ/2,r=78,show=Math.max(lv,burstT?3:0);
    if(bp<1){g.globalAlpha=1-bp;g.fillStyle="#0b0816";g.beginPath();g.arc(c,c,r*(1+bp*.25),0,6.2832);g.fill();g.globalAlpha=1;}
    for(const t of tiles){
      const p=pt(t.lat,t.lon,th);if(p[2]<-.02)continue;
      const nz=Math.max(0,p[2]);
      const n=norm([p[0]+t.jx*.16,p[1]+t.jy*.16,p[2]+t.jz*.16]);
      const E=[2*n[2]*n[0],2*n[2]*n[1],2*n[2]*n[2]-1];
      let cr=34+60*nz,cg=40+64*nz,cb=70+86*nz;
      const room=Math.max(0,E[1])*28;cr+=room;cg+=room;cb+=room*1.3;
      let star=0;
      for(const[L,col,pw,k]of LIGHTS){const d=E[0]*L[0]+E[1]*L[1]+E[2]*L[2];if(d>0){const f=Math.pow(d,pw)*k;cr+=col[0]*f*1.15;cg+=col[1]*f*1.15;cb+=col[2]*f*1.15;if(L===LIGHTS[0][0]&&d>.985&&t.st>.55)star=d;}}
      const dim=.35+.65*Math.pow(nz,.45),warm=show*8;
      const rr=Math.min(255,cr*dim+warm*2)|0,gg=Math.min(255,cg*dim+warm)|0,bb=Math.min(255,cb*dim)|0;
      const cl=Math.cos(t.lat),a=pt(t.lat-t.hl,t.lon-t.ho/cl,th),b=pt(t.lat-t.hl,t.lon+t.ho/cl,th),d2=pt(t.lat+t.hl,t.lon+t.ho/cl,th),e=pt(t.lat+t.hl,t.lon-t.ho/cl,th);
      let ox=0,oy=0;if(bp>0){const k=bp*bp*(120+t.st*160);ox=p[0]*k;oy=-p[1]*k-bp*30*t.st;g.globalAlpha=Math.max(0,1-bp*1.05);}
      g.fillStyle=`rgb(${rr},${gg},${bb})`;g.beginPath();
      g.moveTo(c+a[0]*r+ox,c-a[1]*r+oy);g.lineTo(c+b[0]*r+ox,c-b[1]*r+oy);g.lineTo(c+d2[0]*r+ox,c-d2[1]*r+oy);g.lineTo(c+e[0]*r+ox,c-e[1]*r+oy);g.closePath();g.fill();
      if(star&&!bp){const x=c+p[0]*r,y=c-p[1]*r,s=5+star*5;g.strokeStyle="rgba(255,255,255,.95)";g.lineWidth=1.2;g.beginPath();g.moveTo(x-s,y);g.lineTo(x+s,y);g.moveTo(x,y-s);g.lineTo(x,y+s);g.stroke();}
      if(bp)g.globalAlpha=1;
    }
    if(bp<1){
      const gr=g.createRadialGradient(c-r*.3,c-r*.4,2,c,c,r);gr.addColorStop(0,"rgba(255,255,255,.28)");gr.addColorStop(.3,"rgba(255,255,255,0)");gr.addColorStop(.8,"rgba(4,2,16,0)");gr.addColorStop(1,"rgba(4,2,16,.6)");
      g.globalAlpha=1-bp;g.fillStyle=gr;g.beginPath();g.arc(c,c,r,0,6.2832);g.fill();g.globalAlpha=1;
      const pulse=.75+.25*Math.sin(now/90);
      for(const k of CR){
        const pts=k.p.map(q=>pt(q[0],q[1],th));
        const path=()=>{g.beginPath();let on=false;for(const q of pts){if(q[2]<.08){on=false;continue;}const x=c+q[0]*r,y=c-q[1]*r;on?g.lineTo(x,y):g.moveTo(x,y);on=true;}};
        g.lineCap="round";g.lineJoin="round";g.globalAlpha=1-bp;
        g.strokeStyle="#05030d";g.lineWidth=4.2*k.w;path();g.stroke();
        g.save();g.globalCompositeOperation="lighter";
        g.strokeStyle=`rgba(255,120,30,${.18*pulse})`;g.lineWidth=9*k.w;path();g.stroke();
        g.strokeStyle=`rgba(255,${150+show*20},60,${.55*pulse})`;g.lineWidth=3.4*k.w;path();g.stroke();g.restore();
        g.strokeStyle=`rgba(255,246,210,${.55+.15*show})`;g.lineWidth=1.5*k.w;path();g.stroke();g.globalAlpha=1;}
      if(show){g.save();g.globalCompositeOperation="lighter";const gl=g.createRadialGradient(c,c,4,c,c,r);gl.addColorStop(0,`rgba(255,190,90,${.06*show})`);gl.addColorStop(1,"rgba(255,120,40,0)");g.globalAlpha=1-bp;g.fillStyle=gl;g.beginPath();g.arc(c,c,r,0,6.2832);g.fill();g.restore();}
    }
  }
  function frame(now){raf=requestAnimationFrame(frame);if(!last)last=now;const dt=Math.min(50,now-last);last=now;const k=dt/16.7;   // time-based so it stays smooth at any frame rate
    const base=BASE[Math.min(lv,2)];spin=base+(spin-base)*Math.pow(.955,k);th+=dir*spin*k;
    draw();
    if(lv>0&&!busy&&performance.now()-idle>7000)setLv(0);}
  const run=()=>{if(!still&&vis&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(frame);}},stop=()=>{if(raf){cancelAnimationFrame(raf);raf=0;}};
  if("IntersectionObserver" in window)new IntersectionObserver(es=>{vis=es[0].isIntersecting;vis?run():stop();}).observe(box);
  document.addEventListener("visibilitychange",()=>{document.hidden?stop():run();});
  spin=BASE[0];draw();
  function setLv(n){lv=n;if(!n)CR=[];ball.classList.remove("lv1","lv2");if(n===1)ball.classList.add("lv1");if(n>=2)ball.classList.add("lv2");}
  // sound: tuned to the shack song ("Brain Dance", F minor, 123 bpm): sparkle notes land on its 16th-note grid
  const F=[1396.9,1661.2,2093,2489,2793.8],STEP=60/123/4;let ac=null;
  function tone(freq,at,len,vol,type){const o=ac.createOscillator(),gn=ac.createGain();o.type=type||"sine";o.frequency.value=freq;
    gn.gain.setValueAtTime(0,at);gn.gain.linearRampToValueAtTime(vol,at+.01);gn.gain.exponentialRampToValueAtTime(.0001,at+len);o.connect(gn);gn.connect(ac.destination);o.start(at);o.stop(at+len+.05);}
  function audio(){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{if(navigator.audioSession)navigator.audioSession.type="playback";}catch(e){}   // iPhone: play even with the silent switch on
    if(!ac){ac=new AC();const b=ac.createBuffer(1,1,22050),sr=ac.createBufferSource();sr.buffer=b;sr.connect(ac.destination);sr.start(0);}
    if(ac.state!=="running")ac.resume();loadChime();return true;}catch(e){return false;}}
  function whoosh(){if(!audio())return;const t=ac.currentTime+.01,len=ac.sampleRate*.5,bf=ac.createBuffer(1,len,ac.sampleRate),d=bf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/len);
    const sr=ac.createBufferSource(),fl=ac.createBiquadFilter(),gn=ac.createGain();sr.buffer=bf;fl.type="bandpass";fl.Q.value=2;fl.frequency.setValueAtTime(500,t);fl.frequency.exponentialRampToValueAtTime(2600,t+.4);
    gn.gain.value=.12;sr.connect(fl);fl.connect(gn);gn.connect(ac.destination);sr.start(t);}
  // the notes are real: four 0.5 s slices cut from the shack song (F4, Ab4, C5, F5 = its F-minor arpeggio)
  let chBuf=null,chLoad=false;
  function loadChime(){if(chBuf||chLoad||!ac)return;chLoad=true;fetch("chime.mp3?v=1").then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(b=>{chBuf=b;}).catch(()=>{chLoad=false;});}
  function note(i,at,vol){if(chBuf){const s=ac.createBufferSource(),gn=ac.createGain();s.buffer=chBuf;gn.gain.value=vol;s.connect(gn);gn.connect(ac.destination);s.start(at,i*.6,.58);}
    else tone([F[0]/2*1,F[1]/2,F[2],F[4]][i],at,.4,vol*.05);}   // synth stand-in until the sample loads
  function tick(n){if(!audio())return;loadChime();const w=window.shackBeat?window.shackBeat(4):null;note(Math.min(3,n-1),ac.currentTime+.01+(w||0),.9);}
  function boom(d){if(!audio())return;loadChime();const t=ac.currentTime+.01+(d||0);
    const o=ac.createOscillator(),gn=ac.createGain();o.frequency.setValueAtTime(174.6,t);o.frequency.exponentialRampToValueAtTime(43.65,t+.35);   // F3 drops to F1 like the song's low end
    gn.gain.setValueAtTime(.2,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.45);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+.5);
    [0,1,2,3].forEach(i=>note(i,t+.05+i*STEP*2,.8+i*.1));}
  function buzz(p){try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}}
  // finger spot -> point on the sphere (undo the tilt and the current turn), then a jagged fault both ways from it
  function hit(px,py){const d=px*px+py*py;if(d>.96){px*=.97/Math.sqrt(d);py*=.97/Math.sqrt(d);}
    const x=px,y=py,z=Math.sqrt(Math.max(0,1-x*x-y*y)),y0=y*ct+z*stl,z0=-y*stl+z*ct;
    return[Math.asin(Math.max(-1,Math.min(1,y0))),Math.atan2(x,z0)-th];}
  function addCracks(px,py,n){for(let i=0;i<n;i++){const[la,lo]=hit(px+(i?(Math.random()-.5)*.35:0),py+(i?(Math.random()-.5)*.35:0)),h=Math.random()*6.283;
    const f=walk(la,lo,h,6+(Math.random()*3|0),.13),bk=walk(la,lo,h+Math.PI,5+(Math.random()*3|0),.13);
    CR.push({p:bk.reverse().concat(f.slice(1)),w:i?.75:1});
    const m=f[3]||f[1];CR.push({p:walk(m[0],m[1],h+(Math.random()<.5?1:-1)*(.8+Math.random()*.6),4,.11),w:.55});}}
  function crack(){CR.forEach(k=>{const m=k.p[k.p.length>>1];CR.push({p:walk(m[0],m[1],Math.random()*6.283,3,.1),w:.4});});busy=true;const wb=window.shackBeat?window.shackBeat(1):null,dl=wb==null?0:wb;boom(dl);setTimeout(go,dl*1000);   // song playing: hold the burst for the next beat
    function go(){ball.classList.remove("lv1","lv2");ball.classList.add("burst");burstT=performance.now();if(still)draw();
    buzz([40,30,90]);
    flash.classList.remove("go");void flash.offsetWidth;flash.classList.add("go");
    sparks.innerHTML="";for(let i=0;i<30;i++){const a=Math.random()*6.283,rr=60+Math.random()*130,e=document.createElement("i");e.className="dsp";
      e.style.cssText=`--dx:${Math.cos(a)*rr}px;--dy:${Math.sin(a)*rr-30}px;--dl:${Math.random()*.15}s;background:hsl(${Math.random()*360} 100% 70%);width:${8+Math.random()*12}px;height:${8+Math.random()*12}px`;
      sparks.appendChild(e);}
    setTimeout(()=>{surpriseMe();},420);
    setTimeout(()=>{burstT=0;setLv(0);spin=BASE[0];ball.classList.remove("burst");ball.classList.add("fresh");sparks.innerHTML="";busy=false;
      setTimeout(()=>ball.classList.remove("fresh"),700);if(still)draw();},1700);}}
  let tx=.0,ty=.0;
  function mark(e){const rc=ball.getBoundingClientRect();tx=(e.clientX-rc.left-rc.width/2)/(rc.width/2);ty=-(e.clientY-rc.top-rc.height/2)/(rc.height/2);}
  function swipe(d,sp){if(busy)return;whoosh();dir=d||dir;idle=performance.now();spin=sp||.12;
    if(still){th+=dir*.7;draw();}
    if(lv<3){addCracks(tx,ty,lv===2?2:1);setLv(lv+1);tick(lv);buzz(12*(lv+1));}else crack();}
  // the whole disco area is the swipe zone (not just the ball); the ball keeps your finger's speed when you let go
  let trk=[];
  box.addEventListener("pointerdown",e=>{if(busy)return;audio();x0=e.clientX;xs=x0;moved=0;trk=[[e.clientX,performance.now()]];mark(e);try{box.setPointerCapture(e.pointerId);}catch(_){}});
  box.addEventListener("pointermove",e=>{if(x0==null)return;const dx=e.clientX-x0;moved=Math.max(moved,Math.abs(e.clientX-xs));
    th+=dx*.0128;x0=e.clientX;if(dx)dir=dx>0?1:-1;mark(e);const n=performance.now();trk.push([e.clientX,n]);while(trk.length>2&&n-trk[0][1]>90)trk.shift();spin=0;if(still)draw();});
  const end=()=>{if(x0==null)return;x0=null;audio();
    if(moved>=24){const a=trk[0],z=trk[trk.length-1],dtm=Math.max(16,z[1]-a[1]),v=(z[0]-a[0])/dtm;   // px per ms
      if(Math.abs(v)>.05)dir=v>0?1:-1;swipe(dir,Math.min(.6,Math.max(.05,Math.abs(v)*.214)));}};   // .0128 rad per px * 16.7 ms = .214 rad per frame per px/ms
  box.addEventListener("pointerup",end);box.addEventListener("pointercancel",()=>{x0=null;});
  ball.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tx=(Math.random()-.5)*1.1;ty=(Math.random()-.5)*1.1;swipe(1);}});
})();
