import type { MetadataRoute } from "next";
import { SITE_URL, allIndexablePaths } from "@/data/seo";
import { fetchCmsSitemapSlugs } from "@/lib/cms-api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cmsPages = await fetchCmsSitemapSlugs();
  const cmsSlugMap = new Map(cmsPages.map((p) => [p.slug, p.lastModified]));

  const staticPaths = allIndexablePaths();
  const allSlugs = Array.from(new Set([...staticPaths, ...cmsPages.map((p) => p.slug)]));

  return allSlugs.map((path) => {
    const depth = path === "/" ? 0 : path.split("/").filter(Boolean).length;
    const lastMod = cmsSlugMap.get(path) ? new Date(cmsSlugMap.get(path)!) : now;
    return {
      url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
      lastModified: lastMod,
      changeFrequency: depth === 0 ? "weekly" : depth === 1 ? "weekly" : "monthly",
      priority: depth === 0 ? 1 : depth === 1 ? 0.8 : 0.65,
    };
  });
}
