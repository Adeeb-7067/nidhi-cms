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
  };
  for (const [key, label] of Object.entries(linkToPlatform)) {
    if (links[key]) set.add(label);
  }

  return [...set];
}

/**
 * Marketing account.platforms uses MARKETING_PLATFORMS enums only.
 * SEO / Meta Ads / Google Ads live on digitalServices; social URLs imply channel presence.
 */
export function deriveMarketingPlatformEnums(services, socialLinks) {
  const s = normalizeDigitalServices(services);
  const links = normalizeSocialLinks(socialLinks);
  const out = new Set();
  if (s.metaAds || links.facebook) out.add("facebook");
  if (s.metaAds || links.instagram) out.add("instagram");
  if (links.linkedin) out.add("linkedin");
  if (links.twitter) out.add("twitter");
  if (links.youtube || s.googleAds) out.add("youtube");
  if (s.googleAds || s.seo) out.add("google");
  return [...out];
}
