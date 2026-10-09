'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { site } from '@/lib/content';
import { GOALS, LIMITS, OTHER, SECTORS, TIMINGS, findChoice } from '@/lib/brief';

/**
 * The brief, written as a sentence the visitor completes.
 *
 * Every blank is a real control with its own label: a native <select> for the
 * choices and <input>/<textarea> for the free text, so keyboard, screen reader
 * and autofill behaviour is the browser's own rather than a re-implementation.
 * What makes them read as blanks is only styling, plus one layout trick: each
 * select and text input sits in the same grid cell as a hidden copy of its own
 * text, so the blank is exactly as wide as what is in it and grows as the
 * visitor types. A <select> cannot do that unaided outside Chromium
 * (`field-sizing` is not there yet), and the trick works the same for both.
 * The note below the sentence is a plain auto-growing textarea.
 *
 * It posts to /api/contact as ids, and the server writes the words from the
 * same lib/brief.ts. With JS off none of this renders (ContactPanel mounts the
 * form only after a click), so the mailto line under the panel stays the way in.
 * If the server answers `delivered: false` (no mail provider behind it) the
 * visitor is told it did not go through and handed a mailto, never a thank-you.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = 'sector' | 'goal' | 'timing' | 'name' | 'email';
const DOM_ID: Record<Field, string> = {
  sector: 'brief-sector', goal: 'brief-goal', timing: 'brief-timing', name: 'brief-name', email: 'brief-email',
};
/* "the kind of business you run" reads in the error sentence the way the blank
   reads in the brief. Order here is the order of the sentence on screen. */
const MISSING: Record<Field, string> = {
  sector: 'the kind of business you run',
  goal: 'what you want to change',
  timing: 'when you would like it done',
  name: 'your name',
  email: 'a valid email address',
};

type Sent = { first: string; email: string; about: string; whose: string };

const WENT_WRONG = 'Something went wrong. Please try again, or email us.';

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
/* "a bakery" typed into a blank that already says "a" would read back as
   "your a bakery". */
const stripArticle = (s: string) => clean(s).replace(/^(?:a|an|the)\s+/i, '');

function Caret() {
  return <span className="blank-caret" aria-hidden="true" />;
}

type SelectBlankProps = {
  id: string; label: string; placeholder: string; value: string;
  options: readonly { id: string; label: string }[];
  onChange: (v: string) => void; invalid: boolean; describedBy?: string; withOther?: boolean;
  inputRef?: React.Ref<HTMLSelectElement>;
};

function SelectBlank({ id, label, placeholder, value, options, onChange, invalid, describedBy, withOther, inputRef }: SelectBlankProps) {
  const shown = value === '' ? placeholder : (findChoice(options, value)?.label ?? 'something else');
  return (
    <span className="blank blank-select" data-filled={value ? '' : undefined} data-invalid={invalid ? '' : undefined}>
      <span className="blank-size" aria-hidden="true">{shown}</span>
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <select
        id={id} ref={inputRef} value={value} required
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        {withOther && <option value={OTHER}>something else</option>}
      </select>
      <Caret />
    </span>
  );
}

type TextBlankProps = {
  id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void;
  invalid: boolean; describedBy?: string; type?: 'text' | 'email'; autoComplete?: string;
  maxLength: number; inputRef?: React.Ref<HTMLInputElement>;
};

