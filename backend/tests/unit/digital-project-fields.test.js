import { describe, expect, it } from "vitest";
import {
  deriveDigitalPlatforms,
  deriveMarketingPlatformEnums,
  mergeMarketingPlatformEnums,
  normalizeDigitalServices,
  normalizeSocialLinks,
} from "../../src/utils/digital-project-fields.js";

describe("digital-project-fields", () => {
  it("normalizes service flags", () => {
    expect(normalizeDigitalServices({ seo: true, metaAds: 1, googleAds: false })).toEqual({
      seo: true,
      metaAds: true,
      googleAds: false,
    });
  });

  it("derives techStack labels from services and social URLs", () => {
    const platforms = deriveDigitalPlatforms(
      { seo: true, metaAds: true, googleAds: false },
      { facebook: "https://facebook.com/acme", youtube: "https://youtube.com/@acme" },
      ["Email Marketing"],
    );
    expect(platforms).toEqual(
      expect.arrayContaining([
        "SEO & SEM",
        "Meta Ads",
        "Facebook",
        "Instagram",
        "YouTube",
        "Email Marketing",
      ]),
    );
  });

  it("derives marketing account platform enums", () => {
    expect(
      deriveMarketingPlatformEnums(
        { seo: true, metaAds: true, googleAds: true },
        { linkedin: "https://linkedin.com/company/x" },
      ),
    ).toEqual(expect.arrayContaining(["facebook", "instagram", "linkedin", "google", "youtube"]));
  });

  it("includes techStack labels and enums in marketing platforms", () => {
    expect(
      deriveMarketingPlatformEnums(
        { seo: false, metaAds: false, googleAds: false },
        { instagram: "https://instagram.com/acme" },
        ["LinkedIn", "youtube", "Email Marketing"],
      ),
    ).toEqual(expect.arrayContaining(["instagram", "linkedin", "youtube"]));
  });

  it("merges platform lists without dropping bound channels", () => {
    expect(
      mergeMarketingPlatformEnums(["facebook", "linkedin"], ["instagram"], ["linkedin", "bogus"]),
    ).toEqual(["facebook", "linkedin", "instagram"]);
  });

  it("trims social link values", () => {
    expect(normalizeSocialLinks({ facebook: "  https://fb.com/a  ", instagram: null })).toMatchObject({
      facebook: "https://fb.com/a",
      instagram: "",
    });
  });
});
