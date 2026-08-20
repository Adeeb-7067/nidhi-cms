import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cms_hub";

async function runSeed() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to Mongo!");

    const WebsitePageSchema = new mongoose.Schema(
      {
        title: String,
        slug: { type: String, unique: true },
        pageType: String,
        status: String,
        draftBlocks: Array,
        seo: Object,
        version: Number,
        createdBy: mongoose.Schema.Types.Mixed,
        updatedBy: mongoose.Schema.Types.Mixed,
      },
      { timestamps: true }
    );

    const WebsitePage = mongoose.models.WebsitePage || mongoose.model("WebsitePage", WebsitePageSchema);

    const DEFAULT_PAGES = [
      { title: "Home Page", slug: "/", pageType: "landing", seo: { title: "Satyakabir Technologies — AI & Product Engineering", description: "Satyakabir Technologies builds AI-first platforms, cloud estates, and product software." } },
      { title: "Services & Capabilities", slug: "/services", pageType: "hub", seo: { title: "Engineering Services | Satyakabir", description: "Our end-to-end digital engineering capabilities." } },
      { title: "AI & Machine Learning", slug: "/services/ai-development", pageType: "service", seo: { title: "AI & Machine Learning Development | Satyakabir", description: "Agentic AI workflows, LLM fine-tuning, and machine learning platforms." } },
      { title: "Cloud & DevOps Engineering", slug: "/services/cloud-native", pageType: "service", seo: { title: "Cloud Native & DevOps | Satyakabir", description: "Multi-cloud architecture, Kubernetes, and automated CI/CD pipelines." } },
      { title: "Mobile & Web Applications", slug: "/services/mobile-apps", pageType: "service", seo: { title: "Mobile & Web App Engineering | Satyakabir", description: "Cross-platform mobile apps and high-performance Next.js web applications." } },
      { title: "About Satyakabir", slug: "/company/about-us", pageType: "company", seo: { title: "About Satyakabir Technologies", description: "Learn about our mission, leadership, and engineering principles." } },
      { title: "Our Story & Journey", slug: "/company/our-story", pageType: "company", seo: { title: "Our Journey | Satyakabir", description: "The evolution of Satyakabir Technologies." } },
      { title: "Careers & Open Positions", slug: "/careers", pageType: "careers", seo: { title: "Careers | Satyakabir Technologies", description: "Join our principal-led engineering team." } },
      { title: "Contact Engineering Team", slug: "/contact", pageType: "contact", seo: { title: "Contact Us | Satyakabir", description: "Get in touch with our solutions team." } },
      { title: "Case Studies & Portfolio", slug: "/work", pageType: "portfolio", seo: { title: "Featured Case Studies | Satyakabir", description: "Explore our recent enterprise projects and client successes." } },
      { title: "Insights & Whitepapers", slug: "/insights", pageType: "insights", seo: { title: "Technology Insights | Satyakabir", description: "Deep dives on AI, cloud architecture, and web engineering." } },
    ];

    let count = 0;
    for (const pageDef of DEFAULT_PAGES) {
      const existing = await WebsitePage.findOne({ slug: pageDef.slug });
      if (!existing) {
        await WebsitePage.create({
          title: pageDef.title,
          slug: pageDef.slug,
          pageType: pageDef.pageType,
          status: "PUBLISHED",
          seo: pageDef.seo,
          draftBlocks: [
            {
              id: `blk_${Date.now()}_${count}`,
              type: "hero",
              order: 0,
              data: {
                headline: pageDef.title,
                subheadline: pageDef.seo.description,
                badgeText: "Satyakabir Technologies",
                primaryCta: { label: "Contact Engineering", href: "/contact" },
              },
            },
          ],
          version: 1,
          createdBy: 1,
          updatedBy: 1,
        });
        count++;
      }
    }

    console.log(`Seeding completed! Inserted ${count} new default pages into MongoDB.`);
    const totalCount = await WebsitePage.countDocuments();
    console.log(`Total Pages now in WebsitePage collection: ${totalCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

runSeed();
