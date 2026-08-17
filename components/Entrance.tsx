'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * Nav fade plus the hero headline reveal. Purely additive — the finished state
 * is what CSS already renders, so with JS off or under reduced motion nothing
 * is hidden. Beats start immediately; there is no curtain to wait for.
 */
export function Entrance() {
  const scope = useRef<HTMLElement | null>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const nav = document.getElementById('siteNav');
    const heroLines = gsap.utils.toArray<HTMLElement>('.hero-head .h-line-inner');
    if (nav) gsap.set(nav, { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (nav) tl.to(nav, { opacity: 1, duration: 0.5 }, 0.1);

    if (heroLines.length) {
      const eyebrow = document.querySelector('.hero-copy .eyebrow');
      const sub = document.querySelector('.hero-copy .hero-sub');
      const actions = document.querySelector('.hero-copy .hero-actions');
      const proof = document.querySelector('.hero-copy .hero-proof');
      gsap.set(eyebrow, { opacity: 0, y: 10 });
      gsap.set(heroLines, { yPercent: 112 });
      gsap.set([sub, actions, proof], { opacity: 0, y: 16 });
      tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5 }, 0.15)
        .to(heroLines, { yPercent: 0, duration: 0.85, stagger: 0.16 }, 0.3)
        .to(sub, { opacity: 1, y: 0, duration: 0.6 }, 0.6)
        .to(actions, { opacity: 1, y: 0, duration: 0.55 }, 0.75)
        .to(proof, { opacity: 1, y: 0, duration: 0.55 }, 0.9);
    } else {
      const bits = gsap.utils.toArray<HTMLElement>('.page-head [data-head-reveal]');
      if (bits.length) {
        gsap.set(bits, { opacity: 0, y: 18 });
        tl.to(bits, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.15);
      }
    }

    let skipped = false;
    const skip = () => { if (!skipped) { skipped = true; tl.progress(1); } };
    ['wheel', 'touchstart', 'keydown'].forEach((evt) =>
      window.addEventListener(evt, skip, { once: true, passive: true }),
    );
  }, { scope });

  return null;
}
