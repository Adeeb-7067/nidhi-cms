import asyncHandler from "express-async-handler";
import { websitePagesTable } from "../schema/WebsitePage.js";
import { websiteRevisionsTable } from "../schema/WebsiteRevision.js";
import { websiteSettingsTable } from "../schema/WebsiteSettings.js";
import { resolveRedirectPath } from "../services/redirect.service.js";
import { queueInquiryOutbox } from "../services/crm-hrm-outbox.service.js";

/**
 * Public Endpoint: Fetches published page block bundle by slug.
 * GET /api/v1/website/pages/by-slug?slug=/services/ai
 */
export const getPublicPageBySlug = asyncHandler(async (req, res) => {
  const rawSlug = req.query.slug || req.params.slug || "/";
  const slug = String(rawSlug).toLowerCase().trim();

  // 1. Check Redirect Engine
  const redirect = await resolveRedirectPath(slug);
  if (redirect) {
    return res.status(redirect.statusCode).json({
      redirect: true,
      toPath: redirect.toPath,
      statusCode: redirect.statusCode,
    });
  }

  // 2. Fetch Published Page
  const page = await websitePagesTable
    .findOne({ slug, status: "PUBLISHED" })
    .populate("publishedRevisionId")
    .lean();

  if (!page || !page.publishedRevisionId) {
    return res.status(404).json({ error: "Page not found", slug });
  }

  const revision = page.publishedRevisionId;

  return res.json({
    id: page._id,
    title: page.title,
    slug: page.slug,
    pageType: page.pageType,
    publishedAt: page.publishedAt,
    seo: page.seo,
    blocks: revision.blocksSnapshot || [],
    revisionNumber: revision.revisionNumber,
  });
});

/**
 * Public Endpoint: Returns global header/footer navigation link trees and site SEO defaults.
 * GET /api/v1/website/navigation
 */
export const getPublicNavigation = asyncHandler(async (_req, res) => {
  let settings = await websiteSettingsTable.findOne().lean();
  if (!settings) {
    settings = await websiteSettingsTable.create({});
  }

  return res.json({
    brandName: settings.brandName,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    address: settings.address,
    headerMenu: settings.headerMenu || [],
    footerMenu: settings.footerMenu || [],
    socialLinks: settings.socialLinks || {},
    seoDefaults: settings.seoDefaults || {},
    theme: settings.theme || {},
  });
});

/**
 * Public Endpoint: Form intake for contact inquiries and project cost estimators.
 * POST /api/v1/website/inquire
 */
export const submitPublicInquiry = asyncHandler(async (req, res) => {
  const { name, email, phone, company, message, projectType, budget } = req.body || {};

  if (!email || !name) {
    return res.status(400).json({ error: "Name and email address are required" });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone ? String(phone).trim() : "",
    company: company ? String(company).trim() : "",
    message: message ? String(message).trim() : "",
    projectType: projectType ? String(projectType).trim() : "",
    budget: budget ? String(budget).trim() : "",
    submittedAt: new Date(),
    ip: req.ip,
  };

  const outboxItem = await queueInquiryOutbox({
    targetSystem: "CRM",
    payload,
  });

  return res.status(200).json({
    success: true,
    message: "Thank you for reaching out! Our team will get back to you shortly.",
    referenceId: outboxItem.inquiryId,
  });
});

/**
 * Public Endpoint: Job application form intake.
 * POST /api/v1/website/careers/apply
 */
export const submitPublicJobApplication = asyncHandler(async (req, res) => {
  const { name, email, phone, jobSlug, resumeUrl, linkedinUrl, coverLetter } = req.body || {};

  if (!email || !name || !jobSlug) {
    return res.status(400).json({ error: "Name, email, and job vacancy slug are required" });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone ? String(phone).trim() : "",
    jobSlug: String(jobSlug).trim(),
    resumeUrl: resumeUrl ? String(resumeUrl).trim() : "",
    linkedinUrl: linkedinUrl ? String(linkedinUrl).trim() : "",
    coverLetter: coverLetter ? String(coverLetter).trim() : "",
    appliedAt: new Date(),
  };

  const outboxItem = await queueInquiryOutbox({
    targetSystem: "HRM",
    payload,
  });

  return res.status(200).json({
    success: true,
    message: "Application submitted successfully!",
    referenceId: outboxItem.inquiryId,
  });
});

/**
 * Public Endpoint: Returns array of published page slugs and update timestamps for dynamic Next.js sitemap.xml generation.
 * GET /api/v1/website/sitemap
 */
export const getPublicSitemap = asyncHandler(async (_req, res) => {
  const pages = await websitePagesTable
    .find({ status: "PUBLISHED" })
    .select("slug updatedAt publishedAt pageType")
    .lean();

  return res.json({
    pages: pages.map((p) => ({
      slug: p.slug,
      lastModified: p.updatedAt || p.publishedAt,
      pageType: p.pageType,
    })),
  });
});
