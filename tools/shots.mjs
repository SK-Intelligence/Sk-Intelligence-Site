/**
 * Case-bank screenshot capture.
 *
 *   npm run shots            everything
 *   npm run shots -- ossett  one target
 *
 * Three kinds of source:
 *
 *   1. A Star Customs is captured from the live site. Sameer rates that build
 *      and wants it shown as it actually is.
 *   2. The other three clients are captured from the mockups in tools/mockups/.
 *      Their live sites are basic, so those are restyled. See each file's
 *      header for what is real content and what is presentation.
 *   3. Provena AI is captured from itself, in a different repo on this machine.
 *      Nothing is restyled: it is our product, so the shots are the real
 *      dashboard running its demo data. The landing screen comes from the
 *      static export; the interior screens need the backend up, because they
 *      fetch rather than bake. See captureApp and captureStatic below.
 *
 * Output is PNG into public/work/. It stays PNG deliberately: there is no
 * cwebp or magick on this machine, and next/image converts and resizes at
 * request time anyway, so an intermediate conversion would buy nothing.
 *
 * Nothing in tools/ ships. It exists so every asset in the case bank can be
 * regenerated from source rather than being a binary nobody can reproduce.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public/work');
const MOCKUPS = join(HERE, 'mockups');

/* Provena AI is our own product and its source is a separate repo, so the path
   is configurable rather than assumed. The default is where it sits on
   Sameer's machine; PROVENA_OUT overrides it anywhere else. */
const PROVENA_OUT = process.env.PROVENA_OUT
  ?? resolve(HERE, '../../../qub_projects/Provena-AI/dashboard-next/out');

/* Where that same app is listening when it is running with its backend. The
   interior screens can only be captured there — see captureApp below. */
const PROVENA_BASE = process.env.PROVENA_BASE ?? 'http://127.0.0.1:8000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const wanted = (name) => only.length === 0 || only.some((o) => name.startsWith(o));

let failed = 0;
const done = [];
const log = (m) => console.log(`  ${m}`);
const bad = (m) => { failed++; console.log(` FAIL  ${m}`); };

/**
 * A silent fallback to a system font still produces a plausible-looking
 * screenshot, which is the worst possible failure here: it looks fine in the
 * terminal and wrong on the site. So assert the face actually loaded.
 */
async function assertFonts(page, families, label) {
  const missing = await page.evaluate(async (fams) => {
    // Capped: page.evaluate has no default timeout and is not governed by
    // setDefaultTimeout, so an unresolved fonts.ready hangs the whole run
    // rather than failing it. Same class as the two hangs already fixed below.
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]);
    // The weight matters: fonts.check defaults to 400, and these families are
    // requested at 500/700 only, so a bare `16px "Family"` reports a miss for a
    // face that loaded perfectly well. Pass if any requested weight resolves.
    return fams.filter((f) => ![400, 500, 600, 700]
      .some((w) => document.fonts.check(`${w} 16px "${f}"`)));
  }, families);
  if (missing.length) bad(`${label}: web font did not load — ${missing.join(', ')}`);
  else log(`fonts ok (${families.join(', ')})`);
  return missing.length === 0;
}

/** Reject a capture that came out blank, near-blank or trivially flat. */
async function assertNotBlank(file, label) {
  const { size } = await stat(file);
  if (size < 12_000) bad(`${label}: capture is only ${size}b, almost certainly blank`);
  return size;
}

// ── mockups ────────────────────────────────────────────────────────────────
/**
 * Each mockup file holds one or more `.frame` sections at an exact pixel size.
 * Capturing the element rather than the viewport means the frame size lives in
 * the HTML next to the design, instead of being duplicated here.
 */
async function captureMockup(browser, file, shots, fonts) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  // The mockups pull their faces from Google Fonts, so even a file:// page can
  // fail to load. Without this the whole run dies mid-sequence and the browser
  // is never closed, leaving public/work/ half-regenerated.
  try {
    await page.goto(`file://${join(MOCKUPS, file)}`, { waitUntil: 'load', timeout: 30_000 });
  } catch {
    bad(`${file}: could not load the mockup`);
    await page.close();
    return;
  }

  // Bail BEFORE writing anything. Detecting a system-font fallback is no use
  // if we have already overwritten six good PNGs with it — the exit code says
  // failure while the damage sits on disk and only git checkout undoes it.
  if (!(await assertFonts(page, fonts, file))) {
    log(`${file}: skipped, leaving the existing captures untouched`);
    await page.close();
    return;
  }
  // Let the face actually paint before the shutter, not just report ready.
  await page.waitForTimeout(400);

  for (const [id, out] of shots) {
    const el = page.locator(`#${id}`);
    if ((await el.count()) === 0) { bad(`${file}: no #${id}`); continue; }
    const dest = join(OUT, `${out}.png`);
    await el.screenshot({ path: dest });
    const size = await assertNotBlank(dest, out);
    if (size >= 12_000) { log(`${out}.png  ${(size / 1024).toFixed(0)}kb`); done.push(`${out}.png`); }
  }
  await page.close();
}

