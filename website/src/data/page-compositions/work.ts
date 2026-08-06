import { caseStudyDetails, type CaseStudyDetail } from "@/data/case-studies";
import { compose, images as img } from "./helpers";
import type { PageComposition, SectionConfig } from "./types";

function richCaseStudy(
  study: CaseStudyDetail,
  opts: {
    motion?: PageComposition["motion"];
    hero?: SectionConfig["id"];
    image?: string;
  } = {},
): PageComposition {
  const hero = opts.hero ?? "hero-work";
  return compose(opts.motion ?? "gallery", [
    { id: hero, props: opts.image ? { image: opts.image } : undefined },
    {
      id: "highlight-band",
      props: {
        layout: "display",
        eyebrow: "Case study",
        title: study.headline,
        body: study.summary,
      },
    },
    { id: "case-brief" },
    { id: "metrics", props: { layout: "rail" } },
    { id: "pills" },
    { id: "cards", props: { title: "How we framed the work" } },
    { id: "pipeline", props: { title: "Engagement arc" } },
    {
      id: "timeline",
      props: {
        eyebrow: "Cadence",
        title: "Delivery timeline",
        timeline: study.timeline,
      },
    },
    { id: "chapters-editorial", props: { layout: "display" } },
    {
      id: "values",
      props: {
        title: "What we delivered",
        layout: "stack",
        values: study.deliverables.map((body, i) => ({
          title:
            ["Core system", "Capability layer", "Operator surface", "Ops & insight", "Enablement"][
              i
            ] ?? `Ship ${String(i + 1).padStart(2, "0")}`,
          body,
        })),
      },
    },
    {
      id: "values",
      props: {
        title: "Architecture notes",
        layout: "pair",
        values: study.architecture.map((body, i) => ({
          title: ["Topology", "Controls", "Trust boundary", "Observability"][i] ?? `Note ${i + 1}`,
          body,
        })),
      },
    },
    { id: "gallery", props: { title: "From the engagement", images: study.gallery } },
    { id: "stack" },
    { id: "quote-band", props: { quotes: [study.quote] } },
    { id: "faq" },
    {
      id: "link-band",
      props: {
        title: "Related capabilities",
        links: study.relatedServices,
      },
    },
    { id: "cta" },
    { id: "related" },
  ]);
}

export const workCompositions: Record<string, PageComposition> = {
  "featured-projects": compose("gallery", [
    { id: "hero-work" },
    {
      id: "highlight-band",
      props: {
        title: "Selected systems from the floor",
        body: "Range across AI, cloud, product, health, and education — craft standards held constant.",
      },
    },
    {
      id: "gallery",
      props: { title: "Featured", images: [img.ai, img.cloud, img.health, img.education] },
    },
    {
      id: "link-band",
      props: {
        title: "Case studies",
        links: [
          {
            title: "Nexus AI Platform",
            href: "/work/nexus-ai-platform",
            description: "FinTech intelligence",
          },
          {
            title: "CloudForge",
            href: "/work/cloudforge-infrastructure",
            description: "Kubernetes at retail scale",
          },
          {
            title: "Meridian Health",
            href: "/work/meridian-health-app",
            description: "Care at mobile scale",
          },
          {
            title: "All case studies",
            href: "/work/case-studies",
            description: "Full narratives",
          },
        ],
      },
    },
    { id: "cta" },
    { id: "related" },
  ]),

  "case-studies": compose("editorial", [
    { id: "hero-editorial", props: { image: img.meeting } },
    {
      id: "timeline",
      props: {
        title: "How we tell the work",
        eyebrow: "Method",
        timeline: [
          { year: "01", title: "Brief", body: "Pressure, stakes, and constraints." },
          { year: "02", title: "Architecture", body: "Bets that made scale and safety possible." },
          { year: "03", title: "Delivery", body: "Cadence, gates, rituals." },
          { year: "04", title: "Outcome", body: "What moved — labeled honestly when estimates." },
        ],
      },
    },
    { id: "chapters-editorial" },
    { id: "cards", props: { title: "Reading the cases" } },
    {
      id: "link-band",
      props: {
        title: "Open a case",
        links: [
          {
            title: "Nexus AI Platform",
            href: "/work/nexus-ai-platform",
            description: "Streaming FinTech intelligence",
          },
          {
            title: "Orbit Collaboration",
            href: "/work/orbit-collaboration-suite",
            description: "Realtime at 500K concurrent",
          },
          {
            title: "CloudForge",
            href: "/work/cloudforge-infrastructure",
            description: "Retail platform & peak",
          },
          {
            title: "Meridian Health",
            href: "/work/meridian-health-app",
            description: "Telehealth & triage",
          },
          {
            title: "EduSphere LMS",
            href: "/work/edusphere-lms",
            description: "Adaptive learning at scale",
          },
        ],
      },
    },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  portfolio: compose("gallery", [
    { id: "hero-media", props: { image: img.code } },
    { id: "pills" },
    {
      id: "gallery",
      props: { title: "Body of work", images: [img.code, img.ai, img.cloud, img.design] },
    },
    { id: "chapters-grid" },
    { id: "cta" },
    { id: "related" },
  ]),

  "open-source": compose("default", [
    { id: "hero-product" },
    {
      id: "highlight-band",
      props: {
        title: "Shared primitives",
        body: "Tools and patterns we open when they help the ecosystem — without compromising client confidentiality.",
      },
    },
    { id: "chapters-alternating" },
    { id: "stack" },
    { id: "faq" },
    { id: "cta" },
    { id: "related" },
  ]),

  "client-success-stories": compose("portraits", [
    { id: "hero-split", props: { image: img.team } },
    {
      id: "quote-band",
      props: {
        quotes: [
          {
            quote:
              "They operate with ownership that feels internal, not vendor-shaped.",
            name: "Client voice",
            role: "Composite from engagement feedback",
          },
        ],
      },
    },
    { id: "chapters-editorial" },
    {
      id: "link-band",
      props: {
        links: [
          { title: "Case studies", href: "/work/case-studies" },
          { title: "Start a project", href: "/contact/get-quote" },
        ],
      },
    },
    { id: "cta" },
    { id: "related" },
  ]),

  "project-gallery": compose("gallery", [
    { id: "hero-media", props: { image: img.design } },
    {
      id: "gallery",
      props: { title: "Visual archive", images: [img.design, img.lab, img.office, img.mobile] },
    },
    { id: "metrics" },
    { id: "cta" },
    { id: "related" },
  ]),

  // Full case-study detail pages
  "nexus-ai-platform": richCaseStudy(caseStudyDetails["nexus-ai-platform"], {
    motion: "network",
    hero: "hero-work",
  }),
  "orbit-collaboration-suite": richCaseStudy(caseStudyDetails["orbit-collaboration-suite"], {
    motion: "gallery",
    hero: "hero-media",
  }),
  "cloudforge-infrastructure": richCaseStudy(caseStudyDetails["cloudforge-infrastructure"], {
    motion: "network",
    hero: "hero-cloud",
  }),
  "meridian-health-app": richCaseStudy(caseStudyDetails["meridian-health-app"], {
    motion: "editorial",
    hero: "hero-media",
    image: caseStudyDetails["meridian-health-app"].image,
  }),
  "edusphere-lms": richCaseStudy(caseStudyDetails["edusphere-lms"], {
    motion: "gallery",
    hero: "hero-media",
    image: caseStudyDetails["edusphere-lms"].image,
  }),
};
