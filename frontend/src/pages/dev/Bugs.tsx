import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useListBugs,
  useListProjects,
  fetchBugsExport,
  deleteBug,
  getListBugsQueryKey,
  getListProjectsQueryKey,
  type Bug,
  type ListBugsParams,
} from "@/api";
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
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Bug as BugIcon, FileText, Activity, AlertTriangle, CheckCircle2, Download, ChevronDown, Loader2 } from "lucide-react";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
} from "@/components/dev/dev-page-kit";
import { CmsChipTabs, CmsFilterBar } from "@/components/cms";
import { buildBugsCSV, generateBugPDF } from "@/lib/bug-report";
import { PageTableSkeleton } from "@/components/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isDevPortalRole, isQaStaffRole } from "@/lib/navigation";
import { BugFormDialog, openBugFormDeferred } from "@/components/bugs/bug-form-dialog";
import { BugDetailSheet } from "@/components/bugs/bug-detail-sheet";
import { BugTable } from "@/components/bugs/bug-table";
import { bugStatsFromList, canUserModifyBug } from "@/lib/bug-workflow";
import { DEFAULT_TABLE_PAGE_SIZE, useTablePagination } from "@/lib/table-pagination";
import { clearUrlSearchParam, readBugIdFromUrl } from "@/lib/notification-navigation";
import { getLocationSearch } from "@/lib/electron-bridge";

type BugListScope = "all" | "mine" | "unassigned" | "created";

function defaultBugListScope(role: string | undefined): BugListScope {
  if (role === "super_admin" || role === "tester" || role === "qa") return "all";
  return "mine";
}

