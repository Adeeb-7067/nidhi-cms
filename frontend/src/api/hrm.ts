import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { useHrmMutation, useHrmQuery } from "./hrm-hooks";
import { apiUrl } from "@/lib/api-base";
import { QUERY_STALE } from "@/lib/query-config";
import type {
  HrmAttendanceSummary,
  HrmDashboardStats,
  HrmDashboardResponse,
  HrmDepartment,
  HrmHoliday,
  HrmCalendarMonth,
  HrmLeaveBalance,
  HrmLeaveRequest,
  HrmLeaveType,
  HrmPayrollLine,
  HrmPayrollOrgOverview,
  HrmSalaryStructure,
  HrmPayrollRun,
  HrmShiftTemplate,
  HrmWfhRequest,
  HrmSettings,
  HrmAttendanceCorrection,
  HrmAttendanceVarianceRow,
  HrmAuditLog,
  HrmEmployee,
  HrmEmployeeOverview,
  HrmEmployeeDetailResponse,
  HrmPayslip,
  HrmPayslipDetail,
  HrmAdminPayslipRow,
  HrmManualPayslipRow,
  HrmManualPayslipInput,
  HrmPayrollChecklist,
  HrmCandidate,
  HrmOnboardingRecord,
  HrmOnboardingTaskItem,
  HrmEmployeeDocument,
  HrmPolicy,
  HrmPolicyAcknowledgement,
  HrmAsset,
  HrmExitRequest,
  HrmExperienceLetter,
} from "@/modules/hrm/types";
import type { HrmProfilePatchPayload } from "@/modules/hrm/employee-profile-types";
import type { HrmAction, HrmModule } from "@/modules/hrm/constants";
export { useHrmMutation, useHrmQuery, mergeHrmQueryStates } from "./hrm-hooks";
export { getApiErrorMessage as getHrmApiErrorMessage } from "@/lib/api-error";
export {
  usePermissionsQuery as useHrmPermissionsQuery,
  permissionsQueryKey as hrmPermissionsQueryKey,
  usePermissionCatalog as useHrmPermissionCatalog,
  useRoleTemplates as useHrmRoleTemplates,
  useUpdateRoleTemplatePermissions,
  roleTemplatesQueryKey as hrmRolesQueryKey,
} from "./permissions";

export const hrmDepartmentsQueryKey = () => ["hrm", "departments"] as const;
export const hrmDashboardQueryKey = (trendDays: string = "30") => ["hrm", "dashboard", trendDays] as const;
export const hrmLeaveRequestsQueryKey = (params?: object) => ["hrm", "leave", "requests", params] as const;
export const hrmLeaveBalancesQueryKey = (userId?: number, year?: number) =>
  ["hrm", "leave", "balances", userId, year] as const;
export const hrmWfhRequestsQueryKey = (params?: object) => ["hrm", "wfh", "requests", params] as const;
export const hrmHolidaysQueryKey = (params?: object) => ["hrm", "holidays", params] as const;
export const hrmAttendanceQueryKey = (params?: object) => ["hrm", "attendance", params] as const;

/** Leave review changes attendance status — invalidate dependent caches together. */
function invalidateLeaveWorkflowQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["hrm", "leave"] });
  qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
  qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
}
export const hrmPayrollRunsQueryKey = () => ["hrm", "payroll", "runs"] as const;
export const hrmShiftTemplatesQueryKey = () => ["hrm", "shifts", "templates"] as const;
export const hrmSettingsQueryKey = () => ["hrm", "settings"] as const;
export const hrmEmployeesQueryKey = (params?: object) => ["hrm", "employees", params] as const;
export const hrmEmployeeQueryKey = (id?: number) => ["hrm", "employees", id] as const;
export const hrmCorrectionsQueryKey = (params?: object) => ["hrm", "attendance", "corrections", params] as const;
export const hrmVarianceQueryKey = (params?: object) => ["hrm", "attendance", "variance", params] as const;
export const hrmAuditQueryKey = (params?: object) => ["hrm", "audit", params] as const;

export function useHrmDepartments(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmDepartmentsQueryKey(),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.reference,
    queryFn: () =>
      customFetch<{ departments: HrmDepartment[] }>(apiUrl("/api/hrm/departments")),
    meta: { errorMessage: "Could not load departments" },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { name: string; code?: string; headUserId?: number; description?: string }) =>
      customFetch<HrmDepartment>(apiUrl("/api/hrm/departments"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrmDepartmentsQueryKey() }),
    meta: { errorMessage: "Could not create department" },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; code?: string; headUserId?: number | null; description?: string }) =>
      customFetch<HrmDepartment>(apiUrl(`/api/hrm/departments/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrmDepartmentsQueryKey() }),
    meta: { errorMessage: "Could not update department" },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/hrm/departments/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrmDepartmentsQueryKey() }),
    meta: { errorMessage: "Could not delete department" },
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { date: string; name: string; type?: string; scope?: string }) =>
      customFetch<HrmHoliday>(apiUrl("/api/hrm/holidays"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmHolidaysQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "calendar"] });
    },
    meta: { errorMessage: "Could not create holiday" },
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; date?: string; name?: string; type?: string; scope?: string }) =>
      customFetch<HrmHoliday>(apiUrl(`/api/hrm/holidays/${id}`), { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmHolidaysQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "calendar"] });
    },
    meta: { errorMessage: "Could not update holiday" },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/hrm/holidays/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmHolidaysQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "calendar"] });
    },
    meta: { errorMessage: "Could not delete holiday" },
  });
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      name: string;
      startTime: string;
      endTime: string;
      graceMinutesIn?: number;
      breakMinutes?: number;
      workingDays?: number[];
    }) =>
      customFetch<HrmShiftTemplate>(apiUrl("/api/hrm/shifts/templates"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmShiftTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
    },
    meta: { errorMessage: "Could not create shift template" },
  });
}

export function useUpdateShiftTemplate() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: Partial<HrmShiftTemplate> & { id: number }) =>
      customFetch<HrmShiftTemplate>(apiUrl(`/api/hrm/shifts/templates/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmShiftTemplatesQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
    },
    meta: { errorMessage: "Could not update shift template" },
  });
}

