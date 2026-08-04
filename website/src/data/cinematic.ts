/**
 * Headquarters journey — frame-timed story for the cinematic homepage.
 * JPG sequence is frame0001…frame0720; scrub starts at FRAME_START (skips weak intro frames).
 */
export const TOTAL_FRAMES = 720;
/** First usable film frame (skip frame0001–0003). */
export const FRAME_START = 4;
/** Edge fade inside each exclusive chapter window (frames). */
export const FRAME_FADE = 12;

export type AtmosphereId =
  | "arrival"
  | "lobby"
  | "gallery"
  | "ai"
  | "studio"
  | "cloud"
  | "lab"
  | "boardroom"
  | "client"
  | "global"
  | "voices"
  | "awards"
  | "stack"
  | "careers"
  | "contact"
  | "finale";

export type ChapterLayout =
  | "hero"
  | "intro"
  | "editorial-left"
  | "editorial-right"
  | "split-stats"
  | "service-grid"
  | "project-rail"
  | "chip-cloud"
  | "quote"
  | "badge-row"
  | "stack-grid"
  | "career"
  | "cloud-ops"
  | "contact"
  | "finale";

export interface ChapterStat {
  value: string;
  label: string;
}

export interface ChapterLink {
  label: string;
  href: string;
}

export interface ChapterCard {
  title: string;
  summary: string;
  href?: string;
  meta?: string;
  image?: string;
  metric?: string;
  metricLabel?: string;
}

export interface Chapter {
  id: AtmosphereId;
  number: string;
  place: string;
  title: string;
  subtitle: string;
  body?: string;
  start: number;
  end: number;
  align: "left" | "right" | "center";
  layout: ChapterLayout;
  atmosphere: AtmosphereId;
  stats?: ChapterStat[];
  cards?: ChapterCard[];
  chips?: string[];
  quote?: { text: string; by: string; role: string };
  links?: ChapterLink[];
  cta?: { label: string; href?: string; action?: "contact" | "scroll" };
  navKey?: "about" | "services" | "work" | "stack" | "contact" | "home";
}

/** Scene lighting that tints the UI to match the film. */
export const atmospheres: Record<
  AtmosphereId,
  { glow: string; wash: string; accent: string; veil: string }
> = {
  arrival: {
    glow: "rgba(43, 107, 255, 0.2)",
    wash: "rgba(0, 217, 255, 0.06)",
    accent: "#2b6bff",
    veil: "linear-gradient(105deg, rgba(2,3,5,0.58) 0%, rgba(2,3,5,0.22) 38%, rgba(2,3,5,0.06) 68%, rgba(2,3,5,0.28) 100%)",
  },
  lobby: {
    glow: "rgba(255, 196, 110, 0.16)",
    wash: "rgba(255, 138, 0, 0.06)",
    accent: "#ff8a00",
    veil: "linear-gradient(105deg, rgba(2,3,5,0.62) 0%, rgba(2,3,5,0.28) 45%, rgba(2,3,5,0.45) 100%)",
  },
  gallery: {
    glow: "rgba(0, 217, 255, 0.14)",
    wash: "rgba(43, 107, 255, 0.1)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.15) 0%, rgba(2,3,5,0.45) 50%, rgba(2,3,5,0.75) 100%)",
  },
  ai: {
    glow: "rgba(43, 107, 255, 0.28)",
    wash: "rgba(118, 73, 255, 0.12)",
    accent: "#2b6bff",
    veil: "linear-gradient(105deg, rgba(2,3,5,0.7) 0%, rgba(2,3,5,0.25) 55%, rgba(2,3,5,0.45) 100%)",
  },
  studio: {
    glow: "rgba(0, 200, 83, 0.16)",
    wash: "rgba(0, 217, 255, 0.08)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.74) 0%, rgba(2,3,5,0.22) 50%, rgba(2,3,5,0.3) 100%)",
  },
  cloud: {
    glow: "rgba(0, 217, 255, 0.2)",
    wash: "rgba(43, 107, 255, 0.12)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.2) 0%, rgba(2,3,5,0.55) 60%, rgba(2,3,5,0.72) 100%)",
  },
  lab: {
    glow: "rgba(118, 73, 255, 0.22)",
    wash: "rgba(43, 107, 255, 0.1)",
    accent: "#7649ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.76) 0%, rgba(2,3,5,0.3) 50%, rgba(2,3,5,0.2) 100%)",
  },
  boardroom: {
    glow: "rgba(255, 138, 0, 0.12)",
    wash: "rgba(2, 3, 5, 0.2)",
    accent: "#ff8a00",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.55) 0%, rgba(2,3,5,0.2) 40%, rgba(2,3,5,0.7) 100%)",
  },
  client: {
    glow: "rgba(43, 107, 255, 0.16)",
    wash: "rgba(0, 200, 83, 0.08)",
    accent: "#2b6bff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.78) 0%, rgba(2,3,5,0.25) 55%, rgba(2,3,5,0.4) 100%)",
  },
  global: {
    glow: "rgba(0, 200, 83, 0.18)",
    wash: "rgba(43, 107, 255, 0.1)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.2) 0%, rgba(2,3,5,0.5) 45%, rgba(2,3,5,0.78) 100%)",
  },
  voices: {
    glow: "rgba(255, 196, 110, 0.14)",
    wash: "rgba(118, 73, 255, 0.08)",
    accent: "#ffb048",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.65) 0%, rgba(2,3,5,0.35) 50%, rgba(2,3,5,0.75) 100%)",
  },
  awards: {
    glow: "rgba(255, 138, 0, 0.18)",
    wash: "rgba(255, 196, 110, 0.08)",
    accent: "#ff8a00",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.72) 0%, rgba(2,3,5,0.25) 50%, rgba(2,3,5,0.35) 100%)",
  },
  stack: {
    glow: "rgba(0, 217, 255, 0.16)",
    wash: "rgba(43, 107, 255, 0.1)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.75) 0%, rgba(2,3,5,0.3) 55%, rgba(2,3,5,0.2) 100%)",
  },
  careers: {
    glow: "rgba(0, 200, 83, 0.16)",
    wash: "rgba(43, 107, 255, 0.08)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.25) 0%, rgba(2,3,5,0.55) 55%, rgba(2,3,5,0.78) 100%)",
  },
  contact: {
    glow: "rgba(43, 107, 255, 0.2)",
    wash: "rgba(0, 217, 255, 0.08)",
    accent: "#2b6bff",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.55) 0%, rgba(2,3,5,0.35) 40%, rgba(2,3,5,0.82) 100%)",
  },
  finale: {
    glow: "rgba(255, 176, 72, 0.28)",
    wash: "rgba(255, 138, 0, 0.12)",
    accent: "#ffb048",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.35) 0%, rgba(2,3,5,0.2) 35%, rgba(2,3,5,0.78) 100%)",
  },
};

