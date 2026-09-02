'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { site } from '@/lib/content';

/**
 * Calendly, inline, in place of the contact form.
 *
 * Four deviations from the snippet Calendly gives you, all deliberate:
 *
 *   1. `min-width:320px` is dropped. Inside this container a 320px floor is
 *      wider than the content box at a 320px viewport, which pushes the whole
 *      page sideways; the suite asserts against exactly that. The widget is
 *      happy at 100% and the iframe scrolls its own content.
 *   2. The raw <script> tag becomes next/script. A bare tag in the App Router
 *      is not guaranteed to run after hydration, and this one has to.
 *   3. Themed to match the contact form it replaces rather than shipping
 *      Calendly's white. The form's material is a translucent bone fill over
 *      the CTA gradient with a hairline border; the wrapper below reuses those
 *      exact rules. The iframe cannot be translucent, so its background is the
 *      opaque colour that fill resolves to over the panel, matched by eye
 *      against a screenshot. These cross an iframe boundary as URL parameters
 *      and so cannot read a CSS variable: if the palette moves, move them.
 *   4. Their GDPR banner is suppressed, because it opens over the calendar and
 *      hides the dates. See the note on THEME below for what that does and
 *      does not mean.
 *
 * Fallbacks matter more here than they did for the form, because a form that
 * fails still shows its fields whereas a widget that fails shows an empty
 * 700px hole. There are two: <noscript> for JS off, and an onError branch for
 * JS on but the script blocked, which a tracker blocker will do routinely.
 */

/* Bare hex, as Calendly wants them. Background is the form's translucent fill
   resolved over the panel; text and primary are --band-ink and --band-accent,
   the same two the form uses on this ground.

   hide_gdpr_banner is Calendly's own embed parameter and it is here because
   their consent banner opens over the calendar and covers the dates, which is
   the one thing the widget exists to show. It cannot be styled or dismissed
   from our side: it renders inside their cross-origin iframe, so no CSS or
   script of ours reaches it. This parameter is the only lever there is.

   ⚠️ It only works alongside `embed_domain` and `embed_type`, which widget.js
   appends itself when it mounts the iframe. Calendly ignores the flag without
   them. Two consequences worth knowing before anyone "tidies" this up:

     - It cannot be verified from a file:// page. Test it there and the banner
       still appears, because embed_domain resolves to nothing and the whole
       parameter is dropped. That false negative cost a round trip here.
     - It needs a settled widget to observe. The banner arrives seconds after
       the calendar paints, so a screenshot taken while the days are still
       loading shows no banner whether or not this flag is doing anything.

   Verify on a real http origin, and wait for the bookable days to highlight
   before you believe the result.

   Note what it does and does not do. It suppresses the banner; it does not
   stop Calendly setting cookies, and Calendly documents it for embedders who
   take on consent themselves. This site currently shows no consent UI of its
   own, so if one is ever added, Calendly belongs behind it. */
const THEME = [
  'background_color=332C24',
  'text_color=F5F1E8',
  'primary_color=CDAC82',
  'hide_gdpr_banner=1',
].join('&');
const BOOKING_URL = 'https://calendly.com/sk-intelligence-info/30min';

export function BookingEmbed() {
  const [blocked, setBlocked] = useState(false);
  const slot = useRef<HTMLDivElement>(null);

  /* Initialised by hand rather than left to Calendly's own scan, and driven by
     polling rather than by next/script's callbacks.

     Their scan runs when their script parses and looks for
     .calendly-inline-widget at that moment; loaded through next/script it can
     arrive after the sweep it relies on, and then nothing mounts and the page
     shows a 700px hole. next/script's own onReady/onLoad did not fire reliably
     here either. Watching for the global it defines sidesteps both questions:
     the only thing that actually matters is whether window.Calendly exists. */
  useEffect(() => {
    let alive = true;
    const started = Date.now();
    const tick = () => {
      if (!alive) return;
      const el = slot.current;
      const api = (window as unknown as { Calendly?: { initInlineWidget: (o: object) => void } }).Calendly;
      if (el && api) {
        if (!el.querySelector('iframe')) {
          api.initInlineWidget({ url: `${BOOKING_URL}?${THEME}`, parentElement: el });
        }
        return;
      }
      /* Ten seconds is long past a cold third-party fetch on a slow connection.
         Past it, assume something is stopping the script and say so rather than
         leaving an empty box that looks like the site is broken. */
      if (Date.now() - started > 10_000) { setBlocked(true); return; }
      window.setTimeout(tick, 150);
    };
    tick();
    return () => { alive = false; };
  }, []);

  return (
    <div className="booking">
      {blocked ? (
        <p className="booking-fallback">
          The booking widget did not load, which is usually a browser extension blocking it.{' '}
          <a href={BOOKING_URL} target="_blank" rel="noopener">Book a call directly</a>
          {' '}or email <a href={`mailto:${site.mailto}`}>{site.mailto}</a>.
        </p>
      ) : (
        /* data-url is NOT optional even though the effect below can mount the
           widget itself. Calendly's script scans for .calendly-inline-widget as
           it parses and calls .split() on whatever data-url it finds; with the
           attribute absent that is null, the script throws before it defines
           window.Calendly, and then neither their path nor ours can work. It
           cost an hour to find because the throw is silent from outside: the
           request is a clean 200 and the console stays empty. */
        <div
          ref={slot}
          className="calendly-inline-widget"
          data-url={`${BOOKING_URL}?${THEME}`}
          style={{ minWidth: 0, width: '100%', height: 700 }}
        />
      )}

      <noscript>
        <p className="booking-fallback">
          <a href={BOOKING_URL} target="_blank" rel="noopener">Book a call</a>
          {' '}or email <a href={`mailto:${site.mailto}`}>{site.mailto}</a>.
        </p>
      </noscript>

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onError={() => setBlocked(true)}
      />
    </div>
  );
}
