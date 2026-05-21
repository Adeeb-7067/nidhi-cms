import type { Request, Response } from "express";
﻿import { validateStoredFileUrl } from "@/lib/file-storage";
import bcrypt from "bcryptjs";
import {
  inventoryFoldersTable,
  inventoryResourcesTable,
  inventoryCredentialsTable,
  inventoryCredentialAccessLogsTable,
  inventoryEnvironmentsTable,
  inventoryDevicesTable,
  inventorySubscriptionsTable,
  inventoryActivitiesTable,
  apkReleasesTable,
  usersTable,
  getNextSequence,
} from "@/models/schema";
import { getProjectAccess, clientVisibilityFilter } from "@/services/inventory-access";
import { encryptSecret, decryptSecret } from "@/lib/inventory-crypto";
import { logInventoryActivity, notifyProjectMembers } from "@/services/inventory-helpers";

async function guard(req: any, res: any, projectId: number, needManage = false) {
  const access = await getProjectAccess(req, projectId);
  if (!access.allowed) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  if (needManage && !access.canManage && req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Manage permission required" });
    return null;
  }
  return access;
}

// GET /api/projects/:projectId/inventory/summary
export async function getProjectsByProjectIdInventorySummary(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;

  const notDeleted = { deletedAt: null };
  const vis = clientVisibilityFilter(access.isClient);

  const [resources, credentials, environments, devices, subscriptions, builds] = await Promise.all([
    inventoryResourcesTable.countDocuments({ projectId, ...notDeleted, ...vis }),
    access.isClient
      ? 0
      : inventoryCredentialsTable.countDocuments({ projectId, ...notDeleted }),
    inventoryEnvironmentsTable.countDocuments({ projectId, ...notDeleted, ...vis }),
    inventoryDevicesTable.countDocuments({ projectId, ...notDeleted }),
    inventorySubscriptionsTable.countDocuments({ projectId, ...notDeleted }),
    apkReleasesTable.countDocuments({
      projectId,
      ...(access.isClient ? { audience: "client_visible" } : {}),
    }),
  ]);

  res.json({ resources, credentials, environments, devices, subscriptions, builds });
}