export const chapters: Chapter[] = [
  {
    id: "arrival",
    number: "00",
    place: "Hero",
    title: "Satyakabir",
    subtitle: "Technologies",
    body: "AI-first systems, resilient cloud, and product craft for ambitious companies.",
    start: 4,
    end: 55,
    align: "left",
    layout: "hero",
    atmosphere: "arrival",
    stats: [
      { value: "150+", label: "Projects delivered" },
      { value: "98%", label: "Client satisfaction" },
      { value: "AI-First", label: "Technology partner" },
      { value: "20+", label: "Industries served" },
    ],
    navKey: "home",
  },
  {
    id: "lobby",
    number: "01",
    place: "Headquarters",
    title: "The digital face of engineering excellence.",
    subtitle: "Where precision meets presence.",
    body: "Satyakabir builds intelligent software that feels calm under pressure — from agentic AI platforms to cloud estates and product systems leaders can operate with confidence.",
    start: 56,
    end: 100,
    align: "left",
    layout: "intro",
    atmosphere: "lobby",
    chips: ["AI-first", "Cloud-native", "Human-centric", "Enterprise-ready"],
    links: [
      { label: "About the company", href: "/company" },
      { label: "Explore services", href: "/services" },
    ],
    navKey: "home",
  },
  {
    id: "gallery",
    number: "02",
    place: "Innovation Gallery",
    title: "About Satyakabir",
    subtitle: "Precision. Imagination. Systems.",
    body: "We are engineers, designers, and operators who treat software as infrastructure and craft — building platforms that outlast the moment they ship.",
    start: 101,
    end: 140,
    align: "right",
    layout: "split-stats",
    atmosphere: "gallery",
    stats: [
      { value: "8yr", label: "Industry depth" },
      { value: "99%", label: "Retention" },
      { value: "24/7", label: "Delivery pods" },
    ],
    navKey: "about",
  },
  {
    id: "ai",
    number: "03",
    place: "AI Engineering",
    title: "AI & Intelligent Systems",
    subtitle: "Models, agents, and evaluation loops in production.",
    body: "Foundation models to autonomous workflows — shipped with monitoring, human-in-the-loop controls, and measurable business outcomes.",
    start: 141,
    end: 185,
    align: "left",
    layout: "service-grid",
    atmosphere: "ai",
    cards: [
      {
        title: "LLM platforms",
        summary: "Retrieval, agents, and governed prompt systems.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Computer vision",
        summary: "Perception pipelines for ops and products.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Forecasting",
        summary: "Decision intelligence with evaluation harnesses.",
        href: "/services/ai-and-machine-learning",
      },
    ],
    navKey: "services",
  },
  {
    id: "studio",
    number: "05",
    place: "Product Design Studio",
    title: "Product Engineering",
    subtitle: "Interfaces and APIs with one standard: clarity under pressure.",
    body: "From prototype to production release trains — design systems, mobile, and web experiences that feel inevitable.",
    start: 186,
    end: 225,
    align: "left",
    layout: "editorial-left",
    atmosphere: "studio",
    cards: [
      {
        title: "Custom software",
        summary: "Product pods that ship weekly with quality gates.",
        href: "/services/custom-software",
      },
      {
        title: "UX systems",
        summary: "Design tokens, accessibility, and motion craft.",
        href: "/services",
      },
    ],
    navKey: "services",
  },
  {
    id: "cloud",
    number: "06",
    place: "Cloud Operations",
    title: "Cloud & DevOps",
    subtitle: "Elastic estates with SRE-grade observability.",
    body: "Landing zones, FinOps, edge delivery, and disaster recovery across AWS, GCP, and Azure.",
    start: 226,
    end: 270,
    align: "left",
    layout: "cloud-ops",
    atmosphere: "cloud",
    cards: [
      {
        title: "Cloud architecture",
        summary: "Multi-cloud platforms with policy-as-code.",
        href: "/services/cloud-architecture",
        meta: "AWS · GCP · Azure",
      },
      {
        title: "DevOps & SRE",
        summary: "Release cadence, on-call, and reliability budgets.",
        href: "/services",
        meta: "CI/CD · Observability",
      },
      {
        title: "Security",
        summary: "Zero-trust patterns and continuous assurance.",
        href: "/services",
        meta: "Zero-trust · SOC2",
      },
    ],
    links: [{ label: "Explore cloud services", href: "/services" }],
    navKey: "services",
  },
  {
    id: "lab",
    number: "07",
    place: "Research Lab",
    title: "Innovation & R&D",
    subtitle: "Where tomorrow’s primitives are pressure-tested.",
    body: "Applied research in agents, edge inference, and platform primitives — transferred into client delivery with rigor.",
    start: 271,
    end: 310,
    align: "left",
    layout: "editorial-left",
    atmosphere: "lab",
    chips: ["Agents", "Edge AI", "Data loops", "Platform primitives"],
    navKey: "about",
  },
  {
    id: "boardroom",
    number: "08",
    place: "Executive Boardroom",
    title: "Enterprise Solutions",
    subtitle: "Strategy that survives the board deck and the on-call pager.",
    body: "Transformation programs with measurable OKRs, security reviews, and executive-ready operating models.",
    start: 311,
    end: 350,
    align: "center",
    layout: "split-stats",
    atmosphere: "boardroom",
    stats: [
      { value: "40%", label: "Avg ops lift" },
      { value: "3×", label: "Release velocity" },
      { value: "SOC2", label: "Ready patterns" },
    ],
    navKey: "services",
  },
  {
    id: "client",
    number: "09",
    place: "Client Experience Center",
    title: "Case Studies & Portfolio",
    subtitle: "Selected work from the floor.",
    start: 351,
    end: 410,
    align: "left",
    layout: "project-rail",
    atmosphere: "client",
    cards: [
      {
        title: "Nexus AI Platform",
        summary: "Enterprise agent orchestration with audit trails and real-time decisioning.",
        href: "/work/nexus-ai-platform",
        meta: "AI · FinTech",
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
        metric: "2.3M",
        metricLabel: "events / sec",
      },
      {
        title: "Orbit Collaboration",
        summary: "Realtime suite for distributed product teams at global scale.",
        href: "/work/orbit-collaboration-suite",
        meta: "Product · SaaS",
        image:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
        metric: "500K",
        metricLabel: "concurrent users",
      },
      {
        title: "CloudForge",
        summary: "Infrastructure control plane with FinOps and release automation.",
        href: "/work/cloudforge-infrastructure",
        meta: "Cloud · DevOps",
        image:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
        metric: "45m",
        metricLabel: "full release",
      },
    ],
    links: [{ label: "View all work", href: "/work" }],
    navKey: "work",
  },
  {
    id: "global",
    number: "10",
    place: "Global Presence",
    title: "Industries & Clients",
    subtitle: "Domain fluency across regulated and high-growth markets.",
    start: 411,
    end: 450,
    align: "right",
    layout: "chip-cloud",
    atmosphere: "global",
    chips: [
      "Fintech",
      "Healthtech",
      "Edtech",
      "Retail",
      "Logistics",
      "Manufacturing",
      "Media",
      "Public sector",
    ],
    links: [{ label: "Explore industries", href: "/industries" }],
    navKey: "work",
  },
  {
    id: "voices",
    number: "11",
    place: "Testimonials",
    title: "Voices from the journey",
    subtitle: "Leaders who trusted us with their critical path.",
    start: 451,
    end: 490,
    align: "center",
    layout: "quote",
    atmosphere: "voices",
    quote: {
      text: "Satyakabir didn’t just deliver a platform — they installed an operating rhythm our teams still run on.",
      by: "Maya Chen",
      role: "CTO, Orbit Labs",
    },
    navKey: "about",
  },
  {
    id: "awards",
    number: "12",
    place: "Awards & Certifications",
    title: "Proof of craft",
    subtitle: "Recognitions that reflect how we ship.",
    start: 491,
    end: 530,
    align: "left",
    layout: "badge-row",
    atmosphere: "awards",
    cards: [
      { title: "ISO 27001", summary: "Information security management" },
      { title: "SOC 2 patterns", summary: "Enterprise assurance readiness" },
      { title: "Great Place to Build", summary: "Engineering culture signal" },
    ],
    navKey: "about",
  },
  {
    id: "stack",
    number: "13",
    place: "Technology Stack",
    title: "The tools behind the film",
    subtitle: "Modern primitives, chosen for longevity.",
    start: 531,
    end: 575,
    align: "left",
    layout: "stack-grid",
    atmosphere: "stack",
    chips: [
      "TypeScript",
      "Python",
      "React",
      "Next.js",
      "Node",
      "Go",
      "Kubernetes",
      "AWS",
      "GCP",
      "Azure",
      "Postgres",
      "Redis",
      "Kafka",
      "PyTorch",
      "LangChain",
      "Terraform",
    ],
    navKey: "stack",
  },
  {
    id: "careers",
    number: "14",
    place: "Careers",
    title: "Build with us",
    subtitle: "Open roles for people who care about the craft.",
    body: "Product engineers, AI researchers, designers, and SREs — remote-first with Bengaluru HQ gravity.",
    start: 576,
    end: 615,
    align: "left",
    layout: "career",
    atmosphere: "careers",
    cards: [
      { title: "Senior Platform Engineer", summary: "Cloud · Reliability", meta: "Remote / BLR", href: "/careers" },
      { title: "AI Systems Engineer", summary: "Agents · Evaluation", meta: "Remote / BLR", href: "/careers" },
      { title: "Product Designer", summary: "Systems · Motion", meta: "Remote", href: "/careers" },
    ],
    links: [{ label: "View all roles", href: "/careers" }],
    navKey: "contact",
  },
  {
    id: "contact",
    number: "15",
    place: "Contact",
    title: "Start the conversation",
    subtitle: "Principals respond within one business day.",
    body: "Share the ambition behind your next platform, product, or transformation.",
    start: 616,
    end: 665,
    align: "center",
    layout: "contact",
    atmosphere: "contact",
    stats: [
      { value: "Bengaluru", label: "HQ · Product & AI" },
      { value: "Remote", label: "Global delivery" },
      { value: "hello@", label: "satyakabir.tech" },
    ],
    cta: { label: "Start a project", action: "contact" },
    navKey: "contact",
  },
  {
    id: "finale",
    number: "16",
    place: "Skyline Finale",
    title: "Build what lasts",
    subtitle: "The city below. The systems above. Your next chapter ahead.",
    body: "When you are ready to engineer something extraordinary, we are ready to walk the journey with you.",
    start: 666,
    end: 720,
    align: "center",
    layout: "finale",
    atmosphere: "finale",
    cta: { label: "Begin the brief", action: "contact" },
    navKey: "contact",
  },
];

