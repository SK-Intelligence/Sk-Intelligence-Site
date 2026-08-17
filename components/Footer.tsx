import Link from 'next/link';
import { nav, site } from '@/lib/content';
import { SkLogo } from './GlassFilter';

export function Footer() {
  return (
    <footer>
      <div className="container footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SkLogo size="footer" label={site.name} />
          <span>&copy; 2026 {site.name} &middot; formerly SK Webminds</span>
        </div>
        <div className="footer-links">
          {nav.map(({ label, href }) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
          <a href={`mailto:${site.mailto}`}>{site.emailDisplay}</a>
        </div>
      </div>
    </footer>
  );
}
