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
    const sels = ['.founder-name', '.founder-role', '.cred-chip', '.founder-points li', '.founders-note',
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

await browser.close();
console.log(fail ? `\n${fail} CHECK(S) FAILED` : '\nALL E2E CHECKS PASSED');
process.exit(fail ? 1 : 0);
