'use client';

import { useEffect } from 'react';

/**
 * Reveal-on-scroll, kept as progressive enhancement exactly as the static build
 * had it: `[data-reveal]` is fully visible by default in CSS, and this only
 * arms the hidden state once JS is running. With JS disabled nothing is hidden.
 */
export function Reveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    document.body.classList.add('reveal-armed');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      document.body.classList.remove('reveal-armed');
    };
  }, []);
  return null;
}
