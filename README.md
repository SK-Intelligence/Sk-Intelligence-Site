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
public/founders/        drop sameer.jpg / kenneth.jpg here — see the README inside
```

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
3D scene doing zero work at idle, contrast, no overflow from 320px up, and the
progressive-enhancement contract with JS disabled. Add to it when you fix a bug.

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
