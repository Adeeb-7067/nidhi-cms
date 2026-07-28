import { useMemo, useState } from "react";
import type { Bug } from "@/api";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS, BUG_STATUSES } from "@/lib/bug-workflow";
import { ArrowUpDown } from "lucide-react";
import {
  AssigneeAvatars,
} from "./assignee-avatars";
import { BugAttachmentThumb } from "./bug-attachments";
import {
  BugDisplayRow,
  BugExpandCellFull,
  BugFullActionsCell,
  BugFullProjectCell,
  BugFullTitleCell,
  BugLatestCommentCell,
  BugPriorityCell,
  BugStatusCell,
  BugUpdatedCell,
  bugDisplayRowClassName,
  bugDisplayRowKey,
  flattenBugRows,
} from "./bug-table-row";
import type { TablePaginationProps } from "@/lib/table-pagination";

type SortKey =
  | "projectName"
  | "title"
  | "priority"
  | "status"
  | "updatedAt";

export function BugTable({
  bugs,
  onRowClick,
  onEdit,
  onDelete,
  canEdit,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  pagination,
}: {
  bugs: Bug[];
  onRowClick: (bug: Bug) => void;
  onEdit?: (bug: Bug) => void;
  onDelete?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (v: string) => void;
  pagination: TablePaginationProps;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const sortedRows = useMemo(() => {
    const list = [...bugs];
    list.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "updatedAt") {
        av = new Date(a.updatedAt ?? a.createdAt).getTime();
        bv = new Date(b.updatedAt ?? b.createdAt).getTime();
      } else if (sortKey === "priority") {
        av = a.priority;
        bv = b.priority;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [bugs, sortKey, sortDir]);

  const displayRows = useMemo(
    () => flattenBugRows(sortedRows, expanded),
    [sortedRows, expanded],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHead = ({ label, col }: { label: string; col: SortKey }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide hover:text-foreground"
      onClick={() => toggleSort(col)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-50" />
    </button>
  );

  const toggleExpand = (bugId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(bugId)) next.delete(bugId);
      else next.add(bugId);
      return next;
    });
  };

  const columns = useMemo((): CmsColumn<BugDisplayRow>[] => {
    return [
      {
        id: "expand",
        header: "",
        className: "w-8",
        cell: (row) => (
          <BugExpandCellFull
            row={row}
            expanded={expanded.has(row.id)}
            onToggleExpand={row.isChild ? undefined : () => toggleExpand(row.id)}
          />
        ),
      },
      {
        id: "project",
        header: <SortHead label="Project" col="projectName" />,
        className: "w-[140px]",
        cell: (row) => <BugFullProjectCell row={row} />,
      },
      {
        id: "developers",
        header: "Developers",
        className: "min-w-[120px]",
        cell: (row) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <AssigneeAvatars assignees={row.assignees} />
          </div>
        ),
      },
      {
        id: "title",
        header: <SortHead label="Description" col="title" />,
        className: "min-w-[160px]",
        cell: (row) => <BugFullTitleCell row={row} />,
      },
      {
        id: "priority",
        header: <SortHead label="Priority" col="priority" />,
        chip: true,
        cell: (row) => <BugPriorityCell row={row} />,
      },
      {
        id: "comment",
        header: "Latest comment",
        className: "min-w-[140px]",
        cell: (row) => <BugLatestCommentCell row={row} />,
      },
      {
        id: "status",
        header: "QA · Dev · Final",
        chip: true,
        className: "min-w-[140px]",
        cell: (row) => <BugStatusCell row={row} />,
      },
      {
        id: "files",
        header: "Files",
        className: "w-[72px]",
        cell: (row) => <BugAttachmentThumb attachments={row.attachments} />,
      },
      {
        id: "updated",
        header: <SortHead label="Updated" col="updatedAt" />,
        cell: (row) => <BugUpdatedCell row={row} />,
      },
      {
        id: "actions",
        header: "",
        className: "w-[80px]",
        align: "right",
        cell: (row) => (
          <BugFullActionsCell
            row={row}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
          />
        ),
      },
    ];
  }, [sortKey, sortDir, expanded, onRowClick, onEdit, onDelete, canEdit]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search project, title, comment…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 text-xs bg-muted/30 border-border/60 max-w-md"
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="resolved">Resolved (final)</SelectItem>
            {BUG_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(["p1", "p2", "p3", "p4"] as const).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CmsDataTable
        columns={columns}
        rows={displayRows}
        rowKey={bugDisplayRowKey}
        embedded
        empty={{ title: "No bugs match your filters" }}
        onRowClick={onRowClick}
        getRowClassName={bugDisplayRowClassName}
        pagination={{
          page: pagination.page,
          total: pagination.total,
          limit: pagination.limit,
          loadedRowCount: bugs.length,
          onPageChange: pagination.onPageChange,
          onLimitChange: pagination.onLimitChange,
          pageSizeOptions: pagination.pageSizeOptions,
        }}
      />
    </div>
  );
}
