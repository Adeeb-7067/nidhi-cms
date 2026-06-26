import type { HrmEmployee } from "./types";
import type { EmployeeEmergencyContact } from "./employee-profile-types";

/** Legacy user.department values that are CMS roles, not org departments. */
const ROLE_LIKE_DEPARTMENT_LABELS = new Set([
  "developer",
  "tester",
  "qa",
  "freelancer",
  "manager",
  "hr",
  "bde",
  "super_admin",
  "client",
  "engineering",
]);

export function resolveEmployeeDisplayId(employee: HrmEmployee): string {
  const id = employee.employeeId?.trim();
  if (id) return id;
  return `EMP-${String(employee.id).padStart(3, "0")}`;
}

function isRoleLikeDepartmentLabel(label: string, role?: string | null) {
  const normalized = label.toLowerCase();
  return ROLE_LIKE_DEPARTMENT_LABELS.has(normalized) || normalized === role?.toLowerCase();
}

export function resolveDepartmentLabel(employee: HrmEmployee): string {
  const deptName = employee.departmentName?.trim();
  if (deptName && !isRoleLikeDepartmentLabel(deptName, employee.role)) return deptName;
  if (employee.departmentCode?.trim()) return employee.departmentCode.trim();

  const legacy = employee.department?.trim();
  if (!legacy) return "—";
  if (ROLE_LIKE_DEPARTMENT_LABELS.has(legacy.toLowerCase())) return "—";
  if (legacy.toLowerCase() === employee.role?.toLowerCase()) return "—";

  return legacy;
}

export function resolveEmergencyContact(employee: HrmEmployee): EmployeeEmergencyContact | null {
  const primary = employee.emergencyContacts?.find(
    (c) => c?.name?.trim() || c?.phone?.trim(),
  );
  if (primary) return primary;
  return null;
}

export function formatEmergencyContactLine(employee: HrmEmployee): string {
  const contact = resolveEmergencyContact(employee);
  if (!contact) {
    if (employee.phoneNumber?.trim()) {
      return `Mobile · ${employee.phoneNumber.trim()}`;
    }
    return "Not on file";
  }
  const parts = [contact.name, contact.phone, contact.relation].filter((p) => p?.trim());
  return parts.join(" · ") || "Not on file";
}

export function formatBloodGroup(employee: HrmEmployee): string {
  const bg = employee.bloodGroup?.trim();
  return bg || "Not on file";
}

export function formatPhone(employee: HrmEmployee): string {
  return employee.phoneNumber?.trim() || "Not on file";
}

export function formatEmail(employee: HrmEmployee): string {
  return employee.email?.trim() || "Not on file";
}
