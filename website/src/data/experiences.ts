import { resolvePageContent } from "@/data/page-content";
import {
  COMPANY_IDENTITY,
  defaultOutcomes,
  defaultTrust,
  pageContext,
  type TrustMetric,
} from "@/data/first-viewport";
import { getSectionLeaves } from "@/data/navigation";
import { buildPageMetadata } from "@/data/seo";
import type { Metadata } from "next";

export type ExperienceKind =
  | "ai-neural"
  | "cloud-layers"
  | "security-scan"
  | "product-lifecycle"
  | "healthcare-soft"
  | "education-notebook"
  | "finance-ledger"
  | "industry-atlas"
  | "company-manifesto"
  | "tech-ecosystem"
  | "solutions-blueprint"
  | "careers-journey"
  | "contact-signal"
  | "insights-editorial"
  | "work-gallery"
  | "default-atelier";

export type ExperienceCard = {
  title: string;
  summary: string;
  meta?: string;
};

export type ExperiencePipelineStep = {
  step: string;
  detail: string;
};

export type ExperienceCta = {
  eyebrow: string;
  headline: string;
  supporting: string;
  label: string;
  href: string;
  watermark?: string;
};

export type ExperienceCaseBrief = {
  client: string;
  sector: string;
  engagement: string;
  duration: string;
  challenge: string;
  solution: string;
};

export type ExperiencePayload = {
  sectionId: string;
  slug: string;
  title: string;
  summary: string;
  /** One-line page promise — first-viewport “what is this for” */
  promise: string;
  /** Visitor-facing context, e.g. Services · AI Development */
  eyebrow: string;
  companyIdentity: typeof COMPANY_IDENTITY;
  /** Why-care chips for the first viewport */
  outcomes: string[];
  /** Trust strip (page metrics or site defaults) */
  trust: TrustMetric[];
  related: { title: string; href: string; description: string }[];
  sectionHref: string;
  kind: ExperienceKind;
  accent: string;
  image: string;
  gallery: string[];
  watermark: string;
  highlight: string;
  pills: string[];
  pipeline: ExperiencePipelineStep[];
  cards: ExperienceCard[];
  metrics: { value: string; label: string }[];
  chapters: { label: string; title: string; body: string }[];
  stack: string[];
  faqs: { q: string; a: string }[];
  cta: ExperienceCta;
  seoTitle: string;
  seoDescription: string;
  /** Present on rich /work case-study detail pages */
  caseBrief?: ExperienceCaseBrief;
};

const images = {
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=70",
  aiLab: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=900&q=70",
  neural: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=70",
  cloud: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=70",
  servers: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=70",
  datacenter: "https://images.unsplash.com/photo-1544197150-b99a580bb7a2?auto=format&fit=crop&w=900&q=70",
  security: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=900&q=70",
  lock: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=70",
  product: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=70",
  design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=70",
  mobile: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=70",
  health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=70",
  clinic: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=900&q=70",
  education: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=70",
  classroom: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=70",
  finance: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=70",
  trading: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=70",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70",
  meeting: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=70",
  city: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=900&q=70",
  skyline: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=70",
  lab: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=900&q=70",
  team: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=70",
  collab: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=70",
};

export function matchKind(sectionId: string, slug: string, title: string): ExperienceKind {
  const s = `${sectionId} ${slug} ${title}`.toLowerCase();

  // Section-owned surfaces win over keyword collisions (e.g. careers/internships).
  if (sectionId === "company") return "company-manifesto";
  if (sectionId === "careers") return "careers-journey";
  if (sectionId === "contact") return "contact-signal";
  if (sectionId === "insights") return "insights-editorial";
  if (sectionId === "work") return "work-gallery";

  if (/(ai|machine-learning|generative|llm|agentic|openai|gemini|claude|llama|mistral)/.test(s)) {
    return "ai-neural";
  }
  if (/(cloud|devops|aws|azure|google-cloud|infrastructure|kubernetes)/.test(s)) {
    return "cloud-layers";
  }
  if (/(cyber|security|qa|support|maintenance)/.test(s)) {
    return "security-scan";
  }
  if (/(product|saas|web-development|enterprise-applications|ui-ux|mobile|flutter|react-native|swift|kotlin)/.test(s)) {
    return "product-lifecycle";
  }
  if (/(health|hospital)/.test(s)) return "healthcare-soft";
  if (/(education|learning)/.test(s)) return "education-notebook";
  if (/(finance|fintech|banking|crm|erp|hrms|insurance)/.test(s)) return "finance-ledger";
  if (sectionId === "industries") return "industry-atlas";
  if (sectionId === "technologies") return "tech-ecosystem";
  if (sectionId === "solutions") return "solutions-blueprint";
  if (/(consulting|digital-transformation)/.test(s)) return "solutions-blueprint";
  return "default-atelier";
}

