/**
 * End-to-end checks for the things that have actually broken before.
 *
 * Every assertion here exists because something regressed at some point: the
 * tab underline pointing at the wrong client, the mobile menu letting the page
 * scroll behind it, a stylesheet silently swallowed by an unclosed comment, the
 * 3D scene burning CPU while idle. Keep them.
 *
 *   npm run build && npm start   (in another shell)
 *   npm run test:e2e
 *
 * Needs `playwright` available. It is intentionally NOT a dependency of the
 * site — install it ad hoc: npm i -D playwright && npx playwright install chromium
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:8123';
const PHONES = [320, 375, 390, 430];

let fail = 0;
const ok = (cond, msg) => { if (!cond) fail++; console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`); };
const head = (t) => console.log(`\n── ${t}`);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const desktop = () => browser.newPage({ viewport: { width: 1440, height: 900 } });
const phone = (w = 390) => browser.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const settle = async (p, ms = 3500) => p.waitForTimeout(ms);
const walk = async (p) => {
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(45); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(500);
};

// ─────────────────────────────────────────── pages load clean
head('pages');
for (const route of ['/', '/studio']) {
  const p = await desktop();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const bad = [];
  p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/founders/')) bad.push(`${r.status()} ${r.url()}`); });
  await p.goto(BASE + route, { waitUntil: 'load' });
  await settle(p);
  await walk(p);
  ok(errs.length === 0, `${route} no JS errors ${errs.length ? '— ' + errs.join(' | ') : ''}`);
  ok(bad.length === 0, `${route} no failed requests ${bad.length ? '— ' + bad.join(', ') : ''}`);
  await p.close();
}

// ─────────────────────────────────────────── stylesheet integrity
head('stylesheet integrity');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  const r = await p.evaluate(() => ({
    label: getComputedStyle(document.querySelector('.scene-label')).display,
    glass: getComputedStyle(document.querySelector('.glass')).backdropFilter,
    headline: document.querySelector('.hero-head').textContent.replace(/\s+/g, ' ').trim(),
  }));
  // An unclosed /* banner once commented out every hero-scene rule silently.
  ok(r.label === 'flex', `hero-scene rules applied (.scene-label ${r.label})`);
  ok(r.glass && r.glass !== 'none', 'glass rules applied');
  // JSX strips whitespace between elements where HTML kept it.
  ok(r.headline === 'We find the bottleneck. Then we live inside the fix.', `headline spacing: "${r.headline}"`);
  await p.close();
}

// ─────────────────────────────────────────── no horizontal overflow
head('layout — no overflow 320→1440');
for (const w of [...PHONES, 768, 1024, 1440]) {
  const p = w < 900 ? await phone(w) : await browser.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p, 3000);
  await walk(p);
  const r = await p.evaluate(() => ({
    h: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // ignore anything an ancestor clips — decorative bleed is intentional
    outside: [...document.querySelectorAll('main *')].filter((el) => {
      const rc = el.getBoundingClientRect();
      if (rc.width === 0 || rc.right <= window.innerWidth + 1) return false;
      let a = el.parentElement;
      while (a) { if (getComputedStyle(a).overflow !== 'visible') return false; a = a.parentElement; }
      return true;
    }).length,
  }));
  ok(r.h <= 0 && r.outside === 0, `${w}px no h-scroll (${r.h}) and nothing unclipped outside (${r.outside})`);
  await p.close();
}

// ─────────────────────────────────────────── mobile menu
head('mobile menu');
{
  const p = await phone();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.click('#navToggle');
  await p.waitForTimeout(600);
  const openState = await p.evaluate(() => {
    const m = document.getElementById('navMobile');
    const r = m.getBoundingClientRect();
    return {
      covers: r.height >= window.innerHeight * 0.9,
      linkH: Math.round(m.querySelector('a').getBoundingClientRect().height),
      scrim: getComputedStyle(document.querySelector('.nav-scrim')).visibility,
      navAbove: Number(getComputedStyle(document.getElementById('siteNav')).zIndex) > 110,
    };
  });
  ok(openState.covers, 'sheet covers the viewport height');
  ok(openState.linkH >= 44, `menu rows are tappable (${openState.linkH}px)`);
  ok(openState.scrim === 'visible', 'scrim dims the page behind');
  ok(openState.navAbove, 'close button stays above the sheet');

  // the page must not scroll behind the open sheet
  await p.evaluate(() => window.scrollTo(0, 800));
  await p.waitForTimeout(400);
  const y = await p.evaluate(() => window.scrollY);
  ok(y === 0, `page is scroll-locked while the menu is open (scrollY ${y})`);

  // The sheet occupies the right ~88vw, so the exposed scrim is the narrow
  // strip on the left. Click there, not at the viewport centre.
  const strip = await p.evaluate(() => Math.max(8, Math.round(document.getElementById('navMobile').getBoundingClientRect().left / 2)));
  await p.mouse.click(strip, 400);
  await p.waitForTimeout(600);
  const closed = await p.evaluate(() => !document.body.classList.contains('menu-open'));
  ok(closed, 'tapping the scrim closes it');
  await p.close();
}

// ─────────────────────────────────────────── tap targets
head('tap targets (44px guidance)');
{
  const p = await phone();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await walk(p);
  const small = await p.evaluate(() =>
    [...document.querySelectorAll('a, button, [role="tab"]')]
      .filter((el) => el.offsetParent && el.getClientRects().length)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44)
      .map(({ el, r }) => `${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 18)}"`));
  ok(small.length === 0, `no interactive element under 44px tall ${small.length ? '— ' + small.join(', ') : ''}`);
  await p.close();
}

// ─────────────────────────────────────────── tabs
head('client work tabs');
for (const w of [375, 1440]) {
  const p = w < 900 ? await phone(w) : await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(400);
  await p.click('#tab-3');
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const sel = document.querySelector('.tab[aria-selected="true"]');
    const ind = document.getElementById('tabIndicator');
    const s = sel.getBoundingClientRect(), i = ind.getBoundingClientRect();
    const shown = [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none');
    return { dx: Math.round(i.left - s.left), dy: Math.round(i.top - s.bottom), shown: shown.length, id: shown[0]?.id, detail: shown[0]?.querySelectorAll('.client-detail li').length };
  });
  // The underline once sat on a different client's tab once the list wrapped.
  ok(Math.abs(r.dx) <= 2 && Math.abs(r.dy) <= 4, `${w}px underline sits on the selected tab (dx ${r.dx}, dy ${r.dy})`);
  ok(r.shown === 1 && r.id === 'panel-3', `${w}px exactly one panel shown and it matches (${r.id})`);
  ok(r.detail > 0, `${w}px technical detail rendered (${r.detail} points)`);

  // held arrow key must not desync tab and panel
  await p.focus('#tab-0');
  for (let i = 0; i < 7; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(25); }
  await p.waitForTimeout(900);
  const race = await p.evaluate(() => {
    const shown = [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.id);
    const sel = [...document.querySelectorAll('.tab')].findIndex((t) => t.getAttribute('aria-selected') === 'true');
    return { shown, sel };
  });
  ok(race.shown.length === 1 && race.shown[0] === `panel-${race.sel}`, `${w}px rapid arrows keep tab and panel in sync (${race.shown} / tab ${race.sel})`);
  await p.close();
}

// ─────────────────────────────────────────── progressive enhancement
head('progressive enhancement');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length,
    panels: [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').length,
    tabAria: document.querySelectorAll('[role="tab"], [aria-selected]').length,
    steps: [...document.querySelectorAll('.process-panel')].filter((e) => getComputedStyle(e).visibility === 'visible').length,
  }));
  ok(r.hidden === 0, `JS off: nothing stuck hidden (${r.hidden})`);
  ok(r.panels === 4, `JS off: all client panels shown (${r.panels})`);
  ok(r.tabAria === 0, `JS off: no tab ARIA claiming a selection (${r.tabAria})`);
  ok(r.steps === 3, `JS off: all process steps readable (${r.steps})`);
  await ctx.close();
}

// ─────────────────────────────────────────── reduced motion
head('reduced motion');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => ({
    hidden: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length,
    labels: [...document.querySelectorAll('.scene-label')].map((e) => getComputedStyle(e).opacity),
  }));
  ok(r.hidden === 0, `reduced motion: nothing stuck hidden (${r.hidden})`);
  ok(r.labels.every((o) => Number(o) > 0.9), `reduced motion: scene labels present (${r.labels.join(', ')})`);
  await ctx.close();
}

// ─────────────────────────────────────────── 3D scene does no idle work
head('hero scene');
{
  const p = await desktop();
  await p.goto(BASE + '/?__probe=1', { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const canvasUp = await p.evaluate(() => getComputedStyle(document.getElementById('hero-canvas')).opacity);
  ok(canvasUp === '1', `WebGL scene initialised (canvas opacity ${canvasUp})`);

  const idleCasts = await p.evaluate(() => new Promise((res) => {
    const T = window.__THREE;
    if (!T) return res(-1);
    let n = 0;
    const orig = T.Raycaster.prototype.intersectObject;
    T.Raycaster.prototype.intersectObject = function (...a) { n++; return orig.apply(this, a); };
    setTimeout(() => { T.Raycaster.prototype.intersectObject = orig; res(n); }, 2500);
  }));
  ok(idleCasts === 0, `no raycasting while the pointer is idle (${idleCasts})`);

  const idleUploads = await p.evaluate(() => new Promise((res) => {
    const T = window.__THREE;
    if (!T) return res(-1);
    const d = Object.getOwnPropertyDescriptor(T.BufferAttribute.prototype, 'needsUpdate');
    let n = 0;
    Object.defineProperty(T.BufferAttribute.prototype, 'needsUpdate', {
      configurable: true, get: d.get, set(v) { if (v === true) n++; d.set.call(this, v); },
    });
    setTimeout(() => { Object.defineProperty(T.BufferAttribute.prototype, 'needsUpdate', d); res(n); }, 2500);
  }));
  ok(idleUploads === 0, `no attribute uploads once the intro settles (${idleUploads})`);
  await p.close();
}

// ─────────────────────────────────────────── contrast
head('contrast (WCAG AA)');
for (const route of ['/', '/studio']) {
  const p = await desktop();
  await p.goto(BASE + route, { waitUntil: 'load' });
  await settle(p);
  await walk(p);
  const res = await p.evaluate(() => {
    const lum = (c) => { const s = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
    const parse = (s) => s.match(/[\d.]+/g).map(Number).slice(0, 3);
    const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.7)) return parse(c); n = n.parentElement; } return [245, 241, 232]; };
    const sels = ['.founder-name', '.founder-role', '.cred-chip', '.founder-bio p',
      '.client-detail li', '.client-name', '.client-work', '.panel-quote blockquote', '.section-head h2',
      '.section-head p', '.eyebrow', '.studio-item small', '.stack-group p', '.nav-mobile-links a'];
    return sels.map((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
      const large = px >= 24 || (px >= 18.66 && bold);
      const l1 = lum(parse(cs.color)), l2 = lum(bgOf(el));
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return { s, ratio: +ratio.toFixed(2), need: large ? 3 : 4.5, px: px.toFixed(1) };
    }).filter(Boolean);
  });
  const bad = res.filter((r) => r.ratio < r.need);
  ok(bad.length === 0, `${route} contrast${bad.length ? ' — ' + bad.map((b) => `${b.s} ${b.ratio}:1`).join(', ') : ` (lowest ${Math.min(...res.map((r) => r.ratio))}:1)`}`);
  await p.close();
}

// ─────────────────────────────────────────── navigation
head('navigation');
{
  const p = await desktop();
  for (const from of ['/', '/studio']) {
    for (const { label } of [{ label: 'What we do' }, { label: 'Process' }, { label: 'Co-founders' }, { label: 'Work' }, { label: 'Build studio' }]) {
      await p.goto(BASE + from, { waitUntil: 'load' });
      await p.waitForTimeout(1200);
      await p.click(`.nav-links a:text-is("${label}")`);
      await p.waitForTimeout(2200);
      const u = new URL(p.url());
      let good = true, detail = u.pathname + u.hash;
      if (u.hash) {
        const top = await p.evaluate((h) => { const e = document.querySelector(h); return e ? Math.round(e.getBoundingClientRect().top) : null; }, u.hash);
        good = top !== null && Math.abs(top) < 200;
        detail += ` (target ${top}px)`;
      }
      ok(good, `${from} → "${label}" → ${detail}`);
    }
  }
  await p.close();
}

// ─────────────────────────────────────────── contact API
head('contact endpoint');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' }); // fetch needs a real origin
  const good = await p.evaluate(async (base) => {
    const r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test', email: 't@example.com', message: 'A test enquiry with enough length.' }) });
    return { status: r.status, body: await r.json() };
  }, BASE);
  ok(good.status === 200 && good.body.ok, `valid submission accepted (${good.status})`);
  const bad = await p.evaluate(async (base) => {
    const r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', email: 'nope', message: 'hi' }) });
    return { status: r.status, body: await r.json() };
  }, BASE);
  ok(bad.status === 400 && !!bad.body.error, `invalid submission rejected (${bad.status}: ${bad.body.error})`);
  await p.close();
}

// ─────────────────────────────────────────── anchor landings
/* Deep links must not park the section heading under the fixed nav. Each anchor
   gets a FRESH page: same-document hash navigation skips the load path and
   re-pins ScrollTrigger, which makes a reused page report nonsense. */
