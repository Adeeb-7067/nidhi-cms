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

/**
 * Film chapters — the opening HQ tour.
 *
 * One story: walk the engineering floors that deliver digital transformation.
 * Chapters that duplicated business sections below the film were culled so the
 * scrub stays a tour, not a second sales deck.
 */
export const chapters: Chapter[] = [
  {
    id: "arrival",
    number: "00",
    place: "Headquarters",
    /*
      Brand title card. `HeroStage` renders title + subtitle at display size —
      keep each to one or two words. Put sentences in `body`.
    */
    title: "Satyakabir",
    subtitle: "Technologies",
    body: "We transform businesses through world-class technology engineering.",
    start: 4,
    end: 80,
    align: "left",
    layout: "hero",
    atmosphere: "arrival",
    stats: [
      { value: "250+", label: "Projects delivered" },
      { value: "120+", label: "Businesses transformed" },
      { value: "18", label: "Industries served" },
      { value: "9", label: "Countries" },
    ],
    navKey: "home",
  },
  {
    id: "lobby",
    number: "01",
    place: "Lobby",
    title: "Technology engineering for digital transformation.",
    subtitle: "Mission, vision, and the capabilities that move outcomes.",
    body: "We partner with organizations to modernize platforms, automate operations, and scale with confidence — AI, cloud, enterprise software, data, security, and intelligent automation as one engineering practice.",
    start: 81,
    end: 155,
    align: "left",
    layout: "intro",
    atmosphere: "lobby",
    chips: [
      "AI First",
      "Cloud Native",
      "Enterprise Platforms",
      "Automation",
      "Cybersecurity",
      "Data Engineering",
    ],
    links: [
      { label: "About", href: "/company" },
      { label: "Capabilities", href: "/services" },
      { label: "Our Work", href: "/work" },
    ],
    navKey: "home",
  },
  {
    id: "ai",
    number: "02",
    place: "AI Engineering",
    title: "AI & Intelligent Systems",
    subtitle: "Models and agents that change how the business decides and acts.",
    body: "From LLMs and computer vision to predictive analytics and voice — engineered with evaluation, governance, and measurable operational lift.",
    start: 156,
    end: 240,
    align: "left",
    layout: "service-grid",
    atmosphere: "ai",
    cards: [
      {
        title: "LLM platforms",
        summary: "Retrieval, agents, and governed prompts in production.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Computer vision",
        summary: "Perception pipelines for ops, quality, and products.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "AI agents",
        summary: "Autonomous workflows with human-in-the-loop controls.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Predictive analytics",
        summary: "Forecasting and decision intelligence with eval harnesses.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Voice AI",
        summary: "Speech systems that reduce handle time and lift CSAT.",
        href: "/services/ai-and-machine-learning",
      },
      {
        title: "Intelligent automation",
        summary: "Ops that run without adding headcount at every spike.",
        href: "/services/ai-and-machine-learning",
      },
    ],
    navKey: "services",
  },
  {
    id: "studio",
    number: "03",
    place: "Product Engineering Studio",
    title: "From idea to launch — engineered.",
    subtitle: "Product creation as a disciplined pipeline, not a leap of faith.",
    body: "Research, design systems, development, and release trains that turn ambition into platforms businesses can operate.",
    start: 241,
    end: 320,
    align: "left",
    layout: "editorial-left",
    atmosphere: "studio",
    chips: [
      "Idea",
      "Research",
      "Wireframes",
      "Design Systems",
      "Development",
      "Testing",
      "Launch",
    ],
    cards: [
      {
        title: "Enterprise software",
        summary: "Product pods that ship weekly with quality gates.",
        href: "/services/custom-software",
      },
      {
        title: "Design systems",
        summary: "Tokens, accessibility, and interfaces that scale with the org.",
        href: "/services",
      },
    ],
    navKey: "services",
  },
  {
    id: "cloud",
    number: "04",
    place: "Cloud & DevOps Center",
    title: "Cloud & DevOps",
    subtitle: "Infrastructure that scales with the business — not against it.",
    body: "Containers, CI/CD, monitoring, and security as one operating model across AWS, GCP, and Azure.",
    start: 321,
    end: 400,
    align: "left",
    layout: "cloud-ops",
    atmosphere: "cloud",
    cards: [
      {
        title: "Cloud architecture",
        summary: "Landing zones and multi-cloud platforms with policy-as-code.",
        href: "/services/cloud-architecture",
        meta: "AWS · GCP · Azure",
      },
      {
        title: "CI/CD & SRE",
        summary: "Release cadence, observability, and reliability budgets.",
        href: "/services",
        meta: "Containers · Monitoring",
      },
      {
        title: "Security",
        summary: "Zero-trust patterns and continuous assurance.",
        href: "/services",
        meta: "Zero-trust · SOC2",
      },
    ],
    links: [{ label: "Explore cloud engineering", href: "/services" }],
    navKey: "services",
  },
  {
    id: "lab",
    number: "05",
    place: "Innovation Lab",
    title: "Innovation Lab",
    subtitle: "Where tomorrow’s platforms are pressure-tested.",
    body: "AI research, platform engineering, digital twins, and emerging primitives — transferred into client delivery with rigor, not slideware.",
    start: 401,
    end: 470,
    align: "left",
    layout: "editorial-left",
    atmosphere: "lab",
    chips: ["AI research", "Platform engineering", "Digital twins", "Emerging tech", "Innovation pipelines"],
    navKey: "about",
  },
  {
    id: "boardroom",
    number: "06",
    place: "Enterprise Boardroom",
    title: "Enterprise transformation, measured.",
    subtitle: "Growth, efficiency, compliance — visible to the people who decide.",
    body: "Executive dashboards, operational KPIs, and delivery models that survive the board deck and the on-call pager.",
    start: 471,
    end: 545,
    align: "center",
    layout: "split-stats",
    atmosphere: "boardroom",
    stats: [
      { value: "40%", label: "Avg ops efficiency" },
      { value: "3×", label: "Release velocity" },
      { value: "SOC2", label: "Ready patterns" },
    ],
    navKey: "services",
  },
  {
    id: "client",
    number: "07",
    place: "Client Experience Center",
    title: "Solutions built for real businesses",
    subtitle: "Challenge → engineering → transformation → impact.",
    start: 546,
    end: 640,
    align: "left",
    layout: "project-rail",
    atmosphere: "client",
    cards: [
      {
        title: "Nexus AI Platform",
        summary: "Challenge: slow decisions. Solution: streaming intelligence. Impact: 2.3M events/sec.",
        href: "/work/nexus-ai-platform",
        meta: "AI · Finance",
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
        metric: "2.3M",
        metricLabel: "events / sec",
      },
      {
        title: "Orbit Collaboration",
        summary: "Challenge: scale. Solution: realtime product suite. Impact: 500K concurrent users.",
        href: "/work/orbit-collaboration-suite",
        meta: "Product · SaaS",
        image:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
        metric: "500K",
        metricLabel: "concurrent users",
      },
      {
        title: "CloudForge",
        summary: "Challenge: slow releases. Solution: GitOps platform. Impact: 45m full release.",
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
    id: "finale",
    number: "08",
    place: "Skyline",
    title: "Ideas become",
    subtitle: "products.",
    body: "Products become platforms. Platforms become businesses. When you are ready to transform what your organization can do, we engineer it with you.",
    start: 641,
    end: 720,
    align: "center",
    layout: "finale",
    atmosphere: "finale",
    cta: { label: "Start Your Transformation", action: "contact" },
    navKey: "contact",
  },
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
