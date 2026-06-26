import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, LogOut, Plus, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
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
  HrmRefStatusPill,
} from "@/modules/hrm/hrm-reference-kit";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import { EXIT_WORKFLOW_STAGES, exitNoticeTone } from "@/modules/hrm/exit-constants";
import {
  useAdvanceExitRequest,
  useCancelExitRequest,
  useCreateExitRequest,
  useHrmEmployees,
  useHrmExitRequest,
  useHrmExitRequests,
  useReturnExitAssets,
  useUpdateExitRequest,
} from "@/api/hrm";
import type { HrmExitRequest } from "@/modules/hrm/types";

type ExitForm = {
  userId: string;
  reason: string;
  resignationDate: string;
  lastWorkingDay: string;
  notes: string;
};

const emptyForm = (): ExitForm => ({
  userId: "",
  reason: "",
  resignationDate: format(new Date(), "yyyy-MM-dd"),
  lastWorkingDay: "",
  notes: "",
});

export default function HrmExitPage() {
  const canCreate = useHrmPermission("exit", "create");
  const canEdit = useHrmPermission("exit", "edit");
  const canDelete = useHrmPermission("exit", "delete");

  const { data, isLoading, refetch, isFetching } = useHrmExitRequests("active");
  const { data: employeesData } = useHrmEmployees({ status: "active", limit: 500 });
  const createExit = useCreateExitRequest();
  const updateExit = useUpdateExitRequest();
  const advanceExit = useAdvanceExitRequest();
  const returnAssets = useReturnExitAssets();
  const cancelExit = useCancelExitRequest();

  const requests = data?.requests ?? [];
  const employees = employeesData?.employees ?? [];

  const [detailId, setDetailId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<HrmExitRequest | null>(null);
  const [form, setForm] = useState<ExitForm>(emptyForm);

  const { data: detailData, isLoading: detailLoading } = useHrmExitRequest(detailId ?? undefined, {
    enabled: detailId != null,
  });
  const detail = detailData?.request ?? null;

  const kpiItems = useMemo(() => {
    const avgNotice =
      requests.length > 0
        ? Math.round(requests.reduce((sum, r) => sum + r.noticeDaysRemaining, 0) / requests.length)
        : 0;
    const finalStage = requests.filter((r) => r.stage >= 5).length;
    return [
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
    if (!form.userId || !form.reason.trim() || !form.resignationDate || !form.lastWorkingDay) {
      toast.error("Employee, reason, and dates are required");
      return;
    }
    try {
      const created = await createExit.mutateAsync({
        userId: Number(form.userId),
        reason: form.reason.trim(),
        resignationDate: form.resignationDate,
        lastWorkingDay: form.lastWorkingDay,
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

  const columns = useMemo((): Column<HrmExitRequest>[] => [
    {
      id: "employee",
      header: "Employee",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <HrmEmployeeAvatar name={r.employeeName} avatarUrl={r.employeeAvatarUrl} className="h-7 w-7" />
          <div>
            <p className="text-xs font-semibold">{r.employeeName}</p>
            <p className="text-[10px] text-muted-foreground">{r.employeeDesignation ?? r.employeeCode ?? "—"}</p>
          </div>
        </div>
      ),
      exportValue: (r) => r.employeeName,
    },
    {
      id: "reason",
      header: "Reason",
      cell: (r) => <span className="text-xs">{r.reason}</span>,
    },
    {
      id: "resigned",
      header: "Resigned",
      cell: (r) => (
        <span className="text-xs tabular-nums">{format(new Date(r.resignationDate), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "lwd",
      header: "Last day",
      cell: (r) => (
        <span className="text-xs tabular-nums">{format(new Date(r.lastWorkingDay), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "notice",
      header: "Notice left",
      cell: (r) => (
        <HrmRefStatusPill tone={exitNoticeTone(r.noticeDaysRemaining)}>
          {r.noticeDaysRemaining}d
        </HrmRefStatusPill>
      ),
    },
    {
      id: "stage",
      header: "Stage",
      cell: (r) => (
        <span className="text-xs">
          {r.stageLabel} ({r.stage}/{r.stageCount})
        </span>
      ),
    },
  ], []);

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
                  <HrmRefDetailRow label="Notice remaining" value={`${detail.noticeDaysRemaining} days`} />
                  <HrmRefDetailRow label="Reason" value={detail.reason} />
                </HrmRefDetailSection>

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
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                      {detail.stage < EXIT_WORKFLOW_STAGES.length ? (
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
                    </div>
                  ) : null}
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
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </HrmField>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Resignation date">
                  <Input
                    type="date"
                    value={form.resignationDate}
                    onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
                  />
                </HrmField>
                <HrmField label="Last working day">
                  <Input
                    type="date"
                    value={form.lastWorkingDay}
                    onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
                  />
                </HrmField>
              </div>
              <HrmField label="Notes (optional)">
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
      </HrmPageShell>
    </HrmGate>
  );
}
