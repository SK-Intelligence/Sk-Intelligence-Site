/**
 * The "send a brief" form, as data.
 *
 * Shared by the form (which renders these as the choices in the sentence) and
 * by /api/contact (which accepts only these ids). That is the point of having
 * one module: the server composes the email from the labels it holds, never
 * from label text the browser sends, so a doctored request can pick a different
 * option but cannot put its own words in the sentence. The free text is the
 * name, the email, the two "something else" blanks and the note, each with a
 * length cap on both sides.
 *
 * `label` is what completes the sentence on screen. `about` is the same idea
 * as a noun phrase, for the sentence that reads the brief back after sending.
 * Labels stay short on purpose: a blank cannot wrap, and at 320px a long one
 * would push the page sideways.
 */

export const OTHER = 'other';

export const SECTORS = [
  { id: 'restaurant', label: 'restaurant' },
  { id: 'garage', label: 'garage or tyre shop' },
  { id: 'vehicles', label: 'car customisation shop' },
  { id: 'family', label: 'family services team' },
  { id: 'regulated', label: 'regulated business' },
  { id: 'trade', label: 'local service business' },
  { id: 'retail', label: 'retail shop' },
] as const;

export const GOALS = [
  { id: 'bookings', label: 'automate bookings', about: 'automating bookings' },
  { id: 'enquiries', label: 'answer enquiries', about: 'answering enquiries' },
  { id: 'orders', label: 'take orders', about: 'taking orders' },
  { id: 'tools', label: 'connect our tools', about: 'connecting your tools' },
  { id: 'paperwork', label: 'sort out paperwork', about: 'sorting out paperwork' },
  { id: 'audit', label: 'find where AI helps', about: 'finding where AI can help' },
  { id: 'internal', label: 'build an internal tool', about: 'building an internal tool' },
  { id: 'web', label: 'build a website or app', about: 'building a website or app' },
] as const;

export const TIMINGS = [
  { id: 'asap', label: 'as soon as possible' },
  { id: 'quarter', label: 'this quarter' },
  { id: 'later', label: 'later this year' },
  { id: 'exploring', label: 'no rush, just exploring' },
] as const;

export const LIMITS = { other: 80, note: 1500 } as const;

export type Choice = { id: string; label: string };
export const findChoice = (list: readonly Choice[], id: unknown) =>
  typeof id === 'string' ? list.find((c) => c.id === id) : undefined;
