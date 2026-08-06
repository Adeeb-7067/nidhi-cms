import { industries, projects, services } from "@/data/mock";
import { getCaseStudy } from "@/data/case-studies";
import { slugify } from "@/lib/slug";

const serviceDetails: Record<
  string,
  { challenge: string; approach: string; deliverables: string[]; timeline: string }
> = {
  "ai-and-machine-learning": {
    challenge:
      "Enterprises need AI that ships to production — with evaluation, monitoring, and governance — not notebook demos that collapse under real traffic, cost, or compliance pressure.",
    approach:
      "We design model architectures, retrieval layers, and agent workflows with human-in-the-loop controls, then operationalize them with MLOps, tracing, and release gates tied to eval harnesses.",
    deliverables: [
      "LLM / RAG platforms",
      "Eval harnesses & dashboards",
      "Agent orchestration",
      "Model monitoring",
    ],
    timeline: "Discovery 2–3 weeks · MVP 6–10 weeks · Scale continuously",
  },
  "cloud-architecture": {
    challenge:
      "Cloud estates sprawl without landing zones, FinOps, or resilience patterns that survive real traffic and audits.",
    approach:
      "We build multi-cloud platforms with Terraform, policy-as-code, observability, and disaster recovery that operators can actually run — then migrate workloads in risk-ordered waves.",
    deliverables: ["Landing zones", "FinOps baselines", "Edge delivery", "DR runbooks"],
    timeline: "Foundation 4–8 weeks · Migration waves thereafter",
  },
  "custom-software": {
    challenge:
      "Organizations need product-grade systems — not throwaway builds that become unmaintainable within a year.",
    approach:
      "Domain modeling, API design, and release engineering run as one craft. We ship vertical slices with quality gates and leave teams able to evolve the codebase.",
    deliverables: ["Greenfield products", "Legacy modernization", "API platforms", "Internal tools"],
    timeline: "Discovery 2 weeks · MVP 6–12 weeks · Iterate",
  },
  "enterprise-applications": {
    challenge:
      "ERP/CRM-adjacent and workflow systems often ignore exceptions — so users invent spreadsheets and shadow processes.",
    approach:
      "We map real operating processes, design role-based workflows with audit trails, and integrate cleanly with systems of record already in the estate.",
    deliverables: ["Workflow platforms", "Integration hubs", "Ops consoles", "Reporting packs"],
    timeline: "Process discovery 2–4 weeks · Delivery in capability waves",
  },
  "web-development": {
    challenge:
      "Web products lose conversion and trust when performance, accessibility, and SEO are treated as late polish.",
    approach:
      "Design systems, Core Web Vitals budgets, CMS architecture, and experimentation ship together — enforced in CI, measured in production.",
    deliverables: ["Design systems", "App Router experiences", "CMS architectures", "Experimentation frameworks"],
    timeline: "Marketing sites 4–8 weeks · Product web apps 6–12 week MVP",
  },
  "mobile-applications": {
    challenge:
      "Mobile apps fail when offline, permissions, and mid-tier device performance are afterthoughts — or when store releases are chaotic.",
    approach:
      "We choose native or cross-platform deliberately, design sync and security for real networks, and run store-ready release trains with staged rollouts.",
    deliverables: ["iOS / Android apps", "Cross-platform clients", "Offline sync", "Store release ops"],
    timeline: "Discovery 2 weeks · MVP 8–14 weeks depending on platform mix",
  },
  "devops-and-automation": {
    challenge:
      "Slow, fearful releases usually signal environment sprawl, manual gates, and missing reliability practice — not lazy engineers.",
    approach:
      "CI/CD, GitOps, progressive delivery, and SRE rituals turn deploy into a predictable machine with error budgets and developer golden paths.",
    deliverables: ["CI/CD platforms", "GitOps delivery", "Environment automation", "SRE runbooks"],
    timeline: "Pipeline foundation 3–6 weeks · Continuous hardening",
  },
  "data-engineering": {
    challenge:
      "Analytics and AI stall when pipelines lack contracts, lineage, and self-serve access that finance and product can trust.",
    approach:
      "We build streaming and warehouse/lakehouse platforms with governance, quality checks, and ownership models — so decisions rest on durable data.",
    deliverables: ["Streaming pipelines", "Warehouse / lakehouse", "Data contracts", "Self-serve BI access"],
    timeline: "Foundation 4–8 weeks · Domain data products thereafter",
  },
  "ui-ux-design": {
    challenge:
      "Beautiful mocks that ignore engineering constraints create redesign loops and inaccessible production UI.",
    approach:
      "Research-led design systems, prototypes paired with builders, and accessibility/motion standards that survive shipping.",
    deliverables: ["Research synthesis", "Design systems", "Interactive prototypes", "A11y guidelines"],
    timeline: "Foundation system 3–6 weeks · Continuous product design",
  },
  cybersecurity: {
    challenge:
      "Security that only appears as pentest season creates recurring findings and frozen delivery.",
    approach:
      "Zero-trust architecture, secure SDLC gates, detection engineering, and evidence packs — so security accelerates shipping instead of blocking it.",
    deliverables: ["Zero-trust design", "DevSecOps gates", "Pentest + remediation", "Audit evidence"],
    timeline: "Posture review 2–4 weeks · Hardening program continuous",
  },
  "digital-transformation": {
    challenge:
      "Transformation programs die in slideware when strategy is separated from the people who write production code.",
    approach:
      "Capability maps, target architecture, migration waves, and operating-model change — executed by the same principals through build and enablement.",
    deliverables: ["Transformation blueprint", "Migration sequence", "Operating model design", "Enablement kits"],
    timeline: "Blueprint 3–6 weeks · Delivery waves 8–16 weeks each",
  },
  "it-consulting": {
    challenge:
      "High-stakes platform, vendor, and acquisition decisions need production-scarred judgment — not rubber stamps.",
    approach:
      "Architecture reviews, technical due diligence, and fractional leadership with written options, risk registers, and ADRs leadership can fund.",
    deliverables: ["Architecture reviews", "Due diligence reports", "Vendor strategy", "Board-ready narratives"],
    timeline: "Typical review 1–3 weeks · Retainer advisory optional",
  },
  "qa-and-testing": {
    challenge:
      "Quality treated as a late phase creates flake-ridden suites nobody trusts and releases nobody believes.",
    approach:
      "Test strategy as architecture: automation pyramids, performance budgets, chaos where resilience is claimed, and CI gates developers respect.",
    deliverables: ["Automation frameworks", "Performance benchmarks", "Chaos experiments", "Release quality gates"],
    timeline: "Strategy + foundation 2–5 weeks · Coverage growth continuous",
  },
  "blockchain-and-web3": {
    challenge:
      "Distributed ledger work fails when smart-contract risk, key management, and auditability are treated casually.",
    approach:
      "Enterprise-grade DLT and smart-contract engineering with threat modeling, audit readiness, and operational controls appropriate to financial and trust stakes.",
    deliverables: ["Smart contract systems", "DLT integrations", "Audit preparation", "Ops runbooks"],
    timeline: "Design 2–4 weeks · Build and audit cycles thereafter",
  },
  "ai-research": {
    challenge:
      "Applied research that never productizes creates IP theatre without durable advantage.",
    approach:
      "Domain-grounded experiments with eval harnesses, then productization paths through MLOps — so research compounds into shippable capability.",
    deliverables: ["Eval harnesses", "Applied prototypes", "MLOps handoff", "IP documentation"],
    timeline: "Spike cycles 2–6 weeks · Productization as follow-on",
  },
  "dedicated-teams": {
    challenge:
      "Staff augmentation without ownership creates ticket queues and diluted accountability.",
    approach:
      "Embedded pods adopt your stack and rituals with a single outcome owner — discovery through scale — and transfer knowledge deliberately.",
    deliverables: ["Embedded squads", "Pod lead ownership", "Shared metrics", "Knowledge transfer"],
    timeline: "Ramp 1–2 weeks · Ongoing roadmap partnership",
  },
};

