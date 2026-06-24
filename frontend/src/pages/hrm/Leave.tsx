import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, ClipboardList, Clock, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHeader,
  HrmPageShell,
  HrmTabsList,
  HrmTabsTrigger,
  HrmQueryErrorPanel,
  hrmActionButtonClass,
} from "@/modules/hrm/components";
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

export default function HrmLeavePage() {
  const { user } = useAuth();
  const canApprove = useHrmPermission("leave", "approve");
  const canAdminView = useHrmPermission("leave", "view");
  /** HR/managers apply on behalf of employees; staff apply only for themselves. */
  const canApplyForOthers = canAdminView || canApprove;

  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTab, setLeaveTab] = useState(canApprove || canAdminView ? "queue" : "history");

  const requestsQuery = useHrmLeaveRequests(
    canAdminView || canApprove ? { status: "pending" } : { userId: user?.id },
  );
  const historyQuery = useHrmLeaveRequests(
    canAdminView ? {} : { userId: user?.id },
    { enabled: leaveTab === "history" },
  );
  const balancesQuery = useHrmLeaveBalances(user?.id, new Date().getFullYear(), {
    enabled: leaveTab === "balances" && !canAdminView,
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
              ? "Review pending requests and apply leave on behalf of employees"
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

        <HrmPageKpiRow items={kpiItems} loading={requestsLoading || balancesLoading} />

        <Tabs value={leaveTab} onValueChange={setLeaveTab} className="space-y-4">
          <HrmTabsList>
            {(canAdminView || canApprove) && <HrmTabsTrigger value="queue">Pending approvals</HrmTabsTrigger>}
            <HrmTabsTrigger value="history">{canAdminView ? "All requests" : "My requests"}</HrmTabsTrigger>
            {!canAdminView && <HrmTabsTrigger value="balances">Balances</HrmTabsTrigger>}
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
