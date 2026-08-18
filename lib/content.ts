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
    body: 'We spend real time inside your operations — mapping where hours disappear, where handoffs fail, and what the status quo is quietly costing you.',
  },
  {
    num: '02',
    title: 'Workflow Automation & Systems Integration',
    body: 'The unglamorous work that pays for itself: connecting the tools you already run so information stops getting lost between them.',
  },
  {
    num: '03',
    title: 'Custom AI Tooling',
    body: 'Agents, copilots, and internal tools built around the way your team actually works — not a generic wrapper bolted onto a chatbot.',
  },
  {
    num: '04',
    title: 'Forward-Deployed Engineering',
    body: 'We don’t hand off a deck and disappear. We sit with your team, wire the fix into your real systems, and train the people who’ll own it.',
  },
] as const;

export const phases = [
  {
    index: '01 / 03 — Discover',
    ghost: 'Discover',
    title: 'Discover',
    body: 'We embed with your team for a defined period, audit day-to-day operations, and quantify what the bottlenecks are actually costing — in hours, in errors, in opportunity.',
  },
  {
    index: '02 / 03 — Build',
    ghost: 'Build',
    title: 'Build',
    body: 'We design and ship the fix. Automations and quick wins first, then the deeper tooling — internal apps, agents, integrations — built around how your team already operates.',
  },
  {
    index: '03 / 03 — Forward‑Deploy',
    ghost: 'Forward‑Deploy',
    title: 'Forward-Deploy',
    body: 'We integrate what we built into your real systems and workflows, train your people to own it, and stay embedded until it’s simply how things run.',
  },
] as const;

export const founders = [
  {
    slug: 'sameer',
    monogram: 'SG',
    name: 'Sameer Gul',
    points: [
      'Digital Market Infrastructure at <strong>LSEG</strong>',
      'Software engineering at <strong>CME Group</strong> — the cloud, deployment and monitoring stack behind live market data',
      'Founding engineer at an agentic AI audit startup serving enterprise clients',
      'First-Class BSc Computer Science',
      'AI research: blockchain-anchored provenance for open-source AI models',
    ],
    chips: ['LSEG', 'CME Group', 'Agentic AI', 'First-Class CS'],
  },
  {
    slug: 'kenneth',
    monogram: 'KO',
    name: 'Kenneth Obanor',
    points: [
      'Software engineering at <strong>Squarespace</strong>',
      'Operations at <strong>Amazon</strong>',
      'First-Class MEng Computer Science',
      'AI research: LLM-assisted software sustainability — runner-up at the 2026 Megaw Lecture, judged by a panel including BT Digital Data &amp; AI',
    ],
    chips: ['Squarespace', 'Amazon', 'AI research', 'First-Class MEng'],
  },
] as const;

/** Verbatim client words — do not reword. */
export const clients = [
  {
    id: 'hopeful',
    name: 'Hopeful Hearts LTD',
    logo: '/clients/c-hopeful.png',
    work: 'Company email services — setup, configuration, and ongoing support.',
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
    work: 'First-ever website — establishing an online presence from zero.',
    url: 'https://gbautosandtyres.co.uk',
    urlLabel: 'gbautosandtyres.co.uk',
    quote: 'Great job by SK on our first-ever website! I had no online presence before.',
    detail: [
      'First online presence — built from nothing',
      'Services, location and contact structured for local search',
      'Set up so the owner can be found and contacted directly',
    ]
  },
  {
    id: 'ossett',
    name: 'Ossett Tyres',
    logo: '/clients/c-ossett.png',
    work: 'Vehicle registration lookup API integration — custom UI and backend.',
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
    work: 'Full e-commerce build — products, payments, and checkout.',
    url: 'https://astarcustoms.com',
    urlLabel: 'astarcustoms.com',
    quote: 'Absolutely in awe with their work, made a very modern website with an integrated shop.',
    detail: [
      'Custom storefront — not a template theme',
      'Product and inventory management',
      'Secure payment processing and checkout',
      'Built, launched and supported end to end',
    ]
  },
] as const;

export const studioServices = [
  { title: 'Websites & Web Apps', body: 'Marketing sites, dashboards, custom web platforms' },
  { title: 'E-Commerce', body: 'Full storefronts — products, payments, checkout' },
  { title: 'Mobile Apps', body: 'iOS and Android, native or cross-platform' },
  { title: 'SEO, Social & Email/Domain Services', body: 'Visibility and setup that gets a business found and kept online' },
] as const;

export const stack = [
  {
    title: 'AI & automation',
    body: 'The lead offering. Model integrations wired into real workflows, not a chatbot bolted onto a homepage.',
    items: ['LLM integrations', 'Agentic AI', 'Workflow automation', 'Internal tools & copilots', 'AI-assisted evaluation'],
  },
  {
    title: 'Backend & cloud',
    body: 'The parts that have to stay up. Built on the same stack we run behind financial-market systems.',
    items: ['Java', 'Spring Boot', 'Google Cloud', 'Kubernetes / GKE', 'Docker', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD'],
  },
  {
    title: 'Web & apps',
    body: 'Sites, storefronts and custom web apps — and the serverless glue that makes them do real work.',
    items: ['TypeScript', 'React', 'Next.js', 'REST APIs', 'Serverless', 'E-commerce & payments', 'Mobile (iOS / Android)'],
  },
  {
    title: 'Integrations & reliability',
    body: 'Connecting the tools a business already runs, then making sure you can see it working.',
    items: ['Third-party APIs', 'DVLA vehicle data', 'Google Sheets API', 'Automated email workflows', 'Prometheus', 'Grafana', 'Monitoring & alerting'],
  },
] as const;