export function useAssignShift() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { userId: number; shiftTemplateId: number; effectiveFrom: string; effectiveTo?: string }) =>
      customFetch(apiUrl("/api/hrm/shifts/assignments"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "shifts", "assignments"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      qc.invalidateQueries({ queryKey: ["hrm", "payroll", "checklist"] });
    },
    meta: { errorMessage: "Could not assign shift" },
  });
}

export function useHrmShiftAssignments(userId?: number) {
  const qs = userId ? `?userId=${userId}` : "";
  return useHrmQuery({
    queryKey: ["hrm", "shifts", "assignments", userId],
    queryFn: () =>
      customFetch<{ assignments: Array<{ id: number; userId: number; shiftTemplateId: number; effectiveFrom: string; effectiveTo?: string | null }> }>(
        apiUrl(`/api/hrm/shifts/assignments${qs}`),
      ),
    meta: { errorMessage: "Could not load shift assignments" },
  });
}

export function useHrmDashboard(trendDays: string = "30") {
  return useHrmQuery({
    queryKey: hrmDashboardQueryKey(trendDays),
    staleTime: QUERY_STALE.analytics,
    queryFn: () => customFetch<HrmDashboardResponse>(apiUrl(`/api/hrm/dashboard?trendDays=${encodeURIComponent(trendDays)}`)),
    meta: { errorMessage: "Could not load HRM dashboard" },
  });
}

export function useHrmLeaveTypes() {
  return useHrmQuery({
    queryKey: ["hrm", "leave", "types"],
    staleTime: QUERY_STALE.reference,
    queryFn: () => customFetch<{ types: HrmLeaveType[] }>(apiUrl("/api/hrm/leave/types")),
    meta: { errorMessage: "Could not load leave types" },
  });
}

export function useHrmLeaveBalances(
  userId?: number,
  year?: number,
  options?: { enabled?: boolean; staleTime?: number },
) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", String(userId));
  if (year) params.set("year", String(year));
  const qs = params.toString();
  return useHrmQuery({
    queryKey: hrmLeaveBalancesQueryKey(userId, year),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ balances: HrmLeaveBalance[] }>(
        apiUrl(`/api/hrm/leave/balances${qs ? `?${qs}` : ""}`),
      ),
    meta: { errorMessage: "Could not load leave balances" },
  });
}

export function useHrmLeaveRequests(
  params?: { status?: string; userId?: number; date?: string },
  options?: { enabled?: boolean },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.userId) search.set("userId", String(params.userId));
  if (params?.date) search.set("date", params.date);
  const qs = search.toString();
  return useHrmQuery({
    queryKey: hrmLeaveRequestsQueryKey(params),
    queryFn: () =>
      customFetch<{ requests: HrmLeaveRequest[] }>(
        apiUrl(`/api/hrm/leave/requests${qs ? `?${qs}` : ""}`),
      ),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    meta: { errorMessage: "Could not load leave requests" },
  });
}

export function useApplyLeaveRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      leaveTypeId: number;
      startDate: string;
      endDate: string;
      dayPart?: string;
      reason: string;
      userId?: number;
    }) =>
      customFetch<HrmLeaveRequest>(apiUrl("/api/hrm/leave/requests"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "leave"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not submit leave request" },
  });
}

export function useReviewLeaveRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reviewNote?: string }) =>
      customFetch<HrmLeaveRequest>(apiUrl(`/api/hrm/leave/requests/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateLeaveWorkflowQueries(qc);
    },
    meta: { errorMessage: "Could not update leave request" },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<HrmLeaveRequest>(apiUrl(`/api/hrm/leave/requests/${id}/cancel`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "leave"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not cancel leave request" },
  });
}

export function useHrmWfhRequests(
  params?: { status?: string; userId?: number },
  options?: { enabled?: boolean },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.userId) search.set("userId", String(params.userId));
  const qs = search.toString();
  return useHrmQuery({
    queryKey: hrmWfhRequestsQueryKey(params),
    queryFn: () =>
      customFetch<{ requests: HrmWfhRequest[] }>(
        apiUrl(`/api/hrm/wfh/requests${qs ? `?${qs}` : ""}`),
      ),
    enabled: options?.enabled ?? true,
    meta: { errorMessage: "Could not load WFH requests" },
  });
}

export function useApplyWfhRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      startDate: string;
      endDate?: string;
      reason: string;
      phoneNumber?: string;
      date?: string;
      userId?: number;
    }) =>
      customFetch<HrmWfhRequest>(apiUrl("/api/hrm/wfh/requests"), {
        method: "POST",
        body: JSON.stringify({
          startDate: body.startDate ?? body.date,
          endDate: body.endDate ?? body.startDate ?? body.date,
          reason: body.reason,
          phoneNumber: body.phoneNumber?.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "wfh"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not submit WFH request" },
  });
}

export function useReviewWfhRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reviewNote?: string }) =>
      customFetch<HrmWfhRequest>(apiUrl(`/api/hrm/wfh/requests/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "wfh"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not update WFH request" },
  });
}

