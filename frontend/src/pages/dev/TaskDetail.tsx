import React, { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetTask,
  useUpdateTask,
  useListAssignableMembers,
  getGetTaskQueryKey,
  getListTasksQueryKey,
  getListAssignableMembersQueryKey,
  type WorkTask,
} from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_TYPE_LABELS,
  taskStatusClass,
  taskPriorityClass,
} from "@/lib/task-ui";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  ListTodo,
  Loader2,
  User,
  Briefcase,
  Tag,
} from "lucide-react";

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  type: z.enum(["task", "feature", "bug_fix", "qa", "chore"]),
  dueDate: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[min(60vh,520px)] w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number.parseInt(id ?? "", 10);
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: task,
    isLoading,
    isError,
  } = useGetTask(taskId, {
    query: {
      enabled: Number.isFinite(taskId) && taskId > 0,
      queryKey: getGetTaskQueryKey(taskId),
    },
  });

  const updateTask = useUpdateTask();
  const canEdit = isAdmin;
  const canUpdateStatus = isAdmin || task?.assigneeId === user?.id;

  const { data: assignableData } = useListAssignableMembers(
    task?.projectId ?? 0,
    { for: "task" },
    {
      query: {
        enabled: !!task?.projectId && (editOpen || isAdmin),
        queryKey: getListAssignableMembersQueryKey(task?.projectId ?? 0, { for: "task" }),
      },
    },
  );

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeId: "none",
      status: "todo",
      priority: "normal",
      type: "task",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (!task) return;
    form.reset({
      title: task.title,
      description: task.description ?? "",
      assigneeId: task.assigneeId?.toString() ?? "none",
      status: task.status,
      priority: task.priority,
      type: task.type,
      dueDate: task.dueDate ?? "",
    });
  }, [task, form]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
    void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  };

  const patchTask = async (data: Parameters<typeof updateTask.mutateAsync>[0]["data"]) => {
    try {
      await updateTask.mutateAsync({ id: taskId, data });
      toast.success("Task updated");
      invalidate();
    } catch (error) {
      toastApiError(error, "Failed to update task");
    }
  };

  const onEditSubmit = async (values: EditFormValues) => {
    await patchTask({
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      type: values.type,
      dueDate: values.dueDate || undefined,
      assigneeId:
        values.assigneeId && values.assigneeId !== "none"
          ? Number.parseInt(values.assigneeId, 10)
          : null,
    });
    setEditOpen(false);
  };

  if (!Number.isFinite(taskId) || taskId <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Invalid task link.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dev/tasks">Back to tasks</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) return <TaskDetailSkeleton />;

  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Task not found</h2>
        <p className="text-sm text-muted-foreground mt-1">It may have been removed or you lack access.</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/dev/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tasks
          </Link>
        </Button>
      </div>
    );
  }

  const description = task.description?.trim();
  const descLength = description?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-6xl">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="h-8 -ml-2 text-muted-foreground" asChild>
          <Link href="/dev/tasks">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All tasks
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{task.taskNumber}</span>
              <Badge variant="outline" className={cn("text-[10px]", taskStatusClass(task.status))}>
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", taskPriorityClass(task.priority))}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {TASK_TYPE_LABELS[task.type]}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight leading-tight break-words">
              {task.title}
            </h1>
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {task.projectName}
              </span>
              {task.assigneeName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {task.assigneeName}
                  {task.assigneeRole && (
                    <span className="text-xs">
                      ({task.assigneeRole === "tester" || task.assigneeRole === "qa" ? "QA" : "Dev"})
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit task
              </Button>
            )}
            {canUpdateStatus && task.status !== "done" && (
              <Button
                size="sm"
                onClick={() => void patchTask({ status: "done" })}
                disabled={updateTask.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Mark done
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* Description — primary scroll region for long content */}
        <Card className="flex flex-col border-border/60 shadow-sm min-h-[min(65vh,560px)] lg:min-h-[calc(100dvh-14rem)]">
          <CardHeader className="shrink-0 border-b border-border/50 py-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Description
              </CardTitle>
              {descLength > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {descLength.toLocaleString()} characters
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <div className="dialog-scroll h-full max-h-[min(58vh,520px)] lg:max-h-[calc(100dvh-18rem)] overflow-y-auto p-5 sm:p-6">
              {description ? (
                <article className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {description}
                </article>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No description provided for this task.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Properties sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pb-5">
              {canUpdateStatus && (
                <MetaRow icon={ListTodo} label="Status">
                  <Select
                    value={task.status}
                    onValueChange={(v) => void patchTask({ status: v as WorkTask["status"] })}
                    disabled={updateTask.isPending}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </MetaRow>
              )}

              {isAdmin && (
                <MetaRow icon={User} label="Assignee">
                  <Select
                    value={task.assigneeId?.toString() ?? "none"}
                    onValueChange={(v) =>
                      void patchTask({
                        assigneeId: v === "none" ? null : Number.parseInt(v, 10),
                      })
                    }
                    disabled={updateTask.isPending}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {assignableData?.members.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name} ({m.role === "tester" || m.role === "qa" ? "QA" : "Dev"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </MetaRow>
              )}

              {!isAdmin && (
                <MetaRow icon={User} label="Assignee">
                  <span className="font-medium">
                    {task.assigneeName ?? (
                      <span className="text-muted-foreground font-normal">Unassigned</span>
                    )}
                  </span>
                </MetaRow>
              )}

              <Separator />

              <MetaRow icon={Tag} label="Priority">
                <span className="capitalize font-medium">{TASK_PRIORITY_LABELS[task.priority]}</span>
              </MetaRow>

              <MetaRow icon={Briefcase} label="Type">
                <span className="font-medium">{TASK_TYPE_LABELS[task.type]}</span>
              </MetaRow>

              <MetaRow icon={Calendar} label="Due date">
                <span className="font-medium">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </MetaRow>

              <Separator />

              <MetaRow icon={User} label="Created by">
                <span className="font-medium">{task.createdByName}</span>
              </MetaRow>

              <MetaRow icon={Clock} label="Created">
                <span className="text-muted-foreground text-xs">
                  {new Date(task.createdAt).toLocaleString()}
                </span>
              </MetaRow>

              <MetaRow icon={Clock} label="Last updated">
                <span className="text-muted-foreground text-xs">
                  {new Date(task.updatedAt).toLocaleString()}
                </span>
              </MetaRow>

              {task.completedAt && (
                <MetaRow icon={CheckCircle2} label="Completed">
                  <span className="text-green-600 text-xs font-medium">
                    {new Date(task.completedAt).toLocaleString()}
                  </span>
                </MetaRow>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Edit dialog — large description field */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>{task.taskNumber}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onEditSubmit)}
              className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="shrink-0">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex flex-col flex-1 min-h-0">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Requirements, acceptance criteria, links, notes…"
                        className="min-h-[220px] max-h-[min(50vh,400px)] resize-y font-mono text-sm leading-relaxed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {assignableData?.members.map((m) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.name}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="shrink-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTask.isPending}>
                  {updateTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
