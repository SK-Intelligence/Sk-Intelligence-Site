# SK Intelligence — website

Static marketing site for SK Intelligence, an AI-native consultancy.
No build step, no framework, no dependencies to install.

```
index.html      hero (3D node network) · what we do · process (pinned scrub) ·
                co-founders · client work (tabbed) · manifesto · CTA
studio.html     build studio services + tech stack
assets/
  site.css          all shared styling, incl. the THEME:START/END token block
  site.js           nav · reveal-on-scroll · entrance · shader wash · tabs · process scrub
  hero-network.js   three.js node-network hero (index only)
  hero-scene.css    hero scene layering + the "Us" / "Your systems" labels
  clients/*.png     client logos
  founders/         drop sameer.jpg / kenneth.jpg here — see the README inside
favicon.ico, assets/favicon-32.png, apple-touch-icon.png, icon-512.png
```

## Running it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8123      # http://127.0.0.1:8123
```

Both work — asset paths are relative and the logo masks are inlined precisely so
that `file://` renders correctly (see "Gotchas").

## Editing

**The two HTML files are the source of truth.** There is no generator. Shared
chrome (nav, footer, CTA, and the inline `<svg><filter id="glass-distortion">`
that `.glass` depends on) is duplicated across both pages — a nav change means
two edits. That is a deliberate trade for keeping the files hand-editable.

Colour lives in one place: the `/* ===== THEME:START ===== */ … THEME:END */`
block at the top of `assets/site.css`. JS reads colours from CSS via a `tok()`
helper, so the shader wash and the three.js scene follow the tokens rather than
holding their own literals. A re-skin is that block and nothing else.

## Gotchas worth knowing before you change things

- **Logo masks are inlined base64 on purpose.** A relative `url()` in a CSS
  `mask-image` is blocked by CORS over `file://` and silently renders the SK
  monogram invisible. Each blob is written once via a `--sk-mask` custom property
  that both `-webkit-mask-image` and `mask-image` read.
- **Progressive enhancement is a contract.** `[data-reveal]` defaults to visible
  and JS adds `body.reveal-armed`; the tabs default to all-panels-visible and JS
  adds `.js-tabs` plus all the ARIA; the process section defaults to stacked and
  JS adds `.process-js`. With JS off every page is complete and readable — keep
  it that way.
- **`three.js` loads on `index.html` only.** It is ~168 KB gzipped and the hero
  network is its only consumer.
- **CDN scripts are pinned with SRI.** If you bump `three@0.160.1` or
  `gsap@3.12.5`, regenerate the hashes or the scripts silently stop loading:
  `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
  `crossorigin="anonymous"` is required alongside `integrity`, not optional.
- **No scrim behind the hero ball.** A radial gradient in that box gets clipped
  at its top and bottom edges and draws visible horizontal seams. If a halo is
  ever wanted, use a `mask-image` fade on `.hero-scene`.
- The `.tab-indicator` position is set in JS (`top` as well as `translateX`)
  because the tablist wraps to multiple rows below ~900px.

## Before deploying

1. **Response headers** — CSP, `Referrer-Policy`, `X-Content-Type-Options`,
   `X-Frame-Options`, `Permissions-Policy`, HSTS. Roll the CSP out in
   report-only first: `style-src-attr` is CSP Level 3 and a browser without it
   falls back to `style-src`, which would block the inline `style` attributes.
2. **Domain-dependent meta** — `og:url`, `og:image` and `rel="canonical"` need
   the live domain. Favicons and the rest of the Open Graph tags are already in.
3. **Founder headshots** — strip EXIF before adding
   (`exiftool -all= -overwrite_original …`); phone photos carry GPS.

## Accessibility

Verified: WCAG AA contrast throughout, keyboard-navigable tabs with roving
focus, visible focus rings (raised to the band accent on dark panels), correct
heading outline, `prefers-reduced-motion` honoured across the entrance, the
scroll reveals, the process scrub and the 3D hover, and no horizontal scroll
from 320px up.