head('anchor landings clear the fixed nav');
for (const w of [320, 390, 768, 1440]) {
  const gaps = [];
  for (const a of ['founders', 'what-we-do', 'work', 'contact']) {
    const p = await browser.newPage({ viewport: { width: w, height: 844 } });
    await p.goto(`${BASE}/#${a}`, { waitUntil: 'load' });
    await settle(p);
    gaps.push({ a, gap: await p.evaluate((id) => {
      const nav = document.querySelector('.nav').getBoundingClientRect();
      const sec = document.getElementById(id);
      const first = sec.querySelector('.eyebrow, h2, h1') || sec;
      return Math.round(first.getBoundingClientRect().top - nav.bottom);
    }, a) });
    await p.close();
  }
  const under = gaps.filter((g) => g.gap < 8);
  ok(under.length === 0,
    `${w}px every anchor lands clear of the nav (min ${Math.min(...gaps.map((g) => g.gap))}px)${under.length ? ' — ' + under.map((u) => `${u.a} ${u.gap}px`).join(', ') : ''}`);
}

// ─────────────────────────────────────────── hover lift actually fires
/* This shipped broken for a long time and nothing caught it: `.founder-card:hover`
   at (0,2,0) lost to the reveal settle rule at (0,3,1), so the lift fired only
   with JS DISABLED, which is the progressive-enhancement contract inverted. The
   test hovers a settled card with JS on and asserts the transform really moves. */
