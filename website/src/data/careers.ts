export type JobDepartment =
  | "Engineering"
  | "Artificial Intelligence"
  | "Product & Design"
  | "Cloud & DevOps"
  | "Quality & Security";

export type JobLocation = "Bengaluru (HQ)" | "Remote (India)" | "Remote (Global)";

export type JobType = "Full-time" | "Contract" | "Internship";

export interface JobPosition {
  id: string;
  slug: string;
  title: string;
  department: JobDepartment;
  location: JobLocation;
  type: JobType;
  experienceLevel: "Junior / Intern" | "Mid-Level" | "Senior" | "Lead / Principal";
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  isInternship?: boolean;
}

export const JOB_POSITIONS: JobPosition[] = [
  {
    id: "sr-ai-engineer",
    slug: "senior-ai-systems-engineer",
    title: "Senior AI Systems Engineer",
    department: "Artificial Intelligence",
    location: "Bengaluru (HQ)",
    type: "Full-time",
    experienceLevel: "Senior",
    summary:
      "Design and deploy production agentic AI workflows, LLM evaluation harnesses, and RAG pipelines for enterprise clients.",
    responsibilities: [
      "Architect autonomous LLM agent systems with tool access and human-in-the-loop guardrails.",
      "Build offline and online evaluation frameworks to measure hallucination rates and accuracy.",
      "Optimize vector search performance and hybrid retrieval pipelines over massive document corpora.",
      "Work directly with enterprise principals to translate domain workflows into reliable prompt chains.",
    ],
    requirements: [
      "4+ years of software engineering experience with strong proficiency in Python and TypeScript.",
      "Hands-on experience deploying LLM frameworks (LangChain, LlamaIndex, AutoGen, or custom runtimes).",
      "Deep understanding of vector databases (pgvector, Pinecone, Qdrant) and hybrid search.",
      "Experience with model fine-tuning, quantization, or local deployment (vLLM, Ollama).",
    ],
    benefits: [
      "Competitive compensation + equity options.",
      "Annual learning stipend for conferences & AI hardware.",
      "Flexible hybrid/remote policy with Bengaluru HQ access.",
      "Top-tier health insurance for self and family.",
    ],
  },
  {
    id: "lead-cloud-architect",
    slug: "lead-cloud-platform-architect",
    title: "Lead Cloud Platform Architect",
    department: "Cloud & DevOps",
    location: "Remote (Global)",
    type: "Full-time",
    experienceLevel: "Lead / Principal",
    summary:
      "Engineer resilient cloud infrastructure, Terraform landing zones, and Kubernetes platforms for high-throughput clients.",
    responsibilities: [
      "Define multi-cloud architecture standards across AWS, Google Cloud, and Azure.",
      "Implement Infrastructure-as-Code (IaC) modules using Terraform and OpenTofu.",
      "Build zero-downtime CI/CD automation pipelines and SRE observability dashboards.",
      "Conduct security audits and SOC2 compliance hardening for client infrastructure.",
    ],
    requirements: [
      "7+ years in Cloud Infrastructure, DevOps, or Site Reliability Engineering.",
      "Deep mastery of Kubernetes, Terraform, AWS Core services, and Linux networking.",
      "Proven track record of operating systems at 99.95%+ availability.",
      "Strong client-facing technical communication skills.",
    ],
    benefits: [
      "Work from anywhere in the world.",
      "Home office setup budget ($2,000 allowance).",
      "Unlimited paid time off with mandatory 3-week minimum.",
      "Quarterly team retreats in global tech hubs.",
    ],
  },
  {
    id: "staff-fullstack-engineer",
    slug: "staff-fullstack-product-engineer",
    title: "Staff Full-Stack Product Engineer",
    department: "Engineering",
    location: "Bengaluru (HQ)",
    type: "Full-time",
    experienceLevel: "Lead / Principal",
    summary:
      "Build high-performance web products, reactive Next.js applications, and scalable backend services.",
    responsibilities: [
      "Lead web product engineering initiatives using Next.js App Router, React, and TypeScript.",
      "Design clean API interfaces, database schemas (Postgres, MongoDB), and event streams.",
      "Maintain strict performance standards, web vitals, and accessibility (WCAG AA).",
      "Mentor mid-level engineers and conduct code reviews focused on craft and velocity.",
    ],
    requirements: [
      "6+ years of full-stack engineering experience delivering modern web applications.",
      "Expert knowledge of React, Next.js, Node.js/NestJS, TypeScript, and modern CSS.",
      "Strong experience with state management, edge runtimes, and database query optimization.",
      "Portfolio of shipped digital products with high user engagement.",
    ],
    benefits: [
      "Industry-leading salary + performance bonuses.",
      "Flexible work hours with high autonomy.",
      "Wellness & fitness membership allowance.",
      "Comprehensive medical & life insurance.",
    ],
  },
  {
    id: "lead-uiux-designer",
    slug: "lead-product-designer-uiux",
    title: "Lead Product Designer (UI/UX & Motion)",
    department: "Product & Design",
    location: "Remote (India)",
    type: "Full-time",
    experienceLevel: "Senior",
    summary:
      "Craft cinematic digital experiences, scalable design systems, and intuitive interfaces for AI and enterprise products.",
    responsibilities: [
      "Translate complex technical software workflows into clear, beautiful UI components.",
      "Develop interactive design tokens, typography scales, and motion primitives in Figma.",
      "Collaborate closely with frontend engineers to ensure design fidelity in code.",
      "Conduct user research, prototype testing, and usability audits.",
    ],
    requirements: [
      "5+ years of UI/UX design experience for SaaS, web apps, or digital products.",
      "Exceptional Figma portfolio demonstrating visual craft, design systems, and micro-interactions.",
      "Familiarity with web technologies (HTML, CSS, React components) to design implementable UI.",
      "Experience with motion design software (After Effects, Rive, Framer Motion).",
    ],
    benefits: [
      "Remote-first work environment.",
      "Latest Apple M-series hardware provided.",
      "Professional growth & design conference pass.",
      "Health & wellness benefits.",
    ],
  },
  {
    id: "sec-qa-lead",
    slug: "cyber-security-qa-lead",
    title: "Cyber Security & QA Automation Lead",
    department: "Quality & Security",
    location: "Bengaluru (HQ)",
    type: "Full-time",
    experienceLevel: "Senior",
    summary:
      "Establish automated quality gates, vulnerability scanners, and continuous security testing across pipeline releases.",
    responsibilities: [
      "Build automated E2E test suites using Playwright, Cypress, and Jest.",
      "Implement SAST/DAST security scanning and dependency auditing in GitHub Actions.",
      "Conduct penetration testing and threat modeling for pre-release software.",
      "Partner with engineering leads to ensure strict security compliance.",
    ],
    requirements: [
      "5+ years in QA Automation and Application Security.",
      "Proficiency in Playwright/Selenium, Python or JavaScript, and CI/CD pipelines.",
      "Hands-on familiarity with OWASP Top 10, penetration testing tools, and vulnerability management.",
      "Certifications such as CEH, CISSP, or OSCP are a strong plus.",
    ],
    benefits: [
      "Competitive compensation package.",
      "Security research budget & bug bounty sponsorship.",
      "Comprehensive medical coverage.",
      "HQ lunch & snacks provided.",
    ],
  },
  {
    id: "intern-ai-researcher",
    slug: "ai-engineering-intern",
    title: "AI Engineering & Systems Intern",
    department: "Artificial Intelligence",
    location: "Bengaluru (HQ)",
    type: "Internship",
    experienceLevel: "Junior / Intern",
    summary:
      "6-month immersive engineering internship building LLM tools, dataset evaluation pipelines, and R&D prototypes.",
    responsibilities: [
      "Assist in building and benchmarking LLM prompt templates and retrieval mechanisms.",
      "Write automated evaluation scripts to test AI response quality and speed.",
      "Contribute to open-source agent tooling and research papers.",
      "Receive direct 1:1 mentorship from principal AI engineers.",
    ],
    requirements: [
      "Currently pursuing or recently completed a degree in Computer Science, AI, or related field.",
      "Strong Python programming foundation and familiarity with Git & Linux.",
      "Passionate about AI, machine learning, and modern web software.",
      "Available for a full-time 6-month in-person/hybrid internship in Bengaluru.",
    ],
    benefits: [
      "High-stipend paid internship with fast-track full-time job offer.",
      "Direct mentorship from senior engineering leaders.",
      "Hands-on experience with production AI deployments.",
      "Subsidized housing allowance for outstation candidates.",
    ],
    isInternship: true,
  },
  {
    id: "intern-frontend-dev",
    slug: "frontend-engineering-intern",
    title: "Frontend Engineering Intern",
    department: "Engineering",
    location: "Remote (India)",
    type: "Internship",
    experienceLevel: "Junior / Intern",
    summary:
      "Gain real-world experience shipping React/Next.js UI components, responsive web layouts, and animations.",
    responsibilities: [
      "Build UI components following design system specifications in Figma.",
      "Implement responsive Tailwind CSS layouts and motion effects.",
      "Participate in daily engineering standups, code reviews, and sprint planning.",
      "Fix UI bugs, improve accessibility, and optimize web performance.",
    ],
    requirements: [
      "Solid proficiency in HTML, CSS, JavaScript, and React basics.",
      "Good eye for visual design, spacing, and micro-interactions.",
      "Curious learner with strong problem-solving initiative.",
      "Available for a 6-month full-time internship.",
    ],
    benefits: [
      "Competitive paid internship stipend.",
      "Certificate & letter of recommendation.",
      "Full-time conversion opportunity upon completion.",
      "Remote work flexibility.",
    ],
    isInternship: true,
  },
];

export function getPositions(filter?: {
  department?: string;
  isInternship?: boolean;
}) {
  return JOB_POSITIONS.filter((pos) => {
    if (filter?.isInternship !== undefined && !!pos.isInternship !== filter.isInternship) {
      return false;
    }
    if (filter?.department && filter.department !== "All" && pos.department !== filter.department) {
      return false;
    }
    return true;
  });
}
