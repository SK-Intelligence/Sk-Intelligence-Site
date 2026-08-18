import { founders } from '@/lib/content';

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
              {/* The points are the whole card. A chip row underneath just
                  restated the same four employers in a second typeface. */}
              <ul className="founder-points">
                {f.points.map((p) => (
                  <li key={p} dangerouslySetInnerHTML={{ __html: p }} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Deliberately prose, not a third row of heading+paragraph cards. The
            AI-research point is already on both profiles above; repeating it as
            its own panel was saying the same thing twice in a tidier font. */}
        <p className="founders-note" data-reveal style={{ '--d': 3 } as React.CSSProperties}>
          A small team of developers works with us on delivery. We also build for load, because most
          of what we get called in to fix ran fine until more than a handful of people used it at once.
        </p>
      </div>
    </section>
  );
}