// ── live site ──────────────────────────────────────────────────────────────
/**
 * astarcustoms.com is a Zyro site: cookie banner, lazy images, web fonts. All
 * three have to be settled before the shutter or the capture shows a consent
 * overlay sitting on top of half-decoded placeholders.
 */
async function captureLive(browser, path, out, focusContent = false, origin = 'https://www.astarcustoms.com') {
  // Same frame as the mockups. Every shot in the bank shares one aspect ratio,
  // so the showcase can declare a single intrinsic size without squashing
  // half of them.
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
  /* The origin is a parameter because this path now serves two live sites.
     It defaults to A Star so the existing calls are unchanged; Peshawri passes
     its own. The consent-banner and lazy-image handling below is not
     A-Star-specific — it tries a list of labels and carries on when none
     matches — so it costs nothing on a site that has no banner.

     Because this photographs third-party origins, the output is uncontrolled:
     whatever those sites happen to be serving at shutter time ends up in
     public/work/ under SK's brand. Open every new capture before `git add` —
     the blank-frame guard below catches an empty page, not a defaced one. */
  const url = `${origin}${path}`;
  // Not `networkidle`: this host keeps analytics connections open, so the page
  // never reaches idle and every capture burns the full timeout before
  // throwing. Load the document, then wait on the things that actually matter
  // below — fonts, images, and the consent overlay being gone.
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch {
    bad(`${out}: could not load ${url}`);
    await page.close();
    return;
  }
  await page.waitForLoadState('load', { timeout: 45_000 }).catch(() => {});

  // Dismiss consent. Several label variants across the pages, so try them all
  // and carry on if none is present rather than failing the run.
  for (const re of [/^(accept|allow|agree|got it|ok)/i, /accept all/i]) {
    const btn = page.getByRole('button', { name: re }).first();
    try {
      if (await btn.isVisible({ timeout: 1200 })) { await btn.click({ timeout: 1200 }); break; }
    } catch { /* not on this page */ }
  }
  // Strip third-party furniture: the consent bar and the floating WhatsApp
  // launcher belong to the host platform, not to the build.
  //
  // Matched nodes are removed exactly as found. An earlier version climbed to
  // `.closest('[class*="widget"]')` to catch the launcher's wrapper, and on the
  // shop page that ancestor was the product grid — so the "cleanup" deleted the
  // entire thing being photographed. Never widen a delete by guessing at
  // ancestors on a page you do not control.
  await page.evaluate(() => {
    document.querySelectorAll(
      '[class*="cookie" i],[id*="cookie" i],[class*="consent" i],'
      // `whats-app-bubble`, hyphenated — a "whatsapp" substring match misses it.
      + '[class*="whats" i],[id*="whats" i],[href*="wa.me"],[href*="api.whatsapp"]',
    ).forEach((n) => n.remove());

    // Anything else pinned to the viewport is chrome rather than content, so
    // long as it is small. The size test is what stops this from eating a
    // legitimate sticky header or a full-screen section.
    document.querySelectorAll('body *').forEach((n) => {
      const s = getComputedStyle(n);
      if (s.position !== 'fixed' && s.position !== 'sticky') return;
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.width < 420 && r.height > 0 && r.height < 420) n.remove();
    });
  });

  // Walk the page so lazy images decode, then return to the top for the shot.
  //
  // The step count is fixed up front rather than tested against a live
  // scrollHeight. Lazy content makes the page grow as you scroll through it,
  // so `y < document.body.scrollHeight` can stay true forever — and
  // page.evaluate has no default timeout, so that hangs the run rather than
  // failing it.
  await page.evaluate(async () => {
    const steps = Math.min(40, Math.ceil(document.body.scrollHeight / 700));
    for (let i = 0; i <= steps; i++) {
      window.scrollTo(0, i * 700);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  // The product grid and the gallery are fetched after load: this page reports
  // 3 images immediately and 23 once it settles. Measuring or shooting before
  // that gives an empty frame, so wait for the count to stop moving.
  let seen = -1;
  let settled = false;
  for (let i = 0; i < 14; i++) {
    const n = await page.evaluate(() => document.images.length);
    if (n === seen && n > 0) { settled = true; break; }
    seen = n;
    await page.waitForTimeout(600);
  }
  if (!settled) bad(`${out}: image count never settled (${seen}), the frame may be incomplete`);

  await page.evaluate(
    () => Promise.race([
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
      new Promise((r) => setTimeout(r, 9000)),
    ]),
  );

  // Undecoded images are why the shop capture came back with blank product
  // tiles: the grid was laid out and the text was there, but two of the four
  // thumbnails had not painted. Wait on the ones actually in frame.
  const blanks = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const inView = [...document.images].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.width > 60;
      });
      const bad = inView.filter((img) => !img.complete || img.naturalWidth === 0);
      if (bad.length === 0) return 0;
      await new Promise((r) => setTimeout(r, 400));
    }
    return [...document.images].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 60
        && (!img.complete || img.naturalWidth === 0);
    }).length;
  });
  if (blanks) bad(`${out}: ${blanks} image(s) in frame never decoded`);
  // On the interior pages the real content — the product grid, the gallery —
  // starts around 950px down, so a viewport shot from the top is a screenshot
  // of a background texture. Frame the first substantial row instead of
  // hard-coding an offset per page, which would rot the moment they edit it.
  if (focusContent) {
    const y = await page.evaluate(() => {
      const tops = [...document.images]
        .filter((i) => { const r = i.getBoundingClientRect(); return r.width > 150 && r.height > 120; })
        .map((i) => i.getBoundingClientRect().top + window.scrollY)
        .filter((t) => t > 500)
        .sort((a, b) => a - b);
      return tops.length ? Math.max(0, tops[0] - 62) : 0;
    });
    // Return rather than carry on. Shooting from the top after failing to find
    // the content row replaces a good capture with a background texture.
    if (y === 0) {
      bad(`${out}: found no content row to frame, keeping the existing capture`);
      await page.close();
      return;
    }
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(600);
  }
  // Sweep the third-party chrome again immediately before the shutter. The
  // launcher is injected asynchronously and comes back after the first pass.
  await page.evaluate(() => {
    document.querySelectorAll(
      '[class*="whats" i],[id*="whats" i],[href*="wa.me"],[href*="api.whatsapp"]',
    ).forEach((n) => n.remove());
    document.querySelectorAll('body *').forEach((n) => {
      const st = getComputedStyle(n);
      if (st.position !== 'fixed' && st.position !== 'sticky') return;
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.width < 420 && r.height > 0 && r.height < 420) n.remove();
    });
  });

  const dest = join(OUT, `${out}.png`);
  await page.screenshot({ path: dest }); // viewport only — full-page would be a strip nobody can read
  const size = await assertNotBlank(dest, out);
  if (size >= 12_000) { log(`${out}.png  ${(size / 1024).toFixed(0)}kb  ← live`); done.push(`${out}.png`); }
  await page.close();
}

