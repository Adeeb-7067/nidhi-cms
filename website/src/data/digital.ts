/**
 * Homepage business narrative.
 *
 * Single positioning: Satyakabir is a technology engineering company that helps
 * businesses achieve digital transformation. Engineering is the method;
 * transformation is the outcome. Never frame software and digital as two brands.
 */

/** Business hero — after the film. Transformation is the goal; engineering is how. */
export const homeHero = {
  location: "Prayagraj · Delhi NCR · Dubai",
  headline: ["Engineering Technology", "That Transforms Businesses."],
  statement:
    "We help organizations modernize, automate, and scale through AI, enterprise software, cloud platforms, data engineering, cybersecurity, and intelligent automation.",
  capabilities: [
    "AI & Intelligent Systems",
    "Enterprise Software",
    "Product Engineering",
    "Cloud & DevOps",
    "Data Engineering",
    "Intelligent Automation",
    "Cybersecurity",
    "Platform Modernization",
  ],
  proof: [
    { value: "120+", label: "Businesses transformed" },
    { value: "250+", label: "Projects delivered" },
    { value: "18", label: "Industries" },
    { value: "9", label: "Countries" },
  ],
  clients: ["NexusAI", "Orbit Labs", "Meridian Health", "CloudForge", "Lumen Retail"],
} as const;

export type ImpactStat = {
  value: number;
  suffix: string;
  label: string;
  detail: string;
};

/** Trust & impact — proof that engineering moves business numbers. */
export const impactStats: ImpactStat[] = [
  {
    value: 120,
    suffix: "+",
    label: "Businesses transformed",
    detail: "From regulated enterprises to high-growth product companies",
  },
  {
    value: 250,
    suffix: "+",
    label: "Projects delivered",
    detail: "Platforms, products, and operating systems in production",
  },
  {
    value: 18,
    suffix: "+",
    label: "Industries served",
    detail: "Healthcare, finance, manufacturing, retail, government",
  },
  {
    value: 99,
    suffix: "%",
    label: "Client satisfaction",
    detail: "Post-engagement survey across retained accounts",
  },
  {
    value: 8,
    suffix: "+",
    label: "Years engineering",
    detail: "Enterprise-grade delivery discipline",
  },
  {
    value: 9,
    suffix: "+",
    label: "Countries served",
    detail: "India · US · UK · UAE · SG · AU and beyond",
  },
];

/** Industry marquee — transformation contexts, not a client logo dump. */
export const industryBadges = [
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Education",
  "Government",
  "Logistics",
  "Energy",
  "Real Estate",
  "Hospitality",
  "Technology",
] as const;

export type EcosystemStage = {
  id: string;
  label: string;
  note: string;
  accent: string;
};

/**
 * Customer journey — how we take a business from challenge to continuous innovation.
 * Not a catalogue of products; the operating rhythm of an engagement.
 */
export const transformationFlow: EcosystemStage[] = [
  { id: "assess", label: "Business Assessment", note: "Where value leaks today", accent: "#2B6BFF" },
  { id: "strategy", label: "Strategy", note: "Outcomes before architecture", accent: "#4B8AFF" },
  { id: "architecture", label: "Architecture", note: "Systems that can scale", accent: "#00D9FF" },
  { id: "engineering", label: "Engineering", note: "Ship with quality gates", accent: "#7649FF" },
  { id: "deploy", label: "Deployment", note: "Safe release into production", accent: "#9B6BFF" },
  { id: "optimize", label: "Optimization", note: "Latency, cost, reliability", accent: "#00C853" },
  { id: "innovate", label: "Continuous Innovation", note: "The next capability layer", accent: "#FF8A00" },
];

export type ResultKpi = {
  value: number;
  suffix: string;
  prefix?: string;
  title: string;
  detail: string;
  /** 0–100 fill for the progress rail. */
  fill: number;
};

/** Business results — outcomes, never feature lists. */
export const businessResults: ResultKpi[] = [
  {
    value: 68,
    suffix: "%",
    title: "Less manual work",
    detail: "Intelligent automation across ops, finance, and support — hours reclaimed every week.",
    fill: 68,
  },
  {
    value: 40,
    suffix: "%",
    title: "Lower operating cost",
    detail: "Platform consolidation, FinOps, and fewer tools fighting each other.",
    fill: 72,
  },
  {
    value: 3,
    suffix: "×",
    title: "Faster time-to-market",
    detail: "Release trains, CI/CD, and product pods that ship weekly with quality gates.",
    fill: 78,
  },
  {
    value: 99.9,
    suffix: "%",
    title: "Platform uptime",
    detail: "SRE practice, progressive delivery, and real error budgets on critical paths.",
    fill: 99,
  },
  {
    value: 2.1,
    suffix: "×",
    title: "Revenue lift on rebuilt journeys",
    detail: "Modern product surfaces and decision systems that convert and retain.",
    fill: 70,
  },
];

