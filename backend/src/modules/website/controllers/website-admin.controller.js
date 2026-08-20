import asyncHandler from "express-async-handler";
import { websitePagesTable } from "../schema/WebsitePage.js";
import { websiteRevisionsTable } from "../schema/WebsiteRevision.js";
import { websiteRedirectsTable } from "../schema/WebsiteRedirect.js";
import { websiteMediaTable } from "../schema/WebsiteMedia.js";
import { websiteSettingsTable } from "../schema/WebsiteSettings.js";
import { websiteInquiryOutboxTable } from "../schema/WebsiteInquiryOutbox.js";
import { validateBlockArray } from "../services/block-engine.service.js";
import {
  executePublishPage,
  rollbackPageRevision,
  schedulePagePublish,
} from "../services/publishing.service.js";
import { generatePreviewToken } from "../services/preview.service.js";
import { createRedirectRule } from "../services/redirect.service.js";
import {
  generatePresignedMediaUploadUrl,
  confirmMediaUpload,
} from "../services/media.service.js";

/**
 * Admin: List pages with status filter & pagination.
 * GET /api/v1/admin/website/pages
 */
export const listAdminPages = asyncHandler(async (req, res) => {
  const { status, pageType, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (pageType) filter.pageType = pageType;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [rawPages, total] = await Promise.all([
    websitePagesTable
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    websitePagesTable.countDocuments(filter),
  ]);

  const pages = rawPages.map((p) => ({
    ...p,
    blocks: p.draftBlocks || p.blocks || [],
  }));

  return res.json({
    pages,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Admin: Create a new page draft.
 * POST /api/v1/admin/website/pages
 */
export const createAdminPage = asyncHandler(async (req, res) => {
  const { title, slug, pageType, blocks = [], draftBlocks = [], seo = {} } = req.body;
  const inputBlocks = blocks.length ? blocks : draftBlocks;

  if (!title || !slug) {
    return res.status(400).json({ error: "Title and slug are required" });
  }

  const cleanSlug = String(slug).toLowerCase().trim();
  const existing = await websitePagesTable.findOne({ slug: cleanSlug });
  if (existing) {
    return res.status(400).json({ error: `Page with slug '${cleanSlug}' already exists` });
  }

  const validatedBlocks = inputBlocks.length ? validateBlockArray(inputBlocks) : [];

  const page = await websitePagesTable.create({
    title: String(title).trim(),
    slug: cleanSlug,
    pageType: pageType || "standard",
    status: "DRAFT",
    draftBlocks: validatedBlocks,
    seo,
    version: 1,
    createdBy: req.user?.id || 1,
    updatedBy: req.user?.id || 1,
  });

  const obj = page.toObject();
  obj.blocks = obj.draftBlocks || [];
  return res.status(201).json(obj);
});

/**
 * Admin: Fetch single page draft by ID with historic revisions.
 * GET /api/v1/admin/website/pages/:id
 */
export const getAdminPageById = asyncHandler(async (req, res) => {
  const page = await websitePagesTable.findById(req.params.id).lean();
  if (!page) return res.status(404).json({ error: "Page not found" });

  const revisions = await websiteRevisionsTable
    .find({ pageId: page._id })
    .sort({ revisionNumber: -1 })
    .select("-blocksSnapshot -seoSnapshot")
    .lean();

  return res.json({ ...page, blocks: page.draftBlocks || page.blocks || [], revisions });
});

/**
 * Admin: Update page draft with Optimistic Locking version check.
 * PUT /api/v1/admin/website/pages/:id
 */
export const updateAdminPageDraft = asyncHandler(async (req, res) => {
  const { title, slug, draftBlocks, seo, version } = req.body;

  if (typeof version !== "number") {
    return res.status(400).json({ error: "Version number is required for optimistic locking check" });
  }

  const page = await websitePagesTable.findById(req.params.id);
  if (!page) return res.status(404).json({ error: "Page not found" });

  if (page.version !== version) {
    return res.status(409).json({
      error: "Conflict: Page was updated by another editor. Reload before saving.",
      currentVersion: page.version,
    });
  }

  const inputBlocks = draftBlocks || req.body.blocks;
  if (inputBlocks) {
    page.draftBlocks = validateBlockArray(inputBlocks);
  }
  if (title) page.title = String(title).trim();
  if (seo) page.seo = seo;

  // Handle slug change & auto-redirect creation
  if (slug && String(slug).toLowerCase().trim() !== page.slug) {
    const newSlug = String(slug).toLowerCase().trim();
    const existing = await websitePagesTable.findOne({ slug: newSlug });
    if (existing && String(existing._id) !== String(page._id)) {
      return res.status(400).json({ error: `Slug '${newSlug}' is already taken` });
    }

    if (page.status === "PUBLISHED") {
      await createRedirectRule({
        fromPath: page.slug,
        toPath: newSlug,
        statusCode: 301,
        createdReason: "slug_change",
        userId: req.user?.id || 1,
      });
    }

    page.slug = newSlug;
  }

  page.version += 1;
  page.updatedBy = req.user?.id || 1;
  await page.save();

  const obj = page.toObject();
  obj.blocks = obj.draftBlocks || [];
  return res.json(obj);
});

/**
 * Admin: Delete page.
 * DELETE /api/v1/admin/website/pages/:id
 */
export const deleteAdminPage = asyncHandler(async (req, res) => {
  const page = await websitePagesTable.findById(req.params.id);
  if (!page) return res.status(404).json({ error: "Page not found" });

  await Promise.all([
    websitePagesTable.deleteOne({ _id: page._id }),
    websiteRevisionsTable.deleteMany({ pageId: page._id }),
  ]);

  return res.json({ success: true, message: "Page and revisions deleted" });
});

/**
 * Admin: Publish page.
 * POST /api/v1/admin/website/pages/:id/publish
 */
export const publishAdminPageController = asyncHandler(async (req, res) => {
  const { changeSummary } = req.body || {};
  const publishedPage = await executePublishPage({
    pageId: req.params.id,
    authorId: req.user?.id || 1,
    changeSummary,
  });

  return res.json({ success: true, page: publishedPage });
});

/**
 * Admin: Rollback page to historic revision.
 * POST /api/v1/admin/website/pages/:id/rollback
 */
export const rollbackAdminPageController = asyncHandler(async (req, res) => {
  const { revisionId } = req.body;
  if (!revisionId) return res.status(400).json({ error: "Target revisionId is required" });

  const rolledBackPage = await rollbackPageRevision({
    pageId: req.params.id,
    revisionId,
    userId: req.user?.id || 1,
  });

  return res.json({ success: true, page: rolledBackPage });
});

/**
 * Admin: Schedule future page publish.
 * POST /api/v1/admin/website/pages/:id/schedule
 */
export const scheduleAdminPagePublishController = asyncHandler(async (req, res) => {
  const { scheduledPublishAt } = req.body;
  const page = await schedulePagePublish({
    pageId: req.params.id,
    scheduledPublishAt,
    userId: req.user?.id || 1,
  });

  return res.json({ success: true, page });
});

/**
 * Admin: List historic revisions for page.
 * GET /api/v1/admin/website/pages/:id/revisions
 */
export const listPageRevisionsController = asyncHandler(async (req, res) => {
  const revisions = await websiteRevisionsTable
    .find({ pageId: req.params.id })
    .sort({ revisionNumber: -1 })
    .lean();

  return res.json(revisions);
});

/**
 * Admin: Generate signed preview token for page draft.
 * POST /api/v1/admin/website/pages/:id/preview-token
 */
export const generateAdminPreviewTokenController = asyncHandler(async (req, res) => {
  const page = await websitePagesTable.findById(req.params.id).select("slug").lean();
  if (!page) return res.status(404).json({ error: "Page not found" });

  const { token, expiresAt } = generatePreviewToken(page._id, req.user?.id || 1);
  return res.json({ token, expiresAt, slug: page.slug });
});

/**
 * Admin: DigitalOcean Spaces pre-signed upload URL request.
 * POST /api/v1/admin/website/media/presigned-url
 */
export const requestPresignedUrlController = asyncHandler(async (req, res) => {
  const { fileName, fileType, fileSize } = req.body;
  if (!fileName || !fileType || !fileSize) {
    return res.status(400).json({ error: "fileName, fileType, and fileSize are required" });
  }

  const result = await generatePresignedMediaUploadUrl({
    fileName,
    fileType,
    fileSize,
    userId: req.user?.id || 1,
  });

  return res.json(result);
});

/**
 * Admin: Confirm uploaded media asset.
 * POST /api/v1/admin/website/media/confirm
 */
export const confirmMediaUploadController = asyncHandler(async (req, res) => {
  const media = await confirmMediaUpload({
    ...req.body,
    userId: req.user?.id || 1,
  });

  return res.status(201).json(media);
});

/**
 * Admin: List media assets gallery.
 * GET /api/v1/admin/website/media
 */
export const listAdminMedia = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    websiteMediaTable
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    websiteMediaTable.countDocuments(),
  ]);

  return res.json({ items, total });
});

/**
 * Admin: Delete media asset by ID.
 * DELETE /api/v1/admin/website/media/:id
 */
export const deleteAdminMediaController = asyncHandler(async (req, res) => {
  const media = await websiteMediaTable.findByIdAndDelete(req.params.id);
  if (!media) return res.status(404).json({ error: "Media asset not found" });
  return res.json({ success: true, message: "Media asset deleted successfully" });
});

/**
 * Admin: List 301/302 redirects.
 * GET /api/v1/admin/website/redirects
 */
export const listAdminRedirects = asyncHandler(async (_req, res) => {
  const redirects = await websiteRedirectsTable.find().sort({ createdAt: -1 }).lean();
  return res.json(redirects);
});

/**
 * Admin: Create manual 301/302 redirect.
 * POST /api/v1/admin/website/redirects
 */
export const createAdminRedirectController = asyncHandler(async (req, res) => {
  const { fromPath, toPath, statusCode = 301 } = req.body;
  const redirect = await createRedirectRule({
    fromPath,
    toPath,
    statusCode,
    createdReason: "manual",
    userId: req.user?.id || 1,
  });

  return res.status(201).json(redirect);
});

/**
 * Admin: Delete redirect rule.
 * DELETE /api/v1/admin/website/redirects/:id
 */
export const deleteAdminRedirectController = asyncHandler(async (req, res) => {
  await websiteRedirectsTable.deleteOne({ _id: req.params.id });
  return res.json({ success: true, message: "Redirect deleted" });
});

/**
 * Admin: Get global site settings.
 * GET /api/v1/admin/website/settings
 */
export const getAdminSettingsController = asyncHandler(async (_req, res) => {
  let settings = await websiteSettingsTable.findOne().lean();
  if (!settings) settings = await websiteSettingsTable.create({});
  return res.json(settings);
});

/**
 * Admin: Update global site settings.
 * PUT /api/v1/admin/website/settings
 */
export const updateAdminSettingsController = asyncHandler(async (req, res) => {
  let settings = await websiteSettingsTable.findOne();
  if (!settings) settings = new websiteSettingsTable({});

  const { brandName, contactEmail, contactPhone, address, headerMenu, footerMenu, socialLinks, seoDefaults } = req.body;

  if (brandName) settings.brandName = brandName;
  if (contactEmail) settings.contactEmail = contactEmail;
  if (contactPhone) settings.contactPhone = contactPhone;
  if (address) settings.address = address;
  if (headerMenu) settings.headerMenu = headerMenu;
  if (footerMenu) settings.footerMenu = footerMenu;
  if (socialLinks) settings.socialLinks = socialLinks;
  if (seoDefaults) settings.seoDefaults = seoDefaults;

  settings.updatedBy = req.user?.id || 1;
  await settings.save();

  return res.json(settings);
});

/**
 * Admin: List outbox inquiries & delivery status.
 * GET /api/v1/admin/website/outbox
 */
export const listAdminOutboxInquiries = asyncHandler(async (req, res) => {
  const { status, targetSystem, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (targetSystem) filter.targetSystem = targetSystem;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    websiteInquiryOutboxTable
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    websiteInquiryOutboxTable.countDocuments(filter),
  ]);

  return res.json({ items, total });
});

