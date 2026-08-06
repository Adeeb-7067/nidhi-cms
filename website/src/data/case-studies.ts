/**
 * Rich project case studies — source of truth for /work/{slug} detail pages.
 * Catalog + ExperiencePayload map from this file so every project page can
 * tell the full story (context → architecture → delivery → outcomes → transfer).
 */

export type CaseStudyMetric = { value: string; label: string };

export type CaseStudyChapter = {
  label: string;
  title: string;
  body: string;
};

export type CaseStudyFaq = { q: string; a: string };

export type CaseStudyTimelineItem = {
  year: string;
  title: string;
  body: string;
};

export type CaseStudyDetail = {
  slug: string;
  name: string;
  sector: string;
  client: string;
  headline: string;
  summary: string;
  challenge: string;
  solution: string;
  engagement: string;
  duration: string;
  accent: string;
  image: string;
  gallery: string[];
  pills: string[];
  stack: string[];
  deliverables: string[];
  architecture: string[];
  metrics: CaseStudyMetric[];
  pipeline: { step: string; detail: string }[];
  cards: { title: string; summary: string; meta?: string }[];
  chapters: CaseStudyChapter[];
  timeline: CaseStudyTimelineItem[];
  quote: { quote: string; name: string; role: string };
  faqs: CaseStudyFaq[];
  relatedServices: { title: string; href: string; description?: string }[];
  cta: {
    eyebrow: string;
    headline: string;
    supporting: string;
    label: string;
    href: string;
    watermark: string;
  };
  seoTitle: string;
  seoDescription: string;
};

const quoteHref = "/contact/get-quote";
const bookHref = "/contact/book-meeting";

