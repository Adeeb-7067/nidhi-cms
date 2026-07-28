import React from "react";
import type { Bug } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BugTrackStatusBadges } from "./bug-track-status";
import { AssigneeAvatars } from "./assignee-avatars";
import { BugAttachmentThumb } from "./bug-attachments";
import { PRIORITY_LABELS } from "@/lib/bug-workflow";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type BugDisplayRow = Bug & {
  isChild?: boolean;
  parentId?: number;
  childCount?: number;
};

export function flattenBugRows(bugs: Bug[], expanded: Set<number>): BugDisplayRow[] {
  const result: BugDisplayRow[] = [];
  for (const bug of bugs) {
    const childCount = bug.childCount ?? bug.children?.length ?? 0;
    result.push({ ...bug, isChild: false, childCount });
    if (expanded.has(bug.id) && bug.children?.length) {
      for (const child of bug.children) {
        result.push({ ...child, isChild: true, parentId: bug.id });
      }
    }
  }
  return result;
}

export function bugDisplayRowKey(row: BugDisplayRow): string | number {
  if (row.isChild) {
    return row.issueKey ?? `${row.parentId}-${row.title}`;
  }
  return row.id;
}

function descPreview(text?: string | null, max = 72) {
  const t = text?.trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function formatPriorityLabel(priority?: string | null) {
  if (!priority) return "—";
  return PRIORITY_LABELS[priority] ?? priority.toUpperCase();
}

export function BugExpandCell({
  row,
  expanded,
  onToggleExpand,
}: {
  row: BugDisplayRow;
  expanded: boolean;
  onToggleExpand?: () => void;
}) {
  const hasChildren = !row.isChild && (row.childCount ?? 0) > 0;
  if (!hasChildren) {
    return <span className="inline-block w-6" />;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand?.();
      }}
      aria-label={expanded ? "Collapse" : "Expand"}
    >
      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
    </Button>
  );
}

export function BugExpandCellFull({
  row,
  expanded,
  onToggleExpand,
}: {
  row: BugDisplayRow;
  expanded: boolean;
  onToggleExpand?: () => void;
}) {
  const hasChildren = !row.isChild && (row.childCount ?? 0) > 0;
  if (!hasChildren) {
    return <span className="inline-block w-7" />;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand?.();
      }}
      aria-label={expanded ? "Collapse issues" : "Expand issues"}
    >
      <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
    </Button>
  );
}

export function BugProjectIdCell({ row }: { row: BugDisplayRow }) {
  return <span className="font-mono text-[10px] text-muted-foreground">{row.bugNumber}</span>;
}

export function BugProjectTitleCell({ row }: { row: BugDisplayRow }) {
  const childCount = row.childCount ?? 0;
  const hasChildren = childCount > 0;
  return (
    <div className="max-w-[240px]">
      <span className={cn("line-clamp-1 font-medium", row.isChild && "pl-2 border-l-2 border-primary/25")}>
        {row.title}
      </span>
      {!row.isChild && hasChildren && (
        <Badge variant="secondary" className="mt-0.5 text-[9px] h-4 font-normal">
          {childCount} issues
        </Badge>
      )}
    </div>
  );
}

export function BugProjectActionsCell({
  row,
  onEdit,
  onDelete,
  canEdit,
}: {
  row: BugDisplayRow;
  onEdit?: (bug: Bug) => void;
  onDelete?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
}) {
  const editable = (typeof canEdit === "function" ? canEdit(row) : canEdit) && onEdit;
  if (!editable && !onDelete) return null;
  return (
    <div
      className="flex items-center gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {editable && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit!(row)}
          aria-label="Edit bug"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(row)}
          aria-label="Delete bug"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function BugFullProjectCell({ row }: { row: BugDisplayRow }) {
  return (
    <div className={cn("flex flex-col max-w-[140px]", row.isChild && "pl-2")}>
      {!row.isChild && (
        <>
          <span className="text-[11px] font-medium truncate">{row.projectName}</span>
          <span className="text-[9px] font-mono text-muted-foreground">{row.bugNumber}</span>
        </>
      )}
      {row.isChild && (
        <span className="text-[9px] font-mono text-muted-foreground">{row.bugNumber}</span>
      )}
    </div>
  );
}

export function BugFullTitleCell({ row }: { row: BugDisplayRow }) {
  const childCount = row.childCount ?? 0;
  const hasChildren = childCount > 0;
  return (
    <div className={cn(row.isChild && "pl-3 border-l-2 border-primary/20")}>
      <span className="text-[11px] font-medium line-clamp-1">{row.title}</span>
      {!row.isChild && hasChildren && (
        <Badge variant="secondary" className="mt-1 text-[9px] h-4 px-1.5 font-normal">
          {childCount} issue{childCount !== 1 ? "s" : ""}
        </Badge>
      )}
      <span className="text-[10px] text-muted-foreground line-clamp-1 block">
        {descPreview(row.description, 48)}
      </span>
    </div>
  );
}

export function BugPriorityCell({ row }: { row: BugDisplayRow }) {
  return (
    <Badge variant="outline" className="text-[9px] h-5 font-mono">
      {formatPriorityLabel(row.priority)}
    </Badge>
  );
}

export function BugLatestCommentCell({ row }: { row: BugDisplayRow }) {
  return (
    <span className="text-[10px] text-muted-foreground line-clamp-2 max-w-[180px]">
      {descPreview(row.latestComment, 64)}
    </span>
  );
}

export function BugStatusCell({ row }: { row: BugDisplayRow }) {
  return (
    <BugTrackStatusBadges
      qaStatus={row.qaStatus}
      devStatus={row.devStatus}
      finalStatus={row.finalStatus}
    />
  );
}

export function BugUpdatedCell({ row }: { row: BugDisplayRow }) {
  return (
    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
      {formatDistanceToNow(new Date(row.updatedAt ?? row.createdAt), { addSuffix: true })}
    </span>
  );
}

export function BugFullActionsCell({
  row,
  onRowClick,
  onEdit,
  onDelete,
  canEdit,
}: {
  row: BugDisplayRow;
  onRowClick: (bug: Bug) => void;
  onEdit?: (bug: Bug) => void;
  onDelete?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
}) {
  const editable = (typeof canEdit === "function" ? canEdit(row) : canEdit) && onEdit;
  return (
    <div
      className="flex justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRowClick(row)}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {editable && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit!(row)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(row)}
          aria-label="Delete bug"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function bugDisplayRowClassName(row: BugDisplayRow): string | undefined {
  return row.isChild ? "bg-muted/15" : undefined;
}
