import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useCaTasks, useDeleteCaTask, type CaTaskDto } from "@/api/ca";
import { TASK_STATUS_LABELS } from "@/modules/ca/constants";
import type { CaTaskStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRowActions, CaTaskFormModal } from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const statusTone: Record<CaTaskStatus, "warning" | "info" | "success"> = {
  pending: "warning",
  in_progress: "info",
  completed: "success",
};

const priorityTone = {
  low: "muted",
  medium: "warning",
  high: "danger",
} as const;

export default function Tasks() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data, isLoading, isError, refetch } = useCaTasks({ limit: 200 });
  const deleteTask = useDeleteCaTask();
  const crud = useCaListCrud<CaTaskDto>();

  const tasks = data?.tasks ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        t.assignedBy.toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab, tasks]);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

  const columns = useMemo<CmsColumn<CaTaskDto>[]>(
    () => [
      {
        id: "title",
        header: "Task",
        cell: (t) => <span className="font-medium max-w-[220px] block truncate">{t.title}</span>,
      },
      { id: "category", header: "Category", cell: (t) => t.category },
      { id: "from", header: "From", cell: (t) => t.assignedBy },
      { id: "to", header: "To", cell: (t) => t.assignedTo },
      {
        id: "priority",
        header: "Priority",
        chip: true,
        cell: (t) => (
          <CmsStatusChip label={t.priority} tone={priorityTone[t.priority]} className="capitalize" />
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (t) => (
          <CmsStatusChip label={TASK_STATUS_LABELS[t.status]} tone={statusTone[t.status]} />
        ),
      },
      {
        id: "due",
        header: "Due",
        cell: (t) =>
          t.dueDate ? (
            <span className="text-muted-foreground">{format(new Date(t.dueDate), "MMM d, yyyy")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: (t) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => crud.openView(t)}
            onEdit={() => crud.openEdit(t)}
            onDelete={() => crud.setDeleteTarget(t)}
          />
        ),
      },
    ],
    [canEdit, canDelete, crud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="CA task management"
        description="CEO → CA → Accountant assignment chain"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Tasks" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={crud.openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add task
            </Button>
          ) : null
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search tasks, assignees…" />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.all },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "in_progress", label: "In progress", count: counts.in_progress },
          { value: "completed", label: "Completed", count: counts.completed },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(t) => t.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: ListTodo,
          title: "No tasks found",
          description: "Create a CA task to get started.",
          actionLabel: canCreate ? "Add task" : undefined,
          onAction: canCreate ? crud.openCreate : undefined,
        }}
      />
      <CaTaskFormModal open={crud.dialogOpen} onOpenChange={crud.closeDialog} editing={crud.editing} readOnly={crud.readOnly} />
      <CmsConfirmDialog
        open={!!crud.deleteTarget}
        onOpenChange={(open) => !open && crud.setDeleteTarget(null)}
        title="Delete task?"
        description="This soft-deletes the CA task."
        loading={deleteTask.isPending}
        onConfirm={() => {
          if (!crud.deleteTarget) return;
          deleteTask.mutate(crud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Task deleted");
              crud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete task"),
          });
        }}
      />
    </PortalPageShell>
  );
}
