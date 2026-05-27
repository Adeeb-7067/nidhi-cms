import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useListProjects,
  useListAssignableMembers,
  getListTasksQueryKey,
  getListAssignableMembersQueryKey,
  type WorkTask,
} from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdvancedTable } from "@/components/ui/advanced-table";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevToolbar,
  DevTabsList,
  DevTabsTrigger,
  DevContentCard,
  devActionButtonClass,
} from "@/components/dev/dev-page-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Plus, ListTodo, User, Calendar, Loader2, CheckCircle2, Eye } from "lucide-react";
import { TASK_STATUS_LABELS, taskStatusClass } from "@/lib/task-ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_TABLE_PAGE_SIZE, useTablePagination } from "@/lib/table-pagination";

const taskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  type: z.enum(["task", "feature", "bug_fix", "qa", "chore"]),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function DevTasks() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "mine" | "unassigned">(isAdmin ? "all" : "mine");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination(DEFAULT_TABLE_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [statusFilter, scope, resetPage]);

  const listParams = useMemo(
    () => ({
      page,
      limit: apiLimit,
      ...(statusFilter !== "all" ? { status: statusFilter as WorkTask["status"] } : {}),
      ...(isAdmin && scope !== "all" ? { scope } : !isAdmin ? { scope: "mine" as const } : {}),
    }),
    [statusFilter, scope, isAdmin, page, apiLimit],
  );

  const { data, isLoading } = useListTasks(listParams);
  const { data: projectsData } = useListProjects({ limit: 100 });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: "",
      assigneeId: "none",
      status: "todo",
      priority: "normal",
      type: "task",
      dueDate: "",
    },
  });

  const watchedProjectId = form.watch("projectId");
  const projectIdNum = watchedProjectId ? Number.parseInt(watchedProjectId, 10) : 0;
  const { data: assignableData } = useListAssignableMembers(
    projectIdNum,
    { for: "task" },
    {
      query: {
        enabled: projectIdNum > 0,
        queryKey: getListAssignableMembersQueryKey(projectIdNum, { for: "task" }),
      },
    },
  );

  const taskStats = useMemo(() => {
    const tasks = data?.tasks ?? [];
    return {
      total: data?.total ?? tasks.length,
      mine: tasks.filter((t) => t.assigneeId === user?.id).length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [data, user?.id]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(listParams) });
  };

  const onSubmit = async (values: TaskFormValues) => {
    try {
      await createTask.mutateAsync({
        data: {
          projectId: Number.parseInt(values.projectId, 10),
          title: values.title,
          description: values.description || undefined,
          assigneeId:
            values.assigneeId && values.assigneeId !== "none"
              ? Number.parseInt(values.assigneeId, 10)
              : undefined,
          status: values.status,
          priority: values.priority,
          type: values.type,
          dueDate: values.dueDate || undefined,
        },
      });
      toast.success("Task assigned successfully");
      setOpen(false);
      form.reset();
      invalidate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create task";
      toastApiError(error, message);
    }
  };

  const handleStatusChange = async (task: WorkTask, status: WorkTask["status"]) => {
    try {
      await updateTask.mutateAsync({ id: task.id, data: { status } });
      toast.success("Task updated");
      invalidate();
    } catch (error) {
      toastApiError(error, "Failed to update task");
    }
  };

  return (
    <DevPageShell>
      <DevPageHero
        title={isAdmin ? "Tasks" : "My tasks"}
        subtitle={
          isAdmin
            ? "Assign and track work across your team — ClickUp-style task board"
            : "Work assigned to you by your project lead"
        }
        actions={
          isAdmin ? (
            <Button className={devActionButtonClass()} onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Assign task
            </Button>
          ) : undefined
        }
      />

      <DevKpiGrid
        loading={isLoading && !data}
        items={[
          { title: "Total", value: taskStats.total, hint: "Visible tasks", icon: ListTodo, accent: "violet" },
          { title: "Assigned to me", value: taskStats.mine, hint: "Your queue", icon: User, accent: "blue" },
          { title: "In progress", value: taskStats.inProgress, hint: "Active work", icon: Loader2, accent: "amber" },
          { title: "Completed", value: taskStats.done, hint: "Done", icon: CheckCircle2, accent: "green" },
        ]}
      />

      <DevToolbar className="flex-wrap">
        {isAdmin && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <DevTabsList>
              <DevTabsTrigger value="all">All</DevTabsTrigger>
              <DevTabsTrigger value="mine">Assigned to me</DevTabsTrigger>
              <DevTabsTrigger value="unassigned">Unassigned</DevTabsTrigger>
            </DevTabsList>
          </Tabs>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs bg-muted/50 border-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </DevToolbar>

      <DevContentCard contentClassName="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading tasks…</p>
          ) : (
          <AdvancedTable
            data={data?.tasks ?? []}
            pagination={{
              page: data?.page ?? page,
              total: data?.total ?? 0,
              limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
            }}
            columns={[
              {
                id: "task",
                header: "Task",
                accessorKey: "title",
                cell: (task: WorkTask) => (
                  <div>
                    <p className="text-xs font-semibold line-clamp-2">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{task.taskNumber}</p>
                    {task.description ? (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "project",
                header: "Project",
                accessorKey: "projectName",
                cell: (task: WorkTask) => <span className="text-xs">{task.projectName}</span>,
              },
              {
                id: "assignee",
                header: "Assignee",
                cell: (task: WorkTask) => (
                  <span className="text-xs">
                    {task.assigneeName ? (
                      <>
                        {task.assigneeName}
                        <span className="text-muted-foreground ml-1">({task.assigneeRole})</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </span>
                ),
              },
              {
                id: "priority",
                header: "Priority",
                cell: (task: WorkTask) => (
                  <Badge variant="outline" className="text-[9px] uppercase">{task.priority}</Badge>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: (task: WorkTask) =>
                  isAdmin || task.assigneeId === user?.id ? (
                    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Select
                      value={task.status}
                      onValueChange={(v) => void handleStatusChange(task, v as WorkTask["status"])}
                    >
                      <SelectTrigger className="h-7 w-[130px] text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  ) : (
                    <Badge variant="outline" className={cn("text-[9px]", taskStatusClass(task.status))}>
                      {TASK_STATUS_LABELS[task.status] ?? task.status}
                    </Badge>
                  ),
              },
              {
                id: "due",
                header: "Due",
                cell: (task: WorkTask) => (
                  <span className="text-[10px] text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </span>
                ),
              },
              {
                id: "actions",
                header: "",
                cell: (task: WorkTask) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/dev/tasks/${task.id}`);
                    }}
                    aria-label="View task"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                ),
              },
            ]}
            searchKey="title"
            searchPlaceholder="Search tasks..."
            filename="Tasks"
            viewStorageKey="tasks"
            onRowClick={(task) => setLocation(`/dev/tasks/${task.id}`)}
          />
          )}
      </DevContentCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Assign new task</DialogTitle>
            <DialogDescription>
              Create a task and assign it to a developer or QA on a project.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectsData?.projects.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="What needs to be done?" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="Details, acceptance criteria…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Team member" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned (backlog)</SelectItem>
                          {assignableData?.members.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.name} ({m.role === "tester" || m.role === "qa" ? "QA" : "Dev"})
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="bug_fix">Bug fix</SelectItem>
                          <SelectItem value="qa">QA</SelectItem>
                          <SelectItem value="chore">Chore</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & assign
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DevPageShell>
  );
}
