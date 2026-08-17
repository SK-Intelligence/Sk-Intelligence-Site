(function(){
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';

  /* Colour tokens live in CSS (:root, THEME:START/END) — read them here so the
     shader washes and three.js scene always match the active theme instead of
     holding their own literals. */
  var themeCss = getComputedStyle(document.documentElement);
  function tok(name, fallback){
    var v = themeCss.getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* ---------------- Nav: scroll state + mobile toggle ---------------- */
  var navToggle = document.getElementById('navToggle');
  if (navToggle){
    navToggle.addEventListener('click', function(){
      var open = document.body.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.nav-mobile a').forEach(function(a){
      a.addEventListener('click', function(){ closeMenu(); });
    });

    function closeMenu(){
      document.body.classList.remove('menu-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }

    /* The mobile panel is scoped to max-width:900px in CSS. Resizing past that
       with the menu open hid the panel but left menu-open and aria-expanded
       set, so coming back under 900px re-opened it unprompted. */
    var mq = window.matchMedia('(min-width: 901px)');
    var onBreakpoint = function(e){ if (e.matches) closeMenu(); };
    if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
    else if (mq.addListener) mq.addListener(onBreakpoint);

    /* Escape should dismiss it too. */
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')){
        closeMenu(); navToggle.focus();
      }
    });
  }

  /* ---------------- Reveal on scroll (armed only by JS; default = visible) ---------------- */
  if ('IntersectionObserver' in window){
    document.body.classList.add('reveal-armed');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  }

  /* ====================================================================
     Entrance choreography: the nav fades up and the hero headline reveals
     line-by-line. Default CSS state (headline visible) is already the
     finished look, so JS only ADDS the beats on top — nothing here is
     load-bearing for readability. Skippable on scroll / click / keydown,
     and skipped entirely under reduced motion or if GSAP failed to load.
     ==================================================================== */
  /* ScrollTrigger is registered unconditionally (when GSAP is present) because
     the process scrub consumes it independently of the entrance — sub-pages run
     one without the other. */
  if (hasGsap && typeof window.ScrollTrigger !== 'undefined'){
    gsap.registerPlugin(ScrollTrigger);
  }

  if (hasGsap && !reduceMotion){
    var nav = document.getElementById('siteNav');

    /* The hero only exists on the home page. Sub-pages carry a .page-head
       instead, so the headline beats are swapped for a single soft rise. */
    var heroLines = gsap.utils.toArray('.hero-head .h-line-inner');
    var hasHero = heroLines.length > 0;

    gsap.set(nav, { opacity: 0 });

    /* Beats start immediately. This used to open with a ~0.95s letterbox curtain
       and everything else was positioned after it, which meant the nav sat hidden
       until 1.15s and the headline until 1.35s. The curtain is gone, so the dead
       time goes with it — same choreography, just no longer waiting on nothing. */
    var entranceTl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    entranceTl.to(nav, { opacity: 1, duration: .5 }, .1);

    if (hasHero){
      var heroEyebrow = document.querySelector('.hero-copy .eyebrow');
      var heroSub = document.querySelector('.hero-copy .hero-sub');
      var heroActions = document.querySelector('.hero-copy .hero-actions');
      var heroProof = document.querySelector('.hero-copy .hero-proof');

      gsap.set(heroEyebrow, { opacity: 0, y: 10 });
      gsap.set(heroLines, { yPercent: 112 });
      gsap.set([heroSub, heroActions, heroProof], { opacity: 0, y: 16 });

      entranceTl
        .to(heroEyebrow, { opacity: 1, y: 0, duration: .5 }, .15)
        .to(heroLines, { yPercent: 0, duration: .85, stagger: .16 }, .3)
        .to(heroSub, { opacity: 1, y: 0, duration: .6 }, .6)
        .to(heroActions, { opacity: 1, y: 0, duration: .55 }, .75)
        .to(heroProof, { opacity: 1, y: 0, duration: .55 }, .9);
    } else {
      var headBits = gsap.utils.toArray('.page-head [data-head-reveal]');
      if (headBits.length){
        gsap.set(headBits, { opacity: 0, y: 18 });
        entranceTl.to(headBits, { opacity: 1, y: 0, duration: .6, stagger: .1 }, .15);
      }
    }

    var skipped = false;
    function skipIntro(){ if (skipped) return; skipped = true; entranceTl.progress(1); }
    ['wheel','touchstart','keydown'].forEach(function(evt){
      window.addEventListener(evt, skipIntro, { once: true, passive: true });
    });
  }

  /* ====================================================================
     Shader-gradient wash (ported from 03-shader-gradient): inline GLSL
     simplex-noise flow field. Used as a soft hero backdrop wash (low
     opacity, multiply-blended over cream) and as the CTA panel background
     (full opacity). Two instances, independently seeded.
     ==================================================================== */
  (function(){
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
      else { window.addEventListener('resize', onResize, { passive:true }); }

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
  })();

  /* ====================================================================
     Process: pinned scrub sequence (ported from 07-gsap-scrollstory),
     rebuilt on the cream palette with a giant ghost phase-name crossfade
     and 01/02/03 progress dashes. Falls back to the static stacked panels
     already in the default CSS/markup when GSAP is unavailable or motion
     is reduced.
     ==================================================================== */
  (function(){
    /* ScrollTrigger is a separate CDN request from GSAP itself. If only that one
       fails, GSAP silently discards the scrollTrigger config — but .process-js
       had already switched the panels to absolute stacking with autoAlpha:0, so
       steps 1 and 2 stayed invisible forever. Guard on the plugin, not just gsap,
       and fall back to the stacked no-JS layout. */
    if (!hasGsap || reduceMotion || typeof window.ScrollTrigger === 'undefined') return;
    var section = document.getElementById('process');
    var sticky = section ? section.querySelector('.process-sticky') : null;
    var panels = gsap.utils.toArray('.process-panel');
    var dashes = gsap.utils.toArray('.process-progress .dash');
    var ghosts = gsap.utils.toArray('.process-ghost span');
    if (!section || !sticky || !panels.length) return;

    section.classList.add('process-js');
    gsap.set(panels, { autoAlpha: 0, y: 40 });
    gsap.set(panels[0], { autoAlpha: 1, y: 0 });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=220%',
        scrub: 0.6, pin: sticky, anticipatePin: 1
      }
    });

    panels.forEach(function(panel, i){
      if (i === 0) return;
      var pos = i - 1;
      tl.to(panels[i - 1], { autoAlpha: 0, y: -40, duration: 1 }, pos)
        .fromTo(panel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1 }, pos)
        .call(function(){
          dashes.forEach(function(d, di){ d.classList.toggle('is-active', di === i); });
          ghosts.forEach(function(g, gi){ g.classList.toggle('is-ghost-active', gi === i); });
        }, null, pos + 0.5)
        .call(function(){
          dashes.forEach(function(d, di){ d.classList.toggle('is-active', di === i - 1); });
          ghosts.forEach(function(g, gi){ g.classList.toggle('is-ghost-active', gi === i - 1); });
        }, null, pos - 0.001);
    });
  })();

  /* ---------------- Client work: accessible tabs (all panels visible without JS) ---------------- */
  (function(){
    var tabList = document.getElementById('tabList');
    var tabPanels = document.getElementById('tabPanels');
    if (!tabList || !tabPanels) return;
    tabPanels.classList.add('js-tabs');

    var tabIndicator = document.getElementById('tabIndicator');
    var tabs = Array.prototype.slice.call(tabList.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(tabPanels.querySelectorAll('.panel'));

    /* Tab semantics are applied here, not in the markup. With JS off the page
       renders four plain buttons and all four panels, so nothing announces a
       selection state that isn't real. */
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Client testimonials');
    tabs.forEach(function(t, i){
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', 'panel-' + i);
      t.setAttribute('aria-selected', String(i === 0));
    });
    panels.forEach(function(p, i){
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', 'tab-' + i);
    });

    /* The tablist wraps to 2-3 rows below ~900px, so the indicator has to track
       the selected tab vertically as well as horizontally — pinning it to the
       bottom of the whole list drew it under a different client's tab. */
    function moveTabIndicator(tab){
      var wrapRect = tabList.getBoundingClientRect();
      var rect = tab.getBoundingClientRect();
      tabIndicator.style.width = rect.width + 'px';
      tabIndicator.style.transform = 'translateX(' + (rect.left - wrapRect.left) + 'px)';
      tabIndicator.style.top = (rect.bottom - wrapRect.top - 2) + 'px';
    }
    moveTabIndicator(tabs[0]);
    window.addEventListener('resize', function(){
      var current = tabs.filter(function(t){ return t.getAttribute('aria-selected') === 'true'; })[0];
      if (current) moveTabIndicator(current);
    });

    var swapTimer = null;

    function activateTab(index, focusTab){
      var targetTab = tabs[index];
      var targetPanel = panels[index];
      var currentPanel = panels.filter(function(p){ return p.hasAttribute('data-active'); })[0];

      tabs.forEach(function(t, i){
        var selected = i === index;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
      });
      moveTabIndicator(targetTab);
      if (focusTab) targetTab.focus();

      /* Cycling back to the already-active panel mid-transition still has to
         cancel the pending swap — otherwise a stale timer fires afterwards and
         shows a different client's panel than the selected tab. */
      if (currentPanel === targetPanel){
        if (swapTimer){ clearTimeout(swapTimer); swapTimer = null; showOnly(targetPanel); }
        return;
      }

      if (reduceMotion || !currentPanel){
        showOnly(targetPanel);
        return;
      }
      /* Held arrow keys fire faster than the 160ms crossfade. Without cancelling
         the pending swap, each invocation re-read currentPanel from the DOM and
         set data-active on a different panel, leaving several testimonials
         stacked on top of each other and desynced from the selected tab. */
      if (swapTimer) clearTimeout(swapTimer);
      currentPanel.classList.add('is-transitioning');
      swapTimer = setTimeout(function(){
        swapTimer = null;
        showOnly(targetPanel);
        targetPanel.classList.add('is-transitioning');
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){ targetPanel.classList.remove('is-transitioning'); });
        });
      }, 160);
    }

    /* Single source of truth for panel visibility — always clears every other
       panel, so an interrupted transition can never leave two active. */
    function showOnly(panel){
      panels.forEach(function(p){
        p.classList.remove('is-transitioning');
        if (p === panel) p.setAttribute('data-active', '');
        else p.removeAttribute('data-active');
      });
    }

    tabs.forEach(function(tab, i){
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener('click', function(){ activateTab(i, false); });
      tab.addEventListener('keydown', function(e){
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = tabs.length - 1;
        if (next !== null){ e.preventDefault(); activateTab(next, true); }
      });
    });
  })();
})();
