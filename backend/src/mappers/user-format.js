import { toIso } from "../utils/mongo-list.js";
import { attachPresenceToUser } from "../services/presence.js";

function formatUser(user, { withPresence = false } = {}) {
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
    phoneNumber: user.phoneNumber ?? null,
    joiningDate: toIso(user.joiningDate),
    linkedinUrl: user.linkedinUrl ?? null,
    status: user.status,
    lastLoginAt: toIso(user.lastLoginAt),
    lastSeenAt: toIso(user.lastSeenAt),
    createdAt: toIso(user.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString(),
  };
  return withPresence ? attachPresenceToUser(base) : base;
}
export {
  formatUser
};
