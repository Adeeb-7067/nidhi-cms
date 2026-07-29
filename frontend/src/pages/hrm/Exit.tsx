import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Clock, LogOut, Plus, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  HrmField,
  portalActionButtonClass,
  HrmRefRefreshButton,
} from "@/modules/hrm/components";
import {
  HrmRefDetailRow,
  HrmRefDetailSection,
} from "@/modules/hrm/hrm-reference-kit";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { EXIT_WORKFLOW_STAGES } from "@/modules/hrm/exit-constants";
import { buildExitRequestColumns } from "@/modules/hrm/hrm-table-columns";
import {
  useAdvanceExitRequest,
  useApproveExitRequest,
  useCancelExitRequest,
  useCreateExitRequest,
  useHrmEmployees,
  useHrmExitRequest,
  useHrmExitRequests,
  useRejectExitRequest,
  useReturnExitAssets,
  useUpdateExitRequest,
} from "@/api/hrm";
import type { HrmExitRequest } from "@/modules/hrm/types";

type ExitForm = {
  userId: string;
  reason: string;
  resignationDate: string;
  noticePeriodDays: string;
  lastWorkingDay: string;
  notes: string;
};

const emptyForm = (): ExitForm => ({
  userId: "",
  reason: "",
  resignationDate: format(new Date(), "yyyy-MM-dd"),
  noticePeriodDays: "30",
  lastWorkingDay: "",
  notes: "",
});

