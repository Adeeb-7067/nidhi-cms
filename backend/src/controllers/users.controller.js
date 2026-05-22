import {
  usersTable,
  credentialHistoryTable,
  auditLogsTable,
  getNextSequence
} from "@/models/schema";
import {
  hashPassword,
  encryptPasswordForHistory,
  decryptPasswordFromHistory
} from "@/lib/password";
import { generateEmployeeId, previewEmployeeId } from "@/services/employeeId";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { formatUser } from "@/mappers/user-format";
import { paginateModel, toIso } from "@/utils/mongo-list";
import {
  badRequest,
  conflict,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString
} from "@/utils/route-errors";
const USER_LIST_PROJECTION = {
  id: 1,
  employeeId: 1,
  name: 1,
  email: 1,
  role: 1,
  subType: 1,
  designation: 1,
  avatarUrl: 1,
  status: 1,
  lastLoginAt: 1,
  createdAt: 1
};
async function getUsers(req, res) {
  const { role, subType, search } = req.query;
  const pagination = parsePagination(req.query);
  const query = {};
  if (role) query.role = role;
  if (subType) query.subType = subType;
  if (search?.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { email: { $regex: search.trim(), $options: "i" } }
    ];
  }
  const { items, total, page, limit } = await paginateModel(
    usersTable,
    query,
    pagination,
    { projection: USER_LIST_PROJECTION }
  );
  res.json({
    users: items.map((u) => formatUser(u)),
    total,
    page,
    limit
  });
}
async function getUsersPreviewEmployeeId(req, res) {
  const name = String(req.query.name ?? "");
  const employeeId = await previewEmployeeId(name);
  res.json({ employeeId });
}
async function postUsers(req, res) {
  const body = req.body;
  const name = optionalString(body.name);
  const email = optionalString(body.email);
  const password = optionalString(body.password);
  const role = optionalString(body.role);
  const avatarUrl = optionalString(body.avatarUrl);
  if (!name) badRequest("Name is required.", "name");
  if (!email) badRequest("Email is required.", "email");
  if (!password || password.length < 8) {
    badRequest("Password is required (at least 8 characters).", "password");
  }
  if (!role) badRequest("Role is required.", "role");
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const existing = await usersTable.findOne({ email: email.toLowerCase() }).lean();
  if (existing) conflict("This email is already registered.", "email");
  const passwordHash = await hashPassword(password);
  const employeeId = role === "developer" ? await generateEmployeeId(name) : null;
  const userId = await getNextSequence("users");
  const user = await usersTable.create({
    id: userId,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    subType: optionalString(body.subType) ?? null,
    designation: optionalString(body.designation) ?? null,
    avatarUrl: avatarUrl ?? null,
    department: optionalString(body.department) || "Engineering",
    phoneNumber: optionalString(body.phoneNumber) ?? null,
    joiningDate: body.joiningDate ? new Date(String(body.joiningDate)) : null,
    linkedinUrl: optionalString(body.linkedinUrl) ?? null,
    employeeId
  });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: 1,
    setByUserId: req.user.id,
    setByLabel: req.user.name,
    passwordEncrypted: encryptPasswordForHistory(password),
    trigger: "initial_setup",
    status: "active"
  });
  res.status(201).json(formatUser(user));
}
async function patchUsersMePassword(req, res) {
  const currentPassword = optionalString(req.body.currentPassword);
  const newPassword = optionalString(req.body.newPassword);
  if (!currentPassword) badRequest("Current password is required.", "currentPassword");
  if (!newPassword || newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }
  const user = await usersTable.findOne({ id: req.user.id });
  if (!user) notFound("User");
  const { verifyPassword } = await import("../lib/password");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) badRequest("Current password is incorrect.", "currentPassword");
  await usersTable.updateOne({ id: user.id }, { $set: { passwordHash: await hashPassword(newPassword) } });
  res.json({ message: "Password changed" });
}
async function getUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const user = await usersTable.findOne({ id }).lean();
  if (!user) notFound("User");
  res.json(formatUser(user));
}
async function patchUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const body = req.body;
  const avatarUrl = body.avatarUrl !== void 0 ? optionalString(body.avatarUrl) : void 0;
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const user = await usersTable.findOneAndUpdate(
    { id },
    {
      $set: {
        ...body.name !== void 0 && { name: optionalString(body.name) },
        ...body.email !== void 0 && { email: optionalString(body.email)?.toLowerCase() },
        ...body.subType !== void 0 && { subType: optionalString(body.subType) ?? null },
        ...body.designation !== void 0 && { designation: optionalString(body.designation) ?? null },
        ...body.avatarUrl !== void 0 && { avatarUrl: avatarUrl ?? null },
        ...body.status !== void 0 && { status: body.status },
        ...body.department !== void 0 && { department: optionalString(body.department) },
        ...body.phoneNumber !== void 0 && { phoneNumber: optionalString(body.phoneNumber) ?? null },
        ...body.joiningDate !== void 0 && {
          joiningDate: body.joiningDate ? new Date(String(body.joiningDate)) : null
        },
        ...body.linkedinUrl !== void 0 && { linkedinUrl: optionalString(body.linkedinUrl) ?? null }
      }
    },
    { new: true }
  );
  if (!user) notFound("User");
  res.json(formatUser(user));
}
async function deleteUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const result = await usersTable.updateOne({ id }, { $set: { status: "inactive" } });
  if (result.matchedCount === 0) notFound("User");
  res.json({ message: "User deactivated" });
}
async function patchUsersByIdPassword(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const newPassword = optionalString(req.body.newPassword);
  if (!newPassword || newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }
  const hash = await hashPassword(newPassword);
  const user = await usersTable.findOneAndUpdate({ id }, { $set: { passwordHash: hash } }, { new: true });
  if (!user) notFound("User");
  await credentialHistoryTable.updateMany(
    { userId: id, status: "active" },
    { $set: { status: "expired", replacedAt: /* @__PURE__ */ new Date() } }
  );
  const credCount = await credentialHistoryTable.countDocuments({ userId: id });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: id,
    entryNumber: credCount + 1,
    setByUserId: req.user.id,
    setByLabel: req.user.name,
    passwordEncrypted: encryptPasswordForHistory(newPassword),
    trigger: "admin_reset",
    status: "active"
  });
  res.json({ message: "Password reset" });
}
async function getUsersByIdCredentials(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const records = await credentialHistoryTable.find({ userId: id }, { id: 1, entryNumber: 1, setByLabel: 1, createdAt: 1, replacedAt: 1, status: 1, trigger: 1 }).sort({ createdAt: -1 }).lean();
  res.json(
    records.map((r) => ({
      id: r.id,
      entryNumber: r.entryNumber,
      setBy: r.setByLabel,
      setAt: toIso(r.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
      replacedAt: toIso(r.replacedAt),
      status: r.status,
      trigger: r.trigger
    }))
  );
}
async function postUsersByIdCredentialsByCredIdReveal(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const credId = parseIdParam(req.params.credId, "credential id");
  const credential = await credentialHistoryTable.findOne({ id: credId, userId: id });
  if (!credential) notFound("Credential record");
  const plainPassword = decryptPasswordFromHistory(credential.passwordEncrypted);
  const auditId = await getNextSequence("audit_logs");
  await auditLogsTable.create({
    id: auditId,
    actorId: req.user.id,
    action: "reveal_credential",
    entityType: "user",
    entityId: id,
    newVal: `Credential entry #${credential.entryNumber} revealed by Admin ${req.user.name}`,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    createdAt: /* @__PURE__ */ new Date()
  });
  res.json({ password: plainPassword });
}
export {
  deleteUsersById,
  getUsers,
  getUsersById,
  getUsersByIdCredentials,
  getUsersPreviewEmployeeId,
  patchUsersById,
  patchUsersByIdPassword,
  patchUsersMePassword,
  postUsers,
  postUsersByIdCredentialsByCredIdReveal
};
