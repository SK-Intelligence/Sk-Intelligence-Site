/**
 * End-to-end checks for the things that have actually broken before.
 *
 * Every assertion here exists because something regressed at some point: the
 * selector marking the wrong client, the mobile menu letting the page
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
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:8123';
const PHONES = [320, 375, 390, 430];

/* How many builds are in the bank, and how many of them have a real
   testimonial. Both must track `clients` in lib/content.ts by hand — this is a
   plain .mjs and cannot import the TypeScript.

   They live here as named constants rather than as literals scattered through
   the assertions because the count was previously written out five separate
   times, and adding a sixth build meant finding all five. Deriving them from
   the page instead would be worse than either: a build that silently vanished
   from the array would take the expectation with it and still pass.

   QUOTED is deliberately not CLIENTS. Provena has no client to ask and
   Peshawri has one who has not been asked yet — see the note in content.ts
   before you "fix" the gap. */
const CLIENTS = 6;
const QUOTED = 4;

let fail = 0;
const ok = (cond, msg) => { if (!cond) fail++; console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`); };
const head = (t) => console.log(`\n── ${t}`);

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const desktop = () => browser.newPage({ viewport: { width: 1440, height: 900 } });
const phone = (w = 390) => browser.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const settle = async (p, ms = 3500) => p.waitForTimeout(ms);
/* Resolve a build's tab index from its name. The strip has been reordered twice,
   and a hardcoded index does not fail on a reorder: it silently runs the test
   against a different company. The A Star blocks below care which one they get,
   because they need a build with several shots, and A Star has always had four. */
/* Matched on the name element, not on the mark's whole text. A mark now carries
   the company name for assistive tech and the sector as its visible caption, so
   comparing textContent against a company name found nothing and every lookup
   quietly returned -1. */
const indexOf = (p, name) => p.evaluate((n) =>
  [...document.querySelectorAll('.tab')]
    .findIndex((t) => t.querySelector('.visually-hidden')?.textContent.trim() === n), name);
const walk = async (p) => {
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(45); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(500);
};

/* Opening a build puts a modal dialog over the page, and showModal() makes
   everything behind it inert — so a second `click('#tab-n')` while one is open
   does nothing at all, silently. Every "open build n" below goes through here,
   which closes whatever is open first. Closing via the element rather than the
   × exercises the same path Esc takes and does not depend on the button's
   position. */
const openCase = async (p, i) => {
  await p.evaluate(() => document.querySelector('dialog.case-dialog')?.close());
  await p.waitForTimeout(120);
  /* Hover the field before clicking a mark in it.
     Two reasons, and they are the same reason. Pointing at the constellation
     pauses it, so a mark you are reaching for holds still — that is the
     behaviour, and it is why a person can click a moving target comfortably.
     Playwright enforces the same thing mechanically: it refuses to click an
     element whose box is different on two consecutive frames, and a mark that
     never stops moving is never clickable. Hovering first is not a workaround
     for the test, it is the test taking the same path a reader does. */
  /* Moved by coordinate rather than by locator. `#tabList` IS the rotating
     element, so hovering it has exactly the same stability problem as clicking
     a mark on it — Playwright will not aim at a box that keeps changing. The
     clip around it never moves, so its centre is a fixed point inside the
     field, and putting the pointer there fires the mouseenter that stops the
     turn. */
  /* Touch contexts take a different route, because the field does not stop for
     them. Hover-to-pause is gated behind `(hover: hover)` — a touch browser
     leaves a synthesised hover on the last thing tapped and never sends
     mouseleave, so honouring it would freeze the constellation after the first
     tap. That is right for a reader and awkward for a driver: a real tap lands
     wherever the finger goes and does not care that the target is moving,
     whereas Playwright refuses to click anything whose box changed between two
     frames. `force` skips exactly that staleness check and nothing else that
     matters here — whether a mark is covered by a neighbour is settled by the
     geometry assertions above, at every width, rather than by this click. */
  const canHover = await p.evaluate(() => matchMedia('(hover: hover)').matches);
  if (!canHover) {
    await p.evaluate(() => document.querySelector('.orbit-clip')
      .scrollIntoView({ block: 'center', behavior: 'instant' }));
    await p.waitForTimeout(150);
    await p.click(`#tab-${i}`, { force: true });
    await p.waitForTimeout(450);
    return;
  }

  const at = await p.evaluate(() => {
    /* `behavior:'instant'` on purpose. The page sets scroll-behavior:smooth, so
       a plain scrollIntoView is still travelling several hundred milliseconds
       later — the field's rect came back a thousand pixels below the viewport,
       the pointer was moved to a coordinate off-screen, the hover never
       happened, the turn never paused, and the click then failed on a moving
       target. The symptom was "element is not stable"; the cause was a scroll
       that had not finished. */
    document.querySelector('.orbit-clip').scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = document.querySelector('.orbit-clip').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await p.mouse.move(at.x, at.y);
  await p.waitForTimeout(250);
  await p.click(`#tab-${i}`);
  await p.waitForTimeout(450);
};
const closeCase = async (p) => {
  await p.evaluate(() => document.querySelector('dialog.case-dialog')?.close());
  await p.waitForTimeout(250);
};

/** The field's rotation in degrees, read off the live matrix. */
const spinAngle = (p) => p.evaluate(() => {
  const m = new DOMMatrix(getComputedStyle(document.getElementById('tabList')).transform);
  return Math.atan2(m.b, m.a) * 180 / Math.PI;
});

/* Signed difference between two angles, unwrapped.
   atan2 returns (-180, 180], and the field crosses 180 once a revolution, so a
   pair of samples straddling that point reads as a ~350 degree jump backwards
   and fails a check that is looking for a few degrees forwards. Roughly one
   sample in thirty lands there, which is a test that fails once a fortnight for
   no reason — the worst kind. */
const spinDelta = (a, b) => ((b - a + 540) % 360) - 180;

// ─────────────────────────────────────────── pages load clean
head('pages');
for (const route of ['/', '/studio']) {
  const p = await desktop();
  const errs = [];
  /* Calendly's iframe asks for storage access and is refused in a headless
     context, which surfaces here as a page error we neither caused nor can
     fix. Named exactly rather than filtered by origin, because pageerror does
     not carry one and a blanket ignore would gut the check. */
  p.on('pageerror', (e) => { if (!/requestStorageAccess/.test(e.message)) errs.push(e.message); });
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|requestStorageAccess/.test(m.text())) errs.push(m.text()); });
  const bad = [];
  /* Same-origin only. Calendly's widget is loaded on this page and a third
     party's 404 or console noise is not this site's failure to fix; scoping to
     our own origin keeps the check about our own assets. */
  p.on('response', (r) => {
    if (!r.url().startsWith(BASE)) return;
    if (r.status() >= 400 && !r.url().includes('/founders/')) bad.push(`${r.status()} ${r.url()}`);
  });
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
  ok(r.headline === 'We find the bottlenecks. Then we build the fix into the systems you already run.', `headline spacing: "${r.headline}"`);
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

  /* Again with the dialogs open.
     The sweep above only ever saw the closed page, so every control inside the
     case study and the screenshot viewer went unmeasured — which is how two
     36px close buttons sat there being the only visible way out of a modal on a
     phone. Anything a reader can reach has to be measured, and a modal is very
     much reachable. */
  const measure = () => p.evaluate(() =>
    [...document.querySelectorAll('a, button')]
      .filter((el) => el.getClientRects().length)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44)
      .map(({ el, r }) => `${el.className || el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`));

  /* Resolved by name, and it has to be a build with more than one shot: the
     viewer's prev/next controls only render above one screenshot, so landing on
     a single-shot build would measure the close button and quietly skip the two
     stepper buttons that were also 36px. */
  await openCase(p, await indexOf(p, 'A Star Customs'));
  const inCase = await measure();
  ok(inCase.length === 0, `no control under 44px inside the case study ${inCase.length ? '— ' + inCase.join(', ') : ''}`);

  await p.click('.showcase-open');
  await p.waitForTimeout(450);
  const inLightbox = await measure();
  ok(inLightbox.length === 0, `no control under 44px inside the screenshot viewer ${inLightbox.length ? '— ' + inLightbox.join(', ') : ''}`);
  await p.close();
}


// ─────────────────────────────────────────── the constellation
/* Every phone width, not just one. The overlap that shipped past the first
   version of this block was a function of how wide the field ended up, so a
   single viewport is exactly the wrong amount of coverage. */
