import { compose, images as img } from "./helpers";
import type { PageComposition } from "./types";

export const insightsCompositions: Record<string, PageComposition> = {
  blog: compose("editorial", [
    { id: "hero-editorial", props: { image: img.code } },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Topics we write" } },
    { id: "link-band", props: { title: "More insight", links: [
      { title: "Research", href: "/insights/research" },
      { title: "Whitepapers", href: "/insights/whitepapers" },
      { title: "Case studies", href: "/work/case-studies" },
    ] } },
    { id: "cta" },
    { id: "related" },
  ]),
  research: compose("network", [
    { id: "hero-split", props: { image: img.lab } },
    { id: "highlight-band" },
    { id: "pipeline", props: { title: "Applied research loop" } },
    { id: "chapters-alternating" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  whitepapers: compose("editorial", [
    { id: "hero-editorial", props: { image: img.office } },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Brief themes" } },
    { id: "cta" },
    { id: "related" },
  ]),
  "technology-articles": compose("default", [
    { id: "hero-product" },
    { id: "pills" },
    { id: "chapters-grid" },
    { id: "stack" },
    { id: "cta" },
    { id: "related" },
  ]),
  "company-news": compose("gallery", [
    { id: "hero-media", props: { image: img.city } },
    { id: "timeline", props: { title: "Milestones", eyebrow: "News", timeline: [
      { year: "Now", title: "Shipping & hiring", body: "Program delivery and open roles — ask for the latest announcements." },
      { year: "Ongoing", title: "Partnerships", body: "Cloud and AI ecosystem work that expands delivery." },
    ] } },
    { id: "chapters-alternating" },
    { id: "cta" },
    { id: "related" },
  ]),
  events: compose("portraits", [
    { id: "hero-split", props: { image: img.team } },
    { id: "chapters-grid" },
    { id: "gallery", props: { images: [img.team, img.meeting, img.office] } },
    { id: "cta" },
    { id: "related" },
  ]),
  resources: compose("default", [
    { id: "hero-product" },
    { id: "cards", props: { title: "Toolkits" } },
    { id: "link-band", props: { title: "Downloads & guides", links: [
      { title: "FAQs", href: "/insights/faqs" },
      { title: "Whitepapers", href: "/insights/whitepapers" },
      { title: "Contact", href: "/contact/contact-us" },
    ] } },
    { id: "cta" },
    { id: "related" },
  ]),
  faqs: compose("editorial", [
    { id: "hero-editorial" },
    { id: "faq" },
    { id: "chapters-editorial" },
    { id: "cta" },
    { id: "related" },
  ]),
};

export const contactCompositions: Record<string, PageComposition> = {
  "contact-us": compose("signal", [
    { id: "hero-signal" },
    { id: "contact-form" },
    { id: "values", props: { title: "What happens next", values: [
      { title: "1 business day", body: "A principal or practice lead replies." },
      { title: "Technical stays technical", body: "No scripted SDR theatre." },
      { title: "Clear path", body: "Session, thesis, or honest decline." },
    ] } },
    { id: "link-band", props: { links: [
      { title: "Book meeting", href: "/contact/book-meeting" },
      { title: "Get quote", href: "/contact/get-quote" },
      { title: "Support", href: "/contact/support" },
    ] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  "book-meeting": compose("editorial", [
    { id: "hero-split", props: { image: img.meeting } },
    { id: "timeline", props: { title: "How the session runs", eyebrow: "Meeting", timeline: [
      { year: "Before", title: "Prep", body: "Bring constraints, metrics, and decision timeline." },
      { year: "During", title: "Work", body: "Collaborative framing — not a monologue pitch." },
      { year: "After", title: "Follow-through", body: "Notes and a proposed next step." },
    ] } },
    { id: "chapters-editorial" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  "get-quote": compose("default", [
    { id: "hero-product" },
    { id: "highlight-band", props: { title: "Pricing with integrity", body: "Clear scope → proposal. High uncertainty → short discovery first." } },
    { id: "cards", props: { title: "What to include" } },
    { id: "chapters-grid" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  support: compose("signal", [
    { id: "hero-split", props: { image: img.servers } },
    { id: "scan" },
    { id: "pipeline", props: { title: "Incident → permanent fix" } },
    { id: "chapters-alternating" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
  "office-locations": compose("gallery", [
    { id: "hero-media", props: { image: img.city } },
    { id: "chapters-editorial" },
    { id: "gallery", props: { title: "Presence", images: [img.city, img.office, img.team] } },
    { id: "link-band", props: { links: [
      { title: "Contact us", href: "/contact/contact-us" },
      { title: "Global presence", href: "/company/global-presence" },
    ] } },
    { id: "cta" },
    { id: "related" },
  ]),
};
