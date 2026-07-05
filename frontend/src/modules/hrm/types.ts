import type { HrmAction, HrmModule, HrmPermission } from "./constants";

export type HrmDepartment = {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  headUserId?: number | null;
  managerId?: number | null;
  managerName?: string | null;
  status: string;
  headcount?: number;
  designations?: string[];
  members?: Array<{
    userId: number;
    userName: string;
    employeeId?: string | null;
    avatarUrl?: string | null;
    designation?: string | null;
  }>;
};

export type HrmRoleTemplate = {
  id: number;
  name: string;
  code: string;
  isSystem: boolean;
  permissions: Array<{ id: number; module: HrmModule; action: HrmAction }>;
};

export type HrmLeaveType = {
  id: number;
  code: string;
  name: string;
  isPaid: boolean;
  maxDaysPerYear?: number;
  /** @deprecated use maxDaysPerYear */
  maxPerYear?: number | null;
  fifoPriority?: number;
  carryForwardAllowed?: boolean;
  requiresApproval?: boolean;
  status?: string;
};

export type HrmLeaveBalance = {
  id: number;
  userId: number;
  leaveTypeId: number;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  carriedForward: number;
  /** @deprecated use carriedForward — kept for older UI code */
  carryForward?: number;
  available?: number;
  leaveType?: HrmLeaveType;
};

export type HrmLeaveRequest = {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  dayPart: string;
  days?: number;
  lopDays?: number;
  reason?: string | null;
  status: string;
  reviewNote?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  leaveType?: HrmLeaveType | null;
  leaveTypeName?: string | null;
  balanceAllocations?: Array<{ leaveTypeId: number; days: number }>;
  createdAt?: string;
  /** Non-blocking messages from leave review (e.g. payroll-locked attendance). */
  warnings?: string[];
};

export type HrmWfhRequest = {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string | null;
  status: string;
  reviewNote?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  /** @deprecated use startDate */
  date?: string;
  createdAt?: string;
};

export type HrmHoliday = {
  id: number;
  name: string;
  date: string;
  type: string;
  scope: string;
  departmentIds?: number[];
};

export type HrmCalendarEvent = {
  kind: "holiday" | "birthday" | "company_event";
  id?: number;
  label: string;
  type?: string;
  scope?: string;
  userId?: number;
  employeeId?: string | null;
};

export type HrmCalendarMonth = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  stats: {
    eventsThisMonth: number;
    holidays: number;
    birthdays: number;
    companyEvents: number;
  };
  holidays: HrmHoliday[];
  birthdays: Array<{ userId: number; name: string; employeeId: string | null; date: string }>;
  days: Record<string, HrmCalendarEvent[]>;
};

export type HrmShiftTemplate = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutesIn: number;
  graceMinutesOut?: number;
  breakMinutes?: number;
  workingDays?: number[];
  isDefault?: boolean;
};

export type HrmAttendanceSummary = {
  userId: number;
  employeeId?: string | null;
  userName: string;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  date: string;
  status: string;
  compliance?: string;
  expectedMinutes: number;
  activeMinutes: number;
  varianceMinutes: number;
  shiftName?: string | null;
  sessionCount: number;
  corrected?: boolean;
  forgivenLate?: boolean;
  globalWfh?: boolean;
  missingClockOut?: boolean;
  partialLeave?: boolean;
  leaveDayPart?: string | null;
  source?: string;
  persisted?: boolean;
  firstClockIn?: string | null;
  lastClockOut?: string | null;
};

export type HrmAttendanceVarianceRow = HrmAttendanceSummary & {
  loggedHours: number;
  clockHours: number;
  varianceHours: number;
  variancePct: number;
  flagged: boolean;
};

export type HrmAttendanceCorrection = {
  id: number;
  userId: number;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  date: string;
  reason: string;
  requestedStatus?: string | null;
  requestedActiveMinutes?: number | null;
  status: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt?: string;
};

export type HrmSettings = {
  hrmLeaveYearStartMonth: number;
  hrmDefaultShiftTemplateId: number | null;
  hrmAttendanceShortfallThresholdMinutes: number;
  hrmWeekendDays: number[];
  hrmGlobalWfhMode: boolean;
  hrmPaidLeavesPerMonth: number;
  hrmLeaveResetCycleMonths: number;
  hrmMaxFreeLates: number;
  hrmElectronOnlyClock: boolean;
  hrmLeaveCarryForwardStartYear: number;
  /** Default task titles applied to every new onboarding record. */
  hrmOnboardingChecklistTemplate?: string[];
};