head('work orbit');
for (const w of [...PHONES, 768, 1440]) {
  const p = w < 900 ? await phone(w) : await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(600);

  const closed = await p.evaluate(() => {
    const field = document.getElementById('tabList');
    /* Measured against the CLIP, not against the field.
       `#tabList` is the element that rotates, so its getBoundingClientRect is
       the axis-aligned box around a rotated square — its diagonal. At 33
       degrees that is 580px around a 500px field, handing the check 40px of
       slack per side, and at 45 degrees it is 707px and hands it 103px. A mark
       could sit a hundred pixels outside the visible area, cropped by
       overflow:hidden and invisible, and this would still read zero. It was the
       only assertion behind "a chip cannot leave the field at any width" and it
       was the one that could not fail. The clip does not rotate. */
    const fr = document.querySelector('.orbit-clip').getBoundingClientRect();
    const tabs = [...document.querySelectorAll('.tab')];
    /* Measured on the CHIP, not on the button.
       The drift translates the chip inside the button, and a child's transform
       does not move the parent's rect — so measuring buttons checks boxes that
       by definition never move, while the things a reader can see touch have up
       to 17px of relative vertical travel between them (+9 against -8 on
       adjacent marks) and 10px horizontal. At the narrowest layout that is most
       of the documented clearance. The chip rect is what is on the screen, so
       it is what both the containment and the overlap checks below use. */
    /* The whole mark, not just the logo. Each mark is a logo with a sector
       caption under it now, and the caption is as much a part of what a reader
       sees touching its neighbour as the chip is. .chip-drift is the box that
       holds both. */
    const rects = tabs.map((t) => t.querySelector('.chip-drift').getBoundingClientRect());
    return {
      orbit: field.classList.contains('is-orbit'),
      role: field.getAttribute('role'),
      marks: tabs.length,
      // Each mark says it opens a dialog, and nothing pretends to be a tab in
      // a tablist: there is no selection here, only six things you can open.
      haspopup: tabs.filter((t) => t.getAttribute('aria-haspopup') === 'dialog').length,
      tabRole: document.querySelectorAll('.tab[role="tab"], .tab[aria-selected], .tab[aria-expanded]').length,
      shown: [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').length,
      /* Every mark inside the clip, at EVERY rotation, proved rather than
         sampled.

         Checking the rects where they happen to be catches only the angle the
         snapshot was taken at, and containment in a square is angle-dependent:
         a mark's horizontal extent peaks once a revolution, when its centre
         crosses the horizontal axis. Forcing a set of angles would work and
         would need the drift and the counter-rotation forced with it.

         The invariant is simpler than that. The marks are counter-rotated, so
         each one is always upright and its rect is its true size; and its
         distance from the centre does not change as the field turns. So it
         stays inside for the whole revolution exactly when

             centre distance + half its longest side + the drift reach <= half the clip

         which is what the CSS computes as `50% - --rad - --d`. 5px is the drift
         reach, hypot(3, 4), because the drift is written inside the rotating
         field and so points in every direction over a revolution. */
      escaped: tabs.map((t, i) => {
        /* The centre comes from the BUTTON, the extent from the chip inside it.
           The drift is written to a wrapper within the button, so the button's
           centre is the mark's true anchor — undrifted — while the chip's rect
           is the thing that has to fit. Taking the centre from the chip instead
           would fold the drift into the measurement and then add the drift
           reach again on top, double-counting it and failing by a pixel. The
           button's own rect is rotated and its width is meaningless here; only
           its centre is used, and rotation about the field's centre does not
           move a centre off its circle. */
        const b = t.getBoundingClientRect();
        const c = rects[i];
        const rho = Math.hypot((b.left + b.right) / 2 - (fr.left + fr.right) / 2,
                               (b.top + b.bottom) / 2 - (fr.top + fr.bottom) / 2);
        return rho + Math.max(c.width, c.height) / 2 + 5 - fr.width / 2;
      }).filter((over) => over > 1).length,
      /* Real rectangle intersection, and it reports WHICH pair.
         The first version of this only looked for two marks at nearly the same
         coordinates, which is a much rarer failure than the one that actually
         happened: the 2.35:1 wordmark overlapped its neighbour by 21x55px on a
         phone, sat on top of it, and ate every tap meant for it. Nothing about
         the picture said so — the neighbour was still visible. Overlapping at
         all is the bug, not overlapping exactly. */
      overlaps: rects.flatMap((a, i) => rects.slice(i + 1).map((b, k) => {
        const j = i + 1 + k;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return ox > 0 && oy > 0 ? `${i}/${j} by ${Math.round(ox)}x${Math.round(oy)}px` : null;
      })).filter(Boolean),
      hint: !!document.querySelector('.orbit-hint'),
      /* Measured on the clip, not the field. The field is rotated, so its
         bounding rect is its diagonal and grows and shrinks as it turns —
         reading it as "how much screen does this cost" overstates it by up to
         41% and varies by the second. The clip is the unrotated box the reader
         actually sees. */
      tall: Math.round(document.querySelector('.orbit-clip').getBoundingClientRect().height),
    };
  });
  ok(closed.orbit && closed.marks === CLIENTS, `${w}px the section opens as ${CLIENTS} marks in a field (${closed.marks})`);
  ok(closed.role === 'group' && closed.tabRole === 0, `${w}px it is a group of buttons, not a tablist claiming a selection (role ${closed.role})`);
  ok(closed.haspopup === CLIENTS, `${w}px every mark says it opens a dialog (${closed.haspopup})`);
  ok(closed.shown === 0, `${w}px no case study until one is picked (${closed.shown} shown)`);
  ok(closed.escaped === 0, `${w}px every mark stays inside the field (${closed.escaped} escaped)`);
  ok(closed.overlaps.length === 0, `${w}px no mark covers another ${closed.overlaps.length ? '— ' + closed.overlaps.join(', ') : ''}`);
  ok(closed.hint, `${w}px the section says what to do`);
  /* A phone must not spend a whole screen on the selector before the work.
     Keyed to 720px, which is where the CSS actually switches to the compact
     field — 768px is a tablet on the desktop layout and is held to the desktop
     field size, so budgeting it as a phone was measuring the wrong rule. */
  if (w <= 720) ok(closed.tall <= 340, `${w}px the field leaves room for the case study (${closed.tall}px)`);

  /* It actually turns.
     The section is meant to read as a constellation in motion, and the drift
     alone — a few pixels over fourteen seconds — does not read as motion at
     all. Two samples two seconds apart: at 72s for a revolution that is 10
     degrees, far outside any rounding. */
  const a1 = await spinAngle(p);
  await p.waitForTimeout(2000);
  const a2 = await spinAngle(p);
  const turned = Math.abs(spinDelta(a1, a2));
  ok(turned > 3 && turned < 45, `${w}px the field is turning (${turned.toFixed(1)}deg in 2s)`);

  /* ...and the logos stay upright while it does.
     Each mark counter-rotates by exactly the field's rotation. If that ever
     falls out of phase the marks tip over, and the widest one is where it shows
     first: tilting a 140x76 box even 10 degrees pulls its bounding box towards
     square, so its ASPECT RATIO is the tell.

     Ratio rather than width, because the outer ring is scaled to .88 for depth
     and half the marks are on it — comparing raw widths measures the depth
     effect as much as the rotation. A scale leaves the ratio alone; a rotation
     does not. */
  const upright = await p.evaluate(() => {
    const r = document.querySelector('.tab[data-wide] .client-chip').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), ratio: r.width / r.height };
  });
  /* Three sizes, because the marks come in three: a captioned desktop mark, a
     captioned phone mark, and the bare logo below 361px where a caption does
     not fit. Measured on the chip rather than the whole mark on purpose — the
     chip is the part whose shape a rotation would distort. */
  const nominal = w <= 360 ? 88 / 52 : w <= 720 ? 76 / 48 : 140 / 76;
  ok(Math.abs(upright.ratio - nominal) < 0.08,
    `${w}px the marks stay upright as the field turns (wordmark ${upright.w}x${upright.h}, ratio ${upright.ratio.toFixed(2)} vs ${nominal.toFixed(2)})`);

  /* Where the field is standing at the moment of the click.
     Every other rotation check here is a DELTA between two samples taken in the
     same state, which is why none of them noticed the field snapping back to
     zero the instant a case study opened — the deltas either side were both
     fine. What matters to a reader is that the arrangement they left is the
     arrangement they come back to, so that is what gets asserted, across the
     open and across the close.

     Sampled after the pointer is already resting on the field, so on a device
     that pauses for a pointer the turn has stopped before the reading is taken.
     Eight degrees of tolerance because a touch device does not pause for a
     hover — by design — so a second of legitimate turning sits between the two
     samples there, at five degrees a second. A reset lands nowhere near that:
     it snaps to zero from wherever it had reached, which was twenty to ninety
     degrees every time it was measured. */
  const settleAt = await p.evaluate(() => {
    document.querySelector('.orbit-clip').scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = document.querySelector('.orbit-clip').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await p.mouse.move(settleAt.x, settleAt.y);
  await p.waitForTimeout(300);
  const parked = await spinAngle(p);

  // Picking one opens its case study over the top. Nothing else opens with it.
  await openCase(p, 2);
  const held = await spinAngle(p);
  ok(Math.abs(spinDelta(parked, held)) < 8,
    `${w}px opening a build does not move the constellation behind it (${parked.toFixed(1)} -> ${held.toFixed(1)}deg)`);
  const opened = await p.evaluate(() => {
    const d = document.querySelector('dialog.case-dialog');
    const shown = [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none');
    return {
      dialog: !!d && d.open,
      modal: !!d && d.matches(':modal'),
      shown: shown.map((x) => x.id),
      // The case study names itself in its own heading, once. The chrome bar
      // used to repeat it directly above and no longer does, so this reads the
      // heading — and would catch the name going missing altogether.
      title: d?.querySelector('.client-name')?.textContent ?? '',
      titles: d?.querySelectorAll('.client-name').length ?? 0,
      label: d?.getAttribute('aria-label') ?? '',
      close: !!d?.querySelector('.case-x'),
      // The constellation is still there behind it, not torn down and rebuilt.
      orbit: document.getElementById('tabList').classList.contains('is-orbit'),
      hint: !!document.querySelector('.orbit-hint'),
    };
  });
  ok(opened.dialog && opened.modal, `${w}px picking a mark opens a modal case study`);
  ok(opened.shown.length === 1 && opened.shown[0] === 'panel-2', `${w}px exactly the build that was picked, and only it (${opened.shown})`);
  ok(opened.close && opened.title.length > 0 && opened.titles === 1,
    `${w}px the case study names itself exactly once and offers a way out ("${opened.title}", ${opened.titles})`);
  ok(opened.label.includes(opened.title),
    `${w}px the dialog is labelled for assistive tech ("${opened.label}")`);
  ok(opened.orbit && opened.hint, `${w}px the constellation is still underneath, not replaced`);

  /* The page behind a modal is inert. This is the property the whole design
     leans on — it is what makes "one at a time" true rather than merely
     intended — so it gets asserted rather than assumed. */
  const inert = await p.evaluate(() => {
    const mark = document.getElementById('tab-0');
    mark.focus();
    return document.activeElement?.id !== 'tab-0';
  });
  ok(inert, `${w}px the constellation cannot be reached behind the open case study`);

  // Esc closes it, and the platform hands focus back to the mark that opened it.
  await p.keyboard.press('Escape');
  await p.waitForTimeout(450);
  const reclosed = await p.evaluate(() => ({
    dialog: !!document.querySelector('dialog.case-dialog'),
    orbit: document.getElementById('tabList').classList.contains('is-orbit'),
    focused: document.activeElement ? document.activeElement.id : null,
    shown: [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').length,
  }));
  ok(!reclosed.dialog && reclosed.shown === 0, `${w}px Esc closes it back to the constellation (${reclosed.shown} shown)`);
  ok(reclosed.orbit, `${w}px the field is still the field afterwards`);
  ok(reclosed.focused === 'tab-2', `${w}px closing hands focus back to the mark that was open (${reclosed.focused})`);
  // ...and the field is where it was left, not back at zero.
  const returned = await spinAngle(p);
  ok(Math.abs(spinDelta(held, returned)) < 8,
    `${w}px closing returns the constellation as it was left (${held.toFixed(1)} -> ${returned.toFixed(1)}deg)`);

  /* Closing with Esc leaves the keyboard on the mark it came back to, and a
     mark under a visible focus ring holds the field still — a reader stepping
     through with the keyboard should not have their target sliding away. So
     first: still while focused. */
  await p.mouse.move(0, 0);
  await p.waitForTimeout(300);
  const k1 = await spinAngle(p);
  await p.waitForTimeout(900);
  const k2 = await spinAngle(p);
  ok(Math.abs(spinDelta(k1, k2)) < 0.5, `${w}px a mark holding keyboard focus holds the field still (${Math.abs(spinDelta(k1, k2)).toFixed(2)}deg)`);

  /* ...and then it turns again once nothing is holding it. This is the check
     that the tweens were rebuilt on close rather than left paused for good, and
     that a pointer resting on the field from the click that opened the case
     study does not freeze it permanently. */
  await p.evaluate(() => document.activeElement?.blur());
  await p.waitForTimeout(300);
  const b1 = await spinAngle(p);
  await p.waitForTimeout(1600);
  const b2 = await spinAngle(p);
  ok(Math.abs(spinDelta(b1, b2)) > 2, `${w}px it goes back to turning once nothing holds it (${Math.abs(spinDelta(b1, b2)).toFixed(1)}deg)`);

  // Another mark opens ITS case study, one at a time, no accumulation.
  await openCase(p, 4);
  const second = await p.evaluate(() => ({
    dialogs: document.querySelectorAll('dialog.case-dialog').length,
    shown: [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.id),
  }));
  ok(second.dialogs === 1 && second.shown.length === 1 && second.shown[0] === 'panel-4',
    `${w}px picking another opens that one instead, not as well (${second.dialogs} dialog, ${second.shown})`);

  // The × closes it too, not only Esc.
  await p.click('.case-x');
  await p.waitForTimeout(400);
  const byButton = await p.evaluate(() => !!document.querySelector('dialog.case-dialog'));
  ok(!byButton, `${w}px the close button closes it`);

  // Arrows walk the marks; they do not open anything on their own.
  await p.focus('#tab-0');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(250);
  const arrowed = await p.evaluate(() => ({
    dialog: !!document.querySelector('dialog.case-dialog'),
    focused: document.activeElement?.id,
  }));
  ok(!arrowed.dialog && arrowed.focused === 'tab-1', `${w}px arrows move between marks without opening one (${arrowed.focused})`);
  await p.close();
}

// ─────────────────────────────────────────── tabs
head('client work tabs');
for (const w of [375, 1440]) {
  const p = w < 900 ? await phone(w) : await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(400);
  await openCase(p, 3);
  const r = await p.evaluate(() => {
    const shown = [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none');
    const tabs = [...document.querySelectorAll('.tab')];
    return {
      // Every chip is a real, labelled control rather than a bare image.
      labelled: tabs.every((t) => t.textContent.trim().length > 0),
      shown: shown.length,
      id: shown[0]?.id,
      detail: shown[0]?.querySelectorAll('.client-detail li').length,
      // The list is behind a disclosure and starts closed, so the case study
      // opens on the outcome and the numbers rather than on an implementation
      // dump.
      openByDefault: shown[0]?.querySelectorAll('.client-more[open]').length,
    };
  });
  ok(r.labelled, `${w}px every logo carries its company name for assistive tech`);
  ok(r.shown === 1 && r.id === 'panel-3', `${w}px exactly one case study shown and it matches (${r.id})`);
  ok(r.detail > 0, `${w}px technical detail rendered (${r.detail} points)`);
  ok(r.openByDefault === 0, `${w}px the detail list starts folded away (${r.openByDefault} open)`);

  // The disclosure opens, and what it reveals is the list.
  await p.click('#panel-3 .client-more summary');
  await p.waitForTimeout(350);
  const opened = await p.evaluate(() => {
    const li = document.querySelector('#panel-3 .client-detail li');
    return { open: document.querySelectorAll('#panel-3 .client-more[open]').length, visible: !!li?.getClientRects().length };
  });
  ok(opened.open === 1 && opened.visible, `${w}px the detail opens on click`);

  /* Hammering the keyboard must not leave more than one case study mounted.
     Arrows only move focus now, so this is checking that a held key cannot race
     the dialog into opening — the failure it guards against is six presses
     producing six dialogs stacked in the top layer. */
  await closeCase(p);
  await p.focus('#tab-0');
  for (let i = 0; i < 7; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(25); }
  await p.waitForTimeout(600);
  const race = await p.evaluate(() => ({
    dialogs: document.querySelectorAll('dialog.case-dialog').length,
    shown: [...document.querySelectorAll('.panel')].filter((x) => getComputedStyle(x).display !== 'none').length,
    focused: document.activeElement?.id,
  }));
  ok(race.dialogs === 0 && race.shown === 0,
    `${w}px rapid arrows open nothing (${race.dialogs} dialogs, focus ${race.focused})`);
  await p.close();
}

// ─────────────────────────────────────────── case bank
head('case bank');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(500);

  // Every build shows a screenshot, three metrics, and no empty values.
  // The first click is also what opens the bank — the section starts as the
  // constellation with no case study showing, so a block that assumed one was
  // already open would find nothing rather than fail loudly.
  let quoted = 0;
  let seen = 0;
  for (let i = 0; i < CLIENTS; i++) {
    await openCase(p, i);
    const r = await p.evaluate((n) => {
      const panel = document.getElementById(`panel-${n}`);
      const img = panel.querySelector('.showcase-frame img');
      const m = [...panel.querySelectorAll('.client-metrics > div')];
      return {
        name: panel.querySelector('.client-name')?.textContent,
        w: img?.naturalWidth ?? 0,
        alt: img?.getAttribute('alt') ?? '',
        label: panel.querySelector('.showcase-label')?.textContent ?? '',
        metrics: m.length,
        empty: m.filter((d) => !d.querySelector('dt')?.textContent.trim()
                            || !d.querySelector('dd')?.textContent.trim()).length,
        sector: panel.querySelector('.client-sector')?.textContent ?? '',
        quote: !!panel.querySelector('.panel-quote'),
        qa: [...panel.querySelectorAll('.client-qa > div > dt')].map((d) => d.textContent.trim()),
        answers: panel.querySelectorAll('.client-qa > div > dd').length,
        blank: [...panel.querySelectorAll('.client-qa > div > dd')]
          .filter((d) => d.textContent.trim().length < 20).length,
      };
    }, i);
    ok(r.w > 0, `${r.name}: build screenshot decoded (${r.w}px wide)`);
    ok(r.alt.length > 12, `${r.name}: screenshot carries real alt text`);
    ok(r.metrics === 3 && r.empty === 0, `${r.name}: three metrics, none empty`);
    ok(r.sector.length > 0 && r.label.length > 0, `${r.name}: sector "${r.sector}" and frame label present`);
    /* Every build answers all three, and answers them in the reader's order.
       A missing one is a panel that says what was built without saying what it
       was for, which is the shape this section had before. */
    ok(r.qa.join('|') === 'Asked for|Approach|Impact', `${r.name}: asked, approach, impact, in that order (${r.qa.join(', ')})`);
    ok(r.answers === 3 && r.blank === 0, `${r.name}: all three answered (${r.answers}, ${r.blank} blank)`);
    if (r.quote) quoted += 1;
    seen += 1;
  }

  /* Four of the six builds were done for a named company that gave a
     testimonial. Provena AI has no client at all, and Peshawri has one who has
     not been asked, so both carry no quote and the renderer omits the block
     rather than filling it.

     If this ever reads more, somebody has written a testimonial and attributed
     it to a company that did not give one. That is a fabricated endorsement
     sitting beside four real ones: a lie to the reader, and unlawful for a
     trading company in the UK. Saying nothing about who a build was for is
     fine. Inventing someone to say it was good is not.

     Tallied across the six openings rather than counted in one sweep of the
     DOM: only the open build is mounted now, so a single querySelectorAll would
     always find exactly one panel and this check would silently become "the one
     I happen to be looking at has a quote or does not". */
  ok(seen === CLIENTS, `${CLIENTS} builds in the bank (${seen})`);
  ok(quoted === QUOTED,
    `exactly the four with a real client carry a testimonial (${quoted} of ${seen})`);

  // Every shot, not just the one each panel happens to open on. The checks
  // above only decode the primary image, and everything after them compares
  // src strings — so half the PNGs could be deleted and the suite would still
  // pass. Walk each build's whole strip and decode all of them.
  //
  // A build with a single shot renders no thumbnail strip (the renderer only
  // draws one at shots.length > 1), so there is nothing to walk and its one
  // image is checked directly instead. Skipping it entirely would leave that
  // PNG the only unverified file in public/work/.
  //
  // No build is in that state today — Provena was, until its interior screens
  // were captured. The branch stays because the condition it guards is a
  // property of the renderer rather than of today's content, and the next
  // client added will start life with one shot.
  for (let i = 0; i < CLIENTS; i++) {
    await openCase(p, i);
    const shots = await p.evaluate((n) => {
      const panel = document.getElementById(`panel-${n}`);
      return [...panel.querySelectorAll('.client-shot')].length;
    }, i);
    if (shots === 0) {
      const r = await p.evaluate((n) => {
        const img = document.querySelector(`#panel-${n} .showcase-frame img`);
        return { w: img?.naturalWidth ?? 0, src: img?.getAttribute('src') ?? '' };
      }, i);
      const file = decodeURIComponent(r.src).match(/\/work\/([\w-]+\.png)/)?.[1] ?? r.src;
      ok(r.w > 0, `${file} decodes (${r.w}px, single shot)`);
      continue;
    }
    for (let j = 0; j < shots; j++) {
      await p.evaluate(([n, k]) => {
        document.querySelectorAll(`#panel-${n} .client-shot`)[k].click();
      }, [i, j]);
      await p.waitForTimeout(320);
      const r = await p.evaluate((n) => {
        const img = document.querySelector(`#panel-${n} .showcase-frame img`);
        return { w: img?.naturalWidth ?? 0, src: img?.getAttribute('src') ?? '' };
      }, i);
      const file = decodeURIComponent(r.src).match(/\/work\/([\w-]+\.png)/)?.[1] ?? r.src;
      ok(r.w > 0, `${file} decodes (${r.w}px)`);
    }
    await p.evaluate((n) => document.querySelectorAll(`#panel-${n} .client-shot`)[0].click(), i);
  }

  // Thumbnail strip swaps the primary image and moves the active marker with it.
  // Resolved by name: this block clicks the third thumbnail, so it needs a build
  // with at least three, and it has been at three different indices across two
  // reorders.
  const astar = await indexOf(p, 'A Star Customs');
  ok(astar !== -1, `found A Star in the strip (index ${astar})`);
  await openCase(p, astar);
  const before = await p.evaluate((n) =>
    document.querySelector(`#panel-${n} .showcase-frame img`).getAttribute('src'), astar);
  await p.evaluate((n) => document.querySelectorAll(`#panel-${n} .client-shot`)[2].click(), astar);
  await p.waitForTimeout(500);
  const after = await p.evaluate((n) => ({
    src: document.querySelector(`#panel-${n} .showcase-frame img`).getAttribute('src'),
    onIndex: [...document.querySelectorAll(`#panel-${n} .client-shot`)]
      .findIndex((b) => b.hasAttribute('data-on')),
    pressed: document.querySelectorAll(`#panel-${n} .client-shot[aria-pressed="true"]`).length,
  }), astar);
  ok(before !== after.src, 'a thumbnail swaps the primary screenshot');
  ok(after.onIndex === 2 && after.pressed === 1, `the active marker follows it (index ${after.onIndex})`);

  // Lightbox: opens, traps focus, steps, and closes on Esc.
  await p.click(`#panel-${astar} .showcase-open`);
  await p.waitForTimeout(450);
  const open = await p.evaluate(() => {
    const d = document.querySelector('dialog.lightbox');
    return { open: !!d?.open, modal: !!d?.matches(':modal'), inside: !!d?.contains(document.activeElement) };
  });
  ok(open.open && open.modal, 'clicking the build opens the lightbox as a modal dialog');
  ok(open.inside, 'focus moves inside the dialog rather than staying on the page behind');

  const start = await p.evaluate(() => document.querySelector('.lightbox-img').getAttribute('src'));
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(400);
  const stepped = await p.evaluate(() => ({
    src: document.querySelector('.lightbox-img').getAttribute('src'),
    count: document.querySelector('.lightbox-nav p')?.textContent ?? '',
  }));
  ok(start !== stepped.src, `arrow keys step through the set (${stepped.count})`);

  // Wrapping, not walking off the end. One full lap of the set lands back on
  // the shot we are already on, whatever that shot is — so the step count is
  // read from the build rather than hardcoded. It used to be a literal 4, which
  // only held while this build had exactly four shots and would have started
  // passing for the wrong reason the first time anyone reshot it.
  const lap = await p.evaluate((n) =>
    document.querySelectorAll(`#panel-${n} .client-shot`).length, astar);
  ok(lap > 1, `the lightbox build has a set to step through (${lap} shots)`);
  for (let i = 0; i < lap; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(180); }
  const wrapped = await p.evaluate(() =>
    document.querySelector('.lightbox-img').getAttribute('src'));
  ok(wrapped === stepped.src, 'stepping past the last shot wraps round rather than escaping the set');

  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('dialog.lightbox')), 'Esc closes the lightbox');

  // Every dismissal must hand focus back, not drop it on <body>. Esc got this
  // right for free because the UA closes the dialog itself; the X and the
  // backdrop used to call onClose directly and lost the restoration target.
  for (const [how, act] of [
    ['the close button', async () => p.click('.lightbox-x')],
    ['a backdrop click', async () => p.mouse.click(8, 8)],
  ]) {
    await p.click(`#panel-${astar} .showcase-open`);
    await p.waitForTimeout(400);
    await act();
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({
      gone: !document.querySelector('dialog.lightbox'),
      focus: document.activeElement?.className ?? '',
      locked: document.body.style.overflow,
    }));
    ok(r.gone, `${how} closes the lightbox`);
    ok(r.focus.includes('showcase-open'), `${how} hands focus back to what opened it (${r.focus || 'body'})`);
    /* Still locked, and that is the correct answer now rather than a
       regression. The lightbox opens from inside a case study, so there are two
       dialogs stacked: each saves the body's overflow as it found it and puts
       that value back on the way out. Closing the inner one restores what the
       outer one set, which is 'hidden', because the outer one is still open and
       the page behind it still must not scroll. The lock is released by the
       case study closing, asserted directly below — a nested dialog that
       released it early would let the page scroll away underneath the case
       study the reader is still looking at. */
    ok(r.locked === 'hidden', `${how} leaves the page locked while the case study is still open (${r.locked || 'unset'})`);
  }

  /* The nested path: close the OUTER dialog while the viewer is still open.
     Both components unmount in the same commit, and React runs the outer one's
     cleanup first — so when each dialog saved and restored the body's overflow
     for itself, the outer restored '' and the inner then restored the 'hidden'
     it had captured while the outer was open. The page came back with no dialog
     on it and no way to scroll short of a reload. The lock is counted now, and
     this is the sequence that proves it. */
  await openCase(p, astar);
  await p.click(`#panel-${astar} .showcase-open`);
  await p.waitForTimeout(450);
  await p.evaluate(() => document.querySelector('dialog.case-dialog').close());
  await p.waitForTimeout(600);
  const nested = await p.evaluate(() => ({
    dialogs: document.querySelectorAll('dialog[open]').length,
    lock: document.body.style.overflow || '(unset)',
    // Asked with an instant scroll: the page sets scroll-behavior:smooth, so a
    // default scrollBy animates and scrollY has not moved when read back.
    canScroll: (() => {
      const y = window.scrollY;
      window.scrollBy({ top: 200, behavior: 'instant' });
      const moved = window.scrollY !== y;
      window.scrollTo({ top: y, behavior: 'instant' });
      return moved;
    })(),
  }));
  ok(nested.dialogs === 0 && nested.lock !== 'hidden' && nested.canScroll,
    `closing a case study out from under the viewer leaves the page scrollable (${nested.lock}, ${nested.dialogs} dialogs)`);

  /* ...and closing the case study itself hands the page back. Without this the
     pair above would pass just as happily on a lock that is never released at
     all, which is the worse bug of the two: a page that cannot be scrolled
     again until it is reloaded. */
  await closeCase(p);
  const released = await p.evaluate(() => ({
    lock: document.body.style.overflow,
    dialogs: document.querySelectorAll('dialog[open]').length,
  }));
  ok(released.lock !== 'hidden' && released.dialogs === 0,
    `closing the case study releases the page scroll lock (${released.lock || 'unset'}, ${released.dialogs} dialogs)`);

  // The nav strip is fixed height and must stay reachable. It used to fall off
  // the bottom on anything shorter than ~893px, which is most laptops, and the
  // only viewport the suite tested was the 900px where it survived by 5px.
  for (const h of [900, 800, 745]) {
    const s = await browser.newPage({ viewport: { width: 1440, height: h } });
    await s.goto(BASE + '/', { waitUntil: 'load' });
    await settle(s);
    await s.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await s.waitForTimeout(400);
    /* Resolved by name because .lightbox-nav only renders above one shot: land
       this on the single-shot build and the assertion below reads null. */
    const multi = await indexOf(s, 'A Star Customs');
    await openCase(s, multi);
    await s.click(`#panel-${multi} .showcase-open`);
    await s.waitForTimeout(600);
    const nav = await s.evaluate(() => {
      const n = document.querySelector('.lightbox-nav');
      const r = n.getBoundingClientRect();
      return { bottom: Math.round(r.bottom), vh: window.innerHeight, top: Math.round(r.top) };
    });
    ok(nav.bottom <= nav.vh && nav.top >= 0,
      `1440x${h}: the lightbox nav stays on screen (bottom ${nav.bottom} of ${nav.vh})`);
    await s.close();
  }

  // The section deliberately sends nobody off-site.
  const out = await p.evaluate(() => [...document.querySelectorAll('#work a[href]')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => /astarcustoms|ossettyres|gbautosandtyres|hopefulheartsltd/i.test(h)));
  ok(out.length === 0, `no outbound client links in the section${out.length ? ' — ' + out.join(' ') : ''}`);

  await p.close();
}

