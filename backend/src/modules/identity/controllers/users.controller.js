import {
  usersTable,
  credentialHistoryTable,
  auditLogsTable,
  getNextSequence,
  staffEmployeeRoles,
} from "../../../models/schema/index.js";
import {
  hashPassword,
  verifyPassword,
  encryptPasswordForHistory,
  decryptPasswordFromHistory,
} from "../../../lib/password.js";
import {
  verifyPasswordOtp,
  consumePasswordOtp,
} from "../services/password-otp.js";
import { generateEmployeeId, previewEmployeeId } from "../services/employeeId.js";
import { validateStoredFileUrl } from "../../../lib/file-storage.js";
import { evictUserFromAuthCache } from "../../../middlewares/auth.js";
import { notifyUser } from "../../../lib/realtime.js";
import { isUserAccountActive, revokeUserAccess } from "../services/user-access.js";
import { formatUser } from "../../../mappers/user-format.js";
import { paginateModel, toIso } from "../../../utils/mongo-list.js";
import {
  syncUserRoleTemplate,
  isValidUserRole,
} from "../services/permissions.service.js";
import {
  buildUserProfileCreateFields,
  buildUserProfilePatchSet,
  buildProfilePatchMongoUpdate,
} from "../../../utils/user-profile-fields.js";
import {
  leaveProfileFieldsTouched,
  recomputeUserLeaveAccrualForCurrentCycle,
} from "../../hrm/services/leave-accrual.service.js";
import { syncSalaryStructureFromProfile } from "../../hrm/services/payroll.service.js";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import {
  USER_DIRECTORY_PROJECTION,
  assertCanViewUserProfile,
  buildStaffPickerQuery,
  formatStaffPickerUser,
  isPeopleAdminRole,
} from "../../access/services/access-context.js";

