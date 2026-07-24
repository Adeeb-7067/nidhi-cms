import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, CheckSquare, Clock, Loader2, ListChecks, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarketingTasks,
  useCreateMarketingTask,
  useUpdateMarketingTask,
  useDeleteMarketingTask,
  type MarketingTaskDto,
} from "@/api/marketing";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/modules/marketing/constants";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingStatusBadge,
  MarketingEmptyState,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingAssigneeField,
  MarketingChipTabs,
  resolveFormAssigneeId,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { useDigitalAssigneeGate } from "@/modules/marketing/use-digital-assignee-gate";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";


const emptyForm = {
  title: "",
  accountId: "",
  category: "content" as TaskCategory,
  priority: "medium" as TaskPriority,
  status: "not_started" as TaskStatus,
  deadline: "",
  assigneeId: "",
  estimatedHours: "",
  description: "",
};

export default function MarketingTasks() {
  const { can } = usePermissions();
  const canEdit = can("marketing_tasks", "edit");
  const canDelete = can("marketing_tasks", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");

  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingTaskDto | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MarketingTaskDto | null>(null);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const formAccountId = form.accountId ? Number(form.accountId) : accountFilterId;
  const { user, canAssignOthers, isElevatedLead } = useDigitalAssigneeGate(formAccountId);
  const isManagerOrAdmin = isElevatedLead;
  const isFullEditAllowed =
    !editing ||
    isManagerOrAdmin ||
    canAssignOthers ||
    (editing.createdBy != null && Number(editing.createdBy) === Number(user?.id));

  const { data, isLoading, isError } = useMarketingTasks(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createTask = useCreateMarketingTask();
  const updateTask = useUpdateMarketingTask();
  const deleteTask = useDeleteMarketingTask();
  const tasks = data?.tasks ?? [];
  const saving = createTask.isPending || updateTask.isPending;

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.clientName ?? "").toLowerCase().includes(q) ||
        (t.assignee ?? "").toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || t.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length };
    for (const s of TASK_STATUS_ORDER) {
      counts[s] = tasks.filter((t) => t.status === s).length;
    }
    return counts;
  }, [tasks]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: statusCounts.all },
      ...TASK_STATUS_ORDER.map((s) => ({
        value: s,
        label: TASK_STATUS_LABELS[s],
        count: statusCounts[s] ?? 0,
      })),
    ],
    [statusCounts],
  );

  const kpis = useMemo(
    () => ({
      total: statusCounts.all ?? 0,
      inProgress: statusCounts.in_progress ?? 0,
      waitingApproval: statusCounts.waiting_client_approval ?? 0,
      completed: statusCounts.completed ?? 0,
    }),
    [statusCounts],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      accountId: projectFilter || "",
      assigneeId: canAssignOthers ? "" : user?.id != null ? String(user.id) : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (t: MarketingTaskDto) => {
    setEditing(t);
    setForm({
      title: t.title,
      accountId: String(t.accountId),
      category: t.category,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline?.slice(0, 10) ?? "",
      assigneeId: t.assigneeId != null ? String(t.assigneeId) : "",
      estimatedHours: t.estimatedHours != null ? String(t.estimatedHours) : "",
      description: t.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.deadline) {
      toast.error("Title and deadline are required");
      return;
    }
    try {
      const assigneeId = resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id);
      if (editing) {
        await updateTask.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: {
            title: form.title.trim(),
            category: form.category,
            priority: form.priority,
            status: form.status,
            deadline: form.deadline,
            assigneeId,
            estimatedHours: Number(form.estimatedHours) || 0,
            description: form.description.trim() || null,
          },
        });
        toast.success("Task updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createTask.mutateAsync({
          accountId: Number(form.accountId),
          title: form.title.trim(),
          category: form.category,
          priority: form.priority,
          deadline: form.deadline,
          status: form.status,
          assigneeId,
          estimatedHours: Number(form.estimatedHours) || 0,
          description: form.description.trim() || undefined,
        });
        toast.success("Task created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update task" : "Failed to create task");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Task deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete task");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title={isManagerOrAdmin || canAssignOthers ? "Daily tasks" : "My tasks"}
        description={
          isManagerOrAdmin || canAssignOthers
            ? "Team task board — status, priority, deadlines, and estimated hours"
            : "Tasks assigned to you — status, priority, deadlines, and estimated hours"
        }
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Tasks" }]}
        actions={
          can("marketing_tasks", "create") ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New task
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total tasks", value: kpis.total, icon: ListChecks, accent: "blue", delay: 0 },
          { title: "In progress", value: kpis.inProgress, icon: PlayCircle, accent: "amber", delay: 1 },
          { title: "Waiting approval", value: kpis.waitingApproval, icon: Clock, accent: "violet", delay: 2 },
          { title: "Completed", value: kpis.completed, icon: CheckSquare, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search tasks, projects, assignees…">
        <DigitalProjectSelect
          allowAll
          value={projectFilter}
          onValueChange={setProjectFilter}
          className="h-8 w-[220px] text-xs"
        />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs />
      ) : isError ? (
        <MarketingEmptyState icon={CheckSquare} title="Couldn’t load tasks" description="Check API permissions and try again." />
      ) : filtered.length === 0 ? (
        <MarketingEmptyState
          icon={CheckSquare}
          title="No tasks found"
          description="Adjust filters or create a new task."
          onAction={can("marketing_tasks", "create") ? openCreate : undefined}
          actionLabel="Add task"
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Task</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Deadline</TableHead>
                <TableHead className="text-xs text-right">Est. hours</TableHead>
                {showActions && <TableHead className="text-xs text-right w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{t.title}</TableCell>
                  <TableCell className="text-xs">{TASK_CATEGORY_LABELS[t.category]}</TableCell>
                  <TableCell className="text-xs">{t.clientName}</TableCell>
                  <TableCell className="text-xs">{t.assignee || "—"}</TableCell>
                  <TableCell><MarketingStatusBadge variant="task" status={t.status} /></TableCell>
                  <TableCell><MarketingStatusBadge variant="priority" status={t.priority} /></TableCell>
                  <TableCell className="text-xs">
                    {t.deadline ? format(new Date(t.deadline), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right">{t.estimatedHours}h</TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <MarketingRowActions
                        canEdit={canEdit}
                        canDelete={
                          canDelete &&
                          (isManagerOrAdmin ||
                            (t.createdBy != null && Number(t.createdBy) === Number(user?.id)))
                        }
                        onEdit={() => openEdit(t)}
                        onDelete={() => setDeleteTarget(t)}
                      />
                    </TableCell>
                  )}

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isFullEditAllowed
                  ? "Edit task"
                  : "Update task status"
                : "New digital task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!isFullEditAllowed && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                You are assigned to this task. You can update its progress status below.
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                disabled={!isFullEditAllowed}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">Digital project</Label>
                <DigitalProjectSelect
                  value={form.accountId}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                  className="h-8 w-full text-xs"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select
                  value={form.category}
                  disabled={!isFullEditAllowed}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as TaskCategory }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_CATEGORY_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={form.priority}
                  disabled={!isFullEditAllowed}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  disabled={!isFullEditAllowed}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Assignee</Label>
                <MarketingAssigneeField
                  accountId={formAccountId}
                  value={form.assigneeId}
                  disabled={!isFullEditAllowed}
                  onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated hours</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.estimatedHours}
                  disabled={!isFullEditAllowed}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                disabled={!isFullEditAllowed}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete task?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
        loading={deleteTask.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
