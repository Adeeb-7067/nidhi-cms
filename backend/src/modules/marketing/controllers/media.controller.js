import {
  getNextSequence,
  marketingAccountsTable,
  marketingMediaItemsTable,
  projectsTable,
} from "../../../models/schema/index.js";
import { MARKETING_MEDIA_KINDS } from "../../../constants/marketing.js";
import {
  badRequest,
  notFound,
  forbidden,
  parseIdParam,
  optionalString,
} from "../../../utils/route-errors.js";
import { toIso } from "../../../utils/mongo-list.js";
import {
  inferMediaKind,
  recordMarketingActivity,
  resolveScopedAccountId,
  requireScopedAccountId,
  assertDocAccount,
  ensureAccountMediaVault,
  getScopedDigitalUserAccess,
  assertScopedAccountAccess,
  canDeleteMarketingMediaItem,
  canMutateMarketingMediaItem,
} from "../services/helpers.js";
import path from "path";
import { createReadStream } from "fs";
import { access } from "fs/promises";
import { GetObjectCommand, getS3Client, isObjectStorageEnabled } from "../../../lib/object-storage.js";

function formatMedia(doc) {
  return {
    id: String(doc.id),
    name: doc.name,
    kind: doc.kind,
    parentId: doc.parentId == null ? null : String(doc.parentId),
    accountId: doc.accountId,
    companyId: doc.companyId,
    sizeBytes: doc.sizeBytes ?? undefined,
    extension: doc.extension ?? undefined,
    url: doc.url ?? undefined,
    mimetype: doc.mimetype ?? undefined,
    modifiedAt: toIso(doc.updatedAt) ?? toIso(doc.createdAt),
    createdAt: toIso(doc.createdAt),
  };
}

async function requireAccount(accountId, user) {
  const account = await marketingAccountsTable
    .findOne({ id: accountId, isDeleted: false })
    .lean();
  if (!account) notFound("Digital account");

  // Always enforce membership scope when a user is present (never skip).
  if (user) {
    const access = await getScopedDigitalUserAccess(user);
    if (access.isScoped && !(access.accountIds ?? []).includes(Number(accountId))) {
      forbidden("You do not have access to this digital project's media vault.");
    }
  }

  return account;
}

export async function listMedia(req, res) {
  const accountId = Number(req.query.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  await requireAccount(accountId, req.user);

  const parentRaw = req.query.parentId;
  const parentId =
    parentRaw === undefined || parentRaw === null || parentRaw === "" || parentRaw === "null"
      ? null
      : Number(parentRaw);

  const query = {
    accountId,
    isDeleted: false,
    parentId: Number.isFinite(parentId) ? parentId : null,
  };

  const items = await marketingMediaItemsTable
    .find(query)
    .sort({ kind: 1, name: 1 })
    .lean();

  // Folders first
  items.sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (a.kind !== "folder" && b.kind === "folder") return 1;
    return String(a.name).localeCompare(String(b.name));
  });

  res.json({ items: items.map(formatMedia) });
}

export async function listMediaTree(req, res) {
  const accountId = Number(req.query.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  const account = await requireAccount(accountId, req.user);

  let projectName = "This PC";
  if (account.projectId != null) {
    const project = await projectsTable
      .findOne({ id: account.projectId })
      .select({ name: 1 })
      .lean();
    if (project?.name) projectName = String(project.name).trim() || projectName;
  }

  // Always sync vault root name to the Digital project + ensure default folders.
  await ensureAccountMediaVault(accountId, account.companyId, req.user?.id ?? account.createdBy, {
    rootName: projectName,
  });

  const items = await marketingMediaItemsTable
    .find({ accountId, isDeleted: false })
    .sort({ name: 1 })
    .lean();

  res.json({ items: items.map(formatMedia) });
}

export async function createFolder(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  const account = await requireAccount(accountId, req.user);

  const name = optionalString(body.name);
  if (!name) badRequest("name is required.", "name");

  let parentId = body.parentId == null || body.parentId === "" ? null : Number(body.parentId);
  if (parentId != null) {
    const parent = await marketingMediaItemsTable
      .findOne({ id: parentId, accountId, isDeleted: false, kind: "folder" })
      .lean();
    if (!parent) badRequest("Parent folder not found.", "parentId");
  } else {
    const root = await marketingMediaItemsTable
      .findOne({ accountId, parentId: null, isDeleted: false, kind: "folder" })
      .lean();
    parentId = root?.id ?? null;
  }

  const id = await getNextSequence("marketing_media");
  const doc = await marketingMediaItemsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    parentId,
    name,
    kind: "folder",
    createdBy: req.user.id,
  });

  res.status(201).json(formatMedia(doc));
}

