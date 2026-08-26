# SK Intelligence — website

Marketing site for SK Intelligence, an AI-native consultancy.
Next.js (App Router) + TypeScript. Two statically prerendered pages and one API route.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure

```
app/
  layout.tsx            fonts, metadata, shared chrome, behaviour layers
  page.tsx              home — hero, services, process, co-founders, client work, CTA
  studio/page.tsx       build studio services + tech stack
  api/contact/route.ts  POST endpoint for the contact form
  globals.css           the whole design system, incl. the theme token block
  fonts.ts              Syne + Fraunces via next/font (self-hosted)
components/             one component per section, plus the client-side behaviour
lib/
  content.ts            all copy in one typed place
  heroNetwork.ts        three.js node lattice
  shaderWash.ts         GLSL background wash
public/clients/*        client logos
public/founders/        kenneth.jpg present; drop sameer.jpg here (see the README inside)
public/work/*           build screenshots for the case bank — generated, see below
tools/
  shots.mjs             Playwright capture: regenerates every case-bank screenshot
  mockups/*.html        standalone sources for three of the five builds
```

Provena AI has no mockup: it is our own product and is captured from its own
static export. See below.

## Case-bank screenshots

```bash
npm run shots              # all eleven
npm run shots -- ossett    # one target
```

Nothing in `tools/` ships. It exists so no image in `public/work/` is a binary
nobody can reproduce.

Three kinds of source. **A Star Customs** is captured from the live site, because
that build stands up on its own. **The other three** are captured from
`tools/mockups/*.html`, which restyle real builds using only real content — the
actual DVLA lookup flow for Ossett, real services and opening hours for GB
Autos, Hopeful Hearts' own service list and values verbatim. Each file's header
records what is theirs and what is presentation. Keep it that way: invented
copy about a named real client is the one thing that must never appear here.

**Provena AI** is the third kind. It is our own product rather than a client
build, so nothing about it is restyled: `captureStatic` serves its Next.js
static export over a local HTTP server and shoots the real dashboard running its
sample data, which the dashboard labels as such on screen. That export lives in
a separate repo, so the path is configurable:

```bash
PROVENA_OUT=/path/to/Provena-AI/dashboard-next/out npm run shots -- provena
```

The default is where it sits on Sameer's machine. On any checkout without it,
that target logs a skip and the four client builds still regenerate. Two details are
deliberate and worth keeping: it is served rather than opened over `file://`,
because the export references its assets by absolute path, and it is captured
with JavaScript **off**, because every figure is baked into the HTML at export
time and hydration would otherwise try to refresh them from a backend that is
not running here.

The three mockups are deliberately unalike, because Ossett and GB Autos are both
automotive and sit next to each other in the same tab strip. If both were dark
with an accent colour they would read as one project shown twice.

Things the capture script already learned the hard way, all commented in place:

- `waitUntil: 'networkidle'` never resolves on the live host, which keeps
  analytics connections open.
- A lazy-load scroll loop tested against a live `scrollHeight` never terminates,
  because the page grows as you scroll it — and `page.evaluate` has no default
  timeout, so that hangs the run rather than failing it.
- Removing a floating widget by climbing to `.closest('[class*="widget"]')`
  deleted the product grid being photographed. Never widen a delete by guessing
  at ancestors on a page you do not control.
- The product grid arrives after `load` (3 images, then 23), so the script waits
  for the image count to stop moving before it measures or shoots.
- It asserts the intended web font actually loaded. A silent fallback to a
  system font still produces a plausible-looking screenshot, which is the worst
  kind of failure: fine in the terminal, wrong on the site.

## Build output

```
○ /              Static
○ /studio        Static
ƒ /api/contact   Dynamic
```

Both pages are prerendered at build. The API route being dynamic does not affect
them — static/dynamic is decided per route segment.

## Theming

Every colour lives in the `/* ===== THEME:START ===== */ … THEME:END */` block at
the top of `app/globals.css`. The shader wash and the three.js scene read their
colours from those tokens via a `tok()` helper rather than holding literals, so a
re-skin is that block and nothing else.

## Contact form

`POST /api/contact` validates, rate-limits (5 per 10 min per IP, in-memory) and
carries a honeypot field. Delivery is **not configured** — it logs server-side and
returns `delivered: false` rather than pretending to have sent. To turn it on:

```
RESEND_API_KEY=...      # or swap the `deliver()` body for another provider
CONTACT_TO=...
CONTACT_FROM=...        # optional
NEXT_PUBLIC_SITE_URL=https://your-domain   # makes og:url / canonical resolve
```

