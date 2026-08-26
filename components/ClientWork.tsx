'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clients, PLACEHOLDER_METRICS } from '@/lib/content';
import { Lightbox } from './Lightbox';

/**
 * A client's own logo, or a drawn mark for the one build that has no client.
 *
 * The four logos are real marks belonging to real companies. Provena AI has no
 * client and therefore no mark to borrow, so rather than inventing one it gets
 * provenance drawn directly: two records chaining down into a third sealed
 * inside a ring. Same idiom as the delivery-team mark on the founder cards.
 */
function ClientMark({ logo, name, size }: { logo: string | null; name: string; size: number }) {
  if (logo) return <Image src={logo} alt={name ? `${name} logo` : ''} width={84} height={84} />;
  return (
    <svg viewBox="0 0 40 40" className="client-mark" fill="none" aria-hidden="true" width={size} height={size}>
      <circle cx="11.5" cy="10" r="3.6" />
      <circle cx="20" cy="18" r="3.6" />
      <path d="M14.1 12.4 L17.4 15.6" />
      <path d="M22.6 20.4 L24.6 22.3" />
      <circle cx="27.5" cy="27" r="6.2" />
      <circle cx="27.5" cy="27" r="2.3" />
    </svg>
  );
}

/**
 * Tabbed client work.
 *
 * Two bugs from the static build are fixed here by construction rather than by
 * patching, so they cannot come back:
 *   - the indicator tracks the selected tab's own row. `.tabs` wraps to 2-3 rows
 *     below ~900px, and pinning the underline to the bottom of the whole list
 *     drew it under a different client's tab.
 *   - React owns which panel is visible, so a fast keyboard repeat can never
 *     leave several panels shown at once or desynced from the selected tab.
 *
 * Progressive enhancement: with JS off this component never hydrates, so the
 * server-rendered markup shows every panel and carries no tab ARIA — nothing
 * announces a selection state that isn't real.
 */
