import { usersTable, departmentsTable, payrollLinesTable, payrollRunsTable, sessionsTable, credentialHistoryTable, candidatesTable, onboardingRecordsTable, getNextSequence } from "../../models/schema/index.js";
import { shiftTemplatesTable } from "../../models/schema/hrm/shifts.js";
import crypto from "crypto";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { formatUser } from "../../mappers/user-format.js";
import { paginateModel } from "../../utils/mongo-list.js";
import { badRequest, notFound, conflict } from "../../utils/route-errors.js";
import { hashPassword, encryptPasswordForHistory } from "../../lib/password.js";
import { sendHrmEmployeeCredentialsEmail, isEmailConfigured } from "../../lib/email.js";
import { getOrCreateSettings } from "../company-settings.js";
import { evictUserFromAuthCache } from "../../middlewares/auth.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { listLeaveBalances } from "./leave.service.js";
import { listLeaveRequests } from "./leave.service.js";
import { getAttendanceDailySummaries } from "./attendance.service.js";
import { isPresentLikeStatus } from "../../constants/attendance-status.js";
import { countDocuments } from "./documents.service.js";
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
  bloodGroup: 1,
  emergencyContacts: 1,
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
  const teamleaderIds = [...new Set(rows.map((r) => r.teamleaderId).filter(Boolean))];
  const shiftIds = [...new Set(rows.map((r) => r.shiftId).filter(Boolean))];
  const peopleIds = [...new Set([...managerIds, ...teamleaderIds])];

  const [departments, people, shifts] = await Promise.all([
    deptIds.length
      ? departmentsTable.find({ id: { $in: deptIds } }, { id: 1, name: 1, code: 1 }).lean()
      : [],
    peopleIds.length
      ? usersTable.find({ id: { $in: peopleIds } }, { id: 1, name: 1, employeeId: 1 }).lean()
      : [],
    shiftIds.length
      ? shiftTemplatesTable.find({ id: { $in: shiftIds } }, { id: 1, name: 1 }).lean()
      : [],
  ]);

  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const peopleMap = new Map(people.map((m) => [m.id, m]));
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  return rows.map((u) => {
    const base = formatUser(u, { includeSensitive: false });
    const dept = u.departmentId ? deptMap.get(u.departmentId) : null;
    const mgr = u.reportingManagerId ? peopleMap.get(u.reportingManagerId) : null;
    const teamleader = u.teamleaderId ? peopleMap.get(u.teamleaderId) : null;
    const shift = u.shiftId ? shiftMap.get(u.shiftId) : null;
    return {
      ...base,
      departmentName: dept?.name ?? null,
      departmentCode: dept?.code ?? null,
      reportingManagerName: mgr?.name ?? null,
      reportingManagerEmployeeId: mgr?.employeeId ?? null,
      teamleaderName: teamleader?.name ?? null,
      teamleaderEmployeeId: teamleader?.employeeId ?? null,
      shiftName: shift?.name ?? null,
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
  const query = { role: { $in: hrmEmployeeRoles } };
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

async function loadRecruitmentOnboardingLinks() {
  const candidates = await candidatesTable
    .find({ stage: "onboarding" }, { email: 1, hiredUserId: 1 })
    .lean();
  const emails = new Set(
    candidates.map((c) => c.email?.trim().toLowerCase()).filter(Boolean),
  );
  const userIds = new Set(candidates.map((c) => c.hiredUserId).filter(Boolean));
  return { emails, userIds };
}

function isRecruitmentOnboardingMatch(user, links) {
  const email = user.email?.trim().toLowerCase();
  return (email && links.emails.has(email)) || links.userIds.has(user.id);
}

/** Employees who can start onboarding: active staff, plus recruitment "onboarding" hires (any account status). */
export async function listOnboardingEligibleEmployees() {
  const [existingRecords, links] = await Promise.all([
    onboardingRecordsTable.find({}, { userId: 1 }).lean(),
    loadRecruitmentOnboardingLinks(),
  ]);
  const onboardedUserIds = new Set(existingRecords.map((r) => r.userId));

  const orClauses = [{ status: "active" }];
  if (links.emails.size) {
    orClauses.push({ email: { $in: [...links.emails] } });
  }
  if (links.userIds.size) {
    orClauses.push({ id: { $in: [...links.userIds] } });
  }

  const rows = await usersTable
    .find(
      {
        role: { $in: hrmEmployeeRoles },
        id: { $nin: [...onboardedUserIds] },
        $or: orClauses,
      },
      EMPLOYEE_LIST_PROJECTION,
    )
    .sort({ name: 1 })
    .limit(500)
    .lean();

  const employees = await enrichEmployees(rows);
  return employees
    .map((employee) => ({
      ...employee,
      recruitmentOnboarding: isRecruitmentOnboardingMatch(employee, links),
    }))
    .sort((a, b) => Number(b.recruitmentOnboarding) - Number(a.recruitmentOnboarding));
}

export async function assertOnboardingEligibleEmployee(userId) {
  const user = await usersTable
    .findOne({ id: userId, role: { $in: hrmEmployeeRoles } }, EMPLOYEE_LIST_PROJECTION)
    .lean();
  if (!user) notFound("Employee");

  const existing = await onboardingRecordsTable.findOne({ userId }).lean();
  if (existing) {
    conflict("Onboarding already exists for this employee.");
  }

  if (user.status === "active") return user;

  const links = await loadRecruitmentOnboardingLinks();
  if (isRecruitmentOnboardingMatch(user, links)) return user;

  badRequest(
    "Employee is not eligible for onboarding. Set the candidate to Onboarding in Recruitment, or activate the employee account.",
  );
}

export async function getHrmEmployeeDetail(userId) {
  const user = await usersTable.findOne({ id: userId, role: { $in: hrmEmployeeRoles } }).lean();
  if (!user) notFound("Employee");

  const [employees] = await enrichEmployees([user]);
  const employee = employees;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { startDate, endDate } = monthBounds(year, month);

  const [{ summaries }, balances, leaveRequests, documentCount, structure, latestRun] = await Promise.all([
    getAttendanceDailySummaries({ startDate, endDate, userIds: [userId] }),
    listLeaveBalances(userId, year),
    listLeaveRequests({ userIds: [userId] }),
    countDocuments(userId),
    getSalaryStructureForUser(userId),
    payrollRunsTable.findOne({ status: { $in: ["finalized", "paid"] } })
      .sort({ year: -1, month: -1 })
      .lean(),
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

  let latestPayrollNet = null;
  if (latestRun) {
    const line = await payrollLinesTable.findOne({ payrollRunId: latestRun.id, userId }).lean();
    latestPayrollNet = line?.net ?? null;
  }

  const overview = {
    month: { year, month, startDate, endDate },
    attendance,
    pendingLeave: leaveRequests.filter((r) => r.status === "pending").length,
    leaveBalances: balances.map((b) => ({
      code: b.leaveType?.code ?? "",
      name: b.leaveType?.name ?? "Leave",
      available: Math.max(0, (b.allocated ?? 0) + (b.carriedForward ?? 0) - (b.used ?? 0) - (b.pending ?? 0)),
    })),
    salaryGross: structureRow?.gross ?? null,
    salaryNet: structureRow?.net ?? null,
    latestPayrollNet,
    documentCount,
  };

  return {
    employee,
    overview,
    attendanceSummaries: userSummaries,
    leaveBalances: balances,
    leaveRequests,
  };
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

/** Email login credentials to an HRM employee (employee ID + temporary password). */
export async function sendEmployeeLoginCredentials(userId, actor, { resend = false } = {}) {
  const user = await usersTable.findOne({ id: userId, role: { $in: hrmEmployeeRoles } }).lean();
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
