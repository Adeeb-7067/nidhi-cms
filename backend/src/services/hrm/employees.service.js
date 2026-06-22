import { usersTable, departmentsTable, payrollLinesTable, payrollRunsTable, sessionsTable, credentialHistoryTable, getNextSequence } from "../../models/schema/index.js";
import crypto from "crypto";
import { staffEmployeeRoles } from "../../constants/user-roles.js";
import { formatUser } from "../../mappers/user-format.js";
import { paginateModel } from "../../utils/mongo-list.js";
import { badRequest, notFound } from "../../utils/route-errors.js";
import { hashPassword, encryptPasswordForHistory } from "../../lib/password.js";
import { sendHrmEmployeeCredentialsEmail, isEmailConfigured } from "../../lib/email.js";
import { getOrCreateSettings } from "../company-settings.js";
import { evictUserFromAuthCache } from "../../middlewares/auth.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { listLeaveBalances } from "./leave.service.js";
import { listLeaveRequests } from "./leave.service.js";
import { getAttendanceDailySummaries } from "./attendance.service.js";
import { isPresentLikeStatus } from "../../constants/attendance-status.js";
import { listDocuments } from "./documents.service.js";
import { getSalaryStructureForUser } from "./payroll.service.js";

const EMPLOYEE_LIST_PROJECTION = {
  id: 1,
  employeeId: 1,
  name: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  role: 1,
  designation: 1,
  avatarUrl: 1,
  image: 1,
  department: 1,
  departmentId: 1,
  reportingManagerId: 1,
  managerId: 1,
  teamleaderId: 1,
  phoneNumber: 1,
  joiningDate: 1,
  exitDate: 1,
  employeeType: 1,
  hrEmploymentStatus: 1,
  position: 1,
  shiftId: 1,
  status: 1,
  wfhMonthlyLimit: 1,
  leaveAccrualDaysPerMonth: 1,
  lastLoginAt: 1,
  createdAt: 1,
};

function monthBounds(year, month) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export { monthBounds };

async function enrichEmployees(rows) {
  const deptIds = [...new Set(rows.map((r) => r.departmentId).filter(Boolean))];
  const managerIds = [...new Set(rows.map((r) => r.reportingManagerId).filter(Boolean))];
  const lookupIds = [...new Set([...managerIds])];

  const [departments, managers] = await Promise.all([
    deptIds.length
      ? departmentsTable.find({ id: { $in: deptIds } }, { id: 1, name: 1, code: 1 }).lean()
      : [],
    lookupIds.length
      ? usersTable.find({ id: { $in: lookupIds } }, { id: 1, name: 1, employeeId: 1 }).lean()
      : [],
  ]);

  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const managerMap = new Map(managers.map((m) => [m.id, m]));

  return rows.map((u) => {
    const base = formatUser(u, { includeSensitive: true });
    const dept = u.departmentId ? deptMap.get(u.departmentId) : null;
    const mgr = u.reportingManagerId ? managerMap.get(u.reportingManagerId) : null;
    return {
      ...base,
      departmentName: dept?.name ?? u.department ?? null,
      departmentCode: dept?.code ?? null,
      reportingManagerName: mgr?.name ?? null,
      reportingManagerEmployeeId: mgr?.employeeId ?? null,
    };
  });
}

export async function listHrmEmployees({
  search,
  departmentId,
  status,
  scopeUserIds,
  pagination,
}) {
  const query = { role: { $in: staffEmployeeRoles } };
  if (scopeUserIds?.length) query.id = { $in: scopeUserIds };
  if (departmentId != null) query.departmentId = departmentId;
  if (status) query.status = status;

  if (search?.trim()) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { employeeId: { $regex: s, $options: "i" } },
    ];
  }

  const { items, total, page, limit } = await paginateModel(
    usersTable,
    query,
    pagination,
    { projection: EMPLOYEE_LIST_PROJECTION, sort: { name: 1 } },
  );

  return {
    employees: await enrichEmployees(items),
    total,
    page,
    limit,
  };
}

