/* Venues page: the "Chowder" effect. A nebula that stays pinned to the screen and shows only
   through the venue cards, so the cards slide over a still pattern like windows into space.
   One fixed WebGL canvas; each frame it is masked to the on-screen card rectangles. */
(function(){
  const cv=document.getElementById("nebfx"); if(!cv)return;
  const gl=cv.getContext("webgl",{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:"low-power"});
  if(!gl)return;
  const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX=32;
  const VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FS=`precision mediump float;
uniform sampler2D tex;uniform vec2 res;uniform float t;uniform float k;uniform vec4 R[${MAX}];uniform int n;uniform float rad;uniform float oy;
vec2 flow(vec2 p,float t){
  p+=0.030*vec2(sin(p.y*5.0+t*0.9)+0.6*sin(p.y*11.0-t*0.6+p.x*3.0), cos(p.x*4.0-t*0.8)+0.6*cos(p.x*9.0+t*0.7+p.y*2.0));
  p+=0.018*vec2(sin(p.y*8.0-p.x*4.0+t*1.1), cos(p.x*7.0+p.y*5.0-t*1.0));
  return p;}
float box(vec2 p,vec4 r){vec2 c=r.xy+r.zw*0.5;vec2 q=abs(p-c)-r.zw*0.5+rad;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-rad;}
void main(){
  vec2 p=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);
  float d=1e5;
  for(int i=0;i<${MAX};i++){if(i>=n)break;d=min(d,box(p,R[i]));}
  float a=1.0-smoothstep(-1.0,1.0,d);
  if(a<=0.0){gl_FragColor=vec4(0.0);return;}
  vec2 uv=(p+vec2(0.0,oy))/k/720.0;                 // galaxy drifts behind at a slower parallax                                  // screen-fixed: one tile per ~720 CSS px
  vec2 w=flow(uv,t)+vec2(t*0.004,-t*0.0025);          // slow drift; the tile repeats, so no seams
  vec3 c=texture2D(tex,w).rgb;
  float l=dot(c,vec3(0.3,0.5,0.2));
  vec2 cell=floor(w*1024.0/3.0);
  vec2 m=mod(cell,61.0);float tw=sin(t*5.0+fract(sin(dot(m,vec2(1.271,3.113)))*437.585)*6.2832);   // small numbers: safe at phone (mediump) precision
  float hp=l-dot(texture2D(tex,w,3.0).rgb,vec3(0.3,0.5,0.2));   // star = much brighter than its blurred surroundings
  c+=vec3(smoothstep(0.06,0.3,hp)*tw*0.5);            // only stars twinkle, clouds stay smooth
  gl_FragColor=vec4(c*a,a);}`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s;}
  let pr;
  try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw 0;}catch(e){return;}
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const U=x=>gl.getUniformLocation(pr,x),uRes=U("res"),uT=U("t"),uK=U("k"),uR=U("R"),uN=U("n"),uRad=U("rad"),uOy=U("oy");
  gl.clearColor(0,0,0,0);
  const rects=new Float32Array(MAX*4);
  let k=1,ready=false,raf=0,last=0,tt=0,sig="",lastScroll=0;
  addEventListener("scroll",()=>{lastScroll=performance.now();},{passive:true});   // pause the slow drift while scrolling so the GPU only follows your finger
  // The canvas is anchored to the page (not fixed to the screen) and covers the viewport plus a margin,
  // so the windows ride with their boxes during scrolling, even when iOS delays redraws. The galaxy inside
  // is drawn with a parallax offset, so it still feels like a deep, still sky behind the boxes.
  const EXT=0.6,PAR=0.0;   // 0 = the galaxy rides with its box: nothing has to be redrawn while you scroll
  let vw=0,vh=0,cTop=-1e9,H=0;
  // the canvas lives in a clipped box as tall as the page content, so it can never make the page longer
  const clip=document.createElement("div");clip.style.cssText="position:absolute;left:0;top:0;width:100%;height:0;overflow:hidden;pointer-events:none;z-index:-1";
  cv.parentNode.insertBefore(clip,cv);clip.appendChild(cv);
  cv.style.position="absolute";cv.style.left="0";
  const wrapEl=document.querySelector(".wrap");
  function docH(){const pb=parseFloat(getComputedStyle(document.body).paddingBottom)||0;return Math.ceil((wrapEl?wrapEl.getBoundingClientRect().bottom+scrollY:document.body.scrollHeight)+pb);}
  function size(){k=Math.min(1.5,(devicePixelRatio||1)*0.75);
    if(innerWidth!==vw||innerHeight!==vh){vw=innerWidth;vh=innerHeight;H=Math.round(vh*(1+2*EXT));cv.style.width=vw+"px";cv.style.height=H+"px";cTop=-1e9;}
    const w=Math.round(vw*k),h=Math.round(H*k);
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h);gl.uniform2f(uRes,w,h);gl.uniform1f(uK,k);sig="";}
    place();}
  function place(){const dh=docH();if(clip.style.height!==dh+"px")clip.style.height=dh+"px";
    const want=Math.max(0,Math.min(scrollY-vh*EXT,dh-H));
    if(Math.abs(want-cTop)>vh*0.45){cTop=Math.round(want);cv.style.top=cTop+"px";sig="";}}
  function collect(){
    let n=0,s="";const sy=scrollY;
    const tiles=true;
    for(const el of document.querySelectorAll(tiles?"#bTiles .btile":"#list .vcard .vf")){
      if(n>=MAX)break;
      const r=el.getBoundingClientRect(),top=r.top+sy-cTop;
      if(!r.width||top+r.height<0||top>H)continue;
      rects[n*4]=(r.left+1)*k;rects[n*4+1]=(top+1)*k;rects[n*4+2]=(r.width-2)*k;rects[n*4+3]=(r.height-2)*k;
      s+=Math.round(top)+","+Math.round(r.height)+";";n++;}
    gl.uniform1f(uRad,(tiles?18:12)*k);
    return [n,(tiles?"t":"v")+cTop+s];}
  function draw(force){
    place();
    const [n,s]=collect();
    if(!force&&s===sig)return;
    sig=s;
    gl.uniform4fv(uR,rects);gl.uniform1i(uN,n);gl.uniform1f(uT,tt);gl.uniform1f(uOy,(cTop-scrollY*PAR)*k);
    gl.clear(gl.COLOR_BUFFER_BIT);if(n)gl.drawArrays(gl.TRIANGLES,0,3);}
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(innerWidth!==vw||innerHeight!==vh)size();
    const dt=now-last;
    if(!still&&dt>=33&&now-lastScroll>180){last=now;tt+=Math.min(dt,100)/1000*0.35;draw(true);}   // ~30 fps drift
    else draw(false);                                                         // every frame: keep the windows under the cards while scrolling
  }
  const on=()=>document.body.classList.contains("nebtiles")&&!document.hidden;   // venues use the CSS sky below, not WebGL
  function sync(){
    if(!ready)return;
    if(on()){size();if(!raf){last=0;sig="";raf=requestAnimationFrame(frame);}}
    else if(raf){cancelAnimationFrame(raf);raf=0;gl.clear(gl.COLOR_BUFFER_BIT);}}
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("visibilitychange",sync);
  addEventListener("resize",()=>{if(raf){size();draw(true);}});
  cv.addEventListener("webglcontextlost",e=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;ready=false;document.body.classList.remove("nebok");});
  const img=new Image();
  img.onload=()=>{
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    ready=true;document.body.classList.add("nebok");sync();};
  img.src="nebula.jpg?v=1";
})();
/* Venues: each card shows its own slice of one big page-wide sky (plain CSS background), so it is
   glued to the card and the browser scrolls it for free. No redraws while scrolling = no stutter. */
(function(){
  const list=document.getElementById("list");if(!list)return;
  let q=0;
  function place(){q=0;if(!document.body.classList.contains("neb"))return;const sy=scrollY;
    for(const el of list.querySelectorAll(".vcard .vf")){const r=el.getBoundingClientRect();if(!r.width)continue;
      const x=Math.round(-r.left)+"px",y=Math.round(-((r.top+sy)%720))+"px";
      if(el.style.getPropertyValue("--ny")!==y){el.style.setProperty("--nx",x);el.style.setProperty("--ny",y);}}}
  const later=()=>{if(!q){q=1;requestAnimationFrame(place);}};
  new MutationObserver(later).observe(list,{childList:true,subtree:true});
  new MutationObserver(later).observe(document.body,{attributes:true,attributeFilter:["class"]});
  addEventListener("resize",later);
})();
