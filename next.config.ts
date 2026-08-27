import type { NextConfig } from 'next';

/**
 * Static response headers.
 *
 * Deliberately NOT nonce-based CSP: nonces are generated per request in
 * proxy.ts, which forces every page to render dynamically and gives up static
 * generation and CDN caching. For a marketing site whose whole job is being
 * fast, that trade is the wrong way round.
 *
 * `style-src-attr 'unsafe-inline'` covers React's inline style props while
 * still blocking inline <style> blocks. `img-src data:` is needed by the
 * inlined logo masks in globals.css.
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Calendly is the only third party this site loads, and it needs a hole in four
 * directives to work: its script, the stylesheet that script injects, the
 * booking iframe, and the images and requests inside that iframe.
 *
 * Listed host by host rather than as `*.calendly.com` so the widened surface is
 * exactly what the booking widget uses and nothing else. If the embed goes
 * blank after a Calendly change, the browser console names the directive that
 * blocked it; add that host here rather than loosening a directive to a
 * wildcard.
 *
 * frame-src has to be stated even though it looks absent: with no frame-src it
 * falls back to default-src 'self', which blocks the iframe.
 */
const CALENDLY = {
  script: 'https://assets.calendly.com',
  frame: 'https://calendly.com',
  connect: 'https://calendly.com',
  img: 'https://*.calendly.com https://d3v0px0pttie1i.cloudfront.net',
};

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CALENDLY.script}${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' ${CALENDLY.script}`,
  "style-src-attr 'unsafe-inline'",
  `img-src 'self' data: blob: ${CALENDLY.img}`,
  "font-src 'self'",
  `connect-src 'self' ${CALENDLY.connect}`,
  `frame-src ${CALENDLY.frame}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=(), usb=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