// GET /api/projects/:projectId/inventory/activities
export async function getProjectsByProjectIdInventoryActivities(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId))) return;

  const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
  const activities = await inventoryActivitiesTable
    .find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit);

  const formatted = await Promise.all(
    activities.map(async (a: any) => {
      const actor = await usersTable.findOne({ id: a.actorId });
      return {
        id: a.id,
        projectId: a.projectId,
        actorId: a.actorId,
        actorName: actor?.name ?? "Unknown",
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        entityName: a.entityName,
        oldVal: a.oldVal,
        newVal: a.newVal,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );
  res.json({ activities: formatted, total: formatted.length });
}


// ΓöÇΓöÇΓöÇ Folders ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventoryFolders(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId))) return;
  const folders = await inventoryFoldersTable.find({ projectId, deletedAt: null }).sort({ name: 1 });
  res.json(folders.map((f: any) => ({ ...f, createdAt: f.createdAt.toISOString() })));
}


export async function postProjectsByProjectIdInventoryFolders(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const { name, parentId } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const id = await getNextSequence("inventory_folders");
  const folder = await inventoryFoldersTable.create({
    id,
    projectId,
    parentId: parentId ?? null,
    name,
    createdBy: req.user!.id,
  });
  await logInventoryActivity(req, projectId, "folder_created", "folder", id, name);
  res.status(201).json(folder);
}


// ΓöÇΓöÇΓöÇ Resources ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventoryResources(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;

  const { search, folderId, type, page = "1", limit = "30" } = req.query as Record<string, string>;
  const p = parseInt(page);
  const l = parseInt(limit);
  const query: Record<string, unknown> = { projectId, deletedAt: null, ...clientVisibilityFilter(access.isClient) };
  if (folderId === "null") query.folderId = null;
  else if (folderId) query.folderId = parseInt(folderId);
  if (type) query.type = type;
  if (search) query.name = { $regex: search, $options: "i" };

  const [items, total] = await Promise.all([
    inventoryResourcesTable.find(query).sort({ updatedAt: -1 }).skip((p - 1) * l).limit(l),
    inventoryResourcesTable.countDocuments(query),
  ]);

  const resources = await Promise.all(
    items.map(async (r: any) => {
      const uploader = await usersTable.findOne({ id: r.uploadedBy });
      return {
        id: r.id,
        projectId: r.projectId,
        folderId: r.folderId,
        type: r.type,
        name: r.name,
        description: r.description,
        url: r.url,
        fileUrl: r.fileUrl,
        mimeType: r.mimeType,
        fileSize: r.fileSize,
        tags: r.tags,
        category: r.category,
        visibility: r.visibility,
        version: r.version,
        parentResourceId: r.parentResourceId,
        uploadedBy: r.uploadedBy,
        uploaderName: uploader?.name ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    }),
  );
  res.json({ resources, total, page: p, limit: l });
}


export async function postProjectsByProjectIdInventoryResources(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;
  if (access.isClient && req.body.visibility !== "client_visible") {
    res.status(403).json({ error: "Clients can only add client-visible resources" });
    return;
  }

  const {
    name, type, description, url, fileUrl, mimeType, fileSize, folderId, tags, category, visibility,
  } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  try {
    validateStoredFileUrl(fileUrl, "fileUrl");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid fileUrl" });
    return;
  }

  const id = await getNextSequence("inventory_resources");
  const resource = await inventoryResourcesTable.create({
    id,
    projectId,
    folderId: folderId ?? null,
    type: type ?? "file",
    name,
    description: description ?? null,
    url: url ?? null,
    fileUrl: fileUrl ?? null,
    mimeType: mimeType ?? null,
    fileSize: fileSize ?? null,
    tags: tags ?? [],
    category: category ?? null,
    visibility: visibility ?? "team_only",
    uploadedBy: req.user!.id,
  });

  await logInventoryActivity(req, projectId, "resource_uploaded", "resource", id, name);
  await notifyProjectMembers(projectId, req.user!.id, "New resource uploaded", name, "resource", id);
  res.status(201).json(resource);
}


export async function patchProjectsByProjectIdInventoryResourcesById(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const id = parseInt(req.params.id as string);

  try {
    validateStoredFileUrl(req.body.fileUrl, "fileUrl");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid fileUrl" });
    return;
  }

  const resource = await inventoryResourcesTable.findOneAndUpdate(
    { id, projectId, deletedAt: null },
    { $set: { ...req.body, updatedAt: new Date() } },
    { new: true },
  );
  if (!resource) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  await logInventoryActivity(req, projectId, "resource_updated", "resource", id, resource.name);
  res.json(resource);
}


export async function deleteProjectsByProjectIdInventoryResourcesById(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const id = parseInt(req.params.id as string);
  const resource = await inventoryResourcesTable.findOneAndUpdate(
    { id, projectId },
    { $set: { deletedAt: new Date() } },
    { new: true },
  );
  if (!resource) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logInventoryActivity(req, projectId, "resource_deleted", "resource", id, resource.name);
  res.json({ message: "Deleted" });
}


// ΓöÇΓöÇΓöÇ Credentials ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventoryCredentials(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;
  if (access.isClient) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const creds = await inventoryCredentialsTable
    .find({ projectId, deletedAt: null })
    .sort({ label: 1 });

  const filtered = creds.filter((c: any) => {
    if (req.user!.role === "super_admin") return true;
    return (c.allowedRoles ?? []).includes(req.user!.role);
  });

  res.json(
    filtered.map((c: any) => ({
      id: c.id,
      projectId: c.projectId,
      type: c.type,
      label: c.label,
      username: c.username,
      url: c.url,
      notes: c.notes,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      visibility: c.visibility,
      allowedRoles: c.allowedRoles,
      createdAt: c.createdAt.toISOString(),
      hasValue: true,
    })),
  );
}


