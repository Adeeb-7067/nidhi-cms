import type { PageComposition } from "./types";

const img = {
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80",
  team: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80",
  meeting: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80",
  city: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1800&q=80",
  lab: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1800&q=80",
  collab: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1400&q=80",
  portrait: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80",
  portrait2: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
  portrait3: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
  servers: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80",
  award: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1400&q=80",
};

/**
 * Company leaves — each page owns its body copy in composition props.
 * Do not rely on kind-default cards / pipeline / "What defines us" blocks.
 */
export const companyCompositions: Record<string, PageComposition> = {
  "about-us": {
    motion: "editorial",
    sections: [
      { id: "hero-manifesto", props: { image: img.office } },
      {
        id: "highlight-band",
        props: {
          layout: "split-text",
          title: "An engineering company, not a staffing bench",
          body: "Satyakabir Technologies builds AI, cloud, and product platforms from Bengaluru — principal-led pods that transfer ownership, not dependency.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "How the company took shape",
          eyebrow: "About",
          timeline: [
            { year: "Origins", title: "Built on shipping", body: "Formed around engineers who wanted accountability for outcomes — not anonymous capacity." },
            { year: "Shift", title: "AI became a product surface", body: "Evaluation, governance, and observability so intelligence could ship like any other service." },
            { year: "Today", title: "HQ craft, global delivery", body: "Bengaluru gravity with remote-capable pods and standards that travel with every engagement." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "bento",
          title: "What Satyakabir is known for",
          cards: [
            { title: "AI-first platforms", summary: "Production LLM, ML, and agent systems with evals and cost control.", meta: "Intelligence" },
            { title: "Cloud estates", summary: "Landing zones, Kubernetes, and observability operators can run.", meta: "Platform" },
            { title: "Product engineering", summary: "Web, mobile, and SaaS surfaces with design systems that last.", meta: "Product" },
            { title: "Assurance", summary: "Security and quality gates that travel with the release, not after.", meta: "Trust" },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "stack",
          title: "Non-negotiables in every engagement",
          values: [
            { title: "Operability", body: "Someone runs this at 2 a.m. Runbooks and observability ship with the feature." },
            { title: "Honest scope", body: "We decline theatre. Better an early no than a doomed yes." },
            { title: "Transfer", body: "Clients keep the keys — ADRs, pairing, and operators who understand the system." },
          ],
        },
      },
      {
        id: "metrics",
        props: {
          layout: "compact",
        },
      },
      { id: "gallery", props: { title: "Where the work happens", images: [img.office, img.lab, img.collab] } },
      {
        id: "link-band",
        props: {
          title: "Keep reading",
          links: [
            { title: "Our Story", href: "/company/our-story", description: "Roots to global delivery" },
            { title: "Leadership", href: "/company/leadership", description: "Principals who still ship" },
            { title: "Culture", href: "/company/culture", description: "Craft standards day to day" },
            { title: "Careers", href: "/careers/why-join-us", description: "Join a shipping pod" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  "our-story": {
    motion: "timeline",
    sections: [
      { id: "hero-editorial", props: { image: img.city } },
      {
        id: "timeline",
        props: {
          title: "Four chapters of the company",
          eyebrow: "Our story",
          timeline: [
            { year: "01", title: "Roots in craft", body: "Early years shaped by hard systems, clear ownership, and little patience for slideware." },
            { year: "02", title: "Bengaluru as HQ", body: "Headquarters became the craft center for hiring, architecture reviews, and apprenticeship." },
            { year: "03", title: "AI platforms arrive", body: "Production AI — evals, RAG, agents — joined cloud and product as a defining practice." },
            { year: "04", title: "Global delivery", body: "Distributed pods with intentional overlap; documentation defeating distance." },
          ],
        },
      },
      {
        id: "highlight-band",
        props: {
          layout: "pull",
          title: "A story written in production systems",
          body: "We still measure history by what clients can operate after we leave — not by launch-week applause.",
        },
      },
      {
        id: "cards",
        props: {
          layout: "rail",
          title: "Turning points that still shape us",
          cards: [
            { title: "Ownership over augmentation", summary: "We stopped selling anonymous capacity and started selling accountable outcomes.", meta: "Model" },
            { title: "Production AI bar", summary: "Demos without evals and observability stopped counting as delivery.", meta: "AI" },
            { title: "HQ rituals", summary: "Bengaluru reviews and apprenticeships became the quality spine for remote pods.", meta: "HQ" },
            { title: "Client inheritance", summary: "Success means operators who can evolve the system without us.", meta: "Exit" },
          ],
        },
      },
      { id: "gallery", props: { title: "Places in the story", images: [img.city, img.office, img.meeting] } },
      { id: "cta" },
      { id: "related" },
    ],
  },

  mission: {
    motion: "editorial",
    sections: [
      { id: "hero-editorial" },
      {
        id: "quote-band",
        props: {
          quotes: [
            {
              quote: "Software that feels inevitable once it exists — intelligent, operable, and humane.",
              name: "Mission",
              role: "Satyakabir Technologies",
            },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "pair",
          title: "How the mission shows up in delivery",
          values: [
            { title: "Clarity over novelty", body: "Fitness for the job beats trend-chasing architecture." },
            { title: "Operable by default", body: "Observability and runbooks are part of the mission — not extras." },
            { title: "Humane systems", body: "Automation that reduces burden instead of shifting chaos onto staff." },
            { title: "Say what will not work", body: "Trust is the long game — including the hard conversations." },
          ],
        },
      },
      {
        id: "highlight-band",
        props: {
          layout: "center",
          title: "Mission is a filter, not a poster",
          body: "It decides which engagements we take, which shortcuts we refuse, and how we define done.",
        },
      },
      {
        id: "link-band",
        props: {
          title: "Related",
          links: [
            { title: "Vision", href: "/company/vision", description: "Where we are headed" },
            { title: "About us", href: "/company/about-us", description: "Who we are" },
            { title: "Work", href: "/work/featured-projects", description: "Proof in systems" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  vision: {
    motion: "network",
    sections: [
      {
        id: "hero-media",
        props: {
          image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=80",
        },
      },
      {
        id: "highlight-band",
        props: {
          layout: "display",
          title: "Intelligent infrastructure as a default",
          body: "Organizations where AI, cloud platforms, and product surfaces are observable, governed, and owned by the teams who run them.",
        },
      },
      {
        id: "cards",
        props: {
          layout: "split",
          title: "What that future looks like",
          body: "Not a slide about AI — a daily operating reality.",
          cards: [
            { title: "Intelligence without drama", summary: "AI as dependable as any other production service — evaluated and observed.", meta: "AI" },
            { title: "Platforms that compound", summary: "Landing zones and data paths that get stronger with each wave.", meta: "Cloud" },
            { title: "Clients keep the keys", summary: "We succeed when your team can evolve the system without us.", meta: "Ownership" },
            { title: "Standards rise together", summary: "Security, accessibility, and operability as defaults — not upgrades.", meta: "Bar" },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "columns",
          title: "Bets we are making",
          values: [
            { title: "Eval-native AI", body: "No unauditable path to production for high-stakes decisions." },
            { title: "Platform literacy", body: "Every product team inherits cloud and data discipline." },
            { title: "Transfer as product", body: "Enablement is designed like a feature — not a PDF at the end." },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  leadership: {
    motion: "portraits",
    sections: [
      { id: "hero-split", props: { image: img.meeting } },
      {
        id: "quote-band",
        props: {
          quotes: [
            {
              quote: "Authority follows accountability. Leaders own architecture quality, delivery health, and client trust — not insulation from the work.",
              name: "Leadership principle",
              role: "How we run",
            },
          ],
        },
      },
      {
        id: "team-grid",
        props: {
          title: "Principals close to the work",
          eyebrow: "Leadership",
          team: [
            { name: "Practice leads", role: "Architecture & delivery", blurb: "Stay on programs through build and handover — reachable by clients.", image: img.portrait },
            { name: "Domain principals", role: "AI · Cloud · Product", blurb: "Set craft standards and mentor through review, not slogans.", image: img.portrait2 },
            { name: "Client partners", role: "Outcomes", blurb: "Single-threaded ownership so decisions never hide in layers.", image: img.portrait3 },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "stack",
          title: "What leadership is accountable for",
          values: [
            { title: "Architecture quality", body: "Hard reviews and ADRs — not delegated slide decks." },
            { title: "Client access", body: "You can reach the people making decisions about your system." },
            { title: "Growing principals", body: "Mentorship so craft leadership scales beyond a few names." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "index",
          title: "How leadership shows up on a program",
          cards: [
            { title: "Kickoff in the room", summary: "Principals frame ambition, constraints, and non-negotiables with you.", meta: "01" },
            { title: "Architecture thesis", summary: "Written decisions clients can challenge and inherit.", meta: "02" },
            { title: "Delivery health", summary: "Metrics and risk called early — not buried in status theatre.", meta: "03" },
            { title: "Handover ownership", summary: "Operators and docs leave with the client, not with us.", meta: "04" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  "our-team": {
    motion: "portraits",
    sections: [
      { id: "hero-media", props: { image: img.team } },
      {
        id: "highlight-band",
        props: {
          layout: "flush",
          title: "Builders across AI, platform, product, and design",
          body: "Cross-functional pods ship together — with a shared definition of done, not departments throwing tickets.",
        },
      },
      {
        id: "team-grid",
        props: {
          title: "Who sits in a typical pod",
          team: [
            { name: "Platform & cloud", role: "Engineering", blurb: "Landing zones, Kubernetes, reliability.", image: img.portrait },
            { name: "AI systems", role: "Intelligence", blurb: "Evals, agents, and production ML.", image: img.portrait2 },
            { name: "Product & design", role: "Experience", blurb: "Systems, motion, and accessibility.", image: img.portrait3 },
            { name: "Assurance", role: "Quality & security", blurb: "Gates that make releases trustworthy.", image: img.meeting },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "bento",
          title: "How the team is measured",
          cards: [
            { title: "Craft interviews", summary: "Hire for demonstrated work and collaborative problem-solving.", meta: "Bar" },
            { title: "Hard problems as curriculum", summary: "Mentorship through real systems, not generic training decks.", meta: "Growth" },
            { title: "One team with clients", summary: "Embedded rituals and shared metrics — no anonymous bench.", meta: "Delivery" },
            { title: "Specialists who collaborate", summary: "AI, cloud, product, and design staffed as one pod.", meta: "Mix" },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Join the team",
          links: [
            { title: "Open positions", href: "/careers/open-positions", description: "Roles that ship" },
            { title: "Hiring process", href: "/careers/hiring-process", description: "Craft interviews" },
            { title: "Internships", href: "/careers/internships", description: "Apprenticeship paths" },
            { title: "Leadership", href: "/company/leadership", description: "Principals close to the work" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  culture: {
    motion: "gallery",
    sections: [
      { id: "hero-media", props: { image: img.collab } },
      {
        id: "highlight-band",
        props: {
          layout: "pull",
          title: "Craft. Clarity. Shared ownership.",
          body: "Write things down. Review seriously. Tell the truth about risk. Measure success by operable outcomes.",
        },
      },
      {
        id: "cards",
        props: {
          layout: "rail",
          title: "Behaviors you will see in a week here",
          cards: [
            { title: "The last 5%", summary: "Accessibility, observability, and edge cases are pride — not leftovers.", meta: "Craft" },
            { title: "Write the decision", summary: "ADRs beat tribal knowledge when stakes are high.", meta: "Clarity" },
            { title: "Outcomes over theatre", summary: "Status is working software and honest risk — not slide volume.", meta: "Ownership" },
            { title: "Direct communication", summary: "Clients, users, and teammates get the truth early.", meta: "Respect" },
          ],
        },
      },
      { id: "gallery", props: { title: "Studio life", images: [img.collab, img.lab, img.office, img.team] } },
      {
        id: "quote-band",
        props: {
          quotes: [
            {
              quote: "Culture is what you tolerate in review — and what you celebrate when a system stays calm under load.",
              name: "Studio standard",
              role: "Satyakabir",
            },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Feel it from the inside",
          links: [
            { title: "Life at Satyakabir", href: "/company/life-at-satyakabir", description: "Rituals & rhythm" },
            { title: "Benefits", href: "/careers/benefits", description: "Support for craft" },
            { title: "Why join us", href: "/careers/why-join-us", description: "Who thrives here" },
            { title: "Open positions", href: "/careers/open-positions", description: "Roles open now" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  "life-at-satyakabir": {
    motion: "gallery",
    sections: [
      { id: "hero-media", props: { image: img.office } },
      {
        id: "highlight-band",
        props: {
          layout: "split-text",
          title: "Rituals, remote pods, and HQ gravity",
          body: "Deep work protected, studio critiques that sharpen craft, and Bengaluru as the center of gravity for distributed delivery.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "A week in the studio",
          eyebrow: "Life here",
          timeline: [
            { year: "Focus", title: "Deep work blocks", body: "Fewer performative meetings. Pairing and review where it changes the work." },
            { year: "Studio", title: "Critique sessions", body: "Design and architecture reviews — blunt and kind." },
            { year: "Connect", title: "Overlap hours", body: "Distributed collaborators sync on purpose, not all-day Zoom." },
            { year: "Share", title: "Learn in public", body: "Internal talks, postmortems, and playbooks." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "split",
          title: "What a week protects",
          body: "Life here is designed around shipping — not around looking busy.",
          cards: [
            { title: "Craft time", summary: "Calendars leave room for building, not only reporting.", meta: "Time" },
            { title: "Belonging", summary: "Remote-capable without becoming anonymous.", meta: "People" },
            { title: "Growth", summary: "Hard problems as curriculum — with mentors in the review.", meta: "Learning" },
            { title: "HQ optionality", summary: "Bengaluru gravity when the work needs the room.", meta: "Place" },
          ],
        },
      },
      { id: "gallery", props: { title: "HQ & pods", images: [img.office, img.team, img.city, img.collab] } },
      {
        id: "link-band",
        props: {
          title: "Step inside",
          links: [
            { title: "Open positions", href: "/careers/open-positions", description: "Roles that ship" },
            { title: "Culture", href: "/company/culture", description: "Standards we live by" },
            { title: "Benefits", href: "/careers/benefits", description: "Support for craft" },
            { title: "Hiring process", href: "/careers/hiring-process", description: "How we evaluate" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  infrastructure: {
    motion: "network",
    sections: [
      { id: "hero-media", props: { image: img.servers } },
      {
        id: "highlight-band",
        props: {
          layout: "display",
          title: "Labs, security posture, and platform patterns",
          body: "How Satyakabir builds and runs systems — development labs, delivery hygiene, and reusable cloud patterns.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "From lab to production posture",
          eyebrow: "Infrastructure",
          timeline: [
            { year: "Labs", title: "Prototype under constraints", body: "AI, cloud, and product spikes in environments that resemble production." },
            { year: "Secure", title: "Delivery hygiene", body: "Access control, secrets, and change windows matched to risk." },
            { year: "Patterns", title: "Reusable platforms", body: "Landing-zone and observability defaults that travel to client estates." },
            { year: "Campus", title: "HQ craft center", body: "Bengaluru gravity for reviews, pairing, and apprenticeship." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "bento",
          title: "What our infrastructure includes",
          cards: [
            { title: "Development labs", summary: "Environments for prototyping AI, cloud, and product systems with production-like constraints.", meta: "Labs" },
            { title: "Secure delivery", summary: "Access control, secrets hygiene, and change windows appropriate to client risk.", meta: "Security" },
            { title: "Platform patterns", summary: "Landing-zone and observability defaults we reuse when standing up estates.", meta: "Cloud" },
            { title: "Office craft center", summary: "Bengaluru HQ gravity for reviews, pairing, and apprenticeship.", meta: "Campus" },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "stack",
          title: "Rules for how we run platforms",
          values: [
            { title: "Client estates stay client-owned", body: "Production lives in your cloud — labs are for craft and spikes." },
            { title: "Patterns beat one-offs", body: "Reusable landing zones and observability defaults over snowflake setups." },
            { title: "Evidence travels", body: "Access and change records survive audits without theatre." },
          ],
        },
      },
      { id: "gallery", props: { title: "Labs & ops", images: [img.servers, img.lab, img.office] } },
      {
        id: "link-band",
        props: {
          title: "Related",
          links: [
            { title: "Cloud engineering", href: "/services/cloud-engineering" },
            { title: "Cyber security", href: "/services/cyber-security" },
            { title: "Global presence", href: "/company/global-presence" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  "global-presence": {
    motion: "editorial",
    sections: [
      { id: "hero-media", props: { image: img.city } },
      {
        id: "highlight-band",
        props: {
          layout: "split-text",
          title: "Global delivery. Local accountability.",
          body: "Bengaluru as craft headquarters — overlap hours, named pods, and documentation that keeps distributed programs coherent.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "How distribution is designed",
          eyebrow: "Presence",
          timeline: [
            { year: "HQ", title: "Bengaluru craft center", body: "Standards, hiring, and hard architecture reviews anchor quality." },
            { year: "Pods", title: "Named ownership", body: "Owners and overlap hours — not anonymous ticket queues." },
            { year: "Clients", title: "Meet where decisions happen", body: "On-site workshops when risk warrants; remote excellence as default muscle." },
            { year: "Continuity", title: "Docs defeat distance", body: "ADRs and runbooks keep context alive across time zones." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "index",
          title: "What we refuse in distributed work",
          cards: [
            { title: "Anonymous benches", summary: "Every pod has names clients can reach.", meta: "01" },
            { title: "Timezone theatre", summary: "Overlap is designed — not accidental.", meta: "02" },
            { title: "Tribal knowledge", summary: "If it is not written, it does not travel.", meta: "03" },
            { title: "Follow-the-sun chaos", summary: "Handoffs are planned with owners — not hope.", meta: "04" },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Plan delivery with us",
          links: [
            { title: "Office locations", href: "/contact/office-locations" },
            { title: "Contact", href: "/contact/contact-us" },
            { title: "Infrastructure", href: "/company/infrastructure" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  awards: {
    motion: "timeline",
    sections: [
      { id: "hero-media", props: { image: img.award } },
      {
        id: "highlight-band",
        props: {
          layout: "center",
          title: "Recognition that follows shipped systems",
          body: "Named awards publish here when cleared. Until then placeholders stay labeled. The recognition that matters most is clients who ask us back.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "Kinds of recognition we track",
          eyebrow: "Awards",
          timeline: [
            { year: "Craft", title: "Delivery recognition", body: "Proof points from programs where architecture and outcomes were examined together. [Placeholder: publish named awards when cleared.]" },
            { year: "Partners", title: "Ecosystem nods", body: "Cloud and AI alliances that reflect real delivery — not logo walls." },
            { year: "Clients", title: "Referral gravity", body: "The recognition that matters most: teams who ask us back." },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "rail",
          title: "How we treat awards",
          cards: [
            { title: "Outcomes first", summary: "Awards follow operable systems — they are not the goal.", meta: "Priority" },
            { title: "Client permission", summary: "We never publish confidential detail without approval.", meta: "Trust" },
            { title: "Honesty", summary: "Placeholders stay labeled until facts are cleared.", meta: "Integrity" },
          ],
        },
      },
      { id: "gallery", props: { images: [img.award, img.meeting, img.office] } },
      {
        id: "link-band",
        props: {
          title: "See the work behind it",
          links: [
            { title: "Case studies", href: "/work/case-studies" },
            { title: "Certifications", href: "/company/certifications" },
            { title: "Partners", href: "/company/partners" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  certifications: {
    motion: "editorial",
    sections: [
      { id: "hero-split", props: { image: img.lab } },
      {
        id: "highlight-band",
        props: {
          layout: "flush",
          title: "Assurance you can verify",
          body: "Certificates follow controls. Ask for the current pack for vendor onboarding — inventories change.",
        },
      },
      {
        id: "timeline",
        props: {
          title: "How assurance works here",
          eyebrow: "Certifications",
          timeline: [
            { year: "01", title: "Controls in delivery", body: "Secure SDLC, access management, and evidence on programs." },
            { year: "02", title: "Map to your frameworks", body: "SOC 2, ISO, HIPAA patterns, and others — as your obligations require." },
            { year: "03", title: "Share the pack", body: "Up-to-date certificates under NDA for active procurement. [Placeholder: formal cert list.]" },
          ],
        },
      },
      {
        id: "cards",
        props: {
          layout: "index",
          title: "Assurance practices on programs",
          cards: [
            { title: "Secure SDLC", summary: "Gates in pipelines — SAST, SCA, secrets — that developers can fix quickly.", meta: "Delivery" },
            { title: "Access control", summary: "Least privilege and audited changes on programs and our own systems.", meta: "Identity" },
            { title: "Evidence packs", summary: "Artifacts mapped to frameworks your auditors and customers require.", meta: "Compliance" },
            { title: "Vendor chain", summary: "Documented subprocessors and residual risk conversations.", meta: "Trust" },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Request the pack",
          links: [
            { title: "Cyber security", href: "/services/cyber-security" },
            { title: "Request assurance pack", href: "/contact/contact-us" },
            { title: "Partners", href: "/company/partners" },
          ],
        },
      },
      { id: "faq" },
      { id: "cta" },
      { id: "related" },
    ],
  },

  partners: {
    motion: "default",
    sections: [
      { id: "hero-split", props: { image: img.meeting } },
      {
        id: "highlight-band",
        props: {
          layout: "pull",
          title: "Alliances that earn their place",
          body: "Cloud, AI, and ecosystem partnerships chosen for client outcomes — not logo walls.",
        },
      },
      {
        id: "cards",
        props: {
          layout: "split",
          title: "How alliance decisions get made",
          body: "Partners are tools for delivery — never trophies for a slide.",
          cards: [
            { title: "Fit over logos", summary: "Alliances earn their place by accelerating secure delivery.", meta: "Select" },
            { title: "Hyperscaler fluency", summary: "AWS, Azure, and GCP patterns proven on real estates.", meta: "Cloud" },
            { title: "Model ecosystem", summary: "Provider relationships behind routing layers that protect exit options.", meta: "AI" },
            { title: "No forced lock-in", summary: "Clients keep decision rights; we document exit ramps.", meta: "Integrity" },
          ],
        },
      },
      {
        id: "values",
        props: {
          layout: "columns",
          title: "What we will and will not do with partners",
          values: [
            { title: "Recommend for fit", body: "We say when a partner path is right for your constraint." },
            { title: "Refuse logo pressure", body: "We will not force a stack because a rebate looks good." },
            { title: "Keep exit ramps", body: "Architecture stays portable enough that you are not trapped." },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Explore the stack",
          links: [
            { title: "AWS", href: "/technologies/aws" },
            { title: "Azure", href: "/technologies/azure" },
            { title: "OpenAI", href: "/technologies/openai" },
            { title: "Google Cloud", href: "/technologies/google-cloud" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },

  "corporate-social-responsibility": {
    motion: "editorial",
    sections: [
      { id: "hero-editorial", props: { image: img.city } },
      {
        id: "highlight-band",
        props: {
          layout: "display",
          title: "Responsibility inside delivery — not a side brochure",
          body: "Widen who gets to ship, hold public work to a higher trust bar, and refuse unauditable AI in high-stakes contexts.",
        },
      },
      {
        id: "cards",
        props: {
          layout: "bento",
          title: "Where CSR shows up",
          cards: [
            { title: "Learning access", summary: "Apprenticeships and mentorship that widen who gets to ship.", meta: "People" },
            { title: "Civic tech care", summary: "Public-sector work held to accessibility and trust bars.", meta: "Public" },
            { title: "Responsible AI", summary: "Refuse unauditable systems where harm is irreversible.", meta: "AI" },
            { title: "Honest placeholders", summary: "Formal reports publish when ready — practices are not paused for PDFs.", meta: "Integrity" },
          ],
        },
      },
      {
        id: "timeline",
        props: {
          title: "How it lands on a program",
          eyebrow: "CSR practice",
          timeline: [
            { year: "Hire", title: "Apprenticeship paths", body: "Internships with real shipping responsibility." },
            { year: "Build", title: "Public-sector care", body: "Accessibility and continuity as non-negotiables." },
            { year: "Refuse", title: "Unsafe AI", body: "No black-box systems where harm is irreversible." },
          ],
        },
      },
      {
        id: "link-band",
        props: {
          title: "Related",
          links: [
            { title: "Internships", href: "/careers/internships" },
            { title: "Government solutions", href: "/solutions/government" },
            { title: "Culture", href: "/company/culture" },
          ],
        },
      },
      { id: "cta" },
      { id: "related" },
    ],
  },
};