The form degrades: the mailto link next to it always works, including with JS off.

## Things that will bite you if you change them

- **⚠️ THE CASE-BANK NUMBERS ARE PLACEHOLDERS.** `PLACEHOLDER_METRICS` in
  `lib/content.ts` is invented, apart from two figures marked `// real` in
  place: Ossett's *50+ enquiries a month*, and the *5 vehicle fields* the lookup
  resolves. Replace the rest before this section is shown to anyone. That object
  is the only place in the codebase any client figure lives, so it is one edit,
  and nothing else changes when you make it.
- **Never invent copy about a named real client.** Every string in
  `tools/mockups/*.html` is either lifted from that client's live site or
  obviously generic. No invented testimonials, staff, prices or accreditations.
  This matters most for Hopeful Hearts, which is a real child and family
  services organisation.
- **`app/fonts.ts`** — Fraunces must not declare `weight`. next/font rejects
  `axes` unless weight is omitted or `'variable'`, and `opsz` is not included
  automatically. Without `axes: ['opsz']` the display type renders at the wrong
  optical size.
- **`lib/heroNetwork.ts`** — the node material must not set `vertexColors`.
  `IcosahedronGeometry` has no `color` attribute, so `USE_COLOR` multiplies
  `vColor` by the default `(0,0,0)` and every node renders black.
  Edges are instanced cylinders, not `LineSegments`: WebGL ignores `linewidth`.
- **Both `lib/` modules return a cleanup function and it must be called.**
  StrictMode mounts effects twice in development; a leaked WebGL context is not
  collected and browsers cap how many you can hold.
- **No scrim behind the hero ball.** A radial gradient in that box is clipped at
  its top and bottom edges and draws two faint horizontal seams. Use a
  `mask-image` fade on `.hero-scene` if a halo is ever wanted.
- **Whitespace between JSX elements is stripped** where HTML preserved it. The
  hero headline needs its explicit `{' '}` or it reads "bottleneck.Then".
- **Progressive enhancement is a contract.** `[data-reveal]` is visible by
  default and JS arms the hidden state; the tabs render every panel and carry no
  tab ARIA until hydrated; the process section is stacked and readable until the
  scrub arms. With JS off every page is complete. Keep it that way.
- **`?__probe=1`** exposes `window.__THREE` for the browser tests that prove the
  scene does zero work at idle. It is inert without the query flag.

## Tests

```bash
npm run build && npm start      # in one shell
npx playwright install chromium # once
npm run test:e2e                # in another
```

`tests/e2e.mjs` checks the things that have actually broken here before, not a
generic smoke test: the tab underline tracking the right client once the strip
scrolls, the mobile menu locking the page behind it, a stylesheet being silently
swallowed by an unclosed comment, JSX eating the space in the hero headline, the
3D scene doing zero work at idle, contrast, no overflow from 320px up, deep
links landing clear of the fixed nav, and the progressive-enhancement contract
with JS disabled. Add to it when you fix a bug.

The case-bank block checks each client renders a decoded screenshot with real
alt text, three non-empty metrics, a sector and a frame label; that a thumbnail
swaps the primary image and the active marker follows; that the lightbox opens
as a real modal, moves focus inside itself, wraps rather than walking off the
end of the set, and closes on Esc; and that no outbound client link has crept
back into the section.

It also enforces two house-style rules. **No em or en dashes in anything a
visitor sees.** They read as machine-written. The check walks rendered text
plus `<title>` and the OG/Twitter tags, so `&mdash;` entities and interpolated
metadata are caught too. Code comments are out of scope; they are not the site.

And **say what the site does, not what it isn't.** "We're not here to sell you
AI", "no account manager in between", "we don't hand off a deck and disappear" —
every one of those plants the idea it is trying to dismiss, and there were seven
of them before the check existed. Client testimonials are exempt, because they
are verbatim and not ours to edit. "Rather than" and "instead of" are allowed:
they are fine when the contrast is not about us.

## Accessibility

WCAG AA contrast throughout, keyboard-navigable tabs with roving focus, focus
rings raised to the band accent on dark panels, correct heading outline,
`prefers-reduced-motion` honoured across the entrance, scroll reveals, process
scrub and the 3D hover, and no horizontal scroll from 320px up.

## Deploying

Vercel: import the repo, set the env vars above, done. Security headers (CSP,
Referrer-Policy, HSTS, Permissions-Policy) are set in `next.config.ts` — static
rather than nonce-based on purpose, because nonces force per-request rendering
and would give up static generation.
