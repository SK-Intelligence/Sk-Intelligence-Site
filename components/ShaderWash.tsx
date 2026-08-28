'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initShaderWash } from '@/lib/shaderWash';

/**
 * Mounts the GLSL wash onto whichever wash canvases exist on the page
 * (#hero-gradient-canvas and #cta-gradient-canvas). Kept imperative because the
 * throttling/observer work in that module is measured, not incidental.
 *
 * Re-run per route. This lives in the root layout, which survives a
 * client-side navigation, so the canvases it found at mount are the only ones
 * it ever knew about: every page reached by clicking a link got a canvas at its
 * untouched default of 300x150 and no wash at all — a flat band where the
 * gradient should be, on the studio page-head and on the home hero after a
 * round trip. initShaderWash returns a complete disposer and is already written
 * to survive being torn down and rebuilt, which is what the StrictMode note in
 * that module is about, so re-running it is what it was built for.
 */
export function ShaderWash() {
  const pathname = usePathname();
  useEffect(() => initShaderWash(), [pathname]);
  return null;
}
