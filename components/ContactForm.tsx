'use client';

import { useState } from 'react';
import { site } from '@/lib/content';

type Status = { state: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

/**
 * Posts to /api/contact. Deliberately degrades: with JS off (or if the endpoint
 * is unreachable) the mailto link below is still the working path, so the page
 * never becomes a dead end.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus({ state: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      setStatus({ state: 'sent', message: json.message });
      form.reset();
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  }

  if (status.state === 'sent') {
    return (
      <p className="cta-contact" role="status">
        Thanks — that&rsquo;s with us. We&rsquo;ll come back to you at the address you gave.
      </p>
    );
  }

  return (
    <form className="cta-form" onSubmit={onSubmit} noValidate={false}>
      <div className="cta-form-row">
        <label className="visually-hidden" htmlFor="cf-name">Your name</label>
        <input id="cf-name" name="name" type="text" placeholder="Your name" required autoComplete="name" />
        <label className="visually-hidden" htmlFor="cf-email">Your email</label>
        <input id="cf-email" name="email" type="email" placeholder="Your email" required autoComplete="email" />
      </div>
      <label className="visually-hidden" htmlFor="cf-message">Where is it breaking?</label>
      <textarea id="cf-message" name="message" rows={3} placeholder="Where is it breaking?" required />
      {/* Bot trap — real people never fill this; it is hidden from AT too. */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cta-form-trap" />
      <div className="cta-form-actions">
        <button type="submit" className="btn btn-glass-primary" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Send it over'}
        </button>
        <a href={`mailto:${site.mailto}`} className="btn btn-ghost-dark">Or just email us</a>
      </div>
      {status.state === 'error' && (
        <p className="cta-form-error" role="alert">{status.message}</p>
      )}
    </form>
  );
}
