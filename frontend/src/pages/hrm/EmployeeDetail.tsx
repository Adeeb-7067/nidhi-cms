import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  User,
  UserCheck,
  CalendarClock,
  Briefcase,
  FileText,
  Wallet,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalContentCard, PortalTablePanel } from "@/components/layout/portal-page-kit";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageShell,
  HrmInlineEmptyState,
  HrmTabsList,
  HrmTabsTrigger,
  HrmField,
  HrmAttendanceBadge,
  HrmWorkflowBadge,
  hrmActionButtonClass,
  HrmChartCard,
} from "@/modules/hrm/components";
import {
  EmployeeDetailToolbar,
  EmployeeProfileHero,
  EmployeePaidLeaveCard,
  EmployeeTodayStatusCards,
  EmployeeDailyHoursChart,
  EmployeeAttendanceDonut,
  EmployeeSalaryBar,
  EmployeeInfoGrid,
  EmployeeRecentLeaveList,
  EmployeeRecentAttendanceList,
  EmployeeOverviewStats,
  todayAttendanceRow,
} from "@/modules/hrm/employee-detail-sections";
import { EmployeeDocumentsPanel } from "@/modules/hrm/EmployeeDocumentsPanel";
import {
  hrmEmployeeQueryKey,
  useHrmEmployee,
  useHrmEmployees,
  useHrmDepartments,
  usePatchUserHrmProfile,
  useHrmShiftTemplates,
  useHrmAttendanceDaily,
  useHrmLeaveBalances,
  useHrmLeaveRequests,
  useSendEmployeeCredentials,
} from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { buildLeaveBalanceColumns } from "@/modules/hrm/hrm-table-columns";
import type { HrmAttendanceSummary, HrmLeaveRequest } from "@/modules/hrm/types";
import { formatCurrency } from "@/modules/finance/constants";
import { isAdminTeamEmployeeDetail, parseEmployeeDetailId } from "@/lib/employee-routes";

