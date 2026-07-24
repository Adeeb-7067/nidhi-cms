import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveDigitalPlatforms,
  deriveMarketingPlatformEnums,
  mergeMarketingPlatformEnums,
  normalizeDigitalServices,
  normalizeSocialLinks,
} from "../../src/utils/digital-project-fields.js";

describe("digital-project-fields", () => {
  it("normalizes service flags", () => {
    assert.deepEqual(normalizeDigitalServices({ seo: true, metaAds: 1, googleAds: false }), {
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
    assert.ok(platforms.includes("SEO & SEM"));
    assert.ok(platforms.includes("Meta Ads"));
    assert.ok(platforms.includes("Facebook"));
    assert.ok(platforms.includes("Instagram"));
    assert.ok(platforms.includes("YouTube"));
    assert.ok(platforms.includes("Email Marketing"));
  });

  it("derives marketing account platform enums", () => {
    const enums = deriveMarketingPlatformEnums(
      { seo: true, metaAds: true, googleAds: true },
      { linkedin: "https://linkedin.com/company/x" },
    );
    assert.ok(enums.includes("facebook"));
    assert.ok(enums.includes("instagram"));
    assert.ok(enums.includes("linkedin"));
    assert.ok(enums.includes("google"));
    assert.ok(enums.includes("youtube"));
  });

  it("includes techStack labels and enums in marketing platforms", () => {
    const enums = deriveMarketingPlatformEnums(
      { seo: false, metaAds: false, googleAds: false },
      { instagram: "https://instagram.com/acme" },
      ["LinkedIn", "youtube", "Email Marketing"],
    );
    assert.ok(enums.includes("instagram"));
    assert.ok(enums.includes("linkedin"));
    assert.ok(enums.includes("youtube"));
  });

  it("merges platform lists without dropping bound channels", () => {
    assert.deepEqual(
      mergeMarketingPlatformEnums(["facebook", "linkedin"], ["instagram"], ["linkedin", "bogus"]),
      ["facebook", "linkedin", "instagram"],
    );
  });

  it("includes Google My Business from social URL and techStack label", () => {
    const fromLink = deriveMarketingPlatformEnums(
      {},
      { google_my_business: "https://business.google.com/n/acme" },
    );
    assert.ok(fromLink.includes("google_my_business"));
    const fromLabel = deriveMarketingPlatformEnums({}, {}, ["Google My Business"]);
    assert.ok(fromLabel.includes("google_my_business"));
    const labels = deriveDigitalPlatforms({}, { google_my_business: "https://maps.google.com/?cid=1" });
    assert.ok(labels.includes("Google My Business"));
  });
});
