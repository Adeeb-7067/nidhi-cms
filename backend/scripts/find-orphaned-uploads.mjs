/**
 * Read-only report of stored files under the CMS folder (BUCKET_FOLDER_PATH)
 * that don't appear to be referenced by any known DB field.
 *
 * Does NOT delete anything — ever. For manual review only.
 * Object listing is hard-scoped to the CMS prefix so other projects on a shared
 * bucket are never reported (or touched).
 *
 * Usage: node --env-file=.env ./scripts/find-orphaned-uploads.mjs
 */
import path from "path";
import fs from "fs/promises";
import mongoose from "mongoose";
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
} from "../src/models/schema/index.js";
import { isObjectStorageEnabled, getS3Client, getBucketFolderPrefix, isCmsObjectKey, objectKeyFromStoredRef } from "../src/lib/object-storage.js";

// Categories with their own dedicated retention/purge job — not "orphaned", just
// not-yet-expired. Excluded from this report to avoid noise.
const SELF_MANAGED_CATEGORIES = ["screenshots", "reports"];

// Each entry names a DB field (or array.subfield) that stores a file URL.
const SOURCES = [
  { label: "User avatars", model: usersTable, fields: ["avatarUrl"] },
  { label: "User resumes/ID proofs", model: usersTable, fields: ["resumeUrl", "idProofUrl", "addressProofUrl", "certificateUrls"] },
  { label: "User profile documents", model: usersTable, fields: ["profileDocuments.fileUrl"] },
  { label: "Client logos", model: clientsTable, fields: ["logoUrl", "logo"] },
  { label: "Client documents", model: clientsTable, fields: ["documents.url"] },
  { label: "Project logos", model: projectsTable, fields: ["logoUrl"] },
  { label: "Bug attachments", model: bugsTable, fields: ["attachments.url"] },
  { label: "Comment attachments", model: commentsTable, fields: ["attachmentUrl"] },
  { label: "Inventory resources", model: inventoryResourcesTable, fields: ["url", "fileUrl"] },
  { label: "APK releases", model: apkReleasesTable, fields: ["fileUrl"] },
  { label: "Company branding", model: companySettingsTable, fields: ["logoUrl", "sealUrl"] },
  { label: "HRM employee documents", model: employeeDocumentsTable, fields: ["fileUrl"] },
  { label: "HRM policies", model: hrmPoliciesTable, fields: ["fileUrl"] },
  { label: "Recruitment resumes", model: candidatesTable, fields: ["resumeUrl"] },
  { label: "HRM letters", model: hrmLettersTable, fields: ["pdfUrl"] },
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

/** Convert a stored URL into a comparable key: object-storage key, or /uploads/-relative path. */
function urlToKey(url) {
  return objectKeyFromStoredRef(url);
}

async function collectReferencedKeys() {
  const referenced = new Set();
  let totalRefs = 0;
  for (const source of SOURCES) {
    const docs = await source.model.find({}).lean();
    for (const doc of docs) {
      for (const field of source.fields) {
        for (const url of extractUrls(doc, field)) {
          const key = urlToKey(url);
          if (key) {
            referenced.add(key);
            totalRefs++;
          }
        }
      }
    }
  }
  console.log(`Collected ${referenced.size} unique referenced file(s) (${totalRefs} raw references) across ${SOURCES.length} sources.`);
  return referenced;
}

function isSelfManaged(key) {
  return SELF_MANAGED_CATEGORIES.some((cat) => key.includes(`/${cat}/`));
}

async function listObjectStorageFiles() {
  const client = getS3Client();
  const bucket = process.env.LINODE_OBJECT_BUCKET;
  // Only scan the CMS folder — the bucket may be shared with other projects.
  const prefix = getBucketFolderPrefix();
  const files = [];
  let continuationToken;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || !isCmsObjectKey(obj.Key)) continue;
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) throw new Error("DATABASE_URL is not defined");

  console.log("Connecting to database...");
  await mongoose.connect(uri);

  const referenced = await collectReferencedKeys();

  const backend = isObjectStorageEnabled() ? "object storage" : "local uploads/";
  const cmsPrefix = isObjectStorageEnabled() ? getBucketFolderPrefix() : null;
  console.log(`Listing files from: ${backend}${cmsPrefix ? ` (prefix=${cmsPrefix})` : ""}...`);
  const stored = isObjectStorageEnabled()
    ? await listObjectStorageFiles()
    : await listLocalUploadFiles();

  const orphaned = stored.filter((f) => !isSelfManaged(f.key) && !referenced.has(f.key));
  const orphanedBytes = orphaned.reduce((sum, f) => sum + (f.size ?? 0), 0);

  console.log(`\n${stored.length} total stored file(s). ${orphaned.length} appear unreferenced (excluding screenshots/reports, which have their own retention job):\n`);
  for (const f of orphaned.sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, 200)) {
    console.log(`  ${formatBytes(f.size ?? 0).padStart(9)}  ${f.lastModified?.toISOString?.() ?? ""}  ${f.key}`);
  }
  if (orphaned.length > 200) {
    console.log(`  ... and ${orphaned.length - 200} more (showing top 200 by size)`);
  }
  console.log(`\nTotal size of unreferenced files: ${formatBytes(orphanedBytes)}`);
  console.log("\nNo files were deleted. Review the list above before taking any action.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
