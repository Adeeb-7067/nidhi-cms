import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ListTodo } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockCaTasks } from "@/modules/ca/mock-data";
import { TASK_STATUS_LABELS } from "@/modules/ca/constants";
import type { CaTask, CaTaskStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

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
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaTasks.filter((t) => {
      const matchesSearch =
        !q || t.title.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  const counts = useMemo(() => {
    const all = mockCaTasks.length;
    return {
      all,
      pending: mockCaTasks.filter((t) => t.status === "pending").length,
      in_progress: mockCaTasks.filter((t) => t.status === "in_progress").length,
      completed: mockCaTasks.filter((t) => t.status === "completed").length,
    };
  }, []);

  const columns = useMemo<CmsColumn<CaTask>[]>(
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
          <CmsStatusChip
            label={t.priority}
            tone={priorityTone[t.priority]}
            className="capitalize"
          />
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
        cell: (t) => (
          <span className="text-muted-foreground">{format(new Date(t.dueDate), "MMM d, yyyy")}</span>
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="CA task management"
        description="CEO → CA → Accountant assignment chain"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Tasks" }]}
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
        empty={{ icon: ListTodo, title: "No tasks found" }}
      />
    </PortalPageShell>
  );
}
