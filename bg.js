(function(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box=document.getElementById("bgfx"), cv=box.querySelector("canvas");
  const gl=cv.getContext("webgl",{alpha:false,antialias:false,powerPreference:"low-power",preserveDrawingBuffer:false});
  if(!gl) return;
  const m=/url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(document.documentElement).getPropertyValue("--sky"));
  if(!m) return;
  const VS="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  // Domain-warped flow: layered sine currents push the texture lookup around, like slow ink in water.
  const FS=`precision mediump float;
uniform sampler2D tex;uniform vec2 res;uniform float t;uniform float scroll;uniform float aspect;
// Night sky: cover-fit the photo, let the sky breathe very gently, keep the treeline perfectly still.
void main(){
  vec2 f=vec2(gl_FragCoord.x, res.y-gl_FragCoord.y)/res;            // 0..1, y down
  float A=res.y/res.x;                                               // screen h/w
  vec2 uv=A>aspect ? vec2(0.5+(f.x-0.5)*aspect/A, f.y) : vec2(f.x, 0.5+(f.y-0.5)*A/aspect);
  float sky=1.0-smoothstep(0.70,0.80,uv.y);                          // no motion near the trees
  vec2 w=uv+sky*0.004*vec2(sin(uv.y*9.0+t*0.7)+0.5*sin(uv.y*17.0-t*0.5+uv.x*4.0), cos(uv.x*8.0-t*0.6)+0.5*cos(uv.x*15.0+t*0.4));
  vec3 c=texture2D(tex,clamp(w,0.0,1.0)).rgb;
  float l=dot(c,vec3(0.3,0.5,0.2));
  float hp=l-dot(texture2D(tex,clamp(w,0.0,1.0),3.0).rgb,vec3(0.3,0.5,0.2));
  vec2 cell=mod(floor(uv*vec2(360.0,540.0)),61.0);
  float tw=sin(t*4.0+fract(sin(dot(cell,vec2(1.271,3.113)))*437.585)*6.2832);
  c+=vec3(smoothstep(0.05,0.25,hp)*tw*0.45*sky);                   // stars twinkle
  gl_FragColor=vec4(c,1.0);}`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s;}
  let pr;
  try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw 0;}catch(e){return;}
  gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const al=gl.getAttribLocation(pr,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(pr,n), uRes=U("res"),uT=U("t"),uS=U("scroll"),uA=U("aspect");
  const img=new Image();
  img.onload=()=>{
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
    const pc=document.createElement("canvas");pc.width=1024;pc.height=2048;pc.getContext("2d").drawImage(img,0,0,1024,2048); // power-of-two so mipmaps work (needed for star twinkle)
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,pc);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1f(uA,img.height/img.width);
    const scale=Math.min(0.75,(devicePixelRatio||1)*0.4); // soft art, so render small and save battery
    let drawNow=()=>{};function size(){const w=Math.round(innerWidth*scale),h=Math.round(Math.max(innerHeight,box.clientHeight,screen.height||0)*scale);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;gl.viewport(0,0,w,h);gl.uniform2f(uRes,w,h);drawNow();}}
    let rw=innerWidth;addEventListener("resize",()=>{if(innerWidth!==rw){rw=innerWidth;size();}});size();
    document.body.classList.add("fx");
    // Smooth scrolling first: the art holds still while you scroll and drifts again when you stop
    // (redrawing a full-screen layer mid-scroll is what made it choppy). Time only advances while drawing, so no jump.
    let last=0,raf=0,tt=0,scrolling=0;
    addEventListener("scroll",()=>{scrolling=performance.now();},{passive:true});
    addEventListener("touchmove",()=>{scrolling=performance.now();},{passive:true});
    gl.uniform1f(uS,0);
    let speed=1;
    drawNow=()=>{gl.uniform1f(uT,tt);gl.drawArrays(gl.TRIANGLES,0,3);};
    function frame(now){raf=requestAnimationFrame(frame);
      if(now-scrolling<220){last=now;speed=0;return;}
      const dt=now-last; if(dt<33)return; last=now;
      speed=Math.min(1,speed+dt/900);                      // ease back in after a scroll, no snap
      tt+=Math.min(dt,100)/1000*0.35*speed*speed*(3-2*speed);
      drawNow();}
    gl.uniform1f(uT,0);gl.drawArrays(gl.TRIANGLES,0,3);
    raf=requestAnimationFrame(frame);
    document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(raf);}else{last=0;raf=requestAnimationFrame(frame);}});
    cv.addEventListener("webglcontextlost",e=>{e.preventDefault();cancelAnimationFrame(raf);document.body.classList.remove("fx");});
  };
  img.src=m[1];
})();
