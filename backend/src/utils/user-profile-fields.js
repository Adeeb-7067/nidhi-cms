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

function pickSocial(src, linkedinUrl) {
  const base = src && typeof src === "object" ? src : {};
  return {
    linkedin: optionalString(base.linkedin) ?? optionalString(linkedinUrl) ?? "",
    twitter: optionalString(base.twitter) ?? "",
    facebook: optionalString(base.facebook) ?? "",
    instagram: optionalString(base.instagram) ?? "",
    website: optionalString(base.website) ?? "",
  };
}

function pickSalary(src) {
  if (!src || typeof src !== "object") return undefined;
  const bank = src.bankAccount && typeof src.bankAccount === "object" ? src.bankAccount : {};
  return {
    basicSalary: parseNumber(src.basicSalary) ?? 0,
    allowances: parseNumber(src.allowances) ?? 0,
    deductions: parseNumber(src.deductions) ?? 0,
    netSalary: parseNumber(src.netSalary) ?? 0,
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
  const quota =
    parseNumber(base.monthlyQuota) ??
    parseNumber(leaveAccrualDaysPerMonth) ??
    parseNumber(base.monthlyLeaveQuota);
  return {
    monthlyQuota: quota ?? 1,
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
  const socialProfiles = pickSocial(body.socialProfiles, body.linkedinUrl);
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
    joiningDate: parseDate(body.joiningDate),
    departmentId: body.departmentId ?? null,
    designation: optionalString(body.designation) ?? null,
    subType: optionalString(body.subType) ?? null,
    department: optionalString(body.department) ?? null,
  };

  if (name) out.name = name;
  return out;
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
    ["gender", "gender", optionalString],
    ["maritalStatus", "maritalStatus", optionalString],
    ["exitDate", "exitDate", parseDate],
    ["probationEndDate", "probationEndDate", parseDate],
    ["employeeType", "employeeType", optionalString],
    ["hrEmploymentStatus", "hrEmploymentStatus", optionalString],
    ["teamleaderId", "teamleaderId"],
    ["shiftId", "shiftId"],
    ["bio", "bio", optionalString],
    ["bloodGroup", "bloodGroup", optionalString],
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

  if (body.socialProfiles !== undefined || body.linkedinUrl !== undefined) {
    const social = pickSocial(body.socialProfiles, body.linkedinUrl);
    set.socialProfiles = social;
    set.linkedinUrl = social.linkedin || null;
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
      set[field] = null;
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

/** Serialize profile fields for API responses. */
export function formatUserProfileFields(user, { includeSensitive = false } = {}) {
  if (!user) return {};
  const social = user.socialProfiles ?? {};
  const base = {
    firstName: user.firstName ?? splitName(user.name).firstName,
    lastName: user.lastName ?? splitName(user.name).lastName,
    image: user.image ?? user.avatarUrl ?? null,
    dob: user.dob ? new Date(user.dob).toISOString() : null,
    gender: user.gender ?? null,
    maritalStatus: user.maritalStatus ?? null,
    permanentAddress: user.permanentAddress ?? null,
    currentAddress: user.currentAddress ?? null,
    exitDate: user.exitDate ? new Date(user.exitDate).toISOString() : null,
    probationEndDate: user.probationEndDate ? new Date(user.probationEndDate).toISOString() : null,
    employeeType: user.employeeType ?? "FULL-TIME",
    hrEmploymentStatus: user.hrEmploymentStatus ?? "Active",
    teamleaderId: user.teamleaderId ?? null,
    managerId: user.managerId ?? user.reportingManagerId ?? null,
    shiftId: user.shiftId ?? null,
    weeklyOff: user.weeklyOff ?? ["Sunday"],
    bio: user.bio ?? "",
    bloodGroup: user.bloodGroup ?? "",
    socialProfiles: {
      linkedin: social.linkedin ?? user.linkedinUrl ?? "",
      twitter: social.twitter ?? "",
      facebook: social.facebook ?? "",
      instagram: social.instagram ?? "",
      website: social.website ?? "",
    },
    emergencyContacts: user.emergencyContacts ?? [],
    workExperience: user.workExperience ?? [],
    profileDocuments: user.profileDocuments ?? [],
    awards: user.awards ?? [],
    resumeUrl: user.resumeUrl ?? null,
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
      idProofUrl: user.idProofUrl ?? null,
      addressProofUrl: user.addressProofUrl ?? null,
    };
  }

  return base;
}
