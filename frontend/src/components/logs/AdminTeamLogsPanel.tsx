import React, { useEffect, useMemo, useState } from "react";
import {
  useListMyLogs,
  useListProjects,
  useListUsers,
  getListUsersQueryKey,
  getListProjectsQueryKey,
  useGetLogComplianceCalendar,
  getGetLogComplianceCalendarQueryKey,
  type DailyLog,
} from "@/api";
import { LogComplianceCalendarPanel } from "@/components/logs/LogComplianceCalendar";
import { DailyLogDetailDialog } from "@/components/logs/DailyLogDetailDialog";
import { QUERY_STALE } from "@/lib/query-config";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalContentCard,
  PortalSectionMeta,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAILY_LOG_VIRTUAL_PROJECTS } from "@/lib/daily-log-project-options";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/ui/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientPagination, useTablePagination } from "@/lib/table-pagination";
import { PDFService } from "@/lib/pdf-service";
import { cn } from "@/lib/utils";
import {
  formatDailyLogUpdatedLabel,
  formatDailyLogWorkDate,
} from "@/lib/daily-log-format";
import { toast } from "sonner";
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Filter,
  RotateCcw,
  Search,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

const ADMIN_STATS_LIMIT = 500;

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ");
}

function matchesSearch(log: DailyLog, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    log.taskTitle,
    log.taskDescription,
    log.projectName,
    log.developerName,
    log.developerEmployeeId,
    log.blockers,
    ...(log.workCategories ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function AdminTeamLogsPanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [developerFilterId, setDeveloperFilterId] = useState("");
  const [projectFilterId, setProjectFilterId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  const openLogDetail = (log: DailyLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const pickerParams = { limit: 100 };
  const { data: staffData } = useListUsers(
    { staff: "1", ...pickerParams },
    {
      query: {
        queryKey: getListUsersQueryKey({ staff: "1", ...pickerParams }),
        staleTime: QUERY_STALE.reference,
      },
    },
  );
  const { data: projectsData } = useListProjects(pickerParams, {
    query: {
      queryKey: getListProjectsQueryKey(pickerParams),
      staleTime: QUERY_STALE.reference,
    },
  });

  const staffDevs = useMemo(
    () =>
      (staffData?.users ?? []).filter(
        (u) => u.role === "developer" || u.role === "tester" || u.role === "qa",
      ),
    [staffData?.users],
  );

  const baseListParams = useMemo(() => {
    const params: {
      month: number;
      year: number;
      page: number;
      limit: number;
      developerId?: number;
      projectId?: number;
    } = { month, year, page, limit: apiLimit };
    if (developerFilterId) {
      params.developerId = Number.parseInt(developerFilterId, 10);
    }
    if (projectFilterId) {
      params.projectId = Number.parseInt(projectFilterId, 10);
    }
    return params;
  }, [month, year, page, apiLimit, developerFilterId, projectFilterId]);

  const statsListParams = useMemo(
    () => ({ ...baseListParams, page: 1, limit: ADMIN_STATS_LIMIT }),
    [baseListParams],
  );

  useEffect(() => {
    resetPage();
  }, [month, year, developerFilterId, projectFilterId, categoryFilter, search, resetPage]);

  const { data, isLoading, isFetching } = useListMyLogs(baseListParams);
  const { data: statsData, isLoading: statsLoading } = useListMyLogs(statsListParams);

  const complianceDeveloperId = useMemo(() => {
    if (!developerFilterId) return undefined;
    const id = Number.parseInt(developerFilterId, 10);
    return Number.isFinite(id) ? id : undefined;
  }, [developerFilterId]);

  const { data: complianceCalendar, isLoading: complianceLoading } =
    useGetLogComplianceCalendar(
      { month, year, developerId: complianceDeveloperId ?? 0 },
      {
        query: {
          enabled: complianceDeveloperId != null,
          queryKey: getGetLogComplianceCalendarQueryKey({
            month,
            year,
            developerId: complianceDeveloperId ?? 0,
          }),
        },
      },
    );

  const usesClientFilter = Boolean(search.trim() || categoryFilter);

  const filteredStatsLogs = useMemo(() => {
    let logs = statsData?.logs ?? [];
    if (categoryFilter) {
      logs = logs.filter((l) => l.workCategories?.includes(categoryFilter));
    }
    if (search.trim()) {
      logs = logs.filter((l) => matchesSearch(l, search));
    }
    return logs;
  }, [statsData?.logs, categoryFilter, search]);

  const { pageItems: clientPageLogs, pagination: clientPagination } = useClientPagination(
    filteredStatsLogs,
    { limit, setLimit },
  );

  const tableLogs = usesClientFilter ? clientPageLogs : (data?.logs ?? []);

  const kpiStats = useMemo(() => {
    const logs = filteredStatsLogs;
    const totalHours = logs.reduce((acc, l) => acc + (l.hoursSpent || 0), 0);
    const projectIds = new Set(logs.map((l) => l.projectId));
    const developerIds = new Set(logs.map((l) => l.developerId));
    return {
      entries: logs.length,
      totalHours: Math.round(totalHours * 10) / 10,
      projects: projectIds.size,
      developers: developerIds.size,
      avgHours: logs.length ? Math.round((totalHours / logs.length) * 10) / 10 : 0,
      apiTotal: statsData?.total ?? 0,
    };
  }, [filteredStatsLogs, statsData?.total]);

  const hasActiveFilters =
    Boolean(developerFilterId) ||
    Boolean(projectFilterId) ||
    Boolean(categoryFilter) ||
    Boolean(search.trim()) ||
    month !== now.getMonth() + 1 ||
    year !== now.getFullYear();

  const clearFilters = () => {
    setDeveloperFilterId("");
    setProjectFilterId("");
    setCategoryFilter("");
    setSearch("");
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const handleExport = () => {
    if (filteredStatsLogs.length === 0) {
      toast.error("No entries match the current filters.");
      return;
    }
    const devLabel = developerFilterId
      ? staffDevs.find((u) => u.id.toString() === developerFilterId)?.name ?? "Developer"
      : "All team members";
    const monthStr = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
    PDFService.generateDeveloperLogsPDF(devLabel, monthStr, filteredStatsLogs);
    toast.success("Exporting team timesheet…");
  };

  const periodLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Team daily logs"
        subtitle="Review and filter developer & QA timesheets across projects"
        badge={periodLabel}
      />

      <Card className="border-border/60 bg-card/80">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={clearFilters}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={portalActionButtonClass(
                  "h-8 border-emerald-500/30 text-emerald-600",
                )}
                onClick={handleExport}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              value={developerFilterId || "all"}
              onValueChange={(v) => setDeveloperFilterId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Developer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developers</SelectItem>
                {staffDevs.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name}
                    {u.employeeId ? ` · ${u.employeeId}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={projectFilterId || "all"}
              onValueChange={(v) => setProjectFilterId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Project / activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects & activities</SelectItem>
                <SelectGroup>
                  <SelectLabel>General</SelectLabel>
                  {DAILY_LOG_VIRTUAL_PROJECTS.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {(projectsData?.projects?.length ?? 0) > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Projects</SelectLabel>
                    {projectsData!.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>

            <Select value={month.toString()} onValueChange={(v) => setMonth(Number.parseInt(v, 10))}>
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2000, i).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year.toString()} onValueChange={(v) => setYear(Number.parseInt(v, 10))}>
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = now.getFullYear() - 2 + i;
                  return (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter || "all"}
              onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 bg-muted/40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {[
                  "development",
                  "design",
                  "testing",
                  "bug_fixing",
                  "code_review",
                  "deployment",
                  "documentation",
                  "meeting",
                  "research",
                ].map((id) => (
                  <SelectItem key={id} value={id}>
                    {formatCategory(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search task, project, developer…"
                className="h-9 pl-8 bg-muted/40"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <p className="text-[11px] text-muted-foreground">
              Showing filtered results
              {search.trim() ? ` matching “${search.trim()}”` : ""}
              {categoryFilter ? ` · ${formatCategory(categoryFilter)}` : ""}.
              {kpiStats.apiTotal > ADMIN_STATS_LIMIT &&
                ` Stats use first ${ADMIN_STATS_LIMIT} API rows; narrow filters for exact totals.`}
            </p>
          )}
        </CardContent>
      </Card>

      <PortalKpiGrid
        loading={statsLoading && !statsData}
        columns={4}
        items={[
          {
            title: "Entries",
            value: kpiStats.entries,
            hint:
              kpiStats.apiTotal > kpiStats.entries
                ? `${kpiStats.apiTotal} in period (filtered)`
                : "This period",
            icon: Calendar,
            accent: "violet",
          },
          {
            title: "Hours logged",
            value: kpiStats.totalHours,
            hint: "Filtered total",
            icon: Clock,
            accent: "blue",
          },
          {
            title: "Developers",
            value: kpiStats.developers,
            hint: "With entries",
            icon: Users,
            accent: "green",
          },
          {
            title: "Projects",
            value: kpiStats.projects,
            hint: "With activity",
            icon: Briefcase,
            accent: "amber",
          },
        ]}
      />

      <div className="flex flex-col gap-4 min-w-0">
        <PortalContentCard contentClassName="p-0 min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <PortalSectionMeta
              label="Log entries"
              count={usesClientFilter ? filteredStatsLogs.length : data?.total}
            />
            {isFetching && !isLoading && (
              <span className="text-[10px] text-muted-foreground animate-pulse">Updating…</span>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tableLogs.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Clock className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p className="font-medium text-foreground">No logs found</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Try another month, developer, or project — or clear filters to see all team
                entries.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider w-[100px]">
                        Date
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider min-w-[120px]">
                        Developer
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider min-w-[120px]">
                        Project
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider min-w-[180px]">
                        Task
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider w-[72px] text-right">
                        Hours
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider w-[64px] text-right">
                        Done
                      </TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider min-w-[140px]">
                        Categories
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="align-top cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openLogDetail(log)}
                      >
                        <TableCell className="text-xs py-2.5 min-w-[108px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="whitespace-nowrap font-medium">
                              {formatDailyLogWorkDate(log.logDate)}
                            </span>
                            {log.updatedAt && (
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums"
                                title={new Date(log.updatedAt).toLocaleString()}
                              >
                                {formatDailyLogUpdatedLabel(log.logDate, log.updatedAt)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{log.developerName}</p>
                              {log.developerEmployeeId && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {log.developerEmployeeId}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-2.5 max-w-[140px]">
                          <span className="font-medium text-primary line-clamp-2">
                            {log.projectName}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 max-w-[280px]">
                          <p className="text-xs font-medium line-clamp-1">{log.taskTitle}</p>
                          {log.taskDescription && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {log.taskDescription}
                            </p>
                          )}
                          {(log.blockers || log.nextDayPlan) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.blockers && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 border-destructive/30 text-destructive"
                                >
                                  Blocker
                                </Badge>
                              )}
                              {log.nextDayPlan && (
                                <Badge variant="outline" className="text-[9px] h-4">
                                  Next day
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2.5 tabular-nums text-sm font-semibold">
                          {log.hoursSpent}h
                        </TableCell>
                        <TableCell className="text-right py-2.5 tabular-nums text-xs text-emerald-600 font-medium">
                          {log.completionPct}%
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(log.workCategories ?? []).slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-[9px] h-5 px-1.5">
                                {formatCategory(cat)}
                              </Badge>
                            ))}
                            {(log.workCategories?.length ?? 0) > 2 && (
                              <Badge variant="outline" className="text-[9px] h-5 px-1.5">
                                +{(log.workCategories?.length ?? 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-border/60 px-4 py-3">
                <DataPagination
                  page={usesClientFilter ? clientPagination.page : (data?.page ?? page)}
                  total={usesClientFilter ? clientPagination.total : (data?.total ?? 0)}
                  limit={limit}
                  loadedRowCount={tableLogs.length}
                  onPageChange={usesClientFilter ? clientPagination.onPageChange : setPage}
                  onLimitChange={setLimit}
                />
              </div>
              {usesClientFilter && filteredStatsLogs.length >= ADMIN_STATS_LIMIT && (
                <p className="text-[10px] text-amber-600 px-4 pb-2">
                  Search/category results capped at {ADMIN_STATS_LIMIT} entries — narrow month or
                  developer for more.
                </p>
              )}
            </>
          )}
        </PortalContentCard>

        {complianceDeveloperId ? (
          <LogComplianceCalendarPanel
            data={complianceCalendar}
            isLoading={complianceLoading}
            title="Hours compliance"
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 px-4 text-center text-sm text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground text-xs">Hours compliance</p>
              <p className="text-[11px] mt-1 max-w-md mx-auto">
                Select a developer in the filters to see their monthly hours compliance below the
                log table.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <DailyLogDetailDialog
        log={selectedLog}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedLog(null);
        }}
      />
    </PortalPageShell>
  );
}
