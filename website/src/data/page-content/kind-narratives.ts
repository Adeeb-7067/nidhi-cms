import type { KindNarrativeMap } from "./types";

const contactHref = "/contact/get-quote";
const careersHref = "/careers/open-positions";
const bookHref = "/contact/book-meeting";

export const kindNarratives: KindNarrativeMap = {
  "ai-neural": {
    highlight: "Production AI — evaluated, governed, and observed from the first release.",
    relatedHints: [
      "/services/machine-learning",
      "/services/llm-solutions",
      "/services/agentic-ai",
      "/services/cloud-engineering",
      "/work/case-studies",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "AI engagement",
      headline: "Ready to put intelligence into production?",
      supporting:
        "Book an AI strategy session with a principal. We leave with a scoped first slice, eval plan, and clear ownership model.",
      label: "Book an AI Strategy Session",
      href: bookHref,
      watermark: "AI",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Problem",
        title: "Why most AI programs stall",
        body: `${title} fails quietly when demos never become durable systems. Notebooks hide latency, cost, and safety risk. Satyakabir designs AI as a product surface: retrieval with access control, agents with approval gates, and evaluation that blocks unsafe releases before users ever see them.`,
      },
      {
        label: "02 · Capability",
        title: "What we actually build",
        body: "LLM platforms, RAG knowledge layers, generative assistants, computer vision pipelines, classical ML for forecasting and classification, and agentic workflows that call tools under policy. Each system ships with tracing, cost ceilings, and human-in-the-loop paths for high-stakes decisions.",
      },
      {
        label: "03 · Approach",
        title: "How delivery works",
        body: summary,
      },
      {
        label: "04 · Outcome",
        title: "What your team owns",
        body: "You leave with a running system, an eval harness your engineers can extend, runbooks for incident response, and operators who understand every token path — not a black-box vendor dependency.",
      },
    ],
    faqs: (title) => [
      {
        q: `What problems does ${title} typically solve first?`,
        a: "High-value knowledge work: search across private corpora, assisted drafting, triage and routing, forecasting from operational data, and agent workflows that reduce repetitive handoffs — always with measurable quality gates.",
      },
      {
        q: "Which model providers and stacks do you support?",
        a: "OpenAI, Anthropic, Google, and open-weight models (Llama, Mistral, and peers) behind a routing layer. Orchestration commonly uses Python/TypeScript with LangChain or custom graphs, Postgres/pgvector or managed vector stores, and OpenTelemetry for traces.",
      },
      {
        q: "How do you keep AI systems safe and auditable?",
        a: "Guardrails on inputs and outputs, ACL-aware retrieval, offline and online evaluations, red-team scenarios for critical paths, and human approval for irreversible actions. Every production path is traceable.",
      },
      {
        q: "How long to a production-ready MVP?",
        a: "Discovery is typically 2–3 weeks. A scoped MVP with evals and monitoring usually ships in 6–10 weeks, then we harden cost, latency, and coverage in continuous waves.",
      },
      {
        q: "Will our data leave our estate?",
        a: "We design for your constraint: private VPC endpoints, self-hosted models, or approved SaaS with contractual controls. Data residency and retention are decided before the first training or retrieval pipeline lands.",
      },
    ],
  },

  "cloud-layers": {
    highlight: "Landing zones operators can run — with FinOps, SRE, and disaster recovery built in.",
    relatedHints: [
      "/services/devops",
      "/technologies/aws",
      "/technologies/azure",
      "/technologies/google-cloud",
      "/services/cyber-security",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Cloud program",
      headline: "Plan a cloud estate that survives real traffic.",
      supporting:
        "We map identity, network, and policy first — then migrate workloads in waves your operators can reverse if needed.",
      label: "Plan Your Cloud Migration",
      href: bookHref,
      watermark: "CLOUD",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Pressure",
        title: "Why cloud estates sprawl",
        body: `${title} programs stall when accounts multiply without identity, network, and policy foundations. Cost becomes opaque. Failover is theoretical. Satyakabir builds cloud platforms as operable products: Terraform-managed landing zones, GitOps delivery, SLOs, and FinOps that tie spend to unit economics.`,
      },
      {
        label: "02 · Capability",
        title: "Architecture we deliver",
        body: "AWS, Azure, and GCP landing zones; Kubernetes platforms; CI/CD and progressive delivery; infrastructure automation; observability with Prometheus/Grafana and cloud-native telemetry; edge and CDN patterns; backup, DR, and chaos drills that prove recovery objectives.",
      },
      {
        label: "03 · Delivery",
        title: "How we sequence risk",
        body: summary,
      },
      {
        label: "04 · Operate",
        title: "What stays after we leave",
        body: "Runbooks, on-call expectations, cost dashboards, and a platform team that can evolve clusters and pipelines without waiting on a vendor ticket.",
      },
    ],
    faqs: () => [
      {
        q: "Which cloud providers do you support?",
        a: "AWS, Microsoft Azure, and Google Cloud — including multi-cloud patterns when exit strategy or regional constraints require it. We standardize with Terraform and policy-as-code so identity and network posture stay coherent.",
      },
      {
        q: "How long does a typical cloud migration take?",
        a: "Foundations (landing zone, identity, networking, observability) usually take 4–8 weeks. Workload migration follows in risk-ordered waves. Legacy mainframes and tightly coupled ERP estates take longer and get their own sequencing plan.",
      },
      {
        q: "Can you migrate legacy systems safely?",
        a: "Yes. We assess coupling, data gravity, and cutover risk; choose rehost, replatform, or rebuild per workload; and keep reverse paths until the new estate proves SLOs under production load.",
      },
      {
        q: "How do you control cloud cost?",
        a: "Budgets and anomaly alerts from day one, right-sizing and reserved/savings plans where they fit, tagging standards, and FinOps reviews that connect spend to product metrics — not only invoice totals.",
      },
      {
        q: "How is security handled in the cloud estate?",
        a: "Least-privilege IAM, network segmentation, secrets management, continuous configuration scanning, and evidence packs for audits. Security gates live in the same pipelines that ship applications.",
      },
    ],
  },

  "security-scan": {
    highlight: "Zero-trust posture with evidence your auditors — and operators — can trust.",
    relatedHints: [
      "/services/cloud-engineering",
      "/services/devops",
      "/services/qa-automation",
      "/company/certifications",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Security engagement",
      headline: "Harden the systems that carry your reputation.",
      supporting:
        "From architecture review to continuous assurance — we tighten identity, detection, and release gates without freezing delivery.",
      label: "Request a Security Review",
      href: contactHref,
      watermark: "SECURE",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Landscape",
        title: "Threats meet delivery pressure",
        body: `${title} only works when security accelerates shipping instead of blocking it. We map assets and trust boundaries, then embed controls in identity, networks, data paths, and CI/CD so risk drops while release cadence holds.`,
      },
      {
        label: "02 · Controls",
        title: "What we put in place",
        body: "Zero-trust access, secrets hygiene, SAST/SCA and policy gates, SIEM-ready telemetry, penetration testing with remediations, and compliance evidence that does not live in spreadsheets.",
      },
      {
        label: "03 · Method",
        title: "How engagements run",
        body: summary,
      },
      {
        label: "04 · Assurance",
        title: "Continuous proof",
        body: "Tabletop exercises, detection tuning, and audit packs your security and engineering leads can defend in a board or regulator conversation.",
      },
    ],
    faqs: () => [
      {
        q: "Do you only run penetration tests?",
        a: "Pentests are one signal. We also design identity and network posture, shift-left controls in pipelines, detection engineering, and remediation programs so findings do not reappear next quarter.",
      },
      {
        q: "Can you work inside our existing SOC tooling?",
        a: "Yes. We integrate with your SIEM, EDR, and ticketing stack, improve signal quality, and write runbooks your on-call team actually uses.",
      },
      {
        q: "How do you balance security with release speed?",
        a: "Automated gates for high-confidence checks, risk-based exceptions with expiry, and security champions embedded in product pods — not a separate queue that stalls every merge.",
      },
      {
        q: "Which frameworks do you align to?",
        a: "We map controls to the frameworks you must satisfy — commonly SOC 2, ISO 27001, HIPAA technical safeguards, and PCI where payments apply — and produce evidence that matches auditor expectations.",
      },
    ],
  },

  "product-lifecycle": {
    highlight: "Product systems with design, engineering, and release discipline in one cadence.",
    relatedHints: [
      "/services/ui-ux-design",
      "/services/web-development",
      "/services/mobile-applications",
      "/services/saas-development",
      "/work/featured-projects",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Product build",
      headline: "Ship a release train your users can trust.",
      supporting:
        "From discovery to weekly slices — with accessibility, performance, and analytics treated as product requirements, not polish.",
      label: "Start a Product Engagement",
      href: contactHref,
      watermark: "SHIP",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Framing",
        title: "Jobs, constraints, and bets",
        body: `${title} succeeds when problem framing is honest. We clarify who the product serves, what must not break, and which bets are worth a release train — then design flows and domain models that stay coherent under change.`,
      },
      {
        label: "02 · Build",
        title: "How we ship",
        body: "Design systems and accessible interfaces; web and mobile clients; API platforms; QA automation; feature flags; and telemetry that feeds the backlog. Vertical slices land weekly so stakeholders see working software, not slideware.",
      },
      {
        label: "03 · Scope",
        title: "What this page covers",
        body: summary,
      },
      {
        label: "04 · Continuity",
        title: "After launch",
        body: "You own the codebase, design tokens, and release process. We can stay embedded for scale or transfer fully — either way, the system is operable without us in the critical path.",
      },
    ],
    faqs: (title) => [
      {
        q: `What does a ${title} engagement include?`,
        a: "Discovery, UX and architecture, implementation, automated quality gates, and a handover that includes ADRs, runbooks, and training for your team.",
      },
      {
        q: "Do you work with our designers and PMs?",
        a: "Preferentially. Shared rituals, shared backlog, and shared definition of done — we embed rather than throw requirements over a wall.",
      },
      {
        q: "How do you handle mobile and web together?",
        a: "Shared domain APIs and design language where it helps; platform-native choices where users feel the difference. One quality bar for performance, accessibility, and release discipline.",
      },
      {
        q: "Typical timeline to MVP?",
        a: "Most MVPs land in 6–12 weeks after a short discovery, depending on integrations and regulated data requirements.",
      },
    ],
  },

  "healthcare-soft": {
    highlight: "Clinical workflows, patient surfaces, and HIPAA-aligned architecture — without friction theatre.",
    relatedHints: [
      "/services/cyber-security",
      "/services/cloud-engineering",
      "/solutions/healthcare",
      "/industries/healthcare",
      "/work/case-studies",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Healthcare program",
      headline: "Modernize the platforms clinicians and patients rely on.",
      supporting:
        "Patient portals, telehealth, EMR/EHR interop, and care-ops tooling — designed with PHI controls and clinical reality in mind.",
      label: "Modernize Your Healthcare Platform",
      href: bookHref,
      watermark: "CARE",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Care reality",
        title: "Clinical work is not a happy path",
        body: `${title} must survive interrupted sessions, incomplete data, and high-stakes decisions. We design for clinicians under load and patients under stress — calm interfaces, clear states, and workflows that match how care actually happens.`,
      },
      {
        label: "02 · Systems",
        title: "What we implement",
        body: "Patient portals and engagement apps, telemedicine experiences, EMR/EHR integration via FHIR/HL7, care-ops dashboards, healthcare analytics, and cloud architectures with encryption, consent, and audit trails for PHI.",
      },
      {
        label: "03 · Program",
        title: "How we engage",
        body: summary,
      },
      {
        label: "04 · Trust",
        title: "Compliance as architecture",
        body: "HIPAA-aligned patterns, least-privilege access, audit logging, and evidence packs. Security is not a final checklist — it shapes data models and deployment topology from day one.",
      },
    ],
    faqs: () => [
      {
        q: "Do you build HIPAA-ready systems?",
        a: "We design to HIPAA technical and administrative safeguard patterns: encryption in transit and at rest, access control, audit logging, BAAs with subprocessors where required, and operational runbooks for incident response.",
      },
      {
        q: "Can you integrate with existing EMR/EHR systems?",
        a: "Yes. FHIR and HL7 bridges are common. We map identities, consent, and clinical events carefully so interoperability does not become a silent data-quality problem.",
      },
      {
        q: "What about telemedicine and patient apps?",
        a: "We build video and messaging experiences with clinical workflow around them — scheduling, documentation hooks, and accessibility — not standalone video widgets.",
      },
      {
        q: "How do you involve clinical stakeholders?",
        a: "Shadowing and structured interviews early, prototype reviews with real workflows, and metrics that matter to care teams — not only engagement vanity charts.",
      },
    ],
  },

  "education-notebook": {
    highlight: "Learning platforms with curriculum clarity, labs, and measurable mastery — not content dumps.",
    relatedHints: [
      "/solutions/education",
      "/industries/education",
      "/services/product-engineering",
      "/careers/internships",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Learning systems",
      headline: "Build a learning experience students finish.",
      supporting:
        "LMS platforms, assessments, labs, and mentor workflows designed for institutions and enterprise L&D alike.",
      label: "Discuss Your Learning Platform",
      href: bookHref,
      watermark: "LEARN",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Learners",
        title: "Motivation is a product problem",
        body: `${title} works when outcomes are visible. We design paths with mastery gates, practice environments, and feedback loops — so learners, instructors, and operators share one progress model.`,
      },
      {
        label: "02 · Platform",
        title: "Capabilities we ship",
        body: "Curriculum authoring, cohort delivery, assessments, virtual labs, mentorship tooling, analytics for institutions, and mobile access that holds up on constrained networks.",
      },
      {
        label: "03 · Delivery",
        title: "Engagement shape",
        body: summary,
      },
      {
        label: "04 · Scale",
        title: "From pilot to institution",
        body: "Multi-tenant patterns, localization, and reporting that administrators can defend to boards and accreditation bodies.",
      },
    ],
    faqs: () => [
      {
        q: "Do you build full LMS platforms or extend existing ones?",
        a: "Both. We greenfield when the product is the differentiator, and integrate or extend when you already standardize on an institutional LMS.",
      },
      {
        q: "How do assessments and integrity work?",
        a: "Configurable assessment types, proctoring integrations where required, and analytics that surface struggle patterns early — without treating every learner as adversarial.",
      },
      {
        q: "Can you support labs for technical curricula?",
        a: "Yes. Sandboxed environments, starter repos, and automated checks that give fast feedback while keeping costs predictable.",
      },
    ],
  },

  "finance-ledger": {
    highlight: "Ledgers, risk, and operational systems with auditability as a first-class requirement.",
    relatedHints: [
      "/solutions/erp",
      "/solutions/crm",
      "/solutions/finance",
      "/industries/finance",
      "/services/cyber-security",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Finance systems",
      headline: "Close faster with systems auditors can follow.",
      supporting:
        "Core finance, CRM, ERP, and risk workflows — designed so reconciliation, controls, and reporting stay coherent as you scale.",
      label: "Talk Finance Systems",
      href: bookHref,
      watermark: "LEDGER",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Stakes",
        title: "Money movement demands proof",
        body: `${title} is only useful when numbers reconcile and decisions explain themselves. We model domains with immutable event history, clear control points, and exception queues humans can clear under pressure.`,
      },
      {
        label: "02 · Systems",
        title: "What we deliver",
        body: "Ledger and finance automation, CRM and customer memory, ERP and operations backbones, KYC/AML-friendly workflows, fraud and risk signals, partner payment integrations, and reporting packs for controllers and regulators.",
      },
      {
        label: "03 · Method",
        title: "How we engage",
        body: summary,
      },
      {
        label: "04 · Control",
        title: "Operate and prove",
        body: "Reconciliation rituals, audit evidence, and APIs that let partners and internal tools extend the system without breaking the ledger’s integrity.",
      },
    ],
    faqs: () => [
      {
        q: "Do you replace our ERP/CRM or integrate?",
        a: "Whichever reduces risk. We often integrate and automate around systems of record first, then replace modules when the business case and data migration path are clear.",
      },
      {
        q: "How do you handle compliance and audit?",
        a: "Immutable histories where required, role-based access, approval workflows, and exportable evidence. We design for the audits you already face — not generic checkbox compliance.",
      },
      {
        q: "Can you connect payment and banking partners?",
        a: "Yes. We wrap rails and KYC providers behind clean APIs with retries, reconciliation, and operational dashboards for exceptions.",
      },
    ],
  },

  "industry-atlas": {
    highlight: "Domain-fluent engineering for regulated and high-growth markets.",
    relatedHints: [
      "/services/ai-development",
      "/services/cloud-engineering",
      "/services/cyber-security",
      "/work/case-studies",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Industry program",
      headline: "Build with people who speak your domain.",
      supporting:
        "We map regulatory constraints and operating reality first — then sequence platforms that your teams can actually run.",
      label: "Explore an Industry Engagement",
      href: bookHref,
      watermark: "ATLAS",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Market",
        title: "Pressure specific to this sector",
        body: `${title} has its own audit language, peak-load patterns, and failure modes. We start by mapping those constraints so architecture choices are defensible — not generic cloud slides with industry stickers.`,
      },
      {
        label: "02 · Capabilities",
        title: "What we typically deliver",
        body: "Domain product engineering, cloud and data platforms, security and compliance posture, and AI-assisted workflows only where they create measurable leverage for operators and customers.",
      },
      {
        label: "03 · Overview",
        title: "For this industry",
        body: summary,
      },
      {
        label: "04 · Scale",
        title: "Playbooks that travel",
        body: "Reference architectures, change programs, and enablement so the next market or business unit inherits what worked — instead of starting from zero.",
      },
    ],
    faqs: (title) => [
      {
        q: `Have you delivered in ${title.toLowerCase()} before?`,
        a: "We staff pods with domain experience and reuse proven patterns for regulated data, peak traffic, and operator tooling. Discovery validates what transfers and what must be invented for your estate.",
      },
      {
        q: "How do you handle industry regulations?",
        a: "Controls are designed into identity, data, and release processes up front. We produce evidence packs aligned to the frameworks your auditors and customers require.",
      },
      {
        q: "Can you work with our incumbent vendors?",
        a: "Yes. We integrate, wrap, or selectively replace — based on risk and total cost of ownership, not ideology.",
      },
    ],
  },

  "company-manifesto": {
    highlight: "Precision, imagination, and systems that outlast the quarter they ship.",
    relatedHints: [
      "/company/our-story",
      "/company/leadership",
      "/company/culture",
      "/careers/why-join-us",
      "/work/featured-projects",
      "/contact/contact-us",
    ],
    cta: {
      eyebrow: "Company",
      headline: "Meet the people behind the platforms.",
      supporting:
        "Talk with a principal about how we partner — or explore open roles if you want to build here.",
      label: "Talk to Our Team",
      href: "/contact/contact-us",
      watermark: "SK",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Page",
        title: title,
        body: summary,
      },
      {
        label: "02 · Practice",
        title: "Principal-led delivery",
        body: "Architecture Decision Records, security and observability as default gates, and pods accountable to outcomes.",
      },
      {
        label: "03 · Transfer",
        title: "Clients keep the keys",
        body: "Knowledge transfer designed so client teams inherit clarity — not dependency.",
      },
    ],
    faqs: () => [
      {
        q: "Where is Satyakabir based?",
        a: "Bengaluru is our headquarters gravity, with remote-capable pods that deliver across time zones for global clients.",
      },
      {
        q: "What kinds of clients do you work with?",
        a: "Product companies, enterprises modernizing platforms, and regulated organizations that need AI, cloud, and product engineering with auditability.",
      },
      {
        q: "How are engagements structured?",
        a: "Discovery and architecture thesis first, then scoped shipping slices with clear ownership. Long-term embeds are available when roadmap continuity matters.",
      },
    ],
  },

  "tech-ecosystem": {
    highlight: "Primitives chosen for longevity — typed boundaries, observed by default.",
    relatedHints: [
      "/technologies/react",
      "/technologies/next-js",
      "/technologies/python",
      "/technologies/aws",
      "/services/product-engineering",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Technology",
      headline: "Put this stack to work on a real problem.",
      supporting:
        "We do not sell tools in isolation. Tell us the product constraint — we will show how this technology earns its place.",
      label: "Discuss a Build with This Stack",
      href: contactHref,
      watermark: "STACK",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Fit",
        title: `When ${title} is the right call`,
        body: `${title} earns a place in our stack when it reduces operational risk or unlocks a product capability we cannot get elsewhere with equal clarity. We document trade-offs so future teams inherit the decision, not the hype.`,
      },
      {
        label: "02 · Practice",
        title: "How we use it in production",
        body: summary,
      },
      {
        label: "03 · Standards",
        title: "How we keep estates coherent",
        body: "Templates, linting and type gates, CI defaults, observability baselines, and deprecation paths. Polyglot is fine; uncontrolled sprawl is not.",
      },
      {
        label: "04 · Evolve",
        title: "Changing course without trauma",
        body: "We design seams and exit ramps so the organization can adopt the next primitive without rewriting the business.",
      },
    ],
    faqs: (title) => [
      {
        q: `Do you staff engineers experienced in ${title}?`,
        a: "Yes. Engagements are staffed with practitioners who have shipped this technology under production load — not resume-keyword generalists.",
      },
      {
        q: "Will you lock us into this stack forever?",
        a: "No. We choose for fit and document alternatives. Exit strategies and modular boundaries are part of the architecture thesis.",
      },
      {
        q: "Can you train our team on this technology?",
        a: "Enablement is built into delivery: pairing, ADRs, workshops, and runbooks so your team can extend the system after we leave.",
      },
    ],
  },

  "solutions-blueprint": {
    highlight: "Intake → blueprint → build → operate — transformation that lands in production.",
    relatedHints: [
      "/services/digital-transformation",
      "/services/technology-consulting",
      "/services/cloud-engineering",
      "/work/case-studies",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Solutions",
      headline: "Turn a strategy deck into a shipping program.",
      supporting:
        "We connect ambition to architecture, sequence value slices, and leave your operators in control.",
      label: "Start a Solutions Conversation",
      href: bookHref,
      watermark: "BUILD",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Intake",
        title: "Ambition with constraints",
        body: `${title} programs fail when strategy ignores operating reality. We frame outcomes, constraints, and non-negotiables with the people who will run the system — then write a blueprint leadership can fund.`,
      },
      {
        label: "02 · Blueprint",
        title: "Architecture you can execute",
        body: "Capability maps, target architecture, migration sequencing, risk registers, and OKRs tied to delivery waves — not a binder that dies in a shared drive.",
      },
      {
        label: "03 · Context",
        title: "This solution",
        body: summary,
      },
      {
        label: "04 · Transfer",
        title: "Operate without us",
        body: "Enablement kits, runbooks, and ownership transfer so the program compounds inside your organization.",
      },
    ],
    faqs: () => [
      {
        q: "Is this consulting or implementation?",
        a: "Both, on purpose. The same principals who write the blueprint stay accountable through build and handover — strategy without orphan recommendations.",
      },
      {
        q: "How do you measure success?",
        a: "OKRs agreed up front: cycle time, reliability, cost, adoption, or revenue outcomes — depending on the program. We report against those, not vanity activity metrics.",
      },
      {
        q: "Can you work alongside our SI or internal IT?",
        a: "Yes. Clear RACI, shared rituals, and architecture ownership that prevents duplicate platforms and silent divergence.",
      },
    ],
  },

  "careers-journey": {
    highlight: "Craft interviews, studio culture, and roles that ship from week one.",
    relatedHints: [
      "/careers/open-positions",
      "/careers/benefits",
      "/careers/hiring-process",
      "/careers/internships",
      "/company/culture",
      "/contact/contact-us",
    ],
    cta: {
      eyebrow: "Careers",
      headline: "Build with a team that still ships.",
      supporting:
        "Explore open roles, apprenticeships, and a hiring process designed to evaluate craft — not trivia.",
      label: "Join Our Engineering Team",
      href: careersHref,
      watermark: "JOIN",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Belonging",
        title: title,
        body: summary,
      },
      {
        label: "02 · Craft",
        title: "How we hire",
        body: "Show the work. Deep craft conversations. A studio session with the people you would ship with. Clear offers — no opaque loops.",
      },
      {
        label: "03 · Rhythm",
        title: "How we work",
        body: "Remote-capable pods with Bengaluru HQ gravity. Shared ownership of outcomes. Mentorship that shows up in code review and architecture, not slogans.",
      },
      {
        label: "04 · Growth",
        title: "How you level up",
        body: "Hard problems, principal access, and room to specialize in AI, platform, product, or design — with feedback that is specific enough to act on.",
      },
    ],
    faqs: () => [
      {
        q: "Do you hire remotely?",
        a: "Yes — remote-capable roles with intentional overlap hours. Some engagements and rituals center on Bengaluru HQ.",
      },
      {
        q: "What does the hiring process look like?",
        a: "Application and portfolio review, a craft interview, a collaborative studio session, and a clear decision. We respect your time and avoid endless panel theatre.",
      },
      {
        q: "Do you offer internships?",
        a: "Yes. Structured internships with real shipping responsibility, mentorship, and a path to full-time roles for strong performers.",
      },
      {
        q: "What benefits matter most?",
        a: "Competitive compensation, learning budget, equipment, health coverage appropriate to location, and time to do deep work. Details vary by role and region — ask recruiters for the current package.",
      },
    ],
  },

  "contact-signal": {
    highlight: "Principals respond within one business day — with a clear next step, not a brochure.",
    relatedHints: [
      "/contact/get-quote",
      "/contact/book-meeting",
      "/contact/office-locations",
      "/contact/support",
      "/services/ai-development",
      "/work/case-studies",
    ],
    cta: {
      eyebrow: "Contact",
      headline: "Tell us what you are trying to change.",
      supporting:
        "Share context, constraints, and timing. A principal will respond with questions that matter — and a proposed first conversation.",
      label: "Talk to Our Experts",
      href: contactHref,
      watermark: "HELLO",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Reach",
        title: title,
        body: summary,
      },
      {
        label: "02 · Prepare",
        title: "What helps us help you",
        body: "A short description of the problem, current systems, success metrics, and any hard deadlines or compliance constraints. Rough is fine — clarity beats polish.",
      },
      {
        label: "03 · Respond",
        title: "What happens next",
        body: "A principal replies within one business day. If there is fit, we schedule a working conversation and leave you with a written thesis for the first slice.",
      },
      {
        label: "04 · Begin",
        title: "Kickoff without fog",
        body: "Scoped outcomes, named owners, and rituals. No anonymous ticket queues between you and the people building.",
      },
    ],
    faqs: () => [
      {
        q: "How fast do you respond?",
        a: "Within one business day for new project and partnership inquiries. Support channels follow the SLAs defined for active clients.",
      },
      {
        q: "Who will I speak with?",
        a: "A principal or practice lead — not a scripted SDR. Technical conversations stay technical.",
      },
      {
        q: "Can I request a fixed-scope quote?",
        a: "Yes. Use Get Quote with as much context as you can. We may propose a short discovery if risk is too high to price honestly up front.",
      },
    ],
  },

  "insights-editorial": {
    highlight: "Field notes from shipping intelligent systems — written for operators, not for vanity SEO.",
    relatedHints: [
      "/insights/blog",
      "/insights/research",
      "/insights/whitepapers",
      "/work/case-studies",
      "/contact/book-meeting",
    ],
    cta: {
      eyebrow: "Insights",
      headline: "Take the idea into a working conversation.",
      supporting:
        "If an essay maps to a problem on your roadmap, book a session — we will pressure-test it against your estate.",
      label: "Book a Working Session",
      href: bookHref,
      watermark: "NOTES",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Signal",
        title: title,
        body: summary,
      },
      {
        label: "02 · Method",
        title: "How we write",
        body: "Observations from delivery, distilled into patterns your architects and product leaders can apply. Opinionated on purpose — always actionable.",
      },
      {
        label: "03 · Library",
        title: "What you will find",
        body: "Architecture essays, AI and cloud playbooks, briefings for busy principals, and case narratives with enough technical context to be useful.",
      },
      {
        label: "04 · Practice",
        title: "From reading to shipping",
        body: "Every insight should earn a next step: a spike, an ADR, or a conversation with the people who will own the outcome.",
      },
    ],
    faqs: () => [
      {
        q: "Who is the audience?",
        a: "Engineering leaders, architects, product principals, and operators making platform decisions — not beginners hunting definitions.",
      },
      {
        q: "Can we republish or cite your material?",
        a: "Contact us for permissions. We generally support attribution-friendly sharing of public essays.",
      },
      {
        q: "Do you accept guest contributions?",
        a: "Occasionally, when the draft shows production scars and a clear thesis. Pitch via the contact channels.",
      },
    ],
  },

  "work-gallery": {
    highlight: "Selected systems from the floor — problem, architecture, delivery, and measured outcome.",
    relatedHints: [
      "/work/case-studies",
      "/work/featured-projects",
      "/services/ai-development",
      "/services/cloud-engineering",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Work",
      headline: "Want outcomes like these on your roadmap?",
      supporting:
        "Share the pressure you are under. We will tell you honestly whether we are the right team — and what a first slice should prove.",
      label: "Start a Project Conversation",
      href: contactHref,
      watermark: "WORK",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Brief",
        title: "The pressure",
        body: `${title} begins with a real constraint: scale, trust, compliance, or time-to-value. We document the stakes so architecture choices stay honest.`,
      },
      {
        label: "02 · Architecture",
        title: "The bets we made",
        body: "Clear boundaries, observable seams, and security controls appropriate to the domain. Decisions are written so the client team inherits the why.",
      },
      {
        label: "03 · Narrative",
        title: "What shipped",
        body: summary,
      },
      {
        label: "04 · Outcome",
        title: "What moved",
        body: "Metrics where we can share them, qualitative change for operators, and ownership transferred so the system keeps improving after launch.",
      },
    ],
    faqs: () => [
      {
        q: "Are metrics on case studies verified?",
        a: "Where clients allow publication, we report outcomes from the engagement. Some figures are client-reported; we label estimates when precise audit data cannot be shared.",
      },
      {
        q: "Can you share deeper technical write-ups?",
        a: "Under NDA, yes. Public pages stay at a level that respects client confidentiality.",
      },
      {
        q: "Do you take rescue projects?",
        a: "Yes — stabilize, instrument, and re-sequence delivery when an estate is under pressure.",
      },
    ],
  },

  "default-atelier": {
    highlight: "Crafted systems — observed, governed, and owned by the people who run them.",
    relatedHints: [
      "/services/ai-development",
      "/services/cloud-engineering",
      "/work/case-studies",
      "/contact/get-quote",
    ],
    cta: {
      eyebrow: "Next step",
      headline: "Ready when you are.",
      supporting:
        "Share the ambition and constraints. A principal responds within one business day with a clear next step.",
      label: "Start Your Project",
      href: contactHref,
      watermark: "BUILD",
    },
    chapters: (title, summary) => [
      {
        label: "01 · Context",
        title: `Why ${title} matters`,
        body: `${title} at Satyakabir is treated as a living system — observed, governed, and designed for the people who run it when it matters most.`,
      },
      {
        label: "02 · Craft",
        title: "How we build",
        body: "Discovery, architecture, build, and enablement as one program — with security, performance, and design gates in every slice.",
      },
      {
        label: "03 · Focus",
        title: "This engagement",
        body: summary,
      },
      {
        label: "04 · Horizon",
        title: "What you keep",
        body: "Operators who understand the system, documentation that survives handoff, and a path to evolve without vendor lock-in.",
      },
    ],
    faqs: (title) => [
      {
        q: `How do engagements for ${title} usually start?`,
        a: "A principal-led discovery, a written architecture thesis, and a scoped first shipping slice — usually framed within two weeks.",
      },
      {
        q: "Do you embed with our team?",
        a: "Yes. Shared rituals, shared metrics, and shared ownership of outcomes are the default.",
      },
      {
        q: "What does success look like?",
        a: "Measurable outcomes, transfer of ownership, and a system your team can evolve without us in the room.",
      },
    ],
  },
};
