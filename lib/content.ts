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
    body: 'We don’t hand off a deck and disappear. We sit with your team, wire the fix into your real systems, and train the people who’ll own it.',
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
 * Founder credentials. Each card carries the full picture of that person, so
 * the agentic AI startup, the First-Class degree and the hackathon appear on
 * both. That repetition is deliberate: a reader who only opens one card should
 * still get everything, and these cards are read one at a time in a carousel
 * rather than side by side.
 */
export const founders = [
  {
    slug: 'sameer',
    monogram: 'SG',
    name: 'Sameer Gul',
    linkedin: 'https://www.linkedin.com/in/sameer-g-4728a3260/',
    points: [
      'Secure, scalable infrastructure at the <strong>London Stock Exchange</strong>',
      'Software engineering at <strong>CME Group</strong>, on the cloud and monitoring stack behind live market data',
      'Founding engineer at an agentic AI audit startup serving enterprise clients',
      'First-Class BSc Computer Science',
      'AI research specialising in AI security, using trust-explicit systems',
      /* Sourced from vishalqub.github.io/people.html, which is a research GROUP
         people page, not a journal, and which lists both of them under Research
         Interns as "(MISO & Sourcing Lens, 2026)". Worded to match what that
         page can actually be checked to say. Do not upgrade this to a
         publication or journal claim without a citation to point at. */
      'Named on the MISO and Sourcing Lens research project, 2026',
      'Hackathon winner',
    ],
  },
  {
    slug: 'kenneth',
    monogram: 'KO',
    name: 'Kenneth Obanor',
    linkedin: 'https://www.linkedin.com/in/kenneth-obanor-060609275/',
    points: [
      'Software engineering at <strong>Squarespace</strong>',
      'Operations at <strong>Amazon</strong>',
      'Founding engineer at an agentic AI audit startup serving enterprise clients',
      'First-Class MEng Computer Science',
      'AI research into LLM-assisted software sustainability, runner-up at the 2026 Megaw Lecture in front of a panel including BT Digital Data &amp; AI',
      'Named on the MISO and Sourcing Lens research project, 2026',
      'Hackathon winner',
    ],
  },
] as const;

/**
 * The third card in the founders carousel. Not a person, so it carries no
 * portrait, no monogram and no outbound link, and it says nothing about
 * headcount because no number has ever been given for it.
 */
export const deliveryTeam = {
  name: 'The delivery team',
  role: 'Developers',
  points: [
    'A small team of developers works with us on delivery',
    'They build and deploy client projects alongside us',
    'Scalable, robust software built to hold up under real concurrent use',
    'Most of what we get called in to fix ran fine until more than a handful of people used it at once',
  ],
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
