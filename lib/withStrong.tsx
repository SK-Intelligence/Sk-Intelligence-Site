/**
 * Render the one piece of markup `content.ts` carries, without an HTML sink.
 *
 * Those strings mark organisation names with <strong> and nothing else. Passing
 * them to dangerouslySetInnerHTML is safe today because that module is static
 * and authored — but it is safe by circumstance, not by construction: the day
 * anything upstream of those strings becomes editable by someone else, it is an
 * XSS hole and nothing about the call site would have changed to warn you.
 *
 * Splitting on the tag costs four lines and closes that off. Anything other
 * than <strong> renders as visible literal text rather than executing, which is
 * the right way for this to fail: obvious in review, inert in production.
 */
export function withStrong(html: string): React.ReactNode[] {
  return html.split(/<strong>|<\/strong>/).map((part, i) =>
    // Odd indices are the spans that sat between the tags.
    i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  );
}
