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
    place: "Headquarters",
    title: "Engineering Technology That Drives Business Growth",
    subtitle: "From operational efficiency to new market capabilities — software built to deliver measurable ROI.",
    body: "We partner with business leaders to modernize core systems, automate high-friction workflows, and launch scalable digital products — combining strategy, engineering, and execution into one accountable partnership.",
    start: 81,
    end: 155,
    align: "left",
    layout: "intro",
    atmosphere: "lobby",
    chips: [
      "Intelligent Systems",
      "Cloud Infrastructure",
      "Custom Digital Products",
      "Workflow Automation",
      "Zero-Trust Security",
      "Data & Analytics",
    ],
    links: [
      { label: "Explore Capabilities", href: "/services" },
      { label: "Our Track Record", href: "/work" },
      { label: "About Satyakabir", href: "/company" },
    ],
    navKey: "home",
  },
  {
    id: "ai",
    number: "02",
    place: "AI Solutions",
    title: "AI That Automates Work & Accelerates Decisions",
    subtitle: "Deploy practical artificial intelligence into daily operations with security and proven returns.",
    body: "We integrate intelligent assistants and automated decision workflows directly into your operations — reducing manual work and helping teams act faster.",
    start: 156,
    end: 240,
    align: "left",
    layout: "service-grid",
    atmosphere: "ai",
    cards: [
      {
        title: "Autonomous Operations",
        summary: "Automate complex multi-step workflows with built-in human review controls.",
        href: "/services/ai-development",
      },
      {
        title: "Knowledge Search",
        summary: "Instant, secure answers from your company's entire document library.",
        href: "/services/ai-development",
      },
      {
        title: "Visual Inspection",
        summary: "Automated camera vision for quality assurance and facility oversight.",
        href: "/services/ai-development",
      },
      {
        title: "Predictive Forecasting",
        summary: "Anticipate customer demand and operational risk before bottlenecks happen.",
        href: "/services/ai-development",
      },
      {
        title: "Voice & Service Agents",
        summary: "Natural voice assistants that resolve customer inquiries 24 hours a day.",
        href: "/services/ai-development",
      },
      {
        title: "Data Processing",
        summary: "Eliminate manual data entry and keying errors across all departments.",
        href: "/services/ai-development",
      },
    ],
    navKey: "services",
  },
  {
    id: "studio",
    number: "03",
    place: "Product Studio",
    title: "Turn Your Ambition Into Market-Ready Products",
    subtitle: "A disciplined product pipeline that brings new ideas to market quickly, reliably, and at scale.",
    body: "From initial concept and user testing to development and launch, we build digital products designed for high user engagement and operational stability.",
    start: 241,
    end: 320,
    align: "left",
    layout: "editorial-left",
    atmosphere: "studio",
    chips: [
      "Discovery",
      "Strategy",
      "Architecture",
      "UX & Design",
      "Product Build",
      "Testing",
      "Launch & Scale",
    ],
    cards: [
      {
        title: "Custom Digital Platforms",
        summary: "Dedicated software engineering teams that ship production features weekly.",
        href: "/services/product-engineering",
      },
      {
        title: "Design & User Experience",
        summary: "Intuitive interfaces and scalable design systems loved by real users.",
        href: "/services/ui-ux-design",
      },
    ],
    navKey: "services",
  },
  {
    id: "cloud",
    number: "04",
    place: "Cloud & Infrastructure",
    title: "Infrastructure Built to Scale With Your Growth",
    subtitle: "Ensure your critical applications stay fast, secure, and available 24/7 as customer demand surges.",
    body: "Modernize legacy servers, streamline software updates, and protect your digital assets with enterprise-grade cloud architecture across AWS, Google Cloud, and Azure.",
    start: 321,
    end: 400,
    align: "left",
    layout: "cloud-ops",
    atmosphere: "cloud",
    cards: [
      {
        title: "Resilient Hosting",
        summary: "Multi-cloud hosting designed for 99.99% uptime and automatic disaster recovery.",
        href: "/services/cloud-engineering",
        meta: "AWS · GCP · Azure",
      },
      {
        title: "Continuous Delivery",
        summary: "Automated release pipelines that ship product improvements with zero downtime.",
        href: "/services/devops",
        meta: "Automated Deployment",
      },
      {
        title: "Enterprise Protection",
        summary: "Bank-grade data encryption, continuous monitoring, and SOC2 compliance.",
        href: "/services/cyber-security",
        meta: "SOC2 Compliance",
      },
    ],
    links: [{ label: "Explore Cloud Solutions", href: "/services/cloud-engineering" }],
    navKey: "services",
  },
  {
    id: "lab",
    number: "05",
    place: "Innovation Lab",
    title: "Where Emerging Technology Meets Real Application",
    subtitle: "We test and benchmark next-generation technologies today so you can deploy them with confidence.",
    body: "Our research team bridges the gap between technological breakthroughs and commercial reality — evaluating security, scalability, and ROI before technology touches your production environment.",
    start: 401,
    end: 470,
    align: "left",
    layout: "editorial-left",
    atmosphere: "lab",
    chips: [
      "Applied AI Research",
      "Scalable Architecture",
      "Operational Simulation",
      "Next-Gen Interface R&D",
      "Rapid Prototyping",
    ],
    navKey: "about",
  },
  {
    id: "boardroom",
    number: "06",
    place: "Business Impact",
    title: "Transformation Measured in Business Results",
    subtitle: "We measure success by the business value created — faster operations, lower costs, and growth.",
    body: "Technology investments should deliver clear financial and operational returns. We design every engagement around key executive priorities and transparent metrics.",
    start: 471,
    end: 545,
    align: "center",
    layout: "split-stats",
    atmosphere: "boardroom",
    stats: [
      { value: "40%", label: "Avg Ops Cost Reduction" },
      { value: "3×", label: "Faster Market Delivery" },
      { value: "100%", label: "Security & Audit Success" },
    ],
    navKey: "services",
  },
  {
    id: "client",
    number: "07",
    place: "Client Experience",
    title: "Proven Real-World Business Impact",
    subtitle: "See how we help leaders solve complex operational challenges and win in their markets.",
    start: 546,
    end: 640,
    align: "left",
    layout: "project-rail",
    atmosphere: "client",
    cards: [
      {
        title: "Nexus AI Financial Platform",
        summary: "Challenge: Slow risk analysis. Solution: Real-time streaming engine. Impact: 2.3M transactions/sec.",
        href: "/work/nexus-ai-platform",
        meta: "Finance · AI",
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=500&q=70",
        metric: "2.3M",
        metricLabel: "transactions / sec",
      },
      {
        title: "Orbit Enterprise Suite",
        summary: "Challenge: Fragmented operations. Solution: Unified cloud workspace. Impact: 500K daily active users.",
        href: "/work/orbit-collaboration-suite",
        meta: "Enterprise · SaaS",
        image:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=500&q=70",
        metric: "500K",
        metricLabel: "daily active users",
      },
      {
        title: "CloudForge Infrastructure",
        summary: "Challenge: Deployment bottlenecks. Solution: Automated platform. Impact: Reduced releases to 45 mins.",
        href: "/work/cloudforge-infrastructure",
        meta: "Cloud · Operations",
        image:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=500&q=70",
        metric: "45m",
        metricLabel: "deployment speed",
      },
    ],
    links: [{ label: "View All Case Studies", href: "/work" }],
    navKey: "work",
  },
  {
    id: "finale",
    number: "08",
    place: "Skyline",
    title: "Ready to Build Your Next Advantage?",
    subtitle: "From modernizing legacy operations to launching new products — we engineer it with you.",
    body: "Partner with a technology team that takes complete ownership of your business outcomes and builds software designed for long-term growth.",
    start: 641,
    end: 705,
    align: "center",
    layout: "finale",
    atmosphere: "finale",
    cta: { label: "Start Your Project Strategy Call", action: "contact" },
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
