import type { SeoKeyword, SeoAudit, CoreWebVital } from "../types";
import { mockMarketingClients } from "./clients";

const keywords = [
  "organic food delivery mumbai",
  "cloud erp software india",
  "best biryani masala online",
  "luxury apartments gurgaon",
  "ayurvedic immunity supplements",
  "online coding classes kids",
  "designer sarees jaipur",
  "solar panel installation chennai",
  "hr software small business",
  "diagnostic lab near me",
  "interior designers mumbai",
  "farm fresh vegetables nashik",
  "mobile games india download",
  "digital marketing agency delhi",
  "water purifier service kolkata",
];

export const mockSeoKeywords: SeoKeyword[] = keywords.map((keyword, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  const current = 3 + (i % 18);
  const previous = current + (i % 3 === 0 ? -2 : i % 3 === 1 ? 2 : 0);
  const trend = previous < current ? "down" : previous > current ? "up" : "stable";
  return {
    id: `kw${i + 1}`,
    keyword,
    clientName: client.company,
    currentRank: current,
    previousRank: previous,
    trend: trend as SeoKeyword["trend"],
    searchVolume: 1200 + i * 450,
    url: `https://${client.company.toLowerCase().replace(/\s+/g, "")}.in/${keyword.split(" ")[0]}`,
  };
});

export const mockSeoAudits: SeoAudit[] = mockMarketingClients.slice(0, 12).map((c, i) => ({
  id: `audit${i + 1}`,
  clientName: c.company,
  score: 62 + (i % 30),
  issues: 3 + (i % 12),
  lastAuditDate: new Date(Date.now() - i * 7 * 86400000).toISOString(),
}));

export const mockCoreWebVitals: CoreWebVital[] = [
  { metric: "LCP", value: "2.1s", status: "good" },
  { metric: "FID", value: "45ms", status: "good" },
  { metric: "CLS", value: "0.18", status: "needs_improvement" },
  { metric: "INP", value: "220ms", status: "needs_improvement" },
  { metric: "TTFB", value: "680ms", status: "good" },
];

export const monthlyRankingTrend = [
  { month: "Jan", avgRank: 14.2, keywordsTop10: 8 },
  { month: "Feb", avgRank: 12.8, keywordsTop10: 10 },
  { month: "Mar", avgRank: 11.5, keywordsTop10: 12 },
  { month: "Apr", avgRank: 10.9, keywordsTop10: 14 },
  { month: "May", avgRank: 10.2, keywordsTop10: 16 },
  { month: "Jun", avgRank: 9.4, keywordsTop10: 18 },
];

export const mockBacklinksSummary = {
  total: 1248,
  newThisMonth: 86,
  lost: 12,
  domainAuthority: 42,
};
