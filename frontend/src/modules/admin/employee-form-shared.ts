import * as z from "zod";
import {
  coerceEmployeeId,
  EMPLOYEE_POSITIONS,
  EMPLOYEE_TYPES,
  HR_EMPLOYMENT_STATUSES,
  normalizeEmployeeBloodGroup,
  normalizeEmployeeGender,
  normalizeEmployeeMaritalStatus,
  splitDisplayName,
} from "@/modules/hrm/employee-profile-types";
import { normalizePhoneForForm, normalizePhoneForSubmit, optionalPhoneZod } from "@/lib/phone-input";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
});

const bankSchema = z.object({
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  ifsc: z.string().optional(),
});

export const teamEmployeeSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional().or(z.literal("")),
    role: z.string().min(1, "Role is required"),
    roleTemplateId: z.number().nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    designation: z.string().optional(),
    subType: z.string().optional(),
    departmentId: z.number().nullable().optional(),
    reportingManagerId: z.number().nullable().optional(),
    teamleaderId: z.number().nullable().optional(),
    shiftId: z.number().nullable().optional(),
    wfhMonthlyLimit: z.coerce.number().min(0),
    leaveAccrualDaysPerMonth: z.string().optional(),
    phoneNumber: optionalPhoneZod,
    joiningDate: z.string().optional(),
    exitDate: z.string().optional(),
    probationEndDate: z.string().optional(),
    linkedinUrl: z.string().optional(),
    githubId: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    bloodGroup: z.string().optional(),
    bio: z.string().optional(),
    employeeType: z.string().optional(),
    hrEmploymentStatus: z.string().optional(),
    position: z.string().optional(),
    aadharNumber: z.string().optional(),
    panNumber: z.string().optional(),
    lateChargePercentage: z.coerce.number().min(0).max(100).optional(),
    permanentAddress: addressSchema.optional(),
    currentAddress: addressSchema.optional(),
    socialTwitter: z.string().optional(),
    socialFacebook: z.string().optional(),
    socialInstagram: z.string().optional(),
    socialWebsite: z.string().optional(),
    salaryBasic: z.string().optional(),
    salaryAllowances: z.string().optional(),
    salaryDeductions: z.string().optional(),
    salaryNet: z.string().optional(),
    bankAccountHolder: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    bankIfsc: z.string().optional(),
    resumeUrl: z.string().optional(),
    idProofUrl: z.string().optional(),
    addressProofUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const pwd = data.password?.trim() ?? "";
    if (pwd.length > 0 && pwd.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["password"],
      });
    }

    const basic = parseSalaryFieldNumber(data.salaryBasic);
    const allowances = parseSalaryFieldNumber(data.salaryAllowances);
    const deductions = parseSalaryFieldNumber(data.salaryDeductions);
    if ((allowances > 0 || deductions > 0) && basic <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Basic salary is required when allowances or deductions are set",
        path: ["salaryBasic"],
      });
    }

    const aadhar = data.aadharNumber?.trim() ?? "";
    if (aadhar && !/^\d{12}$/.test(aadhar)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aadhar must be exactly 12 digits",
        path: ["aadharNumber"],
      });
    }

    const pan = data.panNumber?.trim().toUpperCase() ?? "";
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid PAN (e.g. ABCDE1234F)",
        path: ["panNumber"],
      });
    }

    const githubRaw = data.githubId?.trim() ?? "";
    if (githubRaw && !normalizeGithubId(githubRaw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid GitHub username or profile URL",
        path: ["githubId"],
      });
    }
  });

export type TeamEmployeeFormValues = z.infer<typeof teamEmployeeSchema>;

export type EmployeeFormTab = "personal" | "address" | "work" | "compensation" | "documents";

export const EMPLOYEE_FORM_TAB_FIELDS: Record<EmployeeFormTab, (keyof TeamEmployeeFormValues)[]> = {
  personal: ["name", "email", "password"],
  address: [],
  work: ["role", "designation"],
  compensation: ["salaryBasic", "salaryAllowances", "salaryDeductions", "aadharNumber", "panNumber"],
  documents: [],
};

