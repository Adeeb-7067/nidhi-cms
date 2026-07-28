import path from "path";
import { createReadStream } from "fs";
import { access } from "fs/promises";
import { getNextSequence, AdminMediaItems } from "../../../models/schema/index.js";
import { MARKETING_MEDIA_KINDS } from "../../../constants/marketing.js";
import {
  badRequest,
  notFound,
  forbidden,
  parseIdParam,
  optionalString,
} from "../../../utils/route-errors.js";
import { toIso } from "../../../utils/mongo-list.js";
import { inferMediaKind } from "../../marketing/services/helpers.js";
import { ensureAdminMediaVault } from "../services/admin-media.service.js";
import { GetObjectCommand, getS3Client, isObjectStorageEnabled } from "../../../lib/object-storage.js";

function formatMedia(doc) {
  return {
    id: String(doc.id),
    name: doc.name,
    kind: doc.kind,
    parentId: doc.parentId == null ? null : String(doc.parentId),
    sizeBytes: doc.sizeBytes ?? undefined,
    extension: doc.extension ?? undefined,
    url: doc.url ?? undefined,
    mimetype: doc.mimetype ?? undefined,
    modifiedAt: toIso(doc.updatedAt) ?? toIso(doc.createdAt),
    createdAt: toIso(doc.createdAt),
  };
}

async function resolveParentFolder(parentRaw) {
  if (parentRaw == null || parentRaw === "" || parentRaw === "null") {
    const root = await AdminMediaItems.findOne({
      parentId: null,
      isDeleted: false,
      kind: "folder",
    }).lean();
    return root?.id ?? null;
  }
  const parentId = Number(parentRaw);
  if (!Number.isFinite(parentId)) badRequest("Invalid parentId.", "parentId");
  const parent = await AdminMediaItems.findOne({
    id: parentId,
    isDeleted: false,
    kind: "folder",
  }).lean();
  if (!parent) badRequest("Parent folder not found.", "parentId");
  return parentId;
}

export async function listMediaTree(req, res) {
  await ensureAdminMediaVault(req.user.id);
  const items = await AdminMediaItems.find({ isDeleted: false }).sort({ name: 1 }).lean();
  res.json({ items: items.map(formatMedia) });
}

export async function listMedia(req, res) {
  await ensureAdminMediaVault(req.user.id);
  const parentRaw = req.query.parentId;
  const parentId =
    parentRaw === undefined || parentRaw === null || parentRaw === "" || parentRaw === "null"
      ? null
      : Number(parentRaw);

  const query = {
    isDeleted: false,
    parentId: Number.isFinite(parentId) ? parentId : null,
  };

  const items = await AdminMediaItems.find(query).sort({ kind: 1, name: 1 }).lean();
  items.sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (a.kind !== "folder" && b.kind === "folder") return 1;
    return String(a.name).localeCompare(String(b.name));
  });

  res.json({ items: items.map(formatMedia) });
}

export async function createFolder(req, res) {
  await ensureAdminMediaVault(req.user.id);
  const body = req.body ?? {};
  const name = optionalString(body.name);
  if (!name) badRequest("name is required.", "name");

  const parentId = await resolveParentFolder(body.parentId);
  const id = await getNextSequence("admin_media");
  const doc = await AdminMediaItems.create({
    id,
    parentId,
    name,
    kind: "folder",
    createdBy: req.user.id,
  });
  res.status(201).json(formatMedia(doc));
}

