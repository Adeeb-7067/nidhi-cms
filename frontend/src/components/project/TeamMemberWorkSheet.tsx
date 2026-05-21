import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListTasks,
  useListMyLogs,
  useGetProjectLogs,
  getListTasksQueryKey,
  getListMyLogsQueryKey,
  getGetProjectLogsQueryKey,
  type ProjectMember,
  type WorkTask,
} from "@/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ListTodo, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TASK_STATUS_LABELS, taskStatusClass } from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import { listQueryOptions } from "@/lib/list-query-options";

export type MemberWorkTab = "tasks" | "logs";

type TeamMemberWorkSheetProps = {
  projectId: number;
  member: ProjectMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: MemberWorkTab;
  onViewProjectLogs?: () => void;
};

function LogEntryCard({
  title,
  date,
  hours,
  completionPct,
  description,
  categories,
}: {
  title: string;
  date: string;
  hours: number;
  completionPct: number;
  description?: string | null;
  categories?: string[];
}) {
  return (
    <div className="border border-border rounded-lg p-3 bg-background/50">
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <div className="min-w-0">
          <h4 className="text-xs font-medium truncate">{title}</h4>
          <p className="text-[10px] text-muted-foreground">{date}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-sm">{hours}h</span>
          <p className="text-[10px] text-green-600 font-medium">{completionPct}% complete</p>
        </div>
      </div>
      {description ? (
        <p className="text-xs mt-1 text-foreground/80 line-clamp-3">{description}</p>
      ) : null}
      {categories && categories.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-2">
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5">
              {cat}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskRow({ task, showTaskLink }: { task: WorkTask; showTaskLink: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 border border-border rounded-lg bg-background/50">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{task.title}</p>
        {task.description ? (
          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge variant="outline" className={cn("text-[9px] h-4", taskStatusClass(task.status))}>
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
          <Badge variant="secondary" className="text-[9px] h-4 capitalize">
            {task.priority}
          </Badge>
          {task.dueDate ? (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </div>
      {showTaskLink ? (
        <Button variant="ghost" size="sm" className="h-7 text-[10px] shrink-0" asChild>
          <Link href={`/dev/tasks/${task.id}`}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function TeamMemberWorkSheet({
  projectId,
  member,
  open,
  onOpenChange,
  initialTab = "tasks",
  onViewProjectLogs,
}: TeamMemberWorkSheetProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<MemberWorkTab>(initialTab);
  const isAdmin = user?.role === "super_admin";
  const userId = member?.userId;

  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, member?.userId]);

  const taskParams = useMemo(
    () =>
      userId
        ? {
            projectId,
            assigneeId: userId,
            limit: 50,
            ...(isAdmin ? { scope: "all" as const } : {}),
          }
        : undefined,
    [projectId, userId, isAdmin],
  );

  const { data: tasksData, isLoading: tasksLoading } = useListTasks(taskParams, {
    query: {
      enabled: open && !!userId && !!taskParams,
      ...listQueryOptions({
        queryKey: taskParams ? getListTasksQueryKey(taskParams) : ["tasks", "member", "idle"],
      }),
    },
  });

  const logParams = useMemo(
    () => (userId ? { projectId, developerId: userId, limit: 50 } : undefined),
    [projectId, userId],
  );

  const { data: adminLogsData, isLoading: adminLogsLoading } = useListMyLogs(logParams, {
    query: {
      enabled: open && !!userId && isAdmin && !!logParams,
      ...listQueryOptions({
        queryKey: logParams ? getListMyLogsQueryKey(logParams) : ["logs", "member", "idle"],
      }),
    },
  });

  const { data: projectLogsData, isLoading: projectLogsLoading } = useGetProjectLogs(projectId, {
    query: {
      enabled: open && !!userId && !isAdmin,
      queryKey: getGetProjectLogsQueryKey(projectId),
    },
  });

  const memberLogs = useMemo(() => {
    if (!userId) return [];
    if (isAdmin) return adminLogsData?.logs ?? [];
    return (projectLogsData?.logs ?? []).filter((log) => log.developerId === userId);
  }, [userId, isAdmin, adminLogsData?.logs, projectLogsData?.logs]);

  const logsLoading = isAdmin ? adminLogsLoading : projectLogsLoading;
  const tasks = tasksData?.tasks ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="text-base pr-8">{member?.name ?? "Team member"}</SheetTitle>
          <SheetDescription className="text-xs">
            {member?.subType || member?.designation || "Team member"}
            {member?.employeeId ? ` · ${member.employeeId}` : ""}
            {" — "}
            tasks and daily logs on this project
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as MemberWorkTab)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="tasks" className="text-xs gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Tasks
              {tasks.length > 0 ? (
                <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                  {tasks.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Daily logs
              {memberLogs.length > 0 ? (
                <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                  {memberLogs.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-3 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {tasksLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg">
                No tasks assigned to this member on this project.
              </p>
            ) : (
              tasks.map((task) => (
                <TaskRow key={task.id} task={task} showTaskLink={user?.role !== "client"} />
              ))
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-3 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {logsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : memberLogs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg">
                No daily logs recorded for this member on this project.
              </p>
            ) : (
              memberLogs.map((log) => (
                <LogEntryCard
                  key={log.id}
                  title={log.taskTitle}
                  date={new Date(log.logDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  hours={log.hoursSpent}
                  completionPct={log.completionPct}
                  description={log.taskDescription}
                  categories={log.workCategories}
                />
              ))
            )}
            {onViewProjectLogs ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs mt-2"
                onClick={() => {
                  onViewProjectLogs();
                  onOpenChange(false);
                }}
              >
                View all project logs
              </Button>
            ) : null}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
