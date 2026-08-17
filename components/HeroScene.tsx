'use client';

import { useEffect } from 'react';
import { initHeroNetwork } from '@/lib/heroNetwork';

/**
 * The three.js node lattice. The module returns a cleanup that aborts every
 * listener, cancels the RAF loop, disconnects observers and disposes the
 * renderer — required because StrictMode mounts effects twice in development
 * and a leaked WebGL context is never collected.
 */
export function HeroScene() {
  useEffect(() => initHeroNetwork(), []);
  return null;
}
