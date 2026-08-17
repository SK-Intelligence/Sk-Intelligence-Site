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

    setArmed(true);
    const dashes = gsap.utils.toArray<HTMLElement>('.process-progress .dash', section);
    const ghosts = gsap.utils.toArray<HTMLElement>('.process-ghost span', section);

    gsap.set(panels, { autoAlpha: 0, y: 40 });
    gsap.set(panels[0], { autoAlpha: 1, y: 0 });

    const setPhase = (i: number) => {
      dashes.forEach((d, di) => d.classList.toggle('is-active', di === i));
      ghosts.forEach((g, gi) => g.classList.toggle('is-ghost-active', gi === i));
    };

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: '+=220%', scrub: 0.6, pin: sticky, anticipatePin: 1 },
    });

    panels.forEach((panel, i) => {
      if (i === 0) return;
      tl.to(panels[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 })
        .to(panel, { autoAlpha: 1, y: 0, duration: 0.4, onStart: () => setPhase(i), onReverseComplete: () => setPhase(i - 1) }, '<');
    });

    return () => setArmed(false);
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