export function useCancelWfhRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<HrmWfhRequest>(apiUrl(`/api/hrm/wfh/requests/${id}/cancel`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "wfh"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not cancel WFH request" },
  });
}

export function useHrmHolidays(year?: number) {
  const params = year ? `?year=${year}` : "";
  return useHrmQuery({
    queryKey: hrmHolidaysQueryKey({ year }),
    queryFn: () =>
      customFetch<{ holidays: HrmHoliday[] }>(apiUrl(`/api/hrm/holidays${params}`)),
    meta: { errorMessage: "Could not load holidays" },
  });
}

export function useHrmCalendar(year: number, month: number) {
  return useHrmQuery({
    queryKey: ["hrm", "calendar", year, month],
    queryFn: () =>
      customFetch<HrmCalendarMonth>(apiUrl(`/api/hrm/calendar?year=${year}&month=${month}`)),
    meta: { errorMessage: "Could not load calendar" },
  });
}

export function useGenerateSundayHolidays() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (year: number) =>
      customFetch<{ year: number; created: number; skipped: number }>(
        apiUrl("/api/hrm/calendar/generate-sundays"),
        { method: "POST", body: JSON.stringify({ year }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmHolidaysQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "calendar"] });
    },
    meta: { errorMessage: "Could not generate Sunday holidays" },
  });
}

export function useHrmAttendanceDaily(
  startDate: string,
  endDate: string,
  userId?: number,
  departmentId?: number,
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams({ startDate, endDate });
  if (userId) params.set("userId", String(userId));
  if (departmentId) params.set("departmentId", String(departmentId));
  return useHrmQuery({
    queryKey: hrmAttendanceQueryKey({ startDate, endDate, userId, departmentId }),
    queryFn: () =>
      customFetch<{ summaries: HrmAttendanceSummary[] }>(
        apiUrl(`/api/hrm/attendance/daily?${params}`),
      ),
    enabled: (options?.enabled ?? true) && !!startDate && !!endDate,
    staleTime: QUERY_STALE.analytics,
    meta: { errorMessage: "Could not load attendance" },
  });
}

export function useHrmAttendanceVariance(
  startDate: string,
  endDate: string,
  userId?: number,
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams({ startDate, endDate });
  if (userId) params.set("userId", String(userId));
  return useHrmQuery({
    queryKey: hrmVarianceQueryKey({ startDate, endDate, userId }),
    queryFn: () =>
      customFetch<{ rows: HrmAttendanceVarianceRow[]; flaggedCount?: number }>(
        apiUrl(`/api/hrm/attendance/variance?${params}`),
      ),
    enabled: (options?.enabled ?? true) && !!startDate && !!endDate,
    staleTime: QUERY_STALE.analytics,
    meta: { errorMessage: "Could not load attendance variance" },
  });
}

export function useHrmAttendanceCorrections(userId?: number, options?: { enabled?: boolean }) {
  const params = userId ? `?userId=${userId}` : "";
  return useHrmQuery({
    queryKey: hrmCorrectionsQueryKey({ userId }),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ corrections: HrmAttendanceCorrection[] }>(
        apiUrl(`/api/hrm/attendance/corrections${params}`),
      ),
    meta: { errorMessage: "Could not load correction requests" },
  });
}

export function useApplyAttendanceCorrection() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      date: string;
      reason: string;
      requestedStatus?: string;
      requestedActiveMinutes?: number;
      userId?: number;
    }) =>
      customFetch<HrmAttendanceCorrection>(apiUrl("/api/hrm/attendance/corrections"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not submit correction" },
  });
}

