import type { CalendarPost } from "../types";
import { mockMarketingClients } from "./clients";

const captions = [
  "Celebrate monsoon with our fresh organic range 🌿 #OrganicIndia",
  "Transform your workspace with cloud-native solutions ☁️",
  "Weekend special: 20% off on all spice blends 🔥",
  "Your dream home awaits — book a site visit today 🏠",
  "Ayurveda tips for monsoon immunity 🧘",
  "New batch admissions open — limited seats! 📚",
  "Summer collection drop — shop the look ✨",
  "Switch to solar, save up to 40% on bills ☀️",
];

const hashtags = [
  ["#Organic", "#HealthyLiving", "#Mumbai"],
  ["#SaaS", "#TechIndia", "#B2B"],
  ["#Foodie", "#Hyderabad", "#Spices"],
  ["#RealEstate", "#DelhiNCR", "#DreamHome"],
];

const stages: CalendarPost["approvalStage"][] = [
  "internal_review",
  "client_review",
  "approved",
  "scheduled",
  "published",
  "revision",
];

const scheduleStatuses: CalendarPost["scheduleStatus"][] = [
  "scheduled",
  "pending",
  "published",
  "rejected",
];

function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const mockCalendarPosts: CalendarPost[] = Array.from({ length: 24 }, (_, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  const platform = client.platforms[i % client.platforms.length];
  return {
    id: `post${i + 1}`,
    clientId: client.id,
    clientName: client.company,
    platform,
    caption: captions[i % captions.length],
    hashtags: hashtags[i % hashtags.length],
    scheduledAt: daysFromNow(i % 28 - 5, 9 + (i % 10)),
    approvalStage: stages[i % stages.length],
    scheduleStatus: scheduleStatuses[i % scheduleStatuses.length],
    assignee: ["Aisha Khan", "Rohan Desai", "Meera Iyer"][i % 3],
  };
});