/**
 * Admin: Seed/Sync all default static website pages into CMS MongoDB.
 * POST /api/v1/admin/website/seed-default-pages
 */
export const seedDefaultPages = asyncHandler(async (req, res) => {
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

  let seededCount = 0;
  for (const pageDef of DEFAULT_PAGES) {
    const existing = await websitePagesTable.findOne({ slug: pageDef.slug });
    if (!existing) {
      await websitePagesTable.create({
        title: pageDef.title,
        slug: pageDef.slug,
        pageType: pageDef.pageType,
        status: "PUBLISHED",
        seo: pageDef.seo,
        blocks: [
          {
            id: `blk_${Date.now()}_${seededCount}`,
            type: "hero",
            order: 0,
            data: {
              headline: pageDef.title,
              subheadline: pageDef.seo.description,
              badgeText: "Satyakabir Technologies",
              primaryCta: { label: "Contact Engineering", href: "/contact" },
            },
          },
          {
            id: `blk_${Date.now()}_${seededCount}_stats`,
            type: "stats",
            order: 1,
            data: {
              items: [
                { label: "Active Clients", value: "500+" },
                { label: "Uptime SLA", value: "99.99%" },
                { label: "Global Regions", value: "24+" },
                { label: "Engineers", value: "150+" },
              ],
            },
          },
          {
            id: `blk_${Date.now()}_${seededCount}_cta`,
            type: "cta",
            order: 2,
            data: {
              title: "Ready to scale your digital platform?",
              buttonText: "Get In Touch",
              buttonUrl: "/contact",
            },
          },
        ],
        draftVersion: 1,
        publishedVersion: 1,
        publishedAt: new Date(),
        createdBy: 1,
        updatedBy: 1,
      });
      seededCount++;
    }
  }

  return res.json({ message: "Default pages seed completed", seededCount });
});