export async function registerFile(req, res) {
  const body = req.body ?? {};
  const accountId = Number(body.accountId);
  if (!Number.isFinite(accountId)) badRequest("accountId is required.", "accountId");
  const account = await requireAccount(accountId, req.user);

  const name = optionalString(body.name);
  const url = optionalString(body.url);
  if (!name) badRequest("name is required.", "name");
  if (!url) badRequest("url is required (upload first via /upload).", "url");

  // Reject javascript:/data: and require cloud HTTPS or local /uploads when applicable
  const { assertValidStoredFileUrl, isObjectStorageEnabled } = await import(
    "../../../lib/object-storage.js"
  );
  assertValidStoredFileUrl(url, "url");
  if (/^(javascript|data|vbscript):/i.test(url.trim())) {
    badRequest("Invalid file URL.", "url");
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) {
    badRequest("url must be an uploaded file URL.", "url");
  }
  const storageKey = optionalString(body.storageKey) ?? optionalString(body.key);
  if (isObjectStorageEnabled() && storageKey) {
    if (!storageKey.includes("/marketing/") && !/(^|\/)marketing\//.test(storageKey)) {
      badRequest("storageKey must be under the marketing upload category.", "storageKey");
    }
  }

  let parentId = body.parentId == null || body.parentId === "" ? null : Number(body.parentId);
  if (parentId != null) {
    const parent = await marketingMediaItemsTable
      .findOne({ id: parentId, accountId, isDeleted: false, kind: "folder" })
      .lean();
    if (!parent) badRequest("Parent folder not found.", "parentId");
  } else {
    const root = await marketingMediaItemsTable
      .findOne({ accountId, parentId: null, isDeleted: false, kind: "folder" })
      .lean();
    parentId = root?.id ?? null;
  }

  const inferred = inferMediaKind(name, body.mimetype);
  const kind = MARKETING_MEDIA_KINDS.includes(body.kind) ? body.kind : inferred.kind;

  const id = await getNextSequence("marketing_media");
  const doc = await marketingMediaItemsTable.create({
    id,
    accountId,
    companyId: account.companyId,
    parentId,
    name,
    kind,
    extension: optionalString(body.extension) ?? inferred.extension,
    sizeBytes: body.sizeBytes != null ? Number(body.sizeBytes) : null,
    url,
    storageKey,
    mimetype: optionalString(body.mimetype),
    createdBy: req.user.id,
  });

  await recordMarketingActivity({
    accountId,
    companyId: account.companyId,
    message: `Uploaded ${name}`,
    actorId: req.user.id,
    type: "media",
    entityType: "media",
    entityId: id,
  });

  res.status(201).json(formatMedia(doc));
}

export async function renameMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

  if (!(await canMutateMarketingMediaItem(req.user, doc))) {
    forbidden("Only the creator, account lead, or an org admin can rename this media item.");
  }

  const name = optionalString(req.body?.name);
  if (!name) badRequest("name is required.", "name");
  doc.name = name;
  // User-renamed vault root should not be overwritten by project-name sync.
  if (doc.kind === "folder" && doc.parentId == null) {
    doc.nameLocked = true;
    if (!doc.seedKey) doc.seedKey = "root";
  }
  await doc.save();
  res.json(formatMedia(doc));
}

export async function moveMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

  if (!(await canMutateMarketingMediaItem(req.user, doc))) {
    forbidden("Only the creator, account lead, or an org admin can move this media item.");
  }

  const parentId =
    req.body?.parentId == null || req.body.parentId === ""
      ? null
      : Number(req.body.parentId);

  if (parentId === id) badRequest("Cannot move a folder into itself.", "parentId");
  if (parentId != null) {
    const parent = await marketingMediaItemsTable
      .findOne({
        id: parentId,
        accountId: doc.accountId,
        isDeleted: false,
        kind: "folder",
      })
      .lean();
    if (!parent) badRequest("Parent folder not found.", "parentId");
  }

  doc.parentId = parentId;
  await doc.save();
  res.json(formatMedia(doc));
}