export type CaseStudy = {
  id: string;
  client: string;
  industry: string;
  headline: string;
  challenge: string;
  solution: string;
  stack: string[];
  timeline: string;
  impact: { value: string; label: string }[];
  image: string;
  gallery: string[];
  accent: string;
  href: string;
};

/** §5 Client success stories. */
export const caseStudies: CaseStudy[] = [
  {
    id: "nexus",
    client: "Nexus AI Platform",
    industry: "Financial services",
    headline: "Real-time intelligence for a market that never pauses",
    challenge:
      "A legacy analytics stack took minutes to answer questions traders needed answered in seconds, and infrastructure spend grew faster than revenue.",
    solution:
      "We rebuilt the pipeline as a streaming lakehouse with an AI decision layer, then shipped an operator console the trading desk actually trusts.",
    stack: ["Next.js", "Kafka", "Python", "AWS", "Terraform"],
    timeline: "7 months · embedded squad",
    impact: [
      { value: "2.3M", label: "events / sec" },
      { value: "-40%", label: "decision latency" },
      { value: "$12M", label: "annual waste removed" },
    ],
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    ],
    accent: "#2B6BFF",
    href: "/work",
  },
  {
    id: "meridian",
    client: "Meridian Health",
    industry: "Healthcare",
    headline: "Triage that reaches patients before the waiting room does",
    challenge:
      "Clinicians were drowning in intake forms while patients waited days for a first response, and every workaround risked compliance.",
    solution:
      "An ML triage service behind a HIPAA-controlled telehealth app, with clinical workflows engineered so adoption sticks without breaking compliance.",
    stack: ["React Native", "Node.js", "PostgreSQL", "GCP", "HL7 FHIR"],
    timeline: "9 months · product engineering",
    impact: [
      { value: "2M+", label: "downloads" },
      { value: "4.9★", label: "store rating" },
      { value: "62%", label: "faster first response" },
    ],
    image:
      "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
    ],
    accent: "#00C853",
    href: "/work",
  },
  {
    id: "cloudforge",
    client: "CloudForge Retail",
    industry: "Retail & commerce",
    headline: "From three-week releases to forty-five minutes",
    challenge:
      "A Fortune 100 retailer shipped quarterly, tested manually, and lost peak-season revenue every time a deploy went sideways.",
    solution:
      "GitOps pipelines on Kubernetes with progressive delivery, and a commerce platform rebuilt so peak season is a reliability problem — not a prayer.",
    stack: ["Kubernetes", "Go", "Terraform", "Next.js", "PostgreSQL"],
    timeline: "11 months · platform engineering",
    impact: [
      { value: "45m", label: "full release" },
      { value: "+186%", label: "peak conversion" },
      { value: "99.99%", label: "checkout uptime" },
    ],
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80",
    ],
    accent: "#FF8A00",
    href: "/work",
  },
  {
    id: "edusphere",
    client: "EduSphere",
    industry: "Education",
    headline: "Adaptive learning for 800,000 students in six countries",
    challenge:
      "Content was localised by hand, engagement dropped after week two, and nobody could prove which programmes were working.",
    solution:
      "An adaptive learning core with AI tutoring, multilingual delivery, and an analytics layer that finally connected outcomes to spend.",
    stack: ["Next.js", "Python", "Redis", "Azure", "Looker"],
    timeline: "8 months · platform + analytics",
    impact: [
      { value: "800K", label: "learners" },
      { value: "+94%", label: "course completion" },
      { value: "6", label: "countries live" },
    ],
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
    ],
    accent: "#7649FF",
    href: "/work",
  },
];

export type TransformIndustry = {
  name: string;
  promise: string;
  metric: string;
  metricLabel: string;
  signals: string[];
  accent: string;
  image: string;
};

