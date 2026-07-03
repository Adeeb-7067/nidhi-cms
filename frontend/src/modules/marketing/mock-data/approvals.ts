import type { ApprovalItem } from "../types";
import { mockMarketingClients } from "./clients";

const types = ["Graphic", "Video", "Blog", "Caption", "Ad creative", "Email"];
const stages: ApprovalItem["stage"][] = [
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "scheduled",
  "published",
];

export const mockApprovalItems: ApprovalItem[] = Array.from({ length: 22 }, (_, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  return {
    id: `ap${i + 1}`,
    title: `${types[i % types.length]} — ${client.company.split(" ")[0]} Q2 deliverable`,
    type: types[i % types.length],
    clientName: client.company,
    stage: stages[i % stages.length],
    assignee: ["Aisha Khan", "Rohan Desai", "Meera Iyer", "Sneha Gupta"][i % 4],
    updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
  };
});