export async function deleteMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

  if (!(await canDeleteMarketingMediaItem(req.user, doc))) {
    forbidden(
      doc.kind === "folder"
        ? "Only the creator, project account manager, or an org admin can delete this folder."
        : "Only the creator or an org admin can delete this media item.",
    );
  }

  if (doc.kind === "folder" && doc.parentId == null) {
    forbidden("Cannot delete the account root folder.");
  }

  const stamp = new Date();
  if (doc.kind === "folder") {
    // Soft-delete folder and descendants (breadth-first), scoped to this account.
    const queue = [doc.id];
    while (queue.length) {
      const folderId = queue.shift();
      await marketingMediaItemsTable.updateOne(
        { id: folderId, accountId: doc.accountId, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: stamp } },
      );
      const children = await marketingMediaItemsTable
        .find({ parentId: folderId, accountId: doc.accountId, isDeleted: false, kind: "folder" })
        .select({ id: 1 })
        .lean();
      for (const c of children) queue.push(c.id);
      await marketingMediaItemsTable.updateMany(
        {
          parentId: folderId,
          accountId: doc.accountId,
          isDeleted: false,
          kind: { $ne: "folder" },
        },
        { $set: { isDeleted: true, deletedAt: stamp } },
      );
    }
  } else {
    doc.isDeleted = true;
    doc.deletedAt = stamp;
    await doc.save();
  }

  res.json({ ok: true });
}

function attachmentDisposition(filename) {
  const safe = String(filename || "download")
    .replace(/[\r\n"]/g, "_")
    .slice(0, 180);
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

function objectKeyFromMedia(doc) {
  if (doc.storageKey) return String(doc.storageKey);
  const fileUrl = String(doc.url || "");
  if (!/^https?:\/\//i.test(fileUrl)) return null;
  try {
    return decodeURIComponent(new URL(fileUrl).pathname.replace(/^\//, ""));
  } catch {
    return null;
  }
}

/** Authenticated download — forces save-as (not browser navigation/preview). */
export async function downloadMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = await requireScopedAccountId(req);
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);
  await requireAccount(doc.accountId, req.user);

  if (doc.kind === "folder") {
    badRequest("Folders cannot be downloaded.", "id");
  }

  const filename = doc.name || `media-${doc.id}`;
  res.setHeader("Content-Disposition", attachmentDisposition(filename));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const fileUrl = String(doc.url || "");

  if (/^https?:\/\//i.test(fileUrl) && isObjectStorageEnabled()) {
    const key = objectKeyFromMedia(doc);
    const bucket = process.env.LINODE_OBJECT_BUCKET;
    if (!key || !bucket) notFound("Media file");
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      res.setHeader(
        "Content-Type",
        doc.mimetype || result.ContentType || "application/octet-stream",
      );
      if (result.ContentLength != null) {
        res.setHeader("Content-Length", String(result.ContentLength));
      }
      result.Body.pipe(res);
      return;
    } catch (err) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        notFound("Media file");
      }
      throw err;
    }
  }

  if (fileUrl.startsWith("/uploads/")) {
    const relPath = fileUrl.slice("/uploads/".length);
    const filePath = path.join(process.cwd(), "uploads", relPath);
    try {
      await access(filePath);
    } catch {
      notFound("Media file");
    }
    res.setHeader("Content-Type", doc.mimetype || "application/octet-stream");
    createReadStream(filePath).pipe(res);
    return;
  }

  // Last resort: proxy a remote public URL through the API so the browser
  // still receives Content-Disposition: attachment from our origin.
  if (/^https?:\/\//i.test(fileUrl)) {
    const upstream = await fetch(fileUrl);
    if (!upstream.ok || !upstream.body) notFound("Media file");
    res.setHeader(
      "Content-Type",
      doc.mimetype || upstream.headers.get("content-type") || "application/octet-stream",
    );
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    const { Readable } = await import("stream");
    Readable.fromWeb(upstream.body).pipe(res);
    return;
  }

  notFound("Media file");
}
