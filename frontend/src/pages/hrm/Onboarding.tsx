import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle2, ClipboardList, Plus, Rocket, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
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
import type { HrmOnboardingRecord, HrmOnboardingTaskItem } from "@/modules/hrm/types";

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
  const [detailTasks, setDetailTasks] = useState<HrmOnboardingTaskItem[]>([]);
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

  const buddyOptionsForCreate = useMemo(
    () => buddyEmployees.filter((e) => !userId || e.id !== Number(userId)),
    [buddyEmployees, userId],
  );

  const buddyOptionsForDetail = useMemo(
    () => buddyEmployees.filter((e) => !selected || e.id !== selected.userId),
    [buddyEmployees, selected],
  );

  const resetCreateForm = () => {
    setUserId("");
    setBuddyId("none");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
  };

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
      resetCreateForm();
      return;
    }
    const recruitmentHire = eligibleEmployees.find((e) => e.recruitmentOnboarding);
    if (recruitmentHire) {
      setUserId(String(recruitmentHire.id));
    } else if (eligibleEmployees.length === 1) {
      setUserId(String(eligibleEmployees[0].id));
    }
  }, [createOpen, eligibleEmployees]);

  useEffect(() => {
    if (buddyId !== "none" && userId && buddyId === userId) {
      setBuddyId("none");
    }
  }, [userId, buddyId]);

  useEffect(() => {
    setDetailTasks(selected?.tasks ?? []);
  }, [selected]);

  const detailProgress = useMemo(() => {
    if (detailTasks.length === 0) return selected?.progress ?? 0;
    const done = detailTasks.filter((t) => t.completed).length;
    return Math.round((done / detailTasks.length) * 100);
  }, [detailTasks, selected?.progress]);

  const handleCreate = async () => {
    if (!userId) {
      toast.error("Select an employee");
      return;
    }
    if (!startDate.trim()) {
      toast.error("Start date is required");
      return;
    }
    try {
      const result = await createRecord.mutateAsync({
        userId: Number(userId),
        buddyId: buddyId === "none" ? null : Number(buddyId),
        startDate,
      });
      toast.success("Onboarding started");
      setCreateOpen(false);
      resetCreateForm();
      if (result.record?.id) {
        setDetailId(result.record.id);
      }
    } catch {
      // mutation toast
    }
  };

  const handleToggleTask = (record: HrmOnboardingRecord, taskIndex: number) => {
    const previous = detailTasks;
    setDetailTasks((tasks) =>
      tasks.map((task, i) =>
        i === taskIndex ? { ...task, completed: !task.completed } : task,
      ),
    );
    toggleTask.mutate(
      { recordId: record.id, taskIndex },
      {
        onSuccess: (data) => {
          setDetailTasks(data.record.tasks ?? []);
          toast.success("Task updated");
        },
        onError: () => {
          setDetailTasks(previous);
        },
      },
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
    // Capture before any state resets so async closure is safe
    const target = deleteTarget;
    setDeleteTarget(null);
    setDetailId(null);
    try {
      await deleteRecord.mutateAsync(target.id);
      toast.success("Onboarding removed");
    } catch {
      // error toast handled by useHrmMutation
    }
  };

  const columns = useMemo((): Column<HrmOnboardingRecord>[] => [
    {
      id: "employee",
      header: "New hire",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <HrmEmployeeAvatar name={r.employeeName} avatarUrl={r.employeeAvatarUrl} className="h-8 w-8" />
          <div>
            <p className="font-medium">{r.employeeName}</p>
            <p className="text-[11px] text-muted-foreground">{r.employeeDesignation ?? r.employeeCode ?? "—"}</p>
          </div>
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
      exportValue: (r) => format(new Date(r.startDate), "MMM d, yyyy"),
    },
    {
      id: "buddy",
      header: "Buddy",
      cell: (r) => <span className="text-xs">{r.buddyName ?? "—"}</span>,
      exportValue: (r) => r.buddyName ?? "",
    },
    {
      id: "progress",
      header: "Progress",
      cell: (r) => <OnboardingProgress value={r.progress} />,
      exportValue: (r) => `${r.progress}%`,
    },
    {
      id: "tasks",
      header: "Tasks",
      cell: (r) => {
        const tasks = r.tasks ?? [];
        return (
          <span className="text-xs tabular-nums">
            {tasks.filter((t) => t.completed).length}/{tasks.length}
          </span>
        );
      },
      exportValue: (r) => {
        const tasks = r.tasks ?? [];
        return `${tasks.filter((t) => t.completed).length}/${tasks.length}`;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className={r.status === "complete" ? "text-green-600" : ""}>
          {r.status === "complete" ? "Complete" : "Active"}
        </Badge>
      ),
      exportValue: (r) => (r.status === "complete" ? "Complete" : "Active"),
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

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }}
        >
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
                <Select
                  value={userId || undefined}
                  onValueChange={setUserId}
                  disabled={eligibleLoading || eligibleEmployees.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        eligibleLoading
                          ? "Loading employees…"
                          : eligibleEmployees.length === 0
                            ? "No eligible employees"
                            : "Select employee"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEmployees.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        No employees available for onboarding
                      </SelectItem>
                    ) : (
                      eligibleEmployees.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
                          {e.employeeId ? ` (${e.employeeId})` : ""}
                          {e.recruitmentOnboarding ? " · Recruitment" : ""}
                          {e.status !== "active" ? " · Inactive" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </HrmField>
              {!eligibleLoading && eligibleEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create the employee from{" "}
                  <Link href="/hrm/recruitment" className="text-primary underline-offset-2 hover:underline">
                    Recruitment
                  </Link>{" "}
                  or activate them in Team first. Employees who already have a checklist are hidden.
                </p>
              ) : null}
              <HrmField label="Buddy (optional)">
                <Select value={buddyId} onValueChange={setBuddyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign buddy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {buddyOptionsForCreate.map((e) => (
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
                disabled={
                  createRecord.isPending || eligibleLoading || eligibleEmployees.length === 0 || !userId
                }
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
                {selected.candidateName ? (
                  <p className="text-xs text-muted-foreground">
                    Recruitment candidate: <span className="font-medium text-foreground">{selected.candidateName}</span>
                  </p>
                ) : null}
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Start date</p>
                    <p>{format(new Date(selected.startDate), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Progress</p>
                    <OnboardingProgress value={detailProgress} />
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
                        {buddyOptionsForDetail.map((e) => (
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
                  {detailTasks.map((task, i) => (
                    <li key={`${task.title}-${i}`}>
                      <label
                        className={`flex w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-left ${
                          canEdit ? "cursor-pointer hover:bg-muted/40" : "opacity-60"
                        }`}
                      >
                        <Checkbox
                          checked={task.completed}
                          disabled={!canEdit || toggleTask.isPending}
                          onCheckedChange={() => handleToggleTask(selected, i)}
                        />
                        <span
                          className={`text-sm ${
                            task.completed ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </label>
                    </li>
                  ))}
                  {detailTasks.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No checklist tasks yet.
                    </p>
                  )}
                </ul>

                {canDelete ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-destructive"
                    onClick={() => {
                      // Close detail dialog first so AlertDialog never stacks on top of it
                      setDetailId(null);
                      setDeleteTarget(selected);
                    }}
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
