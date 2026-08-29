'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { clients, PLACEHOLDER_METRICS, type Client } from '@/lib/content';
import { Lightbox } from './Lightbox';
import { CaseDialog } from './CaseDialog';

/**
 * Where each logo sits in the constellation, as a -1..1 offset from the centre
 * on each axis. CSS turns that into a position that can never leave the
 * container — see `.tabs.is-orbit .tab` in globals.css.
 *
 * Computed rather than hand-placed so a seventh build lands somewhere sensible
 * on its own, and computed from the INDEX rather than Math.random because this
 * renders on the server too: a random layout would differ between the server
 * and the browser and React would throw a hydration mismatch.
 *
 * The offsets describe TRUE CIRCLES, and that is a requirement rather than a
 * preference now that the field rotates. An earlier version normalised each
 * axis to fill the square box, which packed the marks in nicely but put the
 * extreme ones at the corners — and a corner is further from the centre than an
 * edge, so rotating that arrangement swings those marks straight out of the
 * field. On a circle every mark keeps its distance from the centre for the
 * whole revolution, so what is contained standing still stays contained moving.
 *
 * Two things stop it reading as a clock face. The radius alternates between an
 * inner and an outer ring, and every third mark is nudged off its exact spoke.
 * Six marks on one evenly-divided circle is a dial; two loose rings is a
 * constellation.
 *
 * The nudges are not free-form. An earlier set pushed mark 0 into mark 5 —
 * which is the 2.35:1 wordmark and more than twice the width of the others —
 * and the two boxes overlapped by 21x55px on a phone. Nothing looked obviously
 * wrong; what happened is that the wide mark sat on top of its neighbour and
 * swallowed every tap meant for it.
 *
 * These values come from an exhaustive search over both rings and all three
 * nudges. They clear by 10.9px at 320px, which is the worst case, and by
 * considerably more everywhere else. Only the DIFFERENCES between the three
 * nudges matter: a value common to all three is a rotation of the whole
 * arrangement, and this arrangement rotates anyway.
 *
 * What the search optimises is the part worth writing down. Scoring clearance
 * alone gave two bad answers in a row. First it pushed both rings out to the
 * rim, 0.85 and 0.92, because marks are furthest apart there — a ring with a
 * hole punched through it, every logo in a narrow band at the edge and the
 * middle two-fifths of the field empty. Then, with the inner ring forced in, it
 * spent the freedom it had left on lopsided nudges and produced two tight pairs
 * and two gaps, clustered off to one side. Both scored well. Both looked like
 * an accident.
 *
 * So the search now rejects any arrangement whose centre of mass sits more than
 * 5% of the radius off centre, or whose widest and narrowest angular gaps
 * differ by more than about 43 degrees, and maximises clearance among what
 * survives. That costs real clearance — 18px down to 11px — and it is worth it:
 * relaxing the inner ring all the way back out only buys a further 1px, which
 * means the binding constraint is angular rather than radial. There is nothing
 * to be had by flattening the cluster again.
 *
 * This is tuned for six marks with the wide one last, not solved in general. A
 * seventh build, or moving the wordmark, can collide again — so the guarantee
 * lives in tests/e2e.mjs, which checks real rectangle intersection at four
 * phone widths and on desktop and names the offending pair. Change these
 * numbers and run that, rather than trusting the picture.
 */
const RING = [0.65, 1] as const;
const NUDGE = [0.16, 0.02, -0.06] as const;

/** How far a mark drifts from its place, in pixels. Mirrored as `--d` in
 *  globals.css, which insets every mark from the field edge by this much so a
 *  drifting chip still cannot leave it. Change one, change the other.
 *
 *  Small on purpose. The drift used to be the only movement in the section and
 *  was sized to carry it; the field turns now, so this is seasoning on top and
 *  a large amplitude buys nothing but collisions. Every pixel of it comes off
 *  the clearance between neighbours twice over — two marks drifting towards
 *  each other close the gap at double the rate — and at 320px, where six marks
 *  and a double-width wordmark share a 294px field, that is the difference
 *  between 18px of clearance and 6px. */
const DRIFT = { x: 3, y: 4 } as const;

const ORBIT = clients.map((_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / clients.length + NUDGE[i % 3];
  const r = RING[i % 2];
  return { ox: Math.cos(a) * r, oy: Math.sin(a) * r, ring: i % 2 ? 'out' : 'in' };
});

/** Seconds for one full revolution of the field. Slow enough to be a drift
 *  rather than a carousel, fast enough that you can see it is moving without
 *  waiting for it — about a degree every fifth of a second. */