export const serviceCatalog = services.map((service) => {
  const slug = slugify(service.name);
  const extra = serviceDetails[slug];
  return {
    ...service,
    slug,
    challenge:
      extra?.challenge ??
      `Organizations need ${service.name.toLowerCase()} that is production-ready, observable, and owned by the teams who run it.`,
    approach:
      extra?.approach ??
      `${service.desc} We embed with your rituals and leave you with systems your team can evolve.`,
    deliverables: extra?.deliverables ?? [...service.outcomes],
    timeline: extra?.timeline ?? "Scoped discovery → architecture → build → enablement",
    href: `/services/${slug}`,
  };
});

export const projectCatalog = projects.map((project) => {
  const slug = slugify(project.name);
  const study = getCaseStudy(slug);
  return {
    ...project,
    slug,
    href: `/work/${slug}`,
    challenge:
      study?.challenge ??
      `The client needed a ${project.sector.toLowerCase()} platform that could scale without sacrificing reliability or operator trust. ${project.desc}`,
    solution:
      study?.solution ??
      "Satyakabir embedded a principal-led pod to frame architecture, ship in risk-ordered slices, and transfer ownership with runbooks and ADRs — so the client team could evolve the system after launch.",
    results: study
      ? study.metrics.map((m) => ({ label: m.label, value: m.value }))
      : [
          { label: "Primary metric", value: `${project.metric} ${project.metricLabel}` },
          { label: "Engagement model", value: "Embedded product + platform squad" },
          { label: "Stack focus", value: project.tags.join(" · ") },
        ],
    highlights: study
      ? study.deliverables.slice(0, 4)
      : [
          "Production-grade architecture with observability from day one",
          "Security and compliance controls aligned to industry requirements",
          "Knowledge transfer so the client's team owns the system long-term",
          `Sector focus: ${project.sector}`,
        ],
  };
});

const industryDetails: Record<
  string,
  { capabilities: string[]; outcomes: string[]; overview?: string }
