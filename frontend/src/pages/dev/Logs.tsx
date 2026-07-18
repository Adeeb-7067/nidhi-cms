import React, { useEffect, useState, useMemo } from "react";
import {
  useListMyLogs,
  useCreateLog,
  useUpdateLog,
  useListProjects,
  useGetDailyLogSummary,
  getGetDailyLogSummaryQueryKey,
  useGetLogComplianceCalendar,
  getGetLogComplianceCalendarQueryKey,
  type DailyLog,
} from "@/api";
import { AdminTeamLogsPanel } from "@/components/logs/AdminTeamLogsPanel";
import { DailyLogDetailDialog } from "@/components/logs/DailyLogDetailDialog";
import { LogComplianceCalendarPanel } from "@/components/logs/LogComplianceCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Calendar, Loader2, FileText, Briefcase, TrendingUp, AlertTriangle, Pencil } from "lucide-react";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevEmptyState,
  devActionButtonClass,
} from "@/components/dev/dev-page-kit";
import { PDFService } from "@/lib/pdf-service";
import { PageLogEntriesSkeleton } from "@/components/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";
import {
  formatDailyLogUpdatedLabel,
  formatDailyLogWorkDate,
} from "@/lib/daily-log-format";
import { DAILY_LOG_VIRTUAL_PROJECTS } from "@/lib/daily-log-project-options";
import { cn } from "@/lib/utils";

function localIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const logSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  logDate: z.string()
    .min(1, "Date is required")
    .refine(date => new Date(date) <= new Date(), { message: "Log date cannot be in the future" }),
  taskTitle: z.string().min(1, "Title is required"),
  workCategories: z.array(z.string()).min(1, "Select at least one category"),
  hoursSpent: z.coerce.number().min(0.5, "Minimum 0.5 hours").max(16, "Maximum 16 hours"),
  completionPct: z.number().min(0).max(100),
  taskDescription: z.string().optional(),
  blockers: z.string().optional(),
  nextDayPlan: z.string().optional(),
});

type LogFormValues = z.infer<typeof logSchema>;

const DEV_WORK_CATEGORIES = [
  { id: "development", label: "Development" },
  { id: "design", label: "Design" },
  { id: "testing", label: "Testing" },
  { id: "bug_fixing", label: "Bug Fixing" },
  { id: "code_review", label: "Code Review" },
  { id: "deployment", label: "Deployment" },
  { id: "documentation", label: "Documentation" },
  { id: "meeting", label: "Meeting" },
  { id: "research", label: "Research" },
];

const BDE_WORK_CATEGORIES = [
  { id: "lead_generation", label: "Lead generation" },
  { id: "follow_up", label: "Follow-up" },
  { id: "proposal", label: "Proposal" },
  { id: "client_meeting", label: "Client meeting" },
  { id: "negotiation", label: "Negotiation" },
  { id: "demo", label: "Product demo" },
  { id: "documentation", label: "Documentation" },
  { id: "meeting", label: "Internal meeting" },
  { id: "research", label: "Research" },
];

function workCategoriesForRole(role: string | undefined) {
  return role === "bde" ? BDE_WORK_CATEGORIES : DEV_WORK_CATEGORIES;
}

export default function DevLogs() {
  const { user } = useAuth();
  if (user?.role === "super_admin") {
    return <AdminTeamLogsPanel />;
  }
  return <DeveloperLogsView />;
}

