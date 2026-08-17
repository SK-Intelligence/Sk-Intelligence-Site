import type { Metadata } from 'next';
import { fraunces, syne } from './fonts';
import './globals.css';
import { GlassFilter } from '@/components/GlassFilter';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Reveal } from '@/components/Reveal';
import { ShaderWash } from '@/components/ShaderWash';
import { Entrance } from '@/components/Entrance';
import { HashScroll } from '@/components/HashScroll';
import { site } from '@/lib/content';

/** Set NEXT_PUBLIC_SITE_URL once the domain is live so og:url/canonical resolve. */
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skintelligence.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s — ${site.name}` },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    siteName: site.name,
    type: 'website',
    locale: 'en_GB',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <GlassFilter />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        {/* Behaviour layers. Each is a no-op on pages without its targets, and
            every one is additive — the pages are complete without them. */}
        <Reveal />
        <ShaderWash />
        <Entrance />
        <HashScroll />
      </body>
    </html>
  );
}
