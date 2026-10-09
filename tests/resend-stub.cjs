/* Preloaded (NODE_OPTIONS=--require) into a throwaway server by the e2e suite.
   Answers Resend's API locally and writes each request body to the file named
   in RESEND_STUB_LOG, so the suite can see exactly what /api/contact would have
   sent without an account or a network. Everything else passes through. */
/* eslint-disable-next-line @typescript-eslint/no-require-imports -- must be CommonJS to load through --require */
const fs = require('node:fs');
const real = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.resend.com/')) {
    fs.appendFileSync(process.env.RESEND_STUB_LOG, init.body + '\n');
    return new Response('{}', { status: 200 });
  }
  return real(url, init);
};
