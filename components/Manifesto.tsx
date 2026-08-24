export function Manifesto() {
  return (
    <section className="manifesto">
      <div className="container">
        <p className="m-head">
          {/* This was "We're not here to sell you AI. We're here to sell you back your
              time." The second line was doing all the work and the first was
              rebutting an accusation nobody had made, which is the fastest way to
              put it in the reader's head. Contrast two things you DO stand for
              instead. */}
          <span className="m-line"><span className="m-line-inner">AI is the tool.</span></span>
          <span className="m-line"><span className="m-line-inner b">Your time is the point.</span></span>
        </p>
      </div>
    </section>
  );
}
