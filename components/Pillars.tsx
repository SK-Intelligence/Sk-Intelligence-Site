import { pillars } from '@/lib/content';

export function Pillars() {
  return (
    <section className="section-pad" id="what-we-do">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="eyebrow">What we do</p>
          <h2>AI-native, by default</h2>
          <p>Four ways we get inside your business and put AI to work where it pays.</p>
        </div>
        <div className="pillars-grid">
          {pillars.map((p, i) => (
            <div key={p.num} className="pillar glass" data-reveal style={{ '--d': i + 1 } as React.CSSProperties}>
              <p className="pillar-num">{p.num}</p>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
