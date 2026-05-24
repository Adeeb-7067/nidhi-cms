import React, { useEffect, useState, useMemo } from "react";
import {
  useListMyLogs,
  useCreateLog,
  useListProjects,
  useGetDailyLogSummary,
  getGetDailyLogSummaryQueryKey,
  useListUsers,
  getListUsersQueryKey,
  useGetLogComplianceCalendar,
  getGetLogComplianceCalendarQueryKey,
} from "@/api";
import { LogComplianceCalendarPanel } from "@/components/logs/LogComplianceCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Calendar, Loader2, Check, FileText, Briefcase, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { PDFService } from "@/lib/pdf-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";

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

const WORK_CATEGORIES = [
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

export default function DevLogs() {
  const { user } = useAuth();
  const isAdminView = user?.role === "super_admin";
  const [open, setOpen] = useState(false);
  const currentDate = new Date();
  const todayIso = currentDate.toISOString().split("T")[0];
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [developerFilterId, setDeveloperFilterId] = useState<string>("");
  const queryClient = useQueryClient();
  const { page, setPage, resetPage, limit } = useTablePagination();

  const { data: staffData } = useListUsers(
    { staff: "1", limit: 200 },
    {
      query: {
        enabled: isAdminView,
        queryKey: getListUsersQueryKey({ staff: "1", limit: 200 }),
      },
    },
  );
  const staffDevs = useMemo(
    () =>
      (staffData?.users ?? []).filter(
        (u) => u.role === "developer" || u.role === "tester" || u.role === "qa",
      ),
    [staffData?.users],
  );

  useEffect(() => {
    resetPage();
  }, [month, year, developerFilterId, resetPage]);

  const listParams = useMemo(() => {
    const base: { month: number; year: number; page: number; limit: number; developerId?: number } = {
      month,
      year,
      page,
      limit,
    };
    if (isAdminView && developerFilterId) {
      base.developerId = Number.parseInt(developerFilterId, 10);
    }
    return base;
  }, [month, year, isAdminView, developerFilterId, page, limit]);

  const { data, isLoading, refetch } = useListMyLogs(listParams);

  const complianceDeveloperId =
    isAdminView && developerFilterId
      ? Number.parseInt(developerFilterId, 10)
      : user?.id;

  const { data: complianceCalendar, isLoading: complianceLoading } = useGetLogComplianceCalendar(
    { month, year, developerId: complianceDeveloperId! },
    {
      query: {
        enabled: Boolean(complianceDeveloperId),
        queryKey: getGetLogComplianceCalendarQueryKey({
          month,
          year,
          developerId: complianceDeveloperId!,
        }),
      },
    },
  );
  const { data: dailySummary, refetch: refetchDailySummary } = useGetDailyLogSummary(
    { date: todayIso },
    { query: { enabled: !isAdminView, queryKey: getGetDailyLogSummaryQueryKey({ date: todayIso }) } },
  );
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createLog = useCreateLog();

  const handleExportLogs = () => {
    if (!data?.logs || data.logs.length === 0) {
      toast.error("No timesheet entries available to export.");
      return;
    }
    const userObj = JSON.parse(localStorage.getItem("cms_user") || sessionStorage.getItem("cms_user") || "{}");
    const devName = userObj?.name || "Enterprise Developer";
    const monthStr = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    PDFService.generateDeveloperLogsPDF(devName, monthStr, data.logs);
    toast.success("Exporting developer timesheet...");
  };

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      projectId: "",
      logDate: new Date().toISOString().split('T')[0],
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
    const logs = data?.logs ?? [];
    const totalHours = logs.reduce((acc, l) => acc + (l.hoursSpent || 0), 0);
    const projectIds = new Set(logs.map((l) => l.projectId));
    return {
      entries: logs.length,
      totalHours: Math.round(totalHours * 10) / 10,
      projects: projectIds.size,
      avgHours: logs.length ? Math.round((totalHours / logs.length) * 10) / 10 : 0,
    };
  }, [data?.logs]);

  const onSubmit = async (values: LogFormValues) => {
    try {
      await createLog.mutateAsync({
        data: {
          ...values,
          projectId: parseInt(values.projectId),
        },
      });
      toast.success("Log entry submitted!");
      if (
        dailySummary?.complianceEnabled &&
        values.logDate === todayIso &&
        dailySummary.requiredHours != null
      ) {
        const projected = dailySummary.loggedHours + values.hoursSpent;
        const remaining = Math.max(0, dailySummary.requiredHours - projected);
        if (remaining > 0.05) {
          toast.info(`You still need ${remaining.toFixed(1)}h logged for today.`);
        } else {
          toast.success("Today's required hours are complete.");
        }
      }
      setOpen(false);
      form.reset();
      refetch();
      void refetchDailySummary();
      void queryClient.invalidateQueries({ queryKey: getGetDailyLogSummaryQueryKey() });
    } catch (error: any) {
      toastApiError(error, "Action failed. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isAdminView ? "Team daily logs" : "Daily Logs"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isAdminView
              ? "All developer and QA log entries across projects"
              : "Track your time and progress"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdminView && (
            <Select
              value={developerFilterId || "all"}
              onValueChange={(v) => setDeveloperFilterId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All developers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developers</SelectItem>
                {staffDevs.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
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
          {!isAdminView && (
            <Button variant="outline" onClick={handleExportLogs} className="h-9 border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10">
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          )}
          {!isAdminView && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Add Log Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Daily Log Entry</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectsData?.projects.map((project) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input type="date" {...field} />
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
                          {WORK_CATEGORIES.map((category) => (
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
                    <Button type="submit" disabled={createLog.isPending}>
                      {createLog.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Log Entry
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {isAdminView && (
        <>
          {!developerFilterId ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Select a developer to view their daily hours compliance calendar.
              </CardContent>
            </Card>
          ) : (
            <LogComplianceCalendarPanel
              data={complianceCalendar}
              isLoading={complianceLoading}
              title="Developer compliance calendar"
            />
          )}
        </>
      )}

      {!isAdminView && dailySummary?.complianceEnabled && dailySummary.requiredHours != null && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Today&apos;s hours ({todayIso})</p>
                <p className="text-xs text-muted-foreground">
                  Required: {dailySummary.requiredHours}h · Logged: {dailySummary.loggedHours}h
                </p>
              </div>
              <Badge
                variant={dailySummary.isComplete ? "default" : "destructive"}
                className="w-fit"
              >
                {dailySummary.isComplete
                  ? "Complete"
                  : `${dailySummary.remainingHours.toFixed(1)}h remaining`}
              </Badge>
            </div>
            <Progress
              value={Math.min(
                100,
                (dailySummary.loggedHours / dailySummary.requiredHours) * 100,
              )}
              className="h-2"
            />
            {!dailySummary.isComplete && (
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

      {isLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Entries" value={logStats.entries} hint={isAdminView ? "Team this month" : "This month"} icon={Calendar} accent="violet" delay={0} />
          <StatCard title="Hours logged" value={logStats.totalHours} hint="Total time" icon={Clock} accent="blue" delay={1} />
          <StatCard title="Projects" value={logStats.projects} hint="With activity" icon={Briefcase} accent="green" delay={2} />
          <StatCard title="Avg per entry" value={logStats.avgHours} hint="Hours per log" icon={TrendingUp} accent="amber" delay={3} />
        </PageKpiRow>
      )}

      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : data?.logs.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No logs found</h3>
              <p className="text-sm mt-1">
                {isAdminView
                  ? "No team log entries for this month yet."
                  : "You haven't logged any work yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          data?.logs.map(log => (
            <Card key={log.id} className="bg-card hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(log.logDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      <span className="mx-2">•</span>
                      <span className="font-medium text-primary">{log.projectName}</span>
                      {isAdminView && log.developerName && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <User className="h-3 w-3" />
                            {log.developerName}
                            {log.developerEmployeeId ? ` (${log.developerEmployeeId})` : ""}
                          </span>
                        </>
                      )}
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
          limit={data?.limit ?? limit}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
