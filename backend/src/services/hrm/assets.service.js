import {
  hrmAssetsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notFound, badRequest, conflict } from "../../utils/route-errors.js";
import {
  assetCategories,
  assetConditions,
  assetStatuses,
} from "../../constants/hrm-workflow.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { logHrmAudit } from "./hrm-audit.service.js";

function categoryTagPrefix(category) {
  const raw = String(category ?? "AST").replace(/\s+/g, "");
  return raw.slice(0, 3).toUpperCase() || "AST";
}

async function loadAssigneeBrief(userId) {
  if (!userId) return null;
  return usersTable
    .findOne({ id: userId }, { id: 1, name: 1, employeeId: 1, designation: 1, avatarUrl: 1 })
    .lean();
}

async function mapAsset(row) {
  const assignee = await loadAssigneeBrief(row.assignedUserId);
  return {
    id: row.id,
    tag: row.tag,
    category: row.category,
    brand: row.brand,
    serial: row.serial ?? "",
    cost: row.cost ?? 0,
    condition: row.condition ?? "good",
    status: row.status ?? "in_stock",
    assignedUserId: row.assignedUserId ?? null,
    assignedOn: row.assignedOn ?? null,
    assignedToName: assignee?.name ?? null,
    assignedEmployeeCode: assignee?.employeeId ?? null,
    assignedDesignation: assignee?.designation ?? null,
    assignedAvatarUrl: assignee?.avatarUrl ?? null,
    notes: row.notes ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAssets({ status, category, assignedUserId, search } = {}) {
  const query = {};
  if (status && assetStatuses.includes(status)) query.status = status;
  if (category && assetCategories.includes(category)) query.category = category;
  if (assignedUserId != null) query.assignedUserId = Number(assignedUserId);
  if (search?.trim()) {
    const s = search.trim();
    query.$or = [
      { tag: { $regex: s, $options: "i" } },
      { brand: { $regex: s, $options: "i" } },
      { serial: { $regex: s, $options: "i" } },
    ];
  }
  const rows = await hrmAssetsTable.find(query).sort({ tag: 1 }).lean();
  return Promise.all(rows.map(mapAsset));
}

export async function getAsset(id) {
  const row = await hrmAssetsTable.findOne({ id }).lean();
  if (!row) notFound("Asset");
  return mapAsset(row);
}

export async function createAsset(body, actorId = null) {
  const category = String(body.category ?? "").trim();
  const brand = String(body.brand ?? "").trim();
  if (!category || !assetCategories.includes(category)) badRequest("Valid asset category is required.");
  if (!brand) badRequest("Brand is required.");

  const condition = body.condition ?? "good";
  if (!assetConditions.includes(condition)) badRequest("Invalid asset condition.");

  let status = body.status ?? "in_stock";
  if (!assetStatuses.includes(status)) badRequest("Invalid asset status.");

  const assignedUserId = body.assignedUserId != null ? Number(body.assignedUserId) : null;
  if (assignedUserId) {
    const user = await usersTable
      .findOne({ id: assignedUserId, role: { $in: hrmEmployeeRoles }, status: "active" })
      .lean();
    if (!user) notFound("Assignee employee");
    status = "assigned";
  } else if (status === "assigned") {
    status = "in_stock";
  }

  const id = await getNextSequence("hrm_assets");
  let tag = String(body.tag ?? "").trim();
  if (!tag) {
    tag = `AST-${categoryTagPrefix(category)}-${String(id).padStart(4, "0")}`;
  }
  const existingTag = await hrmAssetsTable.findOne({ tag }).lean();
  if (existingTag) conflict("Asset tag already exists.");

  const cost = body.cost != null ? Number(body.cost) : 0;
  if (!Number.isFinite(cost) || cost < 0) badRequest("Invalid asset cost.");

  const record = await hrmAssetsTable.create({
    id,
    tag,
    category,
    brand,
    serial: String(body.serial ?? "").trim(),
    cost,
    condition,
    status,
    assignedUserId: assignedUserId || null,
    assignedOn: assignedUserId ? (body.assignedOn ? new Date(body.assignedOn) : new Date()) : null,
    notes: String(body.notes ?? "").trim(),
  });

  await logHrmAudit({
    actorId,
    action: "asset_created",
    entityType: "hrm_asset",
    entityId: id,
    severity: "info",
    metadata: { tag, category, assignedUserId },
  });

  return mapAsset(record.toObject());
}

export async function updateAsset(id, body, actorId = null) {
  const row = await hrmAssetsTable.findOne({ id }).lean();
  if (!row) notFound("Asset");

  const update = {};
  if (body.category != null) {
    const category = String(body.category).trim();
    if (!assetCategories.includes(category)) badRequest("Invalid asset category.");
    update.category = category;
  }
  if (body.brand != null) {
    const brand = String(body.brand).trim();
    if (!brand) badRequest("Brand cannot be empty.");
    update.brand = brand;
  }
  if (body.serial != null) update.serial = String(body.serial).trim();
  if (body.cost != null) {
    const cost = Number(body.cost);
    if (!Number.isFinite(cost) || cost < 0) badRequest("Invalid asset cost.");
    update.cost = cost;
  }
  if (body.condition != null) {
    if (!assetConditions.includes(body.condition)) badRequest("Invalid asset condition.");
    update.condition = body.condition;
  }
  if (body.notes != null) update.notes = String(body.notes).trim();
  if (body.tag != null) {
    const tag = String(body.tag).trim();
    if (!tag) badRequest("Asset tag cannot be empty.");
    const existingTag = await hrmAssetsTable.findOne({ tag, id: { $ne: id } }).lean();
    if (existingTag) conflict("Asset tag already exists.");
    update.tag = tag;
  }

  if (body.status != null) {
    if (!assetStatuses.includes(body.status)) badRequest("Invalid asset status.");
    update.status = body.status;
    if (body.status !== "assigned") {
      update.assignedUserId = null;
      update.assignedOn = null;
    }
  }

  if (body.assignedUserId !== undefined) {
    if (body.assignedUserId == null) {
      update.assignedUserId = null;
      update.assignedOn = null;
      if (!body.status) update.status = "in_stock";
    } else {
      const userId = Number(body.assignedUserId);
      const user = await usersTable
        .findOne({ id: userId, role: { $in: hrmEmployeeRoles }, status: "active" })
        .lean();
      if (!user) notFound("Assignee employee");
      update.assignedUserId = userId;
      update.assignedOn = body.assignedOn ? new Date(body.assignedOn) : new Date();
      update.status = "assigned";
    }
  }

  if (!Object.keys(update).length) badRequest("No asset fields to update.");

  const updated = await hrmAssetsTable.findOneAndUpdate({ id }, { $set: update }, { new: true }).lean();
  await logHrmAudit({
    actorId,
    action: "asset_updated",
    entityType: "hrm_asset",
    entityId: id,
    severity: "info",
    metadata: { fields: Object.keys(update) },
  });
  return mapAsset(updated);
}

export async function deleteAsset(id, actorId = null) {
  const row = await hrmAssetsTable.findOne({ id }).lean();
  if (!row) notFound("Asset");
  await hrmAssetsTable.deleteOne({ id });
  await logHrmAudit({
    actorId,
    action: "asset_deleted",
    entityType: "hrm_asset",
    entityId: id,
    severity: "warning",
    metadata: { tag: row.tag },
  });
  return { ok: true };
}

export async function listAssetsForUser(userId) {
  return listAssets({ assignedUserId: userId, status: "assigned" });
}

export async function returnAssetsForUser(userId, actorId = null) {
  const rows = await hrmAssetsTable.find({ assignedUserId: userId, status: "assigned" }).lean();
  if (!rows.length) return { returned: 0 };

  await hrmAssetsTable.updateMany(
    { assignedUserId: userId, status: "assigned" },
    { $set: { assignedUserId: null, assignedOn: null, status: "in_stock" } },
  );

  await logHrmAudit({
    actorId,
    action: "assets_returned",
    entityType: "user",
    entityId: userId,
    severity: "info",
    metadata: { assetIds: rows.map((r) => r.id), count: rows.length },
  });

  return { returned: rows.length };
}
