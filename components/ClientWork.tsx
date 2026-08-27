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
 * Client work, picked by logo.
 *
 * The selector used to be a row of company names with a sliding underline
 * beneath them, sitting under a second, decorative row of the same companies'
 * logos. Two rows saying the same thing, and the section led with a wall of
 * text before you reached anything worth looking at. The logos ARE the control
 * now: one row, no duplicate, and a mark is quicker to recognise than its name.
 *
 * That deletes the underline and every line that positioned it — a measure
 * pass, a ResizeObserver and a scroll listener that existed because `.tabs`
 * wrapped to two or three rows below ~900px and a single underline pinned to
 * the bottom of the list would draw under the wrong company. A selected chip
 * marks itself, so none of that has to be true any more.
 *
 * What survives from that design, because it was load-bearing: React owns which
 * panel is visible, so a fast keyboard repeat cannot leave several panels shown
 * at once or desynced from the selection.
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
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => setHydrated(true), []);

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
          {/* No count in it, deliberately. "Four builds, still running" had to
              be edited the moment a fifth arrived, and would again at a sixth.
              The strip below already says how many there are. */}
          <h2>What we&rsquo;ve shipped so far</h2>
          {/* No deck paragraph. It named each build by trade, which the strip of
              logos and the panel under it then said again, at length and before
              you reached either. A section that shows five builds does not have
              to announce that it is about to. */}
        </div>

        <div>
          {/* One row, and it is the control rather than decoration. The name
              each logo stands for is not dropped, only moved: it is the
              accessible name of the button, and it appears in full at the top
              of the panel the moment you pick one. */}
          <div
            className="tabs"
            id="tabList"
            ref={listRef}
            {...(hydrated ? { role: 'tablist', 'aria-label': 'Choose a build' } : {})}
          >
            {clients.map((c, i) => (
              <button
                key={c.id}
                className="tab"
                id={`tab-${i}`}
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                tabIndex={hydrated ? (i === active ? 0 : -1) : undefined}
                data-on={hydrated && i === active ? '' : undefined}
                {...(hydrated ? { role: 'tab', 'aria-selected': i === active, 'aria-controls': `panel-${i}` } : {})}
              >
                <span className="client-chip">
                  <ClientMark logo={c.logo} name="" size={30} />
                </span>
                {/* The button would otherwise be an unlabelled image to a
                    screen reader, and to Google. */}
                <span className="visually-hidden">{c.name}</span>
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
                  {/* The name and sector lead the panel, directly under the row
                      of logos, so picking a mark names what you picked before
                      anything else loads into view. They used to sit below the
                      screenshot, which put the label a scroll away from the
                      control that set it. Rendered per panel rather than once
                      above the strip so the no-JS fallback, which shows every
                      panel at once, labels each of them. */}
                  <div className="panel-head">
                    <p className="client-sector">{c.sector}</p>
                    <h3 className="client-name">{c.name}</h3>
                  </div>

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

                  {/* No logo here any more: the chip is the control above, and
                      repeating it inside the panel it selected said nothing
                      twice. Name and sector have moved to .panel-head. */}
                  <div className="panel-meta">
                    {/* Three questions in the order a reader deciding whether to
                        call actually asks them. The metrics below are the
                        evidence for the third, so they sit directly under it
                        rather than floating between sections. */}
                    <dl className="client-qa">
                      <div>
                        <dt>Asked for</dt>
                        <dd>{c.asked}</dd>
                      </div>
                      <div>
                        <dt>Approach</dt>
                        <dd>{c.approach}</dd>
                      </div>
                      <div>
                        <dt>Impact</dt>
                        <dd>
                          {c.impact}
                          {/* Nested inside the answer, not placed after the
                              list. These numbers are the evidence for this one
                              claim, and on the panel with no quote the meta
                              column flows into two, which floated them up
                              beside "Asked for" and detached them from the
                              thing they are evidence of. */}
                          <dl className="client-metrics">
                            {PLACEHOLDER_METRICS[c.id].map((m) => (
                              <div key={m.label}>
                                <dt>{m.value}</dt>
                                <dd>{m.label}</dd>
                              </div>
                            ))}
                          </dl>
                        </dd>
                      </div>
                    </dl>
                    {/* Folded away by default. What the build DOES is the
                        outcome line and the numbers above; this is the
                        implementation, which is worth having but not worth
                        spending the reader's first ten seconds on.

                        A native <details> rather than a hook: it opens with JS
                        off, is a real disclosure widget to a screen reader, and
                        is findable by in-page search in browsers that support
                        it. None of that is true of a useState toggle. */}
                    <details className="client-more">
                      <summary>What was built</summary>
                      <ul className="client-detail">
                        {c.detail.map((d) => <li key={d}>{d}</li>)}
                      </ul>
                    </details>
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