/** Primary nav — scroll targets as % of total frame journey */
export const cinematicNav = [
  { label: "About", key: "about" as const, frame: 110 },
  { label: "Services", key: "services" as const, frame: 150 },
  { label: "Work", key: "work" as const, frame: 360 },
  { label: "Stack", key: "stack" as const, frame: 540 },
  { label: "Contact", key: "contact" as const, frame: 630 },
];

export function frameToScrollPct(frame: number) {
  return ((frame - FRAME_START) / (TOTAL_FRAMES - FRAME_START)) * 100;
}

export function getActiveChapter(frame: number): Chapter {
  const matches = chapters.filter((c) => frame >= c.start && frame <= c.end);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    // During intentional overlaps, prefer the chapter whose midpoint is nearest.
    return matches.reduce((best, c) => {
      const mid = (c.start + c.end) / 2;
      const bestMid = (best.start + best.end) / 2;
      return Math.abs(mid - frame) < Math.abs(bestMid - frame) ? c : best;
    });
  }
  return chapters.reduce((best, c) => {
    const mid = (c.start + c.end) / 2;
    const bestMid = (best.start + best.end) / 2;
    return Math.abs(mid - frame) < Math.abs(bestMid - frame) ? c : best;
  });
}

export function getActiveNavKey(frame: number) {
  return getActiveChapter(frame).navKey ?? "home";
}
