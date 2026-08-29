import type { Metadata } from 'next';
import { Cta } from '@/components/Cta';
import { stack, studioServices } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Build studio',
  description: 'Websites, web apps, e-commerce, mobile, SEO and email/domain services from SK Intelligence.',
  alternates: { canonical: '/studio' },
  openGraph: {
    title: 'Build studio · SK Intelligence',
    description: 'Websites, web apps, e-commerce, mobile, SEO and email/domain services from SK Intelligence.',
    url: '/studio',
  },
};

export default function Studio() {
  return (
    <>
      <section className="page-head">
        <canvas id="hero-gradient-canvas" aria-hidden="true" />
        <div className="container page-head-inner">
          <p className="eyebrow" data-head-reveal>Build studio</p>
          {/* Says what the studio builds rather than arguing that it still
              does. Both lines used to lean on "still" — a reader who has to be
              told something is still true starts wondering why it might not be,
              and neither line described the work. */}
          <h1 data-head-reveal>Sites, storefronts and <em>apps</em> that hold up.</h1>
          <p className="page-head-deck" data-head-reveal>
            Marketing sites, e-commerce, mobile, and the search and email setup that keeps
            them found. Built to load fast and to keep working after we hand them over.
          </p>
        </div>
      </section>

      <section className="section-pad" id="studio">
        <div className="container studio-solo">
          <ul className="studio-list" data-reveal style={{ '--d': 1 } as React.CSSProperties}>
            {studioServices.map((s) => (
              <li key={s.title} className="studio-item">
                <span>{s.title}<small>{s.body}</small></span>
                <span className="studio-item-arrow" aria-hidden="true">&#8599;</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-pad" id="stack" style={{ background: 'var(--surface-alt)' }}>
        <div className="container">
          <div className="section-head" data-reveal>
            <p className="eyebrow">Tech we work with</p>
            <h2>The stack behind the work.</h2>
            <p>This is what we actually build and run with, day to day, on client work and in our own jobs.</p>
          </div>
          <div className="stack-groups">
            {stack.map((g, i) => (
              <div key={g.title} className="stack-group" data-reveal style={{ '--d': i + 1 } as React.CSSProperties}>
                <h3>{g.title}</h3>
                <p>{g.body}</p>
                <ul className="cred-chips">
                  {g.items.map((it) => <li key={it} className="cred-chip">{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="stack-note" data-reveal style={{ '--d': 5 } as React.CSSProperties}>
            If your team already runs something else, we work in your stack. That&rsquo;s the whole
            point of forward-deploying.
          </p>
        </div>
      </section>

      <Cta />
    </>
  );
}
