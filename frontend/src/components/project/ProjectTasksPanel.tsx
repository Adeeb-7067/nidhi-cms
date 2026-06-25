import { useMemo, useState } from "react";
import type { WorkTask } from "@/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DataPagination } from "@/components/ui/data-pagination";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Loading tasks…
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
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
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} task{rows.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[130px]">Assignee</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[90px]">Priority</TableHead>
              <TableHead className="w-[90px]">Type</TableHead>
              <TableHead className="w-[100px]">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                  {tasks.length === 0 ? "No tasks for this project yet." : "No tasks match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((task) => (
                <TableRow key={task.id} className="text-sm">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {task.taskNumber}
                  </TableCell>
                  <TableCell className="font-medium max-w-[240px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs truncate max-w-[120px]">
                    {task.assigneeName ?? <span className="italic">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${taskStatusClass(task.status)}`}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${taskPriorityClass(task.priority)}`}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {TASK_TYPE_LABELS[task.type]}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination {...pagination} />
    </div>
  );
}