export async function postProjectsByProjectIdInventoryCredentials(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  if (req.user!.role !== "super_admin" && req.user!.role !== "developer") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { type, label, value, username, url, notes, expiresAt, visibility, allowedRoles } = req.body;
  if (!type || !label || !value) {
    res.status(400).json({ error: "type, label, value required" });
    return;
  }

  const { encrypted, iv, authTag } = encryptSecret(String(value));
  const id = await getNextSequence("inventory_credentials");
  const cred = await inventoryCredentialsTable.create({
    id,
    projectId,
    type,
    label,
    username: username ?? null,
    encryptedValue: encrypted,
    iv,
    authTag,
    url: url ?? null,
    notes: notes ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    visibility: visibility ?? "restricted",
    allowedRoles: allowedRoles ?? ["super_admin", "developer"],
    createdBy: req.user!.id,
  });

  await logInventoryActivity(req, projectId, "credential_created", "credential", id, label);
  await notifyProjectMembers(projectId, req.user!.id, "Credential updated", label, "credential", id);
  res.status(201).json({ id: cred.id, label: cred.label, type: cred.type });
}


export async function postProjectsByProjectIdInventoryCredentialsByIdReveal(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;
  if (access.isClient) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id as string);
  const { password } = req.body as { password?: string };
  const cred = await inventoryCredentialsTable.findOne({ id, projectId, deletedAt: null });
  if (!cred) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (
    req.user!.role !== "super_admin" &&
    !(cred.allowedRoles ?? []).includes(req.user!.role)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const user = await usersTable.findOne({ id: req.user!.id });
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
    res.status(401).json({ error: "Password confirmation required" });
    return;
  }

  const value = decryptSecret(cred.encryptedValue, cred.iv, cred.authTag);
  const logId = await getNextSequence("inventory_credential_access_logs");
  await inventoryCredentialAccessLogsTable.create({
    id: logId,
    credentialId: id,
    projectId,
    userId: req.user!.id,
    action: "view",
    ipAddress: req.ip || null,
  });
  await logInventoryActivity(req, projectId, "credential_viewed", "credential", id, cred.label);

  res.json({
    id: cred.id,
    label: cred.label,
    username: cred.username,
    value,
    url: cred.url,
    expiresAt: cred.expiresAt?.toISOString() ?? null,
  });
}


export async function deleteProjectsByProjectIdInventoryCredentialsById(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  if (req.user!.role !== "super_admin") {
    res.status(403).json({ error: "Only super admin can delete credentials" });
    return;
  }
  const id = parseInt(req.params.id as string);
  await inventoryCredentialsTable.updateOne({ id, projectId }, { $set: { deletedAt: new Date() } });
  res.json({ message: "Deleted" });
}


