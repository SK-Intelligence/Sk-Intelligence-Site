import { HeroSceneLoader } from './HeroSceneLoader';

export function Hero() {
  return (
    <section className="hero" id="top">
      <canvas id="hero-gradient-canvas" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow" style={{ marginBottom: '1rem' }}>AI-native consultancy</p>
          <h1 className="hero-head">
            <span className="h-line"><span className="h-line-inner">We find the bottleneck.</span></span>{' '}
            <span className="h-line"><span className="h-line-inner">Then we live <em>inside</em> the fix.</span></span>
          </h1>
          <p className="hero-sub">
            No guesswork, and no AI for the sake of it. We embed inside your operations, find where the
            work actually breaks down, build the automations and tools that take the friction out, then
            stay long enough for it to stick.
          </p>
          <div className="hero-actions">
            <a href="#process" className="btn btn-glass-primary">See our process</a>
            <a href="#contact" className="btn btn-glass">Start a conversation</a>
          </div>
          <div className="hero-proof">
            <div><strong>3</strong><span>Phase engagement, start to embed</span></div>
            <div><strong>4+</strong><span>Client builds shipped end to end</span></div>
            <div><strong>1</strong><span>Team, from first audit to handover</span></div>
          </div>
        </div>

        <div className="hero-scene-wrap">
          <div className="hero-scene">
            {/* Static fallback: shown until WebGL initialises, and kept if it fails. */}
            <svg id="hero-poster" aria-hidden="true" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <g stroke="var(--poster-line)" strokeWidth="0.7" opacity="0.4">
                <line x1="120" y1="130" x2="260" y2="80" /><line x1="260" y1="80" x2="420" y2="150" />
                <line x1="120" y1="130" x2="180" y2="280" /><line x1="260" y1="80" x2="300" y2="240" />
                <line x1="420" y1="150" x2="470" y2="300" /><line x1="180" y1="280" x2="300" y2="240" />
                <line x1="300" y1="240" x2="470" y2="300" /><line x1="180" y1="280" x2="220" y2="420" />
                <line x1="300" y1="240" x2="340" y2="410" /><line x1="470" y1="300" x2="430" y2="440" />
                <line x1="220" y1="420" x2="340" y2="410" /><line x1="340" y1="410" x2="430" y2="440" />
                <line x1="220" y1="420" x2="310" y2="520" /><line x1="340" y1="410" x2="310" y2="520" />
                <line x1="300" y1="240" x2="300" y2="300" />
              </g>
              <circle cx="300" cy="300" r="14" fill="var(--poster-node)" opacity="0.5" />
              <g fill="var(--poster-line)">
                <circle cx="120" cy="130" r="5" /><circle cx="260" cy="80" r="4" /><circle cx="420" cy="150" r="5.5" />
                <circle cx="180" cy="280" r="4.5" /><circle cx="300" cy="240" r="6" /><circle cx="470" cy="300" r="4" />
                <circle cx="220" cy="420" r="5" /><circle cx="340" cy="410" r="4.5" /><circle cx="430" cy="440" r="5" />
                <circle cx="310" cy="520" r="4" />
              </g>
            </svg>
            <canvas id="hero-canvas" aria-hidden="true" />
            <div className="hero-scene-labels" id="heroSceneLabels">
              <p className="scene-label scene-label-shell"><span>Your systems</span></p>
              <p className="scene-label scene-label-core"><span>Us</span></p>
            </div>
          </div>
        </div>
      </div>
      <HeroSceneLoader />
    </section>
  );
}