export function useReviewAttendanceCorrection() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reviewNote?: string }) =>
      customFetch<HrmAttendanceCorrection>(apiUrl(`/api/hrm/attendance/corrections/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      qc.invalidateQueries({ queryKey: hrmAuditQueryKey() });
    },
    meta: { errorMessage: "Could not update correction" },
  });
}

export function useExcuseLateArrival() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      userId,
      date,
      note,
    }: {
      userId: number;
      date: string;
      note?: string;
    }) =>
      customFetch<HrmAttendanceSummary>(
        apiUrl(`/api/hrm/attendance/daily/${userId}/${date}/excuse-late`),
        {
          method: "POST",
          body: JSON.stringify({ note }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
      qc.invalidateQueries({ queryKey: hrmAuditQueryKey() });
    },
    meta: { errorMessage: "Could not excuse late arrival" },
  });
}

export function useAdminOverrideAttendance() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      userId,
      date,
      status,
      activeMinutes,
      reason,
      mode,
      clockIn,
      clockOut,
    }: {
      userId: number;
      date: string;
      status: string;
      activeMinutes?: number;
      reason: string;
      mode?: "clock_in" | "clock_out";
      clockIn?: string;
      clockOut?: string;
    }) =>
      customFetch<HrmAttendanceSummary>(
        apiUrl(`/api/hrm/attendance/daily/${userId}/${date}`),
        {
          method: "PATCH",
          body: JSON.stringify({ status, activeMinutes, reason, mode, clockIn, clockOut }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
      qc.invalidateQueries({ queryKey: hrmAuditQueryKey() });
    },
    meta: { errorMessage: "Could not update attendance" },
  });
}

export function useSendEmployeeCredentials() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ userId, resend }: { userId: number; resend?: boolean }) =>
      customFetch<{
        message: string;
        emailSent: boolean;
        emailConfigured: boolean;
        temporaryPassword?: string;
        loginEmployeeId?: string;
      }>(apiUrl(`/api/hrm/employees/${userId}/send-credentials`), {
        method: "POST",
        body: JSON.stringify({ resend: resend ?? false }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: hrmEmployeeQueryKey(vars.userId) });
      qc.invalidateQueries({ queryKey: hrmAuditQueryKey() });
    },
    meta: { errorMessage: "Could not send login credentials" },
  });
}

export function useHrmSettings(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmSettingsQueryKey(),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.reference,
    queryFn: () => customFetch<HrmSettings>(apiUrl("/api/hrm/settings")),
    meta: { errorMessage: "Could not load HRM settings" },
  });
}

export function useUpdateHrmSettings() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: Partial<HrmSettings>) =>
      customFetch<HrmSettings>(apiUrl("/api/hrm/settings"), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmSettingsQueryKey() });
      qc.invalidateQueries({ queryKey: hrmAuditQueryKey() });
    },
    meta: { errorMessage: "Could not save settings" },
  });
}

export function useHrmEmployees(
  params?: {
    search?: string;
    departmentId?: number;
    status?: string;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.departmentId != null) searchParams.set("departmentId", String(params.departmentId));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return useHrmQuery({
    queryKey: hrmEmployeesQueryKey(params),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ employees: HrmEmployee[]; total: number; page: number; limit: number }>(
        apiUrl(`/api/hrm/employees${qs ? `?${qs}` : ""}`),
      ),
    meta: { errorMessage: "Could not load employees" },
  });
}

export function useHrmEmployee(id?: number) {
  return useHrmQuery({
    queryKey: hrmEmployeeQueryKey(id),
    enabled: id != null && id > 0,
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<HrmEmployeeDetailResponse>(apiUrl(`/api/hrm/employees/${id}`)),
    meta: { errorMessage: "Could not load employee" },
  });
}

export function useHrmAuditLogs(params?: { severity?: string; action?: string }) {
  const search = new URLSearchParams();
  if (params?.severity) search.set("severity", params.severity);
  if (params?.action) search.set("action", params.action);
  const qs = search.toString();
  return useHrmQuery({
    queryKey: hrmAuditQueryKey(params),
    queryFn: () =>
      customFetch<{ logs: HrmAuditLog[] }>(apiUrl(`/api/hrm/audit${qs ? `?${qs}` : ""}`)),
    meta: { errorMessage: "Could not load audit log" },
  });
}

export function useHrmShiftTemplates(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmShiftTemplatesQueryKey(),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.reference,
    queryFn: () =>
      customFetch<{ templates: HrmShiftTemplate[] }>(apiUrl("/api/hrm/shifts/templates")),
    meta: { errorMessage: "Could not load shift templates" },
  });
}

export function useHrmPayrollRuns() {
  return useHrmQuery({
    queryKey: hrmPayrollRunsQueryKey(),
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ runs: HrmPayrollRun[] }>(apiUrl("/api/hrm/payroll/runs")),
    meta: { errorMessage: "Could not load payroll runs" },
  });
}

export function useHrmSalaryStructures(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: ["hrm", "payroll", "structures"],
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.reference,
    queryFn: () =>
      customFetch<{ structures: HrmSalaryStructure[] }>(apiUrl("/api/hrm/payroll/structures")),
    meta: { errorMessage: "Could not load salary structures" },
  });
}

export function useHrmPayrollOrgOverview(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: ["hrm", "payroll", "org-overview"],
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.reference,
    queryFn: () =>
      customFetch<HrmPayrollOrgOverview>(apiUrl("/api/hrm/payroll/org-overview")),
    meta: { errorMessage: "Could not load payroll overview" },
  });
}

export function useUpsertSalaryStructure() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      userId,
      ...body
    }: {
      userId: number;
      basic?: number;
      hra?: number;
      allowances?: number;
      pfEmployee?: number;
      pfEmployer?: number;
      esiEmployee?: number;
      esiEmployer?: number;
      tds?: number;
      bankAccountNumber?: string | null;
      ifscCode?: string | null;
      bankName?: string | null;
      panNumber?: string | null;
    }) =>
      customFetch<HrmSalaryStructure>(apiUrl(`/api/hrm/payroll/structures/${userId}`), {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "payroll", "structures"] });
      qc.invalidateQueries({ queryKey: ["hrm", "payroll", "org-overview"] });
      qc.invalidateQueries({ queryKey: ["hrm", "payroll", "checklist"] });
    },
    meta: { errorMessage: "Could not save salary structure" },
  });
}

export function useUpdatePayrollLine() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      lineId,
      ...body
    }: {
      lineId: number;
      paidDays?: number;
      lopDays?: number;
      lateCount?: number;
      gross?: number;
      deductions?: number;
      lopDeduction?: number;
      notes?: string;
    }) =>
      customFetch(apiUrl(`/api/hrm/payroll/lines/${lineId}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidatePayrollSlipQueries(qc),
    meta: { errorMessage: "Could not update payroll line" },
  });
}