const SPIN = 72;

/* Wide wordmarks get a wider box. Every logo here but one is roughly square;
   Peshawri's is 2.35:1, and in the square chip the others use it renders about
   36x17 and cannot be read. Driven off the id rather than measuring the image,
   because the layout has to be right on the first paint and the natural size is
   not known until the file decodes. */
const WIDE = new Set(['peshawari']);

/**
 * A client's own logo, or a drawn mark for the one build that has no client.
 *
 * Five of the six logos are real marks belonging to real companies. Provena AI
 * has no client and therefore no mark to borrow, so rather than inventing one it
 * gets provenance drawn directly: two records chaining down into a third sealed
 * inside a ring. Same idiom as the delivery-team mark on the founder cards.
 */
function ClientMark({ logo, name, size }: { logo: string | null; name: string; size: number }) {
  if (logo) return <Image src={logo} alt={name ? `${name} logo` : ''} width={168} height={168} />;
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
 * One build's case study.
 *
 * Rendered in two places from this one definition: inside the dialog once a
 * mark has been picked, and inline for every build at once when JavaScript
 * never runs. Writing it twice is how the no-JS copy quietly falls behind.
 */
function CasePanel({
  c, index, shot, hydrated, onPickShot, onZoom, scrollRef,
}: {
  c: Client;
  index: number;
  shot: number;
  hydrated: boolean;
  onPickShot: (client: number, shot: number) => void;
  onZoom: () => void;
  scrollRef: (el: HTMLDivElement | null) => void;
}) {
  const current = c.shots[shot];
  return (
    <div className="panel" id={`panel-${index}`} data-active="">
      {/* The name and sector lead the panel, and this is the only place they
          appear. The dialog's bar carried them too for a while and it read as
          the same words twice within an inch; the bar is just a way out now,
          and the dialog is labelled for assistive tech by aria-label. */}
      <div className="panel-head">
        <p className="client-sector">{c.sector}</p>
        <h3 className="client-name">{c.name}</h3>
      </div>

      <div className="client-showcase">
        <div className="showcase-frame">
          <div className="showcase-chrome" aria-hidden="true">
            <span className="showcase-dots"><i /><i /><i /></span>
            <span className="showcase-label">{c.name} &middot; {current.label}</span>
          </div>
          {/* The whole shot fits this frame at every width, phone included:
              seeing the build as a page is what this frame is for. Reading the
              text in it is the lightbox's job — see globals.css. */}
          <div className="showcase-scroll" ref={scrollRef}>
            {/* Without JS this is a plain image with no affordance claiming
                otherwise; the button only exists once the viewer it opens can
                actually run. */}
            {hydrated ? (
              <button
                type="button"
                className="showcase-open"
                onClick={onZoom}
                aria-label={`View ${c.name} screenshots full size`}
              >
                <Image
                  src={current.src} alt={current.alt} width={1280} height={760}
                  sizes="(max-width: 900px) 1180px, 1100px"
                />
              </button>
            ) : (
              <Image
                src={current.src} alt={current.alt} width={1280} height={760}
                sizes="(max-width: 900px) 1180px, 1100px"
              />
            )}
          </div>
          {/* Gated exactly like the button above it. This shows at 900px and
              under, so with JS off a phone was being told to tap an image that
              is not a control and does not open anything. */}
          {hydrated && <p className="showcase-hint" aria-hidden="true">Tap to open full size</p>}
        </div>

        {c.shots.length > 1 && (
          <div className="client-shots">
            {c.shots.map((s, j) => (
              <button
                key={s.src}
                type="button"
                className="client-shot"
                onClick={() => onPickShot(index, j)}
                aria-pressed={j === shot}
                data-on={j === shot ? '' : undefined}
              >
                <Image src={s.src} alt="" width={1280} height={760} sizes="150px" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No logo here: the chip is the control that opened this, and repeating
          it inside said nothing twice. */}
      <div className="panel-meta">
        {/* Three questions in the order a reader deciding whether to call
            actually asks them. The metrics below are the evidence for the
            third, so they sit directly under it rather than floating between
            sections. */}
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
              {/* Nested inside the answer, not placed after the list. These
                  numbers are the evidence for this one claim, and on the panel
                  with no quote the meta column flows into two, which floated
                  them up beside "Asked for" and detached them from the thing
                  they are evidence of. */}
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
        {/* Folded away by default. What the build DOES is the outcome line and
            the numbers above; this is the implementation, which is worth having
            but not worth spending the reader's first ten seconds on.

            A native <details> rather than a hook: it opens with JS off, is a
            real disclosure widget to a screen reader, and is findable by in-page
            search in browsers that support it. None of that is true of a
            useState toggle. */}
        <details className="client-more">
          <summary>What was built</summary>
          <ul className="client-detail">
            {c.detail.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </details>
      </div>

      {/* Only where a real client has given real words. Provena has no client at
          all and Peshawri has not been asked yet, so both omit this block rather
          than filling it: a testimonial attributed to a company that did not
          give one is a fabricated endorsement sitting beside four real ones.
          tests/e2e.mjs asserts exactly four of the six carry it. */}
      {c.quote && (
        <figure className="panel-quote">
          <blockquote>{c.quote}&rdquo;</blockquote>
          <figcaption>{c.name}</figcaption>
        </figure>
      )}
    </div>
  );
}

/**
 * Client work, picked out of a slowly turning constellation of logos.
 *
 * The section used to open with a row of logos above a case study that was
 * always already open on the first build. That row read as a filter bar rather
 * than as a body of work, and it got worse with each build added to it.
 *
 * Now the section holds one thing: six marks turning in a field. Picking one
 * opens its case study over the top; closing it puts you back in the field,
 * still turning. Picking another opens that one. There is no state in which
 * everything is on screen at once, which is the whole point — the reader looks
 * at one build at a time and chooses the next themselves.
 *
 * The case study is a real modal dialog rather than a panel that pushes the
 * page around, so opening one does not move the constellation the reader is
 * about to come back to, and the platform handles focus, Esc and the inert
 * background rather than this component pretending to.
 *
 * Progressive enhancement: with JS off this never hydrates, so the
 * server-rendered markup is a plain readable row of logos above every case
 * study in full, with no orbit positioning and nothing claiming to open a
 * dialog that cannot open. Nothing that needs JavaScript to be true is asserted
 * before JavaScript has run.
 */
export function ClientWork() {
  /** Which build's case study is open, or null for the constellation. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  /** Which screenshot each client is showing. Kept per client so opening a
   *  build again does not silently reset what you were looking at. */
  const [shotIndex, setShotIndex] = useState<number[]>(() => clients.map(() => 0));
  const [zoomed, setZoomed] = useState(false);
  const scope = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => setHydrated(true), []);

  const pickShot = useCallback((client: number, shot: number) => {
    setShotIndex((prev) => prev.map((v, i) => (i === client ? shot : v)));
    // Start a new screenshot at its left edge rather than wherever the last one
    // happened to be scrolled to.
    scrollRefs.current[client]?.scrollTo({ left: 0 });
  }, []);

  const open = openIndex !== null;
  /* Read by the pause check inside the rotation effect, which is built once and
     must not be rebuilt when this changes — see the note on that effect. */
  const openRef = useRef(open);
  openRef.current = open;
  const syncRef = useRef<() => void>(() => {});

  /**
   * The turn, and the drift.
   *
   * The field rotates as one, and each mark counter-rotates by exactly as much
   * so the logos stay upright while their positions travel. Both are linear and
   * share a duration, so they cannot fall out of phase however long the page is
   * left open. Rotating each mark around the centre individually would need the
   * same maths written twice and would drift apart the moment either tween was
   * retimed.
   *
   * On top of that, each mark drifts a few pixels on its own cycle, seeded to a
   * different point so the six never breathe together. They are six independent
   * root tweens rather than children of one timeline: a timeline child has no
   * playhead of its own, so `add(t, 0)` throws the seeded progress away on the
   * parent's next tick and every mark starts at the top of its cycle together —
   * which is the mechanical look the seeding exists to prevent.
   *
   * Everything hangs on `.chip-drift`, one element in from the button. The chip
   * inside it keeps its own transform for the ring depth and the hover lift,
   * and that separation is load-bearing: GSAP writes `translate`, `rotate` and
   * `scale` to `none` alongside its own `transform`, so a stylesheet rule aimed
   * at the same element loses silently and looks like nothing at all.
   *
   * Held still on hover and on keyboard focus — a mark you are trying to click
   * should not be moving — and while a case study is open, where it is behind a
   * backdrop and would only be burning frames. Not created under reduced
   * motion: the constellation still lays out, it simply holds still, which is
   * what reduced motion asks for rather than a different layout.
   *
   * Built ONCE, on hydration, and deliberately not keyed on `open`. It was, and
   * the cost was the thing this section is for: opening a build tore the tweens
   * down, and the cleanup's `clearProps` stripped the field's transform, so the
   * whole constellation snapped from wherever it had turned to back to zero in
   * the frame before the dialog painted — visible through the backdrop, which
   * is only 72% opaque — and the reader came back to a different arrangement
   * from the one they left. Measured 33 degrees to 0 on a click. Pausing is a
   * state change, not a reason to rebuild thirteen tweens, so `open` is read
   * through a ref and applied by the small effect below.
   */
  useLayoutEffect(() => {
    if (!hydrated) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const field = scope.current?.querySelector<HTMLElement>('.tabs');
    const chips = gsap.utils.toArray<HTMLElement>('.tab .chip-drift', scope.current);
    if (!field || !chips.length) return;

    const all: gsap.core.Tween[] = [
      gsap.to(field, { rotation: 360, duration: SPIN, ease: 'none', repeat: -1 }),
      ...chips.map((chip) => gsap.to(chip, { rotation: -360, duration: SPIN, ease: 'none', repeat: -1 })),
      ...chips.map((chip, i) => {
        const t = gsap.to(chip, {
          y: i % 2 ? DRIFT.y : -DRIFT.y,
          x: i % 3 === 0 ? DRIFT.x : -DRIFT.x,
          duration: 14 + (i * 8) / chips.length,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
        t.progress(i / chips.length);
        return t;
      }),
    ];

    /* Asked each time, rather than inferred from whichever event just fired.

       `mouseenter` only fires when the pointer CROSSES the boundary, so a
       cursor already resting on the constellation when this effect builds its
       tweens never triggers one — and that is every close, because the pointer
       is on the field, that being what it just clicked. The field would start
       turning again underneath a stationary cursor and keep turning until it
       was moved out and back in. Reading the state covers that; the listeners
       then handle every crossing after it.

       `:focus-visible` rather than plain focus, and that distinction is the
       whole reason this is not `contains(activeElement)`. Closing hands focus
       back to the mark that opened it, for a mouse user as much as a keyboard
       one, so a blanket focus-pause would leave the section frozen from the
       first case study onwards for most readers, with no way back short of
       clicking somewhere else. Only a keyboard reader — focus ring showing,
       stepping between marks — gets it held still. */
    /* `(hover: hover)` gates the pointer half. A touch browser synthesises
       `:hover` on tap and leaves it on the last thing tapped, with no
       mouseleave until something else is tapped — so on a phone the field would
       stop the first time a mark was tapped and stay stopped, which is the
       opposite of what a reader who just came back from a case study expects to
       see. Keyboard focus still holds it still everywhere. */
    const canHover = window.matchMedia('(hover: hover)').matches;
    const sync = () => {
      const held = openRef.current
        || (canHover && field.matches(':hover'))
        || !!field.querySelector(':focus-visible');
      all.forEach((t) => (held ? t.pause() : t.play()));
    };
    syncRef.current = sync;
    sync();
    field.addEventListener('mouseenter', sync);
    field.addEventListener('mouseleave', sync);
    field.addEventListener('focusin', sync);
    field.addEventListener('focusout', sync);

    return () => {
      // Killed explicitly, because a surviving tween would go on writing
      // transforms to the very marks the next render is trying to place.
      all.forEach((t) => t.kill());
      // ...and the rotation has to be wound back off the elements it was
      // written to, or the field stays frozen at whatever angle it had reached
      // and the marks sit at that angle for good.
      gsap.set([field, ...chips], { clearProps: 'transform' });
      syncRef.current = () => {};
      field.removeEventListener('mouseenter', sync);
      field.removeEventListener('mouseleave', sync);
      field.removeEventListener('focusin', sync);
      field.removeEventListener('focusout', sync);
    };
  }, [hydrated]);

  /* Opening and closing only changes whether the field is held, so that is all
     this does. It is the whole reason the effect above no longer lists `open`
     among its dependencies. */
  useEffect(() => { syncRef.current(); }, [open]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    // Arrows walk the constellation. They move focus and nothing else — opening
    // is what the click is for, and Enter or Space on a button already fires
    // one. Home and End are the page's keys and stay the page's: this is a
    // group of buttons, not a tablist, and hijacking them buys nothing.
    const last = clients.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1;
    if (next !== null) {
      e.preventDefault();
      tabRefs.current[next]?.focus();
    }
  };

  const c = openIndex === null ? null : clients[openIndex];

  return (
    /* The heading above the field is left exactly as it is everywhere else on
       the page. A centred one over the centred cluster was tried and is a
       change to a part of the section that did not need changing. */
    <section
      className="section-pad"
      id="work"
      style={{ background: 'var(--surface-alt)' }}
      ref={scope}
    >
      <div className="container">
        <div className="section-head" data-reveal>
          {/* "Client work" until Provena joined the strip. Five of the six are
              client work and one is a platform with no client behind it, so the
              heading no longer asserts what it cannot for all of them. */}
          <p className="eyebrow">Work</p>
          {/* No count in it, deliberately. "Four builds, still running" had to
              be edited the moment a fifth arrived, and again at a sixth. */}
          <h2>What we&rsquo;ve shipped so far</h2>
          {/* Every other section head on the page carries a line under the
              heading; this one did not, and with the case studies moved into
              dialogs there was nothing else above the field to read. It says
              what the work IS rather than what to do with it — the instruction
              is already under the field, and repeating it here would be the
              same sentence twice on one screen. */}
          {/* No em dash: the suite holds the whole site to that, and it is
              right to. A full stop does the same work here. */}
          <p>
            Client sites, internal tools, and a platform of our own. Each one shipped
            end to end and still in service.
          </p>
        </div>

        <div>
          {/* Clips the field's corners.
              A rotated element contributes its ROTATED border box to its
              ancestors' scrollable overflow, and the diagonal of a square is
              41% longer than its side — so a 294px field on a 320px phone threw
              34px of horizontal scroll onto the page even though every mark was
              comfortably inside the circle and nothing was visibly out of
              place. The marks live on a circle inscribed in that square, so
              clipping to the square removes the corners and nothing else.
              Only while the field turns: with JS off this must not become a
              scroll container around the plain row. */}
          <div className={hydrated ? 'orbit-clip' : undefined}>
          <div
            className={`tabs${hydrated ? ' is-orbit' : ''}`}
            id="tabList"
            {...(hydrated ? { role: 'group', 'aria-label': 'Our builds' } : {})}
          >
            {clients.map((client, i) => (
              <button
                key={client.id}
                className="tab"
                id={`tab-${i}`}
                type="button"
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={() => setOpenIndex(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                data-ring={hydrated ? ORBIT[i].ring : undefined}
                data-wide={WIDE.has(client.id) ? '' : undefined}
                style={hydrated
                  ? ({ '--ox': ORBIT[i].ox, '--oy': ORBIT[i].oy } as React.CSSProperties)
                  : undefined}
                {...(hydrated ? { 'aria-haspopup': 'dialog' as const } : {})}
              >
                {/* Three elements, three owners of a transform, none of them
                    sharing one. The button is the positioned box, this wrapper
                    carries the turn and the drift, and the chip's transform
                    stays the stylesheet's for the ring depth and the hover
                    lift. Collapsing any two together is what put the drift and
                    the hover on the same property, where the inline style GSAP
                    writes every frame silently won. */}
                <span className="chip-drift">
                  <span className="client-chip">
                    <ClientMark logo={client.logo} name="" size={30} />
                  </span>
                </span>
                {/* The button would otherwise be an unlabelled image to a screen
                    reader, and to Google. */}
                <span className="visually-hidden">{client.name}</span>
              </button>
            ))}
          </div>
          </div>

          {/* The one instruction the section needs. Only once JS can honour it —
              with JS off the case studies are already on the page and there is
              nothing to pick. */}
          {hydrated && (
            <p className="orbit-hint" aria-hidden="true">Pick a build</p>
          )}

          {/* With JS off, every case study in full. This is the whole content of
              the section for a reader without JavaScript, and it is why the
              markup above never claims to open anything. */}
          {!hydrated && (
            <div className="tab-panels" id="tabPanels">
              {clients.map((client, i) => (
                <CasePanel
                  key={client.id}
                  c={client}
                  index={i}
                  shot={shotIndex[i]}
                  hydrated={false}
                  onPickShot={pickShot}
                  onZoom={() => setZoomed(true)}
                  scrollRef={(el) => { scrollRefs.current[i] = el; }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {c && openIndex !== null && (
        <CaseDialog
          title={c.name}
          sector={c.sector}
          onClose={() => { setZoomed(false); setOpenIndex(null); }}
        >
          <CasePanel
            c={c}
            index={openIndex}
            shot={shotIndex[openIndex]}
            hydrated
            onPickShot={pickShot}
            onZoom={() => setZoomed(true)}
            scrollRef={(el) => { scrollRefs.current[openIndex] = el; }}
          />
        </CaseDialog>
      )}

      {zoomed && openIndex !== null && (
        <Lightbox
          shots={clients[openIndex].shots}
          index={shotIndex[openIndex]}
          clientName={clients[openIndex].name}
          onIndex={(j) => pickShot(openIndex, j)}
          onClose={() => setZoomed(false)}
        />
      )}
    </section>
  );
}
