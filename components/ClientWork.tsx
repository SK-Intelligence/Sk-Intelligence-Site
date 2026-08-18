'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clients } from '@/lib/content';

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
          <p className="eyebrow">Client work</p>
          <h2>Four companies. Real work, real words.</h2>
          <p>
            Email infrastructure, a first-ever website, a vehicle-lookup integration and a full
            storefront &mdash; each one still running.
          </p>
          <div className="client-logo-rail" aria-hidden="true">
            {clients.map((c) => (
              <span key={c.id} className="client-chip">
                <Image src={c.logo} alt="" width={84} height={84} />
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
            {clients.map((c, i) => (
              <div
                key={c.id}
                className="panel"
                id={`panel-${i}`}
                {...(hydrated ? { role: 'tabpanel', 'aria-labelledby': `tab-${i}` } : {})}
                {...(!hydrated || i === active ? { 'data-active': '' } : {})}
              >
                <div className="panel-meta">
                  <span className="client-chip">
                    <Image src={c.logo} alt={`${c.name} logo`} width={84} height={84} />
                  </span>
                  <h3 className="client-name">{c.name}</h3>
                  <p className="client-work">{c.work}</p>
                  <ul className="client-detail">
                    {c.detail.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  <a href={c.url} target="_blank" rel="noopener">{c.urlLabel} &#8599;</a>
                </div>
                <figure className="panel-quote">
                  <blockquote>{c.quote}&rdquo;</blockquote>
                  <figcaption>{c.name}</figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
