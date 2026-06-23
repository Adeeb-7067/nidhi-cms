import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, ClipboardList, Clock, Plus, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHeader,
  HrmPageShell,
  HrmTabsList,
  HrmTabsTrigger,
  HrmField,
  HrmQueryErrorPanel,
  hrmActionButtonClass,
} from "@/modules/hrm/components";
import { buildLeaveBalanceColumns, buildLeaveRequestColumns } from "@/modules/hrm/hrm-table-columns";
import {
  useApplyLeaveRequest,
  mergeHrmQueryStates,
  useHrmLeaveBalances,
  useHrmLeaveRequests,
  useHrmLeaveTypes,
  useReviewLeaveRequest,
  useCancelLeaveRequest,
  useHrmSettings,
} from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { HrmPageKpiRow, countByStatus } from "@/modules/hrm/page-kpis";
import { useAuth } from "@/contexts/AuthContext";
import { getLeaveBalanceAvailable } from "@/modules/hrm/employee-profile-types";
import { LEGACY_LEAVE_LABELS } from "@/modules/hrm/hrm-legacy-labels";
import {
  resolveLeaveDayPart,
  type HalfDayPartUi,
  type LeaveDurationUi,
} from "@/modules/hrm/leave-form-utils";

export default function HrmLeavePage() {
  const { user } = useAuth();
  const canApprove = useHrmPermission("leave", "approve");
  const canAdminView = useHrmPermission("leave", "view");

  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTab, setLeaveTab] = useState(canApprove || canAdminView ? "queue" : "history");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveDuration, setLeaveDuration] = useState<LeaveDurationUi>("full");
  const [halfDayPart, setHalfDayPart] = useState<HalfDayPartUi>("first_half");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");

  const { data: types } = useHrmLeaveTypes();
  const requestsQuery = useHrmLeaveRequests(
    canAdminView || canApprove ? { status: "pending" } : { userId: user?.id },
  );
  const historyQuery = useHrmLeaveRequests(
    canAdminView ? {} : { userId: user?.id },
    { enabled: leaveTab === "history" },
  );
  const balancesQuery = useHrmLeaveBalances(user?.id, new Date().getFullYear(), {
    enabled: leaveTab === "balances" || !canAdminView,
  });
  const { data: requests, isLoading: requestsLoading } = requestsQuery;
  const { data: historyData, isLoading: historyLoading } = historyQuery;
  const { data: balances, isLoading: balancesLoading } = balancesQuery;
  const pendingQueryState = mergeHrmQueryStates(requestsQuery);
  const historyQueryState = mergeHrmQueryStates(canAdminView ? historyQuery : requestsQuery);
  const balancesQueryState = mergeHrmQueryStates(balancesQuery);
  const applyLeave = useApplyLeaveRequest();
  const reviewLeave = useReviewLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();
  const { data: hrmSettings } = useHrmSettings({ enabled: !canAdminView || applyOpen });

  const submitLeave = async () => {
    if (!leaveTypeId) {
      toast.error("Please select a leave type");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const isHalfOrShort = leaveDuration === "half" || leaveDuration === "short";
    const effectiveEnd = isHalfOrShort ? startDate : endDate;
    if (effectiveEnd < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }
    try {
      await applyLeave.mutateAsync({
        leaveTypeId: Number(leaveTypeId),
        startDate,
        endDate: effectiveEnd,
        dayPart: resolveLeaveDayPart(leaveDuration, halfDayPart),
        reason,
      });
      toast.success("Leave request submitted");
      setReason("");
      setApplyOpen(false);
    } catch {
      // Error toast handled by useApplyLeaveRequest
    }
  };

  const requestRows = requests?.requests ?? [];
  const historyRows = canAdminView ? (historyData?.requests ?? []) : requestRows;
  const historyLoadingState = canAdminView ? historyLoading : requestsLoading;
  const balanceRows = balances?.balances ?? [];

  const kpiItems = useMemo(() => {
    const rows = canAdminView ? historyRows : requestRows;
    const pending = countByStatus(rows, "pending");
    const approved = countByStatus(rows, "approved");
    const rejected = countByStatus(rows, "rejected");
    const available = balanceRows.reduce((n, b) => n + getLeaveBalanceAvailable(b), 0);
    const totalApprovedDays = rows
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + (r.days ?? 1), 0);
    if (canAdminView) {
      return [
        { label: "Pending approval", value: pending, hint: "Awaiting review", icon: Clock, accent: "amber" as const },
        { label: "Approved", value: approved, hint: "This period", icon: CheckCircle, accent: "green" as const },
        { label: "Total days", value: totalApprovedDays, hint: "Approved leave days", icon: Wallet, accent: "blue" as const },
        { label: "Total requests", value: rows.length, hint: "All leave records", icon: ClipboardList, accent: "violet" as const },
      ];
    }
    return [
      { label: "Pending", value: pending, hint: "Awaiting approval", icon: Clock, accent: "amber" as const },
      { label: "Approved", value: approved, hint: "Approved leave", icon: CheckCircle, accent: "green" as const },
      {
        label: "Monthly quota",
        value: hrmSettings?.hrmPaidLeavesPerMonth ?? 0,
        hint: "Paid leave accrual / month",
        icon: Wallet,
        accent: "blue" as const,
      },
      { label: "Available days", value: available, hint: "Remaining balance", icon: Wallet, accent: "violet" as const },
    ];
  }, [canAdminView, historyRows, requestRows, balanceRows, hrmSettings?.hrmPaidLeavesPerMonth]);

  const leaveActionOpts = useMemo(
    () => ({
      canApprove,
      currentUserId: user?.id,
      reviewPending: reviewLeave.isPending || cancelLeave.isPending,
      onApprove: (id: number) =>
        reviewLeave.mutate({ id, status: "approved" }, { onSuccess: () => toast.success("Leave approved") }),
      onReject: (id: number) =>
        reviewLeave.mutate({ id, status: "rejected" }, { onSuccess: () => toast.success("Leave rejected") }),
      onCancel: (id: number) =>
        cancelLeave.mutate(id, { onSuccess: () => toast.success("Leave request cancelled") }),
    }),
    [canApprove, user?.id, reviewLeave, cancelLeave],
  );

  const queueColumns = useMemo(
    () =>
      buildLeaveRequestColumns({
        showEmployee: true,
        showActions: true,
        ...leaveActionOpts,
      }),
    [leaveActionOpts],
  );

  const historyColumns = useMemo(
    () =>
      buildLeaveRequestColumns({
        showEmployee: canAdminView,
        showActions: !canAdminView,
        ...leaveActionOpts,
      }),
    [canAdminView, leaveActionOpts],
  );

  const balanceColumns = useMemo(() => buildLeaveBalanceColumns(), []);

  return (
    <HrmGate module={canAdminView ? "leave" : "my_leave"}>
      <HrmPageShell>
        <HrmPageHeader
          title={canAdminView ? "Leave management" : "My leave"}
          description={
            canAdminView
              ? "Review pending requests and manage team leave balances"
              : "Apply for leave and track your remaining balance"
          }
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Leave" }]}
          actions={
            <Button size="sm" className={hrmActionButtonClass()} onClick={() => setApplyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Apply leave
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={requestsLoading || balancesLoading} />

        <Tabs value={leaveTab} onValueChange={setLeaveTab} className="space-y-4">
          <HrmTabsList>
            {(canAdminView || canApprove) && <HrmTabsTrigger value="queue">Pending approvals</HrmTabsTrigger>}
            <HrmTabsTrigger value="history">{canAdminView ? "All requests" : "My requests"}</HrmTabsTrigger>
            <HrmTabsTrigger value="balances">Balances</HrmTabsTrigger>
          </HrmTabsList>

          {(canAdminView || canApprove) && (
            <TabsContent value="queue" className="space-y-4 m-0">
              {pendingQueryState.isError ? (
                <HrmQueryErrorPanel
                  error={pendingQueryState.error}
                  onRetry={pendingQueryState.refetch}
                  title="Could not load pending requests"
                />
              ) : (
                <PortalTablePanel isLoading={requestsLoading}>
                  <AdvancedTable
                    data={requestRows}
                    columns={queueColumns}
                    searchKey="userName"
                    searchPlaceholder="Filter by employee…"
                    filename="HrmLeaveQueueExport"
                    viewStorageKey="hrm-leave-queue"
                  />
                </PortalTablePanel>
              )}
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-4 m-0">
            {historyQueryState.isError ? (
              <HrmQueryErrorPanel
                error={historyQueryState.error}
                onRetry={historyQueryState.refetch}
                title="Could not load leave history"
              />
            ) : (
              <PortalTablePanel isLoading={historyLoadingState}>
                <AdvancedTable
                  data={historyRows}
                  columns={historyColumns}
                  searchKey={canAdminView ? "userName" : undefined}
                  searchPlaceholder="Filter requests…"
                  filename="HrmLeaveHistoryExport"
                  viewStorageKey="hrm-leave-history"
                />
              </PortalTablePanel>
            )}
          </TabsContent>

          <TabsContent value="balances" className="space-y-4 m-0">
            {balancesQueryState.isError ? (
              <HrmQueryErrorPanel
                error={balancesQueryState.error}
                onRetry={balancesQueryState.refetch}
                title="Could not load leave balances"
              />
            ) : (
              <PortalTablePanel isLoading={balancesLoading}>
                <AdvancedTable
                  data={balanceRows}
                  columns={balanceColumns}
                  filename="HrmLeaveBalancesExport"
                  viewStorageKey="hrm-leave-balances"
                />
              </PortalTablePanel>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{LEGACY_LEAVE_LABELS.dialogTitle}</DialogTitle>
              <DialogDescription>{LEGACY_LEAVE_LABELS.dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label={LEGACY_LEAVE_LABELS.leaveType}>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(types?.types ?? []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label={LEGACY_LEAVE_LABELS.duration}>
                <Select
                  value={leaveDuration}
                  onValueChange={(v) => {
                    const next = v as LeaveDurationUi;
                    setLeaveDuration(next);
                    if (next === "half" || next === "short") {
                      setEndDate(startDate);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{LEGACY_LEAVE_LABELS.durationFull}</SelectItem>
                    <SelectItem value="half">{LEGACY_LEAVE_LABELS.durationHalf}</SelectItem>
                    <SelectItem value="short">{LEGACY_LEAVE_LABELS.durationShort}</SelectItem>
                  </SelectContent>
                </Select>
              </HrmField>
              {leaveDuration === "half" && (
                <HrmField label={LEGACY_LEAVE_LABELS.halfDayPart}>
                  <Select value={halfDayPart} onValueChange={(v) => setHalfDayPart(v as HalfDayPartUi)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half">{LEGACY_LEAVE_LABELS.halfFirst}</SelectItem>
                      <SelectItem value="second_half">{LEGACY_LEAVE_LABELS.halfSecond}</SelectItem>
                    </SelectContent>
                  </Select>
                </HrmField>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label={LEGACY_LEAVE_LABELS.startDate}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartDate(next);
                      if (leaveDuration === "half" || leaveDuration === "short") {
                        setEndDate(next);
                      } else if (endDate < next) {
                        setEndDate(next);
                      }
                    }}
                  />
                </HrmField>
                <HrmField label={LEGACY_LEAVE_LABELS.endDate}>
                  <Input
                    type="date"
                    value={leaveDuration === "half" || leaveDuration === "short" ? startDate : endDate}
                    disabled={leaveDuration === "half" || leaveDuration === "short"}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </HrmField>
              </div>
              <HrmField label={LEGACY_LEAVE_LABELS.reason}>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for your leave"
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={hrmActionButtonClass()}
                onClick={submitLeave}
                disabled={!leaveTypeId || !reason.trim() || applyLeave.isPending}
              >
                {LEGACY_LEAVE_LABELS.submit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
