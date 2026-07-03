import type { MetaAdCampaign, GoogleAdCampaign } from "../types";
import { mockMarketingClients } from "./clients";

const metaObjectives: MetaAdCampaign["objective"][] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "conversions",
  "app_installs",
];

const googleTypes: GoogleAdCampaign["type"][] = [
  "search",
  "display",
  "shopping",
  "performance_max",
  "youtube",
];

const audiences = [
  "Women 25-45, Tier 1 cities, interest: organic food",
  "IT decision makers, 500+ employee companies",
  "Food enthusiasts, Hyderabad metro",
  "Home buyers, income 15L+, NCR",
  "Health-conscious millennials",
];

export const mockMetaCampaigns: MetaAdCampaign[] = Array.from({ length: 18 }, (_, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  const budget = Math.round(client.monthlyBudgetInr * (0.2 + (i % 5) * 0.1));
  return {
    id: `meta${i + 1}`,
    name: `${client.company.split(" ")[0]} — ${["Monsoon Sale", "Brand Lift", "Lead Gen", "Retargeting"][i % 4]}`,
    clientName: client.company,
    objective: metaObjectives[i % metaObjectives.length],
    status: i % 7 === 0 ? "paused" : i % 11 === 0 ? "draft" : "active",
    budgetInr: budget,
    audience: audiences[i % audiences.length],
    reach: 45000 + i * 8200,
    impressions: 120000 + i * 15000,
    ctr: 1.2 + (i % 10) * 0.15,
    cpc: 8 + (i % 6),
    cpm: 85 + (i % 20),
    leads: 12 + (i % 25),
    roas: 2.1 + (i % 8) * 0.3,
  };
});

export const mockGoogleCampaigns: GoogleAdCampaign[] = Array.from({ length: 16 }, (_, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  const budget = Math.round(client.monthlyBudgetInr * (0.15 + (i % 4) * 0.08));
  const kwSets = [
    ["organic food delivery mumbai", "fresh vegetables online"],
    ["cloud erp india", "saas solutions bangalore"],
    ["best spices online", "hyderabadi biryani masala"],
    ["luxury apartments gurgaon", "3bhk noida"],
    ["ayurvedic supplements", "immunity booster india"],
  ];
  return {
    id: `gads${i + 1}`,
    name: `${client.company.split(" ")[0]} — ${googleTypes[i % googleTypes.length].replace("_", " ")}`,
    clientName: client.company,
    type: googleTypes[i % googleTypes.length],
    status: i % 6 === 0 ? "paused" : "active",
    budgetInr: budget,
    keywords: kwSets[i % kwSets.length],
    qualityScore: 5 + (i % 5),
    cpa: 450 + i * 35,
    roas: 1.8 + (i % 7) * 0.25,
    conversions: 8 + (i % 30),
  };
});
