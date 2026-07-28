import path from "path";
import fs from "fs/promises";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  usersTable,
  clientsTable,
  projectsTable,
  bugsTable,
  commentsTable,
  inventoryResourcesTable,
  apkReleasesTable,
  companySettingsTable,
  employeeDocumentsTable,
  hrmPoliciesTable,
  candidatesTable,
  hrmLettersTable,
  marketingMediaItemsTable,
  FinanceExpenses,
} from "../../../models/schema/index.js";
import { isObjectStorageEnabled, getS3Client } from "../../../lib/object-storage.js";
import { deleteStoredFile } from "../../../lib/file-storage.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";

const SELF_MANAGED_CATEGORIES = ["screenshots", "reports"];

const SOURCES = [
  { label: "User avatars", model: usersTable, fields: ["avatarUrl"] },
  { label: "User resumes/ID proofs", model: usersTable, fields: ["resumeUrl", "idProofUrl", "addressProofUrl", "certificateUrls"] },
  { label: "User profile documents", model: usersTable, fields: ["profileDocuments.fileUrl"] },
  { label: "Client logos", model: clientsTable, fields: ["logoUrl", "logo"] },
  { label: "Client documents", model: clientsTable, fields: ["documents.url"] },
  { label: "Project logos", model: projectsTable, fields: ["logoUrl"] },
  { label: "Bug attachments", model: bugsTable, fields: ["attachments.url"] },
  { label: "Comment attachments", model: commentsTable, fields: ["attachmentUrl"] },
  { label: "Inventory resources", model: hrmPoliciesTable, fields: ["url", "fileUrl"] },
  { label: "Inventory resources 2", model: inventoryResourcesTable, fields: ["url", "fileUrl"] },
  { label: "APK releases", model: apkReleasesTable, fields: ["fileUrl"] },
  { label: "Company branding", model: companySettingsTable, fields: ["logoUrl", "sealUrl"] },
  { label: "HRM employee documents", model: employeeDocumentsTable, fields: ["fileUrl"] },
  { label: "HRM policies", model: hrmPoliciesTable, fields: ["fileUrl"] },
  { label: "Recruitment resumes", model: candidatesTable, fields: ["resumeUrl"] },
  { label: "HRM letters", model: hrmLettersTable, fields: ["pdfUrl"] },
  { label: "Marketing media vault", model: marketingMediaItemsTable, fields: ["url", "storageKey"] },
  { label: "Finance expense attachments", model: FinanceExpenses, fields: ["attachments.url", "attachments.key"] },
];

function extractUrls(doc, fieldPath) {
  if (fieldPath.includes(".")) {
    const [arrayField, subField] = fieldPath.split(".");
    const arr = doc[arrayField];
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => item?.[subField]).filter(Boolean);
  }
  const value = doc[fieldPath];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

/** Normalize a stored URL or raw object key into the bucket-relative key used by list/delete. */
function urlToKey(urlOrKey) {
  if (!urlOrKey) return null;
  if (/^https?:\/\//i.test(urlOrKey)) {
    try {
      return new URL(urlOrKey).pathname.slice(1);
    } catch {
      return null;
    }
  }
  if (urlOrKey.startsWith("/uploads/")) return urlOrKey.slice("/uploads/".length);
  // Raw storage keys (e.g. ClientManagement-CMS/marketing/…)
  if (!urlOrKey.includes("://") && !urlOrKey.startsWith("/")) return urlOrKey;
  return null;
}

async function collectReferencedKeys() {
  const referenced = new Set();
  for (const source of SOURCES) {
    if (!source.model) continue;
    const docs = await source.model.find({}).lean();
    for (const doc of docs) {
      for (const field of source.fields) {
        for (const url of extractUrls(doc, field)) {
          const key = urlToKey(url);
          if (key) {
            referenced.add(key);
          }
        }
      }
    }
  }
  return referenced;
}

function isSelfManaged(key) {
  return SELF_MANAGED_CATEGORIES.some((cat) => key.includes(`/${cat}/`));
}

async function listObjectStorageFiles() {
  const client = getS3Client();
  const bucket = process.env.LINODE_OBJECT_BUCKET;
  const files = [];
  let continuationToken;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    for (const obj of res.Contents ?? []) {
      files.push({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return files;
}

async function listLocalUploadFiles() {
  const uploadDir = path.join(process.cwd(), "uploads");
  const files = [];
  async function walk(dir, prefix) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), rel);
      } else {
        const stat = await fs.stat(path.join(dir, entry.name));
        files.push({ key: rel, size: stat.size, lastModified: stat.mtime });
      }
    }
  }
  await walk(uploadDir, "");
  return files;
}

async function runStorageCleanup() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping storage cleanup: database not connected");
    return;
  }

  logger.info("Starting storage cleanup background job...");
  try {
    const referenced = await collectReferencedKeys();
    const stored = isObjectStorageEnabled()
      ? await listObjectStorageFiles()
      : await listLocalUploadFiles();

    // Identify unreferenced files that are older than 24 hours (avoiding race conditions with current uploads)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orphaned = stored.filter((f) => !isSelfManaged(f.key) && !referenced.has(f.key) && f.lastModified < oneDayAgo);

    logger.info(`Found ${orphaned.length} orphaned files to purge.`);

    let purgedCount = 0;
    for (const f of orphaned) {
      try {
        const fileUrl = isObjectStorageEnabled()
          ? `https://dummy-bucket-domain.com/${f.key}`
          : `/uploads/${f.key}`;
        await deleteStoredFile(fileUrl);
        purgedCount++;
      } catch (err) {
        logger.error({ err, key: f.key }, "Failed to delete orphaned stored file");
      }
    }
    logger.info(`Storage cleanup completed. Purged ${purgedCount} of ${orphaned.length} files.`);
  } catch (err) {
    logger.error({ err }, "Storage cleanup background job failed");
  }
}

function startStorageCleanupJob() {
  // Run once every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000;
  const tick = () => {
    runStorageCleanup().catch((err) =>
      logger.error({ err }, "Storage cleanup execution error"),
    );
  };
  // Run on startup after a 1-minute delay to allow the server boot sequence to stabilize
  setTimeout(tick, 60 * 1000);
  setInterval(tick, intervalMs);
  return tick;
}

export { runStorageCleanup, startStorageCleanupJob };