function TextBlank({ id, label, placeholder, value, onChange, invalid, describedBy, type = 'text', autoComplete, maxLength, inputRef }: TextBlankProps) {
  return (
    <span className="blank blank-text" data-filled={value ? '' : undefined} data-invalid={invalid ? '' : undefined}>
      <span className="blank-size" aria-hidden="true">{value || placeholder}</span>
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <input
        id={id} ref={inputRef} type={type} value={value} placeholder={placeholder} maxLength={maxLength} required
        autoComplete={autoComplete} spellCheck={false} autoCapitalize="none"
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

export function BriefForm({ onBook }: { onBook: () => void }) {
  const uid = useId();
  const errorId = `${uid}-error`;

  const [sector, setSector] = useState('');
  const [sectorOther, setSectorOther] = useState('');
  const [goal, setGoal] = useState('');
  const [goalOther, setGoalOther] = useState('');
  const [timing, setTiming] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  /* Bumped on every error so the alert is a new element each time: a live
     region re-announces an inserted node, not a repeat of the same text. */
  const [errorSeq, setErrorSeq] = useState(0);
  const [sent, setSent] = useState<Sent | null>(null);
  /* The server took the brief but had nowhere to send it. */
  const [undelivered, setUndelivered] = useState(false);

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  /* Focus that has to wait for a render: into the text blank that replaces a
     list, or back to the list when the visitor returns to it. */
  const focusAfter = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (focusAfter.current) {
      document.getElementById(focusAfter.current)?.focus();
      focusAfter.current = null;
    }
  });

  /* The note grows with what is typed. Reset to auto first or it can only ever
     get taller. */
  const fitNote = useCallback(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(fitNote, [fitNote, note, sent, undelivered]);

  /* It also has to re-fit when the box changes width without the text changing
     (a rotated phone, a resized window), because the same words wrap onto a
     different number of lines. Only a width change counts: setting the height
     above is itself a resize and must not feed back. */
  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    let width = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== width) { width = el.offsetWidth; fitNote(); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitNote, sent, undelivered]);

  useLayoutEffect(() => { if (sent || undelivered) doneRef.current?.focus(); }, [sent, undelivered]);

  const missing = (): Field[] => {
    const out: Field[] = [];
    if (sector === '' || (sector === OTHER && clean(sectorOther).length < 2)) out.push('sector');
    if (goal === '' || (goal === OTHER && clean(goalOther).length < 2)) out.push('goal');
    if (timing === '') out.push('timing');
    if (!clean(name)) out.push('name');
    if (!EMAIL.test(email.trim())) out.push('email');
    return out;
  };
  const gaps = attempted ? missing() : [];
  const bad = (f: Field) => gaps.includes(f);
  const described = error ? errorId : undefined;

  function fail(message: string) {
    setError(message);
    setErrorSeq((n) => n + 1);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setAttempted(true);
    const todo = missing();
    if (todo.length) {
      fail(`Please include ${list(todo.map((f) => MISSING[f]))}.`);
      const first = todo[0];
      /* The sector and goal blanks are a text input while "something else" is
         chosen, with the id suffixed. */
      const isText = (first === 'sector' && sector === OTHER) || (first === 'goal' && goal === OTHER);
      document.getElementById(DOM_ID[first] + (isText ? '-text' : ''))?.focus();
      return;
    }
    setError('');
    setSending(true);
    try {
      const trap = new FormData(e.currentTarget).get('company_website');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clean(name), email: email.trim(), sector, goal, timing,
          sector_other: sector === OTHER ? clean(sectorOther) : '',
          goal_other: goal === OTHER ? clean(goalOther) : '',
          note: note.trim(), company_website: trap,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || WENT_WRONG);
      /* The server accepted it but nothing was sent anywhere. Say so. */
      if (json.delivered === false) { setUndelivered(true); return; }
      const g = findChoice(GOALS, goal) as (typeof GOALS)[number] | undefined;
      setSent({
        first: clean(name).split(' ')[0],
        email: email.trim(),
        about: g ? g.about : 'what you have told us',
        whose: sector === OTHER ? stripArticle(sectorOther) : (findChoice(SECTORS, sector)?.label ?? 'business'),
      });
    } catch (err) {
      fail(err instanceof Error ? err.message : WENT_WRONG);
    } finally {
      setSending(false);
    }
  }

  function again() {
    focusAfter.current = DOM_ID.sector;
    setSent(null); setAttempted(false); setError('');
    setSector(''); setSectorOther(''); setGoal(''); setGoalOther('');
    setTiming(''); setName(''); setEmail(''); setNote('');
  }

  if (undelivered) {
    const pick = (list: readonly { id: string; label: string }[], id: string, other: string) =>
      id === OTHER ? clean(other) : (findChoice(list, id)?.label ?? '');
    const body = [
      `We run a ${pick(SECTORS, sector, sectorOther)} and we want to ${pick(GOALS, goal, goalOther)}, ${findChoice(TIMINGS, timing)?.label ?? ''}.`,
      `I'm ${clean(name)}, reach me at ${email.trim()}.`,
      note.trim() ? `\n${note.trim()}` : '',
    ].join('\n');
    const href = `mailto:${site.mailto}?subject=${encodeURIComponent('A brief for SK Intelligence')}&body=${encodeURIComponent(body)}`;
    return (
      <div className="brief-done" role="status" tabIndex={-1} ref={doneRef}>
        <p className="brief-done-lead">That didn&rsquo;t go through.</p>
        <p className="brief-done-body">Your brief hasn&rsquo;t reached us yet.</p>
        <p className="brief-done-small">
          Please email it to <a href={href}>{site.mailto}</a> and we will pick it up from there. Your answers are kept below if you would rather try again.
        </p>
        <div className="brief-actions">
          <a className="btn brief-send" href={href}>Email the brief</a>
          <button type="button" className="brief-alt" onClick={() => { setUndelivered(false); focusAfter.current = DOM_ID.name; }}>Back to the brief</button>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="brief-done" role="status" tabIndex={-1} ref={doneRef}>
        <p className="brief-done-lead">Thanks, {sent.first}.</p>
        <p className="brief-done-body">
          We&rsquo;ll reply to <span className="brief-done-mail">{sent.email}</span> about {sent.about} for your {sent.whose}.
        </p>
        <p className="brief-done-small">
          Something to add? Write to <a href={`mailto:${site.mailto}`}>{site.mailto}</a>.
        </p>
        <div className="brief-actions">
          <button type="button" className="brief-alt" onClick={again}>Send another brief</button>
        </div>
      </div>
    );
  }

  return (
    <form className="brief" onSubmit={onSubmit} noValidate aria-busy={sending || undefined}>
      <div role="group" aria-label="Your brief, written as a sentence for you to complete">
        <p className="brief-line">
          We run a{' '}
          {sector === OTHER ? (
            <>
              <TextBlank
                id={`${DOM_ID.sector}-text`} label="What kind of business do you run?" placeholder="what kind of business"
                value={sectorOther} onChange={setSectorOther} maxLength={LIMITS.other}
                invalid={bad('sector')} describedBy={described}
              />
              <button
                type="button" className="blank-back" aria-label="Choose the kind of business from the list instead"
                onClick={() => { setSector(''); setSectorOther(''); focusAfter.current = DOM_ID.sector; }}
              ><span aria-hidden="true" /></button>
            </>
          ) : (
            <SelectBlank
              id={DOM_ID.sector} label="What kind of business do you run?" placeholder="type of business"
              value={sector} options={SECTORS} withOther invalid={bad('sector')} describedBy={described}
              onChange={(v) => { setSector(v); if (v === OTHER) focusAfter.current = `${DOM_ID.sector}-text`; }}
            />
          )}{' '}
          and we want to{' '}
          {goal === OTHER ? (
            <>
              <TextBlank
                id={`${DOM_ID.goal}-text`} label="What would you like to change?" placeholder="what to change"
                value={goalOther} onChange={setGoalOther} maxLength={LIMITS.other}
                invalid={bad('goal')} describedBy={described}
              />
              <button
                type="button" className="blank-back" aria-label="Choose what to change from the list instead"
                onClick={() => { setGoal(''); setGoalOther(''); focusAfter.current = DOM_ID.goal; }}
              ><span aria-hidden="true" /></button>
            </>
          ) : (
            <SelectBlank
              id={DOM_ID.goal} label="What would you like to change?" placeholder="what to change"
              value={goal} options={GOALS} withOther invalid={bad('goal')} describedBy={described}
              onChange={(v) => { setGoal(v); if (v === OTHER) focusAfter.current = `${DOM_ID.goal}-text`; }}
            />
          )}
          ,{' '}
          <SelectBlank
            id={DOM_ID.timing} label="When would you like it done?" placeholder="when"
            value={timing} options={TIMINGS} invalid={bad('timing')} describedBy={described} onChange={setTiming}
          />
          .
        </p>

        <p className="brief-line">
          I&rsquo;m{' '}
          <TextBlank
            id={DOM_ID.name} label="Your name" placeholder="your name" value={name} onChange={setName}
            autoComplete="name" maxLength={120} invalid={bad('name')} describedBy={described}
          />
          , reach me at{' '}
          <TextBlank
            id={DOM_ID.email} label="Your email address" placeholder="you@email.com" type="email" value={email}
            onChange={setEmail} autoComplete="email" maxLength={200} invalid={bad('email')} describedBy={described}
          />
          .
        </p>
      </div>

      <div className="brief-note">
        <label htmlFor={`${uid}-note`}>Anything else?</label>
        <textarea
          id={`${uid}-note`} ref={noteRef} rows={1} value={note} maxLength={LIMITS.note}
          placeholder="optional, a line or two is plenty" data-filled={note ? '' : undefined}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Bot trap: real people never see it, and it is hidden from AT as well. */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="brief-trap" />

      <p key={errorSeq} id={errorId} className="brief-error" role="alert">{error}</p>

      <div className="brief-actions">
        <button type="submit" className="btn brief-send" aria-disabled={sending || undefined}>
          {sending ? 'Sending…' : 'Send the brief'}
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M3 10h13M11 4.5 16.5 10 11 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="brief-alt" onClick={onBook}>Or book a call instead</button>
      </div>
    </form>
  );
}

/** "a, b and c" */
function list(items: string[]) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
}