> = {
  "fintech-and-banking": {
    overview:
      "From core banking modernization to AI-driven wealth and risk platforms — we architect systems that move money with auditability baked into ledgers, APIs, and operator workflows.",
    capabilities: [
      "Ledger-aware product engineering",
      "Payments and partner API meshes",
      "Risk and fraud workflow tooling",
      "Cloud platforms with evidence-ready controls",
    ],
    outcomes: [
      "Faster product release with reconciliable financial truth",
      "Risk decisions that explain themselves to analysts and auditors",
      "Estates that survive peak load and regulatory examination",
    ],
  },
  "healthtech-and-life-sciences": {
    overview:
      "HIPAA-aligned platforms, telemedicine infrastructure, and care-ops tooling designed for clinicians under load and patients under stress — with FHIR/HL7 interop where estates demand it.",
    capabilities: [
      "Patient and clinician experience design",
      "EMR/EHR interoperability (FHIR/HL7)",
      "Telehealth and care-ops systems",
      "PHI-aware cloud and security architecture",
    ],
    outcomes: [
      "Journeys clinicians and patients complete",
      "Interop that preserves consent and data quality",
      "Audit-ready controls without freezing delivery",
    ],
  },
  "edtech-and-e-learning": {
    overview:
      "Adaptive learning environments and high-concurrency platforms for global classrooms and enterprise L&D — with assessment integrity and analytics that help instructors, not just dashboards.",
    capabilities: [
      "LMS and learning-path platforms",
      "Assessment and lab environments",
      "Mentor and cohort tooling",
      "Institutional analytics and accessibility",
    ],
    outcomes: [
      "Higher completion through clearer mastery models",
      "Scale across regions without losing pedagogy",
      "Admin reporting that supports accreditation conversations",
    ],
  },
  "retail-and-e-commerce": {
    overview:
      "Headless commerce, inventory intelligence, and peak-ready experiences that protect conversion when traffic and fulfillment stress are highest.",
    capabilities: [
      "Composable / headless commerce builds",
      "Inventory and order-state sync",
      "Peak performance engineering",
      "Merchant and ops consoles",
    ],
    outcomes: [
      "Conversion protected under peak load",
      "Fewer oversells through honest stock truth",
      "Exception queues merchants can clear quickly",
    ],
  },
  "enterprise-saas": {
    overview:
      "Multi-tenant architectures, billing and entitlements, and API platforms that scale with your customer base — without rewriting tenancy when enterprise deals arrive.",
    capabilities: [
      "Multi-tenant product architecture",
      "Billing and entitlement engines",
      "Public API platforms",
      "Enterprise SSO and audit readiness",
    ],
    outcomes: [
      "Margins protected as usage grows",
      "Enterprise packaging without forking the product",
      "Developer experience that reduces support load",
    ],
  },
  "government-and-public-sector": {
    overview:
      "Secure, accessible digital services for citizens and agencies — engineered for trust, continuity, and oversight rather than vanity launch metrics.",
    capabilities: [
      "Citizen service portals",
      "Case and benefits workflows",
      "Accessibility-first delivery",
      "Audit-ready security architecture",
    ],
    outcomes: [
      "Services residents can complete unaided",
      "Evidence trails for oversight bodies",
      "Systems that survive vendor and leadership transitions",
    ],
  },
  "manufacturing-and-logistics": {
    overview:
      "Supply-chain visibility, IoT integration, and predictive maintenance patterns that keep physical operations intelligent — with OT/IT boundaries respected.",
    capabilities: [
      "Plant and fleet telemetry platforms",
      "Quality and traceability workflows",
      "Logistics control-tower tooling",
      "Segmented OT/IT integration",
    ],
    outcomes: [
      "Earlier exception detection across the network",
      "Traceability ready for recall and compliance events",
      "Operator tools that work on the floor and on the road",
    ],
  },
  "media-and-entertainment": {
    overview:
      "Content delivery, asset management, and high-fidelity streaming experiences with global reach — performance and rights workflows included.",
    capabilities: [
      "Streaming and CDN architectures",
      "Media asset pipelines",
      "Rights and publishing workflows",
      "Audience experience surfaces",
    ],
    outcomes: [
      "Reliable playback under global demand",
      "Faster publish cycles with clearer asset truth",
      "Experiences that protect brand quality at scale",
    ],
  },
};

export const industryCatalog = industries.map((industry) => {
  const slug = slugify(industry.name);
  const extra = industryDetails[slug];
  return {
    ...industry,
    slug,
    href: `/industries/${slug}`,
    overview: extra?.overview ?? industry.desc,
    capabilities: extra?.capabilities ?? [
      "Domain-aligned product engineering",
      "Cloud & data platforms",
      "Security & compliance posture",
      "AI-assisted workflows where they create leverage",
    ],
    outcomes: extra?.outcomes ?? [
      "Faster release cadence with lower operational risk",
      "Systems that survive audits and peak load",
      "Teams enabled to evolve platforms without vendor lock-in",
    ],
  };
});

export function getService(slug: string) {
  return serviceCatalog.find((item) => item.slug === slug);
}

export function getProject(slug: string) {
  return projectCatalog.find((item) => item.slug === slug);
}

export function getIndustry(slug: string) {
  return industryCatalog.find((item) => item.slug === slug);
}