export function useReviewPayrollRun() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (runId: number) =>
      customFetch(apiUrl(`/api/hrm/payroll/runs/${runId}/review`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrmPayrollRunsQueryKey() }),
    meta: { errorMessage: "Could not mark payroll as reviewed" },
  });
}

export function payrollExportUrl(runId: number) {
  return apiUrl(`/api/hrm/payroll/runs/${runId}/export`);
}

export function payrollBankExportUrl(runId: number) {
  return apiUrl(`/api/hrm/payroll/runs/${runId}/export/bank`);
}

export function useHrmPayrollChecklist(runId?: number) {
  return useHrmQuery({
    queryKey: ["hrm", "payroll", "checklist", "run", runId],
    queryFn: () =>
      customFetch<HrmPayrollChecklist>(apiUrl(`/api/hrm/payroll/runs/${runId}/checklist`)),
    enabled: !!runId,
    meta: { errorMessage: "Could not load payroll checklist" },
  });
}

export function useHrmPayrollChecklistByPeriod(year: number, month: number) {
  return useHrmQuery({
    queryKey: ["hrm", "payroll", "checklist", year, month],
    staleTime: QUERY_STALE.analytics,
    queryFn: () =>
      customFetch<HrmPayrollChecklist>(
        apiUrl(`/api/hrm/payroll/checklist?year=${year}&month=${month}`),
      ),
    meta: { errorMessage: "Could not load payroll checklist" },
  });
}

export function useHrmPayrollRunLines(runId?: number) {
  return useHrmQuery({
    queryKey: ["hrm", "payroll", "lines", runId],
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ lines: HrmPayrollLine[] }>(apiUrl(`/api/hrm/payroll/runs/${runId}/lines`)),
    enabled: !!runId,
    meta: { errorMessage: "Could not load payroll lines" },
  });
}

function invalidatePayrollSlipQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: hrmPayrollRunsQueryKey() });
  qc.invalidateQueries({ queryKey: ["hrm", "payroll", "lines"] });
  qc.invalidateQueries({ queryKey: ["hrm", "admin-payslips"] });
  qc.invalidateQueries({ queryKey: ["hrm", "my-payslips"] });
}

export function useGeneratePayrollRun() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { year: number; month: number }) =>
      customFetch<HrmPayrollRun>(apiUrl("/api/hrm/payroll/runs"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidatePayrollSlipQueries(qc),
    meta: { errorMessage: "Could not generate payroll", showErrorToast: false },
  });
}

export function useFinalizePayrollRun() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (runId: number) =>
      customFetch(apiUrl(`/api/hrm/payroll/runs/${runId}/finalize`), { method: "POST" }),
    onSuccess: () => invalidatePayrollSlipQueries(qc),
    meta: { errorMessage: "Could not finalize payroll" },
  });
}

export function useRevertPayrollRun() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (runId: number) =>
      customFetch(apiUrl(`/api/hrm/payroll/runs/${runId}/revert`), { method: "POST" }),
    onSuccess: () => invalidatePayrollSlipQueries(qc),
    meta: { errorMessage: "Could not revert payroll" },
  });
}

export function useRegeneratePayslips() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (runId: number) =>
      customFetch(apiUrl(`/api/hrm/payroll/runs/${runId}/regenerate-payslips`), { method: "POST" }),
    onSuccess: () => invalidatePayrollSlipQueries(qc),
    meta: { errorMessage: "Could not regenerate payslips" },
  });
}

export function useMarkPayrollRunPaid() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (runId: number) =>
      customFetch<HrmPayrollRun>(apiUrl(`/api/hrm/payroll/runs/${runId}/paid`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hrmPayrollRunsQueryKey() });
      qc.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    },
    meta: { errorMessage: "Could not mark payroll as paid" },
  });
}

export function useMyPayslips(year?: number) {
  const params = year ? `?year=${year}` : "";
  return useHrmQuery({
    queryKey: ["hrm", "my-payslips", year],
    queryFn: () =>
      customFetch<{ slips: HrmPayslip[] }>(
        apiUrl(`/api/hrm/my-payslips${params}`),
      ),
    meta: { errorMessage: "Could not load payslips" },
  });
}

export function useAdminPayslips(opts?: { year?: number; month?: number; allPeriods?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.year) params.set("year", String(opts.year));
  if (opts?.month) params.set("month", String(opts.month));
  if (opts?.allPeriods) params.set("allPeriods", "true");
  const qs = params.toString();
  return useHrmQuery({
    queryKey: ["hrm", "admin-payslips", opts?.year, opts?.month, opts?.allPeriods],
    queryFn: () =>
      customFetch<{ slips: HrmAdminPayslipRow[] }>(
        apiUrl(`/api/hrm/payslips${qs ? `?${qs}` : ""}`),
      ),
    meta: { errorMessage: "Could not load salary slips" },
  });
}

export function useHrmPayslip(id?: number) {
  return useHrmQuery({
    queryKey: ["hrm", "payslips", id],
    queryFn: () => customFetch<HrmPayslipDetail>(apiUrl(`/api/hrm/payslips/${id}`)),
    enabled: id != null,
    meta: { errorMessage: "Could not load payslip" },
  });
}

