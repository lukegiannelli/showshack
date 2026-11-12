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
  // ---- globe mode (flick the ball up): dot-matrix Earth, routes instead of cracks, plans a whole night ----
  let mode="disco";const LAND=[];
  "Dw==|/wE=|3n8=|Pv4f|+PH/Bw==|gAT//wE=|ABAA7z8=|AAAAACAA|AAAAAAAAAA==|AAAAAAAAAAA=|AAAAAAAAAAA=|AAAQAAAAAAAA|AAAgAAAAAAAA|AADAAAAAAAAABA==|AAAAAwAAAAAAAgA=|AAAADgAAAAAAAAA=|AAAAPAAAAAAAgAMA|AAAA8AEAGAAAcD4A|AAAA4AcA4AAAgP8B|AAAAwB8AwAcAAP4fAA==|AAAAgD8AgJ8BAPg/AA==|AAAAAP8BAH8GAMD/AAA=|AAAAAP8DAP4JAAD8AQA=|AAAAgP8DAPwTAABwAQA=|AAAAgP8PAPgHAAAAAAA=|AAAAgP8fAPgPAAAGHAA=|AAAAgP8fAPgPAAABHAA=|AAAAgP8DAPgfAIA9AgA=|AAAAgP8AAPg/AIAcAAA=|AAAAAP8AIPx/AIAQAAA=|AAAAgB8A8P9/AAEAAAA=|AAAAMAMA/P9/QOAQAAA=|AAAAHAAA/v8bMHgAAAA=|AACABwAA/v89OB4CAAA=|AADAJAAA/38/vh8AAAA=|AABgAACA/9/H/w8AAA==|AAB8CADA///+/w8AAA==|AAD+AwDg/////wEA|AAD/AwDwA///PwMA|AMD/AwBI+P//UwAA|AOD/AQAG////EwA=|AOD/AYB7/v9/AQA=|APD/AcD///8PAA==|APj/Afj///8B|AP57AP7//w8A|AP8cQPv/fwQ=|2D8DYP//XwA=|/B8M/P//Bw==|/W8T/v8/|/N/B/P8=|4HKAXwA=|wA5kAA==|4BMA|cAA=|AAA=|AA==".split("|").forEach((r,j,A)=>{const lat=-Math.PI/2+(j+.5)*Math.PI/A.length,n=Math.max(4,Math.round(2*A.length*Math.cos(lat))),b=atob(r);
    for(let i=0;i<n;i++)if(b.charCodeAt(i>>3)&(1<<(i&7)))LAND.push({lat,lon:-Math.PI+(i+.5)*2*Math.PI/n,st:Math.random()});});
  const SOCAL=[33.8*Math.PI/180,-117.9*Math.PI/180],HOME_TH=-SOCAL[1];
  function pt(lat,lon,th){const cl=Math.cos(lat),x=cl*Math.sin(lon+th),y0=Math.sin(lat),z0=cl*Math.cos(lon+th);return[x,y0*ct-z0*stl,y0*stl+z0*ct];}
  // cracks live on the ball's surface (they turn with it): a main fault, side branches, then hairlines at the burst
  function walk(lat,lon,hd,n,st){const p=[[lat,lon]];for(let i=0;i<n;i++){hd+=(Math.random()-.5)*1.3;lat+=Math.sin(hd)*st;lon+=Math.cos(hd)*st/Math.max(.3,Math.cos(lat));p.push([lat,lon]);}return p;}
  let CR=[];   // cracks start where your finger lands, one or two per swipe
  const LC=0;
  let th=-.05,spin=0,lv=0,busy=false,raf=0,vis=false,idle=0,x0=null,xs=0,moved=0,dir=1,last=0,burstT=0;
  const BASE=[.0035,.005,.007];
  function draw(){
    if(mode==="globe")return drawGlobe();
    if(mode==="ramen")return drawRamen();
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

  // globe: deep-blue sphere, glowing land dots, SoCal pin; each swipe traces a neon route over the surface
  function drawGlobe(){
    const now=performance.now(),bp=burstT?Math.min(1,(now-burstT)/750):0,c=SZ/2,r=78,show=Math.max(lv,burstT?3:0);
    g.clearRect(0,0,SZ,SZ);
    if(bp<1){g.globalAlpha=1-bp;
      const at=g.createRadialGradient(c,c,r*.9,c,c,r*1.28);at.addColorStop(0,`rgba(90,200,255,${.35+show*.08})`);at.addColorStop(1,"rgba(90,200,255,0)");
      g.fillStyle=at;g.beginPath();g.arc(c,c,r*1.28,0,6.2832);g.fill();
      const oc=g.createRadialGradient(c-r*.35,c-r*.4,4,c,c,r);oc.addColorStop(0,"#1f3d8a");oc.addColorStop(.55,"#10204f");oc.addColorStop(1,"#060a26");
      g.fillStyle=oc;g.beginPath();g.arc(c,c,r,0,6.2832);g.fill();
      // graticule
      g.strokeStyle="rgba(120,200,255,.13)";g.lineWidth=.8;
      for(let la=-60;la<=60;la+=30){g.beginPath();let on=false;for(let lo=0;lo<=360;lo+=6){const q=pt(la*Math.PI/180,lo*Math.PI/180,th);if(q[2]<0){on=false;continue;}const x=c+q[0]*r,y=c-q[1]*r;on?g.lineTo(x,y):g.moveTo(x,y);on=true;}g.stroke();}
      for(let lo=0;lo<360;lo+=30){g.beginPath();let on=false;for(let la=-90;la<=90;la+=6){const q=pt(la*Math.PI/180,lo*Math.PI/180,th);if(q[2]<0){on=false;continue;}const x=c+q[0]*r,y=c-q[1]*r;on?g.lineTo(x,y):g.moveTo(x,y);on=true;}g.stroke();}
      g.globalAlpha=1;}
    // land dots (fly out like stars on the burst)
    for(const d of LAND){const p=pt(d.lat,d.lon,th);if(p[2]<0)continue;const z=p[2];
      let x=c+p[0]*r,y=c-p[1]*r;
      if(bp>0){const k=bp*bp*(110+d.st*170);x+=p[0]*k;y+=-p[1]*k-bp*28*d.st;g.globalAlpha=Math.max(0,1-bp*1.05);}
      const warm=d.st>.86,tw=warm?.6+.4*Math.sin(now/260+d.st*40):1;
      g.fillStyle=warm?`rgba(255,${200+show*12},120,${(.55+.45*z)*tw})`:`rgba(${120+show*25},235,240,${.4+.6*z})`;
      const s=(warm?2.6:2.2)*(.5+.5*z);g.beginPath();g.arc(x,y,s/2,0,6.2832);g.fill();}
    g.globalAlpha=1;
    if(bp<1){
      // SoCal pin
      const p=pt(SOCAL[0],SOCAL[1],th);
      if(p[2]>.05){const x=c+p[0]*r,y=c-p[1]*r,pu=(now%1600)/1600;
        g.strokeStyle=`rgba(255,111,165,${(1-pu)*(1-bp)})`;g.lineWidth=1.5;g.beginPath();g.arc(x,y,3+pu*14,0,6.2832);g.stroke();
        g.fillStyle=`rgba(255,111,165,${1-bp})`;g.beginPath();g.arc(x,y,3.2,0,6.2832);g.fill();}
      // routes: drawn out over 450 ms, lifted off the surface in an arc, neon cyan + pink
      for(const k of CR){const u=Math.min(1,(now-(k.t0||0))/450),N=k.p.length,m=Math.max(2,Math.ceil(N*u));
        const pts=k.p.slice(0,m).map((q,i)=>{const v=pt(q[0],q[1],th),lift=1+.09*Math.sin(Math.PI*i/(N-1||1))*k.w;return [v[0]*lift,v[1]*lift,v[2]];});
        const path=()=>{g.beginPath();let on=false;for(const q of pts){if(q[2]<-.05){on=false;continue;}const x=c+q[0]*r,y=c-q[1]*r;on?g.lineTo(x,y):g.moveTo(x,y);on=true;}};
        g.lineCap="round";g.lineJoin="round";g.globalAlpha=1-bp;g.save();g.globalCompositeOperation="lighter";
        g.strokeStyle=k.w<.7?"rgba(255,111,165,.35)":"rgba(80,220,255,.35)";g.lineWidth=7*k.w;path();g.stroke();
        g.strokeStyle=k.w<.7?"rgba(255,150,200,.9)":"rgba(140,240,255,.95)";g.lineWidth=2.2*k.w;path();g.stroke();g.restore();
        const e=pts[pts.length-1],a=pts[0];
        [a,e].forEach((q,j)=>{if(q[2]<0||(j&&u<1&&false))return;g.fillStyle="#fff";g.beginPath();g.arc(c+q[0]*r,c-q[1]*r,j?2.4:1.8,0,6.2832);g.fill();});
        g.globalAlpha=1;}
      const hl=g.createRadialGradient(c-r*.35,c-r*.45,2,c,c,r);hl.addColorStop(0,"rgba(255,255,255,.22)");hl.addColorStop(.35,"rgba(255,255,255,0)");hl.addColorStop(1,"rgba(0,0,20,.35)");
      g.globalAlpha=1-bp;g.fillStyle=hl;g.beginPath();g.arc(c,c,r,0,6.2832);g.fill();g.globalAlpha=1;}
  }
  // ---- ramen mode (swipe the ball down): a bowl of space ramen seen from just above. Toppings, noodles and broth stars
  // ride the same turn (th) as the ball, squashed by RK so the bowl reads as round. Its "cracks" are glowing noodles. ----
  const RK=.6,BRX=66,RRX=80,BCY=148;            // perspective squash, broth / rim half-width, bowl centre (canvas px)
  const RTOP=[],NOOD=[],BST=[],BODY=[];
  [["nori",4.25,.66],["nori",4.85,.7],["chashu",.2,.45],["chashu",1.0,.55],["egg",2.15,.5],["egg",2.7,.56],["naruto",3.55,.5],["naruto",5.7,.36],
   ["star",.62,.8],["star",3.05,.8],["star",5.2,.18],["star",1.65,.14]].forEach(([k,a,r])=>RTOP.push({k,a,r,rot:Math.random()*6.283,st:Math.random()}));
  for(let i=0;i<16;i++)RTOP.push({k:"onion",a:Math.random()*6.283,r:.12+Math.random()*.76,rot:Math.random()*6.283,st:Math.random()});
  for(let i=0;i<9;i++)NOOD.push({a0:Math.random()*6.283,span:1.2+Math.random()*1.6,r0:.2+i*.075,amp:.025+Math.random()*.025,f:4+Math.random()*3,ph:Math.random()*6.283});
  for(let i=0;i<30;i++)BST.push({a:Math.random()*6.283,r:Math.sqrt(Math.random())*.95,st:Math.random()});
  for(let i=0;i<9;i++)BODY.push({a:i*.7+Math.random()*.3,h:.18+Math.random()*.36,st:Math.random()});
  const bxy=(a,r)=>{const g2=a+th;return [160+Math.cos(g2)*r*BRX,BCY+Math.sin(g2)*r*BRX*RK,Math.sin(g2)];};
  function star5(x,y,ro,ri,rot){g.beginPath();for(let i=0;i<10;i++){const rr=i%2?ri:ro,a=rot+i*Math.PI/5-Math.PI/2;i?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();}
  // smooth line through points (quadratic curves via the midpoints), so noodles bend instead of zig-zag
  function curve(pts,dy){g.beginPath();g.moveTo(pts[0][0],pts[0][1]+dy);for(let i=1;i<pts.length-1;i++){const [x,y]=pts[i],[x2,y2]=pts[i+1];g.quadraticCurveTo(x,y+dy,(x+x2)/2,(y+y2)/2+dy);}
    const l=pts[pts.length-1];g.lineTo(l[0],l[1]+dy);}
  function sparkle(x,y,s,a){g.strokeStyle=`rgba(255,255,255,${a})`;g.lineWidth=1;g.beginPath();g.moveTo(x-s,y);g.lineTo(x+s,y);g.moveTo(x,y-s);g.lineTo(x,y+s);g.stroke();}
  function topping(t){const k=t.k;
    if(k==="chashu"){g.fillStyle="#6b3420";g.beginPath();g.arc(0,0,14,0,6.2832);g.fill();g.fillStyle="#f3d2b0";g.beginPath();g.arc(0,0,12.4,0,6.2832);g.fill();
      g.fillStyle="#c9805b";g.beginPath();g.arc(.5,.5,9.6,0,6.2832);g.fill();g.strokeStyle="rgba(243,210,176,.75)";g.lineWidth=1.3;g.beginPath();g.arc(-1,0,5.5,.4,2.6);g.stroke();g.beginPath();g.arc(2,1,3.2,3.4,5.6);g.stroke();}
    else if(k==="egg"){g.fillStyle="#fff6e8";g.strokeStyle="#e5d2b4";g.lineWidth=1.2;g.beginPath();g.ellipse(0,0,13,10,0,0,6.2832);g.fill();g.stroke();
      const yo=g.createRadialGradient(-1.5,-1.5,.5,0,0,7);yo.addColorStop(0,"#ffe08a");yo.addColorStop(.55,"#ffad33");yo.addColorStop(1,"#ff7a1a");
      g.save();g.shadowColor="rgba(255,160,40,.9)";g.shadowBlur=10;g.fillStyle=yo;g.beginPath();g.arc(0,0,6.6,0,6.2832);g.fill();g.restore();}
    else if(k==="naruto"){g.fillStyle="#fffaf4";g.beginPath();for(let i=0;i<=28;i++){const a=i/28*6.2832,rr=i%2?9.2:10.4;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();
      g.strokeStyle="#ff6fa5";g.lineWidth=2;g.lineCap="round";g.beginPath();for(let i=0;i<=40;i++){const a=i/40*12.566,rr=.6+i/40*6.4;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.stroke();}
    else if(k==="nori"){g.fillStyle="#173326";g.strokeStyle="#2f5a45";g.lineWidth=1.2;g.beginPath();g.rect(-12,-9,24,18);g.fill();g.stroke();
      g.fillStyle="#8fb4ff";[[-6,-3],[4,2],[-1,5],[7,-5]].forEach(([x,y],i)=>{star5(x,y,i%2?1.6:2.2,.8,0);g.fill();});}
    else if(k==="star"){g.save();g.shadowColor="rgba(255,224,102,.8)";g.shadowBlur=6;g.fillStyle="#ffe066";star5(0,0,7.5,3.4,0);g.fill();g.restore();g.fillStyle="#ff6fa5";g.beginPath();g.arc(0,0,1.8,0,6.2832);g.fill();}
    else if(k==="onion"){g.strokeStyle="#7ee0b8";g.lineWidth=1.6;g.beginPath();g.arc(0,0,2.6,0,6.2832);g.stroke();g.fillStyle="rgba(170,255,210,.35)";g.fill();}}
  function drawRamen(){
    const now=performance.now(),bp=burstT?Math.min(1,(now-burstT)/750):0,c=160,show=Math.max(lv,burstT?3:0),fade=1-bp,K=bp*bp;
    g.clearRect(0,0,SZ,SZ);
    // a tiny ringed planet orbits the bowl: behind it on the far side, in front on the near side
    const oa=now/1500+th*.6,ox=c+Math.cos(oa)*RRX*1.32,oy=BCY+10+Math.sin(oa)*RRX*.36,front=Math.sin(oa)>0;
    const planet=()=>{g.save();g.globalAlpha=fade;g.translate(ox,oy);g.rotate(-.35);const pg=g.createRadialGradient(-2,-2,1,0,0,7);pg.addColorStop(0,"#d6e4ff");pg.addColorStop(1,"#5b7fd6");
      g.strokeStyle="rgba(255,198,107,.85)";g.lineWidth=1.4;g.beginPath();g.ellipse(0,0,12,3.6,0,Math.PI,6.2832);g.stroke();
      g.fillStyle=pg;g.beginPath();g.arc(0,0,6.5,0,6.2832);g.fill();g.beginPath();g.ellipse(0,0,12,3.6,0,0,Math.PI);g.stroke();g.restore();};
    if(!front)planet();
    // twinkles around the bowl
    for(const b of BODY){const x=c+Math.cos(b.a*2.1+now/4000)*118,y=c+Math.sin(b.a*1.7)*92,tw=.25+.25*Math.sin(now/300+b.st*20);sparkle(x,y,2.5+b.st*2,tw*fade);}
    if(bp<1){g.globalAlpha=fade;
      // foot, then the bowl's body (deep space blue, a neon band and stars that turn with it)
      const foot=BCY+RRX*.74;g.fillStyle="#120a2a";g.strokeStyle="rgba(127,212,255,.55)";g.lineWidth=1.5;g.beginPath();g.ellipse(c,foot,RRX*.4,RRX*.4*RK*.55,0,0,6.2832);g.fill();g.stroke();
      const body=()=>{g.beginPath();g.moveTo(c-RRX,BCY);g.bezierCurveTo(c-RRX,BCY+RRX*1.02,c+RRX,BCY+RRX*1.02,c+RRX,BCY);g.closePath();};
      const bg=g.createLinearGradient(c-RRX,0,c+RRX,0);bg.addColorStop(0,"#0c0720");bg.addColorStop(.35,"#2a1a5e");bg.addColorStop(.6,"#1d1446");bg.addColorStop(1,"#08051a");
      g.fillStyle=bg;body();g.fill();
      g.save();body();g.clip();
      g.strokeStyle=`rgba(255,111,165,${.7+.1*show})`;g.lineWidth=3;g.shadowColor="#ff6fa5";g.shadowBlur=8;g.beginPath();g.ellipse(c,BCY+RRX*.3,RRX*1.02,RRX*RK*1.02,0,0,Math.PI);g.stroke();
      g.strokeStyle="rgba(127,212,255,.55)";g.lineWidth=1.2;g.shadowColor="#7fd4ff";g.beginPath();g.ellipse(c,BCY+RRX*.4,RRX*.98,RRX*RK*.98,0,0,Math.PI);g.stroke();g.shadowBlur=0;
      for(const b of BODY){const ang=b.a+th;if(Math.sin(ang)<.08)continue;const w=RRX*Math.sqrt(Math.max(0,1-(b.h/.76)**2)),x=c+Math.cos(ang)*w,y=BCY+b.h*RRX+Math.sin(ang)*RK*w*.55;
        g.fillStyle=`rgba(255,240,200,${.5+.5*Math.sin(ang)})`;star5(x,y,2.6,1.1,0);g.fill();}
      g.restore();
      // rim: neon cyan into pink
      const rg=g.createLinearGradient(c-RRX,BCY,c+RRX,BCY);rg.addColorStop(0,"#7fd4ff");rg.addColorStop(.5,"#b48cff");rg.addColorStop(1,"#ff6fa5");
      g.fillStyle="#1a1038";g.beginPath();g.ellipse(c,BCY,RRX,RRX*RK,0,0,6.2832);g.fill();
      g.save();g.shadowColor="#b48cff";g.shadowBlur=12;g.strokeStyle=rg;g.lineWidth=4;g.beginPath();g.ellipse(c,BCY,RRX-2,(RRX-2)*RK,0,0,6.2832);g.stroke();g.restore();
      // broth: golden in the middle, nebula purple at the edges, warmer as you swipe
      const brg=g.createRadialGradient(c-14,BCY-10,4,c,BCY,BRX);brg.addColorStop(0,`rgb(255,${206+show*8},${120+show*10})`);brg.addColorStop(.5,"#e8893a");brg.addColorStop(.85,"#8a3d8f");brg.addColorStop(1,"#3a1d5e");
      g.save();g.beginPath();g.ellipse(c,BCY+2,BRX,BRX*RK,0,0,6.2832);g.fillStyle=brg;g.fill();g.clip();
      for(const b of BST){const [x,y]=bxy(b.a,b.r);const tw=.35+.35*Math.sin(now/240+b.st*30);g.fillStyle=`rgba(255,250,220,${tw})`;g.beginPath();g.arc(x,y+2,.6+b.st*1.1,0,6.2832);g.fill();}
      // noodles: wavy cream strands
      g.lineCap="round";g.lineJoin="round";
      for(const n of NOOD){const pts=[];for(let i=0;i<=26;i++){const t=i/26,a=n.a0+n.span*t,r=Math.min(.95,n.r0+n.amp*Math.sin(n.f*t*6.283+n.ph));pts.push(bxy(a,r));}
        const path=()=>curve(pts,2);
        g.strokeStyle="rgba(110,50,20,.45)";g.lineWidth=4.4;path();g.stroke();g.strokeStyle="#ffe9a8";g.lineWidth=2.6;path();g.stroke();g.strokeStyle="rgba(255,252,235,.8)";g.lineWidth=.8;path();g.stroke();}
      g.restore();g.globalAlpha=1;}
    // toppings: sorted far to near, flattened into the bowl; they fly out on the burst
    const tops=RTOP.map(t=>{const [x,y,z]=bxy(t.a,t.r);return {t,x,y:y+2,z};}).sort((a,b)=>a.z-b.z);
    for(const {t,x,y} of tops){let dx=x-c,dy=y-BCY;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const k=K*(120+t.st*170);
      g.save();g.globalAlpha=Math.max(0,1-bp*1.05);g.translate(x+dx*k,y+dy*k-bp*34*t.st);g.scale(1,RK+(1-RK)*bp);g.rotate(t.rot+th+bp*6*t.st);topping(t);g.restore();}
    if(bp<1){
      // noodle cracks: each swipe lays a glowing noodle across the bowl
      const pulse=.75+.25*Math.sin(now/90),ct=Math.cos(th),st2=Math.sin(th);
      for(const k of CR){const pts=k.p.map(([u,v])=>[c+(u*ct-v*st2)*BRX,BCY+2+(u*st2+v*ct)*BRX*RK]);
        const path=()=>curve(pts,0);
        g.lineCap="round";g.lineJoin="round";g.globalAlpha=fade;
        g.strokeStyle="rgba(60,18,40,.85)";g.lineWidth=5*k.w;path();g.stroke();
        g.save();g.globalCompositeOperation="lighter";g.strokeStyle=`rgba(255,150,40,${.22*pulse})`;g.lineWidth=11*k.w;path();g.stroke();
        g.strokeStyle=`rgba(255,${190+show*15},90,${.55*pulse})`;g.lineWidth=3.8*k.w;path();g.stroke();g.restore();
        g.strokeStyle="#fff1c4";g.lineWidth=1.7*k.w;path();g.stroke();g.globalAlpha=1;}
      // chopsticks resting across the rim (neon pink, they bob a little while you swipe)
      const bob=show?Math.sin(now/70)*1.2*show:0;g.save();g.globalAlpha=fade;g.lineCap="round";g.shadowColor="#ff6fa5";g.shadowBlur=8;
      [[0,"#ff8ad8"],[7,"#ff6fa5"]].forEach(([o,col])=>{g.strokeStyle=col;g.lineWidth=3.4;g.beginPath();g.moveTo(c+6+o,BCY-RRX*RK-26+bob);g.lineTo(c+RRX+18+o*.4,BCY+RRX*RK*.7+o+bob);g.stroke();});g.restore();
      // steam: three soft wisps, stronger as it heats up
      g.save();g.lineCap="round";g.shadowColor="rgba(255,255,255,.6)";g.shadowBlur=8;
      for(let i=0;i<3;i++){const x0=c-22+i*22,a=(.16+.08*show)*fade;g.strokeStyle=`rgba(255,255,255,${a})`;g.lineWidth=3;g.beginPath();
        for(let j=0;j<=16;j++){const t=j/16,y=BCY-8-t*58,x=x0+Math.sin(t*7+now/380+i*2)*(4+t*6);j?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
      g.restore();
      if(show){g.save();g.globalCompositeOperation="lighter";const gl=g.createRadialGradient(c,BCY,4,c,BCY,BRX*1.2);gl.addColorStop(0,`rgba(255,190,90,${.08*show})`);gl.addColorStop(1,"rgba(255,120,40,0)");g.globalAlpha=fade;g.fillStyle=gl;g.beginPath();g.arc(c,BCY,BRX*1.2,0,6.2832);g.fill();g.restore();}}
    if(front)planet();
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
    SH.audio.game();   // iPhone: heard with the silent switch on; your music dips for a moment instead of stopping
    if(!ac){ac=SH.audio.ctx();if(!ac)return false;const b=ac.createBuffer(1,1,22050),sr=ac.createBufferSource();sr.buffer=b;sr.connect(ac.destination);sr.start(0);}
    if(ac.state!=="running")ac.resume();loadChime();return true;}catch(e){return false;}}
  function whoosh(){if(!audio())return;const t=ac.currentTime+.01,len=ac.sampleRate*.5,bf=ac.createBuffer(1,len,ac.sampleRate),d=bf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/len);
    const sr=ac.createBufferSource(),fl=ac.createBiquadFilter(),gn=ac.createGain();sr.buffer=bf;fl.type="bandpass";fl.Q.value=2;fl.frequency.setValueAtTime(500,t);fl.frequency.exponentialRampToValueAtTime(2600,t+.4);
    gn.gain.value=.12;sr.connect(fl);fl.connect(gn);gn.connect(ac.destination);sr.start(t);}
  // the notes are real: four 0.5 s slices cut from the shack song (F4, Ab4, C5, F5 = its F-minor arpeggio)
  let chBuf=null,chLoad=false;
  function loadChime(){if(chBuf||chLoad||!ac)return;chLoad=true;fetch("chime.mp3?v=1").then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(b=>{chBuf=b;}).catch(()=>{chLoad=false;});}
  function note(i,at,vol,oct){const r=oct||1;if(chBuf){const s=ac.createBufferSource(),gn=ac.createGain();s.buffer=chBuf;s.playbackRate.value=r;gn.gain.value=vol;s.connect(gn);gn.connect(ac.destination);s.start(at,i*.6,.58);}
    else tone([698.5,830.6,1046.5,1396.9][i]*r,at,.4,vol*.05);}   // synth stand-in until the sample loads
  function tick(n){if(!audio())return;loadChime();note(Math.min(2,n-1),ac.currentTime+.003,.9);}   // F4, Ab4, C5: climbing
  function boom(){if(!audio())return;loadChime();const t=ac.currentTime+.003;
    const o=ac.createOscillator(),gn=ac.createGain();o.frequency.setValueAtTime(174.6,t);o.frequency.exponentialRampToValueAtTime(43.65,t+.35);   // low thump
    gn.gain.setValueAtTime(.2,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.45);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+.5);
    // ticks climbed F4-Ab4-C5; the burst keeps climbing and resolves on the high tonic
    const run=[[3,1],[1,2],[2,2],[3,2]];                       // F5, Ab5, C6, F6
    run.forEach(([n,r],k)=>note(n,t+.02+k*.085,.75+k*.12,r));
    const top=t+.02+3*.085;
    tone(1396.9,top,1.6,.07,"sine");tone(698.5,top,1.4,.05,"sine");tone(2793.8,top+.02,0.9,.018,"triangle");   // ring out on F so it feels finished
  }
  function buzz(p){try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}}
  // finger spot -> point on the sphere (undo the tilt and the current turn), then a jagged fault both ways from it
  function hit(px,py){const d=px*px+py*py;if(d>.96){px*=.97/Math.sqrt(d);py*=.97/Math.sqrt(d);}
    const x=px,y=py,z=Math.sqrt(Math.max(0,1-x*x-y*y)),y0=y*ct+z*stl,z0=-y*stl+z*ct;
    return[Math.asin(Math.max(-1,Math.min(1,y0))),Math.atan2(x,z0)-th];}
  function addCracks(px,py,n){for(let i=0;i<n;i++){const[la,lo]=hit(px+(i?(Math.random()-.5)*.35:0),py+(i?(Math.random()-.5)*.35:0)),h=Math.random()*6.283;
    const f=walk(la,lo,h,6+(Math.random()*3|0),.13),bk=walk(la,lo,h+Math.PI,5+(Math.random()*3|0),.13);
    CR.push({p:bk.reverse().concat(f.slice(1)),w:i?.75:1});
    const m=f[3]||f[1];CR.push({p:walk(m[0],m[1],h+(Math.random()<.5?1:-1)*(.8+Math.random()*.6),4,.11),w:.55});}}
  function crack(){if(mode==="disco")CR.forEach(k=>{const m=k.p[k.p.length>>1];CR.push({p:walk(m[0],m[1],Math.random()*6.283,3,.1),w:.4});});
    if(mode==="ramen")CR.forEach(k=>{const m=k.p[k.p.length>>1];CR.push({p:noodle(m[0],m[1],Math.random()*6.283,8),w:.45});});
    busy=true;mode==="globe"?boomG():mode==="ramen"?ramenJingle():boom();go();
    function go(){ball.classList.remove("lv1","lv2");ball.classList.add("burst");burstT=performance.now();if(still)draw();
    buzz([40,30,90]);
    flash.classList.remove("go");void flash.offsetWidth;flash.classList.add("go");
    sparks.innerHTML="";for(let i=0;i<30;i++){const a=Math.random()*6.283,rr=60+Math.random()*130,e=document.createElement("i");e.className="dsp";
      const col=mode==="ramen"?RCOL[i%RCOL.length]:`hsl(${Math.random()*360} 100% 70%)`;
      e.style.cssText=`--dx:${Math.cos(a)*rr}px;--dy:${Math.sin(a)*rr-30}px;--dl:${Math.random()*.15}s;background:${col};width:${8+Math.random()*12}px;height:${8+Math.random()*12}px`;
      sparks.appendChild(e);}
    setTimeout(()=>{if(mode==="globe"&&window.NIGHT&&NIGHT.surpriseNight)NIGHT.surpriseNight();else if(mode==="ramen"){if(window.SPOTS&&SPOTS.ramenPop)SPOTS.ramenPop();}else surpriseMe();},mode==="ramen"?900:420);
    setTimeout(()=>{burstT=0;setLv(0);spin=BASE[0];ball.classList.remove("burst");ball.classList.add("fresh");sparks.innerHTML="";busy=false;
      setTimeout(()=>ball.classList.remove("fresh"),700);if(still)draw();},1700);}}
  const RCOL=["#ffe9a8","#ff6fa5","#ffad33","#7ee0b8","#c9805b","#fff6e8","#ffe066","#8fb4ff"];
  // ramen: wavy noodle "cracks" in the bowl's own flat frame (u,v on the unit disk, unturned), from where your finger lands
  function noodle(u,v,hd,n){const p=[[u,v]];for(let i=0;i<n;i++){hd+=(Math.random()-.5)*.7;const w=Math.sin(i*1.6)*.035;u+=Math.cos(hd)*.12-Math.sin(hd)*w;v+=Math.sin(hd)*.12+Math.cos(hd)*w;
    const r=Math.hypot(u,v);if(r>1.04){u*=1.04/r;v*=1.04/r;hd+=Math.PI*.6;}p.push([u,v]);}return p;}
  function bowlHit(px,py){let x=px*78/BRX,y=(160-py*78-BCY-2)/(BRX*RK);   // finger (ball units, 78 px radius) -> canvas px -> broth disk
    const r=Math.hypot(x,y);if(r>.95){x*=.95/r;y*=.95/r;}const ct=Math.cos(-th),st2=Math.sin(-th);return [x*ct-y*st2,x*st2+y*ct];}
  function addNoodles(px,py,n){for(let i=0;i<n;i++){const [u,v]=bowlHit(px+(i?(Math.random()-.5)*.4:0),py+(i?(Math.random()-.5)*.4:0)),h=Math.random()*6.283;
    const f=noodle(u,v,h,6+(Math.random()*3|0)),bk=noodle(u,v,h+Math.PI,5+(Math.random()*3|0));CR.push({p:bk.reverse().concat(f.slice(1)),w:i?.75:1});
    const m=f[3]||f[1];CR.push({p:noodle(m[0],m[1],h+(Math.random()<.5?1:-1)*1.1,5),w:.55});}}
  // globe: smooth neon routes from where your finger lands
  function smooth(lat,lon,hd,n,st){const p=[[lat,lon]];for(let i=0;i<n;i++){hd+=(Math.random()-.5)*.35;lat+=Math.sin(hd)*st;lon+=Math.cos(hd)*st/Math.max(.3,Math.cos(lat));p.push([lat,lon]);}return p;}
  function addRoutes(px,py,n){const t0=performance.now();for(let i=0;i<n;i++){const[la,lo]=hit(px+(i?(Math.random()-.5)*.4:0),py+(i?(Math.random()-.5)*.4:0)),h=Math.random()*6.283;
    CR.push({p:smooth(la,lo,h,12,.075),w:1,t0});const m=CR[CR.length-1].p[6];CR.push({p:smooth(m[0],m[1],h+(Math.random()<.5?1:-1)*1.1,7,.07),w:.6,t0:t0+180});}}
  // globe sounds: sonar pings that climb (same F-minor notes), then a departure-board chime when the night is planned
  function echoOut(){const d=ac.createDelay(1),fb=ac.createGain(),out=ac.createGain();d.delayTime.value=.19;fb.gain.value=.38;out.gain.value=.5;d.connect(fb);fb.connect(d);d.connect(out);out.connect(ac.destination);return d;}
  function bell(f,at,len,vol,dst){[[1,1],[2.76,.18],[5.4,.06]].forEach(([m,v])=>{const o=ac.createOscillator(),gn=ac.createGain();o.type="sine";o.frequency.value=f*m;
    gn.gain.setValueAtTime(0,at);gn.gain.linearRampToValueAtTime(vol*v,at+.008);gn.gain.exponentialRampToValueAtTime(.0001,at+len/m**.3);o.connect(gn);gn.connect(ac.destination);if(dst)gn.connect(dst);o.start(at);o.stop(at+len+.1);});}
  function ping(n){if(!audio())return;const t=ac.currentTime+.003,f=[698.5,830.6,1046.5][Math.min(2,n-1)],e=echoOut();
    const o=ac.createOscillator(),gn=ac.createGain();o.type="sine";o.frequency.setValueAtTime(f*1.02,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);
    gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+.006);gn.gain.exponentialRampToValueAtTime(.0001,t+.7);o.connect(gn);gn.connect(ac.destination);gn.connect(e);o.start(t);o.stop(t+.8);}
  function boomG(){if(!audio())return;const t=ac.currentTime+.003,len=ac.sampleRate*1.1,bf=ac.createBuffer(1,len,ac.sampleRate),d=bf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(Math.sin(Math.PI*i/len),1.5);
    const sr=ac.createBufferSource(),fl=ac.createBiquadFilter(),gn=ac.createGain();sr.buffer=bf;fl.type="bandpass";fl.Q.value=1.4;fl.frequency.setValueAtTime(260,t);fl.frequency.exponentialRampToValueAtTime(3200,t+1);
    gn.gain.value=.13;sr.connect(fl);fl.connect(gn);gn.connect(ac.destination);sr.start(t);            // lift-off
    const e=echoOut();bell(1046.5,t+.18,1.3,.12,e);bell(830.6,t+.42,1.3,.11,e);bell(1396.9,t+.66,2,.13,e);}   // C6, Ab5, F6: "your night is boarding"
  // ramen sounds: each swipe is a bubbly bloop (same F-minor climb); the fourth plays the ramen jingle:
  // a slurp, a plucked-string tune in F minor pentatonic on the song's 16th grid, woodblock ticks, then a bell chord
  const plucks={};
  function pluck(f){const k=Math.round(f);if(plucks[k])return plucks[k];const sr=ac.sampleRate,n=Math.round(sr*1.1),N=Math.max(2,Math.round(sr/f)),b=ac.createBuffer(1,n,sr),d=b.getChannelData(0),ring=new Float32Array(N);
    for(let i=0;i<N;i++)ring[i]=Math.random()*2-1;let p=0;for(let i=0;i<n;i++){const nx=(p+1)%N;d[i]=ring[p];ring[p]=.497*(ring[p]+ring[nx]);p=nx;}   // Karplus-Strong: a plucked string
    return plucks[k]=b;}
  function pl(f,at,vol){const s2=ac.createBufferSource(),gn=ac.createGain(),lp=ac.createBiquadFilter();s2.buffer=pluck(f);lp.type="lowpass";lp.frequency.value=Math.min(9000,f*6);gn.gain.value=vol;s2.connect(lp);lp.connect(gn);gn.connect(ac.destination);s2.start(at);}
  function bloop(n){if(!audio())return;const t=ac.currentTime+.003,f=[349.2,415.3,523.3][Math.min(2,n-1)];
    const o=ac.createOscillator(),gn=ac.createGain();o.type="sine";o.frequency.setValueAtTime(f*.55,t);o.frequency.exponentialRampToValueAtTime(f*1.9,t+.09);
    gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(.16,t+.01);gn.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+.2);
    pl(f*2,t+.06,.35);}
  function slurp(t,len,f0,f1,vol){const n=ac.sampleRate*len,bf=ac.createBuffer(1,n,ac.sampleRate),d=bf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/n);
    const sr=ac.createBufferSource(),fl=ac.createBiquadFilter(),gn=ac.createGain();sr.buffer=bf;fl.type="bandpass";fl.Q.value=6;fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+len);
    gn.gain.value=vol;sr.connect(fl);fl.connect(gn);gn.connect(ac.destination);sr.start(t);}
  function block(t){const o=ac.createOscillator(),gn=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(1300,t+.03);
    gn.gain.setValueAtTime(.09,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.06);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+.08);}
  function ramenJingle(){if(!audio())return;const t=ac.currentTime+.01;
    slurp(t,.42,380,2600,.16);   // the slurp
    const F5=698.5,Ab5=830.6,Bb5=932.3,C6=1046.5,Eb6=1244.5,F6=1396.9,T=t+.36;
    [[C6,0],[Eb6,1],[F6,2],[Eb6,3],[C6,4],[Ab5,6],[Bb5,7],[C6,8],[Eb6,10],[F6,11]].forEach(([f,k])=>pl(f,T+k*STEP,.55));
    pl(174.6,T,.6);pl(207.7,T+4*STEP,.5);pl(233.1,T+8*STEP,.5);pl(174.6,T+11*STEP,.6);        // bass: F3, Ab3, Bb3, F3
    [0,2,4,6,8,10].forEach(k=>block(T+k*STEP+(k%4?0:.001)));
    const top=T+11*STEP,e=echoOut();bell(F5,top,1.6,.1,e);bell(C6,top+.03,1.6,.08,e);bell(F6,top+.06,2,.1,e);}
  // flick the ball up: it flies off and the other one drops in
  const HINT={disco:"Swipe the disco ball sideways four times for a random show. Flick it up to swap in the globe, or pull it down for space ramen 🍜",
    globe:"Swipe the globe sideways four times and it plans a whole night: food, a show and afters. Flick it up to bring back the disco ball, or pull it down for space ramen 🍜",
    ramen:"Swipe the bowl sideways four times and it serves up a random food spot and afters. Pull it down again (or flick it up) to put it back."};
  const LABEL={disco:"Surprise me: swipe the disco ball sideways four times",globe:"Plan a night: swipe the globe sideways four times",ramen:"Space ramen: swipe the bowl sideways four times for a random food spot and afters"};
  let base="disco";   // which ball the bowl swaps back to (disco on Home, globe on Plan)
  // the hint lives next to wherever the ball is (home, or the bottom of the Plan page)
  const hint=()=>document.querySelectorAll(".bdisco-h p").forEach(p=>p.textContent=HINT[mode]);
  hint();
  ball.style.touchAction="none";
  function apply(to){mode=to;if(to!=="ramen")base=to;setLv(0);th=mode==="globe"?HOME_TH:-.05;spin=BASE[0];dir=1;CR=[];
    ball.classList.toggle("globe",mode==="globe");ball.classList.toggle("ramen",mode==="ramen");ball.setAttribute("aria-label",LABEL[mode]);hint();}
  // b.js calls this when the ball moves between Home (disco ball) and Plan (globe)
  window.DISCO={get mode(){return mode;},set(to){if(to===mode||busy||(mode==="ramen"&&base===to))return;apply(to);draw();}};
  function flip(){if(busy)return;busy=true;audio();
    if(ac){const t=ac.currentTime+.003,o=ac.createOscillator(),gn=ac.createGain();o.type="sine";o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(1400,t+.28);
      gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(.08,t+.05);gn.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+.35);}
    buzz(15);ball.classList.remove("lv1","lv2","dropin");ball.classList.add("flyup");
    setTimeout(()=>{apply(mode==="ramen"?base:mode==="globe"?"disco":"globe");
      ball.classList.remove("flyup");void ball.offsetWidth;ball.classList.add("dropin");draw();
      if(ac){mode==="globe"?ping(1):tick(1);}
      setTimeout(()=>{ball.classList.remove("dropin");busy=false;},560);},320);}
  // pull the ball down: it drops out the bottom and the ramen bowl drops in (or the bowl goes back to the ball)
  function bowl(){if(busy)return;busy=true;audio();
    if(ac){const t=ac.currentTime+.003;slurp(t,.3,mode==="ramen"?2200:700,mode==="ramen"?500:2400,.12);}
    buzz([10,30,10]);ball.classList.remove("lv1","lv2","dropin");ball.classList.add("flydown");
    setTimeout(()=>{apply(mode==="ramen"?base:"ramen");
      ball.classList.remove("flydown");void ball.offsetWidth;ball.classList.add("dropin");draw();
      if(ac){mode==="ramen"?bloop(1):mode==="globe"?ping(1):tick(1);}
      setTimeout(()=>{ball.classList.remove("dropin");busy=false;},560);},320);}
  // first visit: a ghost finger acts out the gestures until you touch the ball once (most people never find hidden swipes)
  let ghost=null;try{if(!SH.store.raw("shack-ballhint")){ghost=document.createElement("div");ghost.className="dghost";ghost.setAttribute("aria-hidden","true");
    ghost.innerHTML='<i>👆</i><span>swipe ↔︎ · pull ↓ · flick ↑</span>';box.querySelector(".dstage").appendChild(ghost);}}catch(e){}
  const unghost=()=>{if(!ghost)return;ghost.classList.add("bye");const gh=ghost;ghost=null;setTimeout(()=>gh.remove(),300);try{SH.store.put("shack-ballhint","1");}catch(e){}};
  let ys=0,onBall=false,xt=0;
  let tx=.0,ty=.0;
  function mark(e){const rc=ball.getBoundingClientRect();tx=(e.clientX-rc.left-rc.width/2)/(rc.width/2);ty=-(e.clientY-rc.top-rc.height/2)/(rc.height/2);}
  function swipe(d,sp){if(busy)return;whoosh();dir=d||dir;idle=performance.now();spin=sp||.12;
    if(still){th+=dir*.7;draw();}
    if(lv<3){(mode==="globe"?addRoutes:mode==="ramen"?addNoodles:addCracks)(tx,ty,lv===2?2:1);setLv(lv+1);mode==="globe"?ping(lv):mode==="ramen"?bloop(lv):tick(lv);buzz(12*(lv+1));}else crack();}
  // the whole disco area is the swipe zone (not just the ball); the ball keeps your finger's speed when you let go
  let trk=[];
  let fired=false;
  const vel=()=>{const a=trk[0],z=trk[trk.length-1],dtm=Math.max(16,z[1]-a[1]);return (z[0]-a[0])/dtm;};   // px per ms
  box.addEventListener("pointerdown",e=>{unghost();if(busy)return;audio();x0=e.clientX;xs=x0;ys=e.clientY;onBall=!!e.target.closest(".dball");moved=0;fired=false;trk=[[e.clientX,performance.now()]];mark(e);try{box.setPointerCapture(e.pointerId);}catch(_){}});
  box.addEventListener("pointermove",e=>{if(x0==null)return;const dx=e.clientX-x0;moved=Math.max(moved,Math.abs(e.clientX-xs));
    th+=dx*.0128;x0=e.clientX;if(dx)dir=dx>0?1:-1;mark(e);const n=performance.now();trk.push([e.clientX,n]);while(trk.length>2&&n-trk[0][1]>90)trk.shift();spin=0;if(still)draw();
    if(!fired&&moved>=24&&Math.abs(e.clientX-xs)>Math.abs(e.clientY-ys)){fired=true;const v=vel();if(Math.abs(v)>.05)dir=v>0?1:-1;swipe(dir,.12);spin=0;}});   // sound + crack right as the swipe registers
  const end=e=>{if(x0==null)return;x0=null;audio();
    const fdx=e.clientX-xs,fdy=e.clientY-ys;if(onBall&&!fired&&Math.abs(fdy)>35&&Math.abs(fdy)>Math.abs(fdx)){fdy<0?flip():bowl();return;}
    if(moved>=24){const v=vel();if(Math.abs(v)>.05)dir=v>0?1:-1;const sp=Math.min(.6,Math.max(.05,Math.abs(v)*.214));
      if(fired){spin=sp;idle=performance.now();}else swipe(dir,sp);}};   // already sounded mid-swipe: just hand over the finger's speed   // .0128 rad per px * 16.7 ms = .214 rad per frame per px/ms
  box.addEventListener("touchend",()=>{audio();},{passive:true});   // iPhone only allows sound to start on a finger-up inside the disco area
  box.addEventListener("pointerup",end);box.addEventListener("pointercancel",()=>{x0=null;});
  ball.addEventListener("keydown",e=>{unghost();if(e.key==="ArrowUp"){e.preventDefault();flip();return;}if(e.key==="ArrowDown"){e.preventDefault();bowl();return;}if(e.key==="Enter"||e.key===" "){e.preventDefault();tx=(Math.random()-.5)*1.1;ty=(Math.random()-.5)*1.1;swipe(1);}});
})();
