import type { ContentItem } from "../types";
import { mockMarketingClients } from "./clients";

const titles = [
  "10 monsoon skincare tips from Ayurveda",
  "Why cloud migration matters in 2026",
  "Caption batch — week 28 product posts",
  "Video script — founder interview",
  "Email: Q2 newsletter — client wins",
  "Blog: SEO checklist for Indian startups",
  "LinkedIn post — hiring announcement",
  "Product description — organic turmeric",
  "Reel script — 15 sec hook variants",
  "Case study: 3x ROAS for FMCG brand",
  "WhatsApp broadcast copy — sale alert",
  "Landing page hero copy refresh",
  "Meta ad primary text — A/B variants",
  "Blog: Core Web Vitals explained",
  "Caption — festival greeting series",
];

const types: ContentItem["type"][] = ["blog", "caption", "script", "email"];
const stages: ContentItem["status"][] = [
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "scheduled",
  "published",
];

export const mockContentItems: ContentItem[] = titles.map((title, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  return {
    id: `cnt${i + 1}`,
    title,
    type: types[i % types.length],
    clientName: client.company,
    status: stages[i % stages.length],
    seoScore: 55 + (i % 40),
    wordCount: title.includes("Caption") ? 80 : 400 + (i % 6) * 200,
    assignee: ["Aisha Khan", "Meera Iyer", "Dev Prakash"][i % 3],
    dueDate: new Date(Date.now() + (i % 12) * 86400000).toISOString(),
  };
});
