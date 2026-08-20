import crypto from "crypto";
import { websiteInquiryOutboxTable } from "../schema/WebsiteInquiryOutbox.js";
import { clientsTable, getNextSequence } from "../../../models/schema/index.js";
import { logger } from "../../../lib/logger.js";

/**
 * Queue an inquiry or webhook event to the asynchronous outbox.
 */
export async function queueInquiryOutbox({ inquiryId, targetSystem, payload }) {
  return websiteInquiryOutboxTable.create({
    inquiryId: inquiryId || `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    targetSystem,
    payload,
    status: "PENDING",
    attempts: 0,
    nextRetryAt: new Date(),
  });
}

/**
 * Background worker task processing pending outbox entries.
 * Can be executed via setInterval or PM2 background tick.
 */
export async function processWebsiteOutboxQueue() {
  const pendingItems = await websiteInquiryOutboxTable
    .find({
      status: { $in: ["PENDING", "FAILED"] },
      attempts: { $lt: 5 },
      nextRetryAt: { $lte: new Date() },
    })
    .limit(10);

  if (!pendingItems.length) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const item of pendingItems) {
    try {
      item.status = "PROCESSING";
      await item.save();

      if (item.targetSystem === "CRM") {
        await processCrmLeadIntake(item.payload);
      } else if (item.targetSystem === "HRM") {
        await processHrmApplicantIntake(item.payload);
      } else if (item.targetSystem === "WEBHOOK") {
        await processWebhookRevalidation(item.payload, item.inquiryId);
      }

      item.status = "SENT";
      item.lastError = null;
      await item.save();
      processed++;
    } catch (err) {
      errors++;
      const nextAttempts = item.attempts + 1;
      const backoffMs = Math.pow(2, nextAttempts) * 60000; // Exponential backoff: 2m, 4m, 8m, 16m...

      item.attempts = nextAttempts;
      item.status = nextAttempts >= 5 ? "FAILED" : "FAILED";
      item.lastError = err.message || "Outbox processing failed";
      item.nextRetryAt = new Date(Date.now() + backoffMs);
      await item.save();

      logger.error(
        { err, inquiryId: item.inquiryId, attempts: nextAttempts },
        "Website outbox worker processing error"
      );
    }
  }

  return { processed, errors };
}

/**
 * Pipes website contact / estimator form lead directly to CRM clients collection as a Prospect.
 */
async function processCrmLeadIntake(payload) {
  const email = payload.email?.toLowerCase().trim();
  if (!email) throw new Error("Missing lead email address");

  const existing = await clientsTable.findOne({ email });
  if (existing) {
    // Append inquiry details to primary contact / notes
    return existing;
  }

  const nextId = await getNextSequence("clients");
  return clientsTable.create({
    id: nextId,
    companyName: payload.company || payload.name || "Website Lead",
    contactPerson: payload.name || "Website Inquiry",
    email,
    phone: payload.phone || "",
    status: "prospect",
    customerType: "corporate",
    notes: `Source: Website Contact Form. Message: ${payload.message || "N/A"}. Project Type: ${payload.projectType || "N/A"}. Budget: ${payload.budget || "N/A"}.`,
  });
}

/**
 * Handles job application intake for HRM candidate pipeline.
 */
async function processHrmApplicantIntake(payload) {
  const email = payload.email?.toLowerCase().trim();
  if (!email) throw new Error("Missing applicant email address");

  logger.info(
    { email, jobSlug: payload.jobSlug, resumeUrl: payload.resumeUrl },
    "Website job application received in HRM outbox pipeline"
  );
  return true;
}

/**
 * Dispatches HMAC-SHA256 signed webhook payload to Next.js /api/revalidate.
 */
async function processWebhookRevalidation(payload, inquiryId) {
  const revalidateUrl = process.env.NEXTJS_REVALIDATE_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET || "satyakabir-cms-webhook-secret-2026";

  if (!revalidateUrl) {
    logger.warn("Skipping webhook dispatch: NEXTJS_REVALIDATE_URL not configured in environment");
    return true;
  }

  const timestamp = Date.now();
  const bodyText = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${bodyText}`)
    .digest("hex");

  const response = await fetch(revalidateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CMS-Signature": `t=${timestamp},v1=${signature}`,
      "X-CMS-Event-Id": inquiryId,
    },
    body: bodyText,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Webhook endpoint returned HTTP ${response.status}: ${errorText}`);
  }

  return true;
}
