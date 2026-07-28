import { useMemo, useState } from "react";
import type { WorkTask } from "@/api";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  taskStatusClass,
  taskPriorityClass,
} from "@/lib/task-ui";
import { Search, X } from "lucide-react";

interface ProjectTasksPanelProps {
  tasks: WorkTask[];
  isLoading?: boolean;
}

export function ProjectTasksPanel({ tasks, isLoading }: ProjectTasksPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const rows = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.taskNumber.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, typeFilter]);

  const { pageItems, pagination } = useClientPagination(rows, DEFAULT_TABLE_PAGE_SIZE);

  const hasFilters = search || statusFilter !== "all" || typeFilter !== "all";

  const columns = useMemo((): CmsColumn<WorkTask>[] => [
    {
      id: "number",
      header: "#",
      className: "w-[90px]",
      cell: (task) => (
        <span className="font-mono text-muted-foreground">{task.taskNumber}</span>
      ),
    },
    {
      id: "title",
      header: "Title",
      cell: (task) => (
        <span className="font-medium max-w-[240px] truncate block">{task.title}</span>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      className: "w-[130px]",
      cell: (task) => (
        <span className="text-muted-foreground truncate max-w-[120px] block">
          {task.assigneeName ?? <span className="italic">Unassigned</span>}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      className: "w-[110px]",
      cell: (task) => (
        <Badge variant="outline" className={`text-xs ${taskStatusClass(task.status)}`}>
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
      ),
    },
    {
      id: "priority",
      header: "Priority",
      chip: true,
      className: "w-[90px]",
      cell: (task) => (
        <Badge variant="outline" className={`text-xs ${taskPriorityClass(task.priority)}`}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>
      ),
    },
    {
      id: "type",
      header: "Type",
      className: "w-[90px]",
      cell: (task) => (
        <span className="text-muted-foreground">{TASK_TYPE_LABELS[task.type]}</span>
      ),
    },
    {
      id: "due",
      header: "Due",
      className: "w-[100px]",
      cell: (task) => (
        <span className="text-muted-foreground">
          {task.dueDate
            ? new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
  ], []);

  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {(Object.keys(TASK_STATUS_LABELS) as WorkTask["status"][]).map((s) => (
            <SelectItem key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-[120px] h-8 text-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {(Object.keys(TASK_TYPE_LABELS) as WorkTask["type"][]).map((t) => (
            <SelectItem key={t} value={t}>
              {TASK_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setTypeFilter("all");
          }}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        {rows.length} task{rows.length !== 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="space-y-3 p-3">
      <CmsDataTable
        columns={columns}
        rows={pageItems}
        rowKey={(task) => task.id}
        isLoading={isLoading}
        embedded
        toolbar={filterToolbar}
        empty={{
          title: tasks.length === 0 ? "No tasks for this project yet." : "No tasks match your filters.",
        }}
        getRowClassName={() => "text-sm"}
        pagination={pagination}
      />
    </div>
  );
}
