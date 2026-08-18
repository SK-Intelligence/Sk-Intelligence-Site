import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Contact endpoint.
 *
 * Validates and rate-limits, then hands off to whatever delivery you configure.
 * Right now delivery is intentionally a no-op that logs server-side: there is no
 * mail provider wired up, and silently pretending to send would be worse than
 * saying so. Set RESEND_API_KEY / CONTACT_TO (or swap in another provider in
 * `deliver`) and the submissions start arriving.
 */

type Payload = { name?: unknown; email?: unknown; message?: unknown; company_website?: unknown };

const MAX = { name: 120, email: 200, message: 4000 };
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

async function deliver(msg: { name: string; email: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) {
    console.warn('[contact] no mail provider configured — submission not delivered:', {
      name: msg.name,
      email: msg.email,
    });
    return { delivered: false };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM ?? 'SK Intelligence <onboarding@resend.dev>',
      to,
      reply_to: msg.email,
      subject: `Enquiry from ${msg.name}`,
      text: `${msg.name} <${msg.email}>\n\n${msg.message}`,
    }),
  });
  if (!res.ok) throw new Error(`mail provider returned ${res.status}`);
  return { delivered: true };
}

export async function POST(request: Request) {
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

  // Honeypot: a real person never fills a field they cannot see.
  if (str(body.company_website, 100)) {
    return NextResponse.json({ ok: true, message: 'Thanks, that’s with us.' }, { status: 200 });
  }

  const name = str(body.name, MAX.name);
  const email = str(body.email, MAX.email);
  const message = str(body.message, MAX.message);

  const errors: string[] = [];
  if (!name) errors.push('a name');
  if (!EMAIL.test(email)) errors.push('a valid email address');
  if (message.length < 10) errors.push('a bit more detail');
  if (errors.length) {
    // "a name, a valid email address and a bit more detail" — the comma-spliced
    // list without the conjunction read like machine output.
    const list = errors.length > 1
      ? `${errors.slice(0, -1).join(', ')} and ${errors[errors.length - 1]}`
      : errors[0];
    return NextResponse.json({ error: `Please include ${list}.` }, { status: 400 });
  }

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
