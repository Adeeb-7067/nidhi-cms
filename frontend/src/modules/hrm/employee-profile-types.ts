/** Shared employee profile shape — mirrors CMS users + legacy Satyakabir fields. */

export type EmployeeAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
};

export type EmployeeSocialProfiles = {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  website?: string;
};

export type EmployeeSalaryProfile = {
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  netSalary?: number;
  bankAccount?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    branchName?: string;
    ifsc?: string;
  };
};

export type EmployeeProfileExtension = {
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  dob?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  permanentAddress?: EmployeeAddress | null;
  currentAddress?: EmployeeAddress | null;
  exitDate?: string | null;
  probationEndDate?: string | null;
  employeeType?: string | null;
  hrEmploymentStatus?: string | null;
  teamleaderId?: number | null;
  managerId?: number | null;
  salary?: EmployeeSalaryProfile | null;
  shiftId?: number | null;
  weeklyOff?: string[];
  bio?: string | null;
  bloodGroup?: string | null;
  socialProfiles?: EmployeeSocialProfiles | null;
  position?: string | null;
  aadharNumber?: number | null;
  panNumber?: string | null;
  leaveBalance?: number | null;
  totalWorkFromHome?: number | null;
  leaveAvailable?: number | null;
  lateChargePercentage?: number | null;
  monthlyLeaveQuota?: number | null;
  resumeUrl?: string | null;
  idProofUrl?: string | null;
  addressProofUrl?: string | null;
};

export const EMPLOYEE_GENDERS = ["Male", "Female", "Other"] as const;
export const EMPLOYEE_MARITAL_STATUSES = ["Single", "Married", "Other"] as const;
export const EMPLOYEE_TYPES = ["FULL-TIME", "PART-TIME", "INTERN"] as const;
export const HR_EMPLOYMENT_STATUSES = ["Active", "Inactive", "Resigned", "Terminated"] as const;
export const EMPLOYEE_POSITIONS = ["HR", "MANAGER", "TEAM_LEADER", "EMPLOYEE", "ADMIN"] as const;
export const EMPLOYEE_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""] as const;
export const EMPLOYEE_WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function splitDisplayName(name?: string | null) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function formatAddressLine(addr?: EmployeeAddress | null) {
  if (!addr) return "—";
  const parts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export function getEmployeeDisplayName(user: {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const fn = user.firstName?.trim();
  const ln = user.lastName?.trim();
  if (fn || ln) return `${fn ?? ""} ${ln ?? ""}`.trim();
  return user.name ?? "Employee";
}

/** Matches PATCH /api/hrm/users/:userId/profile body. */
export type HrmProfilePatchPayload = {
  userId: number;
  departmentId?: number | null;
  reportingManagerId?: number | null;
  managerId?: number | null;
  teamleaderId?: number | null;
  shiftId?: number | null;
  hrmRoleTemplateId?: number | null;
  roleTemplateId?: number | null;
  wfhMonthlyLimit?: number;
  leaveAccrualDaysPerMonth?: number | null;
  employeeType?: string | null;
  hrEmploymentStatus?: string | null;
  position?: string | null;
  designation?: string | null;
  subType?: string | null;
  status?: string;
  bio?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  lateChargePercentage?: number | null;
  exitDate?: string | null;
  probationEndDate?: string | null;
  joiningDate?: string | null;
  dob?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  linkedinUrl?: string | null;
  permanentAddress?: EmployeeAddress | null;
  currentAddress?: EmployeeAddress | null;
  salary?: EmployeeSalaryProfile | null;
  socialProfiles?: EmployeeSocialProfiles | null;
  weeklyOff?: string[];
  aadharNumber?: number | null;
  panNumber?: string | null;
  resumeUrl?: string | null;
  idProofUrl?: string | null;
  addressProofUrl?: string | null;
};

export function getLeaveBalanceCarriedForward(balance: {
  carriedForward?: number;
  carryForward?: number;
}) {
  return balance.carriedForward ?? balance.carryForward ?? 0;
}

export function getLeaveBalanceAvailable(balance: {
  available?: number;
  allocated?: number;
  used?: number;
  pending?: number;
  carriedForward?: number;
  carryForward?: number;
}) {
  if (balance.available != null) return balance.available;
  const allocated = balance.allocated ?? 0;
  const used = balance.used ?? 0;
  const pending = balance.pending ?? 0;
  const carried = getLeaveBalanceCarriedForward(balance);
  return Math.max(0, allocated + carried - used - pending);
}
