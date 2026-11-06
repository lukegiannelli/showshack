// Planning-box water: the beach photo with surface ripples, a slow wash up and back, and glints that shimmer.
(function(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  [".start","#budgetBar"].forEach(sel=>{const box=document.querySelector(sel), cv=box&&box.querySelector(".waterfx"); if(cv) setup(box,cv,sel!==".start");});
  function setup(box,cv,crop){
  const gl=cv.getContext("webgl",{alpha:false,antialias:false,powerPreference:"low-power"}); if(!gl) return;
  const VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const FS=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D tex;uniform vec2 res;uniform vec2 sc;uniform float t;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return .55*n(p)+.3*n(p*2.03+7.1)+.15*n(p*4.1+3.3);}
// ripple field that keeps sliding toward shore (two phases cross-faded so it never stretches)
vec2 ripple(vec2 p,float ph){
  vec2 q=p+vec2(0.,ph*1.6);
  return vec2(fbm(q+vec2(t*.05,0.)),fbm(q+vec2(5.2,1.3)-vec2(t*.04,0.)))-.5;}
vec3 S(vec2 u){vec2 m=1.-abs(mod(u,2.)-1.);return texture2D(tex,m).rgb;}
void main(){
  vec2 f=gl_FragCoord.xy/res;f.y=1.-f.y;
  vec2 uv=(f-.5)*sc+.5;
  vec2 p=uv*vec2(7.,10.);
  float ph0=fract(t*.07),ph1=fract(t*.07+.5);
  float w0=1.-abs(1.-2.*ph0),w1=1.-abs(1.-2.*ph1);
  vec2 d=(ripple(p,ph0)*w0+ripple(p+3.7,ph1)*w1)/(w0+w1+1e-3);
  vec2 d2=vec2(n(p*2.6+vec2(t*.22,-t*.55)),n(p*2.6+vec2(9.,3.)+vec2(-t*.17,-t*.5)))-.5;
  // swash: the whole sheet of water surges up the beach, then slides back
  float sw=sin(t*.5)+.4*sin(t*1.17+1.3);
  float band=1.-smoothstep(.0,.55,uv.y);
  vec2 u=uv+d*.04+d2*.011+vec2(0.,.006*sw*(.45+band));
  vec3 c=S(u);
  vec3 c2=S(uv-d*.05-d2*.014+vec2(.004*sin(t*.9),-.003));
  vec3 col=c*.62+c2*.38;
  // glints: bright specks flicker as the surface tilts
  float lum=dot(c,vec3(.333));
  float sp=smoothstep(.80,1.,lum)*smoothstep(.0,.9,uv.y+.35);
  float tw=.55+.45*sin(t*2.6+n(uv*70.)*12.);
  col+=vec3(.95,.97,1.)*sp*tw*.32;
  col+=vec3(1.,.97,.95)*.05*pow(n(uv*vec2(26.,38.)+vec2(t*.3,-t*.8)),5.)*6.;
  gl_FragColor=vec4(col,1.);}`;
  function sh(type,src){const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o;}
  let pr;try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw 0;}catch(e){return;}
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const U=k=>gl.getUniformLocation(pr,k),uRes=U("res"),uT=U("t"),uSc=U("sc");
  const img=new Image();
  img.onload=()=>{
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const ia=img.width/img.height,scale=Math.min(1,(devicePixelRatio||1)*.6);
    let tt=0,last=0,raf=0,vis=false,scrolling=0,ready=false;
    const draw=()=>{gl.uniform1f(uT,tt);gl.drawArrays(gl.TRIANGLES,0,3);};
    function size(){const r=box.getBoundingClientRect();if(!r.width||!r.height)return;
      const w=Math.max(2,Math.round(r.width*scale)),h=Math.max(2,Math.round(r.height*scale));
      if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h);gl.uniform2f(uRes,w,h);}
      const ba=r.width/r.height;gl.uniform2f(uSc,1,crop?Math.min(1,Math.max(.22,ia/ba*1.6)):1);draw();}
    function frame(now){raf=requestAnimationFrame(frame);
      if(now-scrolling<220){last=now;return;}          // hold still while scrolling, like the page background
      const dt=now-last;if(dt<33)return;last=now;
      tt+=Math.min(dt,100)/1000;draw();}
    const run=()=>{if(vis&&!document.hidden&&ready&&!raf){last=0;raf=requestAnimationFrame(frame);}};
    const stop=()=>{if(raf){cancelAnimationFrame(raf);raf=0;}};
    new IntersectionObserver(es=>{vis=es[0].isIntersecting;vis?run():stop();},{rootMargin:"60px"}).observe(box);
    if("ResizeObserver" in window)new ResizeObserver(size).observe(box);else addEventListener("resize",size);
    addEventListener("scroll",()=>{scrolling=performance.now();},{passive:true});
    addEventListener("touchmove",()=>{scrolling=performance.now();},{passive:true});
    document.addEventListener("visibilitychange",()=>{document.hidden?stop():run();});
    cv.addEventListener("webglcontextlost",e=>{e.preventDefault();stop();cv.style.display="none";});
    ready=true;size();run();
  };
  img.src="water.jpg?v=1";
}
})();