export default function HrmExitPage() {
  const canCreate = useHrmPermission("exit", "create");
  const canEdit = useHrmPermission("exit", "edit");
  const canApprove = useHrmPermission("exit", "approve");
  const canDelete = useHrmPermission("exit", "delete");

  const [approvalFilter, setApprovalFilter] = useState<"all" | "pending" | "approved">("all");
  const listParams = useMemo(
    () => ({
      status: "active" as const,
      approvalStatus: approvalFilter === "all" ? undefined : approvalFilter,
    }),
    [approvalFilter],
  );

  const { data, isLoading, refetch, isFetching } = useHrmExitRequests(listParams);
  const { data: employeesData } = useHrmEmployees({ status: "active", limit: 500 });
  const createExit = useCreateExitRequest();
  const updateExit = useUpdateExitRequest();
  const approveExit = useApproveExitRequest();
  const rejectExit = useRejectExitRequest();
  const advanceExit = useAdvanceExitRequest();
  const returnAssets = useReturnExitAssets();
  const cancelExit = useCancelExitRequest();

  const requests = data?.requests ?? [];
  const employees = employeesData?.employees ?? [];

  const [detailId, setDetailId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<HrmExitRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HrmExitRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<ExitForm>(emptyForm);
  const [detailLastWorkingDay, setDetailLastWorkingDay] = useState("");
  const [detailNotes, setDetailNotes] = useState("");

  const { data: detailData, isLoading: detailLoading } = useHrmExitRequest(detailId ?? undefined, {
    enabled: detailId != null,
  });
  const detail = detailData?.request ?? null;

  useEffect(() => {
    if (!form.resignationDate) return;
    const resignationDate = new Date(`${form.resignationDate}T00:00:00`);
    if (Number.isNaN(resignationDate.getTime())) return;
    const noticePeriodDays = Math.max(0, Number(form.noticePeriodDays) || 0);
    const computed = new Date(resignationDate);
    computed.setDate(computed.getDate() + noticePeriodDays);
    setForm((current) => ({
      ...current,
      lastWorkingDay: format(computed, "yyyy-MM-dd"),
    }));
  }, [form.resignationDate, form.noticePeriodDays]);

  useEffect(() => {
    if (!detail) return;
    setDetailLastWorkingDay(format(new Date(detail.lastWorkingDay), "yyyy-MM-dd"));
    setDetailNotes(detail.notes ?? "");
  }, [detail?.id, detail?.lastWorkingDay, detail?.notes]);

  const kpiItems = useMemo(() => {
    const pendingApproval = requests.filter((r) => r.approvalStatus === "pending").length;
    const avgNotice =
      requests.length > 0
        ? Math.round(requests.reduce((sum, r) => sum + r.noticeDaysRemaining, 0) / requests.length)
        : 0;
    const finalStage = requests.filter((r) => r.stage >= 5).length;
    return [
      { label: "Pending approval", value: pendingApproval, hint: "Awaiting HR review", icon: Clock, accent: "amber" as const },
      { label: "In progress", value: requests.length, hint: "Active offboarding", icon: LogOut, accent: "violet" as const },
      { label: "Avg notice left", value: `${avgNotice}d`, hint: "Days to last working day", icon: LogOut, accent: "amber" as const },
      { label: "Final stage", value: finalStage, hint: "FnF or exit", icon: Check, accent: "green" as const },
      {
        label: "Assets pending",
        value: requests.filter((r) => !r.assetReturnComplete && (r.assignedAssetCount ?? 0) > 0).length,
        hint: "Awaiting return",
        icon: Package,
        accent: "blue" as const,
      },
    ];
  }, [requests]);

  const openDetail = (request: HrmExitRequest) => {
    setDetailId(request.id);
  };

  const submitCreate = async () => {
    if (!form.userId || !form.reason.trim() || !form.resignationDate) {
      toast.error("Employee, reason, and resignation date are required");
      return;
    }
    try {
      const created = await createExit.mutateAsync({
        userId: Number(form.userId),
        reason: form.reason.trim(),
        resignationDate: form.resignationDate,
        noticePeriodDays: Number(form.noticePeriodDays) || 0,
        lastWorkingDay: form.lastWorkingDay || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Exit workflow started");
      setCreateOpen(false);
      setForm(emptyForm());
      setDetailId(created.id);
    } catch {
      // mutation toast
    }
  };

  const handleAdvance = async () => {
    if (!detail) return;
    try {
      await advanceExit.mutateAsync(detail.id);
      toast.success("Stage advanced");
    } catch {
      // mutation toast
    }
  };

  const handleReturnAssets = async () => {
    if (!detail) return;
    try {
      const result = await returnAssets.mutateAsync(detail.id);
      toast.success(
        result.assetReturnComplete
          ? "Assets marked as returned"
          : "Asset return recorded",
      );
    } catch {
      // mutation toast
    }
  };

  const handleToggleFnf = async () => {
    if (!detail) return;
    try {
      await updateExit.mutateAsync({ id: detail.id, fnfSettled: !detail.fnfSettled });
      toast.success(detail.fnfSettled ? "FnF marked pending" : "FnF marked settled");
    } catch {
      // mutation toast
    }
  };

  const handleSaveDetail = async () => {
    if (!detail) return;
    try {
      await updateExit.mutateAsync({
        id: detail.id,
        lastWorkingDay: detailLastWorkingDay,
        notes: detailNotes.trim(),
      });
      toast.success("Exit details updated");
    } catch {
      // mutation toast
    }
  };

  const handleApprove = useCallback(
    async (request: HrmExitRequest) => {
      try {
        await approveExit.mutateAsync({
          id: request.id,
          lastWorkingDay: detail?.id === request.id ? detailLastWorkingDay : undefined,
          notes: detail?.id === request.id ? detailNotes.trim() || undefined : undefined,
        });
        toast.success(`Exit approved for ${request.employeeName}`);
      } catch {
        // mutation toast
      }
    },
    [approveExit, detail?.id, detailLastWorkingDay, detailNotes],
  );

  const openRejectDialog = useCallback((request: HrmExitRequest) => {
    setRejectTarget(request);
    setRejectReason("");
  }, []);

  const handleReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      await rejectExit.mutateAsync({ id: rejectTarget.id, rejectionReason: reason });
      toast.success(`Exit rejected for ${rejectTarget.employeeName}`);
      if (detailId === rejectTarget.id) setDetailId(null);
      setRejectTarget(null);
      setRejectReason("");
    } catch {
      // mutation toast
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelExit.mutateAsync(cancelTarget.id);
      toast.success("Exit workflow cancelled");
      if (detailId === cancelTarget.id) setDetailId(null);
      setCancelTarget(null);
    } catch {
      // mutation toast
    }
  };

  const columns = useMemo(
    () =>
      buildExitRequestColumns({
        canApprove,
        reviewPending: approveExit.isPending || rejectExit.isPending,
        onApprove: (request) => void handleApprove(request),
        onReject: openRejectDialog,
      }),
    [canApprove, approveExit.isPending, rejectExit.isPending, handleApprove, openRejectDialog],
  );

  return (
    <HrmGate module="exit">
      <HrmPageShell>
        <HrmPageHero
          title="Exit workflow"
          description={`${requests.length} active offboarding case${requests.length === 1 ? "" : "s"}`}
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Exit workflow" }]}
          actions={
            <>
              <HrmRefRefreshButton onClick={() => refetch()} loading={isFetching} />
              {canCreate ? (
                <Button className={portalActionButtonClass()} onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Start exit
                </Button>
              ) : null}
            </>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        {canApprove ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Approval queue</span>
            <Select value={approvalFilter} onValueChange={(v) => setApprovalFilter(v as typeof approvalFilter)}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All active exits</SelectItem>
                <SelectItem value="pending">Pending approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={requests}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search employee or reason…"
            onRowClick={openDetail}
            filename="HrmExitExport"
            renderGridCard={(r) => {
              const pct = (r.stage / r.stageCount) * 100;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <HrmEmployeeAvatar name={r.employeeName} avatarUrl={r.employeeAvatarUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.reason}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Stage {r.stage}/{r.stageCount}</span>
                      <span>{r.stageLabel}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    LWD:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {format(new Date(r.lastWorkingDay), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              );
            }}
          />
        </PortalTablePanel>

        <Dialog open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {detailLoading && !detail ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading workflow…</p>
            ) : detail ? (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <HrmEmployeeAvatar name={detail.employeeName} avatarUrl={detail.employeeAvatarUrl} className="h-10 w-10" />
                    <div className="min-w-0 text-left">
                      <DialogTitle>{detail.employeeName}</DialogTitle>
                      <p className="text-sm text-muted-foreground">Exit — {detail.reason}</p>
                    </div>
                  </div>
                </DialogHeader>

                <HrmRefDetailSection title="Timeline">
                  <HrmRefDetailRow
                    label="Resignation"
                    value={format(new Date(detail.resignationDate), "MMM d, yyyy")}
                  />
                  <HrmRefDetailRow
                    label="Last working day"
                    value={format(new Date(detail.lastWorkingDay), "MMM d, yyyy")}
                  />
                  <HrmRefDetailRow label="Notice period" value={`${detail.noticePeriodDays} days`} />
                  <HrmRefDetailRow label="Notice remaining" value={`${detail.noticeDaysRemaining} days`} />
                  <HrmRefDetailRow label="Approval" value={detail.approvalStatus} />
                  <HrmRefDetailRow
                    label="Account status"
                    value={
                      detail.autoDeactivatedAt
                        ? `Inactive since ${format(new Date(detail.autoDeactivatedAt), "MMM d, yyyy")}`
                        : detail.approvalStatus === "approved"
                          ? `Active until ${format(new Date(detail.lastWorkingDay), "MMM d, yyyy")} — deactivates the next day`
                          : (detail.employeeStatus ?? "—")
                    }
                  />
                  <HrmRefDetailRow label="Employee status" value={detail.employeeStatus ?? "—"} />
                  {detail.autoDeactivatedAt ? (
                    <HrmRefDetailRow
                      label="Auto deactivated"
                      value={format(new Date(detail.autoDeactivatedAt), "MMM d, yyyy")}
                    />
                  ) : null}
                  <HrmRefDetailRow label="Reason" value={detail.reason} />
                </HrmRefDetailSection>

                {(canEdit || canApprove) && detail.approvalStatus === "pending" ? (
                  <HrmRefDetailSection title="Review">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {canEdit || canApprove ? (
                        <HrmField label="Last working day">
                          <Input
                            type="date"
                            value={detailLastWorkingDay}
                            onChange={(e) => setDetailLastWorkingDay(e.target.value)}
                            disabled={!canEdit && !canApprove}
                          />
                        </HrmField>
                      ) : null}
                      <HrmField label="Notes">
                        <Textarea
                          value={detailNotes}
                          onChange={(e) => setDetailNotes(e.target.value)}
                          placeholder="HR notes for this exit"
                          rows={3}
                        />
                      </HrmField>
                    </div>
                  </HrmRefDetailSection>
                ) : canEdit ? (
                  <HrmRefDetailSection title="Admin controls">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <HrmField label="Last working day">
                        <Input
                          type="date"
                          value={detailLastWorkingDay}
                          onChange={(e) => setDetailLastWorkingDay(e.target.value)}
                        />
                      </HrmField>
                      <HrmField label="Notes">
                        <Textarea
                          value={detailNotes}
                          onChange={(e) => setDetailNotes(e.target.value)}
                          placeholder="Internal notes"
                          rows={3}
                        />
                      </HrmField>
                    </div>
                  </HrmRefDetailSection>
                ) : null}

                <HrmRefDetailSection title="Workflow stages">
                  <div className="space-y-2">
                    {EXIT_WORKFLOW_STAGES.map((label, index) => {
                      const step = index + 1;
                      const done = step <= detail.stage;
                      return (
                        <div key={label} className="flex items-center gap-2">
                          <div
                            className={`size-5 rounded-full flex items-center justify-center shrink-0 ${
                              done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {done ? <Check className="size-3" /> : <span className="text-[10px]">{step}</span>}
                          </div>
                          <span className={`text-xs ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </HrmRefDetailSection>

                {(detail.assignedAssetCount ?? 0) > 0 || detail.assets?.length ? (
                  <HrmRefDetailSection title="Assigned assets">
                    <HrmRefDetailRow
                      label="Pending return"
                      value={
                        detail.assetReturnComplete
                          ? "Complete"
                          : `${detail.assignedAssetCount ?? detail.assets?.length ?? 0} item(s)`
                      }
                    />
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(detail.assets ?? []).map((a) => (
                        <li key={a.id} className="font-mono">
                          {a.tag} · {a.brand}
                        </li>
                      ))}
                    </ul>
                  </HrmRefDetailSection>
                ) : null}

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                  {canDelete ? (
                    <Button
                      variant="outline"
                      className="text-destructive w-full sm:w-auto"
                      onClick={() => {
                        setCancelTarget(detail);
                        setDetailId(null);
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Cancel workflow
                    </Button>
                  ) : null}
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    {canApprove && detail.approvalStatus === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          className={portalActionButtonClass()}
                          onClick={() => void handleApprove(detail)}
                          disabled={approveExit.isPending}
                        >
                          Approve exit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectDialog(detail)}
                          disabled={rejectExit.isPending}
                        >
                          Reject exit
                        </Button>
                      </>
                    ) : null}
                    {canEdit ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleSaveDetail} disabled={updateExit.isPending}>
                          Save details
                        </Button>
                        {detail.approvalStatus === "approved" && detail.stage < EXIT_WORKFLOW_STAGES.length ? (
                          <Button size="sm" className={portalActionButtonClass()} onClick={handleAdvance} disabled={advanceExit.isPending}>
                            Advance stage
                          </Button>
                        ) : null}
                        {!detail.assetReturnComplete && (detail.assignedAssetCount ?? 0) > 0 ? (
                          <Button size="sm" variant="outline" onClick={handleReturnAssets} disabled={returnAssets.isPending}>
                            <Package className="size-3.5 mr-1" />
                            Return assets
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={handleToggleFnf} disabled={updateExit.isPending}>
                          {detail.fnfSettled ? "Mark FnF pending" : "Mark FnF settled"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Start exit workflow</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <HrmField label="Employee">
                <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name} {e.employeeId ? `(${e.employeeId})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Reason">
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  placeholder="Why is this exit being started?"
                />
              </HrmField>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Resignation date">
                  <Input
                    type="date"
                    value={form.resignationDate}
                    onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
                  />
                </HrmField>
                <HrmField label="Notice period (days)">
                  <Input
                    type="number"
                    min={0}
                    value={form.noticePeriodDays}
                    onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })}
                  />
                </HrmField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Last working day">
                  <Input
                    type="date"
                    value={form.lastWorkingDay}
                    onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
                  />
                </HrmField>
              </div>
              <HrmField label="Notes (optional)">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className={portalActionButtonClass()} onClick={submitCreate} disabled={createExit.isPending}>
                Start workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel exit workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                Cancel offboarding for {cancelTarget?.employeeName}. The employee record stays active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep active</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancel}>Cancel workflow</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject exit request?</AlertDialogTitle>
              <AlertDialogDescription>
                Reject offboarding for {rejectTarget?.employeeName}. The workflow will be cancelled and the employee stays active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <HrmField label="Rejection reason">
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this exit is not approved"
                  rows={3}
                />
              </HrmField>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectReason("")}>Back</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  void handleReject();
                }}
              >
                Reject exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
