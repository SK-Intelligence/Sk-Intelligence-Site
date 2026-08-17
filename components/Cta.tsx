import { site } from '@/lib/content';
import { ContactForm } from './ContactForm';

const icons: Record<string, React.ReactNode> = {
  linkedin: (<><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M7.2 10.4v6.1M7.2 7.6v.1M11 16.5v-6.1M11 12.6c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2v3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>),
  facebook: (<path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H8v4h2v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1z" fill="currentColor"/>),
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></>),
  x: (<path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>),
};

export function Cta() {
  return (
    <section className="cta-section" id="contact">
      <div className="container">
        <div className="cta">
          <canvas id="cta-gradient-canvas" aria-hidden="true" />
          <div className="cta-vignette" aria-hidden="true" />
          <div className="cta-inner">
            <p className="eyebrow on-dark" style={{ justifyContent: 'center' }}>Get started</p>
            <h2>Tell us where it&rsquo;s breaking.</h2>
            <p>One conversation is enough to know if there&rsquo;s a fit. If there is, we scope the discovery phase from there.</p>
            <ContactForm />
            <p className="cta-contact">Or reach us directly at <a href={`mailto:${site.mailto}`}>{site.mailto}</a></p>
            <div className="cta-socials">
              {site.socials.map((s) => (
                <a key={s.href} href={s.href} aria-label={s.label} target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="none">{icons[s.icon]}</svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
