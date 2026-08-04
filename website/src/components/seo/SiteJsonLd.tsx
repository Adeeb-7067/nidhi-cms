import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/data/seo";

/** Server-rendered JSON-LD for Organization + WebSite. */
export function SiteJsonLd() {
  const payloads = [organizationJsonLd(), websiteJsonLd()];
  return (
    <>
      {payloads.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
