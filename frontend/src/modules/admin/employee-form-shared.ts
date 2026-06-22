import * as z from "zod";
import { splitDisplayName } from "@/modules/hrm/employee-profile-types";

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
    role: z.enum(["developer", "tester", "qa", "manager", "hr", "super_admin", "freelancer"]),
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
    phoneNumber: z.string().optional(),
    joiningDate: z.string().optional(),
    exitDate: z.string().optional(),
    probationEndDate: z.string().optional(),
    linkedinUrl: z.string().optional(),
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
  });

export type TeamEmployeeFormValues = z.infer<typeof teamEmployeeSchema>;

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

function dateInput(value: unknown) {
  if (!value) return "";
  return new Date(String(value)).toISOString().split("T")[0];
}

export function mapUserToTeamEmployeeForm(
  user: UserLike,
  defaultDepartmentId: number | null,
  departments?: Array<{ id: number; name: string }>,
): TeamEmployeeFormValues {
  const split = splitDisplayName(user.name as string);
  const social = (user.socialProfiles as Record<string, string> | undefined) ?? {};
  const perm = (user.permanentAddress as TeamEmployeeFormValues["permanentAddress"]) ?? {};
  const curr = (user.currentAddress as TeamEmployeeFormValues["currentAddress"]) ?? {};
  const salary = (user.salary as Record<string, unknown> | undefined) ?? {};
  const bank = (salary.bankAccount as Record<string, string> | undefined) ?? {};

  let departmentId = (user.departmentId as number | null) ?? defaultDepartmentId;
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
    roleTemplateId: (user.roleTemplateId as number | null) ?? null,
    status: (user.status as TeamEmployeeFormValues["status"]) ?? "active",
    designation: (user.designation as string) ?? "",
    subType: (user.subType as string) ?? "",
    departmentId,
    reportingManagerId: (user.reportingManagerId as number | null) ?? (user.managerId as number | null) ?? null,
    teamleaderId: (user.teamleaderId as number | null) ?? null,
    shiftId: (user.shiftId as number | null) ?? null,
    wfhMonthlyLimit: (user.wfhMonthlyLimit as number) ?? 4,
    leaveAccrualDaysPerMonth:
      user.leaveAccrualDaysPerMonth != null ? String(user.leaveAccrualDaysPerMonth) : "",
    phoneNumber: (user.phoneNumber as string) ?? "",
    joiningDate: dateInput(user.joiningDate),
    exitDate: dateInput(user.exitDate),
    probationEndDate: dateInput(user.probationEndDate),
    linkedinUrl: (user.linkedinUrl as string) ?? social.linkedin ?? "",
    dob: dateInput(user.dob),
    gender: (user.gender as string) ?? "",
    maritalStatus: (user.maritalStatus as string) ?? "",
    bloodGroup: (user.bloodGroup as string) ?? "",
    bio: (user.bio as string) ?? "",
    employeeType: (user.employeeType as string) ?? "FULL-TIME",
    hrEmploymentStatus: (user.hrEmploymentStatus as string) ?? "Active",
    position: (user.position as string) ?? "EMPLOYEE",
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
    salaryNet: salary.netSalary != null ? String(salary.netSalary) : "",
    bankAccountHolder: bank.accountHolderName ?? "",
    bankAccountNumber: bank.accountNumber ?? "",
    bankName: bank.bankName ?? "",
    bankBranch: bank.branchName ?? "",
    bankIfsc: bank.ifsc ?? "",
    resumeUrl: (user.resumeUrl as string) ?? "",
    idProofUrl: (user.idProofUrl as string) ?? "",
    addressProofUrl: (user.addressProofUrl as string) ?? "",
  };
}

export function buildTeamEmployeePayload(
  values: TeamEmployeeFormValues,
  departmentNameById: Map<number, string>,
) {
  const departmentName =
    values.departmentId != null
      ? departmentNameById.get(values.departmentId) ?? "Engineering"
      : "Engineering";
  const fullName =
    `${values.firstName?.trim() ?? ""} ${values.lastName?.trim() ?? ""}`.trim() || values.name.trim();

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
    departmentId: values.departmentId ?? null,
    reportingManagerId: values.reportingManagerId ?? null,
    managerId: values.reportingManagerId ?? null,
    teamleaderId: values.teamleaderId ?? null,
    shiftId: values.shiftId ?? null,
    wfhMonthlyLimit: values.wfhMonthlyLimit,
    leaveAccrualDaysPerMonth:
      values.leaveAccrualDaysPerMonth === "" || values.leaveAccrualDaysPerMonth == null
        ? null
        : Number(values.leaveAccrualDaysPerMonth),
    phoneNumber: values.phoneNumber,
    joiningDate: values.joiningDate || null,
    exitDate: values.exitDate || null,
    probationEndDate: values.probationEndDate || null,
    linkedinUrl: values.linkedinUrl,
    dob: values.dob || null,
    gender: values.gender || null,
    maritalStatus: values.maritalStatus || null,
    bloodGroup: values.bloodGroup || null,
    bio: values.bio ?? "",
    employeeType: values.employeeType ?? "FULL-TIME",
    hrEmploymentStatus: values.hrEmploymentStatus ?? "Active",
    position: values.position ?? "EMPLOYEE",
    aadharNumber: values.aadharNumber ? Number(values.aadharNumber) : null,
    panNumber: values.panNumber || null,
    lateChargePercentage: values.lateChargePercentage ?? 100,
    permanentAddress: values.permanentAddress,
    currentAddress: values.currentAddress,
    socialProfiles: {
      linkedin: values.linkedinUrl ?? "",
      twitter: values.socialTwitter ?? "",
      facebook: values.socialFacebook ?? "",
      instagram: values.socialInstagram ?? "",
      website: values.socialWebsite ?? "",
    },
    salary: {
      basicSalary: values.salaryBasic ? Number(values.salaryBasic) : 0,
      allowances: values.salaryAllowances ? Number(values.salaryAllowances) : 0,
      deductions: values.salaryDeductions ? Number(values.salaryDeductions) : 0,
      netSalary: values.salaryNet ? Number(values.salaryNet) : 0,
      bankAccount: {
        accountHolderName: values.bankAccountHolder ?? "",
        accountNumber: values.bankAccountNumber ?? "",
        bankName: values.bankName ?? "",
        branchName: values.bankBranch ?? "",
        ifsc: values.bankIfsc ?? "",
      },
    },
    resumeUrl: values.resumeUrl || null,
    idProofUrl: values.idProofUrl || null,
    addressProofUrl: values.addressProofUrl || null,
    leave: {
      monthlyQuota:
        values.leaveAccrualDaysPerMonth === "" || values.leaveAccrualDaysPerMonth == null
          ? 1
          : Number(values.leaveAccrualDaysPerMonth),
    },
    wfh: { monthlyLimit: values.wfhMonthlyLimit },
  };
}