head('card hover lift');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.querySelector('#founders').scrollIntoView());
  await p.waitForTimeout(1200);
  for (const sel of ['.founder-card', '.pillar']) {
    const el = p.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    /* Wait for the reveal to finish BEFORE hovering. While it is still running
       the card is sliding up under the cursor, so the hover starts late. */
    await el.evaluate((n) => new Promise((done) => {
      const check = () => (n.classList.contains('is-visible') && getComputedStyle(n).transform === 'none'
        ? done() : requestAnimationFrame(check));
      check();
    }));
    await el.hover();
    /* Then poll for the lift to stop moving, rather than sleeping a fixed 800ms
       and hoping. A fixed wait read this mid-transition once, at -0.25px of a
       -5px lift, and reported a working hover as broken. */
    const read = () => el.evaluate((n) => ({
      t: getComputedStyle(n).transform,
      hovered: n.matches(':hover'),
      settled: n.classList.contains('is-visible') && document.body.classList.contains('reveal-armed'),
    }));
    let r = await read();
    for (let i = 0; i < 24; i++) {
      await p.waitForTimeout(120);
      const cur = await read();
      const stable = cur.t === r.t;
      r = cur;
      if (stable && cur.t !== 'none') break;
    }
    ok(r.hovered && r.settled && r.t !== 'none',
      `${sel} lifts on hover when settled (${r.t})`);
  }
  // The card is a real link to a real destination, not a div pretending.
  const link = await p.$$eval('a.founder-card', (n) => n.map((a) => ({
    href: a.getAttribute('href'), label: a.getAttribute('aria-label'), rel: a.getAttribute('rel'),
  })));
  ok(link.length === 2 && link.every((l) => /linkedin\.com/.test(l.href) && l.label && /noopener/.test(l.rel || '')),
    `founder cards link out safely (${link.map((l) => l.label).join(', ')})`);
  await p.close();
}

