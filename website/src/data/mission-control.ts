import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  FileText,
  GraduationCap,
  PhoneCall,
  Rocket,
} from "lucide-react";

export type MissionActionId =
  | "start-project"
  | "ai-consultant"
  | "book-call"
  | "careers"
  | "internship"
  | "company-profile"
  | "cost-estimator"
  | "explore-hq"
  | "emergency-support";

export type MissionActionKind = "route" | "chat" | "hq" | "external";

export type MissionAction = {
  id: MissionActionId;
  title: string;
  description: string;
  icon: LucideIcon;
  kind: MissionActionKind;
  href?: string;
  keywords: string[];
};

export const MISSION_ACTIONS: MissionAction[] = [
  {
    id: "start-project",
    title: "Start a Project",
    description: "Let's build your next product",
    icon: Rocket,
    kind: "route",
    href: "/contact/get-quote",
    keywords: ["start", "project", "quote", "build", "product", "engage"],
  },
  {
    id: "ai-consultant",
    title: "Talk to AI Consultant",
    description: "Describe your business — get a stack recommendation",
    icon: Bot,
    kind: "chat",
    keywords: ["ai", "consultant", "chat", "assist", "recommend", "llm", "agent"],
  },
  {
    id: "book-call",
    title: "Book Strategy Call",
    description: "Schedule a free consultation",
    icon: Calendar,
    kind: "route",
    href: "/contact/book-meeting",
    keywords: ["book", "call", "meeting", "strategy", "consult", "schedule"],
  },
  {
    id: "careers",
    title: "Careers",
    description: "Join our engineering team",
    icon: Briefcase,
    kind: "route",
    href: "/careers/open-positions",
    keywords: ["careers", "jobs", "hiring", "work", "roles", "join"],
  },
  {
    id: "internship",
    title: "Internship Program",
    description: "Launch your career with us",
    icon: GraduationCap,
    kind: "route",
    href: "/careers/internships",
    keywords: ["internship", "intern", "graduate", "campus", "learn"],
  },
  {
    id: "company-profile",
    title: "Company Profile",
    description: "Overview of Satyakabir Technologies",
    icon: FileText,
    kind: "route",
    href: "/company/about-us",
    keywords: ["profile", "pdf", "brochure", "company", "about", "download"],
  },
  {
    id: "cost-estimator",
    title: "Project Cost Estimator",
    description: "Estimate timeline and budget",
    icon: Calculator,
    kind: "route",
    href: "/contact/get-quote",
    keywords: ["cost", "estimate", "budget", "price", "timeline", "quote"],
  },
  {
    id: "explore-hq",
    title: "Explore Our HQ",
    description: "Jump to the cinematic headquarters tour",
    icon: Building2,
    kind: "hq",
    href: "/",
    keywords: ["hq", "film", "tour", "cinematic", "headquarters", "video", "home"],
  },
  {
    id: "emergency-support",
    title: "Emergency Support",
    description: "Priority enterprise assistance",
    icon: PhoneCall,
    kind: "route",
    href: "/contact/support",
    keywords: ["support", "emergency", "help", "priority", "enterprise", "sla"],
  },
];

export type MissionSuggestion = {
  label: string;
  href?: string;
  actionId?: MissionActionId;
};

/** Context chips based on the current pathname. */
export function suggestionsForPath(pathname: string): MissionSuggestion[] {
  const p = pathname.toLowerCase();

  if (p.includes("/services/") && (p.includes("ai") || p.includes("llm") || p.includes("machine"))) {
    return [
      { label: "View Case Studies", href: "/work/case-studies" },
      { label: "Talk to AI Consultant", actionId: "ai-consultant" },
      { label: "Start AI Project", href: "/contact/get-quote" },
    ];
  }
  if (p.startsWith("/services")) {
    return [
      { label: "Start a Project", actionId: "start-project" },
      { label: "Book Strategy Call", actionId: "book-call" },
      { label: "Browse Technologies", href: "/technologies" },
    ];
  }
  if (p.startsWith("/careers") || p.includes("internship")) {
    return [
      { label: "Apply Now", href: "/careers/open-positions" },
      { label: "Internship", actionId: "internship" },
      { label: "Life at Satyakabir", href: "/company/life-at-satyakabir" },
    ];
  }
  if (p.startsWith("/technologies")) {
    return [
      { label: "Related Services", href: "/services" },
      { label: "Talk to AI Consultant", actionId: "ai-consultant" },
      { label: "Start a Project", actionId: "start-project" },
    ];
  }
  if (p.startsWith("/work")) {
    return [
      { label: "Start a Project", actionId: "start-project" },
      { label: "Book Strategy Call", actionId: "book-call" },
      { label: "Explore Services", href: "/services" },
    ];
  }
  if (p.startsWith("/contact")) {
    return [
      { label: "Talk to AI Consultant", actionId: "ai-consultant" },
      { label: "Explore Our HQ", actionId: "explore-hq" },
      { label: "Company Profile", actionId: "company-profile" },
    ];
  }
  if (p === "/" || p === "") {
    return [
      { label: "Skip to What We Do", href: "/#what-we-do" },
      { label: "Start a Project", actionId: "start-project" },
      { label: "Talk to AI Consultant", actionId: "ai-consultant" },
    ];
  }

  return [
    { label: "Start a Project", actionId: "start-project" },
    { label: "Book Strategy Call", actionId: "book-call" },
    { label: "Explore Our HQ", actionId: "explore-hq" },
  ];
}

export const MC_RECENT_KEY = "sk-mc-recent";
export const MC_OPEN_EVENT = "sk-mission-control-open";
export const SK_ASSIST_OPEN_EVENT = "sk-assist-open";

export type RecentEntry = { href: string; title: string; at: number };

export function pushRecent(entry: Omit<RecentEntry, "at">) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MC_RECENT_KEY);
    const prev: RecentEntry[] = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    const list = Array.isArray(prev) ? prev.filter((r) => r.href !== entry.href) : [];
    const next = [{ ...entry, at: Date.now() }, ...list].slice(0, 8);
    window.localStorage.setItem(MC_RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function filterActions(query: string): MissionAction[] {
  const q = query.trim().toLowerCase();
  if (!q) return MISSION_ACTIONS;
  return MISSION_ACTIONS.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}