export function useManualPayslips(opts?: {
  year?: number;
  month?: number;
  allPeriods?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts?.year) params.set("year", String(opts.year));
  if (opts?.month) params.set("month", String(opts.month));
  if (opts?.allPeriods) params.set("allPeriods", "true");
  const qs = params.toString();
  return useHrmQuery({
    queryKey: ["hrm", "manual-payslips", opts?.year, opts?.month, opts?.allPeriods],
    queryFn: () =>
      customFetch<{ slips: HrmManualPayslipRow[] }>(
        apiUrl(`/api/hrm/manual-payslips${qs ? `?${qs}` : ""}`),
      ),
    meta: { errorMessage: "Could not load manual payslips" },
  });
}

export function useManualPayslip(id?: number) {
  return useHrmQuery({
    queryKey: ["hrm", "manual-payslips", "detail", id],
    queryFn: () => customFetch<HrmPayslipDetail>(apiUrl(`/api/hrm/manual-payslips/${id}`)),
    enabled: id != null,
    meta: { errorMessage: "Could not load manual payslip" },
  });
}

export function useUpsertManualPayslip() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: HrmManualPayslipInput) =>
      customFetch<HrmPayslipDetail>(apiUrl("/api/hrm/manual-payslips"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "manual-payslips"] }),
    meta: { errorMessage: "Could not save manual payslip", showErrorToast: false },
  });
}

export function useDeleteManualPayslip() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/hrm/manual-payslips/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "manual-payslips"] }),
    meta: { errorMessage: "Could not delete manual payslip" },
  });
}

export function usePatchUserHrmProfile() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ userId, ...body }: HrmProfilePatchPayload) =>
      customFetch<{ message: string; employee: HrmEmployee }>(apiUrl(`/api/hrm/users/${userId}/profile`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
      qc.invalidateQueries({ queryKey: hrmEmployeeQueryKey(vars.userId) });
      qc.invalidateQueries({ queryKey: ["hrm", "shifts", "assignments"] });
    },
    meta: { errorMessage: "Could not update employee profile" },
  });
}

export function useHrmCandidates() {
  return useHrmQuery({
    queryKey: ["hrm", "recruitment", "candidates"],
    queryFn: () =>
      customFetch<{ candidates: HrmCandidate[] }>(apiUrl("/api/hrm/recruitment/candidates")),
    meta: { errorMessage: "Could not load candidates" },
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      phone?: string;
      position: string;
      departmentId?: number | null;
      stage?: string;
      notes?: string;
      resumeUrl?: string;
    }) =>
      customFetch<HrmCandidate>(apiUrl("/api/hrm/recruitment/candidates"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] }),
    meta: { errorMessage: "Could not add candidate" },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      stage?: string;
      notes?: string;
      position?: string;
      name?: string;
      email?: string;
      phone?: string;
      departmentId?: number | null;
      experienceYears?: number;
      source?: string;
      rating?: number;
      resumeUrl?: string;
    }) =>
      customFetch<HrmCandidate>(apiUrl(`/api/hrm/recruitment/candidates/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] }),
    meta: { errorMessage: "Could not update candidate" },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<{ deleted: boolean }>(apiUrl(`/api/hrm/recruitment/candidates/${id}`), {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] }),
    meta: { errorMessage: "Could not delete candidate" },
  });
}

export function useStartOnboarding() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (candidateId: number) =>
      customFetch<{ record: HrmOnboardingRecord }>(
        apiUrl(`/api/hrm/recruitment/candidates/${candidateId}/onboarding`),
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] });
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] });
    },
    meta: { errorMessage: "Could not start onboarding" },
  });
}

export function useOnboardingTasks(candidateId?: number) {
  return useHrmQuery({
    queryKey: ["hrm", "recruitment", "onboarding", candidateId],
    queryFn: () =>
      customFetch<{ record: HrmOnboardingRecord | null; tasks: HrmOnboardingTaskItem[] }>(
        apiUrl(`/api/hrm/recruitment/candidates/${candidateId}/onboarding`),
      ),
    enabled: !!candidateId,
    meta: { errorMessage: "Could not load onboarding tasks" },
  });
}

export function useHrmOnboardingRecords(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return useHrmQuery({
    queryKey: ["hrm", "onboarding", status ?? "all"],
    queryFn: () =>
      customFetch<{ records: HrmOnboardingRecord[] }>(apiUrl(`/api/hrm/onboarding${qs}`)),
    meta: { errorMessage: "Could not load onboarding records" },
  });
}

export function useOnboardingEligibleEmployees(options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: ["hrm", "onboarding", "eligible-employees"],
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    queryFn: () =>
      customFetch<{ employees: HrmEmployee[] }>(apiUrl("/api/hrm/onboarding/eligible-employees")),
    meta: { errorMessage: "Could not load employees for onboarding" },
  });
}

export function useCreateOnboardingRecord() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { userId: number; buddyId?: number | null; startDate?: string }) =>
      customFetch<{ record: HrmOnboardingRecord }>(apiUrl("/api/hrm/onboarding"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding", "eligible-employees"] });
    },
    meta: { errorMessage: "Could not start onboarding" },
  });
}

export function useUpdateOnboardingRecord() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      buddyId?: number | null;
      startDate?: string;
      status?: "active" | "complete";
    }) =>
      customFetch<{ record: HrmOnboardingRecord }>(apiUrl(`/api/hrm/onboarding/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] }),
    meta: { errorMessage: "Could not update onboarding" },
  });
}

