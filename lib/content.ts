/**
 * All site copy in one place.
 *
 * The testimonials are verbatim client words and the founder facts are all
 * externally verifiable — neither should be reworded without checking the
 * source. Everything else is marketing copy and is safe to edit freely.
 */

export const site = {
  name: 'SK Intelligence',
  tagline: 'AI-native, forward-deployed',
  description:
    'SK Intelligence: an AI-native consultancy that embeds inside your operations, finds the bottleneck, builds the fix, then forward-deploys until it sticks.',
  /** Displayed address. The real mailbox is `mailto`. */
  emailDisplay: 'hello@skintelligence',
  mailto: 'skwebminds@gmail.com',
  socials: [
    { label: 'Sameer Gul on LinkedIn', href: 'https://www.linkedin.com/in/sameer-g-4728a3260/', icon: 'linkedin' },
    { label: 'Kenneth Obanor on LinkedIn', href: 'https://www.linkedin.com/in/kenneth-obanor-060609275/', icon: 'linkedin' },
    { label: 'Facebook', href: 'https://facebook.com/profile.php?id=61553097449850', icon: 'facebook' },
    { label: 'Instagram', href: 'https://instagram.com/skwebminds', icon: 'instagram' },
    { label: 'X (Twitter)', href: 'https://twitter.com/skwebminds', icon: 'x' },
  ],
} as const;

export const nav = [
  { label: 'What we do', href: '/#what-we-do' },
  { label: 'Process', href: '/#process' },
  { label: 'Co-founders', href: '/#founders' },
  { label: 'Work', href: '/#work' },
  { label: 'Build studio', href: '/studio' },
] as const;

export const pillars = [
  {
    num: '01',
    title: 'AI Opportunity Discovery & Audit',
    body: 'We spend real time inside your operations, working out where the hours go, where handoffs break, and what that costs you every month.',
  },
  {
    num: '02',
    title: 'Workflow Automation & Systems Integration',
    body: 'The unglamorous work that pays for itself: connecting the tools you already run so information stops getting lost between them.',
  },
  {
    num: '03',
    title: 'Custom AI Tooling',
    body: 'Agents, copilots and internal tools shaped around how your team already works, using your data and your process.',
  },
  {
    num: '04',
    title: 'Forward-Deployed Engineering',
    body: 'We sit with your team, wire the fix into your real systems, and train the people who’ll own it. We leave when they can run it.',
  },
] as const;

export const phases = [
  {
    index: '01 / 03 · Discover',
    ghost: 'Discover',
    title: 'Discover',
    body: 'We embed with your team for a defined period, audit how the day-to-day actually runs, and put a number on what the bottlenecks are costing you in hours and in rework.',
  },
  {
    index: '02 / 03 · Build',
    ghost: 'Build',
    title: 'Build',
    body: 'We design and ship the fix. Quick automation wins first, then the deeper tooling: internal apps, agents and integrations, built around how your team already operates.',
  },
  {
    index: '03 / 03 · Forward‑Deploy',
    ghost: 'Forward‑Deploy',
    title: 'Forward-Deploy',
    body: 'We wire what we built into your real systems, train your people to own it, and stay embedded until your team runs it without us.',
  },
] as const;

/**
 * Founder cards: five credentials each, in a fixed order.
 *
 * The order is the argument, and it is the same on both cards so the two read
 * as a pair rather than as two separate pitches: where they have worked, then
 * the enterprise AI work, then the research, then the awards. Employers first
 * because that is what a prospective client recognises without being told why
 * it matters; research and awards last because they only land once the reader
 * already believes these two can build.
 *
 * Five is the cap. An earlier version ran seven each and diluted itself —
 * degree classes and hackathon placings sat alongside the LSEG and CME work and
 * flattened it. Anything that does not survive the cut is still on their
 * LinkedIn, which each card links to.
 *
 * <strong> is the ONLY markup allowed in these strings, and only around an
 * organisation name. `withStrong` in lib/withStrong.tsx renders it; anything
 * else you put here shows up as visible literal text rather than executing.
 * That includes HTML entities — it splits on the tag rather than parsing HTML,
 * so write a literal `&`, not `&amp;`, or the reader sees the ampersand spelt out.
 */
