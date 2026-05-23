import bcrypt from "bcryptjs";
import {
  inventoryCredentialsTable,
  inventoryCredentialAccessLogsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { encryptSecret, decryptSecret } from "../../lib/inventory-crypto.js";
import { logInventoryActivity, notifyProjectMembers } from "../../services/inventory/helpers.js";
import { guardInventoryAccess, parseProjectIdParam, parseInventoryEntityId } from "./guard.js";
import { badRequest, forbidden, notFound, unauthorized } from "../../utils/route-errors.js";

/** GET /api/projects/:projectId/inventory/credentials */
export async function getProjectsByProjectIdInventoryCredentials(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);
  if (access.isClient) forbidden();

  const creds = await inventoryCredentialsTable
    .find({ projectId, deletedAt: null })
    .sort({ label: 1 })
    .lean();

  const role = req.user?.role;
  const filtered = creds.filter((c) => {
    if (role === "super_admin") return true;
    return (c.allowedRoles ?? []).includes(role);
  });

  res.json(
    filtered.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      type: c.type,
      label: c.label,
      username: c.username,
      url: c.url,
      notes: c.notes,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
      visibility: c.visibility,
      allowedRoles: c.allowedRoles,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      hasValue: true,
    })),
  );
}

/** POST /api/projects/:projectId/inventory/credentials */
export async function postProjectsByProjectIdInventoryCredentials(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);

  const role = req.user?.role;
  if (role !== "super_admin" && role !== "developer") forbidden();

  const { type, label, value, username, url, notes, expiresAt, visibility, allowedRoles } =
    req.body ?? {};
  if (!type || !label || !value) {
    badRequest("type, label, and value are required.", "value");
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
    createdBy: req.user.id,
  });

  await logInventoryActivity(req, projectId, "credential_created", "credential", id, label);
  await notifyProjectMembers(projectId, req.user.id, "Credential updated", label, "credential", id);
  res.status(201).json({ id: cred.id, label: cred.label, type: cred.type });
}

/** POST /api/projects/:projectId/inventory/credentials/:id/reveal */
export async function postProjectsByProjectIdInventoryCredentialsByIdReveal(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);
  if (access.isClient) forbidden();

  const id = parseInventoryEntityId(req);
  const { password } = req.body ?? {};
  const cred = await inventoryCredentialsTable
    .findOne({ id, projectId, deletedAt: null })
    .lean();
  if (!cred) notFound("Credential");

  const role = req.user?.role;
  if (role !== "super_admin" && !(cred.allowedRoles ?? []).includes(role)) forbidden();

  const user = await usersTable.findOne({ id: req.user.id }).lean();
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
    unauthorized("Password confirmation required.");
  }

  const value = decryptSecret(cred.encryptedValue, cred.iv, cred.authTag);
  const logId = await getNextSequence("inventory_credential_access_logs");
  await inventoryCredentialAccessLogsTable.create({
    id: logId,
    credentialId: id,
    projectId,
    userId: req.user.id,
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
    expiresAt: cred.expiresAt ? new Date(cred.expiresAt).toISOString() : null,
  });
}

/** DELETE /api/projects/:projectId/inventory/credentials/:id */
export async function deleteProjectsByProjectIdInventoryCredentialsById(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);
  if (req.user?.role !== "super_admin") {
    forbidden("Only super admin can delete credentials.");
  }
  const id = parseInventoryEntityId(req);
  await inventoryCredentialsTable.updateOne(
    { id, projectId },
    { $set: { deletedAt: new Date() } },
  );
  res.json({ message: "Deleted" });
}