export function useToggleOnboardingTask() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ recordId, taskIndex }: { recordId: number; taskIndex: number }) =>
      customFetch<{ record: HrmOnboardingRecord }>(
        apiUrl(`/api/hrm/onboarding/${recordId}/tasks/${taskIndex}`),
        { method: "PATCH" },
      ),
    onSuccess: (data) => {
      qc.setQueriesData<{ records: HrmOnboardingRecord[] }>(
        { queryKey: ["hrm", "onboarding"] },
        (old) => {
          if (!old?.records) return old;
          return {
            ...old,
            records: old.records.map((r) => (r.id === data.record.id ? data.record : r)),
          };
        },
      );
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["hrm", "recruitment"] });
    },
    meta: { errorMessage: "Could not update task" },
  });
}

export function useDeleteOnboardingRecord() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<{ deleted: boolean }>(apiUrl(`/api/hrm/onboarding/${id}`), {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["hrm", "onboarding", "eligible-employees"] });
    },
    meta: { errorMessage: "Could not remove onboarding" },
  });
}

export function useHrmDocuments(userId?: number, options?: { enabled?: boolean }) {
  const qs = userId ? `?userId=${userId}` : "";
  return useHrmQuery({
    queryKey: ["hrm", "documents", userId ?? "all"],
    enabled: (options?.enabled ?? true) && (userId == null || userId > 0),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () =>
      customFetch<{ documents: HrmEmployeeDocument[] }>(apiUrl(`/api/hrm/documents${qs}`)),
    meta: { errorMessage: "Could not load documents" },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: { name: string; fileUrl: string; category?: string; userId?: number }) =>
      customFetch<HrmEmployeeDocument>(apiUrl("/api/hrm/documents"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "documents"] }),
    meta: { errorMessage: "Could not upload document" },
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number; status: string; reviewNote?: string }) =>
      customFetch<HrmEmployeeDocument>(apiUrl(`/api/hrm/documents/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "documents"] }),
    meta: { errorMessage: "Could not review document" },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/hrm/documents/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "documents"] }),
    meta: { errorMessage: "Could not delete document" },
  });
}

export function useHrmPolicies() {
  return useHrmQuery({
    queryKey: ["hrm", "policies"],
    queryFn: () => customFetch<{ policies: HrmPolicy[] }>(apiUrl("/api/hrm/policies")),
    meta: { errorMessage: "Could not load policies" },
  });
}

export function useMyPolicyAcknowledgements() {
  return useHrmQuery({
    queryKey: ["hrm", "policies", "acks"],
    queryFn: () =>
      customFetch<{ acknowledgements: HrmPolicyAcknowledgement[] }>(
        apiUrl("/api/hrm/policies/my-acknowledgements"),
      ),
    meta: { errorMessage: "Could not load acknowledgements" },
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      title: string;
      fileUrl?: string;
      description?: string;
      version?: string;
      category?: string;
    }) =>
      customFetch<HrmPolicy>(apiUrl("/api/hrm/policies"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "policies"] }),
    meta: { errorMessage: "Could not publish policy" },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      title?: string;
      fileUrl?: string | null;
      description?: string | null;
      version?: string;
      category?: string;
    }) =>
      customFetch<HrmPolicy>(apiUrl(`/api/hrm/policies/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "policies"] }),
    meta: { errorMessage: "Could not update policy" },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch(apiUrl(`/api/hrm/policies/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "policies"] }),
    meta: { errorMessage: "Could not delete policy" },
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (policyId: number) =>
      customFetch(apiUrl(`/api/hrm/policies/${policyId}/acknowledge`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "policies"] }),
    meta: { errorMessage: "Could not acknowledge policy" },
  });
}

export const hrmAssetsQueryKey = (params?: object) => ["hrm", "assets", params] as const;
export const hrmAssetQueryKey = (id?: number) => ["hrm", "assets", id] as const;
export const hrmExitQueryKey = (params?: object) => ["hrm", "exit", params] as const;
export const hrmExitDetailQueryKey = (id?: number) => ["hrm", "exit", id] as const;

export function useHrmAssets(params?: { status?: string; category?: string; search?: string }, options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmAssetsQueryKey(params),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    queryFn: () => {
      const qs = params
        ? `?${new URLSearchParams(
            Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][],
          ).toString()}`
        : "";
      return customFetch<{ assets: HrmAsset[] }>(apiUrl(`/api/hrm/assets${qs}`));
    },
    meta: { errorMessage: "Could not load assets" },
  });
}

export function useHrmAsset(id?: number, options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmAssetQueryKey(id),
    enabled: (options?.enabled ?? true) && id != null,
    queryFn: () => customFetch<{ asset: HrmAsset }>(apiUrl(`/api/hrm/assets/${id}`)),
    meta: { errorMessage: "Could not load asset" },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: Partial<HrmAsset> & { category: string; brand: string }) =>
      customFetch<HrmAsset>(apiUrl("/api/hrm/assets"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "assets"] });
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
    },
    meta: { errorMessage: "Could not create asset" },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<HrmAsset>) =>
      customFetch<HrmAsset>(apiUrl(`/api/hrm/assets/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "assets"] });
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
    },
    meta: { errorMessage: "Could not update asset" },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) => customFetch(apiUrl(`/api/hrm/assets/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "assets"] }),
    meta: { errorMessage: "Could not delete asset" },
  });
}

export function useHrmExitRequests(
  params?: { status?: string; approvalStatus?: string },
  options?: { enabled?: boolean },
) {
  return useHrmQuery({
    queryKey: hrmExitQueryKey(params),
    enabled: options?.enabled ?? true,
    staleTime: QUERY_STALE.list,
    queryFn: () => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.approvalStatus) search.set("approvalStatus", params.approvalStatus);
      const qs = search.toString();
      return customFetch<{ requests: HrmExitRequest[] }>(
        apiUrl(`/api/hrm/exit${qs ? `?${qs}` : ""}`),
      );
    },
    meta: { errorMessage: "Could not load exit requests" },
  });
}

export function useHrmExitRequest(id?: number, options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmExitDetailQueryKey(id),
    enabled: (options?.enabled ?? true) && id != null,
    queryFn: () => customFetch<{ request: HrmExitRequest }>(apiUrl(`/api/hrm/exit/${id}`)),
    meta: { errorMessage: "Could not load exit request" },
  });
}

export function useCreateExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      userId: number;
      reason: string;
      resignationDate: string;
      lastWorkingDay?: string;
      noticePeriodDays?: number;
      notes?: string;
    }) =>
      customFetch<HrmExitRequest>(apiUrl("/api/hrm/exit"), { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
    },
    meta: { errorMessage: "Could not start exit workflow" },
  });
}

export function useUpdateExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}`), {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
    },
    meta: { errorMessage: "Could not update exit request" },
  });
}

