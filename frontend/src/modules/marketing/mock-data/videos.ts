import type { VideoRequest } from "../types";
import { mockMarketingClients } from "./clients";

const titles = [
  "Product demo reel — 30 sec",
  "Customer testimonial UGC edit",
  "Festival offer Shorts",
  "Behind-the-scenes factory tour",
  "Unboxing video — premium range",
  "Founder message — brand story",
  "Tutorial — how to use app",
  "Event highlight reel",
  "Influencer collab compilation",
  "Animated explainer — 60 sec",
];

const renderStatuses: VideoRequest["renderStatus"][] = [
  "raw_uploaded",
  "editing",
  "voiceover_pending",
  "rendering",
  "ready",
  "exported",
];

const targets: VideoRequest["exportTarget"][] = ["reel", "shorts", "facebook"];

export const mockVideoRequests: VideoRequest[] = titles.map((title, i) => {
  const client = mockMarketingClients[i % mockMarketingClients.length];
  return {
    id: `vid${i + 1}`,
    title,
    clientId: client.id,
    clientName: client.company,
    renderStatus: renderStatuses[i % renderStatuses.length],
    hasVoiceover: i % 3 !== 0,
    hasSubtitles: i % 2 === 0,
    hasThumbnail: i % 4 !== 0,
    exportTarget: targets[i % targets.length],
    assignee: ["Rohan Desai", "Meera Iyer", "Aisha Khan"][i % 3],
    dueDate: new Date(Date.now() + (i % 10) * 86400000).toISOString(),
  };
});