/** §6 Industries we transform. */
export const transformIndustries: TransformIndustry[] = [
  {
    name: "Healthcare",
    promise: "Clinical platforms that move patients faster and keep auditors calm.",
    metric: "2M+",
    metricLabel: "patients reached",
    signals: ["Telehealth", "HIPAA", "Triage AI"],
    accent: "#00C853",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Finance",
    promise: "Real-time decisioning with the audit trail regulators expect.",
    metric: "2.3M/s",
    metricLabel: "events processed",
    signals: ["Core banking", "Risk", "Wealth"],
    accent: "#2B6BFF",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Retail & e-commerce",
    promise: "Commerce platforms that convert under load and release without fear.",
    metric: "+186%",
    metricLabel: "peak conversion",
    signals: ["Headless", "Checkout resilience", "Loyalty systems"],
    accent: "#FF8A00",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Education",
    promise: "Adaptive learning that proves outcomes, not just enrolment.",
    metric: "800K",
    metricLabel: "active learners",
    signals: ["LMS", "AI tutoring", "Multilingual"],
    accent: "#7649FF",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Manufacturing",
    promise: "Shop-floor telemetry wired straight into planning and finance.",
    metric: "-31%",
    metricLabel: "unplanned downtime",
    signals: ["IoT", "Predictive maintenance", "ERP"],
    accent: "#00D9FF",
    image:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Real estate",
    promise: "Listings, CRM, and campaign spend joined to closed revenue.",
    metric: "+210%",
    metricLabel: "qualified leads",
    signals: ["Portals", "CRM", "Virtual tours"],
    accent: "#FFA733",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Travel & hospitality",
    promise: "Direct booking experiences that beat the aggregator tax.",
    metric: "+44%",
    metricLabel: "direct bookings",
    signals: ["Booking engine", "Revenue ops", "Lifecycle"],
    accent: "#00C853",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Government",
    promise: "Accessible citizen services engineered for continuity and trust.",
    metric: "AA",
    metricLabel: "accessibility baseline",
    signals: ["Citizen portals", "Identity", "Records"],
    accent: "#8EB6FF",
    image:
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
  },
];

export type ReelScene = {
  id: string;
  title: string;
  caption: string;
  image: string;
  accent: string;
};

/** §7 Agency reel — a walk through the studio. */
export const reelScenes: ReelScene[] = [
  {
    id: "reception",
    title: "Reception",
    caption: "Every engagement starts with a real conversation about the business, not the brief.",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    accent: "#2B6BFF",
  },
  {
    id: "engineering",
    title: "Engineering",
    caption: "Principal-led squads writing production code from week one.",
    image:
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1600&q=80",
    accent: "#00D9FF",
  },
  {
    id: "design",
    title: "Design studio",
    caption: "Brand, product, and interface craft handled by the same team.",
    image:
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1600&q=80",
    accent: "#7649FF",
  },
  {
    id: "growth",
    title: "Growth floor",
    caption: "SEO, paid media, and lifecycle campaigns tied to pipeline, not impressions.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    accent: "#00C853",
  },
  {
    id: "war-room",
    title: "War room",
    caption: "Weekly business reviews where roadmap meets revenue.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    accent: "#FF8A00",
  },
  {
    id: "quality",
    title: "Quality lab",
    caption: "Automated pyramids, load tests, and accessibility gates before release.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    accent: "#00D9FF",
  },
  {
    id: "deployment",
    title: "Deployment",
    caption: "Progressive delivery with error budgets and instant rollback.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80",
    accent: "#2B6BFF",
  },
  {
    id: "analytics",
    title: "Analytics",
    caption: "One dashboard covering product health, spend, and revenue.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80",
    accent: "#9B6BFF",
  },
  {
    id: "success",
    title: "Client success",
    caption: "Quarterly outcomes reviews — what moved, what is next, what we stop doing.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    accent: "#00C853",
  },
];

export type PresenceMarker = {
  country: string;
  city: string;
  detail: string;
  /** Degrees — projected orthographically onto the rotating globe. */
  lat: number;
  lng: number;
  hub?: boolean;
};

/** §8 Global presence. */
export const presenceMarkers: PresenceMarker[] = [
  {
    country: "India",
    city: "Bengaluru",
    detail: "Headquarters · product & AI",
    lat: 12.97,
    lng: 77.59,
    hub: true,
  },
  { country: "UAE", city: "Dubai", detail: "Enterprise delivery", lat: 25.2, lng: 55.27 },
  {
    country: "United Kingdom",
    city: "London",
    detail: "Client partnerships",
    lat: 51.51,
    lng: -0.13,
  },
  {
    country: "United States",
    city: "Austin",
    detail: "Enterprise engineering",
    lat: 30.27,
    lng: -97.74,
  },
  { country: "Singapore", city: "Singapore", detail: "APAC delivery", lat: 1.35, lng: 103.82 },
  { country: "Australia", city: "Sydney", detail: "Support & SRE cover", lat: -33.87, lng: 151.21 },
];

export const presenceStats = [
  { value: "6+", label: "Countries served" },
  { value: "24/5", label: "Follow-the-sun cover" },
  { value: "9", label: "Timezones supported" },
];