export type HrmAuditLog = {
  id: number;
  actorId: number;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  severity: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type HrmDashboardStats = {
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeave: number;
  pendingWfh: number;
  pendingCorrections?: number;
  headcount?: number;
};

export type HrmDashboardOnLeavePerson = {
  userId: number;
  userName: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
};

export type HrmDashboardPendingLeave = {
  id: number;
  userId: number;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  startDate: string;
  endDate: string;
  days?: number;
  status: string;
  leaveTypeName?: string | null;
};

export type HrmDashboardPendingWfh = {
  id: number;
  userId: number;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  startDate: string;
  endDate: string;
  status: string;
};

export type HrmDashboardSelfSummary = {
  attendanceMonthPct: number;
  activeMinutesToday: number;
  leaveAvailableTotal: number;
  latestNetPay: number | null;
};

export type HrmDashboardDepartmentRow = {
  departmentId: number | null;
  name: string;
  count: number;
};

export type HrmDashboardPayrollBanner = {
  year: number;
  month: number;
  status: string;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  paidOut: number;
  yetToPay: number;
  yetToPayEmployeeCount?: number;
  payrollProgressPct: number;
  employeeCount: number;
};

export type HrmDashboardTodayAttendanceRow = {
  userId: number;
  userName: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  status: string;
  activeMinutes: number;
  expectedMinutes: number;
  globalWfh?: boolean;
  clockIn?: string | null;
};

export type HrmDashboardLeaveByType = { name: string; value: number };

export type HrmDashboardTopEarner = {
  rank: number;
  userId: number;
  userName: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  designation?: string | null;
  gross: number;
  net: number;
};

export type HrmDashboardActivityItem = {
  id: number;
  action: string;
  entityType: string;
  entityId?: number | null;
  severity: string;
  actorName?: string | null;
  createdAt?: string | null;
};

export type HrmDashboardNeedsAttention = {
  label: string;
  href: string;
  tone: "info" | "warning" | "critical";
};

export type HrmDashboardBirthday = {
  userId: number;
  userName: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  date: string;
};

export type HrmDashboardInsights = {
  averageClockIn: string | null;
  onTimeRatePct: number | null;
  unreadAlerts: number;
};

export type HrmDashboardRequestStats = {
  pending: number;
  approved: number;
  rejected?: number;
};

export type HrmDashboardAnalytics = {
  attendanceTrend: Array<{
    date: string;
    label: string;
    present: number;
    absent: number;
    count: number;
  }>;
  todayBreakdown: Array<{ name: string; value: number }>;
  approvalPipeline: Array<{ name: string; value: number }>;
};

export type HrmDashboardResponse = {
  view: "admin" | "manager" | "employee";
  /** HRM policy timezone work-day key (YYYY-MM-DD) — use for today's attendance fetches */
  todayKey?: string;
  stats: HrmDashboardStats;
  onLeaveToday: HrmDashboardOnLeavePerson[];
  globalWfhMode?: boolean;
  analytics?: HrmDashboardAnalytics;
  self?: HrmDashboardSelfSummary;
  pendingApprovals?: {
    leave: HrmDashboardPendingLeave[];
    wfh: HrmDashboardPendingWfh[];
  };
  departmentStrength?: HrmDashboardDepartmentRow[];
  payrollBanner?: HrmDashboardPayrollBanner | null;
  onWfhToday?: HrmDashboardOnLeavePerson[];
  employeeStatus?: Array<{ name: string; value: number }>;
  todayAttendance?: HrmAttendanceSummary[];
  leaveByType?: HrmDashboardLeaveByType[];
  leaveRequestStats?: HrmDashboardRequestStats;
  wfhRequestStats?: HrmDashboardRequestStats;
  topEarners?: HrmDashboardTopEarner[];
  recentActivity?: HrmDashboardActivityItem[];
  needsAttention?: HrmDashboardNeedsAttention[];
  upcomingBirthdays?: HrmDashboardBirthday[];
  insights?: HrmDashboardInsights;
};

import type { EmployeeProfileExtension } from "./employee-profile-types";

export type HrmEmployee = EmployeeProfileExtension & {
  id: number;
  employeeId: string | null;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  avatarUrl?: string | null;
  departmentId?: number | null;
  department?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  reportingManagerId?: number | null;
  reportingManagerName?: string | null;
  reportingManagerEmployeeId?: string | null;
  teamleaderId?: number | null;
  teamleaderName?: string | null;
  teamleaderEmployeeId?: string | null;
  shiftName?: string | null;
  subType?: string | null;
  roleTemplateId?: number | null;
  phoneNumber?: string | null;
  joiningDate?: string | null;
  linkedinUrl?: string | null;
  status: string;
  wfhMonthlyLimit?: number | null;
  leaveAccrualDaysPerMonth?: number | null;
  lastLoginAt?: string | null;
  salary?: EmployeeProfileExtension["salary"];
  socialProfiles?: EmployeeProfileExtension["socialProfiles"];
  /** Linked to a recruitment candidate in the Onboarding pipeline stage. */
  recruitmentOnboarding?: boolean;
};

export type HrmEmployeeDetailResponse = {
  employee: HrmEmployee;
  overview: HrmEmployeeOverview;
  attendanceSummaries?: HrmAttendanceSummary[];
  leaveBalances?: HrmLeaveBalance[];
  leaveRequests?: HrmLeaveRequest[];
};

export type HrmEmployeeContractSalary = {
  configured: boolean;
  source: "profile" | "structure" | null;
  basic: number;
  allowances: number;
  hra: number;
  deductions: number;
  gross: number;
  net: number;
};

export type HrmEmployeeOverview = {
  month: { year: number; month: number; startDate: string; endDate: string };
  attendance: { present: number; absent: number; onLeave: number; late: number; wfh: number };
  pendingLeave: number;
  leaveBalances: Array<{ code: string; name: string; available: number }>;
  salaryGross?: number | null;
  salaryNet?: number | null;
  contractSalary?: HrmEmployeeContractSalary;
  latestPayrollNet?: number | null;
  documentCount: number;
};

export type HrmPayrollRun = {
  id: number;
  year: number;
  month: number;
  status: string;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  finalizedAt?: string | null;
  finalizedBy?: number | null;
  createdAt?: string;
};

export type HrmPayrollLine = {
  id: number;
  payrollRunId: number;
  userId: number;
  employeeName?: string;
  employeeId?: string | null;
  employeeAvatarUrl?: string | null;
  payslipId?: number | null;
  paidDays: number;
  lopDays: number;
  lateCount: number;
  gross: number;
  deductions: number;
  lopDeduction?: number;
  pfEmployee?: number;
  pfEmployer?: number;
  tds?: number;
  net: number;
  totalSalary?: number;
  contractNet?: number;
  notes?: string | null;
};

export type HrmPayrollOrgOverview = {
  totalActive: number;
  configuredCount: number;
  notConfiguredCount: number;
  monthlyCommitmentNet: number;
  avgNetSalary: number;
};

export type HrmSalaryStructure = {
  id: number;
  userId: number;
  employeeName?: string;
  employeeId?: string | null;
  basic: number;
  hra: number;
  allowances: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee?: number;
  esiEmployer?: number;
  tds: number;
  gross: number;
  net: number;
  bankAccountMasked?: string | null;
  ifscMasked?: string | null;
  panMasked?: string | null;
  bankNameMasked?: string | null;
};

export type HrmPayslip = {
  id: number;
  payrollLineId?: number;
  userId?: number;
  year: number;
  month: number;
  gross?: number | null;
  net?: number | null;
  htmlContent?: string | null;
  status?: string | null;
};

export type HrmAdminPayslipRow = {
  id: number;
  payrollLineId: number;
  userId: number;
  year: number;
  month: number;
  employeeName: string;
  employeeId: string | null;
  employeeAvatarUrl?: string | null;
  designation?: string | null;
  gross: number | null;
  net: number | null;
  contractNet?: number | null;
  status: "PAID" | "UNPAID";
  runStatus?: string | null;
};

export type HrmPayslipDetail = {
  id: number;
  month: number;
  year: number;
  companyName: string;
  sealUrl?: string | null;
  employeeName: string;
  employeeId: string | null;
  department: string | null;
  basic: number;
  hra: number;
  allowances: number;
  paidDays: number;
  lopDays: number;
  lateCount: number;
  gross: number;
  deductions: number;
  lopDeduction: number;
  net: number;
  htmlContent?: string | null;
  contractNet?: number;
  earnedGross?: number;
};

export type HrmPayrollChecklistBlocker = {
  code: string;
  message: string;
  count: number;
  items?: Array<Record<string, unknown>>;
};

export type HrmPayrollChecklist = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  blockers: HrmPayrollChecklistBlocker[];
  warnings: HrmPayrollChecklistBlocker[];
  ready: boolean;
};

