'use client';

import dynamic from 'next/dynamic';

/**
 * `ssr: false` is not allowed inside a Server Component in the App Router, so
 * the dynamic import has to live behind its own 'use client' boundary. three.js
 * touches window/document at module scope, hence no SSR.
 */
export const HeroSceneLoader = dynamic(
  () => import('./HeroScene').then((m) => m.HeroScene),
  { ssr: false },
);

export default HeroSceneLoader;
