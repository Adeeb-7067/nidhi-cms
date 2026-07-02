import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle, Clock, Home, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { phoneValidationError, normalizePhoneForSubmit } from "@/lib/phone-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { buildWfhRequestColumns } from "@/modules/hrm/hrm-table-columns";
import { HrmPageKpiRow, countByStatus } from "@/modules/hrm/page-kpis";
import { useApplyWfhRequest, mergeHrmQueryStates, useHrmWfhRequests, useReviewWfhRequest, useCancelWfhRequest } from "@/api/hrm";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { useAuth } from "@/contexts/AuthContext";
import { LEGACY_WFH_LABELS } from "@/modules/hrm/hrm-legacy-labels";

export default function HrmWfhPage() {
  const { user } = useAuth();
  const canAdminView = useHrmPermission("wfh", "view");
  const canApprove = useHrmPermission("wfh", "approve");
  const [wfhTab, setWfhTab] = useState("history");
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const pendingQuery = useHrmWfhRequests(
    canAdminView || canApprove
      ? (queueStatusFilter === "all" ? {} : { status: queueStatusFilter })
      : { userId: user?.id },
  );
  const allQuery = useHrmWfhRequests(
    canAdminView ? {} : { userId: user?.id },
    { enabled: canAdminView && (wfhTab === "history" || wfhTab === "rejected") },
  );
  const { data: requests, isLoading } = pendingQuery;
  const { data: allData, isLoading: allLoading } = allQuery;
  const pendingState = mergeHrmQueryStates(pendingQuery);
  const allState = mergeHrmQueryStates(canAdminView ? allQuery : pendingQuery);
  const applyWfh = useApplyWfhRequest();
  const reviewWfh = useReviewWfhRequest();
  const cancelWfh = useCancelWfhRequest();
  const [applyOpen, setApplyOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const requestRows = requests?.requests ?? [];
  const allRowsUnfiltered = canAdminView ? (allData?.requests ?? []) : requestRows;
  const historyLoadingState = canAdminView ? allLoading : isLoading;
  const allRows = useMemo(
    () =>
      historyStatusFilter === "all"
        ? allRowsUnfiltered
        : allRowsUnfiltered.filter((r) => r.status === historyStatusFilter),
    [allRowsUnfiltered, historyStatusFilter],
  );
  const rejectedRows = useMemo(
    () => allRowsUnfiltered.filter((r) => r.status === "rejected"),
    [allRowsUnfiltered],
  );

  const kpiItems = useMemo(() => {
    const pending = countByStatus(allRowsUnfiltered, "pending");
    const approved = countByStatus(allRowsUnfiltered, "approved");
    const rejected = countByStatus(allRowsUnfiltered, "rejected");
    return [
      { label: "Pending", value: pending, hint: "Awaiting approval", icon: Clock, accent: "amber" as const },
      { label: "Approved", value: approved, hint: "Remote days granted", icon: CheckCircle, accent: "green" as const },
      { label: "Rejected", value: rejected, hint: "Declined requests", icon: XCircle, accent: "blue" as const, alert: rejected > 0 },
      {
        label: canAdminView ? "Total requests" : "My requests",
        value: allRowsUnfiltered.length,
        hint: canAdminView ? "All WFH records" : "Submitted by you",
        icon: Home,
        accent: "violet" as const,
      },
    ];
  }, [allRowsUnfiltered, canAdminView]);

  const wfhActionOpts = useMemo(
    () => ({
      canApprove,
      currentUserId: user?.id,
      reviewPending: reviewWfh.isPending || cancelWfh.isPending,
      onApprove: (id: number) =>
        reviewWfh.mutate({ id, status: "approved" }, { onSuccess: () => toast.success("WFH approved") }),
      onReject: (id: number) =>
        reviewWfh.mutate({ id, status: "rejected" }, { onSuccess: () => toast.success("WFH rejected") }),
      onCancel: (id: number) =>
        cancelWfh.mutate(id, { onSuccess: () => toast.success("WFH request cancelled") }),
    }),
    [canApprove, user?.id, reviewWfh, cancelWfh],
  );

  const queueColumns = useMemo(
    () =>
      buildWfhRequestColumns({
        showEmployee: true,
        showActions: true,
        ...wfhActionOpts,
      }),
    [wfhActionOpts],
  );

  const historyColumns = useMemo(
    () =>
      buildWfhRequestColumns({
        showEmployee: canAdminView,
        showActions: !canAdminView,
        ...wfhActionOpts,
      }),
    [canAdminView, wfhActionOpts],
  );

  return (
    <HrmGate module={canAdminView ? "wfh" : "my_wfh"}>
      <HrmPageShell>
        <HrmPageHeader
          title="Work from home"
          description={
            canAdminView
              ? "Review WFH requests and manage remote work approvals"
              : "Request to work remotely for a specific day"
          }
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "WFH" }]}
          actions={
            <Button size="sm" className={hrmActionButtonClass()} onClick={() => setApplyOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Apply WFH
            </Button>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading || (canAdminView && allLoading)} />

        <Tabs value={wfhTab} onValueChange={setWfhTab} className="space-y-4">
          <HrmTabsList>
            <HrmTabsTrigger value="history">{canAdminView ? "All requests" : "My requests"}</HrmTabsTrigger>
            {(canAdminView || canApprove) && <HrmTabsTrigger value="queue">Approvals</HrmTabsTrigger>}
            <HrmTabsTrigger value="rejected">Rejected</HrmTabsTrigger>
          </HrmTabsList>

          <TabsContent value="history" className="space-y-4 m-0">
            {allState.isError ? (
              <HrmQueryErrorPanel
                error={allState.error}
                onRetry={allState.refetch}
                title="Could not load WFH history"
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
                    data={allRows}
                    columns={historyColumns}
                    searchKey={canAdminView ? "userName" : undefined}
                    searchPlaceholder="Filter requests…"
                    filename="HrmWfhHistoryExport"
                    viewStorageKey="hrm-wfh-history"
                  />
                </PortalTablePanel>
              </>
            )}
          </TabsContent>

          {(canAdminView || canApprove) && (
            <TabsContent value="queue" className="space-y-4 m-0">
              {pendingState.isError ? (
                <HrmQueryErrorPanel
                  error={pendingState.error}
                  onRetry={pendingState.refetch}
                  title="Could not load WFH requests"
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
                  <PortalTablePanel isLoading={isLoading}>
                    <AdvancedTable
                      data={requestRows}
                      columns={queueColumns}
                      searchKey="userName"
                      searchPlaceholder="Filter by employee…"
                      filename="HrmWfhQueueExport"
                      viewStorageKey="hrm-wfh-queue"
                    />
                  </PortalTablePanel>
                </>
              )}
            </TabsContent>
          )}

          <TabsContent value="rejected" className="space-y-4 m-0">
            {allState.isError ? (
              <HrmQueryErrorPanel
                error={allState.error}
                onRetry={allState.refetch}
                title="Could not load rejected requests"
              />
            ) : (
              <PortalTablePanel isLoading={historyLoadingState}>
                <AdvancedTable
                  data={rejectedRows}
                  columns={historyColumns}
                  searchKey={canAdminView ? "userName" : undefined}
                  searchPlaceholder="Filter requests…"
                  filename="HrmWfhRejectedExport"
                  viewStorageKey="hrm-wfh-rejected"
                />
              </PortalTablePanel>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{LEGACY_WFH_LABELS.dialogTitle}</DialogTitle>
              <DialogDescription>Submit a WFH request for manager or HR approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label={LEGACY_WFH_LABELS.startDate}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartDate(next);
                      if (endDate < next) setEndDate(next);
                    }}
                  />
                </HrmField>
                <HrmField label={LEGACY_WFH_LABELS.endDate}>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </HrmField>
              </div>
              <HrmField label={LEGACY_WFH_LABELS.reason} hint="Brief note for your manager">
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. home repair appointment"
                />
              </HrmField>
              <HrmField label={LEGACY_WFH_LABELS.contactPhone} hint="10-digit mobile number">
                <PhoneInput
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={hrmActionButtonClass()}
                disabled={applyWfh.isPending || !reason.trim()}
                onClick={async () => {
                  if (!reason.trim()) {
                    toast.error("Reason is required");
                    return;
                  }
                  if (endDate < startDate) {
                    toast.error("End date cannot be before start date");
                    return;
                  }
                  const phoneErr = phoneValidationError(phoneNumber);
                  if (phoneErr) {
                    toast.error(phoneErr);
                    return;
                  }
                  try {
                    await applyWfh.mutateAsync({
                      startDate,
                      endDate,
                      reason,
                      phoneNumber: normalizePhoneForSubmit(phoneNumber) || undefined,
                    });
                    toast.success("WFH request submitted");
                    setReason("");
                    setPhoneNumber("");
                    setApplyOpen(false);
                  } catch {
                    // Error toast handled by useApplyWfhRequest
                  }
                }}
              >
                {LEGACY_WFH_LABELS.submit}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