// ─────────────────────────────────────────── founders carousel
/* Live, this is a looping deck: one card in front and one behind each of its
   edges, at every position. Without JS it must fall back to the flat scrolling
   row the markup and CSS still describe. Both halves are checked here. */
head('founders carousel');

/* Geometry of the painted layer. Read .founder-depth, never .founder-slide: the
   slide is layout only and is deliberately never transformed, so probing it
   would report three stacked cards sitting still and quietly pass whatever the
   deck was actually doing. */
const depthGeo = (p) => p.evaluate(() => {
  const t = document.querySelector('.founders-track');
  const tr = t.getBoundingClientRect();
  return {
    trackW: Math.round(tr.width),
    cards: [...t.querySelectorAll('.founder-depth')].map((d, i) => {
      const r = d.getBoundingClientRect();
      const cs = getComputedStyle(d);
      return {
        i, l: Math.round(r.left - tr.left), r: Math.round(r.right - tr.left),
        w: Math.round(r.width), op: +(+cs.opacity).toFixed(2), z: +cs.zIndex,
        front: d.classList.contains('is-front'),
      };
    }),
  };
});

{
  const p = await phone();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.querySelector('#founders').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const t = document.querySelector('.founders-track');
    return { slides: t.querySelectorAll('.founder-slide').length,
             live: t.classList.contains('is-live'),
             scrollable: t.scrollWidth > t.clientWidth + 10,
             dots: document.querySelectorAll('.founders-dot').length };
  });
  ok(r.slides === 3, `three slides including the delivery team (${r.slides})`);
  ok(r.live && !r.scrollable, 'JS on: the row has become a deck and no longer scrolls');
  ok(r.dots === 3, `one dot per slide (${r.dots})`);

  /* The point of the whole thing: at EVERY resting position there is a card on
     both sides, which is only true if the deck wraps. Walking all three and
     back to the start is what proves the loop, so one card is never stranded
     with empty space beside it. */
  const seen = [];
  for (let k = 0; k < 4; k++) {
    const g = await depthGeo(p);
    const front = g.cards.find((c) => c.front);
    const back = g.cards.filter((c) => !c.front);
    const left = back.find((c) => c.l < front.l);
    const right = back.find((c) => c.l > front.l);
    seen.push(front ? front.i : -1);

    ok(!!front && !!left && !!right,
      `position ${k}: card ${front ? front.i : '?'} in front with one card either side`);
    ok(!!left && !!right && left.r > front.l && left.r < front.r && right.l > front.l && right.l < front.r,
      `position ${k}: both neighbours tuck behind the front card's edges`);
    ok(!!left && !!right && left.l < front.l - 8 && right.r > front.r + 8,
      `position ${k}: they peek ${left ? front.l - left.l : 0}px left and ${right ? right.r - front.r : 0}px right`);
    ok(front.op === 1 && back.every((c) => c.op < 0.6 && c.w < front.w && c.z < front.z),
      `position ${k}: front card full strength, both neighbours faded and scaled back`);
    ok(g.cards.every((c) => c.l >= -1 && c.r <= g.trackW + 1),
      `position ${k}: every card stays inside the track rather than being clipped`);

    if (k < 3) { await p.click('.founders-nav[aria-label="Next"]'); await p.waitForTimeout(900); }
  }
  ok(seen[0] === 0 && seen[1] === 1 && seen[2] === 2 && seen[3] === 0,
    `the deck rotates one card at a time and loops back round (${seen.join(' → ')})`);

  // The track is no longer a scroll container, so it has to handle these itself.
  await p.evaluate(() => document.querySelector('.founders-track').focus());
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(900);
  const kb = await depthGeo(p);
  ok(kb.cards.find((c) => c.front).i === 1, 'arrow keys move the deck once it holds focus');

  /* A back card is mostly covered, so a click on the sliver means "bring this
     forward", not "open LinkedIn" — otherwise a mis-tap leaves the site. */
  const before = p.url();
  const target = kb.cards.find((c) => !c.front && c.l < kb.cards.find((x) => x.front).l);
  const spot = await p.evaluate((i) => {
    const d = [...document.querySelectorAll('.founder-depth')][i].getBoundingClientRect();
    const f = document.querySelector('.founder-depth.is-front').getBoundingClientRect();
    return { x: (d.left + f.left) / 2, y: d.top + d.height / 2 };
  }, target.i);
  await p.mouse.click(spot.x, spot.y);
  await p.waitForTimeout(1000);
  const after = await depthGeo(p);
  ok(p.url() === before && p.context().pages().length === 1 && after.cards[target.i].front,
    'clicking a half-hidden card brings it forward instead of following its link');

  /* Swiping is the whole interaction on a phone, and it is hand-rolled now that
     there is no scroll container underneath doing it. */
  const drag = async (dx, steps = 10) => {
    const b = await p.locator('.founder-depth.is-front').boundingBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    await p.mouse.move(cx, cy);
    await p.mouse.down();
    for (let k = 1; k <= steps; k++) await p.mouse.move(cx + (dx / steps) * k, cy);
    const mid = await depthGeo(p);
    await p.mouse.up();
    await p.waitForTimeout(900);
    return { mid, end: await depthGeo(p) };
  };

  const start = (await depthGeo(p)).cards.find((c) => c.front).i;
  const left = await drag(-180);
  ok(left.end.cards.find((c) => c.front).i === (start + 1) % 3,
    'dragging left brings the next card forward');
  /* Mid-gesture the deck must be somewhere between two states, not snapped to
     one of them: that is the difference between following the finger and
     jumping when it lifts. */
  ok(left.mid.cards.some((c) => c.op > 0.6 && c.op < 1),
    `a part-finished drag sits between positions (${left.mid.cards.map((c) => c.op).join(' / ')})`);

  const right = await drag(180);
  ok(right.end.cards.find((c) => c.front).i === start,
    'dragging back the other way returns the card it came from');

  const nudge = await drag(-12, 4);
  ok(nudge.end.cards.find((c) => c.front).i === start && p.url() === before && p.context().pages().length === 1,
    'a nudge too small to be a swipe settles back without following the card\'s link');
  await p.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const t = document.querySelector('.founders-track');
    return { slides: t.querySelectorAll('.founder-slide').length,
             live: t.classList.contains('is-live'),
             scrollable: t.scrollWidth > t.clientWidth + 10,
             overflowX: getComputedStyle(t).overflowX,
             controls: document.querySelectorAll('.founders-nav').length,
             faded: [...t.querySelectorAll('.founder-depth')]
               .filter((d) => +getComputedStyle(d).opacity < 1).length };
  });
  ok(r.slides === 3 && !r.live && r.scrollable && r.overflowX !== 'visible',
    `JS off: all 3 cards present and the strip still scrolls (overflow-x ${r.overflowX})`);
  ok(r.controls === 0, `JS off: no dead arrow controls rendered (${r.controls})`);
  /* The depth effect is painted from JS. Without it the fallback must be a
     plain flat row — never cards left stranded at 45% opacity behind nothing. */
  ok(r.faded === 0, `JS off: every card falls back to full strength (${r.faded} faded)`);
  await ctx.close();
}

