import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Check, CheckCircle2, ClipboardList, Plus, Rocket, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  hrmRefCountSubtitle,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import {
  useCreateOnboardingRecord,
  useDeleteOnboardingRecord,
  useHrmEmployees,
  useHrmOnboardingRecords,
  useOnboardingEligibleEmployees,
  useToggleOnboardingTask,
  useUpdateOnboardingRecord,
} from "@/api/hrm";
import type { HrmOnboardingRecord } from "@/modules/hrm/types";

function OnboardingProgress({ value }: { value: number }) {
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <Progress value={value} className="h-1.5 flex-1" />
      <span className="w-8 text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

export default function HrmOnboardingPage() {
  const canCreate = useHrmPermission("onboarding", "create");
  const canEdit = useHrmPermission("onboarding", "edit");
  const canDelete = useHrmPermission("onboarding", "delete");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrmOnboardingRecord | null>(null);
  const [userId, setUserId] = useState("");
  const [buddyId, setBuddyId] = useState("none");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, refetch, isFetching } = useHrmOnboardingRecords();
  const { data: eligibleData, isLoading: eligibleLoading } = useOnboardingEligibleEmployees({
    enabled: createOpen,
  });
  const { data: employeesData } = useHrmEmployees({ status: "active", limit: 500 });
  const createRecord = useCreateOnboardingRecord();
  const updateRecord = useUpdateOnboardingRecord();
  const toggleTask = useToggleOnboardingTask();
  const deleteRecord = useDeleteOnboardingRecord();

  const records = data?.records ?? [];
  const eligibleEmployees = eligibleData?.employees ?? [];
  const buddyEmployees = employeesData?.employees ?? [];

  const selected = useMemo(
    () => records.find((r) => r.id === detailId) ?? null,
    [records, detailId],
  );

  const kpiItems = useMemo(() => {
    const active = records.filter((r) => r.status === "active").length;
    const complete = records.filter((r) => r.status === "complete").length;
    const avg =
      records.length > 0
        ? Math.round(records.reduce((s, r) => s + r.progress, 0) / records.length)
        : 0;
    return [
      { label: "Active", value: active, icon: UserPlus, accent: "violet" as const },
      { label: "Avg progress", value: `${avg}%`, icon: ClipboardList, accent: "blue" as const },
      { label: "Complete", value: complete, icon: CheckCircle2, accent: "green" as const },
      { label: "Total", value: records.length, icon: Rocket, accent: "amber" as const },
    ];
  }, [records]);

  useEffect(() => {
    if (!createOpen) {
      setUserId("");
      setBuddyId("none");
      return;
    }
    const recruitmentHire = eligibleEmployees.find((e) => e.recruitmentOnboarding);
    if (recruitmentHire) {
      setUserId(String(recruitmentHire.id));
    }
  }, [createOpen, eligibleEmployees]);

  const handleCreate = async () => {
    if (!userId) {
      toast.error("Select an employee");
      return;
    }
    try {
      await createRecord.mutateAsync({
        userId: Number(userId),
        buddyId: buddyId === "none" ? null : Number(buddyId),
        startDate,
      });
      toast.success("Onboarding started");
      setCreateOpen(false);
      setUserId("");
      setBuddyId("none");
    } catch {
      // mutation toast
    }
  };

  const handleToggleTask = (record: HrmOnboardingRecord, taskIndex: number) => {
    toggleTask.mutate(
      { recordId: record.id, taskIndex },
      { onSuccess: () => toast.success("Task updated") },
    );
  };

  const handleBuddyChange = (record: HrmOnboardingRecord, value: string) => {
    updateRecord.mutate(
      {
        id: record.id,
        buddyId: value === "none" ? null : Number(value),
      },
      { onSuccess: () => toast.success("Buddy updated") },
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecord.mutateAsync(deleteTarget.id);
      toast.success("Onboarding removed");
      if (detailId === deleteTarget.id) setDetailId(null);
      setDeleteTarget(null);
    } catch {
      // mutation toast
    }
  };

  const columns = useMemo((): Column<HrmOnboardingRecord>[] => [
    {
      id: "employee",
      header: "New hire",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.employeeName}</p>
          <p className="text-[11px] text-muted-foreground">{r.employeeDesignation ?? r.employeeCode ?? "—"}</p>
        </div>
      ),
      exportValue: (r) => r.employeeName,
    },
    {
      id: "start",
      header: "Start date",
      cell: (r) => (
        <span className="text-xs tabular-nums">{format(new Date(r.startDate), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "buddy",
      header: "Buddy",
      cell: (r) => <span className="text-xs">{r.buddyName ?? "—"}</span>,
    },
    {
      id: "progress",
      header: "Progress",
      cell: (r) => <OnboardingProgress value={r.progress} />,
    },
    {
      id: "tasks",
      header: "Tasks",
      cell: (r) => (
        <span className="text-xs tabular-nums">
          {r.tasks.filter((t) => t.completed).length}/{r.tasks.length}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className={r.status === "complete" ? "text-green-600" : ""}>
          {r.status === "complete" ? "Complete" : "Active"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (r) => (
        <Button size="sm" variant="outline" onClick={() => setDetailId(r.id)}>
          Checklist
        </Button>
      ),
    },
  ], []);

  return (
    <HrmGate module="onboarding">
      <HrmPageShell>
        <HrmPageHero
          title="Onboarding"
          description={
            isLoading
              ? "Loading onboardings…"
              : `${hrmRefCountSubtitle(records.length, "onboarding")} · new hire checklists`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              {canCreate ? (
                <Button
                  size="sm"
                  className={portalActionButtonClass("h-8")}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Start onboarding
                </Button>
              ) : null}
            </div>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={records}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Filter new hires…"
            filename="HrmOnboardingExport"
            viewStorageKey="hrm-onboarding"
            onRowClick={(r) => setDetailId(r.id)}
          />
        </PortalTablePanel>

        {records.length === 0 && !isLoading ? (
          <p className="text-center text-sm text-muted-foreground">
            No onboarding records yet. Start from{" "}
            <Link href="/hrm/recruitment" className="text-primary underline-offset-2 hover:underline">
              Recruitment
            </Link>{" "}
            after creating the employee in Team, or use Start onboarding above.
          </p>
        ) : null}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start onboarding</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Includes active employees and new hires marked <strong>Onboarding</strong> in Recruitment
              (even if their account is still inactive).
            </p>
            <div className="space-y-4">
              <HrmField label="Employee">
                <Select value={userId} onValueChange={setUserId} disabled={eligibleLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={eligibleLoading ? "Loading employees…" : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEmployees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                        {e.employeeId ? ` (${e.employeeId})` : ""}
                        {e.recruitmentOnboarding ? " · Recruitment" : ""}
                        {e.status !== "active" ? " · Inactive" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Buddy (optional)">
                <Select value={buddyId} onValueChange={setBuddyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign buddy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {buddyEmployees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Start date">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                disabled={createRecord.isPending}
                onClick={() => void handleCreate()}
              >
                Start checklist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected?.employeeName ?? "Onboarding checklist"}</DialogTitle>
            </DialogHeader>
            {selected ? (
              <div className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Start date</p>
                    <p>{format(new Date(selected.startDate), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Progress</p>
                    <OnboardingProgress value={selected.progress} />
                  </div>
                </div>

                {canEdit ? (
                  <HrmField label="Buddy">
                    <Select
                      value={selected.buddyId != null ? String(selected.buddyId) : "none"}
                      onValueChange={(v) => handleBuddyChange(selected, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {buddyEmployees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HrmField>
                ) : (
                  <p className="text-sm">
                    Buddy: <span className="font-medium">{selected.buddyName ?? "—"}</span>
                  </p>
                )}

                <ul className="space-y-1.5">
                  {selected.tasks.map((task, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={!canEdit || toggleTask.isPending}
                        onClick={() => canEdit && handleToggleTask(selected, i)}
                        className="flex w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-left hover:bg-muted/40 disabled:opacity-60"
                      >
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded ${
                            task.completed
                              ? "bg-emerald-600 text-white"
                              : "border border-border bg-background"
                          }`}
                        >
                          {task.completed ? <Check className="size-3" /> : null}
                        </div>
                        <span
                          className={`text-sm ${
                            task.completed ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {canDelete ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-destructive"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove onboarding
                  </Button>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove onboarding?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `The checklist for "${deleteTarget.employeeName}" will be deleted.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteRecord.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteRecord.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
