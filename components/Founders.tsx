import { founders, sharedCreds } from '@/lib/content';

/**
 * Two cards for what each founder brings alone, then one band for what they
 * both bring.
 *
 * The shared credentials used to be repeated inside both cards. Stating them
 * once and drawing the convergence is the whole point of the section: the
 * overlap is the argument (two engineers with the same foundation), and the
 * differences are the range. Duplicated bullets said neither.
 *
 * The band's own top rule is the only mark in the section whose width equals
 * both cards at once, and that span is what says "shared". Drawn connectors
 * between the cards and the band were tried and removed: see the CSS.
 */
export function Founders() {
  return (
    <section className="section-pad" id="founders">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="eyebrow">Co-founders</p>
          <h2>The experience we bring</h2>
          <p>Two co-founders, both engineers. You deal with us directly, with no account manager in between.</p>
        </div>

        <div className="founders-grid">
          {founders.map((f, i) => (
            <div key={f.slug} className="founder-card glass" data-reveal style={{ '--d': i + 1 } as React.CSSProperties}>
              <div className="founder-id">
                <span className="founder-portrait" aria-hidden="true">
                  <span className="founder-monogram">{f.monogram}</span>
                  {/* Drop a photo into public/founders/ to activate — a missing
                      file simply doesn't paint, leaving the monogram. */}
                  <span className="founder-photo" style={{ backgroundImage: `url("/founders/${f.slug}.jpg")` }} />
                </span>
                <div>
                  <h3 className="founder-name">{f.name}</h3>
                  <p className="founder-role">Co-founder</p>
                </div>
              </div>
              <ul className="founder-points">
                {f.points.map((p) => (
                  <li key={p} dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="founders-common" data-reveal style={{ '--d': 3 } as React.CSSProperties}>
          <h3 className="founders-common-label">What we both bring</h3>
          <ul className="common-list">
            {sharedCreds.map((c) => (
              <li key={c.label}>
                <span className="common-label">{c.label}</span>
                <span className="common-detail">{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Deliberately prose, not another panel row. */}
        <p className="founders-note" data-reveal style={{ '--d': 4 } as React.CSSProperties}>
          A small team of developers works with us on delivery. We also build for load, because most
          of what we get called in to fix ran fine until more than a handful of people used it at once.
        </p>
      </div>
    </section>
  );
}
