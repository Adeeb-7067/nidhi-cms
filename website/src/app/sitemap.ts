import type { MetadataRoute } from "next";
import { SITE_URL, allIndexablePaths } from "@/data/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return allIndexablePaths().map((path) => {
    const depth = path === "/" ? 0 : path.split("/").filter(Boolean).length;
    return {
      url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: depth === 0 ? "weekly" : depth === 1 ? "weekly" : "monthly",
      priority: depth === 0 ? 1 : depth === 1 ? 0.8 : 0.65,
    };
  });
}