function DeveloperLogsView() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [viewingLog, setViewingLog] = useState<DailyLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const todayIso = localIsoDate();
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const queryClient = useQueryClient();

  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination(20);

  useEffect(() => { resetPage(); }, [month, year, resetPage]);

  const listParams = useMemo(
    () => ({ month, year, page, limit: apiLimit }),
    [month, year, page, apiLimit],
  );
  // Separate fetch for KPI tiles and export — always covers the full month (up to 1000 rows).
  const statsParams = useMemo(
    () => ({ month, year, page: 1, limit: 1000 }),
    [month, year],
  );

  const { data, isLoading, refetch } = useListMyLogs(listParams);
  const { data: statsData, refetch: refetchStats } = useListMyLogs(statsParams);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayLogs = useMemo((): DailyLog[] => (data as any)?.logs ?? [], [data]);
  const { data: dailySummary, refetch: refetchDailySummary } = useGetDailyLogSummary(
    { date: todayIso },
    { query: { queryKey: getGetDailyLogSummaryQueryKey({ date: todayIso }) } },
  );
  const developerId = user?.id;
  const { data: complianceCalendar, isLoading: complianceLoading } = useGetLogComplianceCalendar(
    { month, year, developerId: developerId ?? 0 },
    {
      query: {
        enabled: Boolean(developerId),
        queryKey: getGetLogComplianceCalendarQueryKey({
          month,
          year,
          developerId: developerId ?? 0,
        }),
      },
    },
  );
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createLog = useCreateLog();
  const updateLog = useUpdateLog();
  const isEditMode = editingLog != null;
  const isSaving = createLog.isPending || updateLog.isPending;
  const workCategories = useMemo(() => workCategoriesForRole(user?.role), [user?.role]);

  const canEditLogEntry = (log: DailyLog) =>
    String(log.logDate).slice(0, 10) === todayIso;

  const openCreateDialog = () => {
    setEditingLog(null);
    form.reset({
      projectId: "",
      logDate: todayIso,
      taskTitle: "",
      workCategories: [],
      hoursSpent: 1,
      completionPct: 0,
      taskDescription: "",
      blockers: "",
      nextDayPlan: "",
    });
    setOpen(true);
  };

  const openEditDialog = (log: DailyLog) => {
    setEditingLog(log);
    form.reset({
      projectId: log.projectId.toString(),
      logDate: String(log.logDate).slice(0, 10),
      taskTitle: log.taskTitle,
      workCategories: log.workCategories ?? [],
      hoursSpent: log.hoursSpent,
      completionPct: log.completionPct,
      taskDescription: log.taskDescription ?? "",
      blockers: log.blockers ?? "",
      nextDayPlan: log.nextDayPlan ?? "",
    });
    setOpen(true);
  };

  const handleExportLogs = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMonthLogs: DailyLog[] = (statsData as any)?.logs ?? [];
    if (allMonthLogs.length === 0) {
      toast.error("No timesheet entries available to export.");
      return;
    }
    const userObj = JSON.parse(localStorage.getItem("cms_user") || sessionStorage.getItem("cms_user") || "{}");
    const staffName = userObj?.name || (user?.role === "bde" ? "BDE" : "Enterprise Developer");
    const monthStr = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    PDFService.generateDeveloperLogsPDF(staffName, monthStr, allMonthLogs);
    toast.success("Exporting timesheet...");
  };

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      projectId: "",
      logDate: localIsoDate(),
      taskTitle: "",
      workCategories: [],
      hoursSpent: 1,
      completionPct: 0,
      taskDescription: "",
      blockers: "",
      nextDayPlan: "",
    },
  });

  const logStats = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthLogs: DailyLog[] = (statsData as any)?.logs ?? [];
    const totalHours = monthLogs.reduce((acc, l) => acc + (l.hoursSpent || 0), 0);
    const projectIds = new Set(monthLogs.map((l) => l.projectId));
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries: (statsData as any)?.total ?? monthLogs.length,
      totalHours: Math.round(totalHours * 10) / 10,
      projects: projectIds.size,
      avgHours: monthLogs.length ? Math.round((totalHours / monthLogs.length) * 10) / 10 : 0,
    };
  }, [statsData]);

  const onSubmit = async (values: LogFormValues) => {
    try {
      if (isEditMode && editingLog) {
        const nextProjectId = parseInt(values.projectId, 10);
        await updateLog.mutateAsync({
          id: editingLog.id,
          data: {
            ...(nextProjectId !== editingLog.projectId ? { projectId: nextProjectId } : {}),
            taskTitle: values.taskTitle,
            workCategories: values.workCategories,
            hoursSpent: values.hoursSpent,
            completionPct: values.completionPct,
            taskDescription: values.taskDescription || undefined,
            blockers: values.blockers || undefined,
            nextDayPlan: values.nextDayPlan || undefined,
          },
        });
        toast.success("Log entry updated!");
      } else {
        await createLog.mutateAsync({
          data: {
            ...values,
            projectId: parseInt(values.projectId, 10),
          },
        });
        toast.success("Log entry submitted!");
      }

      const affectsToday =
        values.logDate === todayIso ||
        (isEditMode && editingLog && String(editingLog.logDate).slice(0, 10) === todayIso);

      if (affectsToday && dailySummary?.requiredHours != null) {
        void refetchDailySummary();
        const priorHours =
          isEditMode && editingLog && String(editingLog.logDate).slice(0, 10) === todayIso
            ? editingLog.hoursSpent
            : 0;
        const projected =
          dailySummary.loggedHours - priorHours + values.hoursSpent;
        const remaining = Math.max(0, dailySummary.requiredHours - projected);
        if (remaining > 0.05) {
          toast.info(`You still need ${remaining.toFixed(1)}h logged for today.`);
        } else {
          toast.success("Today's required hours are complete.");
        }
      }

      setOpen(false);
      setEditingLog(null);
      form.reset();
      refetch();
      refetchStats();
      void refetchDailySummary();
      void queryClient.invalidateQueries({ queryKey: getGetDailyLogSummaryQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getGetLogComplianceCalendarQueryKey({
          month,
          year,
          developerId: developerId ?? 0,
        }),
      });
    } catch (error: unknown) {
      toastApiError(error, isEditMode ? "Failed to update log entry." : "Action failed. Please try again.");
    }
  };

  const monthYearFilters = (
    <>
      <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
        <SelectTrigger className={devActionButtonClass("w-[130px] bg-muted/50 border-0")}>
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
      <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
        <SelectTrigger className={devActionButtonClass("w-[100px] bg-muted/50 border-0")}>
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 3 }, (_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <DevPageShell>
      <DevPageHero
        title="Daily Logs"
        subtitle="Track your time and progress"
        badge={`${new Date(year, month - 1).toLocaleString("default", { month: "short" })} ${year}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {monthYearFilters}
            <Button
              variant="outline"
              onClick={handleExportLogs}
              className={devActionButtonClass("border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10")}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Export PDF
            </Button>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) setEditingLog(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className={devActionButtonClass()} onClick={openCreateDialog}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Log Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Daily Log Entry" : "Add Daily Log Entry"}</DialogTitle>
                {isEditMode && (
                  <p className="text-xs text-muted-foreground">
                    You can edit today&apos;s logs only. The log date cannot be changed.
                  </p>
                )}
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project / activity</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project or activity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                                  {projectsData!.projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id.toString()}>
                                      {project.name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ) : null}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Use Meeting or Others when the time is not tied to a specific project.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isEditMode} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="taskTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Title</FormLabel>
                        <FormControl>
                          <Input placeholder="What did you work on?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workCategories"
                    render={() => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {workCategories.map((category) => (
                            <FormField
                              key={category.id}
                              control={form.control}
                              name="workCategories"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={category.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, category.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== category.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-xs font-normal cursor-pointer">
                                      {category.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hoursSpent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours Spent</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.5" min="0.5" max="16" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="completionPct"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between">
                            <FormLabel>Completion</FormLabel>
                            <span className="text-xs font-medium">{field.value}%</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(val) => field.onChange(val[0])}
                              className="py-4"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="taskDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Details of the task..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="blockers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blockers (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any blockers or impediments?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextDayPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Day Plan (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Plan for tomorrow?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditMode ? "Save changes" : "Submit Log Entry"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {dailySummary && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Today&apos;s hours timeline</p>
                <p className="text-xs text-muted-foreground">
                  {dailySummary.requiredHours != null
                    ? `Required ${dailySummary.requiredHours}h · Logged ${dailySummary.loggedHours.toFixed(1)}h · Remaining ${dailySummary.remainingHours.toFixed(1)}h`
                    : `Logged ${dailySummary.loggedHours.toFixed(1)}h today (${todayIso})`}
                </p>
              </div>
              {dailySummary.requiredHours != null && (
                <Badge
                  variant={dailySummary.isComplete ? "default" : "destructive"}
                  className="w-fit"
                >
                  {dailySummary.isComplete
                    ? "Complete"
                    : `${dailySummary.remainingHours.toFixed(1)}h remaining`}
                </Badge>
              )}
            </div>
            {dailySummary.requiredHours != null && dailySummary.requiredHours > 0 ? (
              <>
                <div
                  className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${dailySummary.loggedHours.toFixed(1)} hours logged, ${dailySummary.remainingHours.toFixed(1)} hours remaining`}
                >
                  <div
                    className={cn(
                      "h-full transition-all",
                      dailySummary.isComplete ? "bg-emerald-500" : "bg-primary",
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        (dailySummary.loggedHours / dailySummary.requiredHours) * 100,
                      )}%`,
                    }}
                  />
                  {!dailySummary.isComplete && (
                    <div
                      className="h-full bg-muted-foreground/25"
                      style={{
                        width: `${Math.min(
                          100,
                          (dailySummary.remainingHours / dailySummary.requiredHours) * 100,
                        )}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", dailySummary.isComplete ? "bg-emerald-500" : "bg-primary")} />
                    Logged {dailySummary.loggedHours.toFixed(1)}h
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    Remaining {dailySummary.remainingHours.toFixed(1)}h
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (dailySummary.loggedHours / 8) * 100)}%`,
                  }}
                />
              </div>
            )}
            {dailySummary.complianceEnabled &&
              dailySummary.requiredHours != null &&
              !dailySummary.isComplete && (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Daily hours incomplete</AlertTitle>
                  <AlertDescription className="text-xs">
                    Log {dailySummary.remainingHours.toFixed(1)} more hour(s) today. If you miss the
                    target, you will receive an in-app notification and email reminder.
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
      )}

      {developerId != null && (
        <LogComplianceCalendarPanel
          data={complianceCalendar}
          isLoading={complianceLoading}
          title="Hours timeline"
        />
      )}

      <DevKpiGrid
        loading={isLoading && !data}
        items={[
          { title: "Entries", value: logStats.entries, hint: "This month", icon: Calendar, accent: "violet" },
          { title: "Hours logged", value: logStats.totalHours, hint: "Total time", icon: Clock, accent: "blue" },
          { title: "Projects", value: logStats.projects, hint: "With activity", icon: Briefcase, accent: "green" },
          { title: "Avg per entry", value: logStats.avgHours, hint: "Hours per log", icon: TrendingUp, accent: "amber" },
        ]}
      />

      <div className="space-y-4">
        {isLoading ? (
          <PageLogEntriesSkeleton count={5} />
        ) : displayLogs.length === 0 ? (
          <DevEmptyState
            icon={Clock}
            title="No logs found"
            description="You haven't logged any work yet."
          />
        ) : (
          displayLogs.map(log => (
            <Card
              key={log.id}
              className="bg-card hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                setViewingLog(log);
                setDetailOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDailyLogWorkDate(log.logDate)}</span>
                      {log.updatedAt && (
                        <span className="text-[10px] tabular-nums">
                          {formatDailyLogUpdatedLabel(log.logDate, log.updatedAt)}
                        </span>
                      )}
                      <span className="mx-1 hidden sm:inline">•</span>
                      <span className="font-medium text-primary">{log.projectName}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{log.taskTitle}</h3>
                    {log.taskDescription && <p className="text-xs text-muted-foreground max-w-3xl">{log.taskDescription}</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {log.workCategories.map(cat => (
                        <Badge key={cat} variant="secondary" className="text-[10px]">{cat.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
                    <div className="text-center md:text-right">
                      <div className="text-xl font-bold text-foreground">{log.hoursSpent}<span className="text-xs font-normal text-muted-foreground">h</span></div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Logged</div>
                    </div>
                    <div className="text-center md:text-right">
                      <div className="text-lg font-bold text-green-500">{log.completionPct}%</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</div>
                    </div>
                    {canEditLogEntry(log) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(log);
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                {(log.blockers || log.nextDayPlan) && (
                  <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4">
                    {log.blockers && (
                      <div className="bg-destructive/5 rounded-md p-2 border border-destructive/20">
                        <h4 className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1">Blockers</h4>
                        <p className="text-xs">{log.blockers}</p>
                      </div>
                    )}
                    {log.nextDayPlan && (
                      <div className="bg-primary/5 rounded-md p-2 border border-primary/20">
                        <h4 className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Next Day Plan</h4>
                        <p className="text-xs">{log.nextDayPlan}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        <DataPagination
          page={data?.page ?? page}
          total={data?.total ?? 0}
          limit={limit}
          loadedRowCount={displayLogs.length}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      <DailyLogDetailDialog
        log={viewingLog}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setViewingLog(null);
        }}
      />
    </DevPageShell>
  );
}
