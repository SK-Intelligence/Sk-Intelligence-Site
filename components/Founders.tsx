'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { deliveryTeam, founders } from '@/lib/content';

/**
 * Co-founders as a sliding carousel.
 *
 * The slider is NATIVE overflow scrolling with CSS scroll snapping, not a JS
 * transform track. That choice is the whole progressive-enhancement story: with
 * JavaScript off the strip is still swipeable, still keyboard scrollable and
 * every card is still reachable, because the browser is doing the work. The
 * arrows and dots below are pure enhancement and only render once hydrated, so
 * nobody is offered a control that cannot function.
 *
 * Each founder card is a link to their LinkedIn. The delivery team card is not
 * a person, so it is a plain article with no portrait and no link.
 */
export function Founders() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(0);
  const count = founders.length + 1;

  useEffect(() => setHydrated(true), []);

  /* Which card is centred is derived from scroll position rather than tracked
     in state, so a swipe, a keyboard scroll and an arrow press all agree. */
  const syncActive = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.founder-slide'));
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncActive();
    el.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive);
    return () => {
      el.removeEventListener('scroll', syncActive);
      window.removeEventListener('resize', syncActive);
    };
  }, [syncActive]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>('.founder-slide')[i];
    if (!card) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: card.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };

  const step = (dir: -1 | 1) => goTo(Math.min(count - 1, Math.max(0, active + dir)));

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
        >
          {founders.map((f, i) => (
            <a
              key={f.slug}
              href={f.linkedin}
              target="_blank"
              rel="noopener"
              aria-label={`${f.name} on LinkedIn`}
              className="founder-card founder-slide glass"
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
          ))}

          <article
            className="founder-card founder-slide is-team glass"
            data-reveal
            style={{ '--d': 3 } as React.CSSProperties}
          >
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
        </div>

        {/* Enhancement only. Rendering these without JS would offer a dead
            control, so they wait for hydration; the strip scrolls without them. */}
        {hydrated && (
          <div className="founders-controls">
            <div className="founders-dots" role="tablist" aria-label="Choose a card">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
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
