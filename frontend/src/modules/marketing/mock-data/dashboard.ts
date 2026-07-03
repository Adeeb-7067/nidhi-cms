import type {
  MarketingActivity,
  MarketingDashboardKpis,
  ClientCampaign,
  ClientDeliverableUsage,
} from "../types";
import { PACKAGE_QUOTAS } from "../constants";
import { mockMarketingClients, getClientById } from "./clients";
import { mockMarketingTasks } from "./tasks";
import { mockCalendarPosts } from "./posts";
import { mockMetaCampaigns } from "./campaigns";
import { mockApprovalItems } from "./approvals";

export const marketingDashboardKpis: MarketingDashboardKpis = {
  todaysTasks: mockMarketingTasks.filter((t) => t.status === "in_progress" || t.status === "not_started").length,
  pendingApprovals: mockApprovalItems.filter((a) => a.stage === "internal_review" || a.stage === "client_review").length,
  adsRunning: mockMetaCampaigns.filter((c) => c.status === "active").length,
  postsScheduled: mockCalendarPosts.filter((p) => p.scheduleStatus === "scheduled").length,
  clientCount: mockMarketingClients.length,
  performanceScore: Math.round(
    mockMarketingClients.reduce((s, c) => s + c.performanceScore, 0) / mockMarketingClients.length,
  ),
};

export const tasksByStatus = [
  { name: "Not Started", value: mockMarketingTasks.filter((t) => t.status === "not_started").length },
  { name: "In Progress", value: mockMarketingTasks.filter((t) => t.status === "in_progress").length },
  { name: "Client Approval", value: mockMarketingTasks.filter((t) => t.status === "waiting_client_approval").length },
  { name: "Revision", value: mockMarketingTasks.filter((t) => t.status === "revision").length },
  { name: "Completed", value: mockMarketingTasks.filter((t) => t.status === "completed").length },
];

export const tasksByCategory = [
  { name: "Ads", value: mockMarketingTasks.filter((t) => t.category === "ads").length },
  { name: "SEO", value: mockMarketingTasks.filter((t) => t.category === "seo").length },
  { name: "Content", value: mockMarketingTasks.filter((t) => t.category === "content").length },
  { name: "Graphics", value: mockMarketingTasks.filter((t) => t.category === "graphics").length },
  { name: "Video", value: mockMarketingTasks.filter((t) => t.category === "video").length },
  { name: "Social", value: mockMarketingTasks.filter((t) => t.category === "social").length },
];

export const monthlyEngagementTrend = [
  { month: "Jan", reach: 420000, engagement: 18500 },
  { month: "Feb", reach: 445000, engagement: 19200 },
  { month: "Mar", reach: 478000, engagement: 21400 },
  { month: "Apr", reach: 512000, engagement: 23100 },
  { month: "May", reach: 498000, engagement: 22800 },
  { month: "Jun", reach: 535000, engagement: 25600 },
];

export const mockMarketingActivity: MarketingActivity[] = [
  { id: "a1", message: "Meta campaign 'Monsoon Sale' approved by client", actor: "Priya Sharma", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "campaign" },
  { id: "a2", message: "Instagram reel scheduled for BharatFresh Organics", actor: "Rohan Desai", timestamp: new Date(Date.now() - 7200000).toISOString(), type: "post" },
  { id: "a3", message: "SEO audit completed for TechVista Solutions", actor: "Meera Iyer", timestamp: new Date(Date.now() - 14400000).toISOString(), type: "task" },
  { id: "a4", message: "Graphic set sent for client review — LuxeThreads", actor: "Sneha Gupta", timestamp: new Date(Date.now() - 28800000).toISOString(), type: "approval" },
  { id: "a5", message: "Google PMax campaign paused — budget threshold", actor: "Karan Malhotra", timestamp: new Date(Date.now() - 43200000).toISOString(), type: "campaign" },
  { id: "a6", message: "Blog draft approved — EduSpark Academy", actor: "Aisha Khan", timestamp: new Date(Date.now() - 86400000).toISOString(), type: "approval" },
  { id: "a7", message: "LinkedIn carousel published for SkillBridge HR", actor: "Dev Prakash", timestamp: new Date(Date.now() - 172800000).toISOString(), type: "post" },
  { id: "a8", message: "Video render completed — FitLife product reel", actor: "Rohan Desai", timestamp: new Date(Date.now() - 259200000).toISOString(), type: "task" },
];

export function getClientCampaigns(clientId: string): ClientCampaign[] {
  const client = getClientById(clientId);
  if (!client) return [];
  return [
    { id: `${clientId}-camp1`, name: `${client.company.split(" ")[0]} Brand Awareness`, platform: client.platforms[0], status: "active", budgetInr: client.monthlyBudgetInr * 0.4, spentInr: client.monthlyBudgetInr * 0.28, startDate: "2026-06-01", endDate: "2026-06-30" },
    { id: `${clientId}-camp2`, name: "Lead Gen — Q2", platform: client.platforms[1] ?? "google", status: "active", budgetInr: client.monthlyBudgetInr * 0.35, spentInr: client.monthlyBudgetInr * 0.22, startDate: "2026-06-01", endDate: "2026-06-30" },
    { id: `${clientId}-camp3`, name: "Retargeting Warm Audience", platform: "facebook", status: "paused", budgetInr: client.monthlyBudgetInr * 0.15, spentInr: client.monthlyBudgetInr * 0.1, startDate: "2026-05-15", endDate: "2026-06-15" },
  ];
}

export function getClientDeliverableUsage(clientId: string): ClientDeliverableUsage {
  const client = getClientById(clientId);
  const quota = PACKAGE_QUOTAS[client?.package ?? "standard"];
  const seed = clientId.charCodeAt(1) % 5;
  return {
    graphics: { used: Math.min(quota.graphics, 3 + seed), quota: quota.graphics },
    ugc: { used: Math.min(quota.ugc, 1 + (seed % 3)), quota: quota.ugc },
    reels: { used: Math.min(quota.reels, seed % 3), quota: quota.reels },
    blogs: { used: Math.min(quota.blogs, 1 + (seed % 4)), quota: quota.blogs },
  };
}
