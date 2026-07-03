import type { GraphicRequest } from "../types";
import { mockMarketingClients } from "./clients";

const titles = [
  "Instagram carousel — product launch",
  "Facebook cover banner refresh",
  "LinkedIn thought leadership visual",
  "Story templates — festival series",
  "Display ad sizes — 300x250, 728x90",
  "Email header graphic",
  "YouTube channel art",
  "Infographic — annual report highlights",
  "Product packaging mockup",
  "Event standee design",
  "App store screenshot set",
  "WhatsApp broadcast creative",
];

const fileCombos: GraphicRequest["fileTypes"][] = [
  ["figma", "png"],
  ["psd", "png"],
  ["ai", "png"],
  ["figma"],
  ["png"],
];

const stages: GraphicRequest["status"][] = [
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "published",
];

export const mockGraphicRequests: GraphicRequest[] = titles.map((title, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  return {
    id: `gfx${i + 1}`,
    title,
    clientId: client.id,
    clientName: client.company,
    status: stages[i % stages.length],
    revisionCount: i % 4,
    brandGuidelineUrl: `https://brand.example.com/${client.id}/guidelines`,
    fileTypes: fileCombos[i % fileCombos.length],
    assignee: ["Sneha Gupta", "Dev Prakash", "Karan Malhotra"][i % 3],
    dueDate: new Date(Date.now() + (i % 14) * 86400000).toISOString(),
  };
});