export const caseStudyDetails: Record<string, CaseStudyDetail> = {
  "nexus-ai-platform": {
    slug: "nexus-ai-platform",
    name: "Nexus AI Platform",
    sector: "FinTech",
    client: "Global markets desk (confidential)",
    headline: "Real-time intelligence for a market that never pauses",
    summary:
      "We rebuilt a legacy financial analytics stack into a streaming lakehouse with an AI decision layer — processing 2.3M events per second, cutting decision latency 40%, and removing an estimated $12M in annual infrastructure waste.",
    challenge:
      "Traders needed answers in seconds; the legacy warehouse answered in minutes. Batch ETL, brittle dashboards, and opaque cost growth meant infrastructure spend outpaced revenue while operators lost trust in the numbers they traded on.",
    solution:
      "A principal-led platform squad replaced the batch core with a streaming lakehouse, added an evaluated AI decision layer behind policy gates, and shipped an operator console the desk actually uses — with FinOps and audit trails from day one.",
    engagement: "Embedded platform + AI squad",
    duration: "7 months",
    accent: "#2B6BFF",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=80",
    ],
    pills: [
      "Streaming lakehouse",
      "AI decisioning",
      "FinOps",
      "Audit trails",
      "Operator UX",
      "Eval gates",
    ],
    stack: [
      "Next.js",
      "Kafka",
      "Python",
      "PyTorch",
      "AWS",
      "Terraform",
      "Postgres",
      "OpenTelemetry",
    ],
    deliverables: [
      "Event streaming backbone with backpressure and replay",
      "Feature + model serving path with offline/online evals",
      "Trading-desk operator console with role-based views",
      "Cost attribution and FinOps dashboards",
      "Runbooks, ADRs, and on-call enablement pack",
    ],
    architecture: [
      "Kafka → lakehouse → feature store → model router",
      "Policy gate + human-in-the-loop for irreversible actions",
      "Private VPC endpoints; no raw desk data to public SaaS",
      "Observability: traces, cost ceilings, decision lineage",
    ],
    metrics: [
      { value: "2.3M", label: "events / sec" },
      { value: "−40%", label: "decision latency" },
      { value: "$12M", label: "annual waste removed" },
      { value: "7 mo", label: "to production desk" },
    ],
    pipeline: [
      { step: "Frame", detail: "Desk pressure, latency SLOs, risk" },
      { step: "Stream", detail: "Replace batch with lakehouse" },
      { step: "Decide", detail: "AI layer with eval gates" },
      { step: "Operate", detail: "Console, FinOps, on-call" },
      { step: "Transfer", detail: "ADRs + runbooks to client SRE" },
    ],
    cards: [
      {
        title: "Pressure",
        summary:
          "Minutes-old answers on a seconds market — plus cost that grew faster than revenue.",
        meta: "Challenge",
      },
      {
        title: "Bet",
        summary:
          "Streaming truth + evaluated AI, not another warehouse migration slide deck.",
        meta: "Architecture",
      },
      {
        title: "Cadence",
        summary:
          "Weekly vertical slices behind flags; desk pilots before full cutover.",
        meta: "Delivery",
      },
      {
        title: "Proof",
        summary:
          "Latency, cost, and operator adoption measured in production — labeled honestly.",
        meta: "Outcome",
      },
    ],
    chapters: [
      {
        label: "01 · Context",
        title: "Why the old stack could not keep up",
        body: "The estate had grown through acquisitions: multiple warehouses, nightly jobs, and dashboards that looked authoritative while serving stale aggregates. Traders compensated with spreadsheets. Platform cost rose without a clear owner for each dollar. Leadership needed a system that was fast, attributable, and explainable to risk and audit.",
      },
      {
        label: "02 · Architecture",
        title: "Streaming lakehouse with a governed decision layer",
        body: "We collapsed batch paths into an event backbone with durable replay, contracted schemas, and a lakehouse that served both analytics and low-latency features. Models sat behind a router with offline regression suites and online monitors. Irreversible recommendations required human confirmation. Every decision left a lineage record suitable for desk and compliance review.",
      },
      {
        label: "03 · Delivery",
        title: "Desk-first slices, not a big-bang cutover",
        body: "Discovery locked SLOs with trading and risk. We shadowed traffic for critical symbols, then promoted pods under feature flags. The operator console shipped early so the desk could reject designs that looked clever in demos but failed under live pressure. Cost attribution landed in the same waves as features — FinOps was not a later phase.",
      },
      {
        label: "04 · Security & controls",
        title: "Market data stays inside the trust boundary",
        body: "Private connectivity, least-privilege IAM, encrypted at rest and in transit, and ACL-aware retrieval for any generative assist surfaces. Model providers were chosen only after residency and contractual review. Audit could reconstruct who saw what, when, and why a model suggested an action.",
      },
      {
        label: "05 · Outcomes",
        title: "Speed, savings, and trust that stuck",
        body: "Peak ingest hit 2.3M events per second. Median decision latency fell about 40% on the instrumented desk paths. FinOps attributed and retired idle clusters and duplicated pipelines — an estimated $12M annual waste removed. Operators stopped maintaining shadow spreadsheets for the promoted workflows.",
      },
      {
        label: "06 · Transfer",
        title: "Their SRE owns the system",
        body: "We left ADRs for every major bet, runbooks for incident classes the desk actually sees, on-call pairing weeks, and an eval harness the client team extends. Satyakabir remains on retainer for hard problems — not as a black-box dependency for day-to-day operation.",
      },
    ],
    timeline: [
      {
        year: "W1–3",
        title: "Pressure map",
        body: "Latency SLOs, cost baseline, risk constraints, desk journeys.",
      },
      {
        year: "W4–12",
        title: "Streaming core",
        body: "Kafka + lakehouse foundation, schema contracts, replay drills.",
      },
      {
        year: "W13–22",
        title: "Decision layer",
        body: "Features, models, eval gates, console v1 under shadow traffic.",
      },
      {
        year: "W23–28",
        title: "Cutover & FinOps",
        body: "Flagged promotion, cost attribution, on-call transfer.",
      },
    ],
    quote: {
      quote:
        "They rebuilt the path from event to decision without breaking the desk — and left us able to operate it.",
      name: "Platform lead",
      role: "Client engineering (composite)",
    },
    faqs: [
      {
        q: "Was client identity disclosed?",
        a: "No. Metrics and architecture are representative of the engagement class; commercial identity remains confidential under NDA.",
      },
      {
        q: "Did AI replace human traders?",
        a: "No. The system accelerates and explains decisions; irreversible actions stay human-gated where risk requires it.",
      },
      {
        q: "How was $12M waste estimated?",
        a: "From attributed idle capacity, duplicated pipelines, and retired batch estates after cutover — labeled as an estimate, not a GAAP claim.",
      },
      {
        q: "Can this pattern apply outside trading?",
        a: "Yes — any high-velocity decision surface with cost and audit pressure: fraud, pricing, ops routing, risk scoring.",
      },
    ],
    relatedServices: [
      {
        title: "AI Development",
        href: "/services/ai-development",
        description: "Evaluated production AI",
      },
      {
        title: "Machine Learning",
        href: "/services/machine-learning",
        description: "Serving & drift",
      },
      {
        title: "Cloud Engineering",
        href: "/services/cloud-engineering",
        description: "Streaming platforms",
      },
      {
        title: "Book a session",
        href: bookHref,
        description: "Scope a similar build",
      },
    ],
    cta: {
      eyebrow: "FinTech platforms",
      headline: "Need real-time decisions without losing the audit trail?",
      supporting:
        "Book a principal-led session. We leave with a latency/cost thesis and a scoped first slice — not a slide deck of possibilities.",
      label: "Book an AI Strategy Session",
      href: bookHref,
      watermark: "NEXUS",
    },
    seoTitle: "Nexus AI Platform Case Study — Satyakabir Technologies",
    seoDescription:
      "How Satyakabir rebuilt a FinTech analytics stack into a streaming AI platform: 2.3M events/sec, −40% decision latency, estimated $12M waste removed.",
  },

  "orbit-collaboration-suite": {
    slug: "orbit-collaboration-suite",
    name: "Orbit Collaboration Suite",
    sector: "SaaS",
    client: "High-growth collaboration SaaS",
    headline: "Sub-10ms collaboration that holds at half a million concurrent users",
    summary:
      "We engineered a real-time collaboration fabric — WebRTC mesh, conflict-free document sync, and end-to-end encryption — so 500K concurrent users could co-edit without the lag and dropouts that were killing enterprise deals.",
    challenge:
      "Enterprise buyers rejected the product in trials: presence flickered, edits collided, and video rooms collapsed under modest concurrency. The team had shipped features faster than the realtime substrate could carry them.",
    solution:
      "We redesigned the sync and media plane: CRDT-backed documents, selective forwarding and mesh for media, E2E encryption with recoverable enterprise keys, and load tests that mirrored real multi-region usage — then shipped with SRE rituals the client could run.",
    engagement: "Embedded realtime + product squad",
    duration: "6 months",
    accent: "#FF8A00",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80",
    ],
    pills: [
      "WebRTC",
      "CRDTs",
      "E2E encryption",
      "Multi-region",
      "Presence",
      "Load testing",
    ],
    stack: [
      "React",
      "TypeScript",
      "WebRTC",
      "Redis",
      "Node.js",
      "Kubernetes",
      "Prometheus",
      "Grafana",
    ],
    deliverables: [
      "CRDT document sync with offline recovery",
      "Media SFU/mesh with adaptive bitrate",
      "Enterprise E2E key recovery flows",
      "Presence and awareness at scale",
      "Chaos and concurrency test harness",
    ],
    architecture: [
      "Edge presence + regional sync authorities",
      "Media plane separate from document plane",
      "Encrypted payloads; server sees metadata only where required",
      "Progressive reconnect and conflict visualization",
    ],
    metrics: [
      { value: "500K", label: "concurrent users" },
      { value: "<10ms", label: "local edit feel" },
      { value: "99.95%", label: "session uptime" },
      { value: "6 mo", label: "to enterprise GA" },
    ],
    pipeline: [
      { step: "Diagnose", detail: "Failure modes under load" },
      { step: "Reshape", detail: "Sync + media planes" },
      { step: "Harden", detail: "E2E + recovery paths" },
      { step: "Prove", detail: "Multi-region load & chaos" },
      { step: "Enable", detail: "SRE + support playbooks" },
    ],
    cards: [
      {
        title: "Trial killers",
        summary: "Lag, conflicts, and room collapses blocked enterprise closes.",
        meta: "Challenge",
      },
      {
        title: "Two planes",
        summary: "Document sync and media engineered as separate reliability domains.",
        meta: "Architecture",
      },
      {
        title: "Prove it",
        summary: "Concurrency tests mirrored real multi-region buyer scenarios.",
        meta: "Delivery",
      },
      {
        title: "Ship trust",
        summary: "E2E encryption with enterprise recovery — not security theatre.",
        meta: "Outcome",
      },
    ],
    chapters: [
      {
        label: "01 · Context",
        title: "Features had outrun the realtime core",
        body: "The product looked complete in demos of five people. At fifty, presence lied. At a few hundred, edits fought and rooms dropped. Sales needed a substrate that survived enterprise trials — not another UI polish sprint.",
      },
      {
        label: "02 · Architecture",
        title: "Sync, media, and keys as deliberate layers",
        body: "Documents moved to CRDT-backed sync with clear authority regions and offline catch-up. Media used selective forwarding with mesh fallbacks for small rooms. Encryption protected payloads; enterprise recovery was designed with security, not bolted on. Observability treated latency histograms and reconnect storms as first-class product metrics.",
      },
      {
        label: "03 · Delivery",
        title: "Load first, then promote",
        body: "We built a harness that replayed concurrent editing and call patterns from anonymized production shapes. Each wave had a kill switch. UX work focused on conflict visibility and reconnect honesty so users trusted the system when the network did not.",
      },
      {
        label: "04 · Security",
        title: "E2E without stranding the enterprise",
        body: "Key hierarchies supported device loss and admin recovery under policy. Servers minimized plaintext exposure. Threat models covered room hijack, replay, and insider metadata abuse — with fixes tracked as product work, not audit season panic.",
      },
      {
        label: "05 · Outcomes",
        title: "Trials that convert",
        body: "The stack sustained 500K concurrent users in staged peak tests. Local edit feel stayed under 10ms on healthy links. Session uptime for instrumented enterprise cohorts hit 99.95%. Win-rate on technical trials improved as lag and drop complaints fell out of deal reviews.",
      },
      {
        label: "06 · Transfer",
        title: "Their team runs the plane",
        body: "SRE playbooks, dashboards, and on-call shadows transferred ownership. We documented failure modes we had already seen so the next outage would not be a first contact.",
      },
    ],
    timeline: [
      {
        year: "W1–2",
        title: "Failure inventory",
        body: "Reproduce lag, conflict, and room death under load.",
      },
      {
        year: "W3–10",
        title: "Sync rebuild",
        body: "CRDT plane, presence, offline recovery.",
      },
      {
        year: "W11–18",
        title: "Media + E2E",
        body: "SFU/mesh, encryption, enterprise recovery.",
      },
      {
        year: "W19–24",
        title: "Prove & GA",
        body: "Multi-region chaos, SRE transfer, enterprise GA.",
      },
    ],
    quote: {
      quote:
        "Our enterprise trials stopped failing on the substrate. That changed the sales conversation overnight.",
      name: "VP Engineering",
      role: "Client (composite)",
    },
    faqs: [
      {
        q: "Why WebRTC and CRDTs together?",
        a: "Media and document sync have different failure modes. Separating planes lets each scale and recover without dragging the other down.",
      },
      {
        q: "Did you rewrite the whole product?",
        a: "No. We replaced the realtime substrate and the surfaces that depended on it, behind flags, while feature teams kept shipping on stable APIs.",
      },
      {
        q: "How do you test 500K concurrency?",
        a: "Staged load with realistic session mixes, regional fan-out, and chaos on reconnect — not a single synthetic megaburst.",
      },
    ],
    relatedServices: [
      {
        title: "Web Development",
        href: "/services/web-development",
        description: "Product-grade web",
      },
      {
        title: "Custom Software",
        href: "/services/custom-software",
        description: "Realtime systems",
      },
      {
        title: "DevOps",
        href: "/services/devops",
        description: "SRE & delivery",
      },
      { title: "Start a project", href: quoteHref, description: "Get a scoped quote" },
    ],
    cta: {
      eyebrow: "Realtime SaaS",
      headline: "Building collaboration that must not flake under load?",
      supporting:
        "Talk to a principal about sync, media, and encryption as one reliability problem — before the next enterprise trial.",
      label: "Get a Project Quote",
      href: quoteHref,
      watermark: "ORBIT",
    },
    seoTitle: "Orbit Collaboration Suite Case Study — Satyakabir Technologies",
    seoDescription:
      "How Satyakabir rebuilt realtime collaboration for 500K concurrent users with WebRTC, CRDTs, and enterprise E2E encryption.",
  },

  "cloudforge-infrastructure": {
    slug: "cloudforge-infrastructure",
    name: "CloudForge Infrastructure",
    sector: "Retail",
    client: "Fortune 100 retailer",
    headline: "From three-week releases to forty-five minutes",
    summary:
      "We rebuilt Kubernetes provisioning and GitOps delivery for a Fortune 100 retailer — turning fearful quarterly deploys into 45-minute fully tested releases with 99.99% checkout uptime through peak.",
    challenge:
      "Releases took three weeks of manual coordination. Peak season was a reliability prayer. Checkout incidents cost revenue and trust, and engineers spent more time fighting environments than shipping merchandising capability.",
    solution:
      "Landing-zone discipline, GitOps on Kubernetes, progressive delivery, and a commerce path rebuilt so peak traffic is an engineered load problem — with FinOps and evidence packs operations can actually run.",
    engagement: "Platform engineering program",
    duration: "11 months",
    accent: "#FF8A00",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
    ],
    pills: [
      "Kubernetes",
      "GitOps",
      "Progressive delivery",
      "Peak readiness",
      "FinOps",
      "SRE",
    ],
    stack: [
      "Kubernetes",
      "Go",
      "Terraform",
      "Argo CD",
      "Next.js",
      "PostgreSQL",
      "Prometheus",
      "Grafana",
    ],
    deliverables: [
      "Multi-cluster landing zones with policy-as-code",
      "GitOps pipelines with progressive delivery",
      "Peak-load rehearsal and chaos drills",
      "Checkout SLO dashboards and error budgets",
      "Developer golden paths and environment automation",
    ],
    architecture: [
      "Immutable infra via Terraform + GitOps",
      "Canary and blue/green for checkout-critical paths",
      "Observability and tracing as release gates",
      "DR runbooks rehearsed before peak",
    ],
    metrics: [
      { value: "45m", label: "full release" },
      { value: "+186%", label: "peak conversion*" },
      { value: "99.99%", label: "checkout uptime" },
      { value: "11 mo", label: "platform program" },
    ],
    pipeline: [
      { step: "Baseline", detail: "Release pain & peak risk" },
      { step: "Land", detail: "Clusters & policy" },
      { step: "Flow", detail: "GitOps + progressive" },
      { step: "Peak", detail: "Load & chaos drills" },
      { step: "Own", detail: "SRE + golden paths" },
    ],
    cards: [
      {
        title: "Fearful releases",
        summary: "Three-week cycles and manual gates made every deploy a business risk.",
        meta: "Challenge",
      },
      {
        title: "Platform bet",
        summary: "Kubernetes + GitOps with progressive delivery on checkout paths.",
        meta: "Architecture",
      },
      {
        title: "Peak as practice",
        summary: "Load and chaos rehearsals before the season — not during it.",
        meta: "Delivery",
      },
      {
        title: "Operable estate",
        summary: "SLOs, error budgets, and golden paths developers actually use.",
        meta: "Outcome",
      },
    ],
    chapters: [
      {
        label: "01 · Context",
        title: "Peak season exposed every weak seam",
        body: "Checkout, inventory, and promotions shared fragile release rituals. Environments drifted. Rollbacks were tribal knowledge. Leadership needed a platform that made the safe path the fast path — especially when traffic spiked.",
      },
      {
        label: "02 · Architecture",
        title: "Landing zones, GitOps, progressive delivery",
        body: "We established policy-guarded clusters, immutable promotion via Git, and canaries on revenue-critical services. Commerce paths got explicit SLOs. Observability blocked releases that violated latency or error budgets. DR was written and rehearsed, not filed.",
      },
      {
        label: "03 · Delivery",
        title: "Waves that paid for themselves",
        body: "Early waves automated the worst manual gates. Mid waves moved checkout-critical services onto progressive delivery. Late waves focused on peak rehearsal: synthetic load, failure injection, and war-room rituals the client still runs.",
      },
      {
        label: "04 · Security & compliance",
        title: "Evidence without freezing delivery",
        body: "Policy-as-code, image signing, and change evidence packs satisfied audit without returning to ticket theatre. Secrets and network policy followed least privilege across clusters.",
      },
      {
        label: "05 · Outcomes",
        title: "Release speed and peak calm",
        body: "Fully tested releases compressed to about 45 minutes on the new path. Checkout uptime held at 99.99% through the instrumented peak window. Conversion lift during peak (+186% vs prior comparable period*) reflected stability and faster experimentation — labeled with the cohort definition the client uses internally.",
      },
      {
        label: "06 · Transfer",
        title: "Their platform team owns the machine",
        body: "Golden paths, dashboards, and on-call shadows transferred. We stayed for peak as advisors, then stepped back. The release machine is theirs.",
      },
    ],
    timeline: [
      {
        year: "M1–2",
        title: "Baseline & landing zones",
        body: "Map pain, stand policy-guarded clusters.",
      },
      {
        year: "M3–6",
        title: "GitOps flow",
        body: "Progressive delivery on critical services.",
      },
      {
        year: "M7–9",
        title: "Peak readiness",
        body: "Load, chaos, DR rehearsal.",
      },
      {
        year: "M10–11",
        title: "Ownership",
        body: "Golden paths, SRE transfer, peak advisory.",
      },
    ],
    quote: {
      quote:
        "Peak used to be a war room by default. Now it is a practiced drill — and releases stopped being the scary part.",
      name: "Director of Platform",
      role: "Client (composite)",
    },
    faqs: [
      {
        q: "What does the +186% conversion figure mean?",
        a: "Client-reported lift in the peak cohort vs the prior comparable period after stability and experimentation improvements. It is marked as their internal definition, not a universal benchmark.",
      },
      {
        q: "Did you rewrite the entire commerce stack?",
        a: "No. We rebuilt the delivery and reliability substrate first, then modernized checkout-critical paths in risk-ordered waves.",
      },
      {
        q: "How long until developers felt the change?",
        a: "Golden paths and environment automation landed mid-program; most product teams felt weekly release confidence before the final peak wave.",
      },
    ],
    relatedServices: [
      {
        title: "Cloud Architecture",
        href: "/services/cloud-architecture",
        description: "Landing zones",
      },
      { title: "DevOps", href: "/services/devops", description: "GitOps & SRE" },
      {
        title: "Kubernetes",
        href: "/technologies/kubernetes",
        description: "Cluster craft",
      },
      { title: "Get a quote", href: quoteHref, description: "Platform programs" },
    ],
    cta: {
      eyebrow: "Retail platforms",
      headline: "Still shipping peak on hope?",
      supporting:
        "A principal can map your release pain to a landing-zone and progressive-delivery plan in one working session.",
      label: "Get a Platform Quote",
      href: quoteHref,
      watermark: "FORGE",
    },
    seoTitle: "CloudForge Infrastructure Case Study — Satyakabir Technologies",
    seoDescription:
      "Fortune 100 retail platform case study: Kubernetes GitOps, 45-minute releases, 99.99% checkout uptime, peak readiness.",
  },

  "meridian-health-app": {
    slug: "meridian-health-app",
    name: "Meridian Health App",
    sector: "HealthTech",
    client: "Regional care network",
    headline: "Triage that reaches patients before the waiting room does",
    summary:
      "We shipped an ML-powered triage and telehealth app with HIPAA controls end to end — 2M+ downloads, 4.9★ store rating, and 62% faster first clinical response without breaking compliance workflows.",
    challenge:
      "Clinicians drowned in intake paperwork while patients waited days for a first response. Shadow workarounds risked PHI exposure. Leadership needed speed that auditors could still trust.",
    solution:
      "A mobile-first telehealth product with ML triage behind clinical review, FHIR-aware integrations, and PHI architecture that made the compliant path the easy path for staff and patients.",
    engagement: "Product engineering + clinical ops",
    duration: "9 months",
    accent: "#00C853",
    image:
      "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=1800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1400&q=80",
    ],
    pills: [
      "Telehealth",
      "ML triage",
      "HIPAA",
      "FHIR",
      "Mobile",
      "Clinical UX",
    ],
    stack: [
      "React Native",
      "Node.js",
      "PostgreSQL",
      "GCP",
      "HL7 FHIR",
      "Python",
      "Redis",
      "Terraform",
    ],
    deliverables: [
      "Patient iOS/Android apps with accessibility review",
      "Clinician console for triage queues",
      "ML triage service with human override",
      "FHIR/HL7 integration adapters",
      "HIPAA evidence pack and BAA-ready architecture",
    ],
    architecture: [
      "PHI segmented stores with encryption and audit logs",
      "Triage model offline-evaluated; online monitored",
      "Clinician override always available",
      "Interop via FHIR where estates required it",
    ],
    metrics: [
      { value: "2M+", label: "downloads" },
      { value: "4.9★", label: "store rating" },
      { value: "62%", label: "faster first response" },
      { value: "9 mo", label: "to scale release" },
    ],
    pipeline: [
      { step: "Clinic", detail: "Journey & compliance map" },
      { step: "Build", detail: "Mobile + triage MVP" },
      { step: "Integrate", detail: "FHIR & care ops" },
      { step: "Prove", detail: "Safety evals & pilots" },
      { step: "Scale", detail: "Stores + enablement" },
    ],
    cards: [
      {
        title: "Wait & risk",
        summary: "Days to first response; workarounds that threatened PHI.",
        meta: "Challenge",
      },
      {
        title: "Safe speed",
        summary: "ML triage with clinician override and HIPAA-native design.",
        meta: "Architecture",
      },
      {
        title: "Adoption",
        summary: "Workflows designed with nurses and physicians, not around them.",
        meta: "Delivery",
      },
      {
        title: "Reach",
        summary: "Millions of downloads with ratings that reflect real care journeys.",
        meta: "Outcome",
      },
    ],
    chapters: [
      {
        label: "01 · Context",
        title: "Intake was the bottleneck — and the risk",
        body: "Patients arrived digitally into paper-shaped processes. Clinicians invented shortcuts. Every shortcut was a compliance incident waiting to happen. The product brief was not 'another app' — it was a care-ops redesign with software as the enforcement layer.",
      },
      {
        label: "02 · Architecture",
        title: "Mobile care with governed intelligence",
        body: "Patient apps and clinician consoles shared a PHI-aware backend. Triage models ranked urgency; humans always owned the final call. FHIR adapters met existing EMR reality. Encryption, access logs, and retention policies were designed before the first beta cohort.",
      },
      {
        label: "03 · Delivery",
        title: "Pilots inside real clinics",
        body: "We shadowed intake days, then piloted with volunteer clinics. Feedback killed clever UI that slowed nurses. Safety evals gated model promotions. Store releases followed clinical readiness, not marketing calendars.",
      },
      {
        label: "04 · Compliance",
        title: "HIPAA as product constraint, not a checklist",
        body: "BAAs, least-privilege roles, audit exports, and breach-ready runbooks shipped with the product. Security review was continuous — not a pre-launch scramble.",
      },
      {
        label: "05 · Outcomes",
        title: "Faster first touch, durable ratings",
        body: "First clinical response time improved about 62% in instrumented clinics. The apps crossed 2M downloads with a 4.9★ aggregate rating. Clinicians reported fewer shadow spreadsheets for the covered intake paths.",
      },
      {
        label: "06 · Transfer",
        title: "Clinical ops owns the queue",
        body: "Training kits, admin consoles, and model-monitoring playbooks transferred to the client's digital health team. We remained available for model upgrades under the same safety gates.",
      },
    ],
    timeline: [
      {
        year: "M1–2",
        title: "Care journey map",
        body: "Compliance boundaries, clinic shadowing, MVP scope.",
      },
      {
        year: "M3–5",
        title: "App + triage",
        body: "Mobile MVP, clinician console, safety evals.",
      },
      {
        year: "M6–7",
        title: "Interop",
        body: "FHIR adapters, pilot clinics.",
      },
      {
        year: "M8–9",
        title: "Scale",
        body: "Store push, enablement, monitoring handoff.",
      },
    ],
    quote: {
      quote:
        "Patients feel faster care. Our clinicians feel the system respects how they actually work — and compliance stopped being the blocker.",
      name: "Chief Digital Officer",
      role: "Client (composite)",
    },
    faqs: [
      {
        q: "Does ML triage replace clinicians?",
        a: "Never for final disposition. Models prioritize and suggest; licensed clinicians decide.",
      },
      {
        q: "How do you handle PHI?",
        a: "Segmented stores, encryption, strict roles, audit logs, and retention policies designed with counsel — before broad rollout.",
      },
      {
        q: "Can this integrate with our EMR?",
        a: "We typically meet estates via FHIR/HL7 adapters; exact connectors depend on vendor and region.",
      },
    ],
    relatedServices: [
      {
        title: "Mobile Applications",
        href: "/services/mobile-applications",
        description: "iOS & Android",
      },
      {
        title: "AI Development",
        href: "/services/ai-development",
        description: "Governed ML",
      },
      {
        title: "HealthTech industry",
        href: "/industries/healthtech-and-life-sciences",
        description: "Care platforms",
      },
      { title: "Book a call", href: bookHref, description: "Clinical digital" },
    ],
    cta: {
      eyebrow: "HealthTech",
      headline: "Need care software that auditors and clinicians both trust?",
      supporting:
        "Book a session with a principal who has shipped PHI-aware products — not just pitch decks about AI in healthcare.",
      label: "Book a Consultation",
      href: bookHref,
      watermark: "CARE",
    },
    seoTitle: "Meridian Health App Case Study — Satyakabir Technologies",
    seoDescription:
      "HIPAA-ready telehealth and ML triage case study: 2M+ downloads, 4.9★ rating, 62% faster first clinical response.",
  },

  "edusphere-lms": {
    slug: "edusphere-lms",
    name: "EduSphere LMS",
    sector: "EdTech",
    client: "Multi-country learning provider",
    headline: "Adaptive learning for 800,000 students across six countries",
    summary:
      "We built an adaptive LMS with AI tutoring, multilingual delivery, and analytics that finally connected programme spend to learning outcomes — 800K learners, +94% course completion on redesigned paths.",
    challenge:
      "Content was localised by hand, engagement collapsed after week two, and leadership could not prove which programmes worked. Instructors lacked tools; finance lacked evidence.",
    solution:
      "An adaptive learning core with mastery models, AI tutoring under pedagogical guardrails, multilingual delivery pipelines, and analytics that instructors and finance could both trust.",
    engagement: "Platform + analytics partnership",
    duration: "8 months",
    accent: "#FFB048",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80",
    ],
    pills: [
      "Adaptive learning",
      "AI tutoring",
      "Multilingual",
      "Analytics",
      "Accessibility",
      "Mastery paths",
    ],
    stack: [
      "Next.js",
      "Python",
      "Redis",
      "Azure",
      "Postgres",
      "Looker",
      "TensorFlow",
      "Kafka",
    ],
    deliverables: [
      "Learner and instructor web experiences",
      "Adaptive path engine with mastery gates",
      "AI tutor with pedagogical guardrails",
      "Localisation pipeline for six locales",
      "Institutional analytics and export packs",
    ],
    architecture: [
      "Mastery graph separate from content CMS",
      "Tutor suggestions evaluated offline before promote",
      "Event stream into warehouse for instructor + finance views",
      "WCAG-oriented UI with keyboard and screen-reader passes",
    ],
    metrics: [
      { value: "800K", label: "learners" },
      { value: "+94%", label: "course completion*" },
      { value: "6", label: "countries live" },
      { value: "8 mo", label: "to multi-region GA" },
    ],
    pipeline: [
      { step: "Pedagogy", detail: "Mastery model & goals" },
      { step: "Platform", detail: "LMS core & paths" },
      { step: "Tutor", detail: "Guarded AI assist" },
      { step: "Localize", detail: "Six-country delivery" },
      { step: "Prove", detail: "Analytics & GA" },
    ],
    cards: [
      {
        title: "Opaque spend",
        summary: "Programmes could not prove learning impact; engagement died early.",
        meta: "Challenge",
      },
      {
        title: "Mastery core",
        summary: "Adaptive paths and analytics designed with instructors, not around them.",
        meta: "Architecture",
      },
      {
        title: "Guarded AI",
        summary: "Tutoring that helps without inventing unsafe or off-curriculum answers.",
        meta: "Delivery",
      },
      {
        title: "Scale",
        summary: "Six countries live with completion lift on redesigned paths.",
        meta: "Outcome",
      },
    ],
    chapters: [
      {
        label: "01 · Context",
        title: "Growth without proof",
        body: "Headcount of learners rose while completion fell. Localisation was artisanal. Finance asked which courses deserved budget; nobody had a trustworthy answer. Instructors needed intervention tools, not vanity dashboards.",
      },
      {
        label: "02 · Architecture",
        title: "Mastery, content, and insight as layers",
        body: "We separated the mastery graph from CMS content so pedagogy could evolve without CMS rewrites. Events streamed into a warehouse with instructor and finance views. The AI tutor sat behind curriculum constraints and offline evals before any cohort saw new behaviour.",
      },
      {
        label: "03 · Delivery",
        title: "Country waves with instructor partners",
        body: "Each locale wave included instructor councils. Accessibility and keyboard paths were acceptance criteria. Localisation pipelines replaced hand-copy chaos. Analytics definitions were agreed with finance before charts shipped.",
      },
      {
        label: "04 · Safety & integrity",
        title: "Assessment integrity and tutor limits",
        body: "Tutor prompts refused to complete graded work. Assessment modes isolated when required. Student data residency followed country agreements. Abuse and harassment reporting shipped in the learner surface.",
      },
      {
        label: "05 · Outcomes",
        title: "Completion and clarity",
        body: "800K learners across six countries. Redesigned mastery paths showed about +94% completion vs prior comparable courses*. Instructors used intervention queues weekly. Finance finally had programme-level outcome views tied to spend.",
      },
      {
        label: "06 · Transfer",
        title: "Their learning science team extends the graph",
        body: "We transferred authoring tools, eval harnesses, and analytics ownership. Satyakabir remains available for new locales and model upgrades under the same pedagogical gates.",
      },
    ],
    timeline: [
      {
        year: "M1–2",
        title: "Pedagogy & data",
        body: "Mastery model, metric definitions, MVP scope.",
      },
      {
        year: "M3–5",
        title: "LMS core",
        body: "Paths, instructor tools, first locale.",
      },
      {
        year: "M6–7",
        title: "Tutor & analytics",
        body: "Guarded AI, warehouse views.",
      },
      {
        year: "M8",
        title: "Multi-country GA",
        body: "Remaining locales, enablement, handoff.",
      },
    ],
    quote: {
      quote:
        "We finally see which programmes work — and learners stay long enough for mastery to matter.",
      name: "Head of Learning Science",
      role: "Client (composite)",
    },
    faqs: [
      {
        q: "What does +94% completion mean?",
        a: "Lift on redesigned mastery paths vs prior comparable courses in the client's reporting. Cohort definitions are theirs; we label it accordingly.",
      },
      {
        q: "Does the AI tutor write students' answers?",
        a: "No. Guardrails block completing graded work. The tutor scaffolds understanding within curriculum bounds.",
      },
      {
        q: "How do new countries launch?",
        a: "Locale packs, residency review, instructor council, and a gated content pipeline — typically weeks after the core platform is live, not months of reinvention.",
      },
    ],
    relatedServices: [
      {
        title: "Custom Software",
        href: "/services/custom-software",
        description: "Learning platforms",
      },
      {
        title: "AI Development",
        href: "/services/ai-development",
        description: "Guarded tutors",
      },
      {
        title: "EdTech industry",
        href: "/industries/edtech-and-e-learning",
        description: "Education systems",
      },
      { title: "Start a project", href: quoteHref, description: "Scope an LMS" },
    ],
    cta: {
      eyebrow: "EdTech",
      headline: "Building learning systems that must prove outcomes?",
      supporting:
        "Talk to a principal about mastery models, guarded tutoring, and analytics finance will actually fund.",
      label: "Get a Project Quote",
      href: quoteHref,
      watermark: "LEARN",
    },
    seoTitle: "EduSphere LMS Case Study — Satyakabir Technologies",
    seoDescription:
      "Adaptive LMS case study: 800K learners across six countries, AI tutoring, multilingual delivery, +94% completion on redesigned paths.",
  },
};

export function getCaseStudy(slug: string): CaseStudyDetail | undefined {
  return caseStudyDetails[slug];
}

export const caseStudySlugs = Object.keys(caseStudyDetails);