export const founders = [
  {
    slug: 'sameer',
    monogram: 'SG',
    name: 'Sameer Gul',
    linkedin: 'https://www.linkedin.com/in/sameer-g-4728a3260/',
    credentials: [
      'Stock market systems at <strong>LSEG</strong> and <strong>CME Group</strong>',
      'Enterprise agentic AI for <strong>Big Four</strong> audit firms',
      'Agentic AI research at <strong>MISO & Sourcing Lens</strong>: auditable net-zero procurement',
      'Published AI security research on trust-explicit systems',
      'Award-winning AI medical systems with <strong>NHS</strong> and <strong>HSE</strong>',
    ],
  },
  {
    slug: 'kenneth',
    monogram: 'KO',
    name: 'Kenneth Obanor',
    linkedin: 'https://www.linkedin.com/in/kenneth-obanor-060609275/',
    credentials: [
      'Data and production systems at <strong>Squarespace</strong> and <strong>Amazon</strong>',
      'Enterprise agentic AI for <strong>Big Four</strong> audit firms',
      'Agentic AI research at <strong>MISO & Sourcing Lens</strong>: auditable net-zero procurement',
      'Published research on AI code maintainability, benchmarked against <strong>SonarQube</strong>',
      'Award-winning AI medical systems with <strong>NHS</strong> and <strong>HSE</strong>',
    ],
  },
] as const;

/**
 * The third card in the founders carousel. Not a person, so it carries no
 * portrait, no monogram and no outbound link, and it says nothing about
 * headcount because no number has ever been given for it.
 *
 * These developers are part of the company. Say that by describing what they
 * do, never by denying the alternative: an earlier draft ran "not a bench we
 * hire in", which plants the suspicion it was trying to remove. "The same
 * developers, every project" carries it without the defensiveness.
 */
export const deliveryTeam = {
  name: 'The delivery team',
  role: 'Developers',
  /* Prose, where the founder cards are lists. A credential list earns its
     format because the entries are genuinely parallel and each one stands
     alone: a role, a paper, an award. What this team does is one continuous
     thing, and cutting it into five fragments made a description read like a
     scorecard. Every fact from that list survives here, in two sentences.

     `brief` is an array of paragraphs rather than one string so the card can
     break where it reads best without markup in the copy. */
  brief: [
    'Engineers who work directly alongside the co-founders, building AI-native products and software: agentic AI, automation and workflow systems.',
    'They own the cloud infrastructure and production deployment underneath, so what ships scales past proof-of-concept rather than stopping there.',
  ],
} as const;

/**
 * ⚠️ PLACEHOLDER METRICS — MOSTLY NOT REAL. ⚠️
 *
 * Sameer replaces these with real figures before this section is shown to
 * anyone. They exist to establish the layout and to show what shape of number
 * belongs in each slot.
 *
 * This object is the ONLY place any client figure lives. Editing it updates the
 * whole case bank; nothing else in the codebase carries a number about a
 * client. Search for PLACEHOLDER to find this and nothing else.
 *
 * ⚠️ AND THEY ARE CURRENTLY LIVE. The line above has said "before this section
 * is shown to anyone" since it was written, but the section has been deployed
 * for a while now, so every invented figure below is on a public page being
 * read by prospective clients as though it were measured. That is the one
 * thing in this file worth fixing before anything else in it.
 *
 * Only two are real:
 *   - ossett "50+ enquiries a month" was already on the site and is theirs.
 *   - ossett "5 vehicle fields" is provable: the lookup returns make, year,
 *     engine, fuel and colour, which is exactly what the screenshot shows.
 */
export type Metric = { value: string; label: string };

/* Keyed off the clients array rather than `string`, so renaming or adding a
   client is a type error here instead of `undefined.map` at render time — which
   in a client component takes the whole page down, not just this section. The
   forward reference to `clients` is fine despite it being declared below. */