export type EcosystemNode = {
  id: string;
  label: string;
  group: "intelligence" | "platforms" | "operations";
  links: string[];
};

/**
 * Technology capabilities as one engineering surface.
 * Each node exists to move a business outcome — never as a standalone product line.
 */
export const ecosystemNodes: EcosystemNode[] = [
  { id: "ai", label: "AI Systems", group: "intelligence", links: ["data", "automation", "software", "security"] },
  { id: "software", label: "Enterprise Software", group: "platforms", links: ["ai", "cloud", "api", "modernize"] },
  { id: "product", label: "Product Engineering", group: "platforms", links: ["software", "ai", "cloud"] },
  { id: "cloud", label: "Cloud Engineering", group: "platforms", links: ["devops", "security", "software", "data"] },
  { id: "devops", label: "DevOps", group: "operations", links: ["cloud", "security", "modernize"] },
  { id: "data", label: "Data Platforms", group: "intelligence", links: ["ai", "automation", "software"] },
  { id: "automation", label: "Automation", group: "operations", links: ["ai", "data", "api"] },
  { id: "security", label: "Cybersecurity", group: "operations", links: ["cloud", "devops", "software"] },
  { id: "api", label: "Integrations", group: "platforms", links: ["software", "data", "automation", "modernize"] },
  { id: "modernize", label: "Modernization", group: "platforms", links: ["cloud", "software", "api", "devops"] },
];

export const ecosystemGroups: Record<EcosystemNode["group"], { label: string; color: string }> = {
  intelligence: { label: "Intelligence", color: "#7649FF" },
  platforms: { label: "Platforms", color: "#2B6BFF" },
  operations: { label: "Operations", color: "#00D9FF" },
};

export type ChooseUsCard = {
  title: string;
  body: string;
  metric?: string;
  metricLabel?: string;
  span: "wide" | "tall" | "normal";
  icon: "zap" | "eye" | "users" | "layers" | "target" | "handshake";
};

/** Why choose us — advantages that keep transformation programmes on track. */
export const chooseUsCards: ChooseUsCard[] = [
  {
    title: "Engineering excellence",
    body: "Quality gates, review culture, and SRE discipline — the craft that keeps platforms calm under pressure.",
    metric: "99.9%",
    metricLabel: "uptime bar",
    span: "wide",
    icon: "zap",
  },
  {
    title: "Business-first thinking",
    body: "Every sprint maps to a commercial or operational metric. Technology is the method, not the scoreboard.",
    span: "normal",
    icon: "target",
  },
  {
    title: "Scalable architecture",
    body: "Systems designed for the next order of magnitude — traffic, data, or headcount — not just the launch.",
    metric: "3×",
    metricLabel: "typical release velocity lift",
    span: "tall",
    icon: "layers",
  },
  {
    title: "Security by design",
    body: "Zero-trust patterns, continuous assurance, and regulated-industry experience baked into delivery.",
    span: "normal",
    icon: "eye",
  },
  {
    title: "Transparent collaboration",
    body: "Shared boards, weekly demos, written decisions. You always know what ships next and why.",
    span: "normal",
    icon: "users",
  },
  {
    title: "Long-term partnership",
    body: "Most clients stay for their second and third platform generation — continuous innovation, not one-off builds.",
    metric: "3yr+",
    metricLabel: "average relationship",
    span: "wide",
    icon: "handshake",
  },
];

export type RichTestimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  rating: number;
  photo: string;
  metrics: { value: string; label: string }[];
  accent: string;
};

/** §11 Testimonial experience. */
export const richTestimonials: RichTestimonial[] = [
  {
    quote:
      "Satyakabir rebuilt how we serve ten million users. The platform handles 2.3 million events a second, and for the first time our operators trust the dashboards they live in.",
    name: "Arjun Mehta",
    role: "Chief Technology Officer",
    company: "NexusAI",
    rating: 5,
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    metrics: [
      { value: "2.3M/s", label: "events" },
      { value: "-40%", label: "latency" },
    ],
    accent: "#2B6BFF",
  },
  {
    quote:
      "They are equally fluent in architecture and commercial strategy. An eighteen-month estimate became a seven-month delivery, at a quality bar that unlocked our enterprise contracts.",
    name: "Sarah Chen",
    role: "VP Engineering",
    company: "Orbit Labs",
    rating: 5,
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    metrics: [
      { value: "7mo", label: "delivery" },
      { value: "500K", label: "concurrent users" },
    ],
    accent: "#00D9FF",
  },
  {
    quote:
      "The growth team sits beside the engineers, so campaigns and product finally tell the same story. Qualified leads more than doubled in two quarters.",
    name: "Vikram Nair",
    role: "Chief Executive Officer",
    company: "Meridian Health",
    rating: 5,
    photo:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    metrics: [
      { value: "+210%", label: "qualified leads" },
      { value: "4.9★", label: "app rating" },
    ],
    accent: "#00C853",
  },
];

