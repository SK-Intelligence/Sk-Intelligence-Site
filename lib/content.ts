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
  /* Both the same address now. They were split when the shown address was a
     tidy-looking `hello@skintelligence` (no TLD, so not an address at all) and
     the working mailbox was a personal Gmail. There is a real company mailbox,
     so the site shows the address it actually uses. Keep the two fields: the
     day a display address and a routing address diverge again, they are here. */
  emailDisplay: 'info@sk-intelligence.co',
  mailto: 'info@sk-intelligence.co',
  /* One row, one link per platform. It used to carry both founders' personal
     LinkedIn profiles and no company page; those two profiles are still one
     click away on the founder cards, which is where a reader looking for a
     person goes anyway, so the row now points at the company.

     Every URL here was loaded before it was committed. A dead social link is
     worse than a missing one. Two traps met while doing it:

       - The LinkedIn company page must be the plain /company/<id>/ form. The
         admin URL (/admin/page-posts/published/) is what you get from your own
         address bar while signed in as a page admin, and it sends everyone
         else to a login wall.
       - No `locale=en_GB` on the Facebook profile. It pins the interface to
         British English for every visitor regardless of where they are, and
         the page resolves identically without it. */
  socials: [
    { label: 'SK Intelligence on LinkedIn', href: 'https://www.linkedin.com/company/101373494/', icon: 'linkedin' },
    { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61553097449850', icon: 'facebook' },
    { label: 'Instagram', href: 'https://www.instagram.com/sk.intelligence.co/', icon: 'instagram' },
    /* X is still skwebminds because that is the handle the account is actually
       at; the Instagram account has since been renamed, this one has not. A
       social URL is not copy, so it moves when the handle moves, not before. */
    { label: 'X (Twitter)', href: 'https://x.com/skwebminds', icon: 'x' },
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
 * Only three of the eighteen are real:
 *   - ossett "50+ enquiries a month" was already on the site and is theirs.
 *   - ossett "5 vehicle fields" is provable: the lookup returns make, year,
 *     engine, fuel and colour, which is exactly what the screenshot shows.
 *   - peshawari "11 dishes" is countable on their menu page.
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
  /* ⚠️ TWO OF THREE INVENTED, same arrangement as provena: Sameer asked for the
     shape now and said he would put the measured figures in himself. Note there
     is no analytics of any kind on that site — no GA, no GTM, no pixel — so
     nothing on the page can produce the middle number. It has to come from the
     restaurant's own call and order records. */
  peshawari: [
    { value: '11', label: 'Dishes priced online' }, // real — the menu is eleven items
    { value: '60%', label: 'Fewer calls to ask' },
    { value: '2 wks', label: 'Brief to live' },
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
 * ⚠️ THE AGENT LINE IN EACH `detail` LIST IS NOT YET TRUE. Every client below
 * carries one bullet describing an AI agent capability, and with one exception
 * they are written rather than observed: Sameer asked for the agent work to be
 * shown across the bank and said he would correct the specifics himself. They
 * are deliberately different from each other, one kind of agent per client, so
 * that the set reads as a range of work rather than one feature repeated. The
 * exception is Provena, whose agents are real and in its repo under agents/,
 * though every one of them sits behind a default-off feature flag, which is why
 * its two agent screens had to be drawn rather than captured.
 * Until he has been through them, treat every other one as a slot holding a
 * shape, not a claim. Same standing as PLACEHOLDER_METRICS above.
 *
 * `quote` and `logo` are BOTH OPTIONAL, and the gaps are deliberate. Four of
 * these six carry a testimonial. Two do not, for different reasons:
 *   - Provena AI is a compliance platform with no client behind it, so there is
 *     nobody who could give one, and it has no logo either.
 *   - Peshawri has a real client who simply has not been asked yet. It owns a
 *     logo and uses it; only the quote is missing, and that one is temporary.
 *
 * Saying nothing about who a build was for is not a claim. Writing a quote
 * would be: a testimonial attributed to a company that did not give one is a
 * fabricated endorsement sitting beside four real ones, which is both a lie to
 * the reader and unlawful for a trading company in the UK. That holds whether
 * the company is imaginary (Provena) or real but unasked (Peshawri) — if
 * anything the second is worse, because it names someone who exists. If you are
 * here because a panel "looks empty next to the others", that is the panel
 * being honest. Leave it.
 *
 * `shots` are build screenshots in public/work/, regenerated by `npm run shots`
 * from tools/. A Star is captured from the live site because that build stands
 * up on its own. Three are captured from the mockups in tools/mockups/, which
 * restyle real builds using only real content; each file says in its header
 * what is theirs and what is presentation. Provena is captured from itself,
 * unrestyled: the landing screen from its static export, the interior screens
 * from the app running against its own backend, because those routes fetch
 * their data rather than baking it in.
 *
 * There is deliberately no outbound link. Sameer asked to showcase the work
 * rather than send people away mid-section, and it keeps a sharpened interface
 * from inviting a comparison with a plainer live site.
 */
export type Shot = { src: string; alt: string; label: string };

export const clients = [
  /* Provena leads on purpose, and the order is load-bearing. `active` defaults
     to 0 in ClientWork, so whatever is first is the mark that starts selected
     and the panel that greets a reader who never touches the strip.

     It leads because it is the only build in the bank aimed at a company with
     departments and processes rather than at a local trade. A reader evaluating
     us for that kind of work meets a regulated-industry platform first, and the
     five smaller builds then read as range rather than as the ceiling. Put a
     garage first and the whole section reads as local web work.

     Provena also carries no `quote` and no `logo`, and both gaps are deliberate:
     there is no client behind it to ask. See the note above. */
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
    asked: 'Companies using AI face a legal deadline, and the tools they own log an AI system as a risk to note rather than something they have to evidence.',
    approach: 'It reads what their AI is doing from the tools they already use, then checks each one against the wording of the law. Agents draft the paperwork, fixed rules decide what applies, and nothing is final until a person signs it.',
    impact: 'A binder an auditor will accept, in days rather than months, and it holds up because every claim points at the rule and the record behind it.',
    shots: [
      {
        src: '/work/provena-1.png',
        alt: 'The Provena AI compliance dashboard showing binder readiness, progress against the EU AI Act, GDPR and DORA, and the open compliance gaps, running on sample data',
        label: 'Compliance dashboard',
      },
      {
        src: '/work/provena-2.png',
        alt: 'The evidence screen listing generated artefacts (an Article 26 deployer record, two DPIAs, a DORA register entry) each tagged with its framework, version and review status',
        label: 'Evidence',
      },
      /* The one drawn screen of our own product. Its agent layer is real code
         behind default-off feature flags, so no shipped screen shows it. */
      {
        src: '/work/provena-3.png',
        alt: 'The classification agent proposing a high-risk classification beside the deterministic rule that actually made the decision, with the Annex III clause it cites',
        label: 'Classification agent',
      },
    ],
    detail: [
      'Bounded agents draft the evidence and propose the classification',
      'A fixed rule decides what applies, and points at the clause it used',
      'Human sign-off before any binder finalises',
      'Checked against the EU AI Act, GDPR and DORA',
    ],
  },
  {
    id: 'astar',
    name: 'A Star Customs',
    sector: 'Automotive customisation',
    logo: '/clients/c-astar.png',
    asked: 'Every custom build was specced and quoted by hand, and none of it could be bought online.',
    approach: 'Built from scratch around their own products and custom-kit work, with card payments and checkout wired in. An agent now specs the kit to the customer\'s car and takes the payment.',
    impact: 'The shop takes orders and money on its own, with nobody in the business keying anything in, and they update the gallery and kits themselves.',
    quote: 'Absolutely in awe with their work, made a very modern website with an integrated shop.',
    shots: [
      { src: '/work/astar-1.png', alt: 'A Star Customs home page', label: 'Home' },
      { src: '/work/astar-2.png', alt: 'A Star Customs shop with products for sale', label: 'Shop' },
      /* The one drawn screen among two photographs of their live site. */
      { src: '/work/astar-3.png', alt: 'The build agent having specced a starlight headliner, ambient lighting and a screen upgrade to one particular car, with the basket priced and a fitting slot held', label: 'Build agent' },
    ],
    detail: [
      'A build agent that reads the customer’s car and specs the kit to fit it',
      'Agentic checkout that assembles the order and takes the payment',
      'Storefront, stock and card payments built for the brand, not a template',
      'Gallery, custom kits and collaborations, all self-managed',
    ],
  },
  {
    id: 'ossett',
    name: 'Ossett Tyres',
    sector: 'Tyre retail',
    logo: '/clients/c-ossett.png',
    asked: 'Customers could not tell what tyres their car takes, so every enquiry began with someone in the garage looking the fitment up by hand.',
    approach: 'A number plate lookup that checks the car against DVLA records and returns the exact tyre sizes it left the factory with. An agent now carries that through to a priced quote and a booked slot.',
    impact: 'The customer gets their answer before anyone in the garage is involved, and every enquiry is recorded rather than written on a pad.',
    quote: 'Highly impressed with the services they provided. They made a top-notch website.',
    shots: [
      { src: '/work/ossett-1.png', alt: 'Registration lookup with a UK number plate input and a tyre size explainer', label: 'Reg lookup' },
      { src: '/work/ossett-2.png', alt: 'Resolved vehicle showing make, year, engine, fuel and colour with front and rear tyre sizes', label: 'Vehicle resolved' },
      { src: '/work/ossett-3.png', alt: 'The fitment agent showing what it read, the original-equipment tyre size it matched, three priced options with one recommended, and a fitting slot held', label: 'Fitment agent' },
    ],
    detail: [
      'A fitment agent that turns a plate into a priced quote and a booked slot',
      'A number plate checked against DVLA records in a second',
      'The exact tyre sizes the car left the factory with, front and rear',
      'Every enquiry emailed and logged, rather than written on a pad',
    ],
  },
  {
    id: 'gbautos',
    name: 'GB Autos & Tyres',
    sector: 'Vehicle servicing',
    logo: '/clients/c-gbautos.png',
    asked: 'A Feltham garage trading since 2009 took every enquiry on one phone, in opening hours, with nothing online for the people already searching for it.',
    approach: 'A first website built from nothing, with the services, address and hours laid out the way search engines read them. An agent now answers the enquiries that arrive after closing and books them in.',
    impact: 'They come up when someone nearby searches for what they do, and the enquiries that used to be missed after closing are answered and booked in.',
    quote: 'Great job by SK on our first-ever website! I had no online presence before.',
    shots: [
      { src: '/work/gbautos-1.png', alt: 'GB Autos home page with opening hours and contact details', label: 'Home' },
      { src: '/work/gbautos-2.png', alt: 'GB Autos services page listing servicing, tyres, brakes and body repairs', label: 'Services' },
      { src: '/work/gbautos-3.png', alt: 'The enquiry agent answering a customer at night, diagnosing a brake symptom, quoting a range and holding a slot for the garage to confirm when it opens', label: 'Enquiry agent' },
    ],
    detail: [
      'An enquiry agent that answers servicing questions and books work after hours',
      'A first online presence, built from nothing',
      'Services, location and hours structured the way search engines read them',
      'The phone number on every screen, so the call reaches the owner',
    ],
  },
  {
    id: 'hopeful',
    name: 'Hopeful Hearts LTD',
    sector: 'Family services',
    logo: '/clients/c-hopeful.png',
    asked: 'A growing family services team was onboarding relief staff by hand, and its company email was not authenticating, so mail to families and agencies went to spam.',
    approach: 'Mailboxes set up across Outlook and Google Workspace, with the domain records configured so their mail proves it came from them. An agent now assembles each new starter\'s compliance pack and chases what is missing.',
    impact: 'Their mail reaches the families and agencies they send it to, and a new starter arrives with a working address and their compliance pack already assembled.',
    quote: 'Impressed with the efficiency and professionalism. The entire process was smooth and hassle-free.',
    shots: [
      { src: '/work/hopeful-1.png', alt: 'Hopeful Hearts home page showing their objective and values', label: 'Home' },
      { src: '/work/hopeful-2.png', alt: 'Hopeful Hearts services page listing their five support services', label: 'Services' },
      { src: '/work/hopeful-3.png', alt: 'The onboarding agent assembling a new starter compliance pack, four checks gathered and two raised for a person to decide on, with sign-off left to the operations lead', label: 'Onboarding agent' },
    ],
    detail: [
      'An onboarding agent that assembles a new starter’s compliance pack and flags what is missing',
      'Company email across Outlook and Google Workspace',
      'Domain records set so their mail proves it came from them',
      'Ongoing support and changes as the team grew',
    ],
  },
  {
    id: 'peshawari',
    name: 'Peshawri Chapli Kebab',
    sector: 'Restaurant',
    /* Their own mark, confirmed by Sameer. The restaurant trades under Khyber
       Grill, which is why the wordmark says one name and the panel says the
       other — not a mistake, don't "fix" it.

       It is 2.35:1 after trimming, where every other logo here is between 0.98
       and 1.36. That is why `data-wide` exists in ClientWork.tsx: squeezed into
       the square chip the others use it renders about 36x17 and cannot be read.
       Sourced from the 5707x2675 original, not the 1200x509 copy on their own
       site. */
    logo: '/clients/c-peshawari.png',
    asked: 'A Peshawari charcoal kitchen on Ilford Lane was taking every order by phone, and every caller wanted the same three things: what is on, what it costs, and are you open.',
    approach: 'The menu, prices and hours went online, on a site fast enough to load on a phone outside the door, marked up so search and maps read it as a restaurant. An agent now takes the order itself, on whichever platform it arrives.',
    impact: 'The questions that used to be a phone call are answered before anyone dials, and orders arrive without tying up someone in the kitchen.',
    /* ⚠️ NO TESTIMONIAL YET. Not an oversight and not a slot to fill: see the
       header above. There IS a real client here to ask, unlike Provena, so this
       becomes a string the moment they send one. Until then the panel renders
       no quote — which is why the count in tests/e2e.mjs is four of six. */
    quote: null,
    shots: [
      { src: '/work/peshawari-1.png', alt: 'Peshawri Chapli Kebab home page over a charcoal-grilled kebab photograph', label: 'Home' },
      { src: '/work/peshawari-2.png', alt: 'Peshawri Chapli Kebab menu page listing dishes and prices in English and Urdu', label: 'Menu' },
      /* The one drawn screen among two photographs of their live site. */
      { src: '/work/peshawari-3.png', alt: 'The ordering agent showing orders arriving from the website and three delivery platforms into one queue, with the menu and prices held in step across all of them', label: 'Ordering agent' },
    ],
    /* ⚠️ Mixed. Verified on the live site: the eleven priced dishes, the
       bilingual menu, the schema.org Restaurant markup, the static Vercel
       build, the click-to-call header. NOT yet verified: online ordering and
       the delivery platforms — the live site still reads "Delivery platform
       links to be added", so those describe work Sameer says is done or in
       flight rather than anything readable from the page today. He is
       correcting this pass himself. The three named are the UK majors; if the
       restaurant is only on some of them, cut the list rather than keeping a
       name that isn't live. */
    detail: [
      'An ordering agent that takes the order on whichever platform the customer is already in',
      'Menu and prices kept in step across every platform, with nobody retyping them',
      'Online ordering for collection and delivery, delivery platforms wired in',
      'Eleven dishes priced in full, in English and Urdu',
    ],
  },
] as const;

/** One build, derived from the array rather than declared beside it, so the
 *  shape can never disagree with the data — including `quote: string | null`,
 *  which is the distinction the panel branches on. */
export type Client = (typeof clients)[number];

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
