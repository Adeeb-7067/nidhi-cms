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
    glow: "rgba(43, 107, 255, 0.1)",
    wash: "rgba(0, 217, 255, 0.03)",
    accent: "#2b6bff",
    // Left-edge only — leave the HQ façade as clear as the raw MP4 player.
    veil: "linear-gradient(105deg, rgba(2,3,5,0.28) 0%, rgba(2,3,5,0.1) 28%, rgba(2,3,5,0) 52%, transparent 100%)",
  },
  lobby: {
    glow: "rgba(255, 196, 110, 0.08)",
    wash: "rgba(255, 138, 0, 0.03)",
    accent: "#ff8a00",
    veil: "linear-gradient(105deg, rgba(2,3,5,0.26) 0%, rgba(2,3,5,0.08) 40%, rgba(2,3,5,0.12) 100%)",
  },
  gallery: {
    glow: "rgba(0, 217, 255, 0.1)",
    wash: "rgba(43, 107, 255, 0.06)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.08) 0%, rgba(2,3,5,0.22) 50%, rgba(2,3,5,0.36) 100%)",
  },
  ai: {
    glow: "rgba(43, 107, 255, 0.16)",
    wash: "rgba(118, 73, 255, 0.08)",
    accent: "#2b6bff",
    veil: "linear-gradient(105deg, rgba(2,3,5,0.34) 0%, rgba(2,3,5,0.12) 55%, rgba(2,3,5,0.2) 100%)",
  },
  studio: {
    glow: "rgba(0, 200, 83, 0.1)",
    wash: "rgba(0, 217, 255, 0.05)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.36) 0%, rgba(2,3,5,0.1) 50%, rgba(2,3,5,0.14) 100%)",
  },
  cloud: {
    glow: "rgba(0, 217, 255, 0.12)",
    wash: "rgba(43, 107, 255, 0.07)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.1) 0%, rgba(2,3,5,0.26) 60%, rgba(2,3,5,0.34) 100%)",
  },
  lab: {
    glow: "rgba(118, 73, 255, 0.14)",
    wash: "rgba(43, 107, 255, 0.06)",
    accent: "#7649ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.36) 0%, rgba(2,3,5,0.14) 50%, rgba(2,3,5,0.1) 100%)",
  },
  boardroom: {
    glow: "rgba(255, 138, 0, 0.08)",
    wash: "rgba(2, 3, 5, 0.1)",
    accent: "#ff8a00",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.26) 0%, rgba(2,3,5,0.08) 40%, rgba(2,3,5,0.32) 100%)",
  },
  client: {
    glow: "rgba(43, 107, 255, 0.1)",
    wash: "rgba(0, 200, 83, 0.05)",
    accent: "#2b6bff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.36) 0%, rgba(2,3,5,0.12) 55%, rgba(2,3,5,0.18) 100%)",
  },
  global: {
    glow: "rgba(0, 200, 83, 0.1)",
    wash: "rgba(43, 107, 255, 0.06)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.1) 0%, rgba(2,3,5,0.24) 45%, rgba(2,3,5,0.36) 100%)",
  },
  voices: {
    glow: "rgba(255, 196, 110, 0.08)",
    wash: "rgba(118, 73, 255, 0.05)",
    accent: "#ffb048",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.3) 0%, rgba(2,3,5,0.14) 50%, rgba(2,3,5,0.34) 100%)",
  },
  awards: {
    glow: "rgba(255, 138, 0, 0.1)",
    wash: "rgba(255, 196, 110, 0.05)",
    accent: "#ff8a00",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.34) 0%, rgba(2,3,5,0.12) 50%, rgba(2,3,5,0.16) 100%)",
  },
  stack: {
    glow: "rgba(0, 217, 255, 0.1)",
    wash: "rgba(43, 107, 255, 0.06)",
    accent: "#00d9ff",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.34) 0%, rgba(2,3,5,0.14) 55%, rgba(2,3,5,0.1) 100%)",
  },
  careers: {
    glow: "rgba(0, 200, 83, 0.1)",
    wash: "rgba(43, 107, 255, 0.05)",
    accent: "#00c853",
    veil: "linear-gradient(90deg, rgba(2,3,5,0.12) 0%, rgba(2,3,5,0.26) 55%, rgba(2,3,5,0.36) 100%)",
  },
  contact: {
    glow: "rgba(43, 107, 255, 0.12)",
    wash: "rgba(0, 217, 255, 0.05)",
    accent: "#2b6bff",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.26) 0%, rgba(2,3,5,0.14) 40%, rgba(2,3,5,0.38) 100%)",
  },
  finale: {
    glow: "rgba(255, 176, 72, 0.16)",
    wash: "rgba(255, 138, 0, 0.07)",
    accent: "#ffb048",
    veil: "linear-gradient(180deg, rgba(2,3,5,0.16) 0%, rgba(2,3,5,0.08) 35%, rgba(2,3,5,0.36) 100%)",
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
      Arrival hero: brand lives in the identity pill; display line is a typing
      capability cycle (App Development, AI, Cloud, …) in HeroStage.
      Keep title/subtitle as fallbacks for non-hero consumers of chapter data.
    */
    title: "We build",
    subtitle: "App Development",
    body: "We build AI, cloud, and enterprise software that helps businesses scale.",
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