export async function getHrmEmployeeDetail(userId) {
  const user = await usersTable.findOne({ id: userId, role: { $in: staffEmployeeRoles } }).lean();
  if (!user) notFound("Employee");

  const [employees] = await enrichEmployees([user]);
  const employee = employees;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { startDate, endDate } = monthBounds(year, month);

  const [{ summaries }, balances, leaveRequests, documents, structure] = await Promise.all([
    getAttendanceDailySummaries({ startDate, endDate, userIds: [userId] }),
    listLeaveBalances(userId, year),
    listLeaveRequests({ userIds: [userId], status: "pending" }),
    listDocuments(userId),
    getSalaryStructureForUser(userId),
  ]);

  const userSummaries = summaries.filter((s) => s.userId === userId);
  const attendance = {
    present: userSummaries.filter((s) => s.status === "present").length,
    onsite: userSummaries.filter((s) => ["onsite", "late"].includes(s.status)).length,
    absent: userSummaries.filter((s) => s.status === "absent").length,
    onLeave: userSummaries.filter((s) => s.status === "on_leave").length,
    late: userSummaries.filter((s) => ["late", "onsite"].includes(s.status)).length,
    wfh: userSummaries.filter((s) => s.status === "wfh").length,
    halfDay: userSummaries.filter((s) => ["half_day", "short"].includes(s.status)).length,
  };

  const structureRow = structure;

  const latestRun = await payrollRunsTable.findOne({ status: { $in: ["finalized", "paid"] } })
    .sort({ year: -1, month: -1 })
    .lean();
  let latestPayrollNet = null;
  if (latestRun) {
    const line = await payrollLinesTable.findOne({ payrollRunId: latestRun.id, userId }).lean();
    latestPayrollNet = line?.net ?? null;
  }

  const overview = {
    month: { year, month, startDate, endDate },
    attendance,
    pendingLeave: leaveRequests.length,
    leaveBalances: balances.map((b) => ({
      code: b.leaveType?.code ?? "",
      name: b.leaveType?.name ?? "Leave",
      available: Math.max(0, (b.allocated ?? 0) + (b.carriedForward ?? 0) - (b.used ?? 0) - (b.pending ?? 0)),
    })),
    salaryGross: structureRow?.gross ?? null,
    salaryNet: structureRow?.net ?? null,
    latestPayrollNet,
    documentCount: documents.length,
  };

  return { employee, overview };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

/** Email login credentials to an HRM employee (employee ID + temporary password). */
export async function sendEmployeeLoginCredentials(userId, actor, { resend = false } = {}) {
  const user = await usersTable.findOne({ id: userId, role: { $in: staffEmployeeRoles } }).lean();
  if (!user) notFound("Employee");
  if (!user.email?.trim()) badRequest("Employee has no email address on file.");
  if (!user.employeeId?.trim()) badRequest("Employee has no employee ID assigned.");

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  await usersTable.updateOne(
    { id: user.id },
    { $set: { passwordHash, forcePasswordChange: true, status: "active" } },
  );
  await sessionsTable.deleteMany({ userId: user.id });
  evictUserFromAuthCache(user.id);

  await credentialHistoryTable.updateMany(
    { userId: user.id, status: "active" },
    { $set: { status: "superseded" } },
  );
  const credCount = await credentialHistoryTable.countDocuments({ userId: user.id });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: credCount + 1,
    setByUserId: actor.id,
    setByLabel: actor.name,
    passwordEncrypted: encryptPasswordForHistory(tempPassword),
    trigger: resend ? "admin_reset" : "initial_setup",
    status: "active",
  });

  const settings = await getOrCreateSettings();
  let emailSent = false;
  if (isEmailConfigured()) {
    await sendHrmEmployeeCredentialsEmail({
      to: user.email,
      employeeName: user.name,
      companyName: settings.companyName ?? "My Agency",
      sentByName: actor.name,
      loginEmployeeId: user.employeeId,
      loginEmail: user.email,
      temporaryPassword: tempPassword,
      resend,
    });
    emailSent = true;
  }

  await logHrmAudit({
    actorId: actor.id,
    action: resend ? "employee_credentials_resent" : "employee_credentials_sent",
    entityType: "user",
    entityId: userId,
    severity: "info",
    metadata: { email: user.email, employeeId: user.employeeId, emailSent },
  });

  return {
    message: emailSent
      ? resend
        ? "Login credentials resent by email."
        : "Login credentials sent by email."
      : "Credentials reset. Email is not configured — share the temporary password manually.",
    emailSent,
    emailConfigured: isEmailConfigured(),
    ...(emailSent ? {} : { temporaryPassword: tempPassword, loginEmployeeId: user.employeeId }),
  };
}
