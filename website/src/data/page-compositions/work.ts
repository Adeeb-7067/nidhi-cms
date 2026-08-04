import { compose, images as img } from "./helpers";
import type { PageComposition } from "./types";

export const workCompositions: Record<string, PageComposition> = {
  "featured-projects": compose("gallery", [
    { id: "hero-work" },
    { id: "highlight-band", props: { title: "Selected systems from the floor", body: "Range across AI, cloud, product, health, and education — craft standards held constant." } },
    { id: "gallery", props: { title: "Featured", images: [img.ai, img.cloud, img.health, img.education] } },
    { id: "link-band", props: { title: "Case studies", links: [
      { title: "Nexus AI Platform", href: "/work/nexus-ai-platform", description: "FinTech intelligence" },
      { title: "CloudForge", href: "/work/cloudforge-infrastructure", description: "Kubernetes at retail scale" },
      { title: "Meridian Health", href: "/work/meridian-health-app", description: "Care at mobile scale" },
      { title: "All case studies", href: "/work/case-studies", description: "Full narratives" },
    ] } },
    { id: "cta" },
    { id: "related" },
  ]),

  "case-studies": compose("editorial", [
    { id: "hero-editorial", props: { image: img.meeting } },
    { id: "timeline", props: { title: "How we tell the work", eyebrow: "Method", timeline: [
      { year: "01", title: "Brief", body: "Pressure, stakes, and constraints." },
      { year: "02", title: "Architecture", body: "Bets that made scale and safety possible." },
      { year: "03", title: "Delivery", body: "Cadence, gates, rituals." },
      { year: "04", title: "Outcome", body: "What moved — labeled honestly when estimates." },
    ] } },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Reading the cases" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  portfolio: compose("gallery", [
    { id: "hero-media", props: { image: img.code } },
    { id: "pills" },
    { id: "gallery", props: { title: "Body of work", images: [img.code, img.ai, img.cloud, img.design] } },
    { id: "chapters-grid" },
    { id: "cta" },
    { id: "related" },
  ]),

  "open-source": compose("default", [
    { id: "hero-product" },
    { id: "highlight-band", props: { title: "Shared primitives", body: "Tools and patterns we open when they help the ecosystem — without compromising client confidentiality." } },
    { id: "chapters-alternating" },
    { id: "stack" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  "client-success-stories": compose("portraits", [
    { id: "hero-split", props: { image: img.team } },
    { id: "quote-band", props: { quotes: [{ quote: "They operate with ownership that feels internal, not vendor-shaped.", name: "Client voice", role: "Composite from engagement feedback" }] } },
    { id: "chapters-editorial" },
    { id: "link-band", props: { links: [
      { title: "Case studies", href: "/work/case-studies" },
      { title: "Start a project", href: "/contact/get-quote" },
    ] } },
    { id: "cta" },
    { id: "related" },
  ]),

  "project-gallery": compose("gallery", [
    { id: "hero-media", props: { image: img.design } },
    { id: "gallery", props: { title: "Visual archive", images: [img.design, img.lab, img.office, img.mobile] } },
    { id: "metrics" },
    { id: "cta" },
    { id: "related" },
  ]),

  // Catalog case studies
  "nexus-ai-platform": compose("network", [
    { id: "hero-work" },
    { id: "metrics" },
    { id: "pipeline", props: { title: "Engagement arc" } },
    { id: "chapters-alternating" },
    { id: "stack" },
    { id: "gallery" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  "orbit-collaboration-suite": compose("gallery", [
    { id: "hero-media" },
    { id: "highlight-band" },
    { id: "chapters-grid" },
    { id: "gallery" },
    { id: "metrics" },
    { id: "cta" },
    { id: "related" },
  ]),
  "cloudforge-infrastructure": compose("network", [
    { id: "hero-cloud" },
    { id: "pipeline", props: { title: "Infrastructure program" } },
    { id: "chapters-alternating" },
    { id: "cards", props: { title: "Platform outcomes" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  "meridian-health-app": compose("editorial", [
    { id: "hero-media", props: { image: img.health } },
    { id: "chapters-editorial" },
    { id: "gallery", props: { images: [img.health, img.mobile, img.team] } },
    { id: "metrics" },
    { id: "cta" },
    { id: "related" },
  ]),
  "edusphere-lms": compose("gallery", [
    { id: "hero-media", props: { image: img.education } },
    { id: "lifecycle" },
    { id: "chapters-grid" },
    { id: "gallery", props: { images: [img.education, img.team, img.design] } },
    { id: "cta" },
    { id: "related" },
  ]),
};