export default function DevBugs() {
  const { user } = useAuth();
  const role = user?.role;

  const canCreateBug = isDevPortalRole(role) || role === "super_admin";
  const canAssignBugs =
    role === "tester" || role === "qa" || role === "super_admin";
  const canFullEdit = canAssignBugs;
  const canEditBug = (bug: Bug) => canUserModifyBug(role, user?.id, bug);
  const canComment = !!user;
  const isAdmin = role === "super_admin";
  const isQaStaff = isQaStaffRole(role);

  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [detailBugId, setDetailBugId] = useState<number | null>(null);
  const [detailIssueKey, setDetailIssueKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bug | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [scope, setScope] = useState<BugListScope>(() => defaultBugListScope(role));
  const [projectFilterId, setProjectFilterId] = useState("all");
  const scopeUserId = useRef<number | undefined>(user?.id);
  const [location] = useLocation();
  const bugIdFromUrl = readBugIdFromUrl();
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination(DEFAULT_TABLE_PAGE_SIZE);

  useEffect(() => {
    if (!user?.id || scopeUserId.current === user.id) return;
    scopeUserId.current = user.id;
    setScope(defaultBugListScope(user.role));
  }, [user?.id, user?.role]);

  useEffect(() => {
    const params = new URLSearchParams(getLocationSearch());
    const pid = params.get("projectId");
    if (pid && !Number.isNaN(Number.parseInt(pid, 10))) {
      if (isAdmin) setProjectFilterId(pid);
    }
    if (bugIdFromUrl != null) {
      setDetailBugId(bugIdFromUrl);
      setDetailIssueKey(null);
      clearUrlSearchParam("bug");
    }
  }, [location, bugIdFromUrl, isAdmin]);

  useEffect(() => {
    resetPage();
  }, [scope, projectFilterId, statusFilter, priorityFilter, search, resetPage]);

  const listBugsParams = useMemo((): ListBugsParams => {
    const params: ListBugsParams = {
      page,
      limit: apiLimit,
      scope,
    };
    if (isAdmin && projectFilterId !== "all") {
      params.projectId = Number.parseInt(projectFilterId, 10);
    }
    if (statusFilter !== "all") params.status = statusFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    const q = search.trim();
    if (q) params.search = q;
    return params;
  }, [scope, projectFilterId, isAdmin, page, apiLimit, statusFilter, priorityFilter, search]);

  const { data, isLoading } = useListBugs(listBugsParams, {
    query: {
      enabled: !!user,
      queryKey: getListBugsQueryKey(listBugsParams),
    },
  });

  const projectsListParams = { limit: isAdmin ? 200 : 50 };
  const { data: projectsData } = useListProjects(projectsListParams, {
    query: {
      enabled: !!user,
      queryKey: getListProjectsQueryKey(projectsListParams),
    },
  });

  const bugs = data?.bugs ?? [];
  const bugStats = useMemo(() => bugStatsFromList(bugs), [bugs]);

  const handleExportPDF = () => {
    if (bugs.length === 0) {
      toast.error("No bugs to export in the current view.");
      return;
    }
    const projectName = bugs[0]?.projectName ?? "All projects";
    generateBugPDF(bugs, projectName);
    toast.success("Generating PDF report…");
  };

  const handleExportCSV = async () => {
    if (isExportingCSV) return;
    setIsExportingCSV(true);
    try {
      const exportParams: ListBugsParams = { ...listBugsParams };
      delete exportParams.page;
      delete exportParams.limit;
      const result = await fetchBugsExport(exportParams);
      if (result.bugs.length === 0) {
        toast.error("No bugs to export in the current view.");
        return;
      }
      if (result.truncated) {
        toast.warning("Export limited to 1,000 bugs. Narrow your filters for a complete set.");
      }
      const csv = buildBugsCSV(result.bugs);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const selectedProject =
        projectFilterId !== "all"
          ? (projectsData?.projects.find((p) => p.id.toString() === projectFilterId)?.name ?? "project")
          : "all-bugs";
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `${selectedProject.toLowerCase().replace(/\s+/g, "-")}-bugs-${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.bugs.length} bug${result.bugs.length !== 1 ? "s" : ""} as CSV`);
    } catch {
      toast.error("CSV export failed. Please try again.");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const openEdit = (bug: Bug) => {
    setEditBug(bug);
    setDetailBugId(null);
    openBugFormDeferred(() => setFormOpen(true));
  };

  const openDetail = (bug: Bug) => {
    setDetailBugId(bug.id);
    setDetailIssueKey(bug.issueKey ?? null);
  };

  const canDeleteBug = (bug: Bug) =>
    role === "super_admin" || ((role === "tester" || role === "qa") && bug.reporterId === user?.id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBug(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      if (detailBugId === deleteTarget.id) setDetailBugId(null);
      toast.success("Bug deleted");
    } catch {
      toast.error("Failed to delete bug");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <DevPageShell>
      <DevPageHero
        title="Bug Tracker"
        subtitle="QA · Dev · Final status per bug"
        actions={
          <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs"
                disabled={isExportingCSV}
              >
                {isExportingCSV ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Download
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => void handleExportCSV()}
                disabled={isExportingCSV}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Download CSV</span>
                  <span className="text-[10px] text-muted-foreground">All matching bugs (up to 1,000)</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="mr-2 h-3.5 w-3.5" />
                <div className="flex flex-col">
                  <span>Export PDF</span>
                  <span className="text-[10px] text-muted-foreground">Current page only — QA audit</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreateBug && (
            <Button
              type="button"
              className="h-9 text-xs"
              onClick={() => {
                setEditBug(null);
                openBugFormDeferred(() => setFormOpen(true));
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Report bugs
            </Button>
          )}
          </div>
        }
      />

      <DevKpiGrid
        loading={isLoading && !data}
        items={[
          { title: "Total", value: data?.total ?? bugStats.total, hint: "Current view", icon: BugIcon, accent: "violet" },
          { title: "Active", value: bugStats.open, hint: "Not closed / fixed", icon: AlertTriangle, accent: "red", alert: bugStats.open > 0 },
          { title: "In flight", value: bugStats.inProgress, hint: "Assigned or in progress", icon: Activity, accent: "blue" },
          { title: "QA queue", value: bugStats.awaitingQa, hint: "Fixed or pending QA", icon: CheckCircle2, accent: "violet" },
        ]}
      />

      {(isAdmin || isQaStaff) && (
        <CmsChipTabs
          value={scope}
          onValueChange={(v) => setScope(v as BugListScope)}
          items={[
            ...(isQaStaff ? [{ value: "created", label: "My reports" }] : []),
            { value: "all", label: "All bugs" },
            { value: "mine", label: "My queue" },
            ...(isAdmin || isQaStaff ? [{ value: "unassigned", label: "Unassigned" }] : []),
          ]}
        />
      )}

      {isAdmin ? (
        <CmsFilterBar>
          <Select value={projectFilterId} onValueChange={setProjectFilterId}>
            <SelectTrigger className="h-9 w-full sm:w-[220px] text-xs bg-background">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectsData?.projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CmsFilterBar>
      ) : null}

      {isLoading ? (
        <PageTableSkeleton rows={8} columns={6} showToolbar />
      ) : (
        <BugTable
          bugs={bugs}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          pagination={{
            page: data?.page ?? page,
            total: data?.total ?? 0,
            limit,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          onRowClick={openDetail}
          onEdit={openEdit}
          onDelete={(bug) => canDeleteBug(bug) ? setDeleteTarget(bug) : toast.error("You can only delete bugs you reported.")}
          canEdit={canEditBug}
        />
      )}

      <BugFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditBug(null);
        }}
        editBug={editBug}
        userRole={role}
        userId={user?.id}
        canAssign={canAssignBugs}
        canFullEdit={canFullEdit}
        isAdmin={isAdmin}
        defaultProjectId={
          projectFilterId !== "all" ? Number.parseInt(projectFilterId, 10) : undefined
        }
      />

      <BugDetailSheet
        bugId={detailBugId}
        initialIssueKey={detailIssueKey}
        open={detailBugId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailBugId(null);
            setDetailIssueKey(null);
          }
        }}
        onEdit={(bug) => {
          setDetailBugId(null);
          setDetailIssueKey(null);
          openEdit(bug);
        }}
        canComment={canComment}
        userRole={role}
        userId={user?.id}
        listQueryKey={getListBugsQueryKey(listBugsParams)}
        onSelectChild={(child) => {
          setDetailBugId(child.id);
          setDetailIssueKey(child.issueKey ?? null);
        }}
        onSelectParent={(parentId) => {
          setDetailBugId(parentId);
          setDetailIssueKey(null);
        }}
      />

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
    </DevPageShell>
  );
}
