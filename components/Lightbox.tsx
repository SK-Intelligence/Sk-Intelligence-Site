'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import type { Shot } from '@/lib/content';

/**
 * Full-screen viewer for the build screenshots.
 *
 * Built on the native <dialog> with showModal(), which gives focus trapping,
 * Esc to close, and inert background content for free. Reimplementing those
 * three by hand is where home-made modals usually go wrong, so this does not.
 *
 * The parent only mounts this while something is open, so the effect below
 * runs exactly once per opening and there is no "is it open" state to keep in
 * sync with the element's own idea of whether it is open.
 */
export function Lightbox({
  shots, index, clientName, onIndex, onClose,
}: {
  shots: readonly Shot[];
  index: number;
  clientName: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const shot = shots[index];
  const many = shots.length > 1;

  // onClose lives in a ref so the effect below can hold an empty dependency
  // list. With `[onClose]` there instead, an inline arrow from the parent is a
  // fresh identity on every render, the effect tears down and re-runs, and its
  // cleanup calls el.close() — so the dialog shuts itself the first time
  // anything re-renders it, such as stepping to the next screenshot.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    // showModal() makes the page inert but does not lock its scroll, so a
    // wheel over the backdrop still moved the page underneath and the reader
    // came back hundreds of pixels from where they left.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Esc dismisses the dialog natively, so React has to hear about it or the
    // parent would still think the viewer is open.
    const bye = () => closeRef.current();
    el.addEventListener('close', bye);
    return () => {
      el.removeEventListener('close', bye);
      el.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  /**
   * Every dismissal goes through the element, never straight to onClose.
   *
   * Calling onClose() directly unmounts the dialog around the cleanup's
   * close(), so the focused button leaves the document before the UA can run
   * its focus restoration, and focus lands on <body>. Closing the element
   * first lets the platform put focus back on whatever opened it, then the
   * `close` listener drives the unmount. Esc already took this path, which is
   * why Esc was the only one that restored focus correctly.
   */
  const dismiss = useCallback(() => ref.current?.close(), []);

  const step = useCallback((dir: -1 | 1) => {
    onIndex((index + dir + shots.length) % shots.length);
  }, [index, shots.length, onIndex]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={`${clientName} screenshots`}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      }}
      // A click that lands on the dialog itself came from the backdrop: every
      // click inside the content hits a child first.
      onClick={(e) => { if (e.target === ref.current) dismiss(); }}
    >
      <div className="lightbox-inner">
        <div className="lightbox-bar">
          <p className="lightbox-title">
            {clientName}
            <span>{shot.label}</span>
          </p>
          <button type="button" className="lightbox-x" onClick={dismiss} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <figure className="lightbox-figure">
          <Image
            src={shot.src}
            alt={shot.alt}
            width={1280}
            height={760}
            sizes="(max-width: 900px) 94vw, 84vw"
            className="lightbox-img"
          />
        </figure>

        {many && (
          <div className="lightbox-nav">
            <button type="button" onClick={() => step(-1)} aria-label="Previous screenshot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <p aria-live="polite">{index + 1} of {shots.length}</p>
            <button type="button" onClick={() => step(1)} aria-label="Next screenshot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
