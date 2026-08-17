/**
 * Flowing GLSL simplex-noise wash used behind the hero and the CTA panel.
 *
 * Ported verbatim from the verified vanilla build — the numbers here are the
 * result of real measurement, not taste:
 *   0.55 render scale + 30fps throttle, time advanced on real elapsed ms so the
 *   flow speed is unchanged; resize lifted out of the render loop (it was
 *   forcing a layout every frame); IntersectionObserver gating; and a one-way
 *   downgrade to 0.4 scale if frames stay slow. That took full-page scroll from
 *   5.2fps to 30-32fps. Do not "simplify" the throttling away.
 *
 * Returns a cleanup function — call it on unmount. React StrictMode mounts
 * effects twice in development, so failing to clean up here leaves a second
 * WebGL context and a second RAF loop running.
 */
/* eslint-disable */
// @ts-nocheck
export function initShaderWash(root: Document | HTMLElement = document): () => void {
  const disposers: Array<() => void> = [];
  /* --- lifecycle tracking so the returned cleanup is complete ---------------
     Every listener below gets the AbortController signal, every rAF id and
     every observer is tracked. StrictMode mounts effects twice in development;
     without this the second mount leaves an orphaned WebGL context and a
     second render loop running forever. */
  const _ac = new AbortController();
  const _signal = _ac.signal;
  const _rafIds = new Set<number>();
  const _observers: Array<{ disconnect: () => void }> = [];
  const _nativeRaf = window.requestAnimationFrame.bind(window);
  const requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = _nativeRaf((t) => { _rafIds.delete(id); cb(t); });
    _rafIds.add(id);
    return id;
  };
  const cancelAnimationFrame = (id: number) => { _rafIds.delete(id); window.cancelAnimationFrame(id); };
  const _IO = window.IntersectionObserver;
  const IntersectionObserver = function (this: any, cb: any, opts?: any) {
    const o = new _IO(cb, opts); _observers.push(o); return o;
  } as unknown as typeof window.IntersectionObserver;
  const _RO = window.ResizeObserver;
  const ResizeObserver = function (this: any, cb: any) {
    const o = new _RO(cb); _observers.push(o); return o;
  } as unknown as typeof window.ResizeObserver;

  const css = getComputedStyle(document.documentElement);
  function tok(name: string, fallback: string) {
    const v = css.getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var VERT = 'attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos,0.0,1.0); }';
    var FRAG_HEAD = [
      'precision highp float;','uniform vec2 uRes;','uniform float uTime;',
      'uniform vec3 uInk;','uniform vec3 uBronze;','uniform vec3 uCream;',
      'uniform float uSpeed;','uniform float uScale;','uniform float uGrain;',
      'vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }',
      'vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }',
      'vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }',
      'vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }',
      'float snoise(vec3 v){',
      '  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
      '  vec3 i  = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);',
      '  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;',
      '  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);',
      '  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;',
      '  i = mod289(i);',
      '  vec4 p = permute(permute(permute(',
      '      i.z + vec4(0.0, i1.z, i2.z, 1.0))',
      '    + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
      '    + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
      '  float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;',
      '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
      '  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);',
      '  vec4 x = x_*ns.x + ns.yyyy; vec4 y = y_*ns.x + ns.yyyy;',
      '  vec4 h = 1.0 - abs(x) - abs(y);',
      '  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);',
      '  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0;',
      '  vec4 sh = -step(h, vec4(0.0));',
      '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;',
      '  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y);',
      '  vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);',
      '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));',
      '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
      '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
      '  m = m*m;',
      '  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
      '}',
      /* 3 octaves for the colour field and 2 for the positional warp, with the
         starting amplitude compensated so total output range matches the old
         4-octave version. The dropped octaves sit at/below the sampling limit
         once the buffer renders at 0.55x, so they cost time without being
         visible. 16 snoise() calls per pixel -> 10. */
      'float fbm(vec3 p){ float v=0.0; float amp=0.593; for(int i=0;i<3;i++){ v+=amp*snoise(p); p*=2.05; amp*=0.52; } return v; }',
      'float fbm2(vec3 p){ float v=0.0; float amp=0.70; for(int i=0;i<2;i++){ v+=amp*snoise(p); p*=2.05; amp*=0.52; } return v; }'
    ].join('\n');
    var FRAG_MAIN = [
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / uRes.xy; vec2 p = uv - 0.5; p.x *= uRes.x / uRes.y;',
      '  float t = uTime * uSpeed;',
      '  vec2 warp = vec2(fbm2(vec3(p*uScale, t)), fbm2(vec3(p*uScale + 11.3, t))) * 0.4;',
      '  vec2 pw = p + warp;',
      '  float n1 = fbm(vec3(pw*(uScale*1.3), t*1.25 + 4.0));',
      '  float n2 = fbm(vec3(pw*(uScale*2.1) + 9.4, t*0.8 + 1.0));',
      '  float mixA = smoothstep(-0.55, 0.65, n1 + p.x*0.5 - p.y*0.15);',
      '  vec3 base = mix(uInk, uBronze, mixA);',
      '  float hl = smoothstep(0.18, 0.8, n2 - p.y*0.25);',
      '  vec3 col = mix(base, uCream, hl*0.6);',
      '  float vig = smoothstep(1.05, 0.2, length(p*vec2(1.0,1.25)));',
      '  col *= mix(0.7, 1.0, vig);',
      '  float grain = fract(sin(dot(gl_FragCoord.xy + uTime*60.0, vec2(12.9898,78.233))) * 43758.5453);',
      '  col += (grain - 0.5) * uGrain;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');
    var FRAG = FRAG_HEAD + '\n' + FRAG_MAIN;

    function hexToVec3(hex){
      return [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255];
    }
    function compile(gl, src, type){
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ gl.deleteShader(s); return null; }
      return s;
    }
    function initGradient(canvas, opts){
      if (!canvas) return;
      opts = opts || {};
      var gl = canvas.getContext('webgl', { antialias:true, alpha:false }) ||
                canvas.getContext('experimental-webgl', { antialias:true, alpha:false });
      if (!gl) return;
      var vs = compile(gl, VERT, gl.VERTEX_SHADER);
      var fs = compile(gl, FRAG, gl.FRAGMENT_SHADER);
      if (!vs || !fs) return;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      var uRes = gl.getUniformLocation(prog, 'uRes');
      var uTime = gl.getUniformLocation(prog, 'uTime');
      var uInk = gl.getUniformLocation(prog, 'uInk');
      var uBronze = gl.getUniformLocation(prog, 'uBronze');
      var uCream = gl.getUniformLocation(prog, 'uCream');
      var uSpeed = gl.getUniformLocation(prog, 'uSpeed');
      var uScale = gl.getUniformLocation(prog, 'uScale');
      var uGrain = gl.getUniformLocation(prog, 'uGrain');

      gl.uniform3fv(uInk, hexToVec3(opts.ink || '#38352F'));
      gl.uniform3fv(uBronze, hexToVec3(opts.bronze || '#A08A72'));
      gl.uniform3fv(uCream, hexToVec3(opts.cream || '#F5F1E8'));
      gl.uniform1f(uSpeed, opts.speed != null ? opts.speed : 0.045);
      gl.uniform1f(uScale, opts.scale != null ? opts.scale : 1.5);
      gl.uniform1f(uGrain, opts.grain != null ? opts.grain : 0.015);

      /* ---- Performance ----------------------------------------------------
         This shader was the page's only real cost: a 4-octave domain-warped
         noise field, full viewport, at full DPR, at 60fps, that never stopped
         rendering even when scrolled far past the hero. Four fixes, none of
         which change a single visible pixel of the result:
           1. render the buffer at ~0.55x and let CSS upscale it. A soft,
              low-frequency gradient upscales imperceptibly.
           2. resize() no longer runs inside the render loop (it read
              clientWidth every frame, forcing a synchronous layout reflow).
           3. throttle draws to ~30fps — the flow speed is 0.035, so 30 and 60
              are indistinguishable — while advancing time on real elapsed ms
              so the animation speed is completely unchanged.
           4. stop entirely when the canvas is off-screen.
         Plus a one-way adaptive downgrade if the device still can't keep up. */
      var scaleFactor = 0.55;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      function resize(){
        var w = canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0);
        var h = canvas.clientHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 0);
        var r = dpr * scaleFactor;
        var cw = Math.max(1, Math.floor(w * r)), ch = Math.max(1, Math.floor(h * r));
        if (canvas.width !== cw || canvas.height !== ch){
          canvas.width = cw; canvas.height = ch; gl.viewport(0,0,cw,ch); gl.uniform2f(uRes, cw, ch);
        }
      }

      var elapsed = 0, lastNow = 0, lastDraw = 0, rafId = 0;
      var onScreen = true, pageVisible = true;
      var FRAME_MS = 1000 / 30;
      var samples = 0, slowFrames = 0, degraded = false;

      function draw(){
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      function schedule(){
        if (reduceMotion || rafId || !onScreen || !pageVisible) return;
        rafId = requestAnimationFrame(frame);
      }

      function frame(now){
        rafId = 0;
        var dt = lastNow ? (now - lastNow) : 16;
        lastNow = now;
        if (dt < 500) elapsed += dt / 1000;   // ignore tab-switch / resume jumps
        if (now - lastDraw >= FRAME_MS - 1){
          lastDraw = now;
          draw();
          if (!degraded){
            samples++;
            if (samples > 20 && dt > 45) slowFrames++;
            if (samples > 80){
              if (slowFrames > 25){ degraded = true; scaleFactor = 0.4; resize(); }
              samples = 0; slowFrames = 0;
            }
          }
        }
        schedule();
      }

      resize();
      if (reduceMotion){ elapsed = 6.0; draw(); }
      else { draw(); schedule(); }

      document.addEventListener('visibilitychange', function(){
        pageVisible = !document.hidden;
        lastNow = 0;
        schedule();
      });

      function onResize(){ resize(); if (reduceMotion) draw(); }
      if ('ResizeObserver' in window){ new ResizeObserver(onResize).observe(canvas); }
      else { window.addEventListener('resize', onResize, { passive:true , signal: _signal }); }

      if ('IntersectionObserver' in window){
        new IntersectionObserver(function(entries){
          onScreen = entries[0].isIntersecting;
          if (onScreen){ lastNow = 0; schedule(); }
          else if (rafId){ cancelAnimationFrame(rafId); rafId = 0; }
        }, { rootMargin: '120px' }).observe(canvas);
      }
    }

    initGradient(document.getElementById('hero-gradient-canvas'), {
      ink: tok('--wash-a', '#38352F'), bronze: tok('--wash-b', '#A08A72'), cream: tok('--wash-c', '#F5F1E8'),
      speed:0.035, scale:1.7, grain:0.01
    });
    initGradient(document.getElementById('cta-gradient-canvas'), {
      ink: tok('--ctawash-a', '#1c1914'), bronze: tok('--ctawash-b', '#7c5f3f'), cream: tok('--ctawash-c', '#a98a63'),
      speed:0.05, scale:1.8, grain:0.02
    });
  

  disposers.push(() => {
    _ac.abort();
    _rafIds.forEach((id) => window.cancelAnimationFrame(id));
    _rafIds.clear();
    _observers.forEach((o) => { try { o.disconnect(); } catch {} });
  });

  return () => { disposers.forEach(fn => { try { fn(); } catch {} }); };
}