async function getUsers(req, res) {
  const { role, subType, search, staff } = req.query;
  const pagination = parsePagination(req.query);
  const viewerRole = req.user.role;
  const isPeopleAdmin = isPeopleAdminRole(viewerRole);
  const isStaffPicker = staff === "true" || staff === "1";

  let query = {};
  let projection = USER_DIRECTORY_PROJECTION;
  let usePickerFormat = false;

  if (isStaffPicker) {
    const picker = await buildStaffPickerQuery(req.user);
    query = { ...picker.query };
    projection = picker.projection;
    usePickerFormat = picker.usePickerFormat;
  } else {
    if (!isPeopleAdmin) forbidden("You cannot list all users.");
    if (role) query.role = role;
  }
  if (subType) query.subType = subType;
  if (search?.trim()) {
    const term = { $regex: search.trim(), $options: "i" };
    query.$or = usePickerFormat
      ? [{ name: term }, { employeeId: term }]
      : [{ name: term }, { email: term }];
  }
  const { items, total, page, limit } = await paginateModel(
    usersTable,
    query,
    pagination,
    { projection },
  );
  res.json({
    users: usePickerFormat
      ? items.map((u) => formatStaffPickerUser(u))
      : items.map((u) => formatUser(u, { withPresence: true })),
    total,
    page,
    limit,
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
  if (!(await isValidUserRole(role))) badRequest("Invalid role.", "role");
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const existing = await usersTable.findOne({ email: email.toLowerCase() }).lean();
  if (existing) conflict("This email is already registered.", "email");
  const passwordHash = await hashPassword(password);
  const employeeId = staffEmployeeRoles.includes(role)
    ? await generateEmployeeId(name)
    : null;
  const userId = await getNextSequence("users");
  const explicitTemplateId =
    body.roleTemplateId !== undefined || body.hrmRoleTemplateId !== undefined
      ? (body.roleTemplateId ?? body.hrmRoleTemplateId ?? null)
      : undefined;
  const profileFields = buildUserProfileCreateFields(body);
  const user = await usersTable.create({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    role,
    employeeId,
    roleTemplateId: explicitTemplateId !== undefined ? explicitTemplateId : null,
    hrmRoleTemplateId: explicitTemplateId !== undefined ? explicitTemplateId : null,
    ...profileFields,
    name: profileFields.name ?? name,
    avatarUrl: profileFields.avatarUrl ?? avatarUrl ?? null,
    department: optionalString(body.department) || profileFields.department || "Engineering",
  });
  await syncUserRoleTemplate(user.id, role, {
    roleChanged: true,
    ...(typeof explicitTemplateId === "number" ? { explicitTemplateId } : {}),
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
  if (body.salary !== undefined) {
    await syncSalaryStructureFromProfile(user.id);
  }
  if (leaveProfileFieldsTouched(Object.keys(profileFields)) || profileFields.leaveAccrualDaysPerMonth != null) {
    await recomputeUserLeaveAccrualForCurrentCycle(user.id);
  }
  res.status(201).json(formatUser(user, { includeSensitive: true }));
}
async function patchUsersMePassword(req, res) {
  const currentPassword = optionalString(req.body.currentPassword);
  const newPassword = optionalString(req.body.newPassword);
  const otp = optionalString(req.body.otp);
  if (!newPassword || newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "newPassword");
  }
  const user = await usersTable.findOne({ id: req.user.id });
  if (!user) notFound("User");

  if (otp) {
    const record = await verifyPasswordOtp({
      email: user.email,
      otp,
      purpose: "change_password",
    });
    if (record.userId !== user.id) {
      badRequest("Verification code does not match your account.", "otp");
    }
    await consumePasswordOtp(record.id);
  } else {
    if (!currentPassword) {
      badRequest("Enter your current password or request an email verification code.", "currentPassword");
    }
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) badRequest("Current password is incorrect.", "currentPassword");
  }

  const hash = await hashPassword(newPassword);
  await usersTable.updateOne(
    { id: user.id },
    { $set: { passwordHash: hash, forcePasswordChange: false } },
  );
  res.json({ message: "Password changed" });
}
async function getUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const user = await usersTable.findOne({ id }).lean();
  if (!user) notFound("User");

  const { includeSensitive } = await assertCanViewUserProfile(req.user, id);
  res.json(formatUser(user, { withPresence: true, includeSensitive }));
}
async function adminSetUserPassword(userId, newPassword, adminUser) {
  if (!newPassword || newPassword.length < 8) {
    badRequest("New password must be at least 8 characters.", "password");
  }
  const hash = await hashPassword(newPassword);
  const user = await usersTable.findOneAndUpdate(
    { id: userId },
    { $set: { passwordHash: hash, forcePasswordChange: false } },
    { new: true },
  );
  if (!user) notFound("User");
  await credentialHistoryTable.updateMany(
    { userId, status: "active" },
    { $set: { status: "expired", replacedAt: /* @__PURE__ */ new Date() } },
  );
  const credCount = await credentialHistoryTable.countDocuments({ userId });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId,
    entryNumber: credCount + 1,
    setByUserId: adminUser.id,
    setByLabel: adminUser.name,
    passwordEncrypted: encryptPasswordForHistory(newPassword),
    trigger: "admin_reset",
    status: "active",
  });
  return user;
}
async function patchUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const existing = await usersTable.findOne({ id }, { status: 1, role: 1 }).lean();
  if (!existing) notFound("User");
  const body = req.body;
  const avatarUrl = body.avatarUrl !== void 0 ? optionalString(body.avatarUrl) : void 0;
  validateStoredFileUrl(avatarUrl, "avatarUrl");
  const password = optionalString(body.password) ?? optionalString(body.newPassword);
  if (password) {
    await adminSetUserPassword(id, password, req.user);
  }
  if (body.role !== void 0) {
    const nextRole = optionalString(body.role);
    if (!nextRole || !(await isValidUserRole(nextRole))) badRequest("Invalid role.", "role");
  }
  const roleChanged = body.role !== void 0 && optionalString(body.role) !== existing.role;
  const templateInBody =
    body.roleTemplateId !== void 0 || body.hrmRoleTemplateId !== void 0;
  const templateValue = templateInBody
    ? (body.roleTemplateId ?? body.hrmRoleTemplateId ?? null)
    : undefined;
  const profilePatch = buildUserProfilePatchSet(body);
  const mongoUpdate = buildProfilePatchMongoUpdate({
    ...profilePatch,
    ...body.name !== void 0 && !profilePatch.name && { name: optionalString(body.name) },
    ...body.email !== void 0 && { email: optionalString(body.email)?.toLowerCase() },
    ...body.role !== void 0 && { role: optionalString(body.role) },
    ...body.avatarUrl !== void 0 && { avatarUrl: avatarUrl ?? null },
    ...body.department !== void 0 && { department: optionalString(body.department) },
  });
  const user = await usersTable.findOneAndUpdate({ id }, mongoUpdate, { new: true, runValidators: true });
  if (!user) notFound("User");
  await syncUserRoleTemplate(id, user.role, {
    explicitTemplateId: templateInBody
      ? templateValue != null
        ? templateValue
        : null
      : undefined,
    roleChanged: roleChanged || (templateInBody && templateValue == null),
  });
  evictUserFromAuthCache(id); // role, name, email, or status may have changed

  const becameInactive = isUserAccountActive(existing) && !isUserAccountActive(user);
  if (becameInactive) {
    await revokeUserAccess(id);
    notifyUser(id, "user_deactivated", { userId: id });
  }

  if (body.role !== undefined) notifyUser(id, "role_updated", { userId: id, role: user.role });
  if (leaveProfileFieldsTouched(Object.keys(profilePatch))) {
    const override =
      Object.prototype.hasOwnProperty.call(profilePatch, "leaveAccrualDaysPerMonth")
        ? profilePatch.leaveAccrualDaysPerMonth
        : Object.prototype.hasOwnProperty.call(profilePatch, "monthlyLeaveQuota")
          ? profilePatch.monthlyLeaveQuota
          : profilePatch.leave?.monthlyQuota;
    await recomputeUserLeaveAccrualForCurrentCycle(id, {
      daysPerMonthOverride: override,
    });
  }
  if (body.salary !== undefined) {
    await syncSalaryStructureFromProfile(id);
  }
  res.json(formatUser(user, { withPresence: true, includeSensitive: true }));
}
async function deleteUsersById(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const existing = await usersTable.findOne({ id }, { status: 1 }).lean();
  if (!existing) notFound("User");

  await usersTable.updateOne({ id }, { $set: { status: "inactive" } });
  await revokeUserAccess(id);
  notifyUser(id, "user_deactivated", { userId: id });
  res.json({ message: "User deactivated" });
}
async function patchUsersByIdPassword(req, res) {
  const id = parseIdParam(req.params.id, "user id");
  const newPassword = optionalString(req.body.newPassword);
  await adminSetUserPassword(id, newPassword, req.user);
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