// ─────────────────────────────────────────── case bank on a phone
head('case bank on a phone');
for (const w of PHONES) {
  const p = await phone(w);
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await p.evaluate(() => document.getElementById('tabList').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(500);
  // Open the bank. Closed, the section is the constellation and no panel is
  // rendered, so every query below would come back null.
  await openCase(p, 0);

  const r = await p.evaluate(() => {
    const sc = document.querySelector('#panel-0 .showcase-scroll');
    const img = document.querySelector('#panel-0 .showcase-frame img');
    const hint = document.querySelector('#panel-0 .showcase-hint');
    return {
      imgW: Math.round(img.getBoundingClientRect().width),
      frameW: Math.round(sc.getBoundingClientRect().width),
      scrollable: sc.scrollWidth > sc.clientWidth + 5,
      hint: getComputedStyle(hint).display !== 'none',
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  // The frame is the OVERVIEW; the lightbox below is where you read. A previous
  // version rendered the shot near native size in a sideways scroller so the
  // body text stayed legible, and it cost the section its point: you could no
  // longer see that a client HAS a website, only a slice of one, and you had to
  // swipe to learn even that. So the whole shot fits, and nothing scrolls.
  ok(Math.abs(r.imgW - r.frameW) <= 2, `${w}px the whole build fits the frame (${r.imgW}px in ${r.frameW}px)`);
  ok(!r.scrollable, `${w}px the frame does not scroll sideways`);
  ok(r.hint, `${w}px the tap-to-open hint is shown`);
  // A fixed-width child inside a grid item with the default min-width:auto
  // stretched the whole section to 1182px once, and only body{overflow-x:hidden}
  // was hiding it. Keep checking even though nothing is oversized now.
  ok(r.overflow === 0, `${w}px the section does not push the page wide (${r.overflow}px)`);

  // Tapping the shot is now the ONLY gesture on it, and it must open the viewer.
  await p.click('#panel-0 .showcase-open');
  await p.waitForTimeout(450);
  ok(await p.evaluate(() => !!document.querySelector('dialog.lightbox')),
    `${w}px tapping the build opens the viewer`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  await p.close();
}

// ─────────────────────────────────────────── no dead screens on a phone
head('no dead screens on a phone');
{
  const p = await phone(390);
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await walk(p);
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    const items = [];
    document.querySelectorAll('body *').forEach((n) => {
      const st = getComputedStyle(n);
      if (st.visibility === 'hidden' || st.opacity === '0' || st.display === 'none') return;
      if (st.position === 'fixed') return;
      const t = n.getBoundingClientRect();
      if (t.height < 4) return;
      const hasText = [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (!hasText && !/^(IMG|CANVAS|VIDEO)$/.test(n.tagName)) return;
      items.push([t.top + window.scrollY, t.bottom + window.scrollY]);
    });
    /* A pinned section is empty in DOCUMENT space and busy on SCREEN: the
       spacer holds scroll distance open while the pinned panel stays in view
       cross-fading. Measuring geometry cannot see that, so scanning the spacer
       reports a void the reader never experiences. Windows inside one are
       skipped; everything outside is still swept, which is where the real
       "gap of nothing between sections" would show up. */
    const pinned = [...document.querySelectorAll('.pin-spacer')].map((n) => {
      const r = n.getBoundingClientRect();
      return [r.top + window.scrollY, r.bottom + window.scrollY];
    });
    const H = window.innerHeight;
    const dead = [];
    for (let y = 0; y < document.body.scrollHeight - H; y += Math.round(H / 2)) {
      const y2 = y + H;
      /* y IS the scroll position, so the test is whether the viewport at that
         scroll sits inside a pin, not whether the whole window does. A window
         starting just before a spacer ends is still showing the pinned panel;
         requiring full containment flagged exactly one of those. */
      if (pinned.some(([a, b]) => y >= a && y < b)) continue;
      let covered = 0;
      items.forEach(([a, b]) => { const s = Math.max(a, y), e = Math.min(b, y2); if (e > s) covered += e - s; });
      if (covered / H < 0.06) dead.push(y);
    }
    return { dead, docH: document.body.scrollHeight, process: Math.round(document.getElementById('process').getBoundingClientRect().height) };
  });

  // The pinned process scrub held one panel for 220% of the viewport height.
  // On a phone that panel fills the top half and the rest is empty, so it read
  // as roughly three screens of nothing between two sections. It is desktop
  // only now, and the section falls back to its stacked layout below 901px.
  ok(r.dead.length === 0,
    `every screen down the page carries content${r.dead.length ? ` — empty at y ${r.dead.join(', ')}` : ''}`);
  /* Was < 1600, which meant "not pinned at all". The scrub is on phones again,
     at half the desktop pin length, so the number that matters now is that the
     pin stays bounded: one viewport of section plus about 110% of pin. Well
     under the 2701px the desktop values produced here. */
  ok(r.process < 2100, `the process pin stays short on a phone (${r.process}px)`);
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
    /* Scoped to the work section. Page-wide it also catches the nav toggle,
       which legitimately carries aria-expanded whether or not JS ran and has
       nothing to do with the case bank. */
    tabAria: document.querySelectorAll('#work [role="tab"], #work [aria-selected], #work [aria-expanded]').length,
    steps: [...document.querySelectorAll('.process-panel')].filter((e) => getComputedStyle(e).visibility === 'visible').length,
    /* No orbit either. The constellation is a control that needs JS to be
       worth anything — scattered marks that open nothing would be a puzzle,
       not a section — so without it the logos are a plain readable row and
       every panel is already on the page. */
    orbit: document.querySelectorAll('.tabs.is-orbit, .orbit-hint, dialog.case-dialog').length,
    // Nothing claims to open a dialog that cannot open without JS.
    popup: document.querySelectorAll('#work [aria-haspopup]').length,
    positioned: [...document.querySelectorAll('.tab')].filter((t) => getComputedStyle(t).position === 'absolute').length,
  }));
  ok(r.hidden === 0, `JS off: nothing stuck hidden (${r.hidden})`);
  ok(r.panels === CLIENTS, `JS off: all build panels shown (${r.panels})`);
  ok(r.tabAria === 0, `JS off: no tab ARIA claiming a selection (${r.tabAria})`);
  ok(r.orbit === 0 && r.positioned === 0, `JS off: the marks are a plain row, not a dead constellation (${r.orbit}/${r.positioned})`);
  ok(r.popup === 0, `JS off: nothing offers to open a dialog that cannot open (${r.popup})`);
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
    /* The constellation still lays out — reduced motion asks for less
       movement, not a different page. What must be gone is every tween: no
       turning field, no drift, and therefore nothing left holding an inline
       transform from one. The field itself is the one that matters most; a
       rotation nobody asked for is the whole thing the setting is about. */
    orbit: document.querySelectorAll('.tabs.is-orbit').length,
    marks: document.querySelectorAll('.tabs.is-orbit .tab').length,
    spinning: (() => {
      const s = document.getElementById('tabList').style.transform;
      return s && s !== 'none' ? s : '';
    })(),
    drifting: [...document.querySelectorAll('.tab .chip-drift')]
      .filter((c) => c.style.transform && c.style.transform !== 'none').length,
  }));
  ok(r.hidden === 0, `reduced motion: nothing stuck hidden (${r.hidden})`);
  ok(r.labels.every((o) => Number(o) > 0.9), `reduced motion: scene labels present (${r.labels.join(', ')})`);
  ok(r.orbit === 1 && r.marks === CLIENTS, `reduced motion: the constellation still lays out (${r.marks} marks)`);
  ok(r.drifting === 0, `reduced motion: nothing is drifting (${r.drifting} moving)`);
  ok(r.spinning === '', `reduced motion: the field is not turning (${r.spinning || 'no transform'})`);
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
    const sels = ['.founder-name', '.founder-role', '.cred-chip', '.founder-bio p', '.founder-creds li',
      '.client-detail li', '.client-name', '.client-qa > div > dt', '.client-qa > div > dd', '.panel-quote blockquote', '.section-head h2',
      '.client-metrics dt', '.client-metrics dd', '.client-sector', '.showcase-label', '.client-shot span',
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

// ─────────────────────────────────────────── contact: book a call / send a brief
/* The contact panel carries two ways in. Booking is the default and stays the
   primary path; the brief is a sentence the visitor completes. These checks
   cover the endpoint's gates, the switch, the blanks, both halves of
   validation, real submissions, and the JS-off page.

   Nothing here posts a submission to the server under test. That server may be
   running with real mail keys from a developer's environment, and a test run
   must not send anyone an email. Instead the suite starts its own throwaway
   `next start` processes on spare ports, each with an environment spelled out
   in full (empty strings rather than absent variables, so no .env file can leak
   in):

     OK    fake keys, plus a preload that answers Resend locally and records the
           request body (tests/resend-stub.cjs): the "it was sent" path.
     NONE  no keys, outside production: the route answers `delivered: false`.
     PROD  no keys, VERCEL_ENV=production: the route answers 503.

   The route rate-limits per address (5 per 10 minutes) and takes the address
   from X-Forwarded-For. On Vercel that header is overwritten by the platform,
   so it can be trusted there; anywhere else a client can set it, and this suite
   does, to give every request that must succeed its own bucket. */
const RESEND_DIR = mkdtempSync(join(tmpdir(), 'resend-'));
const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.once('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
const startServer = async (env = {}) => {
  const port = await freePort();
  const log = join(RESEND_DIR, `${port}.log`);
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    stdio: 'ignore', detached: true,
    env: {
      ...process.env, PORT: String(port),
      RESEND_API_KEY: '', CONTACT_TO: '', CONTACT_CC: '', CONTACT_FROM: '', VERCEL_ENV: '',
      RESEND_STUB_LOG: log, NODE_OPTIONS: `--require ${resolve('tests/resend-stub.cjs')}`,
      ...env,
    },
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (await fetch(base + '/').then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    base,
    /** Every request body the stub has seen, parsed. */
    sent: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    stop: () => { try { process.kill(-child.pid, 'SIGTERM'); } catch {} },
  };
};
const KEYS = { RESEND_API_KEY: 'test-key', CONTACT_TO: 'primary@example.test' };
const [OK, NONE, PROD] = await Promise.all([startServer(KEYS), startServer(), startServer({ VERCEL_ENV: 'production' })]);

const RUN = Math.floor(Math.random() * 200) + 20;
let ipN = 0;
const freshIp = () => `203.0.${RUN}.${(++ipN % 250) + 1}`;
/* Route every call to /api/contact through a header that gives it its own
   address, optionally rewriting the body on the way. It still reaches the real
   handler. */
const viaOwnIp = (p, rewrite) => p.route('**/api/contact', (route) => {
  const req = route.request();
  const headers = { ...req.headers(), 'x-forwarded-for': freshIp() };
  route.continue(rewrite ? { headers, postData: rewrite(req.postDataJSON()) } : { headers });
});
const openBrief = async (p) => {
  await p.evaluate(() => document.querySelector('#contact').scrollIntoView({ behavior: 'instant' }));
  await p.waitForTimeout(400);
  /* A click that lands before hydration has nothing listening, which is the
     page's normal behaviour rather than a fault, so retry until it takes. */
  for (let i = 0; i < 4 && !(await p.locator('.brief').isVisible()); i++) {
    await p.click('#contact-tab-brief');
    await p.waitForTimeout(700);
  }
  await p.waitForSelector('.brief', { state: 'visible' });
};
const fillBrief = async (p, o = {}) => {
  const v = { sector: 'restaurant', goal: 'bookings', timing: 'quarter', name: 'Sameer Gul', email: 'sam@example.com', ...o };
  if (v.sector) await p.selectOption('#brief-sector', v.sector);
  if (v.goal) await p.selectOption('#brief-goal', v.goal);
  if (v.timing) await p.selectOption('#brief-timing', v.timing);
  if (v.name) await p.fill('#brief-name', v.name);
  if (v.email) await p.fill('#brief-email', v.email);
};
const postJson = (p, base, payload, headers = {}) => p.evaluate(async ({ base, payload, headers, ip }) => {
  const r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip, ...headers }, body: JSON.stringify(payload) });
  return { status: r.status, body: await r.json().catch(() => null) };
}, { base, payload, headers, ip: freshIp() });
const BRIEF = { name: 'Test', email: 't@example.com', sector: 'restaurant', goal: 'bookings', timing: 'asap' };