export function ClientWork() {
  const [active, setActive] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  /** Which screenshot each client is showing. Kept per client so switching
   *  tabs and coming back does not silently reset what you were looking at. */
  const [shotIndex, setShotIndex] = useState<number[]>(() => clients.map(() => 0));
  const [zoomed, setZoomed] = useState(false);
  const [indicator, setIndicator] = useState<{ width: number; x: number; top: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => setHydrated(true), []);

  const measure = useCallback(() => {
    const list = listRef.current;
    const tab = tabRefs.current[active];
    if (!list || !tab) return;
    const l = list.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    // The strip scrolls horizontally on small screens, so offset by scrollLeft:
    // without it the underline drifts away from its tab as soon as you scroll.
    setIndicator({
      width: t.width,
      x: t.left - l.left + list.scrollLeft,
      top: t.bottom - l.top - 2,
    });
  }, [active]);

  useEffect(() => {
    measure();
    const list = listRef.current;
    const ro = new ResizeObserver(measure);
    if (list) ro.observe(list);
    window.addEventListener('resize', measure);
    list?.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      list?.removeEventListener('scroll', measure);
    };
  }, [measure]);

  // Bring the selected tab into view on a narrow, scrollable strip.
  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pickShot = useCallback((client: number, shot: number) => {
    setShotIndex((prev) => prev.map((v, i) => (i === client ? shot : v)));
    // Start a new screenshot at its left edge rather than wherever the last
    // one happened to be scrolled to.
    scrollRefs.current[client]?.scrollTo({ left: 0 });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = clients.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    if (e.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (next !== null) {
      e.preventDefault();
      setActive(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section className="section-pad" id="work" style={{ background: 'var(--surface-alt)' }}>
      <div className="container">
        <div className="section-head" data-reveal>
          {/* "Client work" until Provena joined the strip. Four of the five are
              client work and one is a platform with no client behind it, so the
              heading no longer asserts what it cannot for all of them. */}
          <p className="eyebrow">Work</p>
          <h2>Five builds, still running.</h2>
          <p>
            A tyre lookup that reads DVLA records. A shop that takes payments. A garage&rsquo;s
            first website. Company email for a growing team. A compliance platform that reads
            an AI stack and produces the binder an auditor asks for.
          </p>
          <div className="client-logo-rail" aria-hidden="true">
            {clients.map((c) => (
              <span key={c.id} className="client-chip">
                <ClientMark logo={c.logo} name="" size={34} />
              </span>
            ))}
          </div>
        </div>

        <div>
          <div
            className="tabs"
            id="tabList"
            ref={listRef}
            {...(hydrated ? { role: 'tablist', 'aria-label': 'Client testimonials' } : {})}
          >
            <div
              className="tab-indicator"
              id="tabIndicator"
              role="presentation"
              aria-hidden="true"
              style={indicator ? { width: indicator.width, transform: `translateX(${indicator.x}px)`, top: indicator.top } : undefined}
            />
            {clients.map((c, i) => (
              <button
                key={c.id}
                className="tab"
                id={`tab-${i}`}
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                tabIndex={hydrated ? (i === active ? 0 : -1) : undefined}
                {...(hydrated ? { role: 'tab', 'aria-selected': i === active, 'aria-controls': `panel-${i}` } : {})}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className={`tab-panels${hydrated ? ' js-tabs' : ''}`} id="tabPanels">
            {clients.map((c, i) => {
              const shot = c.shots[shotIndex[i]];
              return (
                <div
                  key={c.id}
                  className="panel"
                  id={`panel-${i}`}
                  {...(hydrated ? { role: 'tabpanel', 'aria-labelledby': `tab-${i}` } : {})}
                  {...(!hydrated || i === active ? { 'data-active': '' } : {})}
                >
                  <div className="client-showcase">
                    <div className="showcase-frame">
                      <div className="showcase-chrome" aria-hidden="true">
                        <span className="showcase-dots"><i /><i /><i /></span>
                        <span className="showcase-label">{c.name} &middot; {shot.label}</span>
                      </div>
                      {/* The whole shot fits this frame at every width, phone
                          included: seeing the build as a page is what this
                          frame is for. Reading the text in it is the
                          lightbox's job — see globals.css. */}
                      <div
                        className="showcase-scroll"
                        ref={(el) => { scrollRefs.current[i] = el; }}
                      >
                        {/* Without JS this is a plain image with no affordance
                            claiming otherwise; the button only exists once the
                            viewer it opens can actually run. */}
                        {hydrated ? (
                          <button
                            type="button"
                            className="showcase-open"
                            onClick={() => setZoomed(true)}
                            aria-label={`View ${c.name} screenshots full size`}
                          >
                            <Image
                              src={shot.src} alt={shot.alt} width={1280} height={760}
                              sizes="(max-width: 900px) 1180px, 1100px"
                            />
                          </button>
                        ) : (
                          <Image
                            src={shot.src} alt={shot.alt} width={1280} height={760}
                            sizes="(max-width: 900px) 1180px, 1100px"
                          />
                        )}
                      </div>
                      <p className="showcase-hint" aria-hidden="true">
                        Tap to open full size
                      </p>
                    </div>

                    {c.shots.length > 1 && (
                      <div className="client-shots">
                        {c.shots.map((s, j) => (
                          <button
                            key={s.src}
                            type="button"
                            className="client-shot"
                            onClick={() => pickShot(i, j)}
                            aria-pressed={j === shotIndex[i]}
                            data-on={j === shotIndex[i] ? '' : undefined}
                          >
                            <Image src={s.src} alt="" width={1280} height={760} sizes="150px" />
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="panel-meta">
                    <span className="client-chip">
                      <ClientMark logo={c.logo} name={c.name} size={56} />
                    </span>
                    <p className="client-sector">{c.sector}</p>
                    <h3 className="client-name">{c.name}</h3>
                    <p className="client-work">{c.outcome}</p>
                    <dl className="client-metrics">
                      {PLACEHOLDER_METRICS[c.id].map((m) => (
                        <div key={m.label}>
                          <dt>{m.value}</dt>
                          <dd>{m.label}</dd>
                        </div>
                      ))}
                    </dl>
                    <ul className="client-detail">
                      {c.detail.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </div>

                  {/* Only where there is a client to quote. Provena has none, so
                      this block is absent rather than filled: a testimonial
                      attributed to a company that does not exist would be a
                      fabricated endorsement sitting beside four real ones.
                      tests/e2e.mjs asserts exactly four of the five carry it. */}
                  {c.quote && (
                    <figure className="panel-quote">
                      <blockquote>{c.quote}&rdquo;</blockquote>
                      <figcaption>{c.name}</figcaption>
                    </figure>
                  )}
                </div>
              );
            })}
          </div>

          {zoomed && (
            <Lightbox
              shots={clients[active].shots}
              index={shotIndex[active]}
              clientName={clients[active].name}
              onIndex={(j) => pickShot(active, j)}
              onClose={() => setZoomed(false)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
