import { slugify } from "@/lib/slug";

export type NavLayout =
  | "split"
  | "editorial"
  | "grid"
  | "manifesto"
  | "timeline"
  | "stats";

export type MegaFeatured = {
  eyebrow: string;
  title: string;
  summary: string;
  href: string;
  stat?: string;
  statLabel?: string;
};

export type NavLeaf = {
  title: string;
  description: string;
  href: string;
  icon?: string;
  image?: string;
};

export type NavGroup = {
  title: string;
  items: NavLeaf[];
};

export type NavItem = {
  id: string;
  label: string;
  href: string;
  kind: "link" | "mega" | "home";
  groups?: NavGroup[];
  featured?: MegaFeatured;
  /** Home scroll anchors (cinematic) */
  homeLinks?: { label: string; pct: number }[];
};

function leaf(title: string, description: string, base: string, icon?: string): NavLeaf {
  const slug = slugify(title);
  return {
    title,
    description,
    href: `${base}/${slug}`,
    icon,
    image: `https://images.unsplash.com/photo-${icon ?? "1518770660439"}?auto=format&fit=crop&w=800&q=70`,
  };
}

const unsplash = {
  ai: "1677442136019-21780ecad995",
  web: "1460925895917-afdab827c52f",
  cloud: "1451187580459-43490279c0fa",
  mobile: "1512941937669-90a1b58e7e9c",
  design: "1561070791-2526d30994b5",
  security: "1555949963-aa79dcee981c",
  office: "1497366216548-37526070297c",
  team: "1522071820081-009f0129c71c",
  city: "1480714378408-67cf0d13bc1b",
  code: "1517694712202-14dd9538aa97",
};

