// EXO power universe: one full-screen fragment shader, ten scenes, noise-dissolve transitions.
// Scene index: 0 cosmos (no bias), 1 frost, 2 water, 3 healing, 4 light, 5 lightning,
// 6 fire, 7 earth, 8 teleport, 9 wind.

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;
uniform float u_a; uniform float u_b; uniform float u_mix; uniform float u_bright;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
vec2 hash2(vec2 p){float n=hash(p);return vec2(n,hash(p+n+17.17));}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
 for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
vec3 voronoi(vec2 x){vec2 n=floor(x),f=fract(x);float md=8.,md2=8.,id=0.;
 for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash2(n+g);
  vec2 r=g+o-f;float d=dot(r,r);if(d<md){md2=md;md=d;id=hash(n+g);}else if(d<md2){md2=d;}}
 return vec3(sqrt(md),sqrt(md2)-sqrt(md),id);}
float stars(vec2 p,float t){vec2 g=floor(p);vec2 f=fract(p)-.5;float h=hash(g);
 if(h<.93)return 0.;vec2 o=(hash2(g+3.)-.5)*.6;float d=length(f-o);
 float tw=.55+.45*sin(t*2.+h*60.);return (1.-smoothstep(0.,.07+.25*(h-.93),d))*tw;}

vec3 cosmos(vec2 p,float t){
 vec2 q=p+vec2(t*.012,0.);
 float band=exp(-pow((q.y+q.x*.42+.1)*1.9,2.));
 float n=fbm(q*1.6+fbm(q*2.2-t*.02)*1.4);
 float dust=fbm(q*5.+3.);
 float band2=exp(-pow((q.y-q.x*.35-.55)*2.4,2.));
 vec3 col=vec3(.07,.09,.2)+vec3(.16,.2,.4)*fbm(q*1.1+8.);
 col+=vec3(1.,.95,.86)*(band*1.5+band2*.7)*smoothstep(.25,.9,n);
 col+=vec3(.95,.62,.72)*band*smoothstep(.6,.95,fbm(q*3.+1.))*.35;
 col-=vec3(.45,.42,.38)*band*smoothstep(.55,.85,dust)*.45;
 col+=vec3(1.,.972,.906)*stars(p*30.,t)*1.8+vec3(.85,.9,1.)*stars(p*70.+7.,t*1.3)*(.9+band*1.5);
 col+=vec3(1.,.95,.85)*stars(p*140.+3.,t*.7)*(band+band2)*1.2;
 col+=vec3(1.,.97,.9)*.12/(1.+20.*length(p-u_mouse));
 return max(col,0.);}

vec3 frost(vec2 p,float t,vec2 m){
 vec2 q=p*3.2;q+=.18*vec2(fbm(p*2.+t*.04),fbm(p*2.-t*.04));
 vec3 v=voronoi(q);float edge=1.-smoothstep(0.,.055,v.y);
 vec3 base=mix(vec3(.03,.07,.14),vec3(.22,.42,.62),v.z*.55+.25*fbm(p*5.));
 vec3 col=base+vec3(.78,.92,1.)*edge*.85;
 col+=vec3(.9,.97,1.)*stars(p*55.+vec2(sin(t*.3)*.5,t*.25),t*3.)*1.3;
 col+=vec3(.75,.9,1.)*.22/(1.+18.*length(p-m));
 return col;}

vec3 water(vec2 p,float t,vec2 m){
 vec2 q=mod(p*6.2831*.55+vec2(t*.04,0.),6.2831)-250.;vec2 i=q;float c=1.;float inten=.005;
 for(int n=0;n<5;n++){float tt=t*.5*(1.-(3.5/float(n+1)));
  i=q+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
  c+=1./length(vec2(q.x/(sin(i.x+tt)/inten),q.y/(cos(i.y+tt)/inten)));}
 c/=5.;c=1.17-pow(c,1.4);float w=clamp(pow(abs(c),8.),0.,1.);
 vec3 col=mix(vec3(.008,.035,.1),vec3(.03,.2,.36),.5+.45*p.y);
 col+=vec3(.5,.85,1.)*w*.85;
 float r=length(p-m);col+=vec3(.45,.8,1.)*.18*sin(26.*r-t*4.)*exp(-2.6*r);
 return col;}

vec3 heal(vec2 p,float t,vec2 m){
 float r=length(p);vec2 dir=p/(r+1e-4);
 float petals=.5+.5*sin(6.*atan(p.y,p.x)+t*.3+fbm(dir*2.+t*.1)*2.5);
 float bloom=exp(-2.2*r)*(.65+.35*sin(t*1.1));
 float rings=pow(.5+.5*sin(r*18.-t*1.4),14.)*exp(-1.4*r);
 vec3 col=vec3(.025,.07,.05)+vec3(.5,.82,.42)*bloom*petals*1.3+vec3(.98,.92,.62)*rings*.7;
 col+=vec3(.85,1.,.7)*stars(p*24.+vec2(sin(t*.5+p.y)*.4,-t*.5),t)*1.3;
 col+=vec3(.7,.95,.6)*.2/(1.+14.*length(p-m));
 return col;}

