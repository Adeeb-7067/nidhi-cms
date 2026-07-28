import path from "path";
import {
  usersTable,
  departmentsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { hrmLettersTable } from "../schema/letters.js";
import { adminStaffRoles } from "../../../constants/user-roles.js";
import { badRequest, notFound } from "../../../utils/route-errors.js";
import { getOrCreateSettings } from "../../settings/services/company-settings.js";
import { generateExperienceLetterHtml } from "./experience-letter-template.js";
import { generateOfferLetterHtml } from "./offer-letter-template.js";
import { resolvePublicAssetUrl } from "./payslip-template.js";
import { htmlToPdfUrl } from "../../../lib/html-to-pdf.js";
import { sendExperienceLetterEmail, isEmailConfigured } from "../../../lib/email.js";
import { logHrmAudit } from "./hrm-audit.service.js";

function parseIsoDate(value, label) {
  if (!value) badRequest(`${label} is required.`);
  const d = new Date(String(value).slice(0, 10));
  if (Number.isNaN(d.getTime())) badRequest(`Invalid ${label}.`);
  return d;
}

function displayName(user) {
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";
  const combined = `${fn} ${ln}`.trim();
  return combined || user.name?.trim() || "Employee";
}

async function loadEmployeeForLetter(userId) {
  const user = await usersTable.findOne({ id: userId, role: { $in: adminStaffRoles } }).lean();
  if (!user) notFound("Employee");

  let departmentName = user.department ?? null;
  if (user.departmentId) {
    const dept = await departmentsTable.findOne({ id: user.departmentId }, { name: 1 }).lean();
    departmentName = dept?.name ?? departmentName;
  }

  return {
    user,
    employeeName: displayName(user),
    employeeCode: user.employeeId ?? String(user.id),
    designation: user.designation ?? "",
    departmentName: departmentName ?? "",
    joiningDate: user.joiningDate ?? null,
    email: user.email?.trim() ?? "",
    gender: user.gender ?? null,
  };
}

async function companyBranding() {
  const settings = await getOrCreateSettings();
  const logoUrl = settings.logoUrl ? resolvePublicAssetUrl(settings.logoUrl) : null;
  const sealUrl = settings.sealUrl ? resolvePublicAssetUrl(settings.sealUrl) : null;
  return {
    name: settings.companyName?.trim() || "Company",
    address: settings.address?.trim() || "",
    logoUrl,
    sealUrl,
  };
}

export async function previewExperienceLetter({
  userId,
  relievingDate,
  joiningDate,
  offeredCtc,
  letterType,
  additionalNotes,
}) {
  if (!["experience", "relieving", "offer"].includes(letterType)) {
    badRequest("letterType must be experience, relieving, or offer.");
  }
  const effectiveDate = parseIsoDate(relievingDate, letterType === "offer" ? "offer date" : "relieving date");
  const employee = await loadEmployeeForLetter(userId);
  const company = await companyBranding();
  const resolvedJoiningDate = joiningDate
    ? parseIsoDate(joiningDate, "joining date")
    : (employee.joiningDate ? new Date(employee.joiningDate) : null);
  if (letterType === "offer" && !resolvedJoiningDate) {
    badRequest("Joining date is required for offer letters.");
  }

  if (letterType !== "offer" && employee.joiningDate) {
    const joined = new Date(employee.joiningDate);
    if (effectiveDate < joined) {
      badRequest("Relieving date cannot be before joining date.");
    }
  }

  const htmlContent = letterType === "offer"
    ? generateOfferLetterHtml({
        company,
        employeeName: employee.employeeName,
        designation: employee.designation,
        departmentName: employee.departmentName,
        offerDate: effectiveDate,
        joiningDate: resolvedJoiningDate,
        offeredCtc,
        additionalNotes,
      })
    : generateExperienceLetterHtml({
        company,
        employeeName: employee.employeeName,
        designation: employee.designation,
        departmentName: employee.departmentName,
        joiningDate: employee.joiningDate,
        relievingDate: effectiveDate,
        letterType,
        additionalNotes,
        gender: employee.gender,
      });

  return {
    htmlContent,
    employee: {
      userId: employee.user.id,
      name: employee.employeeName,
      employeeCode: employee.employeeCode,
      email: employee.email,
      designation: employee.designation,
      departmentName: employee.departmentName,
      joiningDate: resolvedJoiningDate ?? employee.joiningDate,
    },
    relievingDate: effectiveDate.toISOString().slice(0, 10),
    offeredCtc: offeredCtc != null ? Number(offeredCtc) : null,
    letterType,
  };
}

export async function createExperienceLetter(actor, { userId, relievingDate, joiningDate, offeredCtc, letterType, additionalNotes }) {
  const preview = await previewExperienceLetter({
    userId,
    relievingDate,
    joiningDate,
    offeredCtc,
    letterType,
    additionalNotes,
  });
  const fileName = `${letterType}_letter_${preview.employee.employeeCode}_${preview.relievingDate}.pdf`;
  const pdfUrl = await htmlToPdfUrl(preview.htmlContent, { fileName, category: "hrm" });

  const id = await getNextSequence("hrm_letters");
  const doc = await hrmLettersTable.create({
    id,
    userId: preview.employee.userId,
    employeeName: preview.employee.name,
    employeeCode: preview.employee.employeeCode,
    designation: preview.employee.designation,
    departmentName: preview.employee.departmentName,
    joiningDate: preview.employee.joiningDate,
    relievingDate: parseIsoDate(relievingDate, "relieving date"),
    letterType,
    offeredCtc: preview.offeredCtc,
    htmlContent: preview.htmlContent,
    pdfUrl,
    createdBy: actor.id,
    createdByName: actor.name,
    additionalNotes: additionalNotes?.trim() ?? "",
  });

  await logHrmAudit({
    actorId: actor.id,
    action: "experience_letter_created",
    entityType: "hrm_letter",
    entityId: id,
    severity: "info",
    metadata: { userId, letterType, documentDate: preview.relievingDate },
  });

  return formatLetter(doc.toObject());
}

export async function listExperienceLetters({ search, limit = 100 } = {}) {
  const query = {};
  if (search?.trim()) {
    const s = search.trim();
    query.$or = [
      { employeeName: { $regex: s, $options: "i" } },
      { employeeCode: { $regex: s, $options: "i" } },
      { designation: { $regex: s, $options: "i" } },
    ];
  }
  const rows = await hrmLettersTable
    .find(query, { htmlContent: 0 })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .lean();
  return rows.map((row) => {
    const formatted = formatLetter({ ...row, htmlContent: "" });
    delete formatted.htmlContent;
    return formatted;
  });
}

export async function getExperienceLetter(id) {
  const row = await hrmLettersTable.findOne({ id }).lean();
  if (!row) notFound("Letter");
  return formatLetter(row);
}

export async function getExperienceLetterPdfPath(id) {
  const row = await hrmLettersTable.findOne({ id }).lean();
  if (!row) notFound("Letter");

  if (row.pdfUrl) {
    if (row.pdfUrl.startsWith("/uploads/")) {
      return path.join(process.cwd(), row.pdfUrl.replace(/^\//, ""));
    }
    if (row.pdfUrl.startsWith("http")) {
      return { remoteUrl: row.pdfUrl };
    }
  }

  const fileName = `${row.letterType}_letter_${row.employeeCode}_${row.relievingDate?.toISOString?.().slice(0, 10) ?? id}.pdf`;
  const pdfUrl = await htmlToPdfUrl(row.htmlContent, { fileName, category: "hrm" });
  await hrmLettersTable.updateOne({ id }, { $set: { pdfUrl } });
  return path.join(process.cwd(), pdfUrl.replace(/^\//, ""));
}

export async function sendExperienceLetter(actor, id) {
  const row = await hrmLettersTable.findOne({ id }).lean();
  if (!row) notFound("Letter");

  const employee = await loadEmployeeForLetter(row.userId);
  if (!employee.email) badRequest("Employee has no email address on file.");

  let pdfPath = await getExperienceLetterPdfPath(id);
  let attachmentPath = pdfPath;
  if (pdfPath && typeof pdfPath === "object" && pdfPath.remoteUrl) {
    attachmentPath = pdfPath.remoteUrl;
  }

  const letterLabel =
    row.letterType === "relieving"
      ? "Relieving Letter"
      : row.letterType === "offer"
        ? "Offer Letter"
        : "Experience Letter";
  const company = await companyBranding();
  const emailSent = isEmailConfigured();

  if (emailSent) {
    const result = await sendExperienceLetterEmail({
      to: employee.email,
      employeeName: row.employeeName,
      companyName: company.name,
      letterLabel,
      relievingDate: row.relievingDate,
      attachmentPath,
    });
    if (!result.sent) badRequest("Failed to send email. Check SMTP configuration.");
    await hrmLettersTable.updateOne(
      { id },
      { $set: { emailSentAt: new Date(), emailSentTo: employee.email } },
    );
  }

  await logHrmAudit({
    actorId: actor.id,
    action: "experience_letter_sent",
    entityType: "hrm_letter",
    entityId: id,
    severity: "info",
    metadata: { email: employee.email, emailSent },
  });

  return {
    message: emailSent
      ? `${letterLabel} sent to ${employee.email}.`
      : "Email is not configured — download the PDF and share it manually.",
    emailSent,
    emailConfigured: emailSent,
    email: employee.email,
  };
}

export async function deleteExperienceLetter(actor, id) {
  const row = await hrmLettersTable.findOne({ id }).lean();
  if (!row) notFound("Letter");
  await hrmLettersTable.deleteOne({ id });
  await logHrmAudit({
    actorId: actor.id,
    action: "experience_letter_deleted",
    entityType: "hrm_letter",
    entityId: id,
    severity: "info",
    metadata: { userId: row.userId },
  });
  return { message: "Letter deleted." };
}

function formatLetter(row) {
  return {
    id: row.id,
    userId: row.userId,
    employeeName: row.employeeName,
    employeeCode: row.employeeCode,
    designation: row.designation,
    departmentName: row.departmentName,
    joiningDate: row.joiningDate ? new Date(row.joiningDate).toISOString().slice(0, 10) : null,
    relievingDate: row.relievingDate ? new Date(row.relievingDate).toISOString().slice(0, 10) : null,
    letterType: row.letterType,
    offeredCtc: row.offeredCtc ?? null,
    htmlContent: row.htmlContent,
    pdfUrl: row.pdfUrl ?? null,
    emailSentAt: row.emailSentAt ? new Date(row.emailSentAt).toISOString() : null,
    emailSentTo: row.emailSentTo ?? null,
    createdBy: row.createdBy ?? null,
    createdByName: row.createdByName ?? "",
    additionalNotes: row.additionalNotes ?? "",
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
