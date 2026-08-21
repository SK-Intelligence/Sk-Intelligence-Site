'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deliveryTeam, founders } from '@/lib/content';

/**
 * Co-founders as a looping deck: the active card sits in front at full size
 * with one card tucked behind each of its edges, scaled down and faded. Move on
 * and the deck rotates, so there is always a card on both sides.
 *
 * That loop is why this is NOT a scroll container any more. Cards laid out in a
 * line have ends, and at an end there is nothing on one side; wrapping a
 * scroller means cloning the whole set and teleporting scrollLeft, which
 * duplicates every card for screen readers and stutters mid-momentum. Instead
 * all three cards share one grid cell and the position of each is derived from
 * a single float, `posRef`, which wraps. Whole numbers are resting positions.
 *
 * The progressive-enhancement contract survives intact, just moved: the markup
 * and CSS still describe a plain scroll-snap row, and `is-live` — added only
 * once this component mounts — is what turns it into a deck. With JavaScript
 * off the row is what ships, still swipeable, still keyboard scrollable, every
 * card at full strength.
 *
 * Each founder card links to their LinkedIn. A card that is not in front is
 * mostly hidden behind the one that is, so clicking it brings it forward rather
 * than navigating.
 */

/** How far a back card's outer edge shows past the front card, at most. */
const MAX_PEEK = 96;
/** Shrink and fade applied by the time a card is one full step off centre. */
const SCALE_DROP = 0.12;
const FADE = 0.55;
/** Milliseconds for one card to travel one step. */
const DURATION = 480;
/** Fraction of a step a drag must cover before it counts as a swipe. */
const SWIPE = 0.2;

