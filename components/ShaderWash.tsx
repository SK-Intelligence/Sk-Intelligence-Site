'use client';

import { useEffect } from 'react';
import { initShaderWash } from '@/lib/shaderWash';

/**
 * Mounts the GLSL wash onto whichever wash canvases exist on the page
 * (#hero-gradient-canvas and #cta-gradient-canvas). Kept imperative because the
 * throttling/observer work in that module is measured, not incidental.
 */
export function ShaderWash() {
  useEffect(() => initShaderWash(), []);
  return null;
}