export default function HrmEmployeeDetailPage() {
  const [location] = useLocation();
  const [, adminParams] = useRoute("/admin/employees/:id");
  const [, hrmParams] = useRoute("/hrm/employees/:id");
  const employeeId =
    parseEmployeeDetailId(location) ??
    Number(adminParams?.id ?? hrmParams?.id ?? NaN);
  const fromAdminTeam = isAdminTeamEmployeeDetail(location);
  const backHref = fromAdminTeam ? "/admin/employees" : "/hrm/employees";
  const backLabel = fromAdminTeam ? "Back to team" : "Back to employees";

  const canEdit = useHrmPermission("employees", "edit");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useHrmEmployee(employeeId);
  const employee = data?.employee?.id === employeeId ? data.employee : undefined;
  const overview = data?.employee?.id === employeeId ? data.overview : undefined;

  useEffect(() => {
    setActiveTab("overview");
  }, [employeeId]);

  const fileTabActive = activeTab === "file";

  const { data: deptData } = useHrmDepartments({ enabled: fileTabActive });
  const { data: shiftData } = useHrmShiftTemplates({ enabled: fileTabActive });
  const { data: staffData } = useHrmEmployees({ status: "active", limit: 200 }, { enabled: fileTabActive });
  const patchProfile = usePatchUserHrmProfile();
  const sendCredentials = useSendEmployeeCredentials();

  const [departmentId, setDepartmentId] = useState<string>("");
  const [managerId, setManagerId] = useState<string>("");
  const [teamleaderId, setTeamleaderId] = useState<string>("none");
  const [shiftId, setShiftId] = useState<string>("none");
  const [wfhLimit, setWfhLimit] = useState("");
  const [accrualDays, setAccrualDays] = useState("");
  const [employeeType, setEmployeeType] = useState("FULL-TIME");
  const [hrStatus, setHrStatus] = useState("Active");
  const [position, setPosition] = useState("EMPLOYEE");
  const [bio, setBio] = useState("");
  const [lateChargePct, setLateChargePct] = useState("100");

  const monthRange = overview?.month;
  const attendanceTabActive = activeTab === "attendance";
  const leaveTabActive = activeTab === "leave";

  const { data: attendanceData, isLoading: attendanceLoading } = useHrmAttendanceDaily(
    monthRange?.startDate ?? format(new Date(), "yyyy-MM-01"),
    monthRange?.endDate ?? format(new Date(), "yyyy-MM-dd"),
    employeeId,
    undefined,
    { enabled: attendanceTabActive && !!employeeId },
  );
  const { data: balancesData } = useHrmLeaveBalances(employeeId, overview?.month.year, {
    enabled: leaveTabActive && !!employeeId,
  });
  const { data: leaveReqData } = useHrmLeaveRequests(
    { userId: employeeId },
    { enabled: leaveTabActive && !!employeeId },
  );

  const managerOptions = (staffData?.employees ?? []).filter((u) => u.id !== employeeId);

  useEffect(() => {
    if (!employee) return;
    setDepartmentId(employee.departmentId != null ? String(employee.departmentId) : "");
    setManagerId(employee.reportingManagerId != null ? String(employee.reportingManagerId) : "none");
    setTeamleaderId(employee.teamleaderId != null ? String(employee.teamleaderId) : "none");
    setShiftId(employee.shiftId != null ? String(employee.shiftId) : "none");
    setWfhLimit(employee.wfhMonthlyLimit != null ? String(employee.wfhMonthlyLimit) : "4");
    setAccrualDays(
      employee.leaveAccrualDaysPerMonth != null ? String(employee.leaveAccrualDaysPerMonth) : "",
    );
    setEmployeeType(employee.employeeType ?? "FULL-TIME");
    setHrStatus(employee.hrEmploymentStatus ?? "Active");
    setPosition(employee.position ?? "EMPLOYEE");
    setBio(employee.bio ?? "");
    setLateChargePct(String(employee.lateChargePercentage ?? 100));
  }, [employee]);

  const attendanceRows = useMemo(() => {
    const source =
      attendanceTabActive && attendanceData?.summaries
        ? attendanceData.summaries
        : (data?.attendanceSummaries ?? []);
    return source.filter((s) => s.userId === employeeId);
  }, [attendanceTabActive, attendanceData?.summaries, data?.attendanceSummaries, employeeId]);

  const leaveRows = leaveTabActive
    ? (leaveReqData?.requests ?? [])
    : (data?.leaveRequests ?? []);
  const balanceRows = leaveTabActive
    ? (balancesData?.balances ?? [])
    : (data?.leaveBalances ?? []);
  const todayRow = useMemo(() => todayAttendanceRow(attendanceRows), [attendanceRows]);

  const attendanceColumns = useMemo((): Column<HrmAttendanceSummary>[] => [
    {
      id: "date",
      header: "Date",
      cell: (r) => format(new Date(`${r.date}T12:00:00`), "EEE, MMM d"),
      exportValue: (r) => r.date,
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <HrmAttendanceBadge status={r.status} suffix={r.missingClockOut ? " · no clock-out" : ""} />
      ),
      exportValue: (r) => r.status,
    },
    {
      id: "active",
      header: "Active",
      cell: (r) => `${Math.round((r.activeMinutes / 60) * 10) / 10}h`,
    },
    {
      id: "expected",
      header: "Expected",
      cell: (r) => `${Math.round((r.expectedMinutes / 60) * 10) / 10}h`,
    },
    {
      id: "variance",
      header: "Variance",
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.varianceMinutes ?? 0}m</span>,
      exportValue: (r) => String(r.varianceMinutes ?? 0),
    },
  ], []);

  const balanceColumns = useMemo(() => buildLeaveBalanceColumns(), []);

  const leaveRequestColumns = useMemo((): Column<HrmLeaveRequest>[] => [
    {
      id: "dates",
      header: "Dates",
      cell: (r) => (
        <>
          {r.startDate}
          {r.endDate !== r.startDate ? ` – ${r.endDate}` : ""}
        </>
      ),
      exportValue: (r) =>
        r.endDate !== r.startDate ? `${r.startDate} – ${r.endDate}` : r.startDate,
    },
    {
      id: "type",
      header: "Type",
      cell: (r) => r.leaveTypeName ?? r.leaveType?.name ?? "—",
      exportValue: (r) => r.leaveTypeName ?? r.leaveType?.name ?? "",
    },
    { id: "days", header: "Days", cell: (r) => r.days ?? "—", exportValue: (r) => String(r.days ?? "") },
    {
      id: "status",
      header: "Status",
      cell: (r) => <HrmWorkflowBadge status={r.status} />,
      exportValue: (r) => r.status,
    },
  ], []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: hrmEmployeeQueryKey(employeeId) });
      toast.success("Employee profile refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!employee) return;
    try {
      const result = await sendCredentials.mutateAsync({ userId: employee.id, resend: true });
      if (result.emailSent) {
        toast.success(result.message);
      } else if (result.temporaryPassword) {
        toast.success(
          `${result.message} Employee ID: ${result.loginEmployeeId} · Password: ${result.temporaryPassword}`,
          { duration: 12000 },
        );
      } else {
        toast.success(result.message);
      }
    } catch {
      // Error toast handled by mutation hook
    }
  };

  const saveProfile = async () => {
    if (!employee) return;
    try {
      await patchProfile.mutateAsync({
        userId: employee.id,
        departmentId: departmentId ? Number(departmentId) : null,
        reportingManagerId: managerId === "none" ? null : Number(managerId),
        teamleaderId: teamleaderId === "none" ? null : Number(teamleaderId),
        shiftId: shiftId === "none" ? null : Number(shiftId),
        wfhMonthlyLimit: wfhLimit ? Number(wfhLimit) : undefined,
        leaveAccrualDaysPerMonth: accrualDays === "" ? null : Number(accrualDays),
        employeeType,
        hrEmploymentStatus: hrStatus,
        position,
        bio,
        lateChargePercentage: lateChargePct ? Number(lateChargePct) : 100,
      });
      toast.success("Employee profile updated");
    } catch {
      // Error toast handled by usePatchUserHrmProfile
    }
  };

  if (isError) {
    return (
      <HrmGate module="employees">
        <HrmPageShell>
          <HrmInlineEmptyState
            icon={User}
            title="Could not load employee"
            description={getApiErrorMessage(error, "This employee may not exist or the request failed.")}
          />
        </HrmPageShell>
      </HrmGate>
    );
  }

  if (!employeeId || Number.isNaN(employeeId)) {
    return (
      <HrmPageShell>
        <p className="text-muted-foreground">Invalid employee.</p>
      </HrmPageShell>
    );
  }

  if (isLoading || (isFetching && !employee)) {
    return (
      <HrmGate module="employees">
        <HrmPageShell className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </HrmPageShell>
      </HrmGate>
    );
  }

  return (
    <HrmGate module="employees">
      <HrmPageShell>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employee profile</p>
          <EmployeeDetailToolbar
            backHref={backHref}
            backLabel={backLabel}
            onRefresh={() => void handleRefresh()}
            onEdit={() => setActiveTab("file")}
            onSendCredentials={() => void handleSendCredentials()}
            refreshing={refreshing}
            sendingCredentials={sendCredentials.isPending}
            canEdit={canEdit}
          />
        </div>

        {employee ? <EmployeeProfileHero employee={employee} /> : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <HrmTabsList>
            <HrmTabsTrigger value="overview">Overview</HrmTabsTrigger>
            <HrmTabsTrigger value="file">Employee file</HrmTabsTrigger>
            <HrmTabsTrigger value="attendance">Attendance</HrmTabsTrigger>
            <HrmTabsTrigger value="leave">Leaves</HrmTabsTrigger>
            <HrmTabsTrigger value="payroll">Payroll</HrmTabsTrigger>
          </HrmTabsList>

          <TabsContent value="overview" className="space-y-4 mt-0">
            {overview && employee ? (
              <>
                <div className="grid gap-3 lg:grid-cols-6">
                  <div className="lg:col-span-2">
                    <EmployeePaidLeaveCard
                      balances={balanceRows}
                      overviewBalances={overview.leaveBalances}
                      monthlyQuota={
                        employee.leaveAccrualDaysPerMonth ??
                        employee.monthlyLeaveQuota ??
                        null
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-3">
                    <EmployeeOverviewStats
                      overview={overview}
                      attendanceRows={attendanceRows}
                      employee={employee}
                    />
                  </div>
                </div>

                <EmployeeTodayStatusCards todayRow={todayRow} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <EmployeeDailyHoursChart rows={attendanceRows} />
                  <EmployeeAttendanceDonut rows={attendanceRows} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <EmployeeRecentLeaveList rows={leaveRows} />
                  <EmployeeSalaryBar gross={overview.salaryGross} net={overview.salaryNet} />
                  <div className="hidden lg:block" />
                </div>

                <EmployeeInfoGrid employee={employee} overview={overview} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <EmployeeRecentAttendanceList rows={attendanceRows} />
                  <HrmChartCard title="Quick snapshot" description="This month at a glance">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Present", value: overview.attendance.present, icon: UserCheck, color: "text-emerald-600" },
                        { label: "Absent", value: overview.attendance.absent, icon: User, color: "text-rose-600" },
                        { label: "On leave", value: overview.attendance.onLeave, icon: CalendarClock, color: "text-amber-600" },
                        { label: "WFH", value: overview.attendance.wfh, icon: Briefcase, color: "text-blue-600" },
                        { label: "Documents", value: overview.documentCount, icon: FileText, color: "text-violet-600" },
                        {
                          label: "Net pay",
                          value: overview.latestPayrollNet != null ? formatCurrency(overview.latestPayrollNet) : "—",
                          icon: Wallet,
                          color: "text-emerald-600",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                        >
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                          <p className={`mt-0.5 text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </HrmChartCard>
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="file" className="mt-0 space-y-4">
            {employee ? (
              <>
                <EmployeeInfoGrid employee={employee} overview={overview!} />
                <HrmChartCard
                  title="HRM settings"
                  description="Org assignment and policy overrides for this employee"
                  headerExtra={
                    canEdit ? (
                      <Button
                        size="sm"
                        className={hrmActionButtonClass()}
                        onClick={() => void saveProfile()}
                        disabled={patchProfile.isPending}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Save changes
                      </Button>
                    ) : null
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
                    <HrmField label="Department">
                      <Select
                        value={departmentId || "none"}
                        onValueChange={(v) => setDepartmentId(v === "none" ? "" : v)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {(deptData?.departments ?? []).map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="Reporting manager">
                      <Select value={managerId} onValueChange={setManagerId} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managerOptions.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="Team leader">
                      <Select value={teamleaderId} onValueChange={setTeamleaderId} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Team leader" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managerOptions.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="Shift template">
                      <Select value={shiftId} onValueChange={setShiftId} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue placeholder="Default shift" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Company default</SelectItem>
                          {(shiftData?.templates ?? []).map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="Employment type">
                      <Select value={employeeType} onValueChange={setEmployeeType} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["FULL-TIME", "PART-TIME", "INTERN"].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="HR status">
                      <Select value={hrStatus} onValueChange={setHrStatus} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Active", "Inactive", "Resigned", "Terminated"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="Position">
                      <Select value={position} onValueChange={setPosition} disabled={!canEdit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["HR", "MANAGER", "TEAM_LEADER", "EMPLOYEE", "ADMIN"].map((p) => (
                            <SelectItem key={p} value={p}>
                              {p.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrmField>
                    <HrmField label="WFH monthly limit">
                      <Input
                        type="number"
                        min={0}
                        value={wfhLimit}
                        onChange={(e) => setWfhLimit(e.target.value)}
                        disabled={!canEdit}
                      />
                    </HrmField>
                    <HrmField label="Leave accrual / month" hint="Blank = company default">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={accrualDays}
                        onChange={(e) => setAccrualDays(e.target.value)}
                        disabled={!canEdit}
                        placeholder="Default"
                      />
                    </HrmField>
                    <HrmField label="Late charge %">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={lateChargePct}
                        onChange={(e) => setLateChargePct(e.target.value)}
                        disabled={!canEdit}
                      />
                    </HrmField>
                    <div className="sm:col-span-2">
                      <HrmField label="Bio">
                        <Input value={bio} onChange={(e) => setBio(e.target.value)} disabled={!canEdit} />
                      </HrmField>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    For name, email, phone, and joining date, use{" "}
                    <a href="/admin/employees" className="text-primary underline-offset-2 hover:underline">
                      Manage → Team
                    </a>
                    .
                  </p>
                </HrmChartCard>
                <EmployeeDocumentsPanel
                  userId={employee.id}
                  canUpload={canEdit}
                  canDelete={canEdit}
                  fetchEnabled={fileTabActive}
                />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="attendance" className="mt-0 space-y-4">
            <PortalTablePanel isLoading={attendanceLoading}>
              <AdvancedTable
                data={attendanceRows}
                columns={attendanceColumns}
                filename="EmployeeAttendanceExport"
                viewStorageKey={`hrm-employee-${employeeId}-attendance`}
              />
            </PortalTablePanel>
          </TabsContent>

          <TabsContent value="leave" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <PortalTablePanel>
                <AdvancedTable
                  data={balanceRows}
                  columns={balanceColumns}
                  filename="EmployeeLeaveBalancesExport"
                  viewStorageKey={`hrm-employee-${employeeId}-balances`}
                />
              </PortalTablePanel>
              <EmployeeRecentLeaveList rows={leaveRows} />
            </div>
            <PortalTablePanel>
              <AdvancedTable
                data={leaveRows}
                columns={leaveRequestColumns}
                filename="EmployeeLeaveRequestsExport"
                viewStorageKey={`hrm-employee-${employeeId}-leave`}
              />
            </PortalTablePanel>
          </TabsContent>

          <TabsContent value="payroll" className="mt-0 space-y-4">
            {overview ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Gross (structure)", value: overview.salaryGross },
                    { label: "Net (structure)", value: overview.salaryNet },
                    { label: "Latest payroll net", value: overview.latestPayrollNet },
                  ].map((item) => (
                    <HrmChartCard key={item.label} title={item.label}>
                      <p className="text-2xl font-bold tabular-nums">
                        {item.value != null ? formatCurrency(item.value) : "—"}
                      </p>
                    </HrmChartCard>
                  ))}
                </div>
                <EmployeeSalaryBar gross={overview.salaryGross} net={overview.salaryNet} />
              </>
            ) : (
              <PortalContentCard>
                <p className="text-sm text-muted-foreground">No salary data on file.</p>
              </PortalContentCard>
            )}
          </TabsContent>
        </Tabs>
      </HrmPageShell>
    </HrmGate>
  );
}
