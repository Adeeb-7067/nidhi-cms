import { toIso } from "@/utils/mongo-list";
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
    status: user.status,
    lastLoginAt: toIso(user.lastLoginAt),
    createdAt: toIso(user.createdAt) ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
export {
  formatUser
};