head('contact — endpoint gates');
{
  const p = await desktop();
  await p.goto(OK.base + '/', { waitUntil: 'load' }); // fetch needs a real origin
  const good = await postJson(p, OK.base, BRIEF);
  ok(good.status === 200 && good.body?.ok && good.body.delivered === true, `a same-origin JSON brief is accepted and delivered (${good.status})`);
  const bad = await postJson(p, OK.base, { name: '', email: 'nope', sector: 'restaurant' });
  ok(bad.status === 400 && !!bad.body?.error, `an incomplete brief is rejected (${bad.status}: ${bad.body?.error})`);

  const before = OK.sent().length;
  /* A cross-site <form enctype="text/plain"> or a no-cors fetch arrives as
     text/plain, and the browser labels it cross-site. */
  const plain = await p.evaluate(async ({ base, body }) => {
    const r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });
    return r.status;
  }, { base: OK.base, body: JSON.stringify(BRIEF) });
  ok(plain === 403, `a text/plain POST is refused (${plain})`);
  /* Sec-Fetch-* is a forbidden header name in page scripts, so the browser
     would overwrite it. Sent from outside a page to prove the server's side. */
  const crossRaw = await fetch(OK.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site', 'X-Forwarded-For': freshIp() }, body: JSON.stringify(BRIEF) });
  ok(crossRaw.status === 403, `a JSON POST marked sec-fetch-site: cross-site is refused (${crossRaw.status})`);
  const sameSite = await fetch(OK.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-site', 'X-Forwarded-For': freshIp() }, body: JSON.stringify(BRIEF) });
  ok(sameSite.status === 403, `sec-fetch-site: same-site is refused too (${sameSite.status})`);
  const noHeader = await fetch(OK.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': freshIp() }, body: JSON.stringify(BRIEF) });
  ok(noHeader.status === 200, `a non-browser client with no sec-fetch-site header still works (${noHeader.status})`);
  ok(OK.sent().length === before + 1, `none of the refused requests reached the mail provider (${OK.sent().length - before} sent)`);

  for (const [label, raw] of [['null', 'null'], ['an array', '[1,2]'], ['a number', '7'], ['a string', '"hi"'], ['malformed JSON', '{nope']]) {
    const r = await fetch(OK.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': freshIp() }, body: raw });
    ok(r.status === 400, `a body of ${label} is a 400, not a 500 (${r.status})`);
  }

  // invisible and bidi characters never reach the email
  const before2 = OK.sent().length;
  const sneaky = await postJson(p, OK.base, { ...BRIEF, name: 'Ann\u202Ee\u200Bve\u2066', note: 'line one\u202E\u200B\nline two\u0000\u2028', sector: 'other', sector_other: 'ba\u200Dk\u202Eery' });
  const mail = OK.sent()[before2];
  ok(sneaky.status === 200 && mail && !/[\p{Cf}\p{Cc}\u2028\u2029]/u.test(mail.text.replace(/\n/g, '')) && /Ann e ve/.test(mail.text) && /line one\nline two/.test(mail.text),
    `bidi, zero-width and control characters are stripped from what is emailed (${JSON.stringify(mail?.text)})`);

  const cases = [
    ['unknown sector id', { ...BRIEF, sector: 'astronaut' }],
    ['unknown goal id', { ...BRIEF, goal: '<script>' }],
    ['unknown timing id', { ...BRIEF, timing: 'yesterday' }],
    ['a label sent in place of an id', { ...BRIEF, sector: 'garage or tyre shop' }],
    ['other with no words', { ...BRIEF, sector: 'other' }],
    ['other with one character', { ...BRIEF, goal: 'other', goal_other: 'a' }],
    ['other with only invisible characters', { ...BRIEF, sector: 'other', sector_other: '\n\t\u0000\u200B ' }],
    ['missing timing', { ...BRIEF, timing: undefined }],
    ['bad email', { ...BRIEF, email: 'nope' }],
    ['non-string fields', { ...BRIEF, name: { a: 1 }, sector: ['restaurant'] }],
    ['the retired name, email, message shape', { name: 'Test', email: 't@example.com', message: 'A test enquiry with enough length.' }],
  ];
  for (const [label, payload] of cases) {
    const r = await postJson(p, OK.base, payload);
    ok(r.status === 400 && /^Please include /.test(r.body?.error || ''), `rejected: ${label} (${r.status} ${r.body?.error})`);
  }
  const other = await postJson(p, OK.base, { ...BRIEF, sector: 'other', sector_other: 'bakery', goal: 'other', goal_other: 'tidy the stock sheets', note: 'x'.repeat(5000) });
  ok(other.status === 200 && OK.sent().at(-1).text.length < 1700, `"something else" with its own words, and an oversized note, is accepted and capped (${other.status})`);
  await p.close();

  // no provider configured
  const q = await desktop();
  await q.goto(NONE.base + '/', { waitUntil: 'load' });
  const none = await postJson(q, NONE.base, BRIEF);
  ok(none.status === 200 && none.body.delivered === false, `no mail provider outside production: ok but delivered false (${none.status} ${none.body?.delivered})`);
  await q.close();
  const r = await postRaw(PROD);
  ok(r.status === 503 && /email us directly/.test(r.body?.error || ''), `no mail provider in production: 503 with the email-us message (${r.status} ${r.body?.error})`);
}
async function postRaw(srv) {
  const r = await fetch(srv.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': freshIp() }, body: JSON.stringify(BRIEF) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

head('contact — switch between booking and brief');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  const d = await p.evaluate(() => {
    const t = (id) => document.getElementById(id);
    const vis = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
    return {
      tabs: [...document.querySelectorAll('.cta-switch [role=tab]')].map((e) => `${e.textContent}:${e.getAttribute('aria-selected')}:${e.tabIndex}`).join(' '),
      list: document.querySelector('.cta-switch').getAttribute('role'),
      listLabel: document.querySelector('.cta-switch').getAttribute('aria-label'),
      book: vis(t('contact-panel-book')), brief: vis(t('contact-panel-brief')),
      widget: vis(document.querySelector('.calendly-inline-widget')),
      formMounted: document.querySelectorAll('.brief').length,
      controls: ['book', 'brief'].map((k) => `${t('contact-tab-' + k).getAttribute('aria-controls')}>${t('contact-panel-' + k).getAttribute('aria-labelledby')}`).join(' '),
    };
  });
  ok(d.tabs === 'Book a call:true:0 Send a brief:false:-1', `default: booking is selected, roving tabindex set (${d.tabs})`);
  ok(d.list === 'tablist' && !!d.listLabel, `the switch is a labelled tablist ("${d.listLabel}")`);
  ok(d.book && d.widget && !d.brief, 'default: the Calendly widget shows and the brief does not');
  ok(d.formMounted === 0, `the form is not mounted until it is asked for (${d.formMounted})`);
  ok(d.controls === 'contact-panel-book>contact-tab-book contact-panel-brief>contact-tab-brief', `tabs and panels point at each other (${d.controls})`);
  const homeH = await p.evaluate(() => document.documentElement.scrollHeight);

  /* Tag the real iframe node before leaving it. Finding "an element" afterwards
     proves nothing, since the wrapper div is always there; the same tagged
     iframe still being in the document proves the widget was not rebuilt. */
  const framed = await p.waitForSelector('.calendly-inline-widget iframe', { timeout: 20000 }).then(() => true, () => false);
  ok(framed, 'the Calendly iframe is in the page');
  await p.evaluate(() => { document.querySelector('.calendly-inline-widget iframe').dataset.probe = 'same-node'; });

  await p.evaluate(() => document.querySelector('#contact-tab-book').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(300);
  const topBefore = await p.evaluate(() => Math.round(document.querySelector('.cta-switch').getBoundingClientRect().top));
  await p.click('#contact-tab-brief');
  await p.waitForSelector('.brief', { state: 'visible' });
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => ({
    sel: document.getElementById('contact-tab-brief').getAttribute('aria-selected'),
    book: document.getElementById('contact-panel-book').hidden,
    brief: document.getElementById('contact-panel-brief').hidden,
    top: Math.round(document.querySelector('.cta-switch').getBoundingClientRect().top),
    blanks: document.querySelectorAll('.brief .blank').length,
  }));
  ok(s.sel === 'true' && s.book && !s.brief, 'clicking "Send a brief" shows the form and hides booking');
  ok(s.blanks === 5, `the sentence has five blanks (${s.blanks})`);
  ok(Math.abs(s.top - topBefore) <= 2, `the switch does not move in the viewport when the panel changes (${topBefore} to ${s.top})`);

  // keyboard: arrows, Home, End, with focus following selection
  await p.focus('#contact-tab-brief');
  const seq = [];
  for (const k of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowDown']) {
    await p.keyboard.press(k);
    seq.push(await p.evaluate(() => `${document.activeElement.id.replace('contact-tab-', '')}:${document.activeElement.getAttribute('aria-selected')}`));
  }
  ok(seq.join(' ') === 'book:true brief:true book:true brief:true book:true', `arrow keys, Home and End move and select (${seq.join(' ')})`);
  await p.keyboard.press('End');
  await p.keyboard.press('Tab');
  const afterTab = await p.evaluate(() => document.activeElement.id);
  ok(afterTab === 'brief-sector', `Tab from the switch lands on the first blank (${afterTab})`);
  await p.click('#contact-tab-book');
  await p.waitForTimeout(500);
  const back = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, same: document.querySelector('.calendly-inline-widget iframe')?.dataset.probe === 'same-node' }));
  ok(Math.abs(back.h - homeH) <= 2, `switching back restores the page height (${homeH} to ${back.h})`);
  ok(back.same, 'switching back finds the very same Calendly iframe node, not a rebuilt one');
  await p.close();

  /* The page is last above the footer, so on a tall screen at the very bottom
     the shorter panel shrinks the document and the browser clamps the scroll
     position, which moves the switch down. No scrolling can undo that (there is
     nowhere further to scroll), so what is asserted is the part that matters:
     the switch is still in view and still the focused control afterwards. */
  const tall = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
  await tall.goto(BASE + '/', { waitUntil: 'load' });
  await settle(tall, 2500);
  await tall.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await tall.waitForTimeout(400);
  await tall.click('#contact-tab-brief');
  await tall.waitForSelector('.brief', { state: 'visible' });
  await tall.waitForTimeout(500);
  const clamp = await tall.evaluate(() => {
    const r = document.querySelector('.cta-switch').getBoundingClientRect();
    return { inView: r.top >= 0 && r.bottom <= innerHeight, atBottom: Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)) < 2 };
  });
  ok(clamp.inView && clamp.atBottom, `at the page bottom on a tall screen the shorter panel clamps the scroll and the switch stays in view (${JSON.stringify(clamp)})`);
  await tall.close();
}

