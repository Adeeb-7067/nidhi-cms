export const RECRUITMENT_STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  onboarding: "Onboarding",
  hired: "Hired",
  rejected: "Rejected",
};

export const RECRUITMENT_STAGES = Object.keys(RECRUITMENT_STAGE_LABELS);

export const CANDIDATE_SOURCES = [
  "LinkedIn",
  "Referral",
  "Naukri",
  "Indeed",
  "Careers page",
  "Other",
] as const;

export function stageTone(stage: string): "success" | "danger" | "info" | "warning" | "muted" {
  if (stage === "hired") return "success";
  if (stage === "rejected") return "danger";
  if (stage === "onboarding") return "info";
  if (stage === "offer") return "info";
  if (stage === "interview") return "warning";
  return "muted";
}

/** Stages where HR can hand off to the onboarding checklist. */
export const RECRUITMENT_ONBOARDING_STAGES = ["offer", "onboarding", "hired"] as const;