function accentFor(kind: ExperienceKind) {
  const map: Record<ExperienceKind, string> = {
    "ai-neural": "#2B6BFF",
    "cloud-layers": "#00D9FF",
    "security-scan": "#7C4DFF",
    "product-lifecycle": "#FF8A00",
    "healthcare-soft": "#00C853",
    "education-notebook": "#FFB048",
    "finance-ledger": "#7649FF",
    "industry-atlas": "#00C853",
    "company-manifesto": "#FFB048",
    "tech-ecosystem": "#00D9FF",
    "solutions-blueprint": "#2B6BFF",
    "careers-journey": "#00C853",
    "contact-signal": "#2B6BFF",
    "insights-editorial": "#FF8A00",
    "work-gallery": "#C9A227",
    "default-atelier": "#2B6BFF",
  };
  return map[kind];
}

type KindProfile = {
  highlight: string;
  pills: string[];
  pipeline: ExperiencePipelineStep[];
  cards: ExperienceCard[];
  gallery: string[];
  image: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  chapterTitles: [string, string, string, string];
};

function profileFor(kind: ExperienceKind, title: string): KindProfile {
  const profiles: Record<ExperienceKind, KindProfile> = {
    "ai-neural": {
      highlight: "From prompt to production — evaluated, governed, observed.",
      pills: ["LLM platforms", "RAG", "Agents", "Evals", "Guardrails", "MLOps", "Fine-tuning", "HITL"],
      pipeline: [
        { step: "Ingest", detail: "Documents, APIs, event streams" },
        { step: "Retrieve", detail: "Hybrid search + reranking" },
        { step: "Reason", detail: "Tools, agents, memory" },
        { step: "Evaluate", detail: "Offline + online harnesses" },
        { step: "Serve", detail: "Latency, cost, safety gates" },
      ],
      cards: [
        { title: "Inference fabric", summary: "Routed models with fallback, caching, and cost ceilings.", meta: "Runtime" },
        { title: "Knowledge layer", summary: "Chunking, embeddings, and ACL-aware retrieval.", meta: "Data" },
        { title: "Agent studio", summary: "Tool calling, memory, and human approval loops.", meta: "Orchestration" },
        { title: "Eval cockpit", summary: "Regression suites that block unsafe releases.", meta: "Quality" },
      ],
      gallery: [images.ai, images.aiLab, images.neural],
      image: images.ai,
      metrics: [
        { value: "<200ms", label: "p95 target" },
        { value: "Eval-gated", label: "Releases" },
        { value: "HITL", label: "Critical paths" },
        { value: "Traceable", label: "Every token path" },
      ],
      stack: ["Python", "TypeScript", "LangChain", "PyTorch", "Postgres", "Redis", "OpenTelemetry"],
      chapterTitles: ["Signal in the noise", "Architecture of intelligence", "Production discipline", "Continuous learning"],
    },
    "cloud-layers": {
      highlight: "Landing zones that scale. Estates operators can actually run.",
      pills: ["AWS", "GCP", "Azure", "Kubernetes", "Terraform", "FinOps", "SRE", "Edge"],
      pipeline: [
        { step: "Landing zone", detail: "Identity, network, policy" },
        { step: "Platform", detail: "Clusters, pipelines, secrets" },
        { step: "Workloads", detail: "Migrate / greenfield" },
        { step: "Observe", detail: "SLOs, traces, cost" },
        { step: "Harden", detail: "DR, chaos, FinOps" },
      ],
      cards: [
        { title: "Control plane", summary: "GitOps delivery with policy-as-code from day one.", meta: "Platform" },
        { title: "Data plane", summary: "Resilient compute and storage with clear blast radius.", meta: "Runtime" },
        { title: "Edge mesh", summary: "CDN, regional failover, and latency budgets.", meta: "Delivery" },
        { title: "Cost radar", summary: "Unit economics tied to product metrics.", meta: "FinOps" },
      ],
      gallery: [images.cloud, images.servers, images.datacenter],
      image: images.cloud,
      metrics: [
        { value: "99.95%", label: "SLO posture" },
        { value: "Multi-cloud", label: "Ready patterns" },
        { value: "IaC", label: "Everything" },
        { value: "4–8w", label: "Foundation" },
      ],
      stack: ["Terraform", "Kubernetes", "AWS", "GCP", "Azure", "Prometheus", "Grafana"],
      chapterTitles: ["Why estates fail", "Platform before apps", "Operate under fire", "Scale without sprawl"],
    },
    "security-scan": {
      highlight: "Zero-trust posture. Continuous assurance. Threat-aware delivery.",
      pills: ["Zero-trust", "SOC2", "IAM", "SIEM", "Pentest", "DevSecOps", "Secrets", "Threat intel"],
      pipeline: [
        { step: "Map", detail: "Assets, trust boundaries" },
        { step: "Harden", detail: "Identity, network, data" },
        { step: "Detect", detail: "Signals + response" },
        { step: "Prove", detail: "Controls + evidence" },
        { step: "Improve", detail: "Tabletops + drills" },
      ],
      cards: [
        { title: "Identity core", summary: "Least privilege, workload identity, break-glass rituals.", meta: "IAM" },
        { title: "Secure SDLC", summary: "SAST, SCA, and policy gates in every pipeline.", meta: "DevSecOps" },
        { title: "Detection fabric", summary: "High-signal alerts with runbooks your team owns.", meta: "SOC" },
        { title: "Evidence vault", summary: "Audit-ready artifacts without spreadsheet theatre.", meta: "Compliance" },
      ],
      gallery: [images.security, images.lock, images.lab],
      image: images.security,
      metrics: [
        { value: "Zero-trust", label: "Default posture" },
        { value: "Shift-left", label: "Security gates" },
        { value: "24/7", label: "Signal coverage" },
        { value: "Audit-ready", label: "Evidence packs" },
      ],
      stack: ["IAM", "KMS", "SIEM", "OPA", "Vault", "WAF", "EDR"],
      chapterTitles: ["Threat landscape", "Control architecture", "Detection & response", "Assurance loop"],
    },
    "product-lifecycle": {
      highlight: "Interfaces, APIs, and release trains with one standard: clarity.",
      pills: ["Design systems", "Web", "Mobile", "APIs", "QA", "Analytics", "A11y", "Motion"],
      pipeline: [
        { step: "Discover", detail: "Jobs, constraints, bets" },
        { step: "Design", detail: "Flows, systems, prototypes" },
        { step: "Build", detail: "Vertical slices weekly" },
        { step: "Ship", detail: "Feature flags + QA" },
        { step: "Learn", detail: "Telemetry → backlog" },
      ],
      cards: [
        { title: "Experience system", summary: "Tokens, components, and motion that scale across surfaces.", meta: "Design" },
        { title: "Product core", summary: "Domain models and APIs that stay coherent under change.", meta: "Engineering" },
        { title: "Client apps", summary: "Web and mobile with shared quality bars.", meta: "Surfaces" },
        { title: "Release train", summary: "Predictable cadence with rollback confidence.", meta: "Delivery" },
      ],
      gallery: [images.product, images.design, images.mobile],
      image: images.product,
      metrics: [
        { value: "Weekly", label: "Ship cadence" },
        { value: "A11y", label: "Built-in" },
        { value: "Design sys", label: "Shared language" },
        { value: "6–12w", label: "MVP window" },
      ],
      stack: ["React", "Next.js", "TypeScript", "Node", "Swift", "Kotlin", "Figma"],
      chapterTitles: ["Problem framing", "System design", "Build & polish", "Operate & iterate"],
    },
    "healthcare-soft": {
      highlight: "Clinical clarity. Patient journeys. Compliance without friction.",
      pills: ["EHR", "HIPAA", "Patient apps", "Interop", "FHIR", "Care ops", "Telehealth", "Analytics"],
      pipeline: [
        { step: "Journey", detail: "Patient + clinician paths" },
        { step: "Interop", detail: "FHIR / HL7 bridges" },
        { step: "Build", detail: "Safe, auditable apps" },
        { step: "Protect", detail: "PHI controls" },
        { step: "Measure", detail: "Outcomes & ops" },
      ],
      cards: [
        { title: "Care pathways", summary: "Digitized workflows that respect clinical reality.", meta: "Ops" },
        { title: "Patient surface", summary: "Calm interfaces for high-stress moments.", meta: "Experience" },
        { title: "Data trust", summary: "Consent, encryption, and audit trails by default.", meta: "Compliance" },
        { title: "Insight layer", summary: "Operational dashboards that reduce cognitive load.", meta: "Analytics" },
      ],
      gallery: [images.health, images.clinic, images.team],
      image: images.health,
      metrics: [
        { value: "HIPAA", label: "Aligned patterns" },
        { value: "FHIR", label: "Interop ready" },
        { value: "PHI-safe", label: "Architecture" },
        { value: "Clinical", label: "UX rigor" },
      ],
      stack: ["FHIR", "HL7", "React", "Node", "Postgres", "AWS Health"],
      chapterTitles: ["Care reality", "Safe architecture", "Experience design", "Outcomes & trust"],
    },
    "education-notebook": {
      highlight: "Learning systems that feel like studios, not slideshows.",
      pills: ["LMS", "Cohorts", "Assessments", "Labs", "Mentorship", "Analytics", "Content", "Mobile"],
      pipeline: [
        { step: "Curriculum", detail: "Outcomes → modules" },
        { step: "Studio", detail: "Content + labs" },
        { step: "Deliver", detail: "Cohorts & paths" },
        { step: "Assess", detail: "Mastery signals" },
        { step: "Coach", detail: "Mentorship loops" },
      ],
      cards: [
        { title: "Learning paths", summary: "Adaptive sequences with clear mastery gates.", meta: "Pedagogy" },
        { title: "Lab environments", summary: "Safe sandboxes for practice and shipping.", meta: "Practice" },
        { title: "Mentor tools", summary: "Feedback workflows that scale human guidance.", meta: "Support" },
        { title: "Progress radar", summary: "Dashboards for learners, coaches, and operators.", meta: "Insight" },
      ],
      gallery: [images.education, images.classroom, images.collab],
      image: images.education,
      metrics: [
        { value: "Cohort", label: "Ready platforms" },
        { value: "Lab-first", label: "Learning model" },
        { value: "Mentor", label: "Workflows" },
        { value: "Mobile", label: "Access" },
      ],
      stack: ["Next.js", "Node", "Postgres", "WebRTC", "Analytics"],
      chapterTitles: ["Learner jobs", "Studio design", "Delivery systems", "Mastery loops"],
    },
    "finance-ledger": {
      highlight: "Ledgers that reconcile. Risk that is visible. Speed with control.",
      pills: ["Core banking", "Payments", "KYC", "Risk", "Ledger", "Reporting", "Fraud", "APIs"],
      pipeline: [
        { step: "Model", detail: "Domain + ledger" },
        { step: "Control", detail: "Risk & compliance" },
        { step: "Integrate", detail: "Rails & partners" },
        { step: "Operate", detail: "Reconciliation" },
        { step: "Prove", detail: "Audit evidence" },
      ],
      cards: [
        { title: "Ledger core", summary: "Double-entry systems with immutable event history.", meta: "Finance" },
        { title: "Risk engine", summary: "Rules + ML signals with explainable decisions.", meta: "Risk" },
        { title: "Partner mesh", summary: "Payment rails and KYC providers behind clean APIs.", meta: "Integrations" },
        { title: "Ops console", summary: "Exception queues that humans can actually clear.", meta: "Operations" },
      ],
      gallery: [images.finance, images.trading, images.office],
      image: images.finance,
      metrics: [
        { value: "Ledger", label: "Integrity first" },
        { value: "Real-time", label: "Risk signals" },
        { value: "Audit", label: "Evidence packs" },
        { value: "API", label: "Partner ready" },
      ],
      stack: ["Java/Go", "Postgres", "Kafka", "Redis", "Kubernetes"],
      chapterTitles: ["Money movement", "Control design", "Integration fabric", "Operate & prove"],
    },
    "industry-atlas": {
      highlight: "Domain fluency across regulated and high-growth markets.",
      pills: ["Fintech", "Health", "Edtech", "Retail", "Logistics", "Public", "Media", "Manufacturing"],
      pipeline: [
        { step: "Domain", detail: "Map constraints" },
        { step: "Blueprint", detail: "Capability model" },
        { step: "Build", detail: "Priority systems" },
        { step: "Assure", detail: "Compliance gates" },
        { step: "Scale", detail: "Playbooks" },
      ],
      cards: [
        { title: "Regulatory fit", summary: "Controls designed for how your industry is audited.", meta: "Compliance" },
        { title: "Operating model", summary: "Pods that speak domain language fluently.", meta: "Delivery" },
        { title: "Reference systems", summary: "Proven patterns adapted to your estate.", meta: "Architecture" },
        { title: "Change program", summary: "Adoption plans that survive org reality.", meta: "Transformation" },
      ],
      gallery: [images.city, images.skyline, images.meeting],
      image: images.city,
      metrics: [
        { value: "20+", label: "Industries served" },
        { value: "Domain", label: "First design" },
        { value: "Regulated", label: "Ready patterns" },
        { value: "Local", label: "Context depth" },
      ],
      stack: ["Cloud", "Data", "AI", "Security", "Product"],
      chapterTitles: ["Market pressure", "Capability map", "Signature systems", "Scale playbooks"],
    },
    "company-manifesto": {
      highlight: "Precision. Imagination. Systems that outlast the moment they ship.",
      pills: ["AI-first", "Cloud-native", "Human-centric", "Enterprise-ready", "Remote+", "Bengaluru HQ"],
      pipeline: [
        { step: "Listen", detail: "Ambition + constraints" },
        { step: "Thesis", detail: "Architecture narrative" },
        { step: "Build", detail: "Principal-led pods" },
        { step: "Transfer", detail: "Ownership to you" },
        { step: "Evolve", detail: "Optional partnership" },
      ],
      cards: [
        { title: "Company craft", summary: "Engineers and designers who obsess over the last 5%.", meta: "People" },
        { title: "Embedded pods", summary: "Shared metrics and rituals with client teams.", meta: "Delivery" },
        { title: "Default gates", summary: "Security, a11y, and observability are not optional.", meta: "Standards" },
        { title: "Operable exits", summary: "Platforms clients can run after we leave.", meta: "Outcomes" },
      ],
      gallery: [images.office, images.team, images.meeting],
      image: images.office,
      metrics: [
        { value: "HQ", label: "Bengaluru" },
        { value: "Pods", label: "Named owners" },
        { value: "AI+", label: "Production bar" },
        { value: "Transfer", label: "By design" },
      ],
      stack: ["Product", "AI", "Cloud", "Security", "Design"],
      chapterTitles: ["Identity", "Practice", "Transfer", "Horizon"],
    },
    "tech-ecosystem": {
      highlight: "Modern primitives, chosen for longevity — not hype cycles.",
      pills: ["TypeScript", "Python", "Go", "React", "Next.js", "K8s", "Postgres", "Kafka"],
      pipeline: [
        { step: "Select", detail: "Fit-for-purpose stack" },
        { step: "Standardize", detail: "Templates & gates" },
        { step: "Automate", detail: "CI/CD & IaC" },
        { step: "Observe", detail: "Telemetry defaults" },
        { step: "Evolve", detail: "Deprecate gracefully" },
      ],
      cards: [
        { title: "Language core", summary: "TypeScript, Python, Go — where each earns its keep.", meta: "Runtime" },
        { title: "Data spine", summary: "Postgres, Redis, Kafka for durable system memory.", meta: "Data" },
        { title: "Cloud fabric", summary: "Kubernetes and managed services with exit ramps.", meta: "Platform" },
        { title: "AI layer", summary: "Models and evals integrated into the product stack.", meta: "Intelligence" },
      ],
      gallery: [images.lab, images.servers, images.product],
      image: images.lab,
      metrics: [
        { value: "Polyglot", label: "By design" },
        { value: "OSS-first", label: "Where it wins" },
        { value: "Typed", label: "Boundaries" },
        { value: "Observed", label: "By default" },
      ],
      stack: ["TypeScript", "Python", "Go", "React", "Kubernetes", "Postgres", "PyTorch"],
      chapterTitles: ["Why this stack", "How we standardize", "How we operate", "How we evolve"],
    },
    "solutions-blueprint": {
      highlight: "Intake → blueprint → build → operate — one continuous program.",
      pills: ["Discovery", "Architecture", "Migration", "Platform", "Change", "Enablement"],
      pipeline: [
        { step: "Intake", detail: "Ambition framing" },
        { step: "Blueprint", detail: "Target architecture" },
        { step: "Sequence", detail: "Value slices" },
        { step: "Build", detail: "Ship & assure" },
        { step: "Operate", detail: "Run & transfer" },
      ],
      cards: [
        { title: "Transformation map", summary: "Capability gaps tied to measurable OKRs.", meta: "Strategy" },
        { title: "Reference architecture", summary: "Opinionated blueprints with exit criteria.", meta: "Design" },
        { title: "Delivery waves", summary: "Migration and build sequences that reduce risk.", meta: "Execution" },
        { title: "Enablement kit", summary: "Runbooks, training, and ownership transfer.", meta: "Adoption" },
      ],
      gallery: [images.design, images.meeting, images.office],
      image: images.design,
      metrics: [
        { value: "OKR", label: "Tied delivery" },
        { value: "Wave", label: "Based risk" },
        { value: "Board", label: "Ready narratives" },
        { value: "Owned", label: "By your team" },
      ],
      stack: ["Architecture", "Cloud", "Data", "Security", "Change"],
      chapterTitles: ["Ambition intake", "Blueprint craft", "Sequenced delivery", "Operate & transfer"],
    },
    "careers-journey": {
      highlight: "Craft interviews. Studio culture. Roles that ship.",
      pills: ["Engineering", "AI", "Design", "SRE", "Product", "Remote", "Bengaluru", "Interns"],
      pipeline: [
        { step: "Apply", detail: "Show the work" },
        { step: "Craft", detail: "Deep interview" },
        { step: "Studio", detail: "Team session" },
        { step: "Offer", detail: "Clear terms" },
        { step: "Day one", detail: "Ship with us" },
      ],
      cards: [
        { title: "Platform engineering", summary: "Cloud, reliability, and developer experience.", meta: "Open" },
        { title: "AI systems", summary: "Agents, evals, and production intelligence.", meta: "Open" },
        { title: "Product design", summary: "Systems, motion, and accessibility.", meta: "Open" },
        { title: "Apprenticeships", summary: "Structured paths for early-career builders.", meta: "Growing" },
      ],
      gallery: [images.team, images.collab, images.office],
      image: images.team,
      metrics: [
        { value: "Remote+", label: "Default" },
        { value: "Craft", label: "Interview bar" },
        { value: "Ship", label: "From week one" },
        { value: "Mentor", label: "Culture" },
      ],
      stack: ["TypeScript", "Python", "Design", "Cloud", "AI"],
      chapterTitles: ["Who thrives here", "How we hire", "How we work", "How you grow"],
    },
    "contact-signal": {
      highlight: "Principals respond within one business day.",
      pills: ["New build", "Rescue", "Audit", "Partnership", "Staffing", "Advisory"],
      pipeline: [
        { step: "Signal", detail: "Share ambition" },
        { step: "Connect", detail: "Principal call" },
        { step: "Frame", detail: "Scope thesis" },
        { step: "Propose", detail: "Clear next step" },
        { step: "Begin", detail: "Kickoff" },
      ],
      cards: [
        { title: "Start a project", summary: "Greenfield platforms, products, and AI systems.", meta: "Build" },
        { title: "Rescue & harden", summary: "Stabilize estates under pressure.", meta: "Recover" },
        { title: "Architecture review", summary: "A sharp external read on risk and leverage.", meta: "Advise" },
        { title: "Partner embed", summary: "Pods that join your rituals long-term.", meta: "Partner" },
      ],
      gallery: [images.office, images.meeting, images.city],
      image: images.office,
      metrics: [
        { value: "1 day", label: "Response" },
        { value: "Principal", label: "First touch" },
        { value: "Bengaluru", label: "HQ" },
        { value: "Global", label: "Delivery" },
      ],
      stack: ["Discovery", "Architecture", "Delivery", "Enablement"],
      chapterTitles: ["What to share", "How we respond", "How we scope", "How we begin"],
    },
    "insights-editorial": {
      highlight: "Field notes from shipping intelligent systems.",
      pills: ["Architecture", "AI", "Cloud", "Security", "Product", "Culture"],
      pipeline: [
        { step: "Observe", detail: "Real delivery" },
        { step: "Distill", detail: "Patterns" },
        { step: "Write", detail: "Sharp notes" },
        { step: "Share", detail: "With operators" },
        { step: "Apply", detail: "In next build" },
      ],
      cards: [
        { title: "Architecture essays", summary: "Opinions backed by production scars.", meta: "Longform" },
        { title: "Playbooks", summary: "Reusable sequences for common programs.", meta: "Practical" },
        { title: "Briefings", summary: "Short signals for busy principals.", meta: "Fast" },
        { title: "Case studies", summary: "Outcomes with architecture context.", meta: "Proof" },
      ],
      gallery: [images.design, images.lab, images.meeting],
      image: images.design,
      metrics: [
        { value: "Field", label: "Not theory" },
        { value: "Operator", label: "Audience" },
        { value: "Opinionated", label: "On purpose" },
        { value: "Actionable", label: "Always" },
      ],
      stack: ["Architecture", "AI", "Cloud", "Product", "Security"],
      chapterTitles: ["Why we write", "What we notice", "How we decide", "What to try next"],
    },
    "work-gallery": {
      highlight: "Selected systems from the floor — architecture, craft, outcome.",
      pills: ["AI", "Cloud", "Product", "FinTech", "Health", "SaaS", "Platform", "Mobile"],
      pipeline: [
        { step: "Problem", detail: "Pressure & stakes" },
        { step: "Architecture", detail: "Bets we made" },
        { step: "Build", detail: "How we shipped" },
        { step: "Outcome", detail: "What moved" },
        { step: "Transfer", detail: "Who owns it" },
      ],
      cards: [
        { title: "Problem frame", summary: "Business pressure translated into system constraints.", meta: "Context" },
        { title: "Architecture", summary: "The decisions that made scale and safety possible.", meta: "Design" },
        { title: "Delivery", summary: "Cadence, quality gates, and operating rituals.", meta: "Craft" },
        { title: "Impact", summary: "Metrics and qualitative change for the client team.", meta: "Proof" },
      ],
      gallery: [images.product, images.lab, images.city],
      image: images.product,
      metrics: [
        { value: "Case", label: "Led narratives" },
        { value: "Arch", label: "First storytelling" },
        { value: "Measured", label: "Outcomes" },
        { value: "Owned", label: "By clients" },
      ],
      stack: ["Product", "Cloud", "AI", "Security", "Design"],
      chapterTitles: ["The brief", "The architecture", "The journey", "The outcome"],
    },
    "default-atelier": {
      highlight: `Crafted systems for ${title} — observed, governed, human.`,
      pills: ["Discovery", "Architecture", "Build", "Assure", "Enable", "Evolve"],
      pipeline: [
        { step: "Discover", detail: "Ambition & constraints" },
        { step: "Design", detail: "Architecture thesis" },
        { step: "Build", detail: "Vertical slices" },
        { step: "Assure", detail: "Quality gates" },
        { step: "Enable", detail: "Ownership transfer" },
      ],
      cards: [
        { title: "Architecture", summary: "Clear boundaries, observable seams, exit strategies.", meta: "Design" },
        { title: "Delivery", summary: "Principal-led pods with weekly proof.", meta: "Build" },
        { title: "Assurance", summary: "Security, performance, and UX gates.", meta: "Quality" },
        { title: "Enablement", summary: "Your team leaves able to evolve the system.", meta: "Transfer" },
      ],
      gallery: [images.lab, images.office, images.design],
      image: images.lab,
      metrics: [
        { value: "99.9%", label: "Reliability bar" },
        { value: "6–12w", label: "Typical MVP" },
        { value: "24/7", label: "Ops posture" },
        { value: "1:1", label: "Principal access" },
      ],
      stack: ["TypeScript", "Cloud-native", "Observability", "Security", "Design systems"],
      chapterTitles: ["Why this exists", "How we build", "What changes", "What comes next"],
    },
  };

  return profiles[kind];
}