head('contact — the blanks');
{
  const p = await desktop();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p);
  await openBrief(p);
  const labels = await p.evaluate(() => [...document.querySelectorAll('.brief select, .brief input:not(.brief-trap), .brief textarea')]
    .map((e) => `${e.id}=${(e.labels?.[0]?.textContent || '').trim()}`));
  ok(labels.length === 6 && labels.every((l) => !l.endsWith('=')), `every blank has a label (${labels.join(' | ')})`);
  const trap = await p.evaluate(() => { const t = document.querySelector('.brief-trap'); return t.tabIndex === -1 && t.getAttribute('aria-hidden') === 'true'; });
  ok(trap, 'the honeypot is out of the tab order and hidden from assistive tech');

  const w = (id) => p.evaluate((i) => Math.round(document.getElementById(i).closest('.blank').getBoundingClientRect().width), id);
  const w0 = await w('brief-name');
  await p.fill('#brief-name', 'Alexandra Montgomery-Ellison');
  const w1 = await w('brief-name');
  await p.fill('#brief-name', 'Al');
  const w2 = await w('brief-name');
  ok(w1 > w0 + 40 && w2 < w1 - 40, `a text blank grows and shrinks with what is typed (${w0} to ${w1} to ${w2}px)`);
  await p.selectOption('#brief-goal', 'bookings');
  const g0 = await w('brief-goal');
  await p.selectOption('#brief-goal', 'internal');
  const g1 = await w('brief-goal');
  ok(g1 > g0 + 10, `a list blank is as wide as the option in it (${g0} to ${g1}px)`);

  // the underline marks where you are
  await p.focus('#brief-email');
  await p.waitForTimeout(450);
  const ul = await p.evaluate(() => {
    const on = getComputedStyle(document.getElementById('brief-email').closest('.blank')).backgroundSize;
    const off = getComputedStyle(document.getElementById('brief-name').closest('.blank')).backgroundSize;
    return { on, off };
  });
  ok(/2\.5px/.test(ul.on) && !/2\.5px/.test(ul.off), `the focused blank's rule thickens (${ul.on} vs ${ul.off})`);

  /* Focus has to be unmistakable in every state, including after a failed
     submit when the blank is also marked invalid: a ring around the blank, not
     just the rule. Measured as a real outline of at least 2px. */
  await p.evaluate(() => document.getElementById('brief-email').blur());
  await p.fill('#brief-email', '');
  await p.click('.brief-send');
  await p.waitForTimeout(300);
  await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Tab');
  const ring = await p.evaluate(() => {
    const el = document.activeElement.closest('.blank');
    const cs = getComputedStyle(el);
    return { id: document.activeElement.id, invalid: el.hasAttribute('data-invalid'), w: parseFloat(cs.outlineWidth), style: cs.outlineStyle, size: cs.backgroundSize };
  });
  ok(ring.invalid && ring.w >= 2 && ring.style === 'solid' && /2\.5px/.test(ring.size), `an invalid blank that has focus shows a ring and the thick rule (${JSON.stringify(ring)})`);
  const noteRing = await p.evaluate(() => { const t = document.querySelector('.brief-note textarea'); t.focus(); return parseFloat(getComputedStyle(t).outlineWidth); });
  ok(noteRing >= 2, `the note shows a focus ring too (${noteRing}px)`);

  // "something else" becomes a typed blank, and the way back works by keyboard
  await p.selectOption('#brief-sector', 'other');
  const o1 = await p.evaluate(() => ({ active: document.activeElement.id, select: !!document.getElementById('brief-sector'), back: !!document.querySelector('.blank-back') }));
  ok(o1.active === 'brief-sector-text' && !o1.select && o1.back, `"something else" turns the blank into a text field and focuses it (${o1.active})`);
  await p.keyboard.type('bakery');
  await p.keyboard.press('Tab');
  await p.keyboard.press('Enter');
  const o2 = await p.evaluate(() => ({ active: document.activeElement.id, value: document.getElementById('brief-sector')?.value }));
  ok(o2.active === 'brief-sector' && o2.value === '', `the back button returns to the list, empty, with focus on it (${o2.active})`);

  /* The note re-fits when its box changes width without the words changing, in
     both directions: a stale height clips the text when the box narrows and
     leaves a gap when it widens. Judged against the height it would have if it
     were measured from scratch. */
  await p.setViewportSize({ width: 800, height: 900 });
  await p.fill('.brief-note textarea', 'a fairly long note that will wrap onto more lines when the box gets narrower than it is now '.repeat(2));
  const drift = () => p.evaluate(() => {
    const t = document.querySelector('.brief-note textarea');
    const shown = t.offsetHeight;
    const keep = t.style.height;
    t.style.height = 'auto';
    const natural = t.scrollHeight + (t.offsetHeight - t.clientHeight);
    t.style.height = keep;
    return { shown, natural: Math.round(natural) };
  });
  const wide = await drift();
  await p.setViewportSize({ width: 420, height: 900 });
  await p.waitForTimeout(400);
  const narrow = await drift();
  await p.setViewportSize({ width: 800, height: 900 });
  await p.waitForTimeout(400);
  const wide2 = await drift();
  ok(narrow.shown !== wide.shown && Math.abs(narrow.shown - narrow.natural) <= 2 && Math.abs(wide2.shown - wide2.natural) <= 2,
    `the note re-fits when its width changes, in both directions (${wide.shown}, ${narrow.shown} vs ${narrow.natural}, ${wide2.shown} vs ${wide2.natural})`);
  await p.close();
}

