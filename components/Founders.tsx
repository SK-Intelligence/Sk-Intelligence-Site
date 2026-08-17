import { founderPoints, founders } from '@/lib/content';

export function Founders() {
  return (
    <section className="section-pad" id="founders">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="eyebrow">Co-founders</p>
          <h2>The experience we bring</h2>
          <p>Two co-founders, both engineers. You deal with us directly &mdash; there is no account layer in between.</p>
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
              <ul className="cred-chips">
                {f.chips.map((c, ci) => (
                  <li key={c} className={`cred-chip${ci === 0 ? ' is-lead' : ''}`}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="founders-points">
          {founderPoints.map((p, i) => (
            <div key={p.title} className="founders-point" data-reveal style={{ '--d': i + 3 } as React.CSSProperties}>
              <h3>{p.title}</h3>
              <p dangerouslySetInnerHTML={{ __html: p.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
