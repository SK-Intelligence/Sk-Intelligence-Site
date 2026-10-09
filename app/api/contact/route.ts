import { NextResponse } from 'next/server';

import { GOALS, LIMITS, OTHER, SECTORS, TIMINGS, findChoice } from '@/lib/brief';

export const runtime = 'nodejs';

/**
 * Contact endpoint for the "send a brief" form.
 *
 * Validates and rate-limits, then hands the brief to Resend. Set RESEND_API_KEY
 * and CONTACT_TO (optionally CONTACT_CC, CONTACT_FROM), or swap another
 * provider into `deliver`. With none configured it does not pretend: in
 * production (VERCEL_ENV) it answers 503, elsewhere `delivered: false`, which
 * the form shows as "this did not go through" rather than a thank-you.
 *
 * The browser sends ids for the three choices and the server writes the words
 * from lib/brief.ts, so a label is never taken from the client. The free text
 * is name, email, the two "something else" blanks and the note, all capped and
 * stripped of control and invisible formatting characters.
 */

type Payload = {
  name?: unknown; email?: unknown; company_website?: unknown;
  sector?: unknown; sector_other?: unknown; goal?: unknown; goal_other?: unknown;
  timing?: unknown; note?: unknown;
};

const MAX = { name: 120, email: 200 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Small in-memory limiter. Fine for one instance; use a shared store if you scale out. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude bound; this is not a real store
  return recent.length > MAX_PER_WINDOW;
}

function str(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/* Control characters (Cc) and invisible formatting characters (Cf: bidi
   overrides, zero-width spaces and joiners, the BOM), plus the two Unicode line
   separators. None has a place in a name, an address or a note, and the
   overrides can make a line read as something else in a mail client. */
const INVISIBLE = /[\p{Cc}\p{Cf}\u2028\u2029]+/gu;

/** One line of text: invisible characters out, runs of whitespace collapsed. */
function line(v: unknown, max: number) {
  return typeof v === 'string'
    ? v.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

/** Free text that may span lines: newlines are kept, everything invisible else is dropped. */
function block(v: unknown, max: number) {
  return typeof v === 'string'
    ? v.replace(/\r\n?/g, '\n').replace(/(?!\n)[\p{Cc}\p{Cf}\u2028\u2029]/gu, '')
        .replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
    : '';
}

/**
 * Resolve one blank of the brief. An id from the allowlist gives the server's
 * own label; the "other" id needs the visitor's words instead. Returns null when
 * neither holds, which the caller reports as the blank being missing.
 */
function blank(list: readonly { id: string; label: string }[], id: unknown, other: unknown) {
  if (id === OTHER) {
    const text = line(other, LIMITS.other);
    return text.length >= 2 ? text : null;
  }
  return findChoice(list, id)?.label ?? null;
}

/**
 * CONTACT_CC: optional, comma-separated. Trimmed, empties dropped, and anything
 * that is not an address is dropped too (and said so in the log), because one
 * malformed entry makes the provider refuse the whole message and every
 * submission would then fail.
 */
function ccList(raw: string | undefined) {
  const out: string[] = [];
  for (const part of (raw ?? '').split(',')) {
    const a = part.trim();
    if (!a) continue;
    if (EMAIL.test(a)) out.push(a);
    else console.warn('[contact] ignoring malformed CONTACT_CC entry');
  }
  return out;
}

async function deliver(msg: { name: string; email: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) {
    /* Nothing about the submission is logged: the fact of the drop is the news. */
    console.warn('[contact] no mail provider configured, submission dropped');
    return { delivered: false };
  }
  const cc = ccList(process.env.CONTACT_CC);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM ?? 'SK Intelligence <onboarding@resend.dev>',
      to,
      ...(cc.length ? { cc } : {}),
      reply_to: msg.email,
      subject: `Enquiry from ${msg.name}`,
      text: `${msg.name} <${msg.email}>\n\n${msg.message}`,
    }),
  });
  if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
  return { delivered: true };
}

export async function POST(request: Request) {
  /* Only this site's own form may post here. request.json() parses any
     content type, so without this a cross-site <form enctype="text/plain"> or a
     no-cors fetch could drive the endpoint, each hit counted against whatever
     address the forwarded header names. Browsers send Sec-Fetch-Site on every
     request; its absence means a non-browser client, which is let through
     because it is no more able to forge the header than to omit it. */
  const site = request.headers.get('sec-fetch-site');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || (site && site !== 'same-origin')) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 403 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many messages just now. Try again shortly.' }, { status: 429 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: a real person never fills a field they cannot see.
  if (str(body.company_website, 100)) {
    return NextResponse.json({ ok: true, message: 'Thanks, that’s with us.' }, { status: 200 });
  }

  const name = line(body.name, MAX.name);
  const email = line(body.email, MAX.email);
  const sector = blank(SECTORS, body.sector, body.sector_other);
  const goal = blank(GOALS, body.goal, body.goal_other);
  const timing = findChoice(TIMINGS, body.timing)?.label ?? null;
  const note = block(body.note, LIMITS.note);

  const errors: string[] = [];
  if (!sector) errors.push('the kind of business you run');
  if (!goal) errors.push('what you want to change');
  if (!timing) errors.push('when you would like it done');
  if (!name) errors.push('a name');
  if (!EMAIL.test(email)) errors.push('a valid email address');
  if (errors.length) {
    // "a name and a valid email address", with the conjunction: the
    // comma-spliced list read like machine output.
    const list = errors.length > 1
      ? `${errors.slice(0, -1).join(', ')} and ${errors[errors.length - 1]}`
      : errors[0];
    return NextResponse.json({ error: `Please include ${list}.` }, { status: 400 });
  }

  /* On the live site an unconfigured provider is a fault to surface, not a
     state to smile through: a visitor who is told "thanks" for a brief that
     went nowhere is worse off than one who is told to email. */
  if ((!process.env.RESEND_API_KEY || !process.env.CONTACT_TO) && process.env.VERCEL_ENV === 'production') {
    console.error('[contact] mail provider is not configured in production, submission dropped');
    return NextResponse.json({ error: 'We couldn’t send that just now. Please email us directly.' }, { status: 503 });
  }

  const message = [
    `Business: ${sector}`,
    `Wants to: ${goal}`,
    `Timing: ${timing}`,
    note ? `\nAnything else:\n${note}` : '',
  ].join('\n').trim();

  try {
    const { delivered } = await deliver({ name, email, message });
    return NextResponse.json(
      { ok: true, delivered, message: 'Thanks, that’s with us.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('[contact] delivery failed:', err);
    return NextResponse.json(
      { error: 'We couldn’t send that just now. Please email us directly.' },
      { status: 502 },
    );
  }
}