head('contact — validation and submission');
{
  const p = await desktop();
  const posts = [];
  p.on('request', (r) => { if (r.url().endsWith('/api/contact')) posts.push(r.postData()); });
  await p.goto(OK.base + '/', { waitUntil: 'load' });
  await settle(p);
  await viaOwnIp(p);
  await openBrief(p);

  await p.click('.brief-send');
  await p.waitForTimeout(250);
  const e1 = await p.evaluate(() => ({
    alert: document.querySelector('.brief-error').textContent,
    focus: document.activeElement.id,
    invalid: document.querySelectorAll('.brief [aria-invalid="true"]').length,
  }));
  ok(posts.length === 0, `an empty brief is stopped in the browser, no request made (${posts.length})`);
  ok(/^Please include the kind of business you run, what you want to change, when you would like it done, your name and a valid email address\.$/.test(e1.alert), `the error names every missing blank (${e1.alert})`);
  ok(e1.focus === 'brief-sector' && e1.invalid === 5, `focus goes to the first missing blank and all five are marked invalid (${e1.focus}, ${e1.invalid})`);

  await fillBrief(p, { email: 'not-an-email' });
  /* The same error twice in a row has to be announced twice, which a live
     region only does for a new node. */
  await p.evaluate(() => { window.__alertNode = document.querySelector('.brief-error'); });
  await p.click('.brief-send');
  await p.waitForTimeout(250);
  const e2 = await p.evaluate(() => ({ alert: document.querySelector('.brief-error').textContent, focus: document.activeElement.id }));
  ok(e2.alert === 'Please include a valid email address.' && e2.focus === 'brief-email' && posts.length === 0, `a bad email is named and focused (${e2.alert})`);
  await p.click('.brief-send');
  await p.evaluate(() => { window.__alertNode = document.querySelector('.brief-error'); });
  await p.click('.brief-send');
  await p.waitForTimeout(250);
  const renewed = await p.evaluate(() => window.__alertNode !== document.querySelector('.brief-error') && document.querySelector('.brief-error').isConnected);
  ok(renewed, 'a repeated identical error arrives as a fresh live region');

  // the server's own refusal reaches the visitor: strip the email in flight
  await p.unroute('**/api/contact');
  await viaOwnIp(p, (b) => JSON.stringify({ ...b, email: '' }));
  await p.fill('#brief-email', 'sam@example.com');
  await p.focus('.brief-send');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => /valid email/.test(document.querySelector('.brief-error').textContent) && document.querySelector('.brief-send').getAttribute('aria-disabled') !== 'true');
  const e3 = await p.evaluate(() => ({
    alert: document.querySelector('.brief-error').textContent, still: !!document.querySelector('.brief'), done: !!document.querySelector('.brief-done'),
    focus: document.activeElement.className, tag: document.activeElement.tagName,
  }));
  ok(posts.length === 1 && e3.still && !e3.done && e3.alert === 'Please include a valid email address.', `a server refusal is shown and the form stays put (${e3.alert})`);
  ok(e3.tag !== 'BODY' && /brief-send/.test(e3.focus), `focus is still on the send button after a server error, not dropped to the page (${e3.tag}.${e3.focus})`);

  // the real thing
  await p.unroute('**/api/contact');
  await viaOwnIp(p);
  await p.fill('.brief-note textarea', 'About forty covers on a Friday.\nThe phone never stops.');
  const mailsBefore = OK.sent().length;
  const resP = p.waitForResponse((r) => r.url().endsWith('/api/contact'));
  await p.click('.brief-send');
  const res = await resP;
  const body = await res.json();
  ok(res.status() === 200 && body.ok === true && body.delivered === true, `a complete brief is accepted and delivered (${res.status()} ${JSON.stringify(body)})`);
  const sent = JSON.parse(posts[posts.length - 1]);
  ok(sent.sector === 'restaurant' && sent.goal === 'bookings' && sent.timing === 'quarter' && !('message' in sent) && !('sector_label' in sent),
    `the browser sends ids, not words (${sent.sector}, ${sent.goal}, ${sent.timing})`);
  const mail = OK.sent()[mailsBefore];
  ok(mail?.text.includes('Business: restaurant\nWants to: automate bookings\nTiming: this quarter') && mail.text.includes('The phone never stops.') && mail.reply_to === 'sam@example.com',
    `the email is written by the server from the ids (${JSON.stringify(mail?.text.split('\n').slice(2, 6))})`);
  await p.waitForSelector('.brief-done');
  const done = await p.evaluate(() => ({
    text: document.querySelector('.brief-done').innerText.replace(/\s+/g, ' ').trim(),
    focus: document.activeElement.classList.contains('brief-done'),
    role: document.querySelector('.brief-done').getAttribute('role'),
  }));
  ok(done.text.startsWith('Thanks, Sameer. We’ll reply to sam@example.com about automating bookings for your restaurant.'), `the brief is read back as a sentence ("${done.text}")`);
  ok(done.focus && done.role === 'status', 'the confirmation takes focus and is a live status');
  ok(!/[—–]/.test(done.text), 'no em or en dashes in the confirmation');
  await p.click('.brief-done .brief-alt');
  const reset = await p.evaluate(() => ({ form: !!document.querySelector('.brief'), v: document.getElementById('brief-name').value + document.getElementById('brief-sector').value, focus: document.activeElement.id }));
  ok(reset.form && reset.v === '', 'Send another brief returns a clean form');
  ok(reset.focus === 'brief-sector', `and puts focus on the first blank, not on the page (${reset.focus})`);
  // and the way back to booking from inside the form
  await p.click('.brief-alt');
  const toBook = await p.evaluate(() => ({ sel: document.getElementById('contact-tab-book').getAttribute('aria-selected'), focus: document.activeElement.id }));
  ok(toBook.sel === 'true' && toBook.focus === 'contact-tab-book', 'Or book a call instead switches back and focuses the tab');
  await p.close();
}