vec3 light(vec2 p,float t,vec2 m){
 vec2 c=m+vec2(0.,.15);vec2 d=p-c;float r=length(d);vec2 dir=d/(r+1e-4);
 float rays=fbm(dir*2.2+t*.06)*fbm(dir*4.5-t*.09+3.);
 float beams=pow(rays,2.)*3.*exp(-.55*r);
 float core=.07/(r+.04);
 vec3 col=vec3(.07,.06,.045)+vec3(1.,.92,.72)*(beams+core*.45);
 col+=vec3(1.,.97,.88)*stars(p*48.,t*2.)*.9;
 return col;}

vec3 bolt(vec2 p,float t,vec2 m){
 vec3 col=vec3(.02,.03,.07)+vec3(.05,.07,.15)*fbm(p*2.+t*.1);
 for(int i=0;i<3;i++){float fi=float(i);float sp=t*1.6+fi*.37;float seed=floor(sp);float life=fract(sp);
  float x=(hash(vec2(seed,fi+1.))-.5)*2.2;
  float path=x+(fbm(vec2(p.y*2.5+seed*3.1,seed))-.5)*1.3+(noise(vec2(p.y*14.,seed+fi))-.5)*.16;
  float br=x+(fbm(vec2(p.y*4.+seed*7.,seed+9.))-.5)*1.9;
  float d=abs(p.x-path);float d2=abs(p.x-br)+max(0.,p.y-(hash(vec2(seed,4.))-.2))*3.;
  float fade=exp(-life*5.)*step(.15,hash(vec2(seed,fi+11.)));
  col+=(vec3(.72,.84,1.)*(.007/d)+vec3(1.,.9,.45)*(.0016/d)+vec3(.6,.75,1.)*(.002/d2))*fade;
  col+=vec3(.25,.3,.5)*fade*.25;}
 col+=vec3(.75,.85,1.)*.1/(1.+25.*length(p-m));
 return col;}

vec3 fire(vec2 p,float t,vec2 m){
 vec2 q=p*vec2(1.4,1.);q.y-=t*.55;
 float n=fbm(q*2.+fbm(q*3.+t*.25)*1.3);
 float h=clamp(n*1.7-(p.y+1.05)*.5,0.,1.);
 h+=.3/(1.+10.*length(p-m));
 vec3 col=vec3(.03,.01,.012);
 col=mix(col,vec3(.5,.05,.02),smoothstep(.0,.35,h));
 col=mix(col,vec3(1.,.36,.06),smoothstep(.3,.66,h));
 col=mix(col,vec3(1.,.86,.45),smoothstep(.62,.98,h));
 col+=vec3(1.,.5,.15)*stars(p*28.+vec2(sin(t+p.y*3.)*.3,-t*1.4),t*4.)*1.4;
 return col;}

vec3 earth(vec2 p,float t,vec2 m){
 float quake=step(.86,fract(t*.22));vec2 sh=quake*.012*vec2(sin(t*41.),cos(t*37.));
 vec2 q=p*2.4+sh;vec3 v=voronoi(q);
 float crack=1.-smoothstep(0.,.045,v.y);
 float rock=fbm(q*3.2)*.6+v.z*.3;
 vec3 col=mix(vec3(.055,.042,.034),vec3(.32,.24,.17),rock);
 float glow=.5+.5*sin(t*1.4+v.z*6.2831);
 col+=vec3(1.,.55,.2)*crack*(.45+.55*glow)*(1.+quake);
 col+=vec3(1.,.62,.28)*crack*.7/(1.+7.*length(p-m));
 return col;}

vec3 warp(vec2 p,float t,vec2 m){
 vec2 d=p-m*.35;float r=length(d);float a=atan(d.y,d.x);
 float sw=a+2.4/(r+.18)-t*.75;vec2 sp=vec2(cos(sw),sin(sw))*r;
 float n=fbm(sp*3.+t*.08);
 float ring=exp(-pow((r-.48-.05*sin(t*2.))*11.,2.));
 vec3 col=vec3(.04,.02,.045)+vec3(.92,.3,.56)*n*exp(-1.1*r)+vec3(1.,.76,.86)*ring*.95;
 col+=vec3(1.,.82,.9)*stars(sp*18.,t)*.9;
 return col;}

vec3 wind(vec2 p,float t,vec2 m){
 vec2 q=p;q.x-=t*.45;
 float flow=fbm(vec2(q.x*.8,q.y*5.5)+fbm(q*2.)*.8);
 float streak=pow(.5+.5*sin((p.y+fbm(vec2(q.x*1.4,p.y*2.))*.65)*38.),22.);
 vec3 col=vec3(.03,.065,.07)+vec3(.32,.72,.62)*flow*.55+vec3(.82,1.,.95)*streak*flow;
 col+=vec3(.72,1.,.9)*.22/(1.+18.*abs(p.y-m.y))*(1.-smoothstep(0.,1.2,abs(p.x-m.x)));
 return col;}

