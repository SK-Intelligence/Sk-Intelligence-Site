'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { phases } from '@/lib/content';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Pinned Discover -> Build -> Forward-Deploy scrub.
 *
 * `process-js` is only added once the animation is actually wired, so if GSAP
 * or ScrollTrigger fails to load the section stays in its stacked, fully
 * readable default instead of leaving two of three steps invisible forever.
 * useGSAP handles StrictMode double-invocation and reverts on unmount.
 */
export function Process() {
  const scope = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  useGSAP(() => {
    const section = scope.current;
    const sticky = section?.querySelector('.process-sticky');
    const panels = gsap.utils.toArray<HTMLElement>('.process-panel', section);
    if (!section || !sticky || !panels.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /**
     * The same scrub on both, at two different lengths.
     *
     * 1af81c3 made this desktop-only after measuring what the desktop values
     * did to a phone: the pin held one panel for 220% of the viewport height,
     * the panel filled the top half of a tall screen, and you scrolled roughly
     * three screens past the same view before anything changed. That was a real
     * regression and the reason for the breakpoint.
     *
     * The fault was the LENGTH, not the effect. 220% of a 900px desktop is
     * ~1980px of scroll for two cross-fades; 220% of an 844px phone is nearly
     * the same distance through a viewport showing less at a time, so each
     * transition is spread over far more thumb travel. A phone gets 110%, which
     * is roughly a screen and a half for the whole sequence and reads as
     * continuous rather than stalled.
     *
     * gsap.matchMedia re-evaluates on resize and reverts what each matcher set,
     * so rotating the phone or dragging the window across 900px is clean and
     * never leaves two panels invisible.
     */
    const dashes = gsap.utils.toArray<HTMLElement>('.process-progress .dash', section);
    const ghosts = gsap.utils.toArray<HTMLElement>('.process-ghost span', section);

    const build = (end: string) => () => {
      setArmed(true);

      gsap.set(panels, { autoAlpha: 0, y: 40 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });

      const setPhase = (i: number) => {
        dashes.forEach((d, di) => d.classList.toggle('is-active', di === i));
        ghosts.forEach((g, gi) => g.classList.toggle('is-ghost-active', gi === i));
      };

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top top', end, scrub: 0.6, pin: sticky, anticipatePin: 1 },
      });

      panels.forEach((panel, i) => {
        if (i === 0) return;
        tl.to(panels[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 })
          .to(panel, { autoAlpha: 1, y: 0, duration: 0.4, onStart: () => setPhase(i), onReverseComplete: () => setPhase(i - 1) }, '<');
      });

      // Runs when the query stops matching, so crossing the breakpoint puts the
      // panels back to full strength rather than leaving two invisible.
      return () => setArmed(false);
    };

    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', build('+=220%'));
    mm.add('(max-width: 900px)', build('+=110%'));

    return () => mm.revert();
  }, { scope });

  return (
    <section className={`process-section${armed ? ' process-js' : ''}`} id="process" ref={scope}>
      <div className="process-sticky">
        <div className="process-ghost" aria-hidden="true">
          {phases.map((p, i) => (
            <span key={p.title} data-ghost={i} className={i === 0 ? 'is-ghost-active' : undefined}>{p.ghost}</span>
          ))}
        </div>
        <div className="container process-head">
          <p className="eyebrow" style={{ justifyContent: 'center' }}>How an engagement runs</p>
          <h2 className="visually-hidden">How an engagement runs</h2>
          <div className="process-progress">
            {phases.map((p, i) => (
              <span key={p.title} className={`dash${i === 0 ? ' is-active' : ''}`} data-dash={i} />
            ))}
          </div>
        </div>
        <div className="container">
          <div className="process-panels" id="processPanels">
            {phases.map((p, i) => (
              <div key={p.title} className="process-panel" data-phase={i}>
                <p className="process-index">{p.index}</p>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
