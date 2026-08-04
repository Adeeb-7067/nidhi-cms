import { compose, images as img } from "./helpers";
import type { PageComposition } from "./types";

export const solutionsCompositions: Record<string, PageComposition> = {
  erp: compose("editorial", [
    { id: "hero-split", props: { image: img.office } },
    { id: "highlight-band", props: { layout: "display", title: "One backbone operators can run", body: "Finance, supply, and operations — designed for exceptions and audit trails." } },
    { id: "timeline", props: { title: "ERP program waves", eyebrow: "Delivery", timeline: [
      { year: "01", title: "Process reality", body: "Map bypasses and exception queues before configuration hardens." },
      { year: "02", title: "Core modules", body: "Finance and ops paths with role-based access." },
      { year: "03", title: "Integrate", body: "CRM, warehouse, and reporting without a shadow ledger." },
      { year: "04", title: "Adopt", body: "Training and phased cutover as an operating event." },
    ] } },
    { id: "cards", props: { layout: "index", title: "ERP capability areas" } },
    { id: "chapters-editorial", props: { layout: "pull" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  crm: compose("default", [
    { id: "hero-product" },
    { id: "metrics", props: { layout: "rail" } },
    { id: "pipeline", props: { layout: "flow", title: "CRM adoption path" } },
    { id: "chapters-alternating", props: { layout: "cascade" } },
    { id: "cards", props: { layout: "split", title: "Revenue & service surfaces", body: "CRM that sales and support both trust — not a graveyard of unused fields." } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  hrms: compose("portraits", [
    { id: "hero-media", props: { image: img.team } },
    { id: "pills" },
    { id: "values", props: { layout: "pair", title: "People-ops principles", values: [
      { title: "Self-service that works", body: "Employees should not email HR for routine tasks." },
      { title: "Policy as workflow", body: "Approvals and audit trails match labor reality." },
      { title: "Org data as platform", body: "Clean feeds for IT, finance, and collaboration tools." },
    ] } },
    { id: "chapters-grid", props: { layout: "ledger" } },
    { id: "gallery", props: { images: [img.team, img.office, img.meeting] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  finance: compose("editorial", [
    { id: "hero-split", props: { image: img.finance } },
    { id: "metrics" },
    { id: "pipeline", props: { title: "Close & control sequence" } },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Finance systems" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  healthcare: compose("editorial", [
    { id: "hero-media", props: { image: img.health } },
    { id: "highlight-band", props: { title: "Clinical clarity. PHI by design.", body: "Patient and clinician journeys with HIPAA-aligned architecture." } },
    { id: "pipeline", props: { title: "Care platform path" } },
    { id: "chapters-editorial" },
    { id: "gallery", props: { images: [img.health, img.lab, img.team] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  education: compose("gallery", [
    { id: "hero-media", props: { image: img.education } },
    { id: "pills" },
    { id: "chapters-alternating" },
    { id: "cards", props: { title: "Learning platform" } },
    { id: "gallery", props: { title: "Learning environments", images: [img.education, img.team, img.design] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  retail: compose("default", [
    { id: "hero-product" },
    { id: "metrics" },
    { id: "lifecycle" },
    { id: "chapters-grid" },
    { id: "cards", props: { title: "Commerce stack" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  manufacturing: compose("network", [
    { id: "hero-cloud", props: { image: img.servers } },
    { id: "highlight-band", props: { title: "Plant to cloud — operator first", body: "OT/IT integration that respects the floor." } },
    { id: "pipeline", props: { title: "Manufacturing digital path" } },
    { id: "chapters-alternating" },
    { id: "cards", props: { title: "Plant systems" } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  "real-estate": compose("editorial", [
    { id: "hero-editorial", props: { image: img.city } },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Property platforms" } },
    { id: "gallery", props: { images: [img.city, img.office, img.meeting] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  logistics: compose("signal", [
    { id: "hero-split", props: { image: img.cloud } },
    { id: "scan" },
    { id: "pipeline", props: { title: "Visibility → action" } },
    { id: "values", props: { title: "Control-tower rules", values: [
      { title: "Exceptions first", body: "Queues and SLAs for delay, damage, missing events." },
      { title: "Honest ETAs", body: "Status models that protect customer trust." },
      { title: "Dirty partner data", body: "Normalization and confidence scoring built in." },
    ] } },
    { id: "chapters-grid" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  construction: compose("default", [
    { id: "hero-media", props: { image: img.office } },
    { id: "chapters-alternating" },
    { id: "cards", props: { title: "Field & project tools" } },
    { id: "metrics" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  government: compose("editorial", [
    { id: "hero-editorial", props: { image: img.city } },
    { id: "highlight-band", props: { title: "Citizen trust is the metric", body: "Accessible services with auditability and continuity." } },
    { id: "chapters-editorial" },
    { id: "values", props: { title: "Public-sector bar", values: [
      { title: "Accessibility", body: "WCAG-oriented citizen surfaces." },
      { title: "Oversight-ready", body: "Evidence trails for review bodies." },
      { title: "Continuity", body: "Systems that outlast contract cycles." },
    ] } },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  "startup-solutions": compose("default", [
    { id: "hero-product" },
    { id: "lifecycle" },
    { id: "timeline", props: { title: "MVP → scale", eyebrow: "Startup path", timeline: [
      { year: "MVP", title: "Learn fast", body: "Smallest product that teaches something real — instrumented." },
      { year: "Fit", title: "Harden what works", body: "Tenancy, billing, and reliability when traction demands it." },
      { year: "Scale", title: "Enterprise-ready path", body: "SSO, audit, and packaging without forking the product." },
    ] } },
    { id: "chapters-grid" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  "enterprise-solutions": compose("editorial", [
    { id: "hero-split", props: { image: img.meeting } },
    { id: "pipeline", props: { title: "Enterprise program sequence" } },
    { id: "chapters-alternating" },
    { id: "cards", props: { title: "Program layers" } },
    { id: "metrics" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),
};