head('contact — a brief the server could not send is not thanked');
{
  const p = await desktop();
  await p.goto(NONE.base + '/', { waitUntil: 'load' });
  await settle(p, 2000);
  await viaOwnIp(p);
  await openBrief(p);
  await fillBrief(p);
  await p.fill('.brief-note textarea', 'Forty covers on a Friday.');
  await p.click('.brief-send');
  await p.waitForSelector('.brief-done');
  const u = await p.evaluate(() => ({
    text: document.querySelector('.brief-done').innerText.replace(/\s+/g, ' ').trim(),
    href: [...document.querySelectorAll('.brief-done a')].map((a) => a.getAttribute('href')),
    focus: document.activeElement.classList.contains('brief-done'),
  }));
  ok(/^That didn’t go through\./.test(u.text) && !/Thanks|We’ll reply/.test(u.text), `delivered:false shows "that didn't go through", not a thank-you ("${u.text.slice(0, 60)}")`);
  ok(u.href.length === 2 && u.href.every((h) => h.startsWith('mailto:info@sk-intelligence.co?subject=')) && decodeURIComponent(u.href[0]).includes('We run a restaurant and we want to automate bookings, this quarter.') && decodeURIComponent(u.href[0]).includes('Forty covers on a Friday.'),
    'it offers a mailto with the brief already written into it');
  ok(u.focus && !/[—–]/.test(u.text), 'the notice takes focus and has no em or en dashes');
  await p.click('.brief-done .brief-alt');
  const back = await p.evaluate(() => ({ form: !!document.querySelector('.brief'), name: document.getElementById('brief-name').value, sector: document.getElementById('brief-sector').value, focus: document.activeElement.id }));
  ok(back.form && back.name === 'Sameer Gul' && back.sector === 'restaurant' && back.focus === 'brief-name', `Back to the brief keeps every answer and focuses the name (${JSON.stringify(back)})`);
  await p.close();
}