// ΓöÇΓöÇΓöÇ Environments ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventoryEnvironments(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;

  const envs = await inventoryEnvironmentsTable.find({
    projectId,
    deletedAt: null,
    ...clientVisibilityFilter(access.isClient),
  });
  res.json(
    envs.map((e: any) => ({
      ...e,
      lastDeployedAt: e.lastDeployedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
}


export async function postProjectsByProjectIdInventoryEnvironments(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const { envType, name, url, deploymentStatus, healthStatus, hostingDetails, deploymentNotes, visibility } =
    req.body;
  if (!envType || !name) {
    res.status(400).json({ error: "envType and name required" });
    return;
  }
  const id = await getNextSequence("inventory_environments");
  const env = await inventoryEnvironmentsTable.create({
    id,
    projectId,
    envType,
    name,
    url: url ?? null,
    deploymentStatus: deploymentStatus ?? "active",
    healthStatus: healthStatus ?? "unknown",
    hostingDetails: hostingDetails ?? null,
    deploymentNotes: deploymentNotes ?? null,
    visibility: visibility ?? "team_only",
  });
  await logInventoryActivity(req, projectId, "environment_created", "environment", id, name);
  await notifyProjectMembers(projectId, req.user!.id, "Environment updated", name, "environment", id);
  res.status(201).json(env);
}


export async function patchProjectsByProjectIdInventoryEnvironmentsById(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const id = parseInt(req.params.id as string);
  const env = await inventoryEnvironmentsTable.findOneAndUpdate(
    { id, projectId },
    { $set: { ...req.body, updatedAt: new Date() } },
    { new: true },
  );
  if (!env) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await logInventoryActivity(req, projectId, "environment_updated", "environment", id, env.name);
  res.json(env);
}


// ΓöÇΓöÇΓöÇ Devices ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventoryDevices(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId))) return;
  const devices = await inventoryDevicesTable.find({ projectId, deletedAt: null });
  const formatted = await Promise.all(
    devices.map(async (d: any) => {
      let assignedName = null;
      if (d.assignedUserId) {
        const u = await usersTable.findOne({ id: d.assignedUserId });
        assignedName = u?.name ?? null;
      }
      return {
        ...d,
        assignedName,
        purchaseDate: d.purchaseDate?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      };
    }),
  );
  res.json(formatted);
}


export async function postProjectsByProjectIdInventoryDevices(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const id = await getNextSequence("inventory_devices");
  const device = await inventoryDevicesTable.create({
    id,
    projectId,
    ...req.body,
    purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : null,
  });
  await logInventoryActivity(req, projectId, "device_added", "device", id, device.deviceName);
  res.status(201).json(device);
}


// ΓöÇΓöÇΓöÇ Subscriptions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function getProjectsByProjectIdInventorySubscriptions(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId))) return;
  const subs = await inventorySubscriptionsTable.find({ projectId, deletedAt: null }).sort({ expiresAt: 1 });
  res.json(
    subs.map((s: any) => ({
      ...s,
      expiresAt: s.expiresAt.toISOString(),
      lastRenewedAt: s.lastRenewedAt?.toISOString() ?? null,
      daysUntilExpiry: Math.ceil((s.expiresAt.getTime() - Date.now()) / 86400000),
    })),
  );
}


export async function postProjectsByProjectIdInventorySubscriptions(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  if (!(await guard(req, res, projectId, true))) return;
  const { type, name, expiresAt, provider, cost, renewalUrl, notes } = req.body;
  if (!type || !name || !expiresAt) {
    res.status(400).json({ error: "type, name, expiresAt required" });
    return;
  }
  const id = await getNextSequence("inventory_subscriptions");
  const sub = await inventorySubscriptionsTable.create({
    id,
    projectId,
    type,
    name,
    provider: provider ?? null,
    cost: cost ?? null,
    renewalUrl: renewalUrl ?? null,
    expiresAt: new Date(expiresAt),
    notes: notes ?? null,
  });
  await logInventoryActivity(req, projectId, "subscription_added", "subscription", id, name);
  res.status(201).json(sub);
}


// GET builds ΓÇö proxy existing APK releases
export async function getProjectsByProjectIdInventoryBuilds(req: Request, res: Response) {
  const projectId = parseInt(req.params.projectId as string);
  const access = await guard(req, res, projectId);
  if (!access) return;

  const query: Record<string, unknown> = { projectId };
  if (access.isClient) query.audience = "client_visible";

  const releases = await apkReleasesTable.find(query).sort({ createdAt: -1 });
  const formatted = await Promise.all(
    releases.map(async (r: any) => {
      const uploader = await usersTable.findOne({ id: r.uploaderId });
      return {
        id: r.id,
        version: r.version,
        buildNumber: r.buildNumber,
        platform: r.platform,
        releaseType: r.releaseType,
        changelog: r.changelog,
        fileUrl: r.fileUrl,
        audience: r.audience,
        uploaderName: uploader?.name ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
      };
    }),
  );
  res.json({ builds: formatted, total: formatted.length });
}