export const PLACEHOLDER_METRICS:
  Record<(typeof clients)[number]['id'], readonly Metric[]> = {
  astar: [
    { value: '40+', label: 'Products live' },
    { value: '2.4×', label: 'Repeat order rate' },
    { value: '6 wks', label: 'Brief to launch' },
  ],
  ossett: [
    { value: '5', label: 'Vehicle fields per lookup' }, // real
    { value: '50+', label: 'Enquiries a month' },       // real
    { value: '9 min', label: 'Saved per enquiry' },
  ],
  gbautos: [
    { value: '1st', label: 'Page on local search' },
    { value: '35+', label: 'Enquiries a month' },
    { value: '3 wks', label: 'Brief to live' },
  ],
  hopeful: [
    { value: '12', label: 'Mailboxes provisioned' },
    { value: '3/3', label: 'Domain auth records' },
    { value: '99.9%', label: 'Delivery rate' },
  ],
  /* ⚠️ ALL THREE INVENTED. Sameer asked for ROI-shaped figures to sit here and
     said he would put the correct ones in later, so these show the SHAPE of the
     number that belongs in each slot and nothing more. The real product facts
     that used to be in this slot (five onboarding questions, three connectors,
     seven evidence templates) were not lost: they are in provena's `detail`. */
  provena: [
    { value: '90%', label: 'Less time to first binder' },
    { value: '3 days', label: 'From stack to binder' },
    { value: '£120k', label: 'Advisory spend avoided' },
  ],
};

/**
 * The builds.
 *
 * Each one answers three questions in order, because a reader deciding whether
 * to call you is asking them in that order: what did they want (`asked`), how
 * did you work it out (`approach`), what did it change (`impact`). The numbers
 * in PLACEHOLDER_METRICS sit under `impact` as the evidence for it.
 *
 * Keep each to one sentence. The three together replaced a single `outcome`
 * paragraph, and the point of splitting them was structure, not more words: if
 * they grow to a paragraph each the panel is longer than what it replaced and
 * worse at being skimmed.
 *
 * `asked` and `approach` describe real jobs, so neither may say more than is
 * actually known. Where a before-state is stated it is one the existing copy or
 * the screenshots already establish, not a discovery story written to sound
 * good. Provena has no client, so its `asked` is the market's problem rather
 * than a request from anyone.
 *
 * `quote` is verbatim client words — do not reword, in either direction.
 *
 * `quote` and `logo` are BOTH OPTIONAL, and the gap is deliberate. Four of
 * these five are jobs done for a named company that supplied a testimonial and
 * owns a logo. Provena AI is a compliance platform with no client behind it, so
 * it has neither, and the renderer omits both blocks rather than filling them.
 *
 * Saying nothing about who a build was for is not a claim. Writing a quote, or
 * dropping in a mark, would be: a testimonial attributed to a company that does
 * not exist is a fabricated endorsement sitting beside four real ones, which is
 * both a lie to the reader and unlawful for a trading company in the UK. If you
 * are here because the Provena panel "looks empty next to the others", that is
 * the panel being honest. Leave it.
 *
 * `shots` are build screenshots in public/work/, regenerated by `npm run shots`
 * from tools/. A Star is captured from the live site because that build stands
 * up on its own. Three are captured from the mockups in tools/mockups/, which
 * restyle real builds using only real content; each file says in its header
 * what is theirs and what is presentation. Provena is captured from its own
 * static export, unrestyled.
 *
 * There is deliberately no outbound link. Sameer asked to showcase the work
 * rather than send people away mid-section, and it keeps a sharpened interface
 * from inviting a comparison with a plainer live site.
 */
export type Shot = { src: string; alt: string; label: string };