export type ScaleMilestone = {
  year: string;
  title: string;
  body: string;
};

/** §12 Company scale. */
export const scaleMilestones: ScaleMilestone[] = [
  {
    year: "2018",
    title: "Founded in Bengaluru",
    body: "Four engineers, one conviction: build software that outlives the brief.",
  },
  {
    year: "2020",
    title: "Cloud and data practice",
    body: "First multi-cloud estates and streaming platforms in production.",
  },
  {
    year: "2022",
    title: "Platform modernization practice",
    body: "Legacy systems rebuilt as cloud-native platforms with API-first integration.",
  },
  {
    year: "2024",
    title: "AI systems practice",
    body: "Retrieval, agents, and evaluation harnesses shipped for regulated clients.",
  },
  {
    year: "2026",
    title: "Global delivery",
    body: "Nine countries, follow-the-sun cover, and enterprise programmes running in parallel.",
  },
];

export const scaleCounters = [
  { value: 8, suffix: "+", label: "Years engineering" },
  { value: 250, suffix: "+", label: "Projects shipped" },
  { value: 120, suffix: "+", label: "Businesses transformed" },
  { value: 60, suffix: "+", label: "Technologies mastered" },
  { value: 85, suffix: "+", label: "Specialists on team" },
  { value: 9, suffix: "+", label: "Countries served" },
];

/**
 * Act 8 — technology stack. Not a logo wall: each tool carries the reason we
 * reach for it. Buyers who scroll this far want justification, not a shopping list.
 */
export type StackTool = {
  name: string;
  why: string;
};

export type StackLayer = {
  id: string;
  label: string;
  premise: string;
  accent: string;
  tools: StackTool[];
};

export const stackLayers: StackLayer[] = [
  {
    id: "frontend",
    label: "Frontend",
    premise:
      "Product surfaces that customers and operators trust — engineered for speed, accessibility, and long-term change.",
    accent: "#2B6BFF",
    tools: [
      { name: "Next.js", why: "Server components and streaming keep first paint fast without giving up a rich app shell — faster journeys, higher conversion." },
      { name: "React Native", why: "One team ships iOS and Android without forking the product — lower cost, one roadmap." },
      { name: "TypeScript", why: "Contracts stay honest under change so releases do not break the business." },
      { name: "Figma", why: "Design and engineering share tokens — no translation layer to drift between teams." },
    ],
  },
  {
    id: "backend",
    label: "Backend & data",
    premise:
      "APIs, event streams, and stores that hold the business — the system of record every transformation depends on.",
    accent: "#00C853",
    tools: [
      { name: "Node.js", why: "Same language as the product surface, so domain logic does not fork across teams." },
      { name: "PostgreSQL", why: "Relational integrity for money, memberships, and regulated records." },
      { name: "Redis", why: "Session, cache, and rate-limit without inventing a second database." },
      { name: "Kafka", why: "Decouples services so a spike in one domain does not cascade into another." },
    ],
  },
  {
    id: "ai",
    label: "AI",
    premise:
      "Intelligence that changes workflows — retrieval, agents, and evaluation where the business impact is measurable.",
    accent: "#7649FF",
    tools: [
      { name: "OpenAI / Claude", why: "Frontier models for reasoning tasks where quality outweighs self-hosting cost." },
      { name: "LangGraph", why: "Stateful agent graphs with checkpoints — recoverable, inspectable, auditable." },
      { name: "pgvector", why: "Embeddings live next to the source of truth, not in a second system to keep in sync." },
      { name: "Eval harnesses", why: "Every prompt change is scored before it reaches production traffic." },
    ],
  },
  {
    id: "cloud",
    label: "Cloud, DevOps & security",
    premise:
      "Where the product runs — deploy, observe, and protect so transformation stays online under load.",
    accent: "#00D9FF",
    tools: [
      { name: "AWS / Azure", why: "Enterprise clients already trust these clouds; we meet them where they are." },
      { name: "Kubernetes", why: "Horizontal scale and rolling deploys without rewriting the app for each environment." },
      { name: "Terraform", why: "Infrastructure as code so every environment is reproducible, not remembered." },
      { name: "Datadog", why: "Latency, errors, and business metrics in one place — the same dashboards leaders see." },
    ],
  },
];
