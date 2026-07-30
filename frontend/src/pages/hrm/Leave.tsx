import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, ClipboardList, Clock, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHeader,
  HrmPageShell,
  HrmQueryErrorPanel,
  hrmActionButtonClass,
} from "@/modules/hrm/components";
import { CmsChipTabs } from "@/components/cms";
import { ApplyLeaveDialog } from "@/modules/hrm/ApplyLeaveDialog";
import { buildLeaveBalanceColumns, buildLeaveRequestColumns } from "@/modules/hrm/hrm-table-columns";
import {
  useApplyLeaveRequest,
  mergeHrmQueryStates,
  useHrmLeaveBalances,
  useHrmLeaveRequests,
  useReviewLeaveRequest,
  useCancelLeaveRequest,
  useHrmSettings,
} from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { HrmPageKpiRow, countByStatus } from "@/modules/hrm/page-kpis";
import { useAuth } from "@/contexts/AuthContext";
import { getLeaveBalanceAvailable } from "@/modules/hrm/employee-profile-types";
import { LeaveCycleResetBanner } from "@/modules/hrm/LeaveCycleResetBanner";

export default function HrmLeavePage() {
  const { user } = useAuth();
  const canApprove = useHrmPermission("leave", "approve");
  const canAdminView = useHrmPermission("leave", "view");
  /** HR/managers apply on behalf of employees; staff apply only for themselves. */
  const canApplyForOthers = canAdminView || canApprove;

  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTab, setLeaveTab] = useState("history");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "pending" | "approved">("all");
  /** Approvals queue defaults to pending so admins see only what needs action. */
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | "pending" | "approved">("pending");

  const requestsQuery = useHrmLeaveRequests(
    canAdminView || canApprove
      ? (queueStatusFilter === "all" ? {} : { status: queueStatusFilter })
      : { userId: user?.id },
  );
  const historyQuery = useHrmLeaveRequests(
    canAdminView ? {} : { userId: user?.id },
    { enabled: leaveTab === "history" || leaveTab === "rejected" },
  );
  const balancesQuery = useHrmLeaveBalances(user?.id, new Date().getFullYear(), {
    enabled: !canAdminView && user?.id != null,
    staleTime: 300_000,
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
  const { data: hrmSettings } = useHrmSettings();

  const submitLeave = async (payload: {
    leaveTypeId: number;
    startDate: string;
    endDate: string;
    dayPart: string;
    reason: string;
    userId?: number;
  }) => {
    try {
      await applyLeave.mutateAsync(payload);
      toast.success(
        canApplyForOthers && payload.userId != null && payload.userId !== user?.id
          ? "Leave request submitted for employee"
          : "Leave request submitted",
      );
      setApplyOpen(false);
    } catch {
      // Error toast handled by useApplyLeaveRequest
    }
  };

  const requestRows = requests?.requests ?? [];
  const allHistoryRows = canAdminView ? (historyData?.requests ?? []) : requestRows;
  const historyRows = useMemo(
    () =>
      historyStatusFilter === "all"
        ? allHistoryRows
        : allHistoryRows.filter((r) => r.status === historyStatusFilter),
    [allHistoryRows, historyStatusFilter],
  );
  const historyLoadingState = canAdminView ? historyLoading : requestsLoading;
  const rejectedRows = useMemo(
    () => allHistoryRows.filter((r) => r.status === "rejected"),
    [allHistoryRows],
  );
  const balanceRows = balances?.balances ?? [];

  const kpiItems = useMemo(() => {
    const rows = canAdminView ? allHistoryRows : requestRows;
    const pending = countByStatus(rows, "pending");
    const approved = countByStatus(rows, "approved");
    const rejected = countByStatus(rows, "rejected");
    const available = balancesLoading
      ? null
      : balanceRows.reduce((n, b) => n + getLeaveBalanceAvailable(b), 0);
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
        hint: "Accrues monthly; unused days carry forward for 3 months, then reset",
        icon: Wallet,
        accent: "blue" as const,
      },
      { label: "Available days", value: available ?? "—", hint: "Remaining balance", icon: Wallet, accent: "violet" as const },
    ];
  }, [canAdminView, allHistoryRows, requestRows, balanceRows, balancesLoading, hrmSettings?.hrmPaidLeavesPerMonth]);

  const leaveActionOpts = useMemo(
    () => ({
      canApprove,
      currentUserId: user?.id,
      reviewPending: reviewLeave.isPending || cancelLeave.isPending,
      onApprove: (id: number) =>
        reviewLeave.mutate(
          { id, status: "approved" },
          {
            onSuccess: (data) => {
              toast.success("Leave approved");
              for (const message of data.warnings ?? []) toast.warning(message);
            },
          },
        ),
      onReject: (id: number) =>
        reviewLeave.mutate(
          { id, status: "rejected" },
          {
            onSuccess: (data) => {
              toast.success("Leave rejected");
              for (const message of data.warnings ?? []) toast.warning(message);
            },
          },
        ),
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
        // Admins need Approve/Reject on All requests too — pending rows looked actionless otherwise.
        showActions: !canAdminView || canApprove,
        ...leaveActionOpts,
      }),
    [canAdminView, canApprove, leaveActionOpts],
  );

  const balanceColumns = useMemo(() => buildLeaveBalanceColumns(), []);

  return (
    <HrmGate module={canAdminView ? "leave" : "my_leave"}>
      <HrmPageShell>
        <HrmPageHeader
          title={canAdminView ? "Leave management" : "My leave"}
          description={
            canAdminView
              ? "Approve or reject pending leave, or apply on behalf of employees"
              : "Apply for leave and track your remaining balance"
          }
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Leave" }]}
          actions={
            <Button size="sm" className={hrmActionButtonClass()} onClick={() => setApplyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {canApplyForOthers ? "Apply for employee" : "Apply leave"}
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={requestsLoading} />

        <LeaveCycleResetBanner
          leaveYearStartMonth={hrmSettings?.hrmLeaveYearStartMonth ?? 1}
          resetCycleMonths={hrmSettings?.hrmLeaveResetCycleMonths ?? 3}
          paidLeavesPerMonth={hrmSettings?.hrmPaidLeavesPerMonth ?? 1}
        />

        <div className="space-y-4">
          <CmsChipTabs
            value={leaveTab}
            onValueChange={setLeaveTab}
            items={[
              { value: "history", label: canAdminView ? "All requests" : "My requests" },
              ...((canAdminView || canApprove) ? [{ value: "queue", label: "Pending" }] : []),
              { value: "rejected", label: "Rejected" },
              ...(!canAdminView ? [{ value: "balances", label: "Balances" }] : []),
            ]}
          />
          <Tabs value={leaveTab} onValueChange={setLeaveTab}>

          <TabsContent value="history" className="space-y-4 m-0">
            {historyQueryState.isError ? (
              <HrmQueryErrorPanel
                error={historyQueryState.error}
                onRetry={historyQueryState.refetch}
                title="Could not load leave history"
              />
            ) : (
              <>
                <div className="flex justify-end">
                  <Select
                    value={historyStatusFilter}
                    onValueChange={(v) => setHistoryStatusFilter(v as "all" | "pending" | "approved")}
                  >
                    <SelectTrigger className="h-9 w-40 bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </>
            )}
          </TabsContent>

          {(canAdminView || canApprove) && (
            <TabsContent value="queue" className="space-y-4 m-0">
              {pendingQueryState.isError ? (
                <HrmQueryErrorPanel
                  error={pendingQueryState.error}
                  onRetry={pendingQueryState.refetch}
                  title="Could not load pending requests"
                />
              ) : (
                <>
                  <div className="flex justify-end">
                    <Select
                      value={queueStatusFilter}
                      onValueChange={(v) => setQueueStatusFilter(v as "all" | "pending" | "approved")}
                    >
                      <SelectTrigger className="h-9 w-40 bg-background">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                </>
              )}
            </TabsContent>
          )}

          <TabsContent value="rejected" className="space-y-4 m-0">
            {historyQueryState.isError ? (
              <HrmQueryErrorPanel
                error={historyQueryState.error}
                onRetry={historyQueryState.refetch}
                title="Could not load rejected requests"
              />
            ) : (
              <PortalTablePanel isLoading={historyLoadingState}>
                <AdvancedTable
                  data={rejectedRows}
                  columns={historyColumns}
                  searchKey={canAdminView ? "userName" : undefined}
                  searchPlaceholder="Filter requests…"
                  filename="HrmLeaveRejectedExport"
                  viewStorageKey="hrm-leave-rejected"
                />
              </PortalTablePanel>
            )}
          </TabsContent>

          {!canAdminView && (
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
          )}
        </Tabs>
        </div>

        <ApplyLeaveDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          mode={canApplyForOthers ? "admin" : "self"}
          currentUserId={user?.id}
          submitting={applyLeave.isPending}
          onSubmit={submitLeave}
        />
      </HrmPageShell>
    </HrmGate>
  );
}
