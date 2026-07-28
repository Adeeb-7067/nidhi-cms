import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Link } from "wouter";
import { AlertTriangle, ClipboardEdit, Grid3X3, UserCheck, UserX, CalendarClock, Home, ClipboardList, Clock, Pencil, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmFilterBar,
  HrmField,
  HrmWorkflowBadge,
  HrmApprovalActions,
  HrmAttendanceStatusPill,
  portalActionButtonClass,
  HrmInsightBanner,
} from "@/modules/hrm/components";
import { CmsChipTabs } from "@/components/cms";
import { ManualAttendanceDialog } from "@/modules/hrm/ManualAttendanceDialog";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { HrmAttendanceGridPanel, attendanceStatusSuffix } from "@/modules/hrm/hrm-attendance-grid";
import type { HrmAttendanceCorrection, HrmAttendanceSummary } from "@/modules/hrm/types";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import type { HrmKpiItem } from "@/modules/hrm/components";
import {
  useApplyAttendanceCorrection,
  useHrmAttendanceCorrections,
  useHrmAttendanceDaily,
  useHrmAttendanceVariance,
  useHrmDepartments,
  useHrmEmployees,
  useReviewAttendanceCorrection,
  useExcuseLateArrival,
  useAdminOverrideAttendance,
  useHrmSettings,
} from "@/api/hrm";
import { ATTENDANCE_STATUS_LABELS, PRIMARY_ATTENDANCE_STATUSES, isPresentLikeStatus, normalizeAttendanceStatus, simpleAttendanceStatusLabel } from "@/modules/hrm/constants";
import {
  LEGACY_ATTENDANCE_STATUS_OPTIONS,
  LEGACY_CORRECTION_LABELS,
} from "@/modules/hrm/hrm-legacy-labels";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { useAuth } from "@/contexts/AuthContext";
import { CLOCKABLE_STAFF_ROLES } from "@/lib/user-roles";

import { toast } from "sonner";

type AttendanceRow = HrmAttendanceSummary;

const CLOCKABLE_ROLES = new Set(CLOCKABLE_STAFF_ROLES);

