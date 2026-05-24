import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useListBugs,
  useListProjects,
  getListBugsQueryKey,
  getListProjectsQueryKey,
  type Bug,
  type ListBugsParams,
} from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bug as BugIcon, FileText, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { PDFService } from "@/lib/pdf-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BugFormDialog, openBugFormDeferred } from "@/components/bugs/bug-form-dialog";
import { BugDetailSheet } from "@/components/bugs/bug-detail-sheet";
import { BugTable } from "@/components/bugs/bug-table";
import { BUG_STATUSES, bugStatsFromList, canUserModifyBug } from "@/lib/bug-workflow";
import { DEFAULT_TABLE_PAGE_SIZE, useTablePagination } from "@/lib/table-pagination";

type BugListScope = "all" | "mine" | "unassigned" | "created";

function defaultBugListScope(role: string | undefined): BugListScope {
  if (role === "super_admin" || role === "tester") return "all";
  if (role === "qa") return "created";
  return "mine";
}

export default function DevBugs() {
  const { user } = useAuth();
  const role = user?.role;

  const canCreateBug =
    role === "developer" ||
    role === "tester" ||
    role === "qa" ||
    role === "super_admin";
  const canAssignBugs =
    role === "tester" || role === "qa" || role === "super_admin";
  const canFullEdit = canAssignBugs;
  const canEditBug = (bug: Bug) => canUserModifyBug(role, user?.id, bug);
  const canComment = !!user;
  const isAdmin = role === "super_admin";
  const isQaUser = role === "qa";
  const isTesterUser = role === "tester";

  const [formOpen, setFormOpen] = useState(false);
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [detailBugId, setDetailBugId] = useState<number | null>(null);
  const [detailIssueKey, setDetailIssueKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [scope, setScope] = useState<BugListScope>(() => defaultBugListScope(role));
  const [projectFilterId, setProjectFilterId] = useState("all");
  const scopeUserId = useRef<number | undefined>(user?.id);
  const { page, setPage, resetPage, limit } = useTablePagination(DEFAULT_TABLE_PAGE_SIZE);

  useEffect(() => {
    if (!user?.id || scopeUserId.current === user.id) return;
    scopeUserId.current = user.id;
    setScope(defaultBugListScope(user.role));
  }, [user?.id, user?.role]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("projectId");
    if (pid && !Number.isNaN(Number.parseInt(pid, 10))) {
      if (isAdmin) setProjectFilterId(pid);
    }
  }, [isAdmin]);

  useEffect(() => {
    resetPage();
  }, [scope, projectFilterId, statusFilter, priorityFilter, search, resetPage]);

  const listBugsParams = useMemo((): ListBugsParams => {
    const params: ListBugsParams = {
      page,
      limit,
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
  }, [scope, projectFilterId, isAdmin, page, limit, statusFilter, priorityFilter, search]);

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
    PDFService.generateBugReportPDF(projectName, "QA Audit", bugs);
    toast.success("Generating PDF report…");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bug Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            QA · Dev · Final status per bug
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="h-9 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Export audit (PDF)
          </Button>
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
      </div>

      {isLoading && !data ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard
            title="Total"
            value={data?.total ?? bugStats.total}
            hint="Current view"
            icon={BugIcon}
            accent="violet"
            delay={0}
          />
          <StatCard
            title="Active"
            value={bugStats.open}
            hint="Not closed / fixed"
            icon={AlertTriangle}
            accent="red"
            alert={bugStats.open > 0}
            delay={1}
          />
          <StatCard
            title="In flight"
            value={bugStats.inProgress}
            hint="Assigned or in progress"
            icon={Activity}
            accent="blue"
            delay={2}
          />
          <StatCard
            title="QA queue"
            value={bugStats.awaitingQa}
            hint="Fixed or pending QA"
            icon={CheckCircle2}
            accent="violet"
            delay={3}
          />
        </PageKpiRow>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {(isAdmin || isTesterUser || isQaUser) && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as BugListScope)}>
            <TabsList className="bg-muted/50 p-1 h-8">
              {isQaUser && (
                <TabsTrigger value="created" className="rounded-md text-xs h-7 px-3">
                  My reports
                </TabsTrigger>
              )}
              <TabsTrigger value="all" className="rounded-md text-xs h-7 px-3">
                All bugs
              </TabsTrigger>
              <TabsTrigger value="mine" className="rounded-md text-xs h-7 px-3">
                My queue
              </TabsTrigger>
              {(isAdmin || isTesterUser) && (
                <TabsTrigger value="unassigned" className="rounded-md text-xs h-7 px-3">
                  Unassigned
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        )}
        {isAdmin && (
          <Select value={projectFilterId} onValueChange={setProjectFilterId}>
            <SelectTrigger className="h-8 w-[220px] text-xs bg-muted/50 border-0">
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
        )}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto overflow-x-auto">
          <TabsList className="bg-muted/50 p-1 h-8 flex-nowrap">
            <TabsTrigger value="all" className="rounded-md text-xs h-7 px-2.5">
              All
            </TabsTrigger>
            {BUG_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="rounded-md text-xs h-7 px-2.5 whitespace-nowrap">
                {s.replace(/_/g, " ")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-lg shadow-black/5">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
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
                limit: data?.limit ?? limit,
                onPageChange: setPage,
              }}
              onRowClick={openDetail}
              onEdit={openEdit}
              canEdit={canEditBug}
            />
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