export async function registerFile(req, res) {
  await ensureAdminMediaVault(req.user.id);
  const body = req.body ?? {};
  const name = optionalString(body.name);
  const url = optionalString(body.url);
  if (!name) badRequest("name is required.", "name");
  if (!url) badRequest("url is required (upload first via /upload).", "url");

  const { assertValidStoredFileUrl } = await import("../../../lib/object-storage.js");
  assertValidStoredFileUrl(url, "url");
  if (/^(javascript|data|vbscript):/i.test(url.trim())) {
    badRequest("Invalid file URL.", "url");
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) {
    badRequest("url must be an uploaded file URL.", "url");
  }

  const storageKey = optionalString(body.storageKey) ?? optionalString(body.key);
  if (isObjectStorageEnabled()) {
    if (!storageKey) {
      badRequest("storageKey is required after upload.", "storageKey");
    }
    if (!storageKey.includes("/admin/") && !/(^|\/)admin\//.test(storageKey)) {
      badRequest("storageKey must be under the admin upload category.", "storageKey");
    }
    const publicBase = (
      process.env.OBJECT_STORAGE_PUBLIC_URL ||
      `https://${process.env.LINODE_OBJECT_BUCKET}.${process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1"}.digitaloceanspaces.com`
    ).replace(/\/$/, "");
    if (!url.startsWith("/uploads/") && !url.startsWith(`${publicBase}/`)) {
      badRequest("url must be from company object storage or /uploads/.", "url");
    }
  } else if (!url.startsWith("/uploads/")) {
    badRequest("url must be an uploaded file under /uploads/.", "url");
  }

  const parentId = await resolveParentFolder(body.parentId);
  const inferred = inferMediaKind(name, body.mimetype);
  const kind = MARKETING_MEDIA_KINDS.includes(body.kind) ? body.kind : inferred.kind;

  const id = await getNextSequence("admin_media");
  const doc = await AdminMediaItems.create({
    id,
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

  res.status(201).json(formatMedia(doc));
}

export async function renameMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await AdminMediaItems.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");

  const name = optionalString(req.body?.name);
  if (!name) badRequest("name is required.", "name");
  doc.name = name;
  if (doc.kind === "folder" && doc.parentId == null) {
    doc.nameLocked = true;
    if (!doc.seedKey) doc.seedKey = "root";
  }
  await doc.save();
  res.json(formatMedia(doc));
}

export async function moveMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await AdminMediaItems.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");

  const parentId = await resolveParentFolder(req.body?.parentId);
  if (parentId != null && Number(parentId) === Number(id)) {
    badRequest("Cannot move a folder into itself.", "parentId");
  }
  doc.parentId = parentId;
  await doc.save();
  res.json(formatMedia(doc));
}

export async function deleteMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await AdminMediaItems.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");

  if (doc.parentId == null && doc.kind === "folder") {
    badRequest("Cannot delete the root storage folder.", "id");
  }

  const toDelete = [id];
  if (doc.kind === "folder") {
    const queue = [id];
    while (queue.length) {
      const parent = queue.shift();
      const children = await AdminMediaItems.find({
        parentId: parent,
        isDeleted: false,
      })
        .select({ id: 1, kind: 1 })
        .lean();
      for (const child of children) {
        toDelete.push(child.id);
        if (child.kind === "folder") queue.push(child.id);
      }
    }
  }

  await AdminMediaItems.updateMany(
    { id: { $in: toDelete } },
    { $set: { isDeleted: true, deletedAt: new Date() } },
  );
  res.status(204).end();
}

export async function downloadMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await AdminMediaItems.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("Media item");
  if (doc.kind === "folder") badRequest("Folders cannot be downloaded.", "id");
  if (!doc.url && !doc.storageKey) badRequest("No file attached.", "id");

  const filename = doc.name || `media-${doc.id}`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
  if (doc.mimetype) res.setHeader("Content-Type", doc.mimetype);

  if (isObjectStorageEnabled() && doc.storageKey) {
    const client = getS3Client();
    const bucket = process.env.LINODE_OBJECT_BUCKET;
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: doc.storageKey }),
    );
    out.Body.pipe(res);
    return;
  }

  const url = doc.url || "";
  if (url.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), url.replace(/^\//, ""));
    try {
      await access(localPath);
    } catch {
      notFound("File");
    }
    createReadStream(localPath).pipe(res);
    return;
  }

  if (/^https?:\/\//i.test(url)) {
    res.redirect(url);
    return;
  }

  forbidden("Unable to download this file.");
}