export function useApproveExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({
      id,
      lastWorkingDay,
      notes,
    }: {
      id: number;
      lastWorkingDay?: string;
      notes?: string;
    }) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}/approve`), {
        method: "POST",
        body: JSON.stringify({ lastWorkingDay, notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
    },
    meta: { errorMessage: "Could not approve exit request" },
  });
}

export function useRejectExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: ({ id, rejectionReason }: { id: number; rejectionReason: string }) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}/reject`), {
        method: "POST",
        body: JSON.stringify({ rejectionReason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
    },
    meta: { errorMessage: "Could not reject exit request" },
  });
}

export function useAdvanceExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}/advance`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: hrmEmployeesQueryKey() });
    },
    meta: { errorMessage: "Could not advance exit stage" },
  });
}

export function useReturnExitAssets() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}/return-assets`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "exit"] });
      qc.invalidateQueries({ queryKey: ["hrm", "assets"] });
    },
    meta: { errorMessage: "Could not mark assets returned" },
  });
}

export function useCancelExitRequest() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<HrmExitRequest>(apiUrl(`/api/hrm/exit/${id}/cancel`), { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hrm", "exit"] }),
    meta: { errorMessage: "Could not cancel exit request" },
  });
}

export const hrmLettersQueryKey = (search?: string) => ["hrm", "letters", search ?? ""] as const;
export const hrmLetterDetailQueryKey = (id?: number) => ["hrm", "letters", "detail", id] as const;

export function useHrmExperienceLetters(search?: string) {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  const qs = params.toString();
  return useHrmQuery({
    queryKey: hrmLettersQueryKey(search),
    queryFn: () =>
      customFetch<{ letters: HrmExperienceLetter[] }>(
        apiUrl(`/api/hrm/letters${qs ? `?${qs}` : ""}`),
      ),
    meta: { errorMessage: "Could not load experience letters" },
  });
}

export function useHrmExperienceLetter(id?: number, options?: { enabled?: boolean }) {
  return useHrmQuery({
    queryKey: hrmLetterDetailQueryKey(id),
    enabled: (options?.enabled ?? true) && id != null && id > 0,
    queryFn: () => customFetch<HrmExperienceLetter>(apiUrl(`/api/hrm/letters/${id}`)),
    meta: { errorMessage: "Could not load letter" },
  });
}

export function usePreviewExperienceLetter() {
  return useHrmMutation({
    mutationFn: (body: {
      userId: number;
      relievingDate: string;
      joiningDate?: string;
      offeredCtc?: number;
      letterType: "experience" | "relieving" | "offer";
      additionalNotes?: string;
    }) =>
      customFetch<{
        htmlContent: string;
        employee: {
          userId: number;
          name: string;
          employeeCode: string;
          email: string;
          designation: string;
          departmentName: string;
          joiningDate: string | null;
        };
        relievingDate: string;
        letterType: string;
        offeredCtc?: number | null;
      }>(apiUrl("/api/hrm/letters/preview"), { method: "POST", body: JSON.stringify(body) }),
    meta: { errorMessage: "Could not preview letter" },
  });
}

export function useCreateExperienceLetter() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (body: {
      userId: number;
      relievingDate: string;
      joiningDate?: string;
      offeredCtc?: number;
      letterType: "experience" | "relieving" | "offer";
      additionalNotes?: string;
    }) =>
      customFetch<HrmExperienceLetter>(apiUrl("/api/hrm/letters"), {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "letters"] });
    },
    meta: { errorMessage: "Could not generate letter" },
  });
}

export function useSendExperienceLetter() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<{
        message: string;
        emailSent: boolean;
        emailConfigured: boolean;
        email: string;
      }>(apiUrl(`/api/hrm/letters/${id}/send`), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "letters"] });
    },
    meta: { errorMessage: "Could not email letter" },
  });
}

export function useDeleteExperienceLetter() {
  const qc = useQueryClient();
  return useHrmMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(apiUrl(`/api/hrm/letters/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hrm", "letters"] });
    },
    meta: { errorMessage: "Could not delete letter" },
  });
}

export async function downloadExperienceLetterPdf(id: number, fileName: string) {
  const blob = await customFetch<Blob>(apiUrl(`/api/hrm/letters/${id}/pdf`), {
    responseType: "blob",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
