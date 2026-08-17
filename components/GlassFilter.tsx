/**
 * The SVG displacement filter that `.glass` references via
 * `backdrop-filter: url(#glass-distortion)`. It must be present in the document
 * for the glass panels to render correctly, so it lives in the root layout.
 */
export function GlassFilter() {
  return (
    <svg className="visually-hidden" aria-hidden="true" focusable="false">
      <defs>
        <filter id="glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="20" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** Two recolourable mask layers, not an image — recolours per theme token. */
export function SkLogo({ size = 'nav', label }: { size?: 'nav' | 'footer'; label?: string }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <span className={`sk-logo ${size}-size`} {...a11y}>
      <span className="sk-logo-ink" />
      <span className="sk-logo-bar" />
    </span>
  );
}
