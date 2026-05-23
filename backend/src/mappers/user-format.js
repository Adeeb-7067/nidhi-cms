import { toIso } from "../utils/mongo-list.js";
function formatUser(user) {
  return {
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
    createdAt: toIso(user.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
export {
  formatUser
};