vec3 scene(float k,vec2 p,float t,vec2 m){
 if(k<.5)return cosmos(p,t);
 else if(k<1.5)return frost(p,t,m);
 else if(k<2.5)return water(p,t,m);
 else if(k<3.5)return heal(p,t,m);
 else if(k<4.5)return light(p,t,m);
 else if(k<5.5)return bolt(p,t,m);
 else if(k<6.5)return fire(p,t,m);
 else if(k<7.5)return earth(p,t,m);
 else if(k<8.5)return warp(p,t,m);
 return wind(p,t,m);}

void main(){
 vec2 uv=gl_FragCoord.xy/u_res;
 vec2 p=(gl_FragCoord.xy*2.-u_res)/min(u_res.x,u_res.y);
 vec3 c=scene(u_a,p,u_time,u_mouse);
 if(u_mix>.001){vec3 b=scene(u_b,p,u_time,u_mouse);
  float n=fbm(p*2.6+3.3);float e=smoothstep(u_mix*1.2-.12,u_mix*1.2-.02,n);
  float seam=(1.-abs(e*2.-1.))*step(.001,u_mix)*step(u_mix,.999);
  c=mix(b,c,e)+vec3(1.,.97,.9)*seam*.8;}
 c*=u_bright;
 c=c/(1.+c*.55)*1.25;
 c*=1.-.55*dot(uv-.5,uv-.5);
 gl_FragColor=vec4(c,1.);
}`;

export function createUniverse(canvas, { reduced = false, fixedScale = 0 } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(pr)); return null; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['u_res', 'u_time', 'u_mouse', 'u_a', 'u_b', 'u_mix', 'u_bright'].forEach(n => U[n] = gl.getUniformLocation(pr, n));

  let scale = fixedScale || Math.min(window.devicePixelRatio || 1, 2) * (window.innerWidth < 700 ? 0.42 : 0.5);
  const maxScale = Math.min(window.devicePixelRatio || 1, 2) * 0.85, minScale = 0.28;
  const state = { a: 0, b: 0, mix: 0, target: null, mx: 0, my: 0, tx: 0, ty: 0, bright: 1, running: false, t0: performance.now(), frozenT: 7.3 };
  let raf = 0, frames = 0, acc = 0, last = performance.now();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(2, Math.round(w * scale)); canvas.height = Math.max(2, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(now, dt = 16.7) {
    const t = reduced ? state.frozenT : (now - state.t0) / 1000;
    state.mx += (state.tx - state.mx) * 0.06; state.my += (state.ty - state.my) * 0.06;
    if (state.target !== null) {
      state.mix = Math.min(1, state.mix + (reduced ? 1 : Math.max(dt, 4) / 900));
      if (state.mix >= 1) { state.a = state.target; state.target = null; state.mix = 0; }
    }
    gl.uniform2f(U.u_res, canvas.width, canvas.height); gl.uniform1f(U.u_time, t);
    gl.uniform2f(U.u_mouse, state.mx, state.my); gl.uniform1f(U.u_a, state.a);
    gl.uniform1f(U.u_b, state.target ?? state.a); gl.uniform1f(U.u_mix, state.target !== null ? state.mix : 0);
    gl.uniform1f(U.u_bright, state.bright);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    if (!state.running) return;
    const dt = now - last; last = now; acc += dt; frames++;
    if (frames === 40 && !fixedScale) { // adapt resolution to keep it smooth on phones
      const avg = acc / frames; frames = 0; acc = 0;
      if (avg > 24 && scale > minScale) { scale = Math.max(minScale, scale * 0.8); resize(); }
      else if (avg < 13 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.12); resize(); }
    }
    draw(now, dt);
    if (reduced && state.target === null) { state.running = false; return; }
    raf = requestAnimationFrame(loop);
  }
  const api = {
    start() { if (state.running) return; state.running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
    stop() { state.running = false; cancelAnimationFrame(raf); },
    setScene(k, instant = false) {
      if (k === state.a && state.target === null) return;
      if (instant) { state.a = k; state.target = null; state.mix = 0; }
      else { if (state.target !== null) { state.a = state.target; } state.target = k; state.mix = 0; }
      if (reduced) { state.running = true; raf = requestAnimationFrame(loop); }
    },
    pointer(nx, ny) { // nx, ny in -1..1 relative to the canvas, y up
      const w = canvas.clientWidth, h = canvas.clientHeight, m = Math.min(w, h);
      state.tx = nx * w / m; state.ty = ny * h / m;
    },
    setBright(b) { state.bright = b; },
    renderOnce(k, t) { // draw one frame synchronously so the caller can copy the pixels in the same task
      resize(); state.a = k; state.target = null; state.mix = 0;
      gl.uniform2f(U.u_res, canvas.width, canvas.height); gl.uniform1f(U.u_time, t);
      gl.uniform2f(U.u_mouse, 0.25, 0.2); gl.uniform1f(U.u_a, k); gl.uniform1f(U.u_b, k); gl.uniform1f(U.u_mix, 0); gl.uniform1f(U.u_bright, 1.1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize,
  };
  resize();
  window.addEventListener('resize', () => { resize(); if (reduced) { state.running = true; raf = requestAnimationFrame(loop); } }, { passive: true });
  return api;
}
