import type { MarketingTask } from "../types";
import { mockMarketingClients } from "./clients";

const assignees = ["Aisha Khan", "Rohan Desai", "Meera Iyer", "Karan Malhotra", "Sneha Gupta", "Dev Prakash"];
const statuses: MarketingTask["status"][] = [
  "not_started",
  "in_progress",
  "waiting_client_approval",
  "revision",
  "completed",
  "cancelled",
];
const priorities: MarketingTask["priority"][] = ["low", "medium", "high", "urgent"];
const categories: MarketingTask["category"][] = ["ads", "seo", "content", "graphics", "video", "social", "reporting"];

const taskTitles = [
  "Meta carousel ad creative refresh",
  "Monthly SEO audit report",
  "Blog: 10 tips for organic growth",
  "Instagram story templates — Q3",
  "YouTube Shorts — product demo",
  "LinkedIn thought leadership post",
  "Google Search keyword expansion",
  "Reel edit — festival campaign",
  "Client approval follow-up — banner set",
  "Weekly performance dashboard",
  "Facebook lead form A/B test",
  "Backlink outreach — 5 domains",
  "Email nurture sequence draft",
  "Brand guideline compliance check",
  "Competitor ad analysis",
  "UGC video compilation",
  "Hashtag research — wellness niche",
  "Landing page copy update",
  "Retargeting audience setup",
  "Monthly content calendar prep",
  "Thumbnail design — 4 variants",
  "Core Web Vitals fix coordination",
  "Influencer brief document",
  "PMax asset group upload",
  "Caption batch — week 28",
];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const mockMarketingTasks: MarketingTask[] = taskTitles.map((title, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  return {
    id: `t${i + 1}`,
    title,
    category: categories[i % categories.length],
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    clientId: client.id,
    clientName: client.company,
    assignee: assignees[i % assignees.length],
    deadline: daysFromNow((i % 14) - 3),
    estimatedHours: 2 + (i % 8),
    createdAt: daysFromNow(-(i % 20)),
  };
});
