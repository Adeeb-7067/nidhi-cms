export type ArticleCategory =
  | "AI & Intelligence"
  | "Cloud & Infrastructure"
  | "Product Engineering"
  | "Cyber Security"
  | "Whitepapers";

export interface ArticleContentBlock {
  type: "paragraph" | "heading" | "code" | "quote" | "takeaway";
  text: string;
  language?: string;
}

export interface ArticleAuthor {
  name: string;
  role: string;
  avatar: string;
}

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  publishDate: string;
  readTime: string;
  summary: string;
  author: ArticleAuthor;
  tags: string[];
  heroImage: string;
  isGatedWhitepaper?: boolean;
  pdfFileName?: string;
  blocks: ArticleContentBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: "evaluating-agentic-llm-workflows-in-production",
    title: "Evaluating Agentic LLM Workflows in Production: Beyond Benchmarks",
    category: "AI & Intelligence",
    publishDate: "August 4, 2026",
    readTime: "8 min read",
    summary:
      "A practical engineering framework for measuring reliability, loop stability, tool invocation accuracy, and human-in-the-loop oversight in autonomous agent deployments.",
    author: {
      name: "Dr. Vikram Sethi",
      role: "Head of AI Research & Evals",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    },
    tags: ["LLM", "Agentic AI", "MLOps", "Evals", "Python"],
    heroImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    blocks: [
      {
        type: "paragraph",
        text: "Deploying autonomous AI agents into enterprise workflows is fundamentally different from serving static classification models or simple chat interfaces. When an agent has access to APIs, database query tools, and automated decision rights, non-deterministic failures compound exponentially.",
      },
      {
        type: "heading",
        text: "1. The Three Failure Modes of Agent Systems",
      },
      {
        type: "paragraph",
        text: "In our production audits across fintech and healthcare platforms, agentic failures usually fall into three distinct categories: Tool Misuse, Infinite Loop Recursion, and Context Degradation.",
      },
      {
        type: "quote",
        text: "Evaluation harnesses must test not just the final text output, but the validity and sequence of tool calls executed along the trajectory.",
      },
      {
        type: "heading",
        text: "2. Structuring an E2E Evaluation Suite",
      },
      {
        type: "paragraph",
        text: "We enforce an offline evaluation gate before any prompt or agent graph update reaches staging. Below is an example evaluation assertion pattern used in our CI pipelines:",
      },
      {
        type: "code",
        language: "typescript",
        text: `export async function testAgentTrajectory(runner: AgentRunner) {
  const result = await runner.execute({
    prompt: "Reconcile account #8941 for discrepancy",
    tools: ["fetch_statement", "compare_ledger", "flag_discrepancy"]
  });

  expect(result.toolCalls).toContainSequence(["fetch_statement", "compare_ledger"]);
  expect(result.loopsCount).toBeLessThan(4);
  expect(result.confidenceScore).toBeGreaterThan(0.92);
}`,
      },
      {
        type: "takeaway",
        text: "Key Takeaway: Never rely solely on LLM-as-a-judge for agent evals. Combine deterministic schema validation, API mock stubs, and human review sampling for critical operations.",
      },
    ],
  },
  {
    slug: "zero-trust-multi-cloud-architecture-playbook",
    title: "Zero-Trust Multi-Cloud Architecture: Terraform & Kubernetes Playbook",
    category: "Cloud & Infrastructure",
    publishDate: "July 28, 2026",
    readTime: "11 min read",
    summary:
      "How to establish enterprise workload identity, zero-trust network policies, and policy-as-code enforcement across AWS, Google Cloud, and Azure estates.",
    author: {
      name: "Kabir Sharma",
      role: "Principal Cloud Architect",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    },
    tags: ["Kubernetes", "Terraform", "AWS", "Zero-Trust", "DevOps"],
    heroImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    blocks: [
      {
        type: "paragraph",
        text: "Modern multi-cloud environments cannot rely on perimeter-based security models. IP whitelisting and traditional VPNs collapse under the weight of ephemeral microservices and cross-region deployments.",
      },
      {
        type: "heading",
        text: "Identity as the New Perimeter",
      },
      {
        type: "paragraph",
        text: "By leveraging SPIFFE/SPIRE for workload identity and OPA (Open Policy Agent) for centralized policy decisions, cloud components verify cryptographic signatures on every single request.",
      },
      {
        type: "code",
        language: "hcl",
        text: `resource "aws_iam_openid_connect_provider" "spire" {
  url             = "https://oidc.satyakabir.internal"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [var.spire_ca_thumbprint]
}`,
      },
    ],
  },
  {
    slug: "designing-micro-interactions-for-web-vitals",
    title: "Designing Micro-Interactions Without Sacrificing Web Vitals",
    category: "Product Engineering",
    publishDate: "July 19, 2026",
    readTime: "6 min read",
    summary:
      "Techniques for achieving 60fps animations, glassmorphic UI depth, and spring physics in Next.js applications while keeping Cumulative Layout Shift (CLS) at zero.",
    author: {
      name: "Priya Nair",
      role: "Lead Product Designer",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    },
    tags: ["UX", "Framer Motion", "React", "Performance", "CSS"],
    heroImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    blocks: [
      {
        type: "paragraph",
        text: "Delightful motion effects often come at the expense of main-thread performance if done incorrectly. Using transform-only animations and hardware-accelerated layers ensures smooth interaction without layout thrashing.",
      },
    ],
  },
  {
    slug: "whitepaper-agentic-ai-enterprise-operating-model",
    title: "Enterprise Whitepaper: The Agentic AI Operating Model 2026",
    category: "Whitepapers",
    publishDate: "August 2026",
    readTime: "18 min read · PDF Included",
    summary:
      "A comprehensive 24-page whitepaper outlining governance, ROI metrics, human oversight structures, and security architecture for enterprise AI adoption.",
    author: {
      name: "Satyakabir Executive Research",
      role: "Architecture Steering Committee",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    },
    tags: ["Whitepaper", "Enterprise AI", "Governance", "Executive"],
    heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    isGatedWhitepaper: true,
    pdfFileName: "Satyakabir_Agentic_AI_Operating_Model_2026.pdf",
    blocks: [
      {
        type: "paragraph",
        text: "This whitepaper synthesizes executive lessons from deploying AI agents into real-time environments. Enter your business email to download the full 24-page PDF document.",
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