export const navigation: NavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    kind: "home",
    homeLinks: [
      { label: "Hero", pct: 0 },
      { label: "About", pct: 14 },
      { label: "Services", pct: 22 },
      { label: "Projects", pct: 50 },
      { label: "Technology", pct: 74 },
      { label: "Industries", pct: 56 },
      { label: "Testimonials", pct: 62 },
      { label: "FAQ", pct: 88 },
      { label: "Contact", pct: 92 },
    ],
  },
  {
    id: "company",
    label: "Company",
    href: "/company",
    kind: "mega",
    featured: {
      eyebrow: "Inside Satyakabir",
      title: "Engineering culture with boardroom gravity",
      summary: "Meet the people, principles, and global footprint behind the headquarters film.",
      href: "/company/about-us",
      stat: "5+",
      statLabel: "Offices in India",
    },
    groups: [
      {
        title: "Who we are",
        items: [
          leaf("About Us", "The digital face of AI-first engineering.", "/company", unsplash.office),
          leaf("Our Story", "From Bhopal roots to global delivery.", "/company", unsplash.city),
          leaf("Mission", "Software that feels inevitable once it exists.", "/company", unsplash.code),
          leaf("Vision", "Intelligent infrastructure as a default.", "/company", unsplash.cloud),
        ],
      },
      {
        title: "People",
        items: [
          leaf("Leadership", "Principals who still ship.", "/company", unsplash.team),
          leaf("Our Team", "Engineers, designers, researchers, operators.", "/company", unsplash.team),
          leaf("Culture", "Craft, clarity, and shared ownership.", "/company", unsplash.office),
          leaf("Life at Satyakabir", "Rituals, remote pods, and HQ gravity.", "/company", unsplash.office),
        ],
      },
      {
        title: "Presence",
        items: [
          leaf("Infrastructure", "How we build and run platforms.", "/company", unsplash.cloud),
          leaf("Global Presence", "Delivery across continents.", "/company", unsplash.city),
          leaf("Awards", "Proof of craft and delivery.", "/company", unsplash.ai),
          leaf("Certifications", "ISO, assurance, and trust signals.", "/company", unsplash.security),
          leaf("Partners", "Cloud, AI, and ecosystem alliances.", "/company", unsplash.web),
          leaf("Corporate Social Responsibility", "Technology with civic responsibility.", "/company", unsplash.city),
          {
            title: "Careers",
            description: "Open roles and hiring journeys.",
            href: "/careers",
            icon: unsplash.team,
            image: `https://images.unsplash.com/photo-${unsplash.team}?auto=format&fit=crop&w=800&q=70`,
          },
        ],
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    href: "/services",
    kind: "mega",
    featured: {
      eyebrow: "Featured practice",
      title: "Agentic AI Systems",
      summary: "Production agents with evaluation harnesses, audit trails, and human-in-the-loop controls.",
      href: "/services/agentic-ai",
      stat: "21",
      statLabel: "Practice areas",
    },
    groups: [
      {
        title: "Intelligence",
        items: [
          leaf("AI Development", "End-to-end intelligent product systems.", "/services", unsplash.ai),
          leaf("Machine Learning", "Models that survive production traffic.", "/services", unsplash.ai),
          leaf("Generative AI", "Content, code, and decision copilots.", "/services", unsplash.ai),
          leaf("LLM Solutions", "RAG, fine-tuning, and governance.", "/services", unsplash.ai),
          leaf("Agentic AI", "Autonomous workflows with guardrails.", "/services", unsplash.ai),
        ],
      },
      {
        title: "Digital services",
        items: [
          leaf(
            "Digital Services",
            "Web, mobile, design, and digital product systems engineered to scale.",
            "/services",
            unsplash.web,
          ),
          leaf(
            "Leads",
            "Lead engines and conversion systems that turn attention into pipeline.",
            "/services",
            unsplash.office,
          ),
          leaf(
            "Branding",
            "Brand systems that product, web, and campaigns can actually ship.",
            "/services",
            unsplash.design,
          ),
          leaf("Web Development", "High-performance web products.", "/services", unsplash.web),
          leaf("Mobile Applications", "Native, hybrid, and PWA experiences.", "/services", unsplash.mobile),
          leaf("UI UX Design", "Interfaces with motion and clarity.", "/services", unsplash.design),
          leaf("Digital Transformation", "Operating models that stick.", "/services", unsplash.office),
        ],
      },
      {
        title: "Product & platforms",
        items: [
          leaf("Enterprise Applications", "Systems of record that stay agile.", "/services", unsplash.web),
          leaf("Product Engineering", "From prototype to release trains.", "/services", unsplash.code),
          leaf("SaaS Development", "Multi-tenant platforms with FinOps.", "/services", unsplash.cloud),
        ],
      },
      {
        title: "Cloud & assurance",
        items: [
          leaf("Cloud Engineering", "Landing zones and elastic estates.", "/services", unsplash.cloud),
          leaf("DevOps", "CI/CD, SRE, and reliability budgets.", "/services", unsplash.cloud),
          leaf("Cyber Security", "Zero-trust and continuous assurance.", "/services", unsplash.security),
          leaf("QA Automation", "Quality gates in every pipeline.", "/services", unsplash.code),
          leaf("Maintenance & Support", "Keep critical systems calm.", "/services", unsplash.cloud),
          leaf("Technology Consulting", "Strategy with engineering depth.", "/services", unsplash.office),
        ],
      },
    ],
  },
  {
    id: "solutions",
    label: "Solutions",
    href: "/solutions",
    kind: "mega",
    featured: {
      eyebrow: "Enterprise suite",
      title: "ERP that leaders can operate",
      summary: "Modular enterprise systems designed for regulated workflows and rapid iteration.",
      href: "/solutions/erp",
      stat: "14",
      statLabel: "Solution lines",
    },
    groups: [
      {
        title: "Core systems",
        items: [
          leaf("ERP", "Unified operations across finance and supply.", "/solutions", unsplash.web),
          leaf("CRM", "Pipeline intelligence and customer memory.", "/solutions", unsplash.web),
          leaf("HRMS", "People ops with compliance built in.", "/solutions", unsplash.team),
          leaf("Finance", "Close faster with auditable automation.", "/solutions", unsplash.office),
        ],
      },
      {
        title: "Industry solutions",
        items: [
          leaf("Healthcare", "Clinical and ops platforms.", "/solutions", unsplash.ai),
          leaf("Education", "Learning systems at institutional scale.", "/solutions", unsplash.design),
          leaf("Retail", "Omnichannel commerce engines.", "/solutions", unsplash.web),
          leaf("Manufacturing", "Plant-floor to cloud visibility.", "/solutions", unsplash.cloud),
          leaf("Real Estate", "Portfolio and transaction platforms.", "/solutions", unsplash.city),
          leaf("Logistics", "Routing, tracking, and control towers.", "/solutions", unsplash.cloud),
          leaf("Construction", "Project and field coordination.", "/solutions", unsplash.office),
          leaf("Government", "Citizen services with trust.", "/solutions", unsplash.city),
        ],
      },
      {
        title: "Scale",
        items: [
          leaf("Startup Solutions", "MVP to product-market fit platforms.", "/solutions", unsplash.code),
          leaf("Enterprise Solutions", "Transformation programs that ship.", "/solutions", unsplash.office),
        ],
      },
    ],
  },
  {
    id: "technologies",
    label: "Technologies",
    href: "/technologies",
    kind: "mega",
    featured: {
      eyebrow: "Stack spotlight",
      title: "Next.js + AI on cloud-native rails",
      summary: "Modern primitives chosen for longevity — not novelty for its own sake.",
      href: "/technologies/next-js",
      stat: "30+",
      statLabel: "Core technologies",
    },
    groups: [
      {
        title: "Frontend",
        items: [
          leaf("React", "Component systems at product scale.", "/technologies", unsplash.web),
          leaf("Next.js", "App Router experiences with edge delivery.", "/technologies", unsplash.web),
          leaf("Vue", "Approachable reactive interfaces.", "/technologies", unsplash.web),
          leaf("Angular", "Enterprise SPA architecture.", "/technologies", unsplash.web),
        ],
      },
      {
        title: "Backend",
        items: [
          leaf("Node.js", "Event-driven services and APIs.", "/technologies", unsplash.code),
          leaf("NestJS", "Structured Node for large teams.", "/technologies", unsplash.code),
          leaf("Java", "Mission-critical JVM systems.", "/technologies", unsplash.code),
          leaf("Python", "Data, AI, and API services.", "/technologies", unsplash.ai),
          leaf(".NET", "Enterprise Microsoft ecosystems.", "/technologies", unsplash.code),
        ],
      },
      {
        title: "Cloud & AI",
        items: [
          leaf("AWS", "Landing zones and global scale.", "/technologies", unsplash.cloud),
          leaf("Azure", "Enterprise identity and cloud estates.", "/technologies", unsplash.cloud),
          leaf("Google Cloud", "Data and ML-native platforms.", "/technologies", unsplash.cloud),
          leaf("OpenAI", "GPT systems with governance.", "/technologies", unsplash.ai),
          leaf("Gemini", "Multimodal Google AI stacks.", "/technologies", unsplash.ai),
          leaf("Claude", "Long-context agent workflows.", "/technologies", unsplash.ai),
          leaf("Llama", "Open-weight model deployment.", "/technologies", unsplash.ai),
          leaf("Mistral", "Efficient European model stacks.", "/technologies", unsplash.ai),
        ],
      },
      {
        title: "Data & mobile",
        items: [
          leaf("MongoDB", "Document stores for product velocity.", "/technologies", unsplash.cloud),
          leaf("PostgreSQL", "Relational core of record.", "/technologies", unsplash.cloud),
          leaf("Redis", "Caching and realtime fabrics.", "/technologies", unsplash.cloud),
          leaf("Firebase", "Mobile backends that move fast.", "/technologies", unsplash.mobile),
          leaf("Flutter", "Cross-platform mobile craft.", "/technologies", unsplash.mobile),
          leaf("React Native", "Shared UI across devices.", "/technologies", unsplash.mobile),
          leaf("Swift", "Native iOS excellence.", "/technologies", unsplash.mobile),
          leaf("Kotlin", "Native Android systems.", "/technologies", unsplash.mobile),
        ],
      },
    ],
  },
  {
    id: "industries",
    label: "Industries",
    href: "/industries",
    kind: "mega",
    featured: {
      eyebrow: "Domain fluency",
      title: "Healthcare platforms with clinical rigor",
      summary: "Regulated industries need engineering that understands both compliance and velocity.",
      href: "/industries/healthcare",
      stat: "14",
      statLabel: "Industry verticals",
    },
    groups: [
      {
        title: "Markets",
        items: [
          leaf("Healthcare", "Clinical ops and patient platforms.", "/industries", unsplash.ai),
          leaf("Finance", "Banking and capital markets systems.", "/industries", unsplash.office),
          leaf("Insurance", "Claims, underwriting, and portals.", "/industries", unsplash.web),
          leaf("Retail", "Commerce and inventory intelligence.", "/industries", unsplash.web),
          leaf("Manufacturing", "Industrial digital twins.", "/industries", unsplash.cloud),
          leaf("Logistics", "Fleet and warehouse control.", "/industries", unsplash.cloud),
          leaf("Education", "Learning at institutional scale.", "/industries", unsplash.design),
        ],
      },
      {
        title: "More verticals",
        items: [
          leaf("Government", "Citizen-grade digital services.", "/industries", unsplash.city),
          leaf("Automotive", "Connected vehicle platforms.", "/industries", unsplash.cloud),
          leaf("Travel", "Booking and operations systems.", "/industries", unsplash.city),
          leaf("Hospitality", "Guest experience platforms.", "/industries", unsplash.office),
          leaf("Media", "Streaming and content ops.", "/industries", unsplash.design),
          leaf("Sports", "Fan and performance platforms.", "/industries", unsplash.web),
          leaf("Real Estate", "Property and transaction tech.", "/industries", unsplash.city),
        ],
      },
    ],
  },
  {
    id: "work",
    label: "Work",
    href: "/work",
    kind: "mega",
    featured: {
      eyebrow: "Case study",
      title: "Nexus AI Platform",
      summary: "Enterprise agent orchestration with audit trails and evaluation loops.",
      href: "/work/nexus-ai-platform",
      stat: "50+",
      statLabel: "Products shipped",
    },
    groups: [
      {
        title: "Explore",
        items: [
          leaf("Featured Projects", "Selected builds from the floor.", "/work", unsplash.code),
          leaf("Case Studies", "Outcomes, architecture, and lessons.", "/work", unsplash.office),
          leaf("Portfolio", "Browse the full body of work.", "/work", unsplash.web),
          leaf("Open Source", "Shared primitives and tools.", "/work", unsplash.code),
          leaf("Client Success Stories", "Voices from the journey.", "/work", unsplash.team),
          leaf("Project Gallery", "Visual archive of shipped craft.", "/work", unsplash.design),
        ],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    href: "/insights",
    kind: "mega",
    featured: {
      eyebrow: "Latest signal",
      title: "How we evaluate agentic systems",
      summary: "A practical playbook for reliability, evals, and human oversight in production AI.",
      href: "/insights/technology-articles",
      stat: "Weekly",
      statLabel: "Signal notes",
    },
    groups: [
      {
        title: "Library",
        items: [
          leaf("Blog", "Field notes from engineering.", "/insights", unsplash.code),
          leaf("Research", "Applied R&D from the lab.", "/insights", unsplash.ai),
          leaf("Whitepapers", "Deep dives for technical leaders.", "/insights", unsplash.office),
          leaf("Technology Articles", "Patterns that travel across stacks.", "/insights", unsplash.web),
          leaf("Company News", "Milestones and announcements.", "/insights", unsplash.city),
          leaf("Events", "Talks, meetups, and briefings.", "/insights", unsplash.team),
          leaf("Resources", "Templates and toolkits.", "/insights", unsplash.design),
          leaf("FAQs", "Answers to the questions we hear most.", "/insights", unsplash.office),
        ],
      },
    ],
  },
  {
    id: "careers",
    label: "Careers",
    href: "/careers",
    kind: "mega",
    featured: {
      eyebrow: "Join the film",
      title: "Build systems that last",
      summary: "Remote-first roles with Bengaluru HQ gravity — for people who care about craft.",
      href: "/careers/open-positions",
      stat: "100+",
      statLabel: "Builders worldwide",
    },
    groups: [
      {
        title: "Join us",
        items: [
          leaf("Why Join Us", "Why ambitious builders choose SK.", "/careers", unsplash.team),
          leaf("Benefits", "Compensation, learning, and wellbeing.", "/careers", unsplash.office),
          leaf("Open Positions", "Roles open right now.", "/careers", unsplash.code),
          leaf("Internships", "Start your craft with us.", "/careers", unsplash.design),
          leaf("Hiring Process", "Transparent steps from apply to offer.", "/careers", unsplash.web),
          leaf("Culture", "How we collaborate and ship.", "/careers", unsplash.team),
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    href: "/contact",
    kind: "mega",
    featured: {
      eyebrow: "Start a brief",
      title: "Talk to a principal this week",
      summary: "Share the ambition behind your next platform. We respond within one business day.",
      href: "/contact/book-meeting",
      stat: "24h",
      statLabel: "Response target",
    },
    groups: [
      {
        title: "Reach us",
        items: [
          leaf("Contact Us", "Email, phone, and inquiry form.", "/contact", unsplash.office),
          leaf("Book Meeting", "Schedule a strategy call.", "/contact", unsplash.team),
          leaf("Office Locations", "HQ and partner hubs.", "/contact", unsplash.city),
          leaf("Support", "Help for existing engagements.", "/contact", unsplash.cloud),
          leaf("Get Quote", "Scoped estimate for your initiative.", "/contact", unsplash.web),
        ],
      },
    ],
  },
];

export const ctaNav = {
  label: "Start Your Project",
  href: "/contact/get-quote",
};

/** Flat searchable catalog */
export function flattenNavigation() {
  const rows: {
    title: string;
    description: string;
    href: string;
    category: string;
    keywords: string;
  }[] = [];

  for (const item of navigation) {
    rows.push({
      title: item.label,
      description: `${item.label} overview`,
      href: item.href,
      category: "Pages",
      keywords: item.label.toLowerCase(),
    });

    for (const group of item.groups ?? []) {
      for (const leafItem of group.items) {
        rows.push({
          title: leafItem.title,
          description: leafItem.description,
          href: leafItem.href,
          category: item.label,
          keywords: `${item.label} ${group.title} ${leafItem.title} ${leafItem.description}`.toLowerCase(),
        });
      }
    }
  }

  rows.push(
    {
      title: "Cinematic Experience",
      description: "Scroll the headquarters film",
      href: "/",
      category: "Pages",
      keywords: "home film cinematic scroll",
    },
    {
      title: "Start Your Project",
      description: "Begin a new engagement",
      href: ctaNav.href,
      category: "Contact",
      keywords: "cta quote project",
    },
  );

  return rows;
}

export function findNavLeaf(href: string) {
  for (const item of navigation) {
    if (item.href === href) {
      return {
        section: item,
        leaf: {
          title: item.label,
          description: `${item.label} hub`,
          href: item.href,
        } satisfies NavLeaf,
        groupTitle: "Overview",
      };
    }
    for (const group of item.groups ?? []) {
      for (const leafItem of group.items) {
        if (leafItem.href === href) {
          return { section: item, leaf: leafItem, groupTitle: group.title };
        }
      }
    }
  }
  return null;
}

export function breadcrumbsFor(href: string) {
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  if (href === "/") return crumbs;

  const found = findNavLeaf(href);
  if (!found) {
    const parts = href.split("/").filter(Boolean);
    let path = "";
    for (const part of parts) {
      path += `/${part}`;
      crumbs.push({
        label: part.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        href: path,
      });
    }
    return crumbs;
  }

  if (found.section.href !== href) {
    crumbs.push({ label: found.section.label, href: found.section.href });
  }
  crumbs.push({ label: found.leaf.title, href: found.leaf.href });
  return crumbs;
}

export function layoutForSlug(slug: string): NavLayout {
  const layouts: NavLayout[] = ["split", "editorial", "grid", "manifesto", "timeline", "stats"];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash + slug.charCodeAt(i) * (i + 1)) % layouts.length;
  return layouts[hash];
}

export function sectionSlugs(sectionId: string) {
  const item = navigation.find((n) => n.id === sectionId);
  if (!item?.groups) return [] as string[];
  const slugs = new Set<string>();
  for (const group of item.groups) {
    for (const leafItem of group.items) {
      const parts = leafItem.href.split("/");
      const slug = parts[parts.length - 1];
      if (slug && leafItem.href.startsWith(`/${sectionId}`)) slugs.add(slug);
    }
  }
  return [...slugs];
}

export function getSectionLeaves(sectionId: string) {
  const item = navigation.find((n) => n.id === sectionId);
  if (!item?.groups) return [] as NavLeaf[];
  return item.groups.flatMap((g) => g.items).filter((l) => l.href.startsWith(`/${sectionId}`));
}