function parseSalaryFieldNumber(value: string | undefined): number {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Net = basic + allowances − deductions (floored at 0). */
export function computeTeamEmployeeNetSalary(
  basic: string | undefined,
  allowances: string | undefined,
  deductions: string | undefined,
): number {
  const net =
    parseSalaryFieldNumber(basic) +
    parseSalaryFieldNumber(allowances) -
    parseSalaryFieldNumber(deductions);
  return Math.max(0, Math.round(net * 100) / 100);
}

export function normalizeGithubId(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  let handle = raw.startsWith("@") ? raw.slice(1) : raw;
  const urlMatch = handle.match(/github\.com\/([^/?#]+)/i);
  if (urlMatch) handle = urlMatch[1];
  handle = handle.replace(/\/$/, "");
  const valid = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return valid.test(handle) ? handle : "";
}

export function githubProfileUrl(githubId: string | null | undefined): string | null {
  const handle = normalizeGithubId(githubId);
  return handle ? `https://github.com/${handle}` : null;
}

export function formatTeamEmployeeNetSalaryField(
  basic: string | undefined,
  allowances: string | undefined,
  deductions: string | undefined,
): string {
  const hasAny =
    Boolean(basic?.trim()) ||
    Boolean(allowances?.trim()) ||
    Boolean(deductions?.trim());
  if (!hasAny) return "";
  return String(computeTeamEmployeeNetSalary(basic, allowances, deductions));
}

/** Freelancers are project-paid — hide full-time HRM fields on the All-team form. */
export function isFreelancerTeamFormRole(role: string | null | undefined): boolean {
  return role === "freelancer";
}

type UseFormSetValueLike = (
  name: keyof TeamEmployeeFormValues,
  value: TeamEmployeeFormValues[keyof TeamEmployeeFormValues],
  opts?: { shouldDirty?: boolean },
) => void;

/** Clear / neutralize HRM-only values when switching the form to Freelancer. */
export function applyFreelancerTeamFormDefaults(setValue: UseFormSetValueLike) {
  const opts = { shouldDirty: true } as const;
  setValue("employeeType", "PART-TIME", opts);
  setValue("position", "EMPLOYEE", opts);
  setValue("departmentId", null, opts);
  setValue("reportingManagerId", null, opts);
  setValue("teamleaderId", null, opts);
  setValue("shiftId", null, opts);
  setValue("wfhMonthlyLimit", 0, opts);
  setValue("leaveAccrualDaysPerMonth", "", opts);
  setValue("probationEndDate", "", opts);
  setValue("lateChargePercentage", 0, opts);
  setValue("salaryBasic", "", opts);
  setValue("salaryAllowances", "", opts);
  setValue("salaryDeductions", "", opts);
  setValue("salaryNet", "", opts);
}

export function defaultTeamEmployeeFormValues(defaultDepartmentId: number | null): TeamEmployeeFormValues {
  return {
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    password: "",
    role: "developer",
    roleTemplateId: null,
    status: "active",
    designation: "",
    subType: "",
    departmentId: defaultDepartmentId,
    reportingManagerId: null,
    teamleaderId: null,
    shiftId: null,
    wfhMonthlyLimit: 4,
    leaveAccrualDaysPerMonth: "",
    phoneNumber: "",
    joiningDate: new Date().toISOString().split("T")[0],
    exitDate: "",
    probationEndDate: "",
    linkedinUrl: "",
    githubId: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    bloodGroup: "",
    bio: "",
    employeeType: "FULL-TIME",
    hrEmploymentStatus: "Active",
    position: "EMPLOYEE",
    aadharNumber: "",
    panNumber: "",
    lateChargePercentage: 100,
    permanentAddress: { street: "", city: "", state: "", country: "", zipCode: "" },
    currentAddress: { street: "", city: "", state: "", country: "", zipCode: "" },
    socialTwitter: "",
    socialFacebook: "",
    socialInstagram: "",
    socialWebsite: "",
    salaryBasic: "",
    salaryAllowances: "",
    salaryDeductions: "",
    salaryNet: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankName: "",
    bankBranch: "",
    bankIfsc: "",
    resumeUrl: "",
    idProofUrl: "",
    addressProofUrl: "",
  };
}

type UserLike = Record<string, unknown>;

type CmsRoleOptionLike = { value: string; templateId?: number };
type RoleTemplateLike = { id: number; code: string; cmsRole?: string | null };

/** Mirrors backend defaultTemplateByRole — used when assignable roles omit templateId. */
const DEFAULT_TEMPLATE_CODE_BY_ROLE: Record<string, string> = {
  super_admin: "super_admin",
  hr: "hr_admin",
  manager: "manager",
  developer: "employee",
  tester: "employee",
  qa: "employee",
  freelancer: "employee",
  bde: "bde",
};

function coerceTemplateId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Template id persisted on the user document (explicit assignment only). */
export function storedRoleTemplateId(user: UserLike): number | null {
  return coerceTemplateId(user.roleTemplateId) ?? coerceTemplateId(user.hrmRoleTemplateId);
}

/** Template to show in the form — explicit id or the role's default template. */
export function resolveEmployeeRoleTemplateId(
  user: UserLike,
  cmsRoleOptions: CmsRoleOptionLike[] = [],
  roleTemplates: RoleTemplateLike[] = [],
): number | null {
  const stored = storedRoleTemplateId(user);
  if (stored != null) return stored;
  const role = String(user.role ?? "");
  const match = cmsRoleOptions.find((r) => r.value === role);
  if (match?.templateId != null) return Number(match.templateId);

  const defaultCode = DEFAULT_TEMPLATE_CODE_BY_ROLE[role];
  if (defaultCode) {
    const byCode = roleTemplates.find((t) => t.code === defaultCode);
    if (byCode) return byCode.id;
  }
  const byCmsRole = roleTemplates.find((t) => t.cmsRole === role);
  return byCmsRole?.id ?? null;
}

function dateInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

type ProfileDocumentRow = { type?: string; fileUrl?: string; name?: string };

type HrmDocumentRow = { category?: string; name?: string; fileUrl?: string };

function pickStoredUrl(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (value) return value;
  }
  return "";
}

function profileDocumentUrl(docs: ProfileDocumentRow[], ...types: string[]): string {
  const wanted = new Set(types.map((t) => t.toLowerCase()));
  const match = docs.find((doc) => {
    const type = String(doc.type ?? "").toLowerCase();
    const name = String(doc.name ?? "").toLowerCase();
    return [...wanted].some((t) => type.includes(t) || name.includes(t));
  });
  return match?.fileUrl?.trim() ?? "";
}

/** Fill resume / proof upload fields from HRM document library when profile URLs are empty. */
export function enrichEmployeeFormFromHrmDocuments(
  values: TeamEmployeeFormValues,
  documents: HrmDocumentRow[],
): TeamEmployeeFormValues {
  if (!documents.length) return values;

  const next = { ...values };
  const fileUrl = (doc?: HrmDocumentRow) => doc?.fileUrl?.trim() ?? "";
  const name = (doc?: HrmDocumentRow) => String(doc?.name ?? "").toLowerCase();

  if (!next.resumeUrl?.trim()) {
    const resumeDoc = documents.find(
      (doc) => doc.category === "resume" || /resume/i.test(doc.name ?? ""),
    );
    if (resumeDoc) next.resumeUrl = fileUrl(resumeDoc);
  }

  const proofDocs = documents.filter(
    (doc) =>
      doc.category === "id_proof" ||
      /id\s*proof|address\s*proof|aadhaar|aadhar|pan|passport/i.test(doc.name ?? ""),
  );

  if (!next.idProofUrl?.trim()) {
    const idDoc =
      proofDocs.find((doc) => /id\s*proof|aadhaar|aadhar|pan|passport/i.test(name(doc))) ??
      proofDocs[0];
    if (idDoc) next.idProofUrl = fileUrl(idDoc);
  }

  if (!next.addressProofUrl?.trim()) {
    const addressDoc =
      proofDocs.find((doc) => /address/i.test(name(doc))) ??
      proofDocs.find((doc) => fileUrl(doc) && fileUrl(doc) !== next.idProofUrl);
    if (addressDoc) next.addressProofUrl = fileUrl(addressDoc);
  }

  return next;
}

function matchEmployeeOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  if (value == null || value === "") return fallback;
  const str = String(value).trim();
  if (options.includes(str as T)) return str as T;
  const lower = str.toLowerCase();
  const found = options.find((o) => o.toLowerCase() === lower);
  return (found ?? fallback) as T;
}

/** Stable key for edit-dialog hydration — changes when server profile or department list updates. */
export function teamEmployeeEditHydrateKey(
  user: UserLike,
  defaultDepartmentId: number | null,
  departments?: Array<{ id: number; name: string }>,
): string {
  const mapped = mapUserToTeamEmployeeForm(user, defaultDepartmentId, departments);
  return JSON.stringify({ ...mapped, roleTemplateId: storedRoleTemplateId(user) });
}

export function mapUserToTeamEmployeeForm(
  user: UserLike,
  defaultDepartmentId: number | null,
  departments?: Array<{ id: number; name: string }>,
  cmsRoleOptions: CmsRoleOptionLike[] = [],
  roleTemplates: RoleTemplateLike[] = [],
): TeamEmployeeFormValues {
  const split = splitDisplayName(user.name as string);
  const social = (user.socialProfiles as Record<string, string> | undefined) ?? {};
  const perm = (user.permanentAddress as TeamEmployeeFormValues["permanentAddress"]) ?? {};
  const curr = (user.currentAddress as TeamEmployeeFormValues["currentAddress"]) ?? {};
  const salary = (user.salary as Record<string, unknown> | undefined) ?? {};
  const bank = (salary.bankAccount as Record<string, string> | undefined) ?? {};
  const profileDocs = Array.isArray(user.profileDocuments)
    ? (user.profileDocuments as ProfileDocumentRow[])
    : [];

  let departmentId = coerceEmployeeId(user.departmentId) ?? defaultDepartmentId;
  if (departmentId == null && departments?.length) {
    const legacyName = user.department as string | undefined;
    if (legacyName) {
      const match = departments.find((d) => d.name === legacyName);
      if (match) departmentId = match.id;
    }
  }

  return {
    ...defaultTeamEmployeeFormValues(defaultDepartmentId),
    firstName: (user.firstName as string) ?? split.firstName,
    lastName: (user.lastName as string) ?? split.lastName,
    name: (user.name as string) ?? "",
    email: (user.email as string) ?? "",
    password: "",
    role: (user.role as TeamEmployeeFormValues["role"]) ?? "developer",
    roleTemplateId: resolveEmployeeRoleTemplateId(user, cmsRoleOptions, roleTemplates),
    status: (user.status as TeamEmployeeFormValues["status"]) ?? "active",
    designation: (user.designation as string) ?? "",
    subType: (user.subType as string) ?? "",
    departmentId,
    reportingManagerId:
      coerceEmployeeId(user.reportingManagerId) ?? coerceEmployeeId(user.managerId) ?? null,
    teamleaderId: coerceEmployeeId(user.teamleaderId),
    shiftId: coerceEmployeeId(user.shiftId),
    wfhMonthlyLimit: (user.wfhMonthlyLimit as number) ?? 4,
    leaveAccrualDaysPerMonth:
      user.leaveAccrualDaysPerMonth != null ? String(user.leaveAccrualDaysPerMonth) : "",
    phoneNumber: normalizePhoneForForm((user.phoneNumber as string) ?? ""),
    joiningDate: dateInput(user.joiningDate),
    exitDate: dateInput(user.exitDate),
    probationEndDate: dateInput(user.probationEndDate),
    linkedinUrl: (user.linkedinUrl as string) ?? social.linkedin ?? "",
    githubId: normalizeGithubId(user.githubId ?? social.github),
    dob: dateInput(user.dob),
    gender: normalizeEmployeeGender(user.gender),
    maritalStatus: normalizeEmployeeMaritalStatus(user.maritalStatus),
    bloodGroup: normalizeEmployeeBloodGroup(user.bloodGroup),
    bio: (user.bio as string) ?? "",
    employeeType: matchEmployeeOption(user.employeeType, EMPLOYEE_TYPES, "FULL-TIME"),
    hrEmploymentStatus: matchEmployeeOption(user.hrEmploymentStatus, HR_EMPLOYMENT_STATUSES, "Active"),
    position: matchEmployeeOption(user.position, EMPLOYEE_POSITIONS, "EMPLOYEE"),
    aadharNumber: user.aadharNumber != null ? String(user.aadharNumber) : "",
    panNumber: (user.panNumber as string) ?? "",
    lateChargePercentage: (user.lateChargePercentage as number) ?? 100,
    permanentAddress: {
      street: perm.street ?? "",
      city: perm.city ?? "",
      state: perm.state ?? "",
      country: perm.country ?? "",
      zipCode: perm.zipCode ?? "",
    },
    currentAddress: {
      street: curr.street ?? "",
      city: curr.city ?? "",
      state: curr.state ?? "",
      country: curr.country ?? "",
      zipCode: curr.zipCode ?? "",
    },
    socialTwitter: social.twitter ?? "",
    socialFacebook: social.facebook ?? "",
    socialInstagram: social.instagram ?? "",
    socialWebsite: social.website ?? "",
    salaryBasic: salary.basicSalary != null ? String(salary.basicSalary) : "",
    salaryAllowances: salary.allowances != null ? String(salary.allowances) : "",
    salaryDeductions: salary.deductions != null ? String(salary.deductions) : "",
    salaryNet: formatTeamEmployeeNetSalaryField(
      salary.basicSalary != null ? String(salary.basicSalary) : "",
      salary.allowances != null ? String(salary.allowances) : "",
      salary.deductions != null ? String(salary.deductions) : "",
    ),
    bankAccountHolder: bank.accountHolderName ?? "",
    bankAccountNumber: bank.accountNumber ?? "",
    bankName: bank.bankName ?? "",
    bankBranch: bank.branchName ?? "",
    bankIfsc: bank.ifsc ?? "",
    resumeUrl: pickStoredUrl(
      user.resumeUrl as string,
      profileDocumentUrl(profileDocs, "resume"),
    ),
    idProofUrl: pickStoredUrl(
      user.idProofUrl as string,
      profileDocumentUrl(profileDocs, "id proof", "id_proof"),
    ),
    addressProofUrl: pickStoredUrl(
      user.addressProofUrl as string,
      profileDocumentUrl(profileDocs, "address proof", "address_proof"),
    ),
  };
}

export function buildTeamEmployeePayload(
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
) {
  const isFreelancer = isFreelancerTeamFormRole(values.role);
  const departmentName =
    values.departmentId != null
      ? departmentNameById.get(values.departmentId) ?? "Engineering"
      : isFreelancer
        ? "Freelancers"
        : "Engineering";
  const fullName =
    `${values.firstName?.trim() ?? ""} ${values.lastName?.trim() ?? ""}`.trim() || values.name.trim();

  const bankAccount = {
    accountHolderName: values.bankAccountHolder ?? "",
    accountNumber: values.bankAccountNumber ?? "",
    bankName: values.bankName ?? "",
    branchName: values.bankBranch ?? "",
    ifsc: values.bankIfsc ?? "",
  };

  return {
    name: fullName,
    firstName: values.firstName?.trim() ?? "",
    lastName: values.lastName?.trim() ?? "",
    email: values.email,
    role: values.role,
    status: values.status ?? "active",
    roleTemplateId: values.roleTemplateId ?? null,
    designation: values.designation,
    subType: values.subType,
    department: departmentName,
    departmentId: isFreelancer ? null : values.departmentId ?? null,
    reportingManagerId: isFreelancer ? null : values.reportingManagerId ?? null,
    managerId: isFreelancer ? null : values.reportingManagerId ?? null,
    teamleaderId: isFreelancer ? null : values.teamleaderId ?? null,
    shiftId: isFreelancer ? null : values.shiftId ?? null,
    wfhMonthlyLimit: isFreelancer ? 0 : values.wfhMonthlyLimit,
    leaveAccrualDaysPerMonth: isFreelancer
      ? null
      : values.leaveAccrualDaysPerMonth === "" || values.leaveAccrualDaysPerMonth == null
        ? null
        : Number(values.leaveAccrualDaysPerMonth),
    phoneNumber: normalizePhoneForSubmit(values.phoneNumber) || undefined,
    joiningDate: values.joiningDate || null,
    exitDate: values.exitDate || null,
    probationEndDate: isFreelancer ? null : values.probationEndDate || null,
    linkedinUrl: values.linkedinUrl,
    githubId: normalizeGithubId(values.githubId) || null,
    dob: values.dob || null,
    gender: values.gender?.trim() ?? "",
    maritalStatus: values.maritalStatus?.trim() ?? "",
    bloodGroup: values.bloodGroup?.trim() ?? "",
    bio: values.bio ?? "",
    employeeType: isFreelancer ? "PART-TIME" : values.employeeType ?? "FULL-TIME",
    hrEmploymentStatus: values.hrEmploymentStatus ?? "Active",
    position: values.position ?? "EMPLOYEE",
    aadharNumber: values.aadharNumber ? Number(values.aadharNumber) : null,
    panNumber: values.panNumber || null,
    lateChargePercentage: isFreelancer ? 0 : values.lateChargePercentage ?? 100,
    permanentAddress: values.permanentAddress,
    currentAddress: values.currentAddress,
    socialProfiles: {
      linkedin: values.linkedinUrl ?? "",
      github: normalizeGithubId(values.githubId) || "",
      twitter: values.socialTwitter ?? "",
      facebook: values.socialFacebook ?? "",
      instagram: values.socialInstagram ?? "",
      website: values.socialWebsite ?? "",
    },
    salary: {
      // Freelancers are paid per project engagement — not monthly payroll.
      basicSalary: isFreelancer ? 0 : parseSalaryFieldNumber(values.salaryBasic),
      allowances: isFreelancer ? 0 : parseSalaryFieldNumber(values.salaryAllowances),
      deductions: isFreelancer ? 0 : parseSalaryFieldNumber(values.salaryDeductions),
      netSalary: isFreelancer
        ? 0
        : computeTeamEmployeeNetSalary(
            values.salaryBasic,
            values.salaryAllowances,
            values.salaryDeductions,
          ),
      bankAccount,
    },
    resumeUrl: values.resumeUrl || null,
    idProofUrl: values.idProofUrl || null,
    addressProofUrl: values.addressProofUrl || null,
    leave: {
      monthlyQuota: isFreelancer
        ? 0
        : values.leaveAccrualDaysPerMonth === "" || values.leaveAccrualDaysPerMonth == null
          ? null
          : Number(values.leaveAccrualDaysPerMonth),
    },
    wfh: { monthlyLimit: isFreelancer ? 0 : values.wfhMonthlyLimit },
  };
}

function payloadFieldEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Send only fields that changed vs the loaded profile — avoids wiping template/shift on unrelated edits. */
export function buildTeamEmployeePatchPayload(
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
  baseline: TeamEmployeeFormValues,
) {
  const next = buildTeamEmployeePayload(values, departmentNameById);
  const prev = buildTeamEmployeePayload(baseline, departmentNameById);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (!payloadFieldEqual(value, prev[key as keyof typeof prev])) {
      patch[key] = value;
    }
  }
  return patch;
}
