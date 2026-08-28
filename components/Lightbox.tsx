'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import type { Shot } from '@/lib/content';
import { useModalDialog } from './useModalDialog';

/**
 * Full-screen viewer for the build screenshots.
 *
 * The dialog mechanics live in useModalDialog, shared with the case study this
 * usually opens from — showModal on mount, the counted scroll lock that keeps
 * two stacked dialogs from unlocking the page out from under each other, the
 * `close` listener, and the dismiss-via-element indirection that preserves the
 * platform's focus restoration.
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
  const { ref, dismiss, onBackdropClick } = useModalDialog(onClose);
  const shot = shots[index];
  const many = shots.length > 1;

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
      onClick={onBackdropClick}
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
