import React from "react";
import type { Bug } from "@/api";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BugTrackStatusBadges } from "./bug-track-status";
import { AssigneeAvatars } from "./assignee-avatars";
import { BugAttachmentThumb } from "./bug-attachments";
import { PRIORITY_LABELS } from "@/lib/bug-workflow";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function descPreview(text?: string | null, max = 72) {
  const t = text?.trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function formatPriorityLabel(priority?: string | null) {
  if (!priority) return "—";
  return PRIORITY_LABELS[priority] ?? priority.toUpperCase();
}

export const BugTableRow = React.memo(function BugTableRow({
  bug,
  isChild = false,
  childCount = 0,
  expanded = false,
  onToggleExpand,
  onRowClick,
  onEdit,
  canEdit,
  variant = "full",
}: {
  bug: Bug;
  isChild?: boolean;
  childCount?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onRowClick: (bug: Bug) => void;
  onEdit?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
  /** `project` = fewer columns for project hub tab */
  variant?: "full" | "project";
}) {
  const hasChildren = childCount > 0;
  const editable = (typeof canEdit === "function" ? canEdit(bug) : canEdit) && onEdit;

  if (variant === "project") {
    return (
      <TableRow
        className={cn(
          "cursor-pointer text-xs hover:bg-muted/40 border-border/40",
          isChild && "bg-muted/15",
        )}
        onClick={() => onRowClick(bug)}
      >
        <TableCell className="py-2 w-8 px-2" onClick={(e) => e.stopPropagation()}>
          {hasChildren ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleExpand}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
              />
            </Button>
          ) : (
            <span className="inline-block w-6" />
          )}
        </TableCell>
        <TableCell className="py-2 font-mono text-[10px] text-muted-foreground">
          {bug.bugNumber}
        </TableCell>
        <TableCell className="py-2 font-medium max-w-[240px]">
          <span className={cn("line-clamp-1", isChild && "pl-2 border-l-2 border-primary/25")}>
            {bug.title}
          </span>
          {!isChild && hasChildren && (
            <Badge variant="secondary" className="mt-0.5 text-[9px] h-4 font-normal">
              {childCount} issues
            </Badge>
          )}
        </TableCell>
        <TableCell className="py-2">
          <BugTrackStatusBadges
            qaStatus={bug.qaStatus}
            devStatus={bug.devStatus}
            finalStatus={bug.finalStatus}
          />
        </TableCell>
        <TableCell className="py-2 text-muted-foreground">{bug.reporterName}</TableCell>
        {editable && (
          <TableCell className="py-2 w-10" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit!(bug)}
              aria-label="Edit bug"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        )}
      </TableRow>
    );
  }

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors hover:bg-primary/5 border-border/40",
        isChild && "bg-muted/15 hover:bg-muted/25",
      )}
      onClick={() => onRowClick(bug)}
    >
      <TableCell className="py-2.5 w-8 px-2" onClick={(e) => e.stopPropagation()}>
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse issues" : "Expand issues"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
            />
          </Button>
        ) : (
          <span className="inline-block w-7" />
        )}
      </TableCell>
      <TableCell className="py-2.5">
        <div className={cn("flex flex-col max-w-[140px]", isChild && "pl-2")}>
          {!isChild && (
            <>
              <span className="text-[11px] font-medium truncate">{bug.projectName}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{bug.bugNumber}</span>
            </>
          )}
          {isChild && (
            <span className="text-[9px] font-mono text-muted-foreground">{bug.bugNumber}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
        <AssigneeAvatars assignees={bug.assignees} />
      </TableCell>
      <TableCell className="py-2.5">
        <div className={cn(isChild && "pl-3 border-l-2 border-primary/20")}>
          <span className="text-[11px] font-medium line-clamp-1">{bug.title}</span>
          {!isChild && hasChildren && (
            <Badge variant="secondary" className="mt-1 text-[9px] h-4 px-1.5 font-normal">
              {childCount} issue{childCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground line-clamp-1 block">
            {descPreview(isChild ? bug.description : bug.description, 48)}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <Badge variant="outline" className="text-[9px] h-5 font-mono">
          {formatPriorityLabel(bug.priority)}
        </Badge>
      </TableCell>
      <TableCell className="py-2.5 max-w-[180px]">
        <span className="text-[10px] text-muted-foreground line-clamp-2">
          {descPreview(bug.latestComment, 64)}
        </span>
      </TableCell>
      <TableCell className="py-2.5">
        <BugTrackStatusBadges
          qaStatus={bug.qaStatus}
          devStatus={bug.devStatus}
          finalStatus={bug.finalStatus}
        />
      </TableCell>
      <TableCell className="py-2.5">
        <BugAttachmentThumb attachments={bug.attachments} />
      </TableCell>
      <TableCell className="py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(bug.updatedAt ?? bug.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRowClick(bug)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {editable && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(bug)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});
