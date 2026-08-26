'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ownBuild } from '@/lib/content';
import { Lightbox } from './Lightbox';

/**
 * Provena AI, in its own section under the case bank.
 *
 * Structurally this is one `.panel` from the case bank with the client parts
 * removed, and that is on purpose: it borrows `.showcase-frame`, `.client-chip`,
 * `.client-name`, `.client-work`, `.client-metrics` and `.client-detail` rather
 * than growing a parallel set of classes that drift apart the first time either
 * is restyled. The only genuinely new CSS is the two-column wrapper.
 *
 * What it does NOT borrow is the tab strip and the testimonial. There is one
 * build here so tabs would be a control with nowhere to go, and there is no
 * client so there is no quote.
 */
export function OwnBuild() {
  const [zoomed, setZoomed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const shot = ownBuild.shots[0];

  // Same contract as the case bank: the button that opens the viewer only
  // exists once the viewer can actually run, so JS off leaves a plain image
  // rather than a control that does nothing.
  useEffect(() => setHydrated(true), []);

  return (
    <section className="section-pad" id="own-build">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="eyebrow">Our own build</p>
          <h2>The one we built for ourselves.</h2>
          <p>
            Most of what we ship belongs to a client. This one is ours: a compliance
            platform we designed, built and run end to end.
          </p>
        </div>

        <div className="own-build" data-reveal>
          <div className="showcase-frame">
            <div className="showcase-chrome" aria-hidden="true">
              <span className="showcase-dots"><i /><i /><i /></span>
              <span className="showcase-label">{ownBuild.name} &middot; {shot.label}</span>
            </div>
            <div className="showcase-scroll">
              {hydrated ? (
                <button
                  type="button"
                  className="showcase-open"
                  onClick={() => setZoomed(true)}
                  aria-label={`View the ${ownBuild.name} dashboard full size`}
                >
                  <Image
                    src={shot.src} alt={shot.alt} width={1280} height={760}
                    sizes="(max-width: 900px) 1180px, 1100px"
                  />
                </button>
              ) : (
                <Image
                  src={shot.src} alt={shot.alt} width={1280} height={760}
                  sizes="(max-width: 900px) 1180px, 1100px"
                />
              )}
            </div>
            <p className="showcase-hint" aria-hidden="true">
              Tap to open full size
            </p>
          </div>

          {/* The shot spans the section and the prose sits underneath it in two
              columns. Side by side, as the case bank panels are, the shot ran
              out at about a third of the height of the copy beside it and left
              a hole under it the size of the screenshot itself. This also buys
              the dashboard roughly double the width, which a screen this dense
              needs to be worth showing at all. */}
          {/* Full width rather than inside the left column below. At half the
              section width these three sit about 160px apart, which wraps two
              of the three labels to a second line and leaves the third on one:
              that reads as a layout fault rather than as a longer label. */}
          <dl className="client-metrics own-build-facts">
            {ownBuild.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.value}</dt>
                <dd>{f.label}</dd>
              </div>
            ))}
          </dl>

          <div className="own-build-meta">
            <div>
              <span className="client-chip">
                {/* Provenance, drawn rather than stated: two records chaining
                    down into a third that is sealed inside a ring. The product's
                    own UI uses a stock shield icon, which is a placeholder
                    rather than a mark, so there was nothing to match. Same idiom
                    as the delivery-team mark on the founder cards. */}
                <svg viewBox="0 0 40 40" className="own-build-mark" fill="none" aria-hidden="true">
                  <circle cx="11.5" cy="10" r="3.6" />
                  <circle cx="20" cy="18" r="3.6" />
                  <path d="M14.1 12.4 L17.4 15.6" />
                  <path d="M22.6 20.4 L24.6 22.3" />
                  <circle cx="27.5" cy="27" r="6.2" />
                  <circle cx="27.5" cy="27" r="2.3" />
                </svg>
              </span>
              <p className="client-sector">{ownBuild.sector}</p>
              <h3 className="client-name">{ownBuild.name}</h3>
              <p className="client-work">{ownBuild.work}</p>
            </div>
            <ul className="client-detail">
              {ownBuild.detail.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        </div>

        {zoomed && (
          <Lightbox
            shots={ownBuild.shots}
            index={0}
            clientName={ownBuild.name}
            onIndex={() => {}}
            onClose={() => setZoomed(false)}
          />
        )}
      </div>
    </section>
  );
}