export type HrmCandidate = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  position: string;
  departmentId?: number | null;
  departmentName?: string | null;
  stage: string;
  notes?: string | null;
  resumeUrl?: string | null;
  experienceYears?: number | null;
  source?: string | null;
  rating?: number | null;
  hiredUserId?: number | null;
  appliedOn?: string;
  createdAt?: string;
};

export type HrmOnboardingTaskItem = {
  title: string;
  completed: boolean;
};

export type HrmOnboardingRecord = {
  id: number;
  userId: number;
  candidateId?: number | null;
  buddyId?: number | null;
  startDate: string;
  status: "active" | "complete";
  tasks: HrmOnboardingTaskItem[];
  progress: number;
  employeeName: string;
  employeeEmail?: string | null;
  employeeDesignation?: string | null;
  employeeAvatarUrl?: string | null;
  employeeCode?: string | null;
  buddyName?: string | null;
  candidateName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** @deprecated legacy flat task rows */
export type HrmOnboardingTask = {
  id: number;
  candidateId: number;
  title: string;
  completed: boolean;
  completedAt?: string | null;
};

export type HrmEmployeeDocument = {
  id: number;
  userId: number;
  userName?: string;
  employeeId?: string | null;
  avatarUrl?: string | null;
  name: string;
  category: string;
  fileUrl: string;
  status: string;
  source?: "library" | "profile";
  reviewNote?: string | null;
  reviewedBy?: number | null;
  createdAt?: string;
};

export type HrmPolicy = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  fileUrl?: string | null;
  version: string;
  isActive: boolean;
  createdAt?: string;
};

