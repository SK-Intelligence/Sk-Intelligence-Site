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
 * Founder cards: a short bio, then the background behind it.
 *
 * These were a list of seven credentials each and it did not land. A list of
 * seven achievements reads as weaker than one fact that implies the rest,
 * because each item dilutes the one before it and the reader stops absorbing
 * around the fourth. So each card now makes ONE claim, the AI work, and the
 * employers sit underneath it as ballast rather than as the pitch.
 *
 * Deliberately dropped, and not to be quietly reinstated: the hackathon win,
 * the Megaw Lecture placing, the MISO research listing and the degree classes.
 * Competition placings do not sell to the person doing the hiring, and the
 * cards are stronger for making one point clearly. Everything cut is still on
 * their LinkedIn, which each card links to.
 *
 * `bio` and `background` are one paragraph each. Keep them to that: the whole
 * reason this section was rewritten was that there was too much to take in.
 */
export const founders = [
  {
    slug: 'sameer',
    monogram: 'SG',
    name: 'Sameer Gul',
    linkedin: 'https://www.linkedin.com/in/sameer-g-4728a3260/',
    bio: 'I work in AI security. My research is on trust-explicit systems: building AI you can actually inspect, so you can tell what it did and why rather than taking its word for it.',
    background: 'Before this I was writing software behind live financial markets, at the <strong>London Stock Exchange</strong> and at <strong>CME Group</strong>. I was a founding engineer at an agentic AI audit startup serving enterprise clients.',
  },
  {
    slug: 'kenneth',
    monogram: 'KO',
    name: 'Kenneth Obanor',
    linkedin: 'https://www.linkedin.com/in/kenneth-obanor-060609275/',
    bio: 'I work on AI-assisted software and whether it survives contact with time: what models are genuinely good at building, where they cost more than they save, and how you keep the result something a team can maintain.',
    background: 'I have built product software at <strong>Squarespace</strong> and run operations at <strong>Amazon</strong>. I was a founding engineer at an agentic AI audit startup serving enterprise clients.',
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

/** Verbatim client words — do not reword. */
export const clients = [
  {
    id: 'hopeful',
    name: 'Hopeful Hearts LTD',
    logo: '/clients/c-hopeful.png',
    work: 'Company email set up, configured and supported as the team grew.',
    url: 'https://hopefulheartsltd.com',
    urlLabel: 'hopefulheartsltd.com',
    quote: 'Impressed with the efficiency and professionalism. The entire process was smooth and hassle-free.',
    detail: [
      'Company email across Outlook / Google Workspace',
      'Account creation, DNS and mailbox configuration',
      'Ongoing support and changes as the team grew',
    ]
  },
  {
    id: 'gbautos',
    name: 'GB Autos & Tyres',
    logo: '/clients/c-gbautos.png',
    work: 'Their first ever website, built with no online presence to start from.',
    url: 'https://gbautosandtyres.co.uk',
    urlLabel: 'gbautosandtyres.co.uk',
    quote: 'Great job by SK on our first-ever website! I had no online presence before.',
    detail: [
      'First online presence, built from nothing',
      'Services, location and contact structured for local search',
      'Set up so the owner can be found and contacted directly',
    ]
  },
  {
    id: 'ossett',
    name: 'Ossett Tyres',
    logo: '/clients/c-ossett.png',
    work: 'Vehicle registration lookup API integration, with a custom front end and backend.',
    url: 'https://ossettyres.co.uk',
    urlLabel: 'ossettyres.co.uk',
    quote: 'Highly impressed with the services they provided. They made a top-notch website.',
    detail: [
      'DVLA registration-lookup API integration',
      'Original-equipment tyre fitment data, matched per vehicle',
      'Custom front end over a serverless backend on Vercel',
      'Automated order and enquiry emails, tracked in Google Sheets',
      'Handling 50+ customer enquiries a month',
    ]
  },
  {
    id: 'astar',
    name: 'A Star Customs',
    logo: '/clients/c-astar.png',
    work: 'Full e-commerce build covering products, payments and checkout.',
    url: 'https://astarcustoms.com',
    urlLabel: 'astarcustoms.com',
    quote: 'Absolutely in awe with their work, made a very modern website with an integrated shop.',
    detail: [
      'Storefront built from scratch for the brand',
      'Product and inventory management',
      'Secure payment processing and checkout',
      'Built, launched and supported end to end',
    ]
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
