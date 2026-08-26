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
      'Engineering roles in global stock market systems at <strong>LSEG</strong> and <strong>CME Group</strong>',
      'Enterprise agentic AI systems for <strong>Big Four</strong> audit firms',
      'Agentic AI research across <strong>MISO & Sourcing Lens</strong>, including auditable net-zero procurement',
      'Published AI security research on trust-explicit systems and secure agentic AI',
      'Award-winning cross-border AI-native medical systems with <strong>NHS</strong> and <strong>HSE</strong> involvement',
    ],
  },
  {
    slug: 'kenneth',
    monogram: 'KO',
    name: 'Kenneth Obanor',
    linkedin: 'https://www.linkedin.com/in/kenneth-obanor-060609275/',
    credentials: [
      'Engineering roles at <strong>Squarespace</strong> and <strong>Amazon</strong>, working with data and scalable production systems',
      'Enterprise agentic AI systems for <strong>Big Four</strong> audit firms',
      'Agentic AI research across <strong>MISO & Sourcing Lens</strong>, including auditable net-zero procurement',
      'Published research on AI-driven software maintainability, longevity and sustainability, benchmarked against <strong>SonarQube</strong>',
      'Award-winning cross-border AI-native medical systems with <strong>NHS</strong> and <strong>HSE</strong> involvement',
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
  name: 'The engineering team',
  role: 'Developers',
  bio: 'The same developers build and deploy every project we take on, working alongside us throughout.',
  background: 'Everything is built for real concurrent use. Most of what we get called in to fix ran fine until more than a handful of people were on it at once.',
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
 * Some of these are real and should survive the rewrite:
 *   - ossett "50+ enquiries a month" was already on the site and is theirs.
 *   - ossett "5 vehicle fields" is provable: the lookup returns make, year,
 *     engine, fuel and colour, which is exactly what the screenshot shows.
 *   - ALL THREE provena values are real and checkable against that project's
 *     own README: five onboarding questions, three connectors (Anthropic API,
 *     LangSmith, Trust Center), seven evidence templates. They live here only
 *     because the type below demands a key per client. Do not "correct" them
 *     on the strength of the banner above.
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
  provena: [
    { value: '5', label: 'Onboarding questions' },  // real
    { value: '3', label: 'Live connectors' },       // real
    { value: '7', label: 'Evidence templates' },    // real
  ],
};

/**
 * The builds.
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
    id: 'hopeful',
    name: 'Hopeful Hearts LTD',
    sector: 'Family services',
    logo: '/clients/c-hopeful.png',
    work: 'Company email set up, configured and supported as the team grew.',
    outcome: 'A family services team in Cavan moved onto company email that authenticates properly and lands in the inbox.',
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
  {
    id: 'gbautos',
    name: 'GB Autos & Tyres',
    sector: 'Vehicle servicing',
    logo: '/clients/c-gbautos.png',
    work: 'Their first ever website, built with no online presence to start from.',
    outcome: 'A Feltham garage trading since 2009 went from no online presence at all to being findable by the people already looking for them.',
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
    id: 'ossett',
    name: 'Ossett Tyres',
    sector: 'Tyre retail',
    logo: '/clients/c-ossett.png',
    work: 'A registration lookup that returns the exact tyre fitment for any vehicle.',
    outcome: 'A customer types their number plate and the tool resolves the vehicle against DVLA records, then returns the original front and rear tyre sizes without anyone in the garage looking them up.',
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
    id: 'astar',
    name: 'A Star Customs',
    sector: 'Automotive customisation',
    logo: '/clients/c-astar.png',
    work: 'Full e-commerce build covering products, payments and checkout.',
    outcome: 'A London customs shop got a storefront that sells: products, inventory, payments and checkout, built from scratch for the brand.',
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
  /* Last in the array on purpose: it lands as the fifth tab and the four client
     builds keep the running order they had. No `quote` and no `logo` — see the
     note above the array, and leave both absent. */
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
    work: 'A compliance platform that turns a live AI stack into an auditor-ready binder.',
    outcome: 'An AI deployer connects their stack and answers five questions. Each use case comes back classified against the EU AI Act, GDPR and DORA, with the evidence a regulator asks for generated underneath it and held behind human sign-off.',
    shots: [
      {
        src: '/work/provena-1.png',
        alt: 'The Provena AI compliance dashboard showing binder readiness, progress against the EU AI Act, GDPR and DORA, and the open compliance gaps, running on sample data',
        label: 'Compliance dashboard',
      },
    ],
    detail: [
      'Five-question onboarding that classifies each AI use case against EU AI Act Annex III, GDPR Articles 22 and 35, and DORA',
      'A deterministic rule engine written against specific regulation clauses, snapshot-pinned whenever a binder is generated',
      'Three connectors reading live usage from the Anthropic API, LangSmith traces and the Anthropic Trust Center',
      'Seven evidence templates covering DPIA, Article 26 deployer evidence and Article 30 records of processing',
      'Human approval before any binder finalises, with every clause citation and sign-off recorded',
      'FastAPI and PostgreSQL behind a Next.js dashboard, with Redis-backed background workers',
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
