'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deliveryTeam, founders } from '@/lib/content';

/**
 * Co-founders as a depth carousel: the active card sits in front at full size,
 * the others tuck in behind its left and right edges, scaled down and faded.
 *
 * The scrolling is still NATIVE overflow with CSS scroll snapping, not a JS
 * transform track. That is deliberate and it is the whole progressive
 * enhancement story: with JavaScript off the strip is a plain flat row that is
 * still swipeable, still keyboard scrollable, and every card is still fully
 * readable, because the browser is doing the scrolling. The depth effect is
 * layered on top by reading scroll position and painting transforms, so losing
 * it costs presentation and nothing else.
 *
 * Each founder card is a link to their LinkedIn. A card that is not in front is
 * half hidden behind the one that is, so clicking it brings it forward rather
 * than navigating; only the front card follows its link.
 */

/** How far a back card's outer edge shows past the front card, at most. */
const MAX_PEEK = 96;
/** Shrink and fade applied by the time a card is one full step off centre. */
const SCALE_DROP = 0.12;
const FADE = 0.55;

export function Founders() {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  /* Layout geometry, measured rather than assumed: card width is a clamp() on
     vw and the centring pad is derived from it, so both move with the viewport. */
  const geoRef = useRef({ pitch: 0, half: 0, peek: 0, lefts: [] as number[] });
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(0);
  const count = founders.length + 1;

  useEffect(() => setHydrated(true), []);

  const slidesOf = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('.founder-slide'));

  /**
   * Pad the track so the first and last cards can still reach the centre, then
   * cache the geometry the paint loop needs. The pad is set here rather than in
   * CSS because a percentage pad derived from the card width, on a flex
   * container whose content box the card width is measured against, is circular.
   * Reading it back in JS breaks the loop: adding inline padding does not change
   * clientWidth, so there is nothing to feed back.
   */
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = slidesOf(el);
    if (!slides.length) return;
    const w = slides[0].offsetWidth;
    const pad = Math.max(0, (el.clientWidth - w) / 2);
    el.style.paddingInline = `${pad}px`;
    const lefts = slides.map((s) => s.offsetLeft);
    geoRef.current = {
      pitch: slides.length > 1 ? lefts[1] - lefts[0] : w,
      half: w / 2,
      /* Never wider than the room actually available, or the back cards would
         be cut off by the scroller's own overflow. */
      peek: Math.min(MAX_PEEK, Math.max(0, pad - 6)),
      lefts,
    };
  }, []);

  /**
   * Position every card from the live scroll offset. Driving the effect off
   * scroll rather than off a step counter is what makes a half-finished swipe
   * look right: the cards are mid-transition because the finger is mid-gesture.
   */
  const paint = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { pitch, half, peek, lefts } = geoRef.current;
    if (!pitch) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    const slides = slidesOf(el);
    let best = 0;
    let bestDist = Infinity;

    slides.forEach((s, i) => {
      /* Steps from the centre: 0 is in front, ±1 is one card out. */
      const p = (lefts[i] + half - mid) / pitch;
      const dist = Math.abs(p);
      const depth = Math.min(dist, 1);
      const scale = 1 - SCALE_DROP * depth;
      /* Where the card's centre should sit. Cards past the first step barely
         move further out, so a third card stacks behind the second instead of
         flying off and getting clipped. */
      const push = depth + Math.max(0, Math.min(dist, 3) - 1) * 0.16;
      /* Hard stop at the track's own edge. The stacking offset alone overshoots
         by a pixel or two on a narrow viewport, and the track clips its
         overflow, so the far card would be sliced rather than tucked. */
      const limit = Math.max(0, el.clientWidth / 2 - half * scale - 2);
      const wanted = Math.sign(p) * Math.min(limit, (half * (1 - scale) + peek) * push);

      /* Painted on the inner layer, never on the snap target itself. */
      const d = s.firstElementChild as HTMLElement;
      d.style.transform = `translate3d(${(wanted - p * pitch).toFixed(2)}px,0,0) scale(${scale.toFixed(4)})`;
      d.style.opacity = (1 - FADE * depth - 0.18 * Math.max(0, Math.min(dist, 2) - 1)).toFixed(3);
      d.style.zIndex = String(100 - Math.round(Math.min(dist, 3) * 10));
      d.classList.toggle('is-front', dist < 0.5);

      if (dist < bestDist) { bestDist = dist; best = i; }
    });

    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; paint(); });
    };
    const remeasure = () => { measure(); paint(); };

    remeasure();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    /* Catches container-driven resizes the window event misses, such as a
       scrollbar appearing or the layout settling after webfonts load. */
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
      ro.disconnect();
    };
  }, [measure, paint]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = slidesOf(el)[i];
    if (!card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  };

  const step = (dir: -1 | 1) => goTo(Math.min(count - 1, Math.max(0, active + dir)));

  const indexOfSlide = (target: EventTarget | null) => {
    const el = trackRef.current;
    const slide = (target as HTMLElement | null)?.closest?.('.founder-slide');
    if (!el || !slide) return -1;
    return slidesOf(el).indexOf(slide as HTMLElement);
  };

  /* A back card is half covered by the front one, so a click on it means "bring
     this forward", not "open LinkedIn". Modified clicks still go to the link, so
     open-in-new-tab keeps working. */
  const onClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const i = indexOfSlide(e.target);
    if (i !== -1 && i !== active) { e.preventDefault(); goTo(i); }
  };

  /* Tabbing into a back card brings it forward too, so keyboard users read the
     same card the pointer would have surfaced. */
  const onFocus = (e: React.FocusEvent) => {
    const i = indexOfSlide(e.target);
    if (i !== -1 && i !== active) goTo(i);
  };

  return (
    <section className="section-pad" id="founders">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="eyebrow">Co-founders</p>
          <h2>The experience we bring</h2>
          <p>Two co-founders, both engineers. You deal with us directly, with no account manager in between.</p>
        </div>

        <div
          className="founders-track"
          ref={trackRef}
          tabIndex={0}
          role="region"
          aria-label="Co-founders and delivery team"
          onClick={onClick}
          onFocus={onFocus}
        >
          {founders.map((f, i) => (
            <div className="founder-slide" key={f.slug}><div className="founder-depth">
              <a
                href={f.linkedin}
                target="_blank"
                rel="noopener"
                aria-label={`${f.name} on LinkedIn`}
                className="founder-card glass"
                data-reveal
                style={{ '--d': i + 1 } as React.CSSProperties}
              >
                <div className="founder-id">
                  <span className="founder-portrait" aria-hidden="true">
                    <span className="founder-monogram">{f.monogram}</span>
                    {/* Drop a photo into public/founders/ to activate — a missing
                        file simply doesn't paint, leaving the monogram. */}
                    <span className="founder-photo" style={{ backgroundImage: `url("/founders/${f.slug}.jpg")` }} />
                  </span>
                  <div>
                    <h3 className="founder-name">{f.name}</h3>
                    <p className="founder-role">Co-founder</p>
                  </div>
                  <span className="founder-arrow" aria-hidden="true">&#8599;</span>
                </div>
                <ul className="founder-points">
                  {f.points.map((p) => (
                    <li key={p} dangerouslySetInnerHTML={{ __html: p }} />
                  ))}
                </ul>
              </a>
            </div></div>
          ))}

          <div className="founder-slide"><div className="founder-depth">
            <article className="founder-card is-team glass" data-reveal style={{ '--d': 3 } as React.CSSProperties}>
              <div className="founder-id">
                <span className="founder-portrait" aria-hidden="true">
                  {/* Three nodes rather than a monogram: this card is a group, and
                      initials would imply one person. */}
                  <svg viewBox="0 0 40 40" className="team-mark" fill="none">
                    <circle cx="20" cy="12" r="4.2" /><circle cx="12" cy="26" r="4.2" /><circle cx="28" cy="26" r="4.2" />
                    <path d="M20 16.2 L12.9 22.2 M20 16.2 L27.1 22.2 M16.2 26 L23.8 26" />
                  </svg>
                </span>
                <div>
                  <h3 className="founder-name">{deliveryTeam.name}</h3>
                  <p className="founder-role">{deliveryTeam.role}</p>
                </div>
              </div>
              <ul className="founder-points">
                {deliveryTeam.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          </div></div>
        </div>

        {/* Enhancement only. Rendering these without JS would offer a dead
            control, so they wait for hydration; the strip scrolls without them. */}
        {hydrated && (
          <div className="founders-controls">
            <div className="founders-dots" role="group" aria-label="Choose a card">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-current={i === active ? 'true' : undefined}
                  aria-label={i < founders.length ? founders[i].name : deliveryTeam.name}
                  className={`founders-dot${i === active ? ' is-active' : ''}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <div className="founders-arrows">
              <button type="button" className="founders-nav" aria-label="Previous" disabled={active === 0} onClick={() => step(-1)}>
                <span aria-hidden="true">&#8592;</span>
              </button>
              <button type="button" className="founders-nav" aria-label="Next" disabled={active === count - 1} onClick={() => step(1)}>
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
