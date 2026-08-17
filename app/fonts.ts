import { Syne, Fraunces } from 'next/font/google';

/**
 * Self-hosted by next/font at build time. This replaces the render-blocking
 * Google Fonts <link> the static build used, which also means no visitor IP is
 * sent to Google — the point the security review raised about GDPR.
 */

export const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  // No `weight` here on purpose: Fraunces is a variable font, and next/font
  // rejects `axes` unless weight is omitted (or 'variable'). Omitting it ships
  // the full weight range, which is what the design uses anyway.
  // `opsz` is NOT included by default — only the weight axis is, unless named.
  // Fraunces is an optical-size design and looks wrong at display sizes without it.
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});
