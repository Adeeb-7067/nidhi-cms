import {
  getNextSequence,
  marketingAccountsTable,
  marketingMediaItemsTable,
  projectsTable,
} from "../../models/schema/index.js";
import { MARKETING_MEDIA_KINDS } from "../../constants/marketing.js";
import {
  badRequest,
  notFound,
  forbidden,
  parseIdParam,
  optionalString,
} from "../../utils/route-errors.js";
import { toIso } from "../../utils/mongo-list.js";
import {
  inferMediaKind,
  recordMarketingActivity,
  resolveScopedAccountId,
  assertDocAccount,
  ensureAccountMediaVault,
  getScopedDigitalUserAccess,
} from "../../services/marketing/helpers.js";

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

  if (user) {
    const access = await getScopedDigitalUserAccess(user);
    if (access.isScoped && !access.accountIds.includes(Number(accountId))) {
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
  const account = await requireAccount(accountId);

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
  const account = await requireAccount(accountId);

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
  const account = await requireAccount(accountId);

  const name = optionalString(body.name);
  const url = optionalString(body.url);
  if (!name) badRequest("name is required.", "name");
  if (!url) badRequest("url is required (upload first via /upload).", "url");

  // Reject javascript:/data: and require cloud HTTPS or local /uploads when applicable
  const { assertValidStoredFileUrl, isObjectStorageEnabled } = await import(
    "../../lib/object-storage.js"
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
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

  const name = optionalString(req.body?.name);
  if (!name) badRequest("name is required.", "name");
  doc.name = name;
  await doc.save();
  res.json(formatMedia(doc));
}

export async function moveMedia(req, res) {
  const id = parseIdParam(req.params.id);
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

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
  const accountId = resolveScopedAccountId(req, { required: true });
  const doc = await marketingMediaItemsTable.findOne({ id, isDeleted: false });
  if (!doc) notFound("Media item");
  assertDocAccount(doc, accountId);

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
