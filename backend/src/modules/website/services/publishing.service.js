import mongoose from "mongoose";
import { websitePagesTable } from "../schema/WebsitePage.js";
import { websiteRevisionsTable } from "../schema/WebsiteRevision.js";
import { websiteInquiryOutboxTable } from "../schema/WebsiteInquiryOutbox.js";
import { validateBlockArray } from "./block-engine.service.js";

/**
 * Atomically freezes a revision snapshot and updates the page state to PUBLISHED.
 */
export async function executePublishPage({ pageId, authorId, changeSummary = "" }) {
  const mongooseSession = await mongoose.startSession();
  let publishedPage = null;
  let newRevisionNumber = 1;

  try {
    await mongooseSession.withTransaction(async () => {
      const page = await websitePagesTable.findById(pageId).session(mongooseSession);
      if (!page) {
        throw new Error("Page not found");
      }

      // 1. Validate block schemas with Zod
      const validatedBlocks = validateBlockArray(page.draftBlocks);

      // 2. Determine next revision number
      const lastRev = await websiteRevisionsTable
        .findOne({ pageId: page._id })
        .sort({ revisionNumber: -1 })
        .session(mongooseSession);

      newRevisionNumber = (lastRev?.revisionNumber || 0) + 1;

      // 3. Create immutable revision snapshot
      const [revision] = await websiteRevisionsTable.create(
        [
          {
            pageId: page._id,
            revisionNumber: newRevisionNumber,
            blocksSnapshot: validatedBlocks,
            seoSnapshot: page.seo,
            changeSummary: changeSummary || `Published revision #${newRevisionNumber}`,
            authorId,
          },
        ],
        { session: mongooseSession }
      );

      // 4. Update page published state
      page.publishedRevisionId = revision._id;
      page.publishedAt = new Date();
      page.status = "PUBLISHED";
      page.scheduledPublishAt = null;
      page.version += 1;
      page.updatedBy = authorId;

      await page.save({ session: mongooseSession });
      publishedPage = page;
    });
  } finally {
    await mongooseSession.endSession();
  }

  // 5. Queue Webhook outbox item for Next.js cache revalidation
  await websiteInquiryOutboxTable.create({
    inquiryId: `wh_pub_${publishedPage._id}_${Date.now()}`,
    targetSystem: "WEBHOOK",
    payload: {
      event: "website.page.published",
      slug: publishedPage.slug,
      revisionNumber: newRevisionNumber,
      tags: [`website:page:${publishedPage.slug}`, `website:${publishedPage.pageType}`],
    },
    status: "PENDING",
  });

  return publishedPage;
}

/**
 * Rolls back a live published page to a historic revision snapshot.
 */
export async function rollbackPageRevision({ pageId, revisionId, userId }) {
  const targetRev = await websiteRevisionsTable.findById(revisionId).lean();
  if (!targetRev || String(targetRev.pageId) !== String(pageId)) {
    throw new Error("Target revision not found for this page");
  }

  const page = await websitePagesTable.findById(pageId);
  if (!page) {
    throw new Error("Page not found");
  }

  // Set draft blocks to target snapshot and execute publish
  page.draftBlocks = targetRev.blocksSnapshot;
  page.seo = targetRev.seoSnapshot;
  page.updatedBy = userId;
  await page.save();

  return executePublishPage({
    pageId: page._id,
    authorId: userId,
    changeSummary: `Rollback to historic revision #${targetRev.revisionNumber}`,
  });
}

/**
 * Schedules a page to be published at a future timestamp.
 */
export async function schedulePagePublish({ pageId, scheduledPublishAt, userId }) {
  const publishDate = new Date(scheduledPublishAt);
  if (!Number.isFinite(publishDate.getTime()) || publishDate <= new Date()) {
    throw new Error("Scheduled publish date must be a valid future timestamp");
  }

  const page = await websitePagesTable.findById(pageId);
  if (!page) throw new Error("Page not found");

  page.scheduledPublishAt = publishDate;
  page.updatedBy = userId;
  await page.save();

  return page;
}
