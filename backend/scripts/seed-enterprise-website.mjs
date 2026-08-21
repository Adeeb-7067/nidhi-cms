import "../load-env.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { websitePagesTable } from "../src/modules/website/schema/WebsitePage.js";
import { websiteRevisionsTable } from "../src/modules/website/schema/WebsiteRevision.js";
import { websiteSettingsTable } from "../src/modules/website/schema/WebsiteSettings.js";
import { validateBlockArray } from "../src/modules/website/services/block-engine.service.js";

dotenv.config();

const MONGODB_URI =
  process.env.DATABASE_URL ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/cms_database";

const SEED_USER_ID = 1;

// Sample initial pages to seed based on site sections
const SEED_PAGES = [
  {
    title: "Cinematic Digital Experience",
    slug: "/",
    pageType: "landing",
    status: "PUBLISHED",
    seo: {
      title: "Nidhi Info Tech | Future of Digital Transformation",
      description: "Enterprise AI Solutions, Custom Software Engineering, and Modern Web Systems.",
    },
    draftBlocks: [
      {
        id: "b_hero_1",
        type: "hero",
        order: 0,
        data: {
          headline: "Architecting Next-Generation Digital Products",
          subheadline: "Empowering global enterprises with scalable AI, Cloud Platforms, and Modern Web Engineering.",
          primaryCta: { label: "Explore Solutions", href: "/services" },
        },
      },
      {
        id: "b_stats_1",
        type: "stats",
        order: 1,
        data: {
          title: "Enterprise Impact Metrics",
          items: [
            { value: "500+", label: "Global Deployments", trend: "+24%" },
            { value: "99.99%", label: "Uptime SLA", trend: "Guaranteed" },
            { value: "10x", label: "Performance Gain", trend: "Optimized" },
          ],
        },
      },
      {
        id: "b_cta_1",
        type: "cta",
        order: 2,
        data: {
          headline: "Ready to Transform Your Business?",
          subheadline: "Schedule a confidential consultation with our principal software architects.",
          primaryCta: { label: "Book Architect Call", href: "/contact" },
        },
      },
    ],
  },
  {
    title: "Artificial Intelligence & ML Engineering",
    slug: "/services/ai",
    pageType: "service",
    status: "PUBLISHED",
    seo: {
      title: "AI & Machine Learning Solutions | Satyakabir",
      description: "Custom LLM integrations, predictive analytics, and enterprise AI workflows.",
    },
    draftBlocks: [
      {
        id: "b_hero_ai",
        type: "hero",
        order: 0,
        data: {
          headline: "Enterprise AI & Machine Learning Systems",
          subheadline: "Production-grade Large Language Models, Computer Vision, and Predictive Analytics.",
          primaryCta: { label: "Request AI Audit", href: "/contact" },
        },
      },
      {
        id: "b_features_ai",
        type: "feature_grid",
        order: 1,
        data: {
          title: "Core AI Capabilities",
          items: [
            { title: "Custom Fine-Tuned Models", description: "Tailored LLMs trained on private domain enterprise data." },
            { title: "RAG & Vector Search", description: "Sub-second semantic search engines with pgvector and Milvus." },
            { title: "Automated Workflow Agents", description: "Autonomous AI agents for complex multi-step tasks." },
          ],
        },
      },
    ],
  },
  {
    title: "Careers & Innovation Lab",
    slug: "/careers",
    pageType: "standard",
    status: "PUBLISHED",
    seo: {
      title: "Careers at Satyakabir | Join Our Engineering Team",
      description: "Build cutting-edge software systems alongside principal engineers.",
    },
    draftBlocks: [
      {
        id: "b_hero_careers",
        type: "hero",
        order: 0,
        data: {
          headline: "Shape the Future of Technology",
          subheadline: "We are hiring principal engineers, full-stack developers, and AI researchers.",
          primaryCta: { label: "View Openings", href: "#openings" },
        },
      },
      {
        id: "b_form_careers",
        type: "form_embed",
        order: 1,
        data: {
          formType: "job_apply",
          title: "Apply for Open Positions",
          submitButtonText: "Submit Application",
        },
      },
    ],
  },
];

async function runSeed() {
  console.log("🌱 Connecting to MongoDB:", MONGODB_URI.split("@").pop());
  await mongoose.connect(MONGODB_URI);

  console.log("⚙️  Seeding Global Website Settings...");
  await websiteSettingsTable.findOneAndUpdate(
    {},
    {
      brandName: "Nidhi Info Tech",
      contactEmail: "contact@nidhiinfotech.com",
      contactPhone: "+91 755 493 8888",
      address: "Bhopal, Madhya Pradesh, India",
      headerMenu: [
        { label: "Services", href: "/services" },
        { label: "AI & ML", href: "/services/ai" },
        { label: "Work", href: "/work" },
        { label: "Careers", href: "/careers" },
      ],
      footerMenu: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
      socialLinks: {
        linkedin: "https://linkedin.com/company/nidhiinfotech",
        github: "https://github.com/nidhiinfotech",
        twitter: "https://twitter.com/nidhiinfotech",
      },
      seoDefaults: {
        titleTemplate: "%s | Nidhi Info Tech",
        defaultDescription: "Enterprise Software Engineering & AI Solutions.",
      },
    },
    { upsert: true, new: true }
  );

  console.log("📄 Seeding Website Pages and Revision Snapshots...");
  for (const pageSeed of SEED_PAGES) {
    const validatedBlocks = validateBlockArray(pageSeed.draftBlocks);

    const page = await websitePagesTable.findOneAndUpdate(
      { slug: pageSeed.slug },
      {
        title: pageSeed.title,
        slug: pageSeed.slug,
        pageType: pageSeed.pageType,
        status: pageSeed.status,
        draftBlocks: validatedBlocks,
        seo: pageSeed.seo,
        version: 1,
        createdBy: SEED_USER_ID,
        updatedBy: SEED_USER_ID,
      },
      { upsert: true, new: true }
    );

    // Freeze Revision #1
    const revision = await websiteRevisionsTable.findOneAndUpdate(
      { pageId: page._id, revisionNumber: 1 },
      {
        pageId: page._id,
        revisionNumber: 1,
        blocksSnapshot: validatedBlocks,
        seoSnapshot: page.seo,
        changeSummary: "Initial automated migration seed revision",
        authorId: SEED_USER_ID,
      },
      { upsert: true, new: true }
    );

    page.publishedRevisionId = revision._id;
    page.publishedAt = new Date();
    await page.save();

    console.log(`  ✓ Seeded page: '${page.title}' (${page.slug}) -> Revision #${revision.revisionNumber}`);
  }

  console.log("✅ Enterprise Website Database Seeding Complete!");
  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
