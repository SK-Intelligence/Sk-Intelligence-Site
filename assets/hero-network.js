(function(){
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var themeCss = getComputedStyle(document.documentElement);
  function tok(name, fallback){ var v = themeCss.getPropertyValue(name); return (v && v.trim()) || fallback; }

  /* ====================================================================
     Hero centerpiece: 84-node orbiting lattice. Nodes start scattered and
     dim (siloed systems), then over ~3s organize into a connected orbital
     network around a bronze core (SK integrating into the stack).
     Bronze/charcoal on cream. Pointer parallax, scroll dolly,
     IntersectionObserver pause, static SVG poster fallback, and hover
     picking (mouse + touch-hold) once the lattice has settled.
     ==================================================================== */
  (function(){
    if (typeof THREE === 'undefined') return;

    var canvas = document.getElementById('hero-canvas');
    var poster = document.getElementById('hero-poster');
    var wrap = canvas ? canvas.closest('.hero-scene-wrap') : null;
    var sceneEl = canvas ? (canvas.closest('.hero-scene') || wrap) : null;
    var heroSection = document.getElementById('top');
    var labelsWrap = document.getElementById('heroSceneLabels');
    var coreLabelEl = labelsWrap ? labelsWrap.querySelector('.scene-label-core') : null;
    if (!canvas || !wrap || !sceneEl || !heroSection) return;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    var group = new THREE.Group();
    scene.add(group);

    var COUNT = 84;
    var RADIUS = 2.5;
    var targets = fibonacciSphere(COUNT, RADIUS);
    var starts = targets.map(function(p){
      var dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
      var mag = RADIUS * (1.6 + Math.random() * 1.6);
      return p.clone().add(dir.multiplyScalar(mag));
    });
    var delays = targets.map(function(){ return Math.random() * 0.55; });
    var scales = targets.map(function(){ return 0.55 + Math.random() * 0.85; });
    var nodePos = targets.map(function(){ return new THREE.Vector3(); });

    var dim = new THREE.Color(tok('--node-dim', '#9b9488'));
    var lit = new THREE.Color(tok('--node-lit', '#a08a72'));
    var bright = new THREE.Color(tok('--accent-bright', '#CDAC82'));
    var edgeColor = new THREE.Color(tok('--node-edge', '#6E5D49'));
    var hoverDimNode = lit.clone().lerp(dim, 0.4);
    var hoverDimEdge = edgeColor.clone().multiplyScalar(0.82);

    function fibonacciSphere(samples, radius){
      var points = []; var goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < samples; i++){
        var y = 1 - (i / (samples - 1)) * 2;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var theta = goldenAngle * i;
        points.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
      }
      return points;
    }
    function buildNearestNeighbourEdges(points, k){
      var edgeKeys = {}; var idxPairs = [];
      for (var a = 0; a < points.length; a++){
        var dists = [];
        for (var b = 0; b < points.length; b++){ if (a === b) continue; dists.push([b, points[a].distanceToSquared(points[b])]); }
        dists.sort(function(x, y){ return x[1] - y[1]; });
        for (var n = 0; n < k && n < dists.length; n++){
          var bIdx = dists[n][0];
          var key = a < bIdx ? (a + '_' + bIdx) : (bIdx + '_' + a);
          if (!edgeKeys[key]){ edgeKeys[key] = true; idxPairs.push([a, bIdx]); }
        }
      }
      return idxPairs;
    }

    var edgePairs = buildNearestNeighbourEdges(targets, 3);
    var EDGE_COUNT = edgePairs.length;
    var EDGE_RADIUS = 0.010;
    var EDGE_MAX_OPACITY = 0.80;
    var PROXY_SCALE = 2.4;
    var HALO_MAX_OPACITY = 0.5;
    var LABEL_REVEAL_AT = 2.4;
    var HOVER_EASE = 0.18;
    var HOVER_EPS = 0.002;

    /* Nodes: no vertexColors flag -- IcosahedronGeometry has no `color`
       attribute, so USE_COLOR would zero-multiply vColor and read black.
       Per-instance colour works fine via instanceColor alone. */
    var nodeGeo = new THREE.IcosahedronGeometry(0.055, 0);
    var nodeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 });
    var nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, COUNT);
    nodes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    group.add(nodes);

    /* Invisible proxy mesh, ~2.4x node scale, mirrors node matrices.
       Raycaster.intersectObject does not test .visible, so a hidden
       material still hit-tests -- gives generous, stable pick targets
       for the tiny visible nodes without changing their own geometry. */
    var proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    var proxy = new THREE.InstancedMesh(nodeGeo, proxyMat, COUNT);
    group.add(proxy);

    var dummy = new THREE.Object3D();

    /* Edges: InstancedMesh of unit cylinders, oriented + scaled per edge.
       linewidth is a WebGL no-op and Line2/LineMaterial addons are not
       available in this classic UMD build, so instanced geometry is the
       only route to controllable thickness here. */
    var edgeGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    var edgeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    var edges = new THREE.InstancedMesh(edgeGeo, edgeMat, EDGE_COUNT);
    edges.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(EDGE_COUNT * 3), 3);
    group.add(edges);

    /* Detail 1 (80 faces) still reads as an angular gem at this size --
       bumped to 3 (1280 faces, trivial cost for one mesh) so the
       silhouette reads as a sphere. MeshBasicMaterial is unlit and flat,
       so `--node-core` alone (the darkest token in the bronze family)
       rendered fully opaque read as a near-black blob rather than
       bronze -- lifted it toward `--accent-bright` so it stays warm and
       legible as the nucleus instead of going flat and dark. */
    var coreGeo = new THREE.IcosahedronGeometry(0.28, 3);
    var coreColor = new THREE.Color(tok('--node-core', '#7c6a55')).lerp(bright, 0.4);
    var coreMat = new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0 });
    var core = new THREE.Mesh(coreGeo, coreMat);
    core.scale.setScalar(0.01);
    group.add(core);

    /* Halo ring billboarded to the camera. Added to `scene`, not `group`
       -- the core sits at group's local origin, which stays put in world
       space regardless of group.rotation (rotation about the origin
       doesn't move the origin), so the halo needs no parent-rotation
       compensation to stay centred on it. */
    var haloGeo = new THREE.RingGeometry(0.34, 0.37, 48);
    var haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tok('--accent-bright', '#CDAC82')), transparent: true, opacity: 0, side: THREE.DoubleSide });
    var halo = new THREE.Mesh(haloGeo, haloMat);
    halo.scale.setScalar(0.01);
    scene.add(halo);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    var ORGANIZE_DURATION = 3.0;
    var organizeClock = 0;
    var settled = false;
    var labelsRevealed = false;

    function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }
    function smoothstep(edge0, edge1, x){
      var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    }

    /* Reusable scratch objects -- avoids per-frame `new THREE.Color` /
       `new THREE.Vector3` / `new THREE.Quaternion` allocations. */
    var _scratchColor = new THREE.Color();
    var _dir = new THREE.Vector3();
    var _yAxis = new THREE.Vector3(0, 1, 0);
    var _quat = new THREE.Quaternion();

    function writeEdgeInstance(e, pa, pb){
      _dir.copy(pb).sub(pa);
      var len = _dir.length();
      if (len < 1e-5) len = 1e-5;
      _dir.multiplyScalar(1 / len);
      _quat.setFromUnitVectors(_yAxis, _dir);
      dummy.position.copy(pa).addScaledVector(_dir, len * 0.5);
      dummy.quaternion.copy(_quat);
      dummy.scale.set(EDGE_RADIUS, len, EDGE_RADIUS);
      dummy.updateMatrix();
      edges.setMatrixAt(e, dummy.matrix);
    }

    function updateOrganize(dt){
      organizeClock += dt;
      var overallT = Math.min(1, organizeClock / ORGANIZE_DURATION);
      for (var i = 0; i < COUNT; i++){
        var localT = Math.min(1, Math.max(0, (organizeClock - delays[i]) / (ORGANIZE_DURATION - delays[i])));
        var eased = easeOutCubic(localT);
        dummy.position.lerpVectors(starts[i], targets[i], eased);
        nodePos[i].copy(dummy.position);
        dummy.quaternion.identity();
        dummy.scale.setScalar(scales[i]);
        dummy.updateMatrix();
        nodes.setMatrixAt(i, dummy.matrix);
        dummy.scale.setScalar(scales[i] * PROXY_SCALE);
        dummy.updateMatrix();
        proxy.setMatrixAt(i, dummy.matrix);
        _scratchColor.copy(dim).lerp(lit, eased);
        nodes.instanceColor.setXYZ(i, _scratchColor.r, _scratchColor.g, _scratchColor.b);
      }
      nodes.instanceMatrix.needsUpdate = true;
      nodes.instanceColor.needsUpdate = true;
      proxy.instanceMatrix.needsUpdate = true;

      var edgeAlpha = smoothstep(0.55, 1.0, overallT) * EDGE_MAX_OPACITY;
      edgeMat.opacity = edgeAlpha;
      if (edgeAlpha > 0.001){
        for (var e = 0; e < EDGE_COUNT; e++){
          var ia = edgePairs[e][0], ib = edgePairs[e][1];
          writeEdgeInstance(e, nodePos[ia], nodePos[ib]);
          edges.instanceColor.setXYZ(e, edgeColor.r, edgeColor.g, edgeColor.b);
        }
        edges.instanceMatrix.needsUpdate = true;
        edges.instanceColor.needsUpdate = true;
      }

      var coreT = smoothstep(0.68, 1.0, overallT);
      core.scale.setScalar(0.01 + coreT * 0.99);
      coreMat.opacity = coreT * 1.0;
      halo.scale.setScalar(0.01 + coreT * 0.99);
      haloMat.opacity = coreT * HALO_MAX_OPACITY;

      if (!labelsRevealed && organizeClock >= LABEL_REVEAL_AT){
        labelsRevealed = true;
        if (labelsWrap) labelsWrap.classList.add('is-visible');
      }
      if (organizeClock >= ORGANIZE_DURATION) settled = true;
    }

    function setFinalOrganizedState(){
      organizeClock = ORGANIZE_DURATION + 1;
      updateOrganize(0);
    }

    /* -------------------- Hover (settled state only) -------------------- */
    var hlAmt = new Float32Array(COUNT);
    var dimAmt = new Float32Array(COUNT);
    var edgeHl = new Float32Array(EDGE_COUNT);
    var edgeDim = new Float32Array(EDGE_COUNT);
    var hoveredIndex = -1;
    var hoveringCore = false;
    var coreHoverAmt = 0;
    var hoverLoopActive = false;

    function updateHoverFrame(){
      var stillChanging = false;
      var i, e, dh, dd, targetHl, targetDim;
      for (i = 0; i < COUNT; i++){
        targetHl = (i === hoveredIndex) ? 1 : 0;
        targetDim = (hoveredIndex !== -1 && i !== hoveredIndex) ? 1 : 0;
        dh = targetHl - hlAmt[i];
        dd = targetDim - dimAmt[i];
        if (Math.abs(dh) > HOVER_EPS || Math.abs(dd) > HOVER_EPS) stillChanging = true;
        hlAmt[i] += dh * HOVER_EASE;
        dimAmt[i] += dd * HOVER_EASE;

        _scratchColor.copy(lit).lerp(bright, hlAmt[i]).lerp(hoverDimNode, dimAmt[i]);
        nodes.instanceColor.setXYZ(i, _scratchColor.r, _scratchColor.g, _scratchColor.b);

        dummy.position.copy(nodePos[i]);
        dummy.quaternion.identity();
        dummy.scale.setScalar(scales[i] * (1 + hlAmt[i] * 0.4));
        dummy.updateMatrix();
        nodes.setMatrixAt(i, dummy.matrix);
      }
      for (e = 0; e < EDGE_COUNT; e++){
        var ia = edgePairs[e][0], ib = edgePairs[e][1];
        var connected = (ia === hoveredIndex || ib === hoveredIndex);
        targetHl = connected ? 1 : 0;
        targetDim = (hoveredIndex !== -1 && !connected) ? 1 : 0;
        dh = targetHl - edgeHl[e];
        dd = targetDim - edgeDim[e];
        if (Math.abs(dh) > HOVER_EPS || Math.abs(dd) > HOVER_EPS) stillChanging = true;
        edgeHl[e] += dh * HOVER_EASE;
        edgeDim[e] += dd * HOVER_EASE;
        _scratchColor.copy(edgeColor).lerp(bright, edgeHl[e]).lerp(hoverDimEdge, edgeDim[e]);
        edges.instanceColor.setXYZ(e, _scratchColor.r, _scratchColor.g, _scratchColor.b);
      }
      nodes.instanceMatrix.needsUpdate = true;
      nodes.instanceColor.needsUpdate = true;
      edges.instanceColor.needsUpdate = true;
      return stillChanging;
    }

    function updateCoreHover(){
      var target = hoveringCore ? 1 : 0;
      var d = target - coreHoverAmt;
      coreHoverAmt = (Math.abs(d) < 0.0005) ? target : coreHoverAmt + d * HOVER_EASE;
      if (settled){
        var s = 1 + coreHoverAmt * 0.25;
        core.scale.setScalar(s);
        halo.scale.setScalar(s);
      }
    }

    function applyHoverState(newHoveredIndex, newHoveringCore){
      if (newHoveredIndex !== hoveredIndex){
        hoveredIndex = newHoveredIndex;
        hoverLoopActive = true;
      }
      if (newHoveringCore !== hoveringCore){
        hoveringCore = newHoveringCore;
        if (coreLabelEl) coreLabelEl.classList.toggle('is-hot', hoveringCore);
      }
      canvas.style.cursor = (hoveredIndex !== -1 || hoveringCore) ? 'pointer' : '';
    }

    var raycaster = new THREE.Raycaster();
    var pointerNDC = new THREE.Vector2(2, 2);
    var touchHoldUntil = 0;

    /* pickDirty gates the raycast: without it two intersectObject sweeps ran
       ~30x/sec forever while the hero was on screen, even with the pointer
       stationary or never over the canvas at all. */
    var pickDirty = false;

    function pickPointer(clientX, clientY){
      var rect = canvas.getBoundingClientRect();
      pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      pickDirty = true;
    }

    function runPick(){
      pickDirty = false;
      raycaster.setFromCamera(pointerNDC, camera);
      var hits = raycaster.intersectObject(proxy);
      var newHoveredIndex = hits.length ? hits[0].instanceId : -1;
      var coreHits = raycaster.intersectObject(core);
      applyHoverState(newHoveredIndex, coreHits.length > 0);
    }

    if (!reduceMotion){
      canvas.addEventListener('pointermove', function(e){
        var p = e.touches ? e.touches[0] : e;
        pickPointer(p.clientX, p.clientY);
      }, { passive: true });
      canvas.addEventListener('pointerleave', function(){
        pointerNDC.set(2, 2);
        touchHoldUntil = 0;
        pickDirty = false;
        applyHoverState(-1, false);
      }, { passive: true });
      canvas.addEventListener('pointerdown', function(e){
        if (e.pointerType !== 'touch') return;
        pickPointer(e.clientX, e.clientY);
        if (settled) runPick();
        touchHoldUntil = (window.performance ? performance.now() : Date.now()) + 1200;
      }, { passive: true });
    }

    /* -------------------- Parallax / scroll / resize -------------------- */
    var pointer = { x: 0, y: 0 };
    var pointerTarget = { x: 0, y: 0 };
    function onPointerMove(e){
      var p = e.touches ? e.touches[0] : e;
      pointerTarget.x = (p.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (p.clientY / window.innerHeight) * 2 - 1;
    }
    if (!reduceMotion){
      window.addEventListener('mousemove', onPointerMove, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
    }

    var scrollProgress = 0;
    var heroOnScreen = true;
    function updateScroll(){
      /* getBoundingClientRect is a forced synchronous layout. The render loop is
         already stopped by the IntersectionObserver when the hero is off screen,
         so this value would be discarded — skip the reflow entirely. */
      if (!heroOnScreen) return;
      var rect = heroSection.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var p = 1 - (rect.bottom / (rect.height + vh));
      scrollProgress = Math.min(1, Math.max(0, p));
    }
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    function resize(){
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    if ('ResizeObserver' in window){ new ResizeObserver(resize).observe(sceneEl); }
    else { window.addEventListener('resize', resize); }
    resize();

    var clock = new THREE.Clock();
    var rafId = null;
    var frameParity = 0;

    function renderStatic(){ renderer.render(scene, camera); }

    function loop(){
      rafId = requestAnimationFrame(loop);
      var delta = Math.min(clock.getDelta(), 0.1);

      if (!settled) updateOrganize(delta);

      frameParity = frameParity ? 0 : 1;
      var now = window.performance ? performance.now() : Date.now();
      if (settled && pickDirty && frameParity === 0 && now >= touchHoldUntil) runPick();
      if (hoverLoopActive) hoverLoopActive = updateHoverFrame();
      updateCoreHover();

      pointer.x += (pointerTarget.x - pointer.x) * 0.04;
      pointer.y += (pointerTarget.y - pointer.y) * 0.04;
      group.rotation.y += delta * 0.07 + pointer.x * 0.001;
      group.rotation.x = pointer.y * 0.16 + scrollProgress * 0.35;
      camera.position.z = 7.2 - scrollProgress * 0.9;
      renderer.render(scene, camera);
    }

    function start(){
      if (reduceMotion){ setFinalOrganizedState(); renderStatic(); return; }
      if (rafId !== null) return;
      clock.getDelta();
      loop();
    }
    function stop(){ if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; } }

    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          heroOnScreen = entry.isIntersecting;
          if (entry.isIntersecting){ updateScroll(); start(); } else stop();
        });
      }, { threshold: 0.05 });
      io.observe(heroSection);
    } else {
      start();
    }

    if (reduceMotion){ setFinalOrganizedState(); } else { updateOrganize(0); }
    renderStatic();
    canvas.style.opacity = '1';
    if (poster) poster.style.display = 'none';
  })();
})();
