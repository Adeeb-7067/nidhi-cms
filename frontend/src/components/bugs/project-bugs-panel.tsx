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
import { BugTableRow } from "./bug-table-row";
import { DataPagination } from "@/components/ui/data-pagination";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";

/** Project hub bugs tab — grouped parents, expand children, open detail on click */
export function ProjectBugsPanel({
  bugs,
  onOpenBug,
  onEditBug,
  canEdit,
  emptyMessage = "No bugs reported",
}: {
  bugs: Bug[];
  onOpenBug: (bug: Bug) => void;
  onEditBug?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
  emptyMessage?: string;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  const rows = useMemo(() => bugs.filter((b) => !b.parentBugId), [bugs]);
  const { pageItems, pagination } = useClientPagination(rows, DEFAULT_TABLE_PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10 text-xs">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="text-[10px] font-semibold uppercase">ID</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase">Title</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase">QA · Dev · Final</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase">Reporter</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.flatMap((bug) => {
            const childCount = bug.childCount ?? bug.children?.length ?? 0;
            const isOpen = expanded.has(bug.id);
            const out = [
              <BugTableRow
                key={bug.id}
                bug={bug}
                variant="project"
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
                onRowClick={onOpenBug}
                onEdit={onEditBug}
                canEdit={canEdit}
              />,
            ];
            if (isOpen && bug.children?.length) {
              for (const child of bug.children) {
                out.push(
                  <BugTableRow
                    key={child.issueKey ?? `${bug.id}-${child.title}`}
                    bug={child}
                    variant="project"
                    isChild
                    onRowClick={onOpenBug}
                    onEdit={onEditBug}
                    canEdit={canEdit}
                  />,
                );
              }
            }
            return out;
          })}
        </TableBody>
      </Table>
    </div>
    <DataPagination {...pagination} />
    </div>
  );
}
