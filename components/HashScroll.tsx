'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Next's client router does not reliably scroll to a hash when the navigation
 * also changes route (e.g. /studio -> /#process). The static site got this for
 * free from the browser; with client-side routing the target lands hundreds of
 * pixels off, or is ignored entirely.
 *
 * This re-applies the hash once the route has settled. It waits two frames so
 * the new page has laid out (and any font-driven reflow has happened), and uses
 * 'auto' rather than 'smooth' because a long animated scroll on arrival reads
 * as the page being broken.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    let cancelled = false;
    const jump = () => {
      if (cancelled) return;
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    const r = requestAnimationFrame(() => requestAnimationFrame(jump));
    return () => { cancelled = true; cancelAnimationFrame(r); };
  }, [pathname]);

  return null;
}