head('contact — no sideways scroll with the form shown');
for (const w of [...PHONES, 768, 1440]) {
  const p = w < 900 ? await phone(w) : await browser.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(OK.base + '/', { waitUntil: 'load' });
  await settle(p, 2000);
  await viaOwnIp(p);
  await openBrief(p);
  const measure = () => p.evaluate(() => ({
    h: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    out: [...document.querySelectorAll('.brief-card *')].filter((el) => {
      const c = el.closest('.brief-card').getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.width === 0 || el.classList.contains('visually-hidden') || el.classList.contains('brief-trap')) return false;
      return r.right > c.right + 1 || r.left < c.left - 1;
    }).map((el) => `${el.tagName.toLowerCase()}.${el.className || el.id}`).slice(0, 4),
  }));
  const idle = await measure();
  await fillBrief(p, { sector: 'garage', goal: 'internal', timing: 'exploring', name: 'Bartholomew Featherstonehaugh', email: 'bartholomew.featherstonehaugh@a-very-long-company-name.example.co.uk' });
  await p.fill('.brief-note textarea', 'A long note that goes on for rather a lot longer than one line so the note has to grow, and keep growing, and still fit.');
  const full = await measure();
  await p.selectOption('#brief-sector', 'other');
  await p.keyboard.type('independent family run vehicle recovery and storage');
  await p.selectOption('#brief-goal', 'other');
  await p.keyboard.type('replace three spreadsheets with one thing');
  const other = await measure();
  const bad = [idle, full, other].map((m, i) => ({ ...m, s: ['idle', 'filled', 'other'][i] })).filter((m) => m.h > 0 || m.out.length);
  ok(bad.length === 0, `${w}px form idle, filled and in "something else" mode stays inside the card${bad.length ? ' — ' + bad.map((b) => `${b.s} h${b.h} ${b.out.join(',')}`).join('; ') : ''}`);
  await p.click('.brief-send');
  await p.waitForSelector('.brief-done');
  const sent = await measure();
  ok(sent.h <= 0 && sent.out.length === 0, `${w}px confirmation with a long address fits (${sent.h} ${sent.out.join(',')})`);
  await p.close();
}

head('contact — tap targets and contrast with the form shown (phone)');
{
  const p = await phone(390);
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p, 2000);
  await openBrief(p);
  await p.selectOption('#brief-sector', 'other');
  const small = await p.evaluate(() =>
    [...document.querySelectorAll('.cta-switch [role=tab], .brief button, .brief .blank')]
      .filter((el) => el.offsetParent && el.getClientRects().length)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44 || r.width < 44)
      .map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`));
  ok(small.length === 0, `tabs, buttons and blanks are all at least 44px ${small.length ? '— ' + small.join(', ') : ''}`);
  const lows = await p.evaluate(() => {
    const lum = (c) => { const s = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
    /* Text on the card sits over a dark gradient with a light translucent fill;
       judged against the lightest backdrop it ever has, not the darkest. */
    const bg = [64, 56, 47];
    const parse = (c) => c.match(/[\d.]+/g).map(Number).slice(0, 3);
    const blend = (c) => { const m = c.match(/[\d.]+/g).map(Number); const a = m[3] ?? 1; return [0, 1, 2].map((i) => m[i] * a + bg[i] * (1 - a)); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const probe = (sel, pseudo) => {
      const el = document.querySelector(sel);
      const c = getComputedStyle(el, pseudo).color;
      /* A filled button is judged against its own fill, not the card. */
      const fill = getComputedStyle(el).backgroundColor;
      const ground = /^rgb\(/.test(fill) ? parse(fill) : bg;
      return { sel: sel + (pseudo || ''), r: +ratio(blend(c), ground).toFixed(2), px: parseFloat(getComputedStyle(el).fontSize) };
    };
    const dim = (() => { document.getElementById('brief-name').focus(); return probe('.brief-line'); })();
    /* The focus ring is a non-text indicator: 3:1 against the panel (1.4.11). */
    const ringC = parse(getComputedStyle(document.documentElement).getPropertyValue('--band-accent').trim().replace('#', 'rgb(').replace(/^rgb\((..)(..)(..)$/, (_, a, b, c) => `rgb(${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(c, 16)})`));
    const ring = { sel: 'focus ring', r: +ratio(ringC, bg).toFixed(2), px: 0 };
    return [probe('.brief-note textarea', '::placeholder'), probe('.blank input', '::placeholder'), probe('.brief-send'), probe('.brief-alt'), dim, ring];
  });
  const weak = lows.filter((l) => l.r < (l.sel === 'focus ring' ? 3 : 4.5));
  ok(weak.length === 0, `placeholders, the dimmed sentence and the buttons clear 4.5:1, the focus ring 3:1 (${lows.map((l) => `${l.sel} ${l.r}`).join(', ')})`);
  await p.close();
}

head('contact — house style with the form shown');
{
  const p = await desktop();
  await p.goto(OK.base + '/', { waitUntil: 'load' });
  await settle(p, 1500);
  await viaOwnIp(p);
  await openBrief(p);
  const texts = [];
  texts.push(await p.evaluate(() => document.querySelector('.cta-panels').innerText));
  texts.push((await p.evaluate(() => [...document.querySelectorAll('.brief option')].map((o) => o.textContent))).join(' | '));
  await fillBrief(p);
  await p.click('.brief-send');
  await p.waitForSelector('.brief-done');
  texts.push(await p.evaluate(() => document.querySelector('.cta-panels').innerText));
  const all = texts.join('\n');
  ok(!/[—–]/.test(all), 'no em or en dashes in the switch, the sentence, the options or the confirmation');
  const bannedDenials = [/\bwe(?:'|’)?re not\b/i, /\bwe don(?:'|’)?t\b/i, /\bwe do not\b/i, /\bwe won(?:'|’)?t\b/i, /\bnot just\b/i, /\bnot a\b/i, /\bno (?:account manager|middleman|hand[- ]?off)\b/i];
  const hits = bannedDenials.filter((re) => re.test(all)).map(String);
  ok(hits.length === 0, `the form's copy says what it does rather than what it isn't${hits.length ? ' — ' + hits.join(' ') : ''}`);
  await p.close();
}

head('contact — reduced motion');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await settle(p, 1500);
  await openBrief(p);
  const m = await p.evaluate(() => ({
    pill: getComputedStyle(document.querySelector('.cta-switch'), '::before').transitionDuration,
    card: getComputedStyle(document.querySelector('.brief-card')).animationName,
    blank: getComputedStyle(document.querySelector('.brief .blank')).transitionDuration,
  }));
  ok(m.pill === '0s' && m.card === 'none' && m.blank === '0s', `no switch, entrance or underline motion under prefers-reduced-motion (${m.pill} ${m.card} ${m.blank})`);
  await ctx.close();
}

head('contact — JS off');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const shown = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
    return {
      switchShown: shown(document.querySelector('.cta-switch')),
      form: document.querySelectorAll('.brief, .brief-card form, .cta-panels select').length,
      fallback: shown(document.querySelector('.cta-panels .booking-fallback')),
      calendlyLink: !!document.querySelector('.cta-panels .booking-fallback a[href*="calendly.com"]'),
      mailto: shown(document.querySelector('.cta-contact a[href^="mailto:"]')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  ok(!r.switchShown, 'JS off: the switch is not shown, so there is no dead control');
  ok(r.form === 0, `JS off: no form is rendered (${r.form})`);
  ok(r.fallback && r.calendlyLink && r.mailto, 'JS off: the booking link and the mailto line are both there');
  ok(r.overflow <= 0, `JS off: no sideways scroll (${r.overflow})`);
  await ctx.close();
}

head('contact — blocked booking script still falls back inside the panel');
{
  const p = await desktop();
  await p.route('https://assets.calendly.com/**', (route) => route.abort());
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.waitForSelector('#contact .booking-fallback', { timeout: 15000 });
  const t = await p.evaluate(() => ({ text: document.querySelector('.booking-fallback').textContent, inBook: !!document.querySelector('#contact-panel-book .booking-fallback'), switchOk: !!document.querySelector('.cta-switch') }));
  ok(t.inBook && t.switchOk && /did not load/.test(t.text), 'script blocked: the fallback message shows in the booking panel and the switch is still there');
  await openBrief(p);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.brief')).display !== 'none'), 'script blocked: the brief is still reachable');
  await p.close();
}

head('contact — CONTACT_TO, CONTACT_CC and reply_to reach the mail provider');
{
  /* Each case is its own server, because the variables are read per request but
     set per process. CONTACT_CC is always set explicitly, to the empty string
     for "unset", so a developer's .env file cannot decide the outcome. */
  const withCc = async (cc) => {
    const srv = await startServer({ ...KEYS, CONTACT_CC: cc });
    try {
      const r = await fetch(srv.base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': freshIp() },
        body: JSON.stringify({ ...BRIEF, email: 'visitor@example.test' }) });
      return { status: r.status, body: srv.sent()[0] ?? null };
    } finally { srv.stop(); }
  };
  const a = await withCc(' one@example.test, ,two@example.test ,not-an-address,@x');
  ok(a.status === 200 && a.body?.to === 'primary@example.test', `CONTACT_TO stays the single primary recipient (${a.body?.to})`);
  ok(JSON.stringify(a.body?.cc) === JSON.stringify(['one@example.test', 'two@example.test']), `CONTACT_CC is trimmed, empties and invalid entries dropped (${JSON.stringify(a.body?.cc)})`);
  ok(a.body?.reply_to === 'visitor@example.test', `reply_to stays the visitor (${a.body?.reply_to})`);
  const b = await withCc('');
  ok(b.status === 200 && b.body && !('cc' in b.body), 'no cc is sent when CONTACT_CC is unset');
  const c = await withCc(' , ,');
  ok(c.status === 200 && c.body && !('cc' in c.body), 'no cc is sent when CONTACT_CC holds only empty entries');
}
for (const s of [OK, NONE, PROD]) s.stop();

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
  await p.evaluate(() => document.querySelector('#founders').scrollIntoView({ block: 'center', behavior: 'instant' }));
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
      /* Client testimonials are verbatim and are not ours to rewrite.

         The manifesto is exempt for a different reason: it is the one denial on
         the site that is a decision rather than a slip. It was rewritten to
         "AI is the tool / Your time is the point" by the same commit that added
         this check, and Sameer put the original back after seeing both live.
         Scoped to that one section on purpose, so the habit this caught seven
         times still cannot come back anywhere else. */
      if (n.parentElement?.closest('.panel-quote,.client-quote,.manifesto')) continue;
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