export const clients = [
  {
    id: 'provena',
    name: 'Provena AI',
    sector: 'Regulatory compliance',
    logo: null,
    /* Explicitly null rather than omitted. The array is `as const`, so leaving
       the key out drops `quote` from the union entirely and every `c.quote` in
       both renditions stops compiling. Null keeps the property on the type and
       says out loud that there is nobody to quote. */
    quote: null,
    asked: 'AI deployers are facing the EU AI Act enforcement deadline with GRC tools that file an AI system as one more line in a risk register, rather than producing the evidence a regulator actually asks for.',
    approach: 'Read the live stack through its own APIs, classify every use case against the specific regulation clauses with a deterministic rule engine rather than a model, generate the evidence underneath it, and hold each binder behind human sign-off.',
    impact: 'Compliance officers reach an auditor-ready binder in days instead of the months a hand-built pack takes, and the evidence stands up because every clause cites its source.',
    shots: [
      {
        src: '/work/provena-1.png',
        alt: 'The Provena AI compliance dashboard showing binder readiness, progress against the EU AI Act, GDPR and DORA, and the open compliance gaps, running on sample data',
        label: 'Compliance dashboard',
      },
    ],
    detail: [
      'Use cases classified against EU AI Act Annex III, GDPR and DORA',
      'Deterministic rule engine, pinned to the clause it cites',
      'Connectors for Anthropic API, LangSmith and Trust Center',
      'Seven evidence templates, DPIA to Article 30',
      'Human sign-off before any binder finalises',
      'FastAPI, PostgreSQL and Redis behind a Next.js dashboard',
    ],
  },
  {
    id: 'astar',
    name: 'A Star Customs',
    sector: 'Automotive customisation',
    logo: '/clients/c-astar.png',
    asked: 'A storefront that could sell on its own: products, inventory, payments and checkout, built for the brand rather than dropped onto a template.',
    approach: 'Built from scratch around their catalogue and their custom-kit work, with secure payments and checkout wired in, then launched and supported end to end.',
    impact: 'The shop trades without anyone in the business processing an order by hand, and the gallery and custom kits are theirs to manage.',
    quote: 'Absolutely in awe with their work, made a very modern website with an integrated shop.',
    shots: [
      { src: '/work/astar-1.png', alt: 'A Star Customs home page', label: 'Home' },
      { src: '/work/astar-2.png', alt: 'A Star Customs shop with products for sale', label: 'Shop' },
      { src: '/work/astar-3.png', alt: 'A Star Customs gallery of completed builds', label: 'Gallery' },
      { src: '/work/astar-4.png', alt: 'A Star Customs services page showing screen upgrades, star lights and ambient lighting', label: 'Services' },
    ],
    detail: [
      'Storefront built from scratch for the brand',
      'Product and inventory management',
      'Secure payment processing and checkout',
      'Gallery, custom kits and collaborations, all self-managed',
      'Built, launched and supported end to end',
    ],
  },
  /* First on purpose. `active` defaults to 0 in ClientWork, so whatever leads
     this array is the mark that starts selected and the panel that greets a
     reader who never touches the strip. No `quote` and no `logo` — see the note
     above the array, and leave both absent. */
  {
    id: 'ossett',
    name: 'Ossett Tyres',
    sector: 'Tyre retail',
    logo: '/clients/c-ossett.png',
    asked: 'Customers could not tell what tyres their car takes, so every enquiry began with someone in the garage looking the fitment up by hand.',
    approach: 'A registration lookup wired to DVLA records: the plate resolves the vehicle, and the tool returns the original front and rear fitment over a serverless backend on Vercel.',
    impact: 'The lookup answers the question the customer came with before anyone in the garage is involved, and every enquiry lands tracked rather than in a notebook.',
    quote: 'Highly impressed with the services they provided. They made a top-notch website.',
    shots: [
      { src: '/work/ossett-1.png', alt: 'Registration lookup with a UK number plate input and a tyre size explainer', label: 'Reg lookup' },
      { src: '/work/ossett-2.png', alt: 'Resolved vehicle showing make, year, engine, fuel and colour with front and rear tyre sizes', label: 'Vehicle resolved' },
    ],
    detail: [
      'DVLA registration-lookup API integration',
      'Make, year, engine, fuel and colour resolved per plate',
      'Original-equipment tyre fitment matched front and rear',
      'Custom front end over a serverless backend on Vercel',
      'Automated order and enquiry emails, tracked in Google Sheets',
    ],
  },
  {
    id: 'gbautos',
    name: 'GB Autos & Tyres',
    sector: 'Vehicle servicing',
    logo: '/clients/c-gbautos.png',
    asked: 'A Feltham garage trading since 2009 had no online presence at all, and wanted to be findable by the people already looking for it.',
    approach: 'A first website built from nothing, with services, location and opening hours structured for local search and the phone number on every screen.',
    impact: 'The garage now turns up when someone nearby searches for what it does, and those people can reach the owner directly.',
    quote: 'Great job by SK on our first-ever website! I had no online presence before.',
    shots: [
      { src: '/work/gbautos-1.png', alt: 'GB Autos home page with opening hours and contact details', label: 'Home' },
      { src: '/work/gbautos-2.png', alt: 'GB Autos services page listing servicing, tyres, brakes and body repairs', label: 'Services' },
    ],
    detail: [
      'First online presence, built from nothing',
      'Services, location and hours structured for local search',
      'Opening times and phone surfaced on every screen',
      'Set up so the owner can be found and contacted directly',
    ],
  },
  {
    id: 'hopeful',
    name: 'Hopeful Hearts LTD',
    sector: 'Family services',
    logo: '/clients/c-hopeful.png',
    asked: 'A growing family services team needed company email that authenticates properly instead of landing in spam.',
    approach: 'Mailboxes provisioned across Outlook and Google Workspace, domain records set for SPF, DKIM and DMARC, with support as the team grew.',
    impact: 'Mail from the team reaches the families and agencies it is sent to, and new staff get a working mailbox on day one.',
    quote: 'Impressed with the efficiency and professionalism. The entire process was smooth and hassle-free.',
    shots: [
      { src: '/work/hopeful-1.png', alt: 'Hopeful Hearts home page showing their objective and values', label: 'Home' },
      { src: '/work/hopeful-2.png', alt: 'Hopeful Hearts services page listing their five support services', label: 'Services' },
    ],
    detail: [
      'Company email across Outlook and Google Workspace',
      'Domain records configured for SPF, DKIM and DMARC',
      'Mailbox provisioning and account creation for the team',
      'Ongoing support and changes as the team grew',
    ],
  },
] as const;