export function buildExperience(input: {
  sectionId: string;
  slug: string;
  title: string;
  summary: string;
  related: { title: string; href: string; description: string }[];
}): ExperiencePayload {
  const kind = matchKind(input.sectionId, input.slug, input.title);
  const profile = profileFor(kind, input.title);
  const resolved = resolvePageContent({
    sectionId: input.sectionId,
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    kind,
    related: input.related,
  });
  const watermark =
    resolved.watermark ??
    resolved.cta.watermark ??
    input.title.split(" ")[0]?.toUpperCase() ??
    "SK";

  const metrics = resolved.metrics ?? profile.metrics;
  const promise = resolved.summary;

  return {
    sectionId: input.sectionId,
    slug: input.slug,
    title: input.title,
    summary: resolved.summary,
    promise,
    eyebrow: resolved.eyebrow ?? pageContext(input.sectionId, input.title),
    companyIdentity: COMPANY_IDENTITY,
    outcomes: defaultOutcomes(input.sectionId),
    trust: defaultTrust(metrics),
    related: resolved.related ?? input.related,
    sectionHref: `/${input.sectionId}`,
    kind,
    accent: accentFor(kind),
    image: resolved.image ?? profile.image,
    gallery: resolved.gallery ?? profile.gallery,
    watermark,
    highlight: resolved.highlight ?? profile.highlight,
    pills: resolved.pills ?? profile.pills,
    pipeline: resolved.pipeline ?? profile.pipeline,
    cards: resolved.cards ?? profile.cards,
    metrics,
    chapters: resolved.chapters,
    stack: resolved.stack ?? profile.stack,
    faqs: resolved.faqs,
    cta: resolved.cta,
    seoTitle: resolved.seoTitle,
    seoDescription: resolved.seoDescription,
  };
}

export function experienceMetadata(
  data: Pick<ExperiencePayload, "seoTitle" | "seoDescription" | "title" | "sectionId" | "slug">,
): Metadata {
  const title = data.seoTitle || `${data.title} — Nidhi Info Tech`;
  const description =
    data.seoDescription ||
    `${data.title} from Nidhi Info Tech — AI-first engineering.`;
  return buildPageMetadata({
    title,
    description,
    path: `/${data.sectionId}/${data.slug}`,
  });
}

/** Build SEO metadata for a nav leaf without rendering the page. */
export function leafExperienceMetadata(sectionId: string, slug: string): Metadata {
  const leaves = getSectionLeaves(sectionId);
  const href = `/${sectionId}/${slug}`;
  const leaf = leaves.find((l) => l.href === href);
  const title = leaf?.title ?? slug.replace(/-/g, " ");
  const summary =
    leaf?.description ?? `Explore ${title} within Nidhi Info Tech.`;
  const data = buildExperience({
    sectionId,
    slug,
    title,
    summary,
    related: [],
  });
  return experienceMetadata(data);
}
