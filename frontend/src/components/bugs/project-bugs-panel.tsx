import { useMemo, useState } from "react";
import { deleteBug, type Bug } from "@/api";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BugTableRow } from "./bug-table-row";
import { DataPagination } from "@/components/ui/data-pagination";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TRACK_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "dev_fixed", label: "Dev fixed" },
  { value: "qa_verified", label: "QA verified" },
  { value: "resolved", label: "Resolved" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "p1", label: "P1 · Critical" },
  { value: "p2", label: "P2 · High" },
  { value: "p3", label: "P3 · Normal" },
  { value: "p4", label: "P4 · Low" },
] as const;

type TrackFilter = (typeof TRACK_OPTIONS)[number]["value"];
type PriorityFilter = (typeof PRIORITY_OPTIONS)[number]["value"];

function matchesTrack(bug: Bug, filter: TrackFilter): boolean {
  if (filter === "all") return true;
  if (filter === "resolved") return bug.finalStatus === "resolved";
  if (filter === "dev_fixed") return bug.devStatus === "fixed";
  if (filter === "qa_verified") return bug.qaStatus === "fixed";
  if (filter === "open")
    return bug.qaStatus === "open" || bug.devStatus === "open" || bug.finalStatus === "open";
  return true;
}

/** Project hub bugs tab — grouped parents, expand children, open detail on click */
export function ProjectBugsPanel({
  bugs,
  onOpenBug,
  onEditBug,
  canEdit,
  canDelete,
  emptyMessage = "No bugs reported",
}: {
  bugs: Bug[];
  onOpenBug: (bug: Bug) => void;
  onEditBug?: (bug: Bug) => void;
  canEdit?: boolean | ((bug: Bug) => boolean);
  canDelete?: boolean | ((bug: Bug) => boolean);
  emptyMessage?: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Bug | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFiltered = search.trim() !== "" || trackFilter !== "all" || priorityFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTrackFilter("all");
    setPriorityFilter("all");
  };

  const rows = useMemo(() => {
    let result = bugs.filter((b) => !b.parentBugId);

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (b) =>
          (b.title ?? "").toLowerCase().includes(q) ||
          (b.bugNumber ?? "").toLowerCase().includes(q),
      );
    }

    if (trackFilter !== "all") {
      result = result.filter((b) => matchesTrack(b, trackFilter));
    }

    if (priorityFilter !== "all") {
      result = result.filter((b) => b.priority === priorityFilter);
    }

    return result;
  }, [bugs, search, trackFilter, priorityFilter]);

  const { pageItems, pagination } = useClientPagination(rows, DEFAULT_TABLE_PAGE_SIZE);
  const totalBugs = bugs.filter((b) => !b.parentBugId).length;

  const handleDelete = (bug: Bug) => {
    const ok = typeof canDelete === "function" ? canDelete(bug) : canDelete;
    if (ok) setDeleteTarget(bug);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBug(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      toast.success("Bug deleted");
    } catch {
      toast.error("Failed to delete bug");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-0">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bugs…"
            className="h-7 pl-8 text-xs"
          />
        </div>
        <Select value={trackFilter} onValueChange={(v) => setTrackFilter(v as TrackFilter)}>
          <SelectTrigger className="h-7 text-xs w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRACK_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
          <SelectTrigger className="h-7 text-xs w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {rows.length === totalBugs
            ? `${totalBugs} bug${totalBugs !== 1 ? "s" : ""}`
            : `${rows.length} of ${totalBugs}`}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-10 text-xs">
          {isFiltered ? "No bugs match the current filters." : emptyMessage}
        </p>
      ) : (
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
                  {onEditBug && <TableHead className="w-10" />}
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
                      onDelete={canDelete ? handleDelete : undefined}
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
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.bugNumber} — {deleteTarget?.title}</span>
              <br />
              This will permanently delete the bug and all its comments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