export type HrmPolicyAcknowledgement = {
  id: number;
  policyId: number;
  userId: number;
  acknowledgedAt?: string;
};

export type HrmAsset = {
  id: number;
  tag: string;
  category: string;
  brand: string;
  serial: string;
  cost: number;
  condition: string;
  status: string;
  assignedUserId?: number | null;
  assignedOn?: string | null;
  assignedToName?: string | null;
  assignedEmployeeCode?: string | null;
  assignedDesignation?: string | null;
  assignedAvatarUrl?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HrmExperienceLetter = {
  id: number;
  userId: number;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  departmentName?: string;
  joiningDate?: string | null;
  relievingDate: string;
  letterType: "experience" | "relieving" | "offer";
  offeredCtc?: number | null;
  htmlContent?: string;
  pdfUrl?: string | null;
  emailSentAt?: string | null;
  emailSentTo?: string | null;
  createdBy?: number | null;
  createdByName?: string;
  additionalNotes?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HrmExitRequest = {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail?: string | null;
  employeeCode?: string | null;
  employeeDesignation?: string | null;
  employeeAvatarUrl?: string | null;
  employeeDepartment?: string | null;
  reason: string;
  resignationDate: string;
  lastWorkingDay: string;
  noticePeriodDays: number;
  stage: number;
  stageLabel: string;
  stageCount: number;
  status: string;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedAt?: string | null;
  approvedByUserId?: number | null;
  rejectedAt?: string | null;
  rejectedByUserId?: number | null;
  rejectionReason?: string;
  autoDeactivatedAt?: string | null;
  employeeStatus?: string | null;
  assetReturnComplete: boolean;
  fnfSettled: boolean;
  noticeDaysRemaining: number;
  assignedAssetCount?: number;
  assets?: HrmAsset[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HrmPermissionsResponse = {
  permissions: HrmPermission[];
  templateId: number | null;
  role?: string;
};

export type { HrmPermission };
