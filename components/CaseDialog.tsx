'use client';

import { useModalDialog } from './useModalDialog';

/**
 * A case study, opened over the constellation.
 *
 * The dialog mechanics — showModal on mount, the counted scroll lock, the
 * `close` listener and the dismiss-via-element indirection — all live in
 * useModalDialog, shared with the screenshot viewer. They are subtle enough
 * that having two copies meant fixing the same bug twice, and the scroll lock
 * in particular cannot be made nesting-safe from inside either component.
 *
 * The two stack: opening a screenshot full size from in here puts the viewer
 * in the top layer above this, and closing it returns here rather than to the
 * page.
 */
export function CaseDialog({
  title, sector, onClose, children,
}: {
  title: string;
  sector: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { ref, dismiss, onBackdropClick } = useModalDialog(onClose);

  return (
    <dialog
      ref={ref}
      className="case-dialog"
      aria-label={`${title} — ${sector}`}
      onClick={onBackdropClick}
    >
      <div className="case-inner">
        {/* No title in the bar. The case study opens on its own heading —
            sector above, name in display type — and the bar carried the same
            two words again in 13px chrome directly above it, which is the kind
            of duplication you stop seeing after a week and every first-time
            reader sees immediately. The dialog is labelled for assistive tech
            by aria-label instead, which does not cost the layout anything. */}
        <div className="case-bar">
          <button type="button" className="case-x" onClick={dismiss} aria-label="Close case study">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                 strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="case-body">{children}</div>
      </div>
    </dialog>
  );
}
