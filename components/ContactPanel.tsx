'use client';

import { useState, useSyncExternalStore } from 'react';
import { BookingEmbed } from './BookingEmbed';
import { BriefForm } from './BriefForm';

/**
 * The two ways in, and the switch between them.
 *
 * Booking stays the default and the primary path; the brief is for the person
 * who would rather write than talk. They are tabs rather than a radio pair
 * because each choice owns a whole panel of content, which is what the tabs
 * pattern is for: roving tabindex, arrow keys, Home and End.
 *
 * Both panels stay mounted once seen, hidden rather than removed, so the
 * Calendly iframe keeps its state across a round trip and a half-written brief
 * survives a stray tap on the other tab. The form is not mounted at all until
 * it is first chosen, so with JS off it does not exist. The switch is
 * server-rendered, so it is hidden until this component has run (`data-ready`);
 * it keeps its space meanwhile, so arming it does not move the page. With JS
 * off the booking fallback and the mailto line under the panel are the way in.
 */

const TABS = [
  { id: 'book', label: 'Book a call' },
  { id: 'brief', label: 'Send a brief' },
] as const;
type Mode = (typeof TABS)[number]['id'];

const subscribeNever = () => () => {};

export function ContactPanel() {
  const [mode, setMode] = useState<Mode>('book');
  const [briefSeen, setBriefSeen] = useState(false);
  /* False on the server and during hydration, true once this has run in a
     browser: the "has JS arrived" flag, without a setState in an effect. */
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const choose = (next: Mode) => {
    if (next === 'brief') setBriefSeen(true);
    setMode(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === mode);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + TABS.length - 1) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    choose(TABS[n].id);
    document.getElementById(`contact-tab-${TABS[n].id}`)?.focus();
  };

  return (
    <div className="cta-panels" data-mode={mode} data-ready={ready ? '' : undefined}>
      <div className="cta-switch" role="tablist" aria-label="How would you like to get in touch?" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab" id={`contact-tab-${t.id}`}
            aria-selected={mode === t.id} aria-controls={`contact-panel-${t.id}`}
            tabIndex={mode === t.id ? 0 : -1} onClick={() => choose(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div role="tabpanel" id="contact-panel-book" aria-labelledby="contact-tab-book" hidden={mode !== 'book'}>
        <BookingEmbed />
      </div>
      <div role="tabpanel" id="contact-panel-brief" aria-labelledby="contact-tab-brief" hidden={mode !== 'brief'}>
        {briefSeen && (
          <div className="brief-card">
            <BriefForm onBook={() => { choose('book'); document.getElementById('contact-tab-book')?.focus(); }} />
          </div>
        )}
      </div>
    </div>
  );
}
