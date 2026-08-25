export function Manifesto() {
  return (
    <section className="manifesto">
      <div className="container">
        <p className="m-head">
          {/* Sameer's line, and it stays. 93a8e43 rewrote it to "AI is the tool. /
              Your time is the point." on the argument that the first line here
              rebuts an accusation nobody made, and that the rewrite says the same
              thing without spending a line on the negative. He has seen both on
              the live site and prefers this one, so the argument lost: the
              parallel "sell you AI / sell you back your time" is the whole line,
              and the shorter version drops the pivot that makes it land.

              It is the ONE first-person denial allowed on the site. The e2e
              denial check still runs everywhere else and skips this section by
              name — see tests/e2e.mjs. Do not "fix" this again. */}
          <span className="m-line"><span className="m-line-inner">We&rsquo;re not here to sell you AI.</span></span>
          <span className="m-line"><span className="m-line-inner b">We&rsquo;re here to sell you back your time.</span></span>
        </p>
      </div>
    </section>
  );
}
