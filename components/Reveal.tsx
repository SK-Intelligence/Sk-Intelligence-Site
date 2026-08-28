'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Reveal-on-scroll, kept as progressive enhancement exactly as the static build
 * had it: `[data-reveal]` is fully visible by default in CSS, and this only
 * arms the hidden state once JS is running. With JS disabled nothing is hidden.
 *
 * The observer is armed once and then pointed at each new page's elements as
 * they arrive. Both halves of that matter, and getting either wrong empties a
 * page:
 *
 *   - This lives in the root layout, which survives a client-side navigation.
 *     With the element query in a mount-once effect it ran against the FIRST
 *     page only, so everything on the second page was armed by `reveal-armed`,
 *     observed by nothing, and stayed at opacity 0 permanently — no amount of
 *     scrolling brought it back. Going from the home page to the studio left
 *     the services list, all four stack groups and both headings as blank space.
 *
 *   - `reveal-armed` is added once and removed only on unmount, rather than
 *     torn down and re-added per route. Cycling it would drop the whole page to
 *     fully visible for a frame on every navigation, which is a flash of
 *     content that then hides itself again.
 */
export function Reveal() {
  const pathname = usePathname();
  const io = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    document.body.classList.add('reveal-armed');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    io.current = obs;
    return () => {
      obs.disconnect();
      io.current = null;
      document.body.classList.remove('reveal-armed');
    };
  }, []);

  useEffect(() => {
    const obs = io.current;
    if (!obs) return;
    // `:not(.is-visible)` keeps this to what still needs watching; re-observing
    // an element already being watched is a no-op, so the filter is for clarity
    // rather than correctness.
    document.querySelectorAll('[data-reveal]:not(.is-visible)').forEach((el) => obs.observe(el));
  }, [pathname]);

  return null;
}