export default function HrmAttendancePage() {
  const { user } = useAuth();
  const canAdmin = useHrmPermission("attendance", "view");
  const canApprove = useHrmPermission("attendance", "approve");
  const canManage = useHrmPermission("attendance", "edit") || canApprove;
  const [periodMode, setPeriodMode] = useState<"today" | "yesterday" | "date" | "month">("today");
  const [customDate, setCustomDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("oldest");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualMode, setManualMode] = useState<"clock_in" | "clock_out">("clock_in");
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
  const [attendanceTab, setAttendanceTab] = useState("grid");
  const [adjustRow, setAdjustRow] = useState<AttendanceRow | null>(null);
  const [adjustStatus, setAdjustStatus] = useState("present");
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuseRow, setExcuseRow] = useState<AttendanceRow | null>(null);
  const [excuseNote, setExcuseNote] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const startDate =
    canAdmin && periodMode === "today" ? todayStr :
    canAdmin && periodMode === "yesterday" ? yesterdayStr :
    canAdmin && periodMode === "date" ? customDate :
    format(startOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
  const endDate =
    canAdmin && periodMode === "today" ? todayStr :
    canAdmin && periodMode === "yesterday" ? yesterdayStr :
    canAdmin && periodMode === "date" ? customDate :
    format(endOfMonth(new Date(`${month}-01`)), "yyyy-MM-dd");
  const deptNum = departmentId !== "all" ? Number(departmentId) : undefined;
  const selfOnly = !canAdmin;
  const filterUserId =
    selfOnly
      ? user?.id
      : employeeId !== "all"
        ? Number(employeeId)
        : undefined;

  const needEmployeeList = canAdmin || canManage;
  const { data: hrmEmployeesData } = useHrmEmployees(
    { status: "active", limit: 500 },
    { enabled: needEmployeeList },
  );
  const employeeOptions = useMemo(
    () =>
      (hrmEmployeesData?.employees ?? [])
        .filter((e) => CLOCKABLE_ROLES.has(e.role))
        .map((e) => ({ id: e.id, name: e.name, employeeId: e.employeeId }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [hrmEmployeesData],
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
    { enabled: attendanceTab === "variance" },
  );
  const { data: correctionsData } = useHrmAttendanceCorrections(selfOnly ? user?.id : filterUserId, {
    enabled: attendanceTab === "corrections" || attendanceTab === "late-excuses",
  });
  const { data: departmentsData } = useHrmDepartments({ enabled: canAdmin });
  const applyCorrection = useApplyAttendanceCorrection();
  const reviewCorrection = useReviewAttendanceCorrection();
  const excuseLate = useExcuseLateArrival();
  const adminOverride = useAdminOverrideAttendance();
  const { data: hrmSettings } = useHrmSettings();

  const rows = useMemo(() => {
    let list = data?.summaries ?? [];
    if (statusFilter === "full_day") {
      list = list.filter((r) => isPresentLikeStatus(r.status));
    } else if (statusFilter !== "all") {
      list = list.filter((r) => normalizeAttendanceStatus(r.status) === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const byDate = dateSort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return (a.userName ?? "").localeCompare(b.userName ?? "");
    });
    return list;
  }, [data, statusFilter, dateSort]);

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
    const absent = list.filter((r) => r.status === "absent" && !(r.globalWfh && r.status === "absent")).length;
    const scheduled = list.filter((r) => r.globalWfh && r.status === "absent").length;
    const onLeave = list.filter((r) => r.status === "on_leave").length;
    const wfh = list.filter((r) => r.status === "wfh").length;
    const halfDay = list.filter((r) => r.status === "half_day").length;
    const holiday = list.filter((r) => r.status === "holiday").length;
    const items: HrmKpiItem[] = [
      { label: canAdmin ? "Present / onsite / WFH" : "Present days", value: present, hint: canAdmin ? "This period" : "This period", icon: UserCheck, accent: "green" as const },
      { label: "Absent", value: absent, hint: "Marked absent", icon: UserX, accent: "blue" as const, alert: absent > 0 },
      ...(scheduled > 0
        ? [{
            label: "Scheduled",
            value: scheduled,
            hint: "Awaiting clock-in (global WFH)",
            icon: Home,
            accent: "blue" as const,
          }]
        : []),
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
    if (halfDay > 0) {
      items.push({ label: "Half day", value: halfDay, hint: "Partial leave", icon: CalendarClock, accent: "amber" as const });
    }
    if (holiday > 0) {
      items.push({ label: "Holiday", value: holiday, hint: "Company holiday", icon: CalendarClock, accent: "violet" as const });
    }
    return items;
  }, [data?.summaries, canAdmin, pendingCorrections.length]);

  const workModeSummary = useMemo(() => {
    const list = data?.summaries ?? [];
    const onsite = list.filter(
      (r) => isPresentLikeStatus(r.status) && r.status !== "wfh" && !r.globalWfh,
    ).length;
    const wfh = list.filter((r) => r.status === "wfh").length;
    const awaitingClock = list.filter((r) => r.globalWfh && r.status !== "wfh").length;
    return { onsite, wfh, remoteDefault: awaitingClock };
  }, [data?.summaries]);

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

  type VarianceRow = {
    userId: number;
    userName?: string;
    avatarUrl?: string | null;
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
        cell: (r) => (
          <div className="flex items-center gap-2">
            <HrmEmployeeAvatar name={r.userName ?? `#${r.userId}`} avatarUrl={r.avatarUrl} className="h-7 w-7" />
            <span className="font-medium">{r.userName}</span>
          </div>
        ),
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
        cell: (c) => (
          <div className="flex items-center gap-2">
            <HrmEmployeeAvatar name={c.userName ?? `#${c.userId}`} avatarUrl={c.avatarUrl} className="h-7 w-7" />
            <span className="font-medium">{c.userName ?? `#${c.userId}`}</span>
          </div>
        ),
        exportValue: (c) => c.userName ?? String(c.userId),
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
        cell: (c) => (
          <span className="block max-w-xs truncate text-muted-foreground" title={c.reason ?? undefined}>
            {c.reason}
          </span>
        ),
        detailCell: (c) => (
          <span className="whitespace-pre-wrap break-words text-muted-foreground">{c.reason || "—"}</span>
        ),
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
      cell: (r) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={r.userName} avatarUrl={r.avatarUrl} className="h-7 w-7" />
          <span className="font-medium">{r.userName}</span>
        </div>
      ),
      exportValue: (r) => r.userName,
    },
    {
      id: "date",
      header: "Date",
      cell: (r) => <span className="text-muted-foreground">{r.date}</span>,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (r) => <HrmAttendanceStatusPill row={r} />,
      exportValue: (r) => `${simpleAttendanceStatusLabel(r)}${attendanceStatusSuffix(r)}`,
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
              {selfOnly && (
                <Button size="sm" className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")} onClick={() => setCorrectionOpen(true)}>
                  Request correction
                </Button>
              )}
              {canManage && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManualMode("clock_in");
                      setManualOpen(true);
                    }}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Manual clock in
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManualMode("clock_out");
                      setManualOpen(true);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Manual clock out
                  </Button>
                </>
              )}
              {canAdmin && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/attendance">Live sessions</Link>
                </Button>
              )}
            </div>
          }
        />

        {hrmSettings?.hrmGlobalWfhMode && canAdmin ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
            <Home className="h-4 w-4 shrink-0" />
            Company-wide WFH is active — employees clock in from anywhere; status becomes WFH after clock-in (no late penalties).
          </div>
        ) : null}

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        {canAdmin && (periodMode === "today" || periodMode === "yesterday" || periodMode === "date") && (
          <HrmInsightBanner title="Work mode summary" icon={Grid3X3}>
            <p className="text-xs text-muted-foreground">
              {workModeSummary.onsite} onsite · {workModeSummary.wfh} WFH
              {workModeSummary.remoteDefault > 0
                ? ` · ${workModeSummary.remoteDefault} awaiting clock (global WFH)`
                : ""}
            </p>
          </HrmInsightBanner>
        )}

        <HrmFilterBar>
          {canAdmin && (
            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as "today" | "yesterday" | "date" | "month")}>
              <SelectTrigger className="h-9 w-36 bg-background">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="date">Specific date</SelectItem>
                <SelectItem value="month">Full month</SelectItem>
              </SelectContent>
            </Select>
          )}
          {canAdmin && periodMode === "date" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="h-9 w-40 shrink-0 bg-background"
            />
          )}
          {canAdmin && (
            <Select value={dateSort} onValueChange={(v) => setDateSort(v as "newest" | "oldest")}>
              <SelectTrigger className="h-9 w-36 bg-background">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          )}
          {(!canAdmin || periodMode === "month") && (
            <div className="flex items-center h-9 rounded-md border bg-background px-1 gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const d = new Date(`${month}-01`);
                  d.setMonth(d.getMonth() - 1);
                  setMonth(format(d, "yyyy-MM"));
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium px-1 min-w-[100px] text-center">
                {format(new Date(`${month}-01`), "MMMM, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const d = new Date(`${month}-01`);
                  d.setMonth(d.getMonth() + 1);
                  setMonth(format(d, "yyyy-MM"));
                }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
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
                <SelectTrigger className="h-9 w-44 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="full_day">Full day</SelectItem>
                  <SelectItem value="half_day">Half day</SelectItem>
                  {PRIMARY_ATTENDANCE_STATUSES.filter((k) => k !== "half_day").map((k) => (
                    <SelectItem key={k} value={k}>
                      {ATTENDANCE_STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </HrmFilterBar>

        <div className="space-y-4">
          <CmsChipTabs
            value={attendanceTab}
            onValueChange={setAttendanceTab}
            items={[
              { value: "grid", label: "Daily grid" },
              {
                value: "variance",
                label: "Clock vs logs",
                count: varianceRows.length || undefined,
              },
              {
                value: "corrections",
                label: "Corrections",
                count: pendingCorrections.length || undefined,
              },
              ...(canManage
                ? [
                    {
                      value: "late-excuses",
                      label: "Late excuses",
                      count: lateExcuseRows.length || undefined,
                    },
                  ]
                : []),
            ]}
          />
          <Tabs value={attendanceTab} onValueChange={setAttendanceTab}>

          <TabsContent value="grid" className="space-y-4 m-0">
            <HrmAttendanceGridPanel
              rows={rows}
              isLoading={isLoading}
              showEmployee={canAdmin}
              extraColumns={
                canManage
                  ? [
                      {
                        id: "actions",
                        header: "Actions",
                        className: "text-right",
                        cell: (r) => {
                          const isLateOnsite =
                            normalizeAttendanceStatus(r.status) === "onsite" && !r.forgivenLate;
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
                      },
                    ]
                  : undefined
              }
            />
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
        </div>

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
                {normalizeAttendanceStatus(adjustRow.status) === "onsite" && !adjustRow.forgivenLate && (
                  <HrmInsightBanner title="Late policy">
                    <p className="text-xs text-muted-foreground">
                      First {hrmSettings?.hrmMaxFreeLates ?? 3} late days each month may be forgiven when the
                      employee completes a full work day.
                    </p>
                  </HrmInsightBanner>
                )}
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

        {canManage && (
          <ManualAttendanceDialog
            open={manualOpen}
            onOpenChange={setManualOpen}
            employees={employeeOptions}
            defaultMode={manualMode}
          />
        )}
      </HrmPageShell>
    </HrmGate>
  );
}