export function Founders() {
  const trackRef = useRef<HTMLDivElement>(null);
  /* The single source of truth for the whole deck. Integers are resting
     positions; the fractional values in between are a swipe in progress. */
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const activeRef = useRef(0);
  const geoRef = useRef({ half: 0, trackHalf: 0, peek: 0 });
  const dragRef = useRef<{ id: number; x: number; y: number; from: number; axis: '' | 'x' } | null>(null);
  const draggedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(0);
  const n = founders.length + 1;

  /** Shortest signed distance to a position, given the deck wraps. */
  const wrap = useCallback((r: number) => {
    const m = ((r % n) + n) % n;
    return m > n / 2 ? m - n : m;
  }, [n]);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>('.founder-slide');
    if (!slide) return;
    const half = slide.offsetWidth / 2;
    const trackHalf = el.clientWidth / 2;
    /* A back card's outer edge lands at half + peek regardless of how much it
       is scaled, so this is exactly the room available for it. */
    geoRef.current = { half, trackHalf, peek: Math.min(MAX_PEEK, Math.max(0, trackHalf - half - 2)) };
  }, []);

  const paint = useCallback(() => {
    const el = trackRef.current;
    const { half, trackHalf, peek } = geoRef.current;
    if (!el || !half) return;
    const pos = posRef.current;
    let best = 0;
    let bestDist = Infinity;

    el.querySelectorAll<HTMLElement>('.founder-depth').forEach((d, i) => {
      const r = wrap(i - pos);
      const dist = Math.abs(r);
      const depth = Math.min(dist, 1);
      const scale = 1 - SCALE_DROP * depth;
      /* Never let a card cross the track edge; it would be sliced rather than
         tucked, and on a narrow viewport the stacking offset overshoots. */
      const limit = Math.max(0, trackHalf - half * scale - 2);
      const x = Math.sign(r) * Math.min(limit, (half * (1 - scale) + peek) * Math.min(dist, n / 2));
      /* Past one step out, a card is on its way round the back of the deck.
         Fading it to nothing by the halfway point is what hides the jump from
         one side to the other: at rest no card is ever out there. */
      const fade = dist > 1 ? Math.max(0, (n / 2 - dist) / (n / 2 - 1)) : 1;

      d.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${scale.toFixed(4)})`;
      d.style.opacity = ((1 - FADE * depth) * fade).toFixed(3);
      d.style.zIndex = String(100 - Math.round(dist * 20));
      d.classList.toggle('is-front', dist < 0.5);

      if (dist < bestDist) { bestDist = dist; best = i; }
    });

    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, [n, wrap]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    /* The class, not the component, is what switches the row into a deck, so
       the CSS above it stays a complete description of the no-JS fallback. */
    el.classList.add('is-live');
    setHydrated(true);
    const remeasure = () => { measure(); paint(); };
    remeasure();
    /* Catches container-driven resizes the window event misses, including the
       relayout caused by adding is-live a moment ago. */
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    window.addEventListener('resize', remeasure);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('resize', remeasure);
      el.classList.remove('is-live');
    };
  }, [measure, paint]);

  /* Animated in JS rather than by a CSS transition, because a card going round
     the back has to jump from one side to the other. A transition would slide
     it across the front instead; here the jump happens at zero opacity. */
  const animateTo = useCallback((target: number) => {
    cancelAnimationFrame(rafRef.current);
    const settle = () => { posRef.current = ((target % n) + n) % n; paint(); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { settle(); return; }
    const from = posRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / DURATION);
      posRef.current = from + (target - from) * (1 - Math.pow(1 - k, 3));
      paint();
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
      else settle();
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [n, paint]);

  /** Always travels the short way round. */
  const goTo = useCallback((i: number) => {
    animateTo(posRef.current + wrap(i - posRef.current));
  }, [animateTo, wrap]);

  const step = useCallback((dir: -1 | 1) => {
    animateTo(Math.round(posRef.current) + dir);
  }, [animateTo]);

  const dragUnit = () => Math.max(90, geoRef.current.half * 0.9);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(rafRef.current);
    draggedRef.current = false;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: posRef.current, axis: '' };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      /* A mostly-vertical gesture is the user scrolling the page, so let go of
         it entirely rather than half-swiping the deck sideways. */
      if (Math.abs(dy) >= Math.abs(dx)) { dragRef.current = null; return; }
      d.axis = 'x';
      trackRef.current?.setPointerCapture(e.pointerId);
      trackRef.current?.classList.add('is-dragging');
    }
    posRef.current = d.from - dx / dragUnit();
    paint();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    trackRef.current?.classList.remove('is-dragging');
    if (d.axis !== 'x') return;
    /* Suppresses the click the browser fires after a drag that started on a
       link, so a swipe never navigates. */
    draggedRef.current = true;
    const moved = posRef.current - d.from;
    const start = Math.round(d.from);
    let target = Math.round(posRef.current);
    if (target === start && Math.abs(moved) > SWIPE) target = start + Math.sign(moved);
    animateTo(target);
  };

  const indexOfSlide = (target: EventTarget | null) => {
    const el = trackRef.current;
    const slide = (target as HTMLElement | null)?.closest?.('.founder-slide');
    if (!el || !slide) return -1;
    return Array.from(el.querySelectorAll('.founder-slide')).indexOf(slide);
  };

  /* A back card is mostly covered, so a click on the sliver means "bring this
     forward", not "open LinkedIn". Modified clicks still follow the link, so
     open-in-new-tab keeps working. */
  const onClick = (e: React.MouseEvent) => {
    if (draggedRef.current) { e.preventDefault(); return; }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const i = indexOfSlide(e.target);
    if (i !== -1 && i !== active) { e.preventDefault(); goTo(i); }
  };

  /* Tabbing into a back card brings it forward too, so keyboard users read the
     card they have landed on rather than one hidden behind another. */
  const onFocus = (e: React.FocusEvent) => {
    const i = indexOfSlide(e.target);
    if (i !== -1 && i !== active) goTo(i);
  };

  /* The deck no longer scrolls, so the arrow keys the scroll container used to
     handle have to be handled here. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
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
          aria-roledescription="carousel"
          aria-label="Co-founders and delivery team"
          onClick={onClick}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {founders.map((f, i) => (
            <div className="founder-slide" key={f.slug}><div className="founder-depth">
              <a
                href={f.linkedin}
                target="_blank"
                rel="noopener"
                draggable={false}
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
            control, so they wait for hydration; the row scrolls without them.
            Neither arrow is ever disabled, because the deck loops. */}
        {hydrated && (
          <div className="founders-controls">
            <div className="founders-dots" role="group" aria-label="Choose a card">
              {Array.from({ length: n }, (_, i) => (
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
              <button type="button" className="founders-nav" aria-label="Previous" onClick={() => step(-1)}>
                <span aria-hidden="true">&#8592;</span>
              </button>
              <button type="button" className="founders-nav" aria-label="Next" onClick={() => step(1)}>
                <span aria-hidden="true">&#8594;</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