// ── our own build, running ─────────────────────────────────────────────────
/**
 * The dashboard's landing route bakes its figures into the HTML at export
 * time. Every other route does not: it renders a skeleton, hydrates, and then
 * asks the FastAPI backend for its data. Served as a bare static export with
 * JavaScript off those routes photograph as grey placeholder bars, and with
 * JavaScript on they photograph as "Failed to load use cases". Neither is the
 * product.
 *
 * So the interior screens are captured against the backend actually running,
 * which serves the export itself at `/` — same origin, so the dashboard's own
 * fetches resolve. Start it with the runbook in the Provena repo:
 *
 *   docker-compose up -d postgres redis && alembic upgrade head
 *   uvicorn verifier.api.app:app --port 8000
 *
 * If nothing is listening this skips, exactly as the static path skips when
 * the export is absent. `npm run shots` has to keep working on a machine that
 * has never seen Provena.
 */
async function captureApp(browser, base, shots) {
  try {
    const res = await fetch(`${base}/api/connectors`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    log(`skipped: nothing serving the dashboard at ${base}`);
    log('start the Provena backend (see DEMO-LOCAL.md) to regenerate these');
    return false;
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
  for (const [route, out] of shots) {
    const page = await ctx.newPage();
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 30_000 });
    } catch {
      bad(`${out}: could not load ${route}`);
      await page.close();
      continue;
    }
    await assertFonts(page, ['Inter'], out);
    // Hydration, then the fetch, then the render. Wait for the skeleton to go
    // rather than for a fixed delay — a capture of the loading state is the
    // failure this whole function exists to avoid.
    await page.waitForFunction(
      () => document.querySelectorAll('[class*="animate-pulse"],[class*="skeleton"]').length === 0,
      null,
      { timeout: 20_000 },
    ).catch(() => bad(`${out}: still showing a loading skeleton at the shutter`));
    // An error state renders no skeleton either, so it would sail past the
    // check above and land in public/work/ looking like the product failing.
    const broken = await page.evaluate(() => {
      const t = document.body.innerText;
      return /Failed to load|Something went wrong|Try again/i.test(t);
    });
    if (broken) {
      bad(`${out}: the page rendered an error state, keeping the existing capture`);
      await page.close();
      continue;
    }
    await page.waitForTimeout(500);
    const dest = join(OUT, `${out}.png`);
    await page.screenshot({ path: dest });
    const size = await assertNotBlank(dest, out);
    if (size >= 12_000) { log(`${out}.png  ${(size / 1024).toFixed(0)}kb  ← running app`); done.push(`${out}.png`); }
    await page.close();
  }
  await ctx.close();
  return true;
}

