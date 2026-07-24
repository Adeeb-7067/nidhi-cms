/** Project create/edit field labels & option sets by project.type */

export const PROJECT_TYPES = ["development", "maintenance", "digital"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const TECH_STACK_OPTIONS = [
  "React Native",
  "Flutter",
  "iOS Native",
  "Android Native",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Node.js",
  "Django",
  "Laravel",
  "PostgreSQL",
  "MongoDB",
  "Firebase",
  "AWS",
  "Docker",
] as const;

export const DIGITAL_PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Google Ads",
  "Meta Ads",
  "YouTube",
  "Twitter / X",
  "TikTok",
  "Pinterest",
  "Google Analytics",
  "Google My Business",
  "SEO & SEM",
  "Email Marketing",
  "WhatsApp Business",
  "Snapchat",
] as const;

/** Platforms covered by dedicated service flags — omit from supplemental checklist. */
const SERVICE_COVERED_PLATFORMS = new Set(["SEO & SEM", "Meta Ads", "Google Ads"]);

/** Extra channels/tools beyond SEO / Meta Ads / Google Ads service flags. */
export const DIGITAL_ADDITIONAL_PLATFORM_OPTIONS = DIGITAL_PLATFORM_OPTIONS.filter(
  (p) => !SERVICE_COVERED_PLATFORMS.has(p),
);

export const DIGITAL_SERVICE_OPTIONS = [
  {
    key: "seo",
    label: "SEO",
    description: "Managing SEO campaigns",
  },
  {
    key: "metaAds",
    label: "Meta Ads",
    description: "Running Facebook & Instagram ads",
  },
  {
    key: "googleAds",
    label: "Google Ads",
    description: "Running Google Ads campaigns",
  },
] as const;

export type DigitalServiceKey = (typeof DIGITAL_SERVICE_OPTIONS)[number]["key"];

export type DigitalServicesForm = Record<DigitalServiceKey, boolean>;

export const EMPTY_DIGITAL_SERVICES: DigitalServicesForm = {
  seo: false,
  metaAds: false,
  googleAds: false,
};

export const DIGITAL_SOCIAL_LINK_FIELDS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/..." },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/..." },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/..." },
  {
    key: "google_my_business",
    label: "Google My Business",
    placeholder: "https://business.google.com/...",
  },
  { key: "other", label: "Other", placeholder: "https://..." },
] as const;

export type SocialLinkKey = (typeof DIGITAL_SOCIAL_LINK_FIELDS)[number]["key"];

export type SocialLinksForm = Record<SocialLinkKey, string>;

export const EMPTY_SOCIAL_LINKS: SocialLinksForm = {
  facebook: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  youtube: "",
  tiktok: "",
  pinterest: "",
  whatsapp: "",
  google_my_business: "",
  other: "",
};

export function normalizeDigitalServicesForm(
  raw?: Partial<DigitalServicesForm> | null,
): DigitalServicesForm {
  return {
    seo: Boolean(raw?.seo),
    metaAds: Boolean(raw?.metaAds),
    googleAds: Boolean(raw?.googleAds),
  };
}

export function normalizeSocialLinksForm(
  raw?: Partial<SocialLinksForm> | Record<string, string> | null,
): SocialLinksForm {
  const next = { ...EMPTY_SOCIAL_LINKS };
  if (!raw || typeof raw !== "object") return next;
  for (const field of DIGITAL_SOCIAL_LINK_FIELDS) {
    const v = raw[field.key];
    next[field.key] = typeof v === "string" ? v : "";
  }
  return next;
}

export function isDigitalProjectType(type: string | null | undefined): boolean {
  return type === "digital";
}

/** Checklist label for techStack field — Platforms for digital, Tech Stack otherwise. */
export function projectStackFieldLabel(type: string | null | undefined): string {
  return isDigitalProjectType(type) ? "Platforms" : "Tech Stack";
}

export function projectStackOptions(type: string | null | undefined): readonly string[] {
  return isDigitalProjectType(type) ? DIGITAL_PLATFORM_OPTIONS : TECH_STACK_OPTIONS;
}
