import { toIso } from "../utils/mongo-list.js";
import { attachPresenceToUser } from "../services/presence.js";
import { formatUserProfileFields } from "../utils/user-profile-fields.js";

function formatUser(user, { withPresence = false, includeSensitive = false } = {}) {
  const base = {
    id: user.id,
    employeeId: user.employeeId ?? null,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType ?? null,
    designation: user.designation ?? null,
    avatarUrl: user.avatarUrl ?? null,
    department: user.department ?? null,
    departmentId: user.departmentId ?? null,
    reportingManagerId: user.reportingManagerId ?? null,
    hrmRoleTemplateId: user.hrmRoleTemplateId ?? user.roleTemplateId ?? null,
    roleTemplateId: user.roleTemplateId ?? user.hrmRoleTemplateId ?? null,
    wfhMonthlyLimit: user.wfhMonthlyLimit ?? null,
    leaveAccrualDaysPerMonth: user.leaveAccrualDaysPerMonth ?? null,
    phoneNumber: user.phoneNumber ?? null,
    joiningDate: toIso(user.joiningDate),
    linkedinUrl: user.linkedinUrl ?? null,
    status: user.status,
    lastLoginAt: toIso(user.lastLoginAt),
    lastSeenAt: toIso(user.lastSeenAt),
    createdAt: toIso(user.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
    ...formatUserProfileFields(user, { includeSensitive }),
  };
  return withPresence ? attachPresenceToUser(base) : base;
}
export {
  formatUser
};