// ── our own build, exported ────────────────────────────────────────────────
/**
 * Provena AI ships as a Next.js static export, and that export lives in a
 * different repo on this machine rather than in tools/. So this mode takes a
 * directory, serves it, and shoots it.
 *
 * Serving it matters: the export references its assets by absolute path
 * (/_next/static/...), which file:// resolves against the filesystem root and
 * therefore cannot find. The page would load and paint unstyled.
 *
 * JavaScript is off on purpose. Every figure on that dashboard is baked into
 * the HTML at export time, so a no-JS render is both complete and identical
 * every run. With JS on, hydration tries to refresh the data from a FastAPI
 * backend that is not running here, and the shot becomes whatever the error or
 * empty state happens to look like.
 */
async function captureStatic(browser, dir, shots) {
  let root;
  try {
    root = await stat(dir);
    if (!root.isDirectory()) throw new Error('not a directory');
  } catch {
    // A skip, not a failure. This repo cannot assume another project is
    // checked out beside it, and `npm run shots` has to stay useful for the
    // four clients on a machine that has never seen Provena.
    log(`skipped: no static export at ${dir}`);
    log('set PROVENA_OUT to point at dashboard-next/out, or run its build first');
    return;
  }

  const server = createServer(async (req, res) => {
    // Static export: /foo resolves to /foo/index.html, / to /index.html.
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = path.endsWith('/') ? `${path}index.html` : path;
    // Refuse anything that climbs out of the export. This only ever serves a
    // local directory to a local browser, but a path traversal in a file
    // server is not a thing to leave lying around whatever the blast radius.
    const file = resolve(dir, `.${rel}`);
    if (!file.startsWith(resolve(dir))) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(existsSync(file) && statSync(file).isDirectory() ? join(file, 'index.html') : file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'text/html; charset=utf-8' }).end(body);
    } catch {
      // The export has its own 404 page; serving it keeps a wrong route
      // obvious in the screenshot rather than silently blank.
      try { res.writeHead(404).end(await readFile(join(dir, '404.html'))); } catch { res.writeHead(404).end(); }
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 760 },
    deviceScaleFactor: 2,
    javaScriptEnabled: false,
  });
  for (const [route, out] of shots) {
    const page = await ctx.newPage();
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 30_000 });
    } catch {
      bad(`${out}: could not load ${route} from the export`);
      await page.close();
      continue;
    }
    // next/font self-hosts its faces inside the export, so they come off the
    // same server rather than the network. Still worth asserting: a missing
    // face here is the same silent, plausible-looking failure as anywhere else.
    await assertFonts(page, ['Inter'], out);
    await page.waitForTimeout(400);
    const dest = join(OUT, `${out}.png`);
    await page.screenshot({ path: dest });
    const size = await assertNotBlank(dest, out);
    if (size >= 12_000) { log(`${out}.png  ${(size / 1024).toFixed(0)}kb  ← static export`); done.push(`${out}.png`); }
    await page.close();
  }
  await ctx.close();
  await new Promise((ok) => server.close(ok));
}

// ── run ────────────────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

if (wanted('ossett')) {
  console.log('\n── ossett (mockup)');
  await captureMockup(browser, 'ossett.html', [
    ['shot-empty', 'ossett-1'],
    ['shot-resolved', 'ossett-2'],
    ['shot-agent', 'ossett-3'],
  ], ['Space Grotesk', 'JetBrains Mono', 'Inter']);
}

