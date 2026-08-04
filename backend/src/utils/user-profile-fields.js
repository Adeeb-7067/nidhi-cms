import { optionalString, badRequest } from "./route-errors.js";
import {
  employeeGenders,
  employeeMaritalStatuses,
  employeeTypes,
  hrEmploymentStatuses,
  employeePositions,
  employeeBloodGroups,
  employeeWeekDays,
} from "../constants/employee-profile.js";

const ENUM_FIELDS = {
  gender: employeeGenders,
  maritalStatus: employeeMaritalStatuses,
  employeeType: employeeTypes,
  hrEmploymentStatus: hrEmploymentStatuses,
  position: employeePositions,
  bloodGroup: employeeBloodGroups,
};

function assertEnum(field, value, allowed) {
  if (value == null || value === "") return value;
  const v = String(value);
  if (!allowed.includes(v)) {
    badRequest(`Invalid ${field}.`, field);
  }
  return v;
}

function clampLateCharge(value) {
  const n = parseNumber(value);
  if (n == null) return null;
  return Math.min(100, Math.max(0, n));
}

function parseDate(value) {
  if (value === null || value === "") return null;
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(value) {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitName(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mergeName(firstName, lastName, fallbackName) {
  const fn = optionalString(firstName) ?? "";
  const ln = optionalString(lastName) ?? "";
  const combined = `${fn} ${ln}`.trim();
  return combined || optionalString(fallbackName) || undefined;
}

function pickAddress(src) {
  if (!src || typeof src !== "object") return undefined;
  return {
    street: optionalString(src.street) ?? "",
    city: optionalString(src.city) ?? "",
    state: optionalString(src.state) ?? "",
    country: optionalString(src.country) ?? "",
    zipCode: optionalString(src.zipCode) ?? "",
  };
}

function normalizeGithubId(value) {
  const raw = optionalString(value);
  if (!raw) return "";
  let handle = raw.trim();
  if (handle.startsWith("@")) handle = handle.slice(1);
  const urlMatch = handle.match(/github\.com\/([^/?#]+)/i);
  if (urlMatch) handle = urlMatch[1];
  handle = handle.replace(/\/$/, "");
  const valid = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  return valid.test(handle) ? handle : "";
}

function resolveGithubId(...candidates) {
  for (const candidate of candidates) {
    const raw = optionalString(candidate);
    if (!raw) continue;
    const normalized = normalizeGithubId(raw);
    if (normalized) return normalized;
    badRequest("Enter a valid GitHub username or profile URL.", "githubId");
  }
  return "";
}

function pickSocial(src, linkedinUrl, githubId) {
  const base = src && typeof src === "object" ? src : {};
  const github = resolveGithubId(base.github, githubId, base.githubId);
  return {
    linkedin: optionalString(base.linkedin) ?? optionalString(linkedinUrl) ?? "",
    github,
    twitter: optionalString(base.twitter) ?? "",
    facebook: optionalString(base.facebook) ?? "",
    instagram: optionalString(base.instagram) ?? "",
    website: optionalString(base.website) ?? "",
  };
}

function pickSalary(src) {
  return normalizeSalary(src);
}

/** Parse and reconcile salary fields (floors negatives, aligns net with components). */
export function normalizeSalary(src) {
  if (!src || typeof src !== "object") return undefined;
  const bank = src.bankAccount && typeof src.bankAccount === "object" ? src.bankAccount : {};
  const basicSalary = Math.max(0, parseNumber(src.basicSalary) ?? 0);
  const allowances = Math.max(0, parseNumber(src.allowances) ?? 0);
  let deductions = Math.max(0, parseNumber(src.deductions) ?? 0);
  const gross = Math.round((basicSalary + allowances) * 100) / 100;
  deductions = gross > 0 ? Math.min(deductions, gross) : deductions;
  let netSalary = parseNumber(src.netSalary);
  const shouldRecomputeNet =
    netSalary == null ||
    !Number.isFinite(netSalary) ||
    (netSalary === 0 && gross > deductions);
  if (shouldRecomputeNet) {
    netSalary = Math.max(0, Math.round((gross - deductions) * 100) / 100);
  } else if (gross > 0) {
    netSalary = Math.max(0, Math.min(gross, Math.round(netSalary * 100) / 100));
  } else {
    netSalary = Math.max(0, Math.round(netSalary * 100) / 100);
  }
  return {
    basicSalary,
    allowances,
    deductions,
    netSalary,
    bankAccount: {
      accountHolderName: optionalString(bank.accountHolderName) ?? "",
      accountNumber: optionalString(bank.accountNumber) ?? "",
      bankName: optionalString(bank.bankName) ?? "",
      branchName: optionalString(bank.branchName) ?? "",
      ifsc: optionalString(bank.ifsc) ?? "",
    },
  };
}

function pickLeave(src, leaveAccrualDaysPerMonth) {
  const base = src && typeof src === "object" ? src : {};
  // Explicit empty / null from the employee form means "use company HRM default".
  if (leaveAccrualDaysPerMonth === null || leaveAccrualDaysPerMonth === "") {
    return { monthlyQuota: null };
  }
  // Prefer the dedicated form field when set — nested leave.monthlyQuota can be stale.
  const quota =
    parseNumber(leaveAccrualDaysPerMonth) ??
    parseNumber(base.monthlyQuota) ??
    parseNumber(base.monthlyLeaveQuota);
  return {
    // null = inherit company hrmPaidLeavesPerMonth at accrual time (all employees).
    monthlyQuota: quota,
  };
}

function pickWfh(src, wfhMonthlyLimit) {
  const base = src && typeof src === "object" ? src : {};
  const limit = parseNumber(base.monthlyLimit) ?? parseNumber(wfhMonthlyLimit);
  return { monthlyLimit: limit ?? null };
}

/** Build create document fields from request body (existing CMS + legacy profile). */
export function buildUserProfileCreateFields(body) {
  const name =
    mergeName(body.firstName, body.lastName, body.name) ?? optionalString(body.name);
  const { firstName, lastName } =
    body.firstName !== undefined || body.lastName !== undefined
      ? { firstName: optionalString(body.firstName) ?? "", lastName: optionalString(body.lastName) ?? "" }
      : splitName(name);

  const phone = optionalString(body.phone) ?? optionalString(body.phoneNumber) ?? null;
  const image = optionalString(body.image) ?? optionalString(body.avatarUrl) ?? null;
  const socialProfiles = pickSocial(body.socialProfiles, body.linkedinUrl, body.githubId);
  const managerId = body.managerId ?? body.reportingManagerId ?? null;
  const wfh = pickWfh(body.wfh, body.wfhMonthlyLimit);
  const leave = pickLeave(body.leave, body.leaveAccrualDaysPerMonth);

  const out = {
    firstName,
    lastName,
    image,
    dob: parseDate(body.dob),
    gender: optionalString(body.gender) ?? null,
    maritalStatus: optionalString(body.maritalStatus) ?? null,
    permanentAddress: pickAddress(body.permanentAddress),
    currentAddress: pickAddress(body.currentAddress),
    exitDate: parseDate(body.exitDate),
    probationEndDate: parseDate(body.probationEndDate),
    employeeType: optionalString(body.employeeType) ?? "FULL-TIME",
    hrEmploymentStatus: optionalString(body.hrEmploymentStatus) ?? "Active",
    teamleaderId: body.teamleaderId ?? null,
    managerId,
    reportingManagerId: managerId,
    salary: pickSalary(body.salary),
    shiftId: body.shiftId ?? null,
    weeklyOff: Array.isArray(body.weeklyOff) ? body.weeklyOff : ["Sunday"],
    bio: optionalString(body.bio) ?? "",
    bloodGroup: optionalString(body.bloodGroup) ?? "",
    socialProfiles,
    emergencyContacts: Array.isArray(body.emergencyContacts) ? body.emergencyContacts : [],
    workExperience: Array.isArray(body.workExperience) ? body.workExperience : [],
    profileDocuments: Array.isArray(body.profileDocuments)
      ? body.profileDocuments
      : Array.isArray(body.employeeDocuments)
        ? body.employeeDocuments
        : [],
    awards: Array.isArray(body.awards) ? body.awards : [],
    resumeUrl: optionalString(body.resumeUrl) ?? null,
    idProofUrl: optionalString(body.idProofUrl) ?? null,
    addressProofUrl: optionalString(body.addressProofUrl) ?? null,
    certificateUrls: Array.isArray(body.certificateUrls) ? body.certificateUrls : [],
    username: optionalString(body.username) ?? null,
    position: optionalString(body.position) ?? "EMPLOYEE",
    aadharNumber: parseNumber(body.aadharNumber),
    panNumber: optionalString(body.panNumber) ?? null,
    leaveBalance: parseNumber(body.leaveBalance) ?? 0,
    totalWorkFromHome: parseNumber(body.totalWorkFromHome) ?? 0,
    leaveAvailable: parseNumber(body.leaveAvailable) ?? 0,
    lateChargePercentage: parseNumber(body.lateChargePercentage) ?? 100,
    monthlyLeaveQuota: leave.monthlyQuota,
    leave,
    wfh,
    wfhMonthlyLimit: wfh.monthlyLimit ?? 4,
    leaveAccrualDaysPerMonth: leave.monthlyQuota,
    leaveHistory: Array.isArray(body.leaveHistory) ? body.leaveHistory : [],
    phoneNumber: phone,
    avatarUrl: image,
    linkedinUrl: socialProfiles.linkedin || null,
    githubId: socialProfiles.github || null,
    joiningDate: parseDate(body.joiningDate),
    departmentId: body.departmentId ?? null,
    designation: optionalString(body.designation) ?? null,
    subType: optionalString(body.subType) ?? null,
    department: optionalString(body.department) ?? null,
  };

  if (name) out.name = name;
  return out;
}

/** Body keys employees may update on their own profile (HR/admin fields excluded). */
export const SELF_SERVICE_PROFILE_BODY_KEYS = [
  "name",
  "firstName",
  "lastName",
  "email",
  "designation",
  "avatarUrl",
  "image",
  "phone",
  "phoneNumber",
  "dob",
  "gender",
  "maritalStatus",
  "bloodGroup",
  "bio",
  "permanentAddress",
  "currentAddress",
  "socialProfiles",
  "linkedinUrl",
  "githubId",
  "resumeUrl",
  "idProofUrl",
  "addressProofUrl",
  "certificateUrls",
  "aadharNumber",
  "panNumber",
  "emergencyContacts",
  "salary",
];

/** Strip admin-only fields; salary updates are limited to bank account details. */
export function pickSelfServiceProfileBody(body) {
  if (!body || typeof body !== "object") return {};
  const picked = {};
  for (const key of SELF_SERVICE_PROFILE_BODY_KEYS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  if (picked.salary !== undefined) {
    const bank =
      picked.salary && typeof picked.salary === "object" ? picked.salary.bankAccount : undefined;
    picked.salary =
      bank && typeof bank === "object" ? { bankAccount: bank } : { bankAccount: {} };
  }
  return picked;
}

/** Build $set patch for self-service profile updates (merges bank into existing salary). */
export function buildSelfServiceProfilePatchSet(body, { existingSalary } = {}) {
  const picked = pickSelfServiceProfileBody(body);
  const bankOnly = picked.salary;
  delete picked.salary;

  const set = buildUserProfilePatchSet(picked);

  if (bankOnly !== undefined) {
    const bankPatch = pickSalary(bankOnly).bankAccount;
    const prev = existingSalary && typeof existingSalary === "object" ? existingSalary : {};
    set.salary = {
      basicSalary: parseNumber(prev.basicSalary) ?? 0,
      allowances: parseNumber(prev.allowances) ?? 0,
      deductions: parseNumber(prev.deductions) ?? 0,
      netSalary: parseNumber(prev.netSalary) ?? 0,
      bankAccount: bankPatch,
    };
  }

  return set;
}

/** Build $set patch for profile + sync CMS alias fields. */
export function buildUserProfilePatchSet(body) {
  const set = {};

  if (body.firstName !== undefined || body.lastName !== undefined || body.name !== undefined) {
    const firstName =
      body.firstName !== undefined ? optionalString(body.firstName) ?? "" : undefined;
    const lastName =
      body.lastName !== undefined ? optionalString(body.lastName) ?? "" : undefined;
    if (firstName !== undefined) set.firstName = firstName;
    if (lastName !== undefined) set.lastName = lastName;
    const merged = mergeName(
      firstName ?? body.firstName,
      lastName ?? body.lastName,
      body.name,
    );
    if (merged) set.name = merged;
    else if (body.name !== undefined) set.name = optionalString(body.name);
  }

  const scalarMap = [
    ["image", "image"],
    ["avatarUrl", "avatarUrl"],
    ["dob", "dob", parseDate],
    ["exitDate", "exitDate", parseDate],
    ["probationEndDate", "probationEndDate", parseDate],
    ["employeeType", "employeeType", optionalString],
    ["hrEmploymentStatus", "hrEmploymentStatus", optionalString],
    ["teamleaderId", "teamleaderId"],
    ["shiftId", "shiftId"],
    ["bio", "bio", optionalString],
    ["resumeUrl", "resumeUrl", optionalString],
    ["idProofUrl", "idProofUrl", optionalString],
    ["addressProofUrl", "addressProofUrl", optionalString],
    ["username", "username", optionalString],
    ["position", "position", optionalString],
    ["aadharNumber", "aadharNumber", parseNumber],
    ["panNumber", "panNumber", optionalString],
    ["leaveBalance", "leaveBalance", parseNumber],
    ["totalWorkFromHome", "totalWorkFromHome", parseNumber],
    ["leaveAvailable", "leaveAvailable", parseNumber],
    ["lateChargePercentage", "lateChargePercentage", parseNumber],
  ];

  for (const [bodyKey, field, transform] of scalarMap) {
    if (body[bodyKey] !== undefined) {
      set[field] = transform ? transform(body[bodyKey]) : body[bodyKey];
    }
  }

  if (body.phone !== undefined || body.phoneNumber !== undefined) {
    const phone =
      body.phone !== undefined
        ? optionalString(body.phone) ?? null
        : optionalString(body.phoneNumber) ?? null;
    set.phoneNumber = phone;
  }

  if (body.image !== undefined || body.avatarUrl !== undefined) {
    const img =
      body.image !== undefined
        ? optionalString(body.image) ?? null
        : optionalString(body.avatarUrl) ?? null;
    set.avatarUrl = img;
    set.image = img;
  }

  if (body.managerId !== undefined || body.reportingManagerId !== undefined) {
    const mid =
      body.managerId !== undefined ? body.managerId ?? null : body.reportingManagerId ?? null;
    set.reportingManagerId = mid;
    set.managerId = mid;
  }

  if (body.permanentAddress !== undefined) set.permanentAddress = pickAddress(body.permanentAddress);
  if (body.currentAddress !== undefined) set.currentAddress = pickAddress(body.currentAddress);
  if (body.salary !== undefined) set.salary = pickSalary(body.salary);
  if (body.emergencyContacts !== undefined) {
    set.emergencyContacts = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : [];
  }
  if (body.workExperience !== undefined) {
    set.workExperience = Array.isArray(body.workExperience) ? body.workExperience : [];
  }
  if (body.profileDocuments !== undefined || body.employeeDocuments !== undefined) {
    set.profileDocuments = Array.isArray(body.profileDocuments ?? body.employeeDocuments)
      ? (body.profileDocuments ?? body.employeeDocuments)
      : [];
  }
  if (body.awards !== undefined) set.awards = Array.isArray(body.awards) ? body.awards : [];
  if (body.certificateUrls !== undefined) {
    set.certificateUrls = Array.isArray(body.certificateUrls) ? body.certificateUrls : [];
  }
  if (body.leaveHistory !== undefined) {
    set.leaveHistory = Array.isArray(body.leaveHistory) ? body.leaveHistory : [];
  }

  if (body.socialProfiles !== undefined || body.linkedinUrl !== undefined || body.githubId !== undefined) {
    const social = pickSocial(body.socialProfiles, body.linkedinUrl, body.githubId);
    set.socialProfiles = social;
    set.linkedinUrl = social.linkedin || null;
    set.githubId = social.github || null;
  }

  if (body.leave !== undefined || body.leaveAccrualDaysPerMonth !== undefined) {
    const leave = pickLeave(body.leave, body.leaveAccrualDaysPerMonth);
    set.leave = leave;
    set.leaveAccrualDaysPerMonth = leave.monthlyQuota;
    set.monthlyLeaveQuota = leave.monthlyQuota;
  }

  if (body.wfh !== undefined || body.wfhMonthlyLimit !== undefined) {
    const wfh = pickWfh(body.wfh, body.wfhMonthlyLimit);
    set.wfh = wfh;
    if (wfh.monthlyLimit != null) set.wfhMonthlyLimit = wfh.monthlyLimit;
  }

  if (body.departmentId !== undefined) set.departmentId = body.departmentId ?? null;
  if (body.department !== undefined) set.department = optionalString(body.department) ?? null;
  if (body.designation !== undefined) set.designation = optionalString(body.designation) ?? null;
  if (body.subType !== undefined) set.subType = optionalString(body.subType) ?? null;
  if (body.joiningDate !== undefined) {
    set.joiningDate = parseDate(body.joiningDate);
  }
  if (body.status !== undefined) set.status = body.status;
  if (body.roleTemplateId !== undefined) {
    set.roleTemplateId = body.roleTemplateId ?? null;
    set.hrmRoleTemplateId = body.roleTemplateId ?? null;
  }
  if (body.hrmRoleTemplateId !== undefined) {
    set.hrmRoleTemplateId = body.hrmRoleTemplateId ?? null;
    set.roleTemplateId = body.hrmRoleTemplateId ?? null;
  }

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
      set[field] = assertEnum(field, body[field], allowed);
    } else if (body[field] === null || body[field] === "") {
      if (field === "bloodGroup") {
        set[field] = "";
      } else {
        set[field] = null;
      }
    }
  }

  if (body.lateChargePercentage !== undefined) {
    set.lateChargePercentage = clampLateCharge(body.lateChargePercentage);
  }

  if (body.weeklyOff !== undefined) {
    const days = Array.isArray(body.weeklyOff) ? body.weeklyOff : [];
    for (const day of days) {
      assertEnum("weeklyOff", day, employeeWeekDays);
    }
    set.weeklyOff = days;
  }

  return set;
}

/** Build Mongo update doc from profile patch ($set + $unset for enum fields that disallow null). */
export function buildProfilePatchMongoUpdate(patch) {
  const set = { ...patch };
  const unset = {};

  for (const field of ["gender", "maritalStatus"]) {
    if (set[field] === null) {
      unset[field] = "";
      delete set[field];
    }
  }
  if (set.bloodGroup === null) {
    set.bloodGroup = "";
  }

  for (const key of Object.keys(set)) {
    if (set[key] === undefined) delete set[key];
  }

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

function toProfileIso(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Serialize profile fields for API responses. */
export function formatUserProfileFields(user, { includeSensitive = false } = {}) {
  if (!user) return {};
  const social = user.socialProfiles ?? {};
  const base = {
    firstName: user.firstName ?? splitName(user.name).firstName,
    lastName: user.lastName ?? splitName(user.name).lastName,
    image: user.image ?? user.avatarUrl ?? null,
    dob: toProfileIso(user.dob),
    gender: user.gender ?? null,
    maritalStatus: user.maritalStatus ?? null,
    permanentAddress: user.permanentAddress ?? null,
    currentAddress: user.currentAddress ?? null,
    exitDate: toProfileIso(user.exitDate),
    probationEndDate: toProfileIso(user.probationEndDate),
    employeeType: user.employeeType ?? "FULL-TIME",
    hrEmploymentStatus: user.hrEmploymentStatus ?? "Active",
    teamleaderId: user.teamleaderId ?? null,
    managerId: user.managerId ?? user.reportingManagerId ?? null,
    shiftId: user.shiftId ?? null,
    weeklyOff: user.weeklyOff ?? ["Sunday"],
    bio: user.bio ?? "",
    bloodGroup: user.bloodGroup ?? "",
    githubId: user.githubId ?? social.github ?? null,
    socialProfiles: {
      linkedin: social.linkedin ?? user.linkedinUrl ?? "",
      github: social.github ?? user.githubId ?? "",
      twitter: social.twitter ?? "",
      facebook: social.facebook ?? "",
      instagram: social.instagram ?? "",
      website: social.website ?? "",
    },
    emergencyContacts: user.emergencyContacts ?? [],
    workExperience: user.workExperience ?? [],
    profileDocuments: user.profileDocuments ?? [],
    awards: user.awards ?? [],
    resumeUrl: user.resumeUrl?.trim() || null,
    idProofUrl: user.idProofUrl?.trim() || null,
    addressProofUrl: user.addressProofUrl?.trim() || null,
    certificateUrls: user.certificateUrls ?? [],
    username: user.username ?? user.employeeId ?? null,
    position: user.position ?? "EMPLOYEE",
    leaveBalance: user.leaveBalance ?? 0,
    totalWorkFromHome: user.totalWorkFromHome ?? 0,
    leaveAvailable: user.leaveAvailable ?? 0,
    lateChargePercentage: user.lateChargePercentage ?? 100,
    monthlyLeaveQuota: user.monthlyLeaveQuota ?? user.leave?.monthlyQuota ?? null,
    leave: user.leave ?? { monthlyQuota: user.leaveAccrualDaysPerMonth ?? 1 },
    wfh: user.wfh ?? { monthlyLimit: user.wfhMonthlyLimit ?? null },
    leaveHistory: user.leaveHistory ?? [],
  };

  if (includeSensitive) {
    return {
      ...base,
      salary: user.salary ?? null,
      aadharNumber: user.aadharNumber ?? null,
      panNumber: user.panNumber ?? null,
    };
  }

  return base;
}
