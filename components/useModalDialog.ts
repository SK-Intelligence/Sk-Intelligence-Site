'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The page's scroll lock, counted rather than saved and restored per dialog.
 *
 * Two dialogs can be open at once — a screenshot opened from inside a case
 * study — and each one saving `document.body.style.overflow` on the way in and
 * putting it back on the way out is wrong the moment they overlap. They are
 * siblings in the tree, not nested, so when both unmount in the same commit
 * React runs the outer one's cleanup first: it restores '', and then the inner
 * one restores the 'hidden' it captured while the outer was open. The page is
 * left locked with no dialog on screen and nothing to unlock it short of a
 * reload.
 *
 * A count fixes it in the only place it can be fixed — above both components.
 * The first dialog to open takes the lock and remembers what was there before;
 * the last to close puts that back. Nothing in between touches it.
 */
let openDialogs = 0;
let restoreOverflow = '';

function lockScroll() {
  if (openDialogs === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openDialogs += 1;
}

function unlockScroll() {
  openDialogs = Math.max(0, openDialogs - 1);
  if (openDialogs === 0) document.body.style.overflow = restoreOverflow;
}

/**
 * A modal <dialog>, opened on mount and closed on unmount.
 *
 * The platform gives focus trapping, Esc, an inert page behind, and focus
 * restoration to whatever opened it — none of which is worth reimplementing,
 * and all of which is easy to lose by driving the dialog from React state
 * instead of from the element. So the parent mounts the component only while
 * the thing is open, and this hook owns the element's side of it.
 *
 * Returns the ref to put on the <dialog> and the dismiss function every close
 * control should call.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  // onClose lives in a ref so the effect below can hold an empty dependency
  // list. With `[onClose]` there instead, an inline arrow from the parent is a
  // fresh identity every render, the effect tears down and re-runs, and its
  // cleanup closes the dialog — so it would shut itself the first time anything
  // re-rendered it, such as stepping to the next screenshot.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    lockScroll();

    /* Esc and the platform's own dismissal both fire `close`, and React has to
       hear about it or the parent would still believe the dialog is open.

       The `el.open` guard is not defensive noise — without it the dialog closes
       itself about 30ms after opening, every time, in development. `close()`
       dispatches its event from a queued task rather than synchronously, so
       under StrictMode's double invocation the order is: mount, add listener,
       cleanup removes the listener and calls close() which QUEUES the event,
       mount again and add a fresh listener, and then the queued event lands on
       the new listener and tears down a dialog that was just re-opened. The
       queued event arrives when the element is open again, and a genuine close
       sets `open` false before its event fires, so this tells the two apart.
       Production never double-invokes, which is exactly why the e2e suite —
       which runs against a production build — could not see it. */
    const bye = () => { if (!el.open) closeRef.current(); };
    el.addEventListener('close', bye);

    return () => {
      el.removeEventListener('close', bye);
      el.close();
      unlockScroll();
    };
  }, []);

  /**
   * Every dismissal goes through the element, never straight to onClose.
   *
   * Calling onClose() directly unmounts the dialog around the cleanup's
   * close(), so the focused control leaves the document before the browser can
   * run its focus restoration and focus lands on <body> — back at the top of
   * the page. Closing the element first lets the platform put focus back on
   * whatever opened it, and the `close` listener then drives the unmount.
   */
  const dismiss = useCallback(() => ref.current?.close(), []);

  /** A click that lands on the dialog itself came from the backdrop; every
   *  click inside the content hits a child first. */
  const onBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === ref.current) ref.current?.close();
  }, []);

  return { ref, dismiss, onBackdropClick };
}