if (wanted('gbautos')) {
  console.log('\n── gbautos (mockup)');
  await captureMockup(browser, 'gbautos.html', [
    ['shot-hero', 'gbautos-1'],
    ['shot-services', 'gbautos-2'],
    ['shot-visit', 'gbautos-3'],
    ['shot-agent', 'gbautos-4'],
  ], ['Archivo', 'Inter']);
}

if (wanted('hopeful')) {
  console.log('\n── hopeful (mockup)');
  await captureMockup(browser, 'hopeful.html', [
    ['shot-hero', 'hopeful-1'],
    ['shot-services', 'hopeful-2'],
    ['shot-agency', 'hopeful-3'],
    ['shot-onboarding', 'hopeful-4'],
  ], ['Newsreader', 'Inter']);
}

if (wanted('astar')) {
  console.log('\n── astar (live capture)');
  for (const [path, out, focus] of [
    ['/', 'astar-1', false],          // the hero is the shot on the home page
    ['/shop', 'astar-2', true],
    ['/gallery', 'astar-3', true],
    ['/services', 'astar-4', true],
  ]) await captureLive(browser, path, out, focus);

  /* One drawn screen among four photographs. Their live site has no agent on
     it, so the agentic checkout could not be captured and had to be designed.
     See the header of astar.html: it is the only A Star asset that is a
     mockup, and it is marked as such there. */
  await captureMockup(browser, 'astar.html', [
    ['shot-agent', 'astar-5'],
  ], ['Oswald', 'Inter']);
}

if (wanted('peshawari')) {
  console.log('\n── peshawari (live capture)');
  /* Both captures are unfocused. `focusContent` hunts for a content row to
     frame and fails the capture when it finds none, which is right for A Star's
     shop grid and wrong here: these are ordinary pages where the top of the
     document IS the shot. */
  for (const [path, out] of [
    ['/', 'peshawari-1'],
    ['/menu', 'peshawari-2'],
    ['/about', 'peshawari-3'],
    ['/contact', 'peshawari-4'],
  ]) await captureLive(browser, path, out, false, 'https://peshawarichaplikebab.co.uk');

  /* One drawn screen among four photographs, same as A Star. Their find-us
     page still reads "delivery platform links to be added", so the ordering
     agent is precisely the thing that page says is coming and there was
     nothing live to photograph. Marked as a mockup in peshawari.html. */
  await captureMockup(browser, 'peshawari.html', [
    ['shot-agent', 'peshawari-5'],
  ], ['Playfair Display', 'Inter']);
}

if (wanted('provena')) {
  console.log('\n── provena (our own build)');
  /* The routes walk the same arc the panel describes, in order: it reads from
     the tools they already use, writes the paperwork, nothing is final until a
     person signs it, and a binder comes out the other end. Other routes in the
     app are real screens too — these are the four that carry the story without
     photographing the same table twice.

     The AI Use Register is deliberately not among them. It is the right screen
     for the story and it currently throws on a use case created through the
     product's own onboarding wizard, so there is nothing here to photograph
     that is not a crash. Add it once that is fixed. */
  const live = await captureApp(browser, PROVENA_BASE, [
    ['/connectors', 'provena-2'],
    ['/evidence', 'provena-3'],
    ['/approvals', 'provena-4'],
    ['/binders', 'provena-5'],
    ['/attestations', 'provena-6'],
    ['/regulatory-updates', 'provena-7'],
    ['/getting-started', 'provena-8'],
  ]);
  /* The landing route is the one screen that needs no backend, so it is shot
     from the export either way: identical output, and it keeps this target
     useful on a machine where Provena is not running. */
  await captureStatic(browser, PROVENA_OUT, [
    ['/', 'provena-1'],
  ]);
  if (!live) log('provena-2..8 left as they were');

  /* Two drawn screens among eight real ones, and the only place in the bank
     where our own product gets a mockup. The agent layer is real code but sits
     behind default-off feature flags, so nothing in the shipped UI shows it and
     Provena was the one client whose agent line had no screenshot. Marked as
     drawn in the header of provena.html. */
  await captureMockup(browser, 'provena.html', [
    ['shot-gapfill', 'provena-9'],
    ['shot-classify', 'provena-10'],
  ], ['Inter', 'JetBrains Mono']);
}

await browser.close();

console.log(`\n${done.length} captured into public/work/`);
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('all shots ok');