// ─────────────────────────────────────────── copy house style
/* Em dashes read as machine-written to the client, so they are banned from
   anything a visitor sees. Checking rendered text rather than source catches
   &mdash; entities and template-interpolated titles too. Code comments are not
   in scope: they are not the site. */
head('copy house style');
for (const route of ['/', '/studio']) {
  const p = await desktop();
  await p.goto(BASE + route, { waitUntil: 'load' });
  await settle(p);
  const found = await p.evaluate(() => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement?.closest('script,style')) continue;
      if (/[—–]/.test(n.nodeValue)) hits.push(n.nodeValue.trim().slice(0, 70));
    }
    if (/[—–]/.test(document.title)) hits.push(`<title> ${document.title}`);
    document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]').forEach((m) => {
      if (/[—–]/.test(m.content)) hits.push(`${m.getAttribute('property') || m.name} ${m.content}`);
    });
    return hits;
  });
  ok(found.length === 0, `${route} no em/en dashes in visible copy${found.length ? ' — ' + found.join(' | ') : ''}`);

  /* Denial phrasing is banned for the same reason as em dashes: it reads as
     machine-written, and worse, it plants the accusation it is rebutting. "We
     don't hand off a deck and disappear" makes the reader picture exactly that.
     Say what you DO. This caught seven instances across the two pages the first
     time it ran, so it is a habit rather than a one-off.

     Only first-person denials are banned. "rather than" and "instead of" are
     fine when the contrast is about something other than us, as in the founder
     bio, so they are deliberately not listed. */
  const denials = await p.evaluate(() => {
    const bad = [
      /\bwe(?:'|’)?re not\b/i, /\bwe are not\b/i,
      /\bwe don(?:'|’)?t\b/i, /\bwe do not\b/i,
      /\bwe won(?:'|’)?t\b/i, /\bwe never\b/i,
      /\bnot here to\b/i, /\bnot just\b/i, /\bnot a\b/i,
      /\bunlike (?:other|most|the)\b/i, /\bno (?:account manager|middleman|hand[- ]?off)\b/i,
    ];
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement?.closest('script,style')) continue;
      /* Client testimonials are verbatim and are not ours to rewrite. */
      if (n.parentElement?.closest('.panel-quote,.client-quote')) continue;
      const t = n.nodeValue;
      if (bad.some((re) => re.test(t))) hits.push(t.trim().slice(0, 70));
    }
    return hits;
  });
  ok(denials.length === 0,
    `${route} says what it does rather than what it isn't${denials.length ? ' — ' + denials.join(' | ') : ''}`);
  await p.close();
}
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  const chips = await p.$$eval('#founders .cred-chip', (n) => n.length);
  ok(chips === 0, `founder cards carry no credential chips (${chips})`);
  // Headshots: the layer only paints if the file actually resolves, so assert on
  // the request, not just on the inline style.
  const shots = await p.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('.founder-photo')) {
      const url = getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1];
      if (!url) { out.push({ url: null }); continue; }
      const r = await fetch(url);
      out.push({ url: url.split('/').pop(), status: r.status, bytes: (await r.blob()).size });
    }
    return out;
  });
  const goodShots = shots.filter((s) => s.status === 200 && s.bytes > 5000);
  ok(goodShots.length === 2,
    `both headshots load (${shots.map((s) => `${s.url} ${s.status} ${s.bytes}b`).join(', ')})`);
  const mono = await p.$$eval('.founder-monogram', (n) => n.map((e) => e.textContent.trim()));
  ok(mono.join() === 'SG,KO', `monograms still render underneath (${mono.join(' / ')})`);
  await p.close();
}

await browser.close();
console.log(fail ? `\n${fail} CHECK(S) FAILED` : '\nALL E2E CHECKS PASSED');
process.exit(fail ? 1 : 0);
