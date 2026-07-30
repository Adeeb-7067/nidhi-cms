import type { LucideIcon } from "lucide-react";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type CmsRowActionItem = {
  /** Unique key — defaults to label */
  id?: string;
  label: string;
  onSelect?: () => void;
  /** Navigate instead of (or in addition to) onSelect */
  href?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Renders as a separator *before* this item */
  separatorBefore?: boolean;
  variant?: "default" | "destructive";
  /** Hide this item without filtering arrays at call sites */
  hidden?: boolean;
};

export type CmsRowActionsProps = {
  /** Preferred API — arbitrary actions in one ⋮ menu */
  items?: CmsRowActionItem[];
  /** Convenience shortcuts (merged before `items`) */
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewHref?: string;
  editHref?: string;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  /** Accessible name for the trigger */
  label?: string;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
};

function buildShortcutItems({
  onView,
  onEdit,
  onDelete,
  viewHref,
  editHref,
  canView = true,
  canEdit = true,
  canDelete = true,
  viewLabel = "View",
  editLabel = "Edit",
  deleteLabel = "Delete",
}: Pick<
  CmsRowActionsProps,
  | "onView"
  | "onEdit"
  | "onDelete"
  | "viewHref"
  | "editHref"
  | "canView"
  | "canEdit"
  | "canDelete"
  | "viewLabel"
  | "editLabel"
  | "deleteLabel"
>): CmsRowActionItem[] {
  const out: CmsRowActionItem[] = [];
  if (canView && (onView || viewHref)) {
    out.push({ id: "view", label: viewLabel, icon: Eye, onSelect: onView, href: viewHref });
  }
  if (canEdit && (onEdit || editHref)) {
    out.push({ id: "edit", label: editLabel, icon: Pencil, onSelect: onEdit, href: editHref });
  }
  if (canDelete && onDelete) {
    out.push({
      id: "delete",
      label: deleteLabel,
      icon: Trash2,
      onSelect: onDelete,
      variant: "destructive",
      separatorBefore: true,
    });
  }
  return out;
}

/**
 * Unified CMS table row actions — one ⋮ trigger, dropdown of available actions.
 * Use across CmsDataTable / AdvancedTable action columns for consistent UX.
 */
export function CmsRowActions({
  items,
  onView,
  onEdit,
  onDelete,
  viewHref,
  editHref,
  canView = true,
  canEdit = true,
  canDelete = true,
  viewLabel,
  editLabel,
  deleteLabel,
  label = "Row actions",
  align = "end",
  className,
  contentClassName,
}: CmsRowActionsProps) {
  const shortcuts = buildShortcutItems({
    onView,
    onEdit,
    onDelete,
    viewHref,
    editHref,
    canView,
    canEdit,
    canDelete,
    viewLabel,
    editLabel,
    deleteLabel,
  });
  const resolved = [...shortcuts, ...(items ?? [])].filter((a) => !a.hidden);
  if (!resolved.length) return null;

  return (
    <div
      className={cn("flex justify-end", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            aria-label={label}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className={cn("w-48", contentClassName)}>
          {resolved.map((action, index) => {
            const Icon = action.icon;
            const key = action.id ?? `${action.label}-${index}`;
            const itemClass = cn(
              action.variant === "destructive" &&
                "text-destructive focus:text-destructive focus:bg-destructive/10",
            );
            return (
              <div key={key}>
                {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
                {action.href ? (
                  <DropdownMenuItem asChild disabled={action.disabled} className={itemClass}>
                    <Link
                      href={action.href}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onSelect?.();
                      }}
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                      {action.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={action.disabled}
                    className={itemClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (action.disabled) return;
                      action.onSelect?.();
                    }}
                  >
                    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    {action.label}
                  </DropdownMenuItem>
                )}
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
