import type { TeamMemberPerformance, MarketingReport } from "../types";

export const mockTeamPerformance: TeamMemberPerformance[] = [
  { id: "tm1", name: "Aisha Khan", role: "Content Writer", tasksCompleted: 42, avgDeliveryDays: 2.1, clientRating: 4.8, productivityPct: 94, lateDeliveryPct: 4 },
  { id: "tm2", name: "Rohan Desai", role: "Video Editor", tasksCompleted: 38, avgDeliveryDays: 3.2, clientRating: 4.6, productivityPct: 88, lateDeliveryPct: 8 },
  { id: "tm3", name: "Meera Iyer", role: "SEO Specialist", tasksCompleted: 35, avgDeliveryDays: 2.8, clientRating: 4.7, productivityPct: 91, lateDeliveryPct: 6 },
  { id: "tm4", name: "Sneha Gupta", role: "Graphic Designer", tasksCompleted: 48, avgDeliveryDays: 1.9, clientRating: 4.9, productivityPct: 96, lateDeliveryPct: 3 },
  { id: "tm5", name: "Karan Malhotra", role: "Ads Manager", tasksCompleted: 31, avgDeliveryDays: 2.4, clientRating: 4.5, productivityPct: 86, lateDeliveryPct: 10 },
  { id: "tm6", name: "Dev Prakash", role: "Social Media Manager", tasksCompleted: 44, avgDeliveryDays: 2.0, clientRating: 4.7, productivityPct: 92, lateDeliveryPct: 5 },
  { id: "tm7", name: "Priya Sharma", role: "Account Manager", tasksCompleted: 28, avgDeliveryDays: 1.5, clientRating: 4.8, productivityPct: 90, lateDeliveryPct: 2 },
  { id: "tm8", name: "Ananya Reddy", role: "Digital Marketer", tasksCompleted: 36, avgDeliveryDays: 2.6, clientRating: 4.6, productivityPct: 87, lateDeliveryPct: 7 },
];

export const mockMarketingReports: MarketingReport[] = [
  { id: "r1", title: "Daily performance snapshot", period: "daily", generatedAt: new Date().toISOString() },
  { id: "r2", title: "Daily ad spend summary", period: "daily", generatedAt: new Date(Date.now() - 86400000).toISOString(), clientName: "BharatFresh Organics" },
  { id: "r3", title: "Weekly social analytics", period: "weekly", generatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "r4", title: "Weekly SEO ranking report", period: "weekly", generatedAt: new Date(Date.now() - 5 * 86400000).toISOString(), clientName: "TechVista Solutions" },
  { id: "r5", title: "Monthly client deliverables", period: "monthly", generatedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: "r6", title: "Monthly ROAS & CPA analysis", period: "monthly", generatedAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: "r7", title: "Monthly team productivity", period: "monthly", generatedAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: "r8", title: "Weekly content calendar export", period: "weekly", generatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];
