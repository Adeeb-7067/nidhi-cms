import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { AlertTriangle, ClipboardEdit, Grid3X3, UserCheck, UserX, CalendarClock, Home, ClipboardList, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListUsers, getListUsersQueryKey } from "@/api/generated/api";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmTabsList,
  HrmTabsTrigger,
  HrmFilterBar,
  HrmField,
  HrmAttendanceBadge,
  HrmWorkflowBadge,
  HrmApprovalActions,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import type { HrmAttendanceCorrection, HrmAttendanceSummary } from "@/modules/hrm/types";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import {
  useApplyAttendanceCorrection,
  useHrmAttendanceCorrections,
  useHrmAttendanceDaily,
  useHrmAttendanceVariance,
  useHrmDepartments,
  useReviewAttendanceCorrection,
  useExcuseLateArrival,
  useAdminOverrideAttendance,
} from "@/api/hrm";
import { ATTENDANCE_STATUS_LABELS, PRIMARY_ATTENDANCE_STATUSES, isPresentLikeStatus, normalizeAttendanceStatus } from "@/modules/hrm/constants";
import {
  LEGACY_ATTENDANCE_STATUS_OPTIONS,
  LEGACY_CORRECTION_LABELS,
} from "@/modules/hrm/hrm-legacy-labels";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "sonner";

type AttendanceRow = HrmAttendanceSummary;

const CLOCKABLE_ROLES = new Set(["manager", "developer", "tester", "qa", "freelancer"]);

