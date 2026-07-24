/** Normalize / derive digital project service flags and social profile links. */

export const DIGITAL_SOCIAL_LINK_KEYS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "tiktok",
  "pinterest",
  "whatsapp",
  "google_my_business",
  "other",
];

const emptyServices = () => ({
  seo: false,
  metaAds: false,
  googleAds: false,
});

const emptySocialLinks = () =>
  Object.fromEntries(DIGITAL_SOCIAL_LINK_KEYS.map((k) => [k, ""]));

export function normalizeDigitalServices(raw) {
  const base = emptyServices();
  if (!raw || typeof raw !== "object") return base;
  return {
    seo: Boolean(raw.seo),
    metaAds: Boolean(raw.metaAds),
    googleAds: Boolean(raw.googleAds),
  };
}

export function normalizeSocialLinks(raw) {
  const base = emptySocialLinks();
  if (!raw || typeof raw !== "object") return base;
  for (const key of DIGITAL_SOCIAL_LINK_KEYS) {
    const v = raw[key];
    base[key] = typeof v === "string" ? v.trim() : "";
  }
  return base;
}

/** Map services + filled social URLs into legacy techStack / account.platforms labels. */
export function deriveDigitalPlatforms(services, socialLinks, existingTechStack = []) {
  const set = new Set(
    Array.isArray(existingTechStack)
      ? existingTechStack.filter((x) => typeof x === "string" && x.trim())
      : [],
  );
  const s = normalizeDigitalServices(services);
  const links = normalizeSocialLinks(socialLinks);

  if (s.seo) set.add("SEO & SEM");
  if (s.metaAds) {
    set.add("Meta Ads");
    set.add("Facebook");
    set.add("Instagram");
  }
  if (s.googleAds) set.add("Google Ads");

  const linkToPlatform = {
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    twitter: "Twitter / X",
    youtube: "YouTube",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    whatsapp: "WhatsApp Business",
    google_my_business: "Google My Business",
  };
  for (const [key, label] of Object.entries(linkToPlatform)) {
    if (links[key]) set.add(label);
  }

  return [...set];
}

const MARKETING_PLATFORM_ENUMS = new Set([
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "youtube",
  "google",
  "google_my_business",
  "website",
  "tiktok",
  "pinterest",
  "snapchat",
  "whatsapp",
]);

/** Map human techStack / service labels → marketing account platform enums. */
const TECH_STACK_LABEL_TO_PLATFORM = {
  Facebook: "facebook",
  Instagram: "instagram",
  LinkedIn: "linkedin",
  "Twitter / X": "twitter",
  Twitter: "twitter",
  YouTube: "youtube",
  Website: "website",
  Google: "google",
  "Google Ads": "google",
  "SEO & SEM": "google",
  "Google My Business": "google_my_business",
  "Google Business Profile": "google_my_business",
  GMB: "google_my_business",
  TikTok: "tiktok",
  Pinterest: "pinterest",
  Snapchat: "snapchat",
  "WhatsApp Business": "whatsapp",
  WhatsApp: "whatsapp",
};

/**
 * Marketing account.platforms uses MARKETING_PLATFORMS enums only.
 * SEO / Meta Ads / Google Ads live on digitalServices; social URLs and techStack imply channels.
 */
export function deriveMarketingPlatformEnums(services, socialLinks, techStack = []) {
  const s = normalizeDigitalServices(services);
  const links = normalizeSocialLinks(socialLinks);
  const out = new Set();
  if (s.metaAds || links.facebook) out.add("facebook");
  if (s.metaAds || links.instagram) out.add("instagram");
  if (links.linkedin) out.add("linkedin");
  if (links.twitter) out.add("twitter");
  if (links.youtube || s.googleAds) out.add("youtube");
  if (s.googleAds || s.seo) out.add("google");
  if (links.tiktok) out.add("tiktok");
  if (links.pinterest) out.add("pinterest");
  if (links.whatsapp) out.add("whatsapp");
  if (links.google_my_business) out.add("google_my_business");

  if (Array.isArray(techStack)) {
    for (const raw of techStack) {
      if (typeof raw !== "string") continue;
      const item = raw.trim();
      if (!item) continue;
      if (MARKETING_PLATFORM_ENUMS.has(item)) {
        out.add(item);
        continue;
      }
      if (item === "Meta Ads") {
        out.add("facebook");
        out.add("instagram");
        continue;
      }
      const mapped = TECH_STACK_LABEL_TO_PLATFORM[item];
      if (mapped) out.add(mapped);
    }
  }

  return [...out];
}

/** Union of valid marketing platform enums (order: first-seen). */
export function mergeMarketingPlatformEnums(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (typeof raw !== "string") continue;
      const p = raw.trim();
      if (!MARKETING_PLATFORM_ENUMS.has(p) || seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}
