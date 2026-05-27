import React, { useMemo, useState } from "react";
import type { Bug } from "@/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS, BUG_STATUSES } from "@/lib/bug-workflow";
import { cn } from "@/lib/utils";
import { ArrowUpDown } from "lucide-react";
import { BugTableRow } from "./bug-table-row";
import { DataPagination } from "@/components/ui/data-pagination";
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search project, title, comment…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 text-xs bg-muted/30 border-border/60 max-w-md"
        />
        <Select
          value={statusFilter}
          onValueChange={onStatusFilterChange}
        >
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
        <Select
          value={priorityFilter}
          onValueChange={onPriorityFilterChange}
        >
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

      <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto flex-1 min-h-0">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-md shadow-sm">
              <TableRow className="hover:bg-transparent border-border/60">
                <TableHead className="w-8" />
                <TableHead className="w-[140px]">
                  <SortHead label="Project" col="projectName" />
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <span className="text-[10px] font-semibold uppercase">Developers</span>
                </TableHead>
                <TableHead className="min-w-[160px]">
                  <SortHead label="Description" col="title" />
                </TableHead>
                <TableHead>
                  <SortHead label="Priority" col="priority" />
                </TableHead>
                <TableHead className="min-w-[140px]">Latest comment</TableHead>
                <TableHead className="min-w-[140px]">
                  <span className="text-[10px] font-semibold uppercase">QA · Dev · Final</span>
                </TableHead>
                <TableHead className="w-[72px]">Files</TableHead>
                <TableHead>
                  <SortHead label="Updated" col="updatedAt" />
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                    No bugs match your filters
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.flatMap((bug) => {
                  const childCount = bug.childCount ?? bug.children?.length ?? 0;
                  const isOpen = expanded.has(bug.id);
                  const rows = [
                    <BugTableRow
                      key={bug.id}
                      bug={bug}
                      childCount={childCount}
                      expanded={isOpen}
                      onToggleExpand={() => {
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(bug.id)) next.delete(bug.id);
                          else next.add(bug.id);
                          return next;
                        });
                      }}
                      onRowClick={onRowClick}
                      onEdit={onEdit}
                      canEdit={canEdit}
                    />,
                  ];
                  if (isOpen && bug.children?.length) {
                    for (const child of bug.children) {
                      rows.push(
                        <BugTableRow
                          key={child.issueKey ?? `${bug.id}-${child.title}`}
                          bug={child}
                          isChild
                          onRowClick={(row) => onRowClick(row)}
                          onEdit={onEdit}
                          canEdit={canEdit}
                        />,
                      );
                    }
                  }
                  return rows;
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataPagination
        page={pagination.page}
        total={pagination.total}
        limit={pagination.limit}
        loadedRowCount={bugs.length}
        onPageChange={pagination.onPageChange}
        onLimitChange={pagination.onLimitChange}
        pageSizeOptions={pagination.pageSizeOptions}
        className="rounded-b-xl border-border/60"
      />
    </div>
  );
}