export const studioServices = [
  { title: 'Websites & Web Apps', body: 'Marketing sites, dashboards, custom web platforms' },
  { title: 'E-Commerce', body: 'Full storefronts with products, payments and checkout' },
  { title: 'Mobile Apps', body: 'iOS and Android, native or cross-platform' },
  { title: 'SEO, Social & Email/Domain Services', body: 'Visibility and setup that gets a business found and kept online' },
] as const;

export const stack = [
  {
    title: 'AI & automation',
    body: 'The lead offering. Model integrations wired into the workflows your team already runs on.',
    items: ['LLM integrations', 'Agentic AI', 'Workflow automation', 'Internal tools & copilots', 'AI-assisted evaluation'],
  },
  {
    title: 'Backend & cloud',
    body: 'The parts that have to stay up. Built on the same stack we run behind financial-market systems.',
    items: ['Java', 'Spring Boot', 'Google Cloud', 'Kubernetes / GKE', 'Docker', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD'],
  },
  {
    title: 'Web & apps',
    body: 'Sites, storefronts and custom web apps, plus the serverless glue that makes them do real work.',
    items: ['TypeScript', 'React', 'Next.js', 'REST APIs', 'Serverless', 'E-commerce & payments', 'Mobile (iOS / Android)'],
  },
  {
    title: 'Integrations & reliability',
    body: 'Connecting the tools a business already runs, then making sure you can see it working.',
    items: ['Third-party APIs', 'DVLA vehicle data', 'Google Sheets API', 'Automated email workflows', 'Prometheus', 'Grafana', 'Monitoring & alerting'],
  },
] as const;