export default function HrmAttendancePage() {
  const { user } = useAuth();
  const canAdmin = useHrmPermission("attendance", "view");
  const canApprove = useHrmPermission("attendance", "approve");
  const canManage = useHrmPermission("attendance", "edit") || canApprove;
  const [periodMode, setPeriodMode] = useState<"today" | "month">("today");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionRequestType, setCorrectionRequestType] = useState<
    keyof typeof LEGACY_CORRECTION_LABELS.types
  >("full_day");
  const [correctionStatus, setCorrectionStatus] = useState("present");
  const [correctionMinutes, setCorrectionMinutes] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustRow, setAdjustRow] = useState<AttendanceRow | null>(null);
  const [adjustStatus, setAdjustStatus] = useState("present");
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuseRow, setExcuseRow] = useState<AttendanceRow | null>(null);
  const [excuseNote, setExcuseNote] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const startDate =
    canAdmin && periodMode === "today"
      ? todayStr
      : format(startOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
  const endDate =
    canAdmin && periodMode === "today"
      ? todayStr
      : format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
  const deptNum = departmentId !== "all" ? Number(departmentId) : undefined;
  const selfOnly = !canAdmin;
  const filterUserId =
    selfOnly
      ? user?.id
      : employeeId !== "all"
        ? Number(employeeId)
        : undefined;

  const staffParams = { staff: "true" as const, limit: 200 };
  const { data: staffData } = useListUsers(staffParams, {
    query: {
      queryKey: getListUsersQueryKey(staffParams),
      enabled: canAdmin,
    },
  });
  const employeeOptions = useMemo(
    () =>
      (staffData?.users ?? [])
        .filter((u) => u.status === "active" && CLOCKABLE_ROLES.has(u.role))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffData?.users],
  );

  const { data, isLoading } = useHrmAttendanceDaily(
    startDate,
    endDate,
    filterUserId,
    canAdmin ? deptNum : undefined,
  );
  const { data: varianceData, isLoading: varianceLoading } = useHrmAttendanceVariance(
    startDate,
    endDate,
    filterUserId,
  );
  const { data: correctionsData } = useHrmAttendanceCorrections(selfOnly ? user?.id : filterUserId);
  const { data: departmentsData } = useHrmDepartments();
  const applyCorrection = useApplyAttendanceCorrection();
  const reviewCorrection = useReviewAttendanceCorrection();
  const excuseLate = useExcuseLateArrival();
  const adminOverride = useAdminOverrideAttendance();

  const rows = useMemo(() => {
    let list = data?.summaries ?? [];
    if (statusFilter !== "all") {
      list = list.filter((r) => normalizeAttendanceStatus(r.status) === statusFilter);
    }
    if (canAdmin) {
      list = [...list].sort((a, b) => {
        const byName = (a.userName ?? "").localeCompare(b.userName ?? "");
        return byName !== 0 ? byName : a.date.localeCompare(b.date);
      });
    }
    return list;
  }, [data, statusFilter, canAdmin]);

  const varianceRows = useMemo(
    () => (varianceData?.rows ?? []).filter((r) => r.flagged),
    [varianceData],
  );

  const pendingCorrections = useMemo(
    () => (correctionsData?.corrections ?? []).filter((c) => c.status === "pending"),
    [correctionsData],
  );

  const lateExcuseRows = useMemo(
    () =>
      rows.filter(
        (r) => normalizeAttendanceStatus(r.status) === "onsite" && !r.forgivenLate,
      ),
    [rows],
  );

  const correctionRows = correctionsData?.corrections ?? [];

  const kpiItems = useMemo(() => {
    const list = data?.summaries ?? [];
    const present = list.filter((r) => isPresentLikeStatus(r.status)).length;
    const absent = list.filter((r) => r.status === "absent").length;
    const onLeave = list.filter((r) => r.status === "on_leave").length;
    const wfh = list.filter((r) => r.status === "wfh").length;
    return [
      { label: canAdmin ? "Present / onsite / WFH" : "Present days", value: present, hint: canAdmin ? "Today’s attendance" : "This period", icon: UserCheck, accent: "green" as const },
      { label: "Absent", value: absent, hint: "Marked absent", icon: UserX, accent: "blue" as const, alert: absent > 0 },
      { label: "On leave", value: onLeave, hint: "Approved leave", icon: CalendarClock, accent: "violet" as const },
      {
        label: canAdmin ? "Pending corrections" : "WFH days",
        value: canAdmin ? pendingCorrections.length : wfh,
        hint: canAdmin ? "Needs review" : "Remote work days",
        icon: canAdmin ? ClipboardList : Home,
        accent: "amber" as const,
        alert: canAdmin ? pendingCorrections.length > 0 : false,
      },
    ];
  }, [data?.summaries, canAdmin, pendingCorrections.length]);

  const showCorrectionStatus = correctionRequestType === "full_day" || correctionRequestType === "wrong_time";
  const showCorrectionMinutes =
    correctionRequestType === "wrong_time" ||
    correctionRequestType === "missed_clock_in" ||
    correctionRequestType === "missed_clock_out";

  const handleSubmitCorrection = async () => {
    if (!correctionDate || !correctionReason.trim()) {
      toast.error("Date and reason are required");
      return;
    }
    const requestedStatus =
      correctionRequestType === "missed_clock_in" || correctionRequestType === "missed_clock_out"
        ? "present"
        : correctionStatus;
    const minutesRaw = correctionMinutes.trim();
    const requestedActiveMinutes =
      showCorrectionMinutes && minutesRaw ? Number(minutesRaw) : undefined;
    if (showCorrectionMinutes && minutesRaw && !Number.isFinite(requestedActiveMinutes)) {
      toast.error("Enter valid active minutes");
      return;
    }
    try {
      await applyCorrection.mutateAsync({
        date: correctionDate,
        reason: correctionReason.trim(),
        requestedStatus,
        requestedActiveMinutes,
      });
      toast.success("Correction request submitted");
      setCorrectionOpen(false);
      setCorrectionReason("");
      setCorrectionMinutes("");
    } catch {
      // Error toast handled by useApplyAttendanceCorrection
    }
  };

  const formatCorrectionRequested = (c: { requestedStatus?: string | null; requestedActiveMinutes?: number | null }) => {
    const status = c.requestedStatus ? ATTENDANCE_STATUS_LABELS[c.requestedStatus] ?? c.requestedStatus : "—";
    if (c.requestedActiveMinutes != null) {
      return `${status} (${c.requestedActiveMinutes} min)`;
    }
    return status;
  };

  const openAdjustDialog = (row: AttendanceRow) => {
    setAdjustRow(row);
    setAdjustStatus(normalizeAttendanceStatus(row.status));
    setAdjustHours(String(Math.round((row.activeMinutes / 60) * 10) / 10));
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const openExcuseDialog = (row: AttendanceRow) => {
    setExcuseRow(row);
    setExcuseNote("");
    setExcuseOpen(true);
  };

  const attendanceStatusSuffix = (r: AttendanceRow) =>
    (r.forgivenLate ? " (excused)" : "") +
    (r.corrected ? " · corrected" : "") +
    (r.missingClockOut ? " · no clock-out" : "") +
    (r.globalWfh ? " · global WFH" : "") +
    (r.source === "admin_override" ? " · manual" : "");

  const gridColumns = useMemo((): Column<AttendanceRow>[] => {
    const cols: Column<AttendanceRow>[] = [];
    if (canAdmin) {
      cols.push({
        id: "employee",
        header: "Employee",
        accessorKey: "userName",
        cell: (r) => <span className="font-medium">{r.userName}</span>,
      });
    }
    cols.push(
      {
        id: "date",
        header: "Date",
        accessorKey: "date",
        cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: (r) => <HrmAttendanceBadge status={r.status} suffix={attendanceStatusSuffix(r)} />,
        exportValue: (r) => `${r.status}${attendanceStatusSuffix(r)}`,
      },
      {
        id: "active",
        header: "Active",
        cell: (r) => `${Math.round((r.activeMinutes / 60) * 10) / 10}h`,
        exportValue: (r) => String(Math.round((r.activeMinutes / 60) * 10) / 10),
      },
      {
        id: "expected",
        header: "Expected",
        cell: (r) => `${Math.round((r.expectedMinutes / 60) * 10) / 10}h`,
        exportValue: (r) => String(Math.round((r.expectedMinutes / 60) * 10) / 10),
      },
      { id: "sessions", header: "Sessions", accessorKey: "sessionCount" },
    );
    if (canManage) {
      cols.push({
        id: "actions",
        header: "Actions",
        className: "text-right",
        cell: (r) => {
          const isLateOnsite = normalizeAttendanceStatus(r.status) === "onsite" && !r.forgivenLate;
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isLateOnsite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={excuseLate.isPending}
                  onClick={() => openExcuseDialog(r)}
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Excuse
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={adminOverride.isPending}
                onClick={() => openAdjustDialog(r)}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Adjust
              </Button>
            </div>
          );
        },
      });
    }
    return cols;
  }, [canAdmin, canManage, excuseLate.isPending, adminOverride.isPending]);

  type VarianceRow = {
    userId: number;
    userName?: string;
    date: string;
    clockHours: number;
    loggedHours: number;
    varianceHours: number;
    variancePct: number;
  };

  const varianceColumns = useMemo((): Column<VarianceRow>[] => {
    const cols: Column<VarianceRow>[] = [];
    if (canAdmin) {
      cols.push({
        id: "employee",
        header: "Employee",
        cell: (r) => <span className="font-medium">{r.userName}</span>,
        exportValue: (r) => r.userName ?? String(r.userId),
      });
    }
    cols.push(
      {
        id: "date",
        header: "Date",
        cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
      },
      { id: "clock", header: "Clock", cell: (r) => `${r.clockHours}h` },
      { id: "logged", header: "Logged", cell: (r) => `${r.loggedHours}h` },
      {
        id: "variance",
        header: "Variance",
        cell: (r) => (
          <span className="font-medium text-amber-700">
            {r.varianceHours}h ({r.variancePct}%)
          </span>
        ),
        exportValue: (r) => `${r.varianceHours}h (${r.variancePct}%)`,
      },
    );
    return cols;
  }, [canAdmin]);

  const correctionColumns = useMemo((): Column<HrmAttendanceCorrection>[] => {
    const cols: Column<HrmAttendanceCorrection>[] = [];
    if (canAdmin) {
      cols.push({
        id: "employee",
        header: "Employee",
        cell: (c) => String(c.userId),
        exportValue: (c) => String(c.userId),
      });
    }
    cols.push(
      {
        id: "date",
        header: "Date",
        cell: (c) => <span className="text-muted-foreground">{c.date}</span>,
      },
      {
        id: "requested",
        header: "Requested",
        cell: (c) => formatCorrectionRequested(c),
      },
      {
        id: "reason",
        header: "Reason",
        cell: (c) => <span className="max-w-xs truncate text-muted-foreground">{c.reason}</span>,
        exportValue: (c) => c.reason ?? "",
      },
      {
        id: "status",
        header: "Status",
        cell: (c) => <HrmWorkflowBadge status={c.status} />,
        exportValue: (c) => c.status,
      },
    );
    if (canApprove) {
      cols.push({
        id: "actions",
        header: "Actions",
        className: "text-right",
        cell: (c) =>
          c.status === "pending" ? (
            <HrmApprovalActions
              disabled={reviewCorrection.isPending}
              onApprove={() =>
                reviewCorrection.mutate(
                  { id: c.id, status: "approved" },
                  { onSuccess: () => toast.success("Correction approved") },
                )
              }
              onReject={() =>
                reviewCorrection.mutate(
                  { id: c.id, status: "rejected" },
                  { onSuccess: () => toast.success("Correction rejected") },
                )
              }
            />
          ) : null,
      });
    }
    return cols;
  }, [canAdmin, canApprove, reviewCorrection]);

  const lateExcuseColumns = useMemo((): Column<AttendanceRow>[] => [
    {
      id: "employee",
      header: "Employee",
      cell: (r) => <span className="font-medium">{r.userName}</span>,
      exportValue: (r) => r.userName,
    },
    {
      id: "date",
      header: "Date",
      cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
    },
    {
      id: "active",
      header: "Active",
      cell: (r) => `${Math.round((r.activeMinutes / 60) * 10) / 10}h`,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <Button
          size="sm"
          className={portalActionButtonClass()}
          disabled={excuseLate.isPending}
          onClick={() => openExcuseDialog(r)}
        >
          Excuse late
        </Button>
      ),
    },
  ], [excuseLate.isPending]);

  const handleAdminAdjust = async () => {
    if (!adjustRow || !adjustReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const hours = adjustHours.trim() ? Number(adjustHours) : undefined;
    const activeMinutes =
      hours != null && Number.isFinite(hours) ? Math.round(hours * 60) : undefined;
    try {
      await adminOverride.mutateAsync({
        userId: adjustRow.userId,
        date: adjustRow.date,
        status: adjustStatus,
        activeMinutes,
        reason: adjustReason.trim(),
      });
      toast.success("Attendance updated");
      setAdjustOpen(false);
      setAdjustRow(null);
    } catch {
      // Error toast handled by mutation hook
    }
  };

  const handleExcuseLate = async () => {
    if (!excuseRow) return;
    try {
      await excuseLate.mutateAsync({
        userId: excuseRow.userId,
        date: excuseRow.date,
        note: excuseNote.trim() || undefined,
      });
      toast.success("Late arrival excused");
      setExcuseOpen(false);
      setExcuseRow(null);
    } catch {
      // Error toast handled by mutation hook
    }
  };

  return (
    <HrmGate module={canAdmin ? "attendance" : "my_attendance"}>
      <HrmPageShell>
        <HrmPageHero
          title="Attendance"
          description={
            canAdmin
              ? "Today’s attendance for all employees — filter by person, department, status, or month"
              : "Your attendance from work sessions, shifts, leave, WFH, and holidays"
          }
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Attendance" }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")} onClick={() => setCorrectionOpen(true)}>
                Request correction
              </Button>
              {canAdmin && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/attendance">Live sessions</Link>
                </Button>
              )}
            </div>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <HrmFilterBar>
          {canAdmin && (
            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as "today" | "month")}>
              <SelectTrigger className="h-9 w-36 bg-background">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="month">Full month</SelectItem>
              </SelectContent>
            </Select>
          )}
          {(!canAdmin || periodMode === "month") && (
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 min-w-[12rem] w-48 shrink-0 bg-background"
            />
          )}
          {canAdmin && (
            <>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 w-48 bg-background">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employeeOptions.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                      {u.employeeId ? ` (${u.employeeId})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 w-44 bg-background">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {(departmentsData?.departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-40 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PRIMARY_ATTENDANCE_STATUSES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ATTENDANCE_STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </HrmFilterBar>

        <Tabs defaultValue="grid" className="space-y-4">
          <HrmTabsList>
            <HrmTabsTrigger value="grid">Daily grid</HrmTabsTrigger>
            <HrmTabsTrigger value="variance">
              Clock vs logs
              {varianceRows.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {varianceRows.length}
                </Badge>
              )}
            </HrmTabsTrigger>
            <HrmTabsTrigger value="corrections">
              Corrections
              {pendingCorrections.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {pendingCorrections.length}
                </Badge>
              )}
            </HrmTabsTrigger>
            {canManage && (
              <HrmTabsTrigger value="late-excuses">
                Late excuses
                {lateExcuseRows.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {lateExcuseRows.length}
                  </Badge>
                )}
              </HrmTabsTrigger>
            )}
          </HrmTabsList>

          <TabsContent value="grid" className="space-y-4 m-0">
            <PortalTablePanel isLoading={isLoading}>
              <AdvancedTable
                data={rows}
                columns={gridColumns}
                searchKey={canAdmin ? "userName" : undefined}
                searchPlaceholder="Filter employees…"
                filename="HrmAttendanceGridExport"
                viewStorageKey="hrm-attendance-grid"
              />
            </PortalTablePanel>
          </TabsContent>

          <TabsContent value="variance" className="space-y-4 m-0">
            <PortalTablePanel isLoading={varianceLoading}>
              <AdvancedTable
                data={varianceRows}
                columns={varianceColumns}
                searchKey={canAdmin ? "userName" : undefined}
                filename="HrmAttendanceVarianceExport"
                viewStorageKey="hrm-attendance-variance"
              />
            </PortalTablePanel>
          </TabsContent>

          <TabsContent value="corrections" className="space-y-4 m-0">
            <PortalTablePanel>
              <AdvancedTable
                data={correctionRows}
                columns={correctionColumns}
                filename="HrmAttendanceCorrectionsExport"
                viewStorageKey="hrm-attendance-corrections"
              />
            </PortalTablePanel>
          </TabsContent>

          {canManage && (
            <TabsContent value="late-excuses" className="space-y-4 m-0">
              <PortalTablePanel isLoading={isLoading}>
                <AdvancedTable
                  data={lateExcuseRows}
                  columns={lateExcuseColumns}
                  searchKey="userName"
                  filename="HrmLateExcusesExport"
                  viewStorageKey="hrm-attendance-late-excuses"
                />
              </PortalTablePanel>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{LEGACY_CORRECTION_LABELS.dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label={LEGACY_CORRECTION_LABELS.date}>
                <Input type="date" value={correctionDate} onChange={(e) => setCorrectionDate(e.target.value)} />
              </HrmField>
              <HrmField label={LEGACY_CORRECTION_LABELS.requestType}>
                <Select
                  value={correctionRequestType}
                  onValueChange={(v) => setCorrectionRequestType(v as keyof typeof LEGACY_CORRECTION_LABELS.types)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEGACY_CORRECTION_LABELS.types).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              {showCorrectionStatus && (
                <HrmField label={LEGACY_CORRECTION_LABELS.correctedStatus}>
                  <Select value={correctionStatus} onValueChange={setCorrectionStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGACY_ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
              )}
              {showCorrectionMinutes && (
                <HrmField label={LEGACY_CORRECTION_LABELS.correctedMinutes}>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 480"
                    value={correctionMinutes}
                    onChange={(e) => setCorrectionMinutes(e.target.value)}
                  />
                </HrmField>
              )}
              <HrmField label={LEGACY_CORRECTION_LABELS.reason}>
                <Textarea value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
              </HrmField>
            </div>
            <DialogFooter>
              <Button className={portalActionButtonClass()} onClick={handleSubmitCorrection} disabled={applyCorrection.isPending}>
                {LEGACY_CORRECTION_LABELS.submit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual attendance adjustment</DialogTitle>
            </DialogHeader>
            {adjustRow ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {adjustRow.userName ?? "Employee"} · {adjustRow.date}
                </p>
                <HrmField label="Status">
                  <Select value={adjustStatus} onValueChange={setAdjustStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMARY_ATTENDANCE_STATUSES.map((k) => (
                        <SelectItem key={k} value={k}>
                          {ATTENDANCE_STATUS_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
                <HrmField label="Active hours">
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={adjustHours}
                    onChange={(e) => setAdjustHours(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </HrmField>
                <HrmField label="Reason (required)">
                  <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                </HrmField>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                onClick={() => void handleAdminAdjust()}
                disabled={adminOverride.isPending}
              >
                Save adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={excuseOpen} onOpenChange={setExcuseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excuse late arrival</DialogTitle>
            </DialogHeader>
            {excuseRow ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {excuseRow.userName ?? "Employee"} · {excuseRow.date} — will be marked present (excused)
                </p>
                <HrmField label="Note to employee (optional)">
                  <Textarea value={excuseNote} onChange={(e) => setExcuseNote(e.target.value)} />
                </HrmField>
              </div>
            ) : null}
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                onClick={() => void handleExcuseLate()}
                disabled={excuseLate.isPending}
              >
                Excuse late arrival
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
