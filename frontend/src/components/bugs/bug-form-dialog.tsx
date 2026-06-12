import React, { useEffect, useState } from "react";
import {
  createBugBatch,
  useCreateBug,
  useUpdateBug,
  useListProjects,
  useListAssignableMembers,
  getListAssignableMembersQueryKey,
  getListProjectsQueryKey,
  type Bug,
  type BugAttachment,
} from "@/api";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiFileUploader } from "@/components/ui/multi-file-uploader";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import {
  PRIORITY_LABELS,
  formatUserRole,
  isBugReporter,
  canSetDevStatus,
  canSetFinalStatus,
  canSetQaStatus,
} from "@/lib/bug-workflow";
import { BugTrackStatusRow } from "./bug-track-status";
import { BugBatchCreate } from "./bug-batch-create";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type DraftBugRow,
  type BatchInputMode,
  parseLinesToRows,
  validateBatchRows,
  buildBatchParentTitle,
  rowsToBatchItems,
} from "@/lib/bug-batch";

const sharedSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  assigneeIds: z.array(z.string()).optional(),
});

const editSchema = sharedSchema.extend({
  title: z.string().min(1, "Title is required"),
  qaStatus: z.enum(["open", "fixed"]).optional(),
  devStatus: z.enum(["open", "fixed"]).optional(),
  finalStatus: z.enum(["open", "resolved"]).optional(),
  initialComment: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;
type SharedFormValues = z.infer<typeof sharedSchema>;

/** Defer open so the same click is not treated as an outside dismiss (Radix Dialog). */
export function openBugFormDeferred(setOpen: (open: boolean) => void) {
  queueMicrotask(() => setOpen(true));
}

export function BugFormDialog({
  open,
  onOpenChange,
  editBug,
  userRole,
  userId,
  canAssign,
  canFullEdit,
  isAdmin,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBug: Bug | null;
  userRole?: string;
  userId?: number;
  canAssign: boolean;
  canFullEdit: boolean;
  isAdmin: boolean;
  /** Pre-select project (e.g. from Project Detail) */
  defaultProjectId?: number;
}) {
  const queryClient = useQueryClient();
  const createMutation = useCreateBug();
  const updateMutation = useUpdateBug();
  const [attachments, setAttachments] = useState<BugAttachment[]>([]);
  const [batchMode, setBatchMode] = useState<BatchInputMode>("lines");
  const [lineText, setLineText] = useState("");
  const [batchRows, setBatchRows] = useState<DraftBugRow[]>([]);
  const [sharedComment, setSharedComment] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const isCreate = !editBug;

  const projectsParams = { limit: isAdmin ? 200 : 50 };
  const { data: projectsData } = useListProjects(projectsParams, {
    query: { queryKey: getListProjectsQueryKey(projectsParams) },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      projectId: "",
      title: "",
      priority: "p3",
      qaStatus: "open",
      devStatus: "open",
      finalStatus: "open",
      initialComment: "",
      assigneeIds: [],
    },
  });

  const createForm = useForm<SharedFormValues>({
    resolver: zodResolver(sharedSchema),
    defaultValues: {
      projectId: defaultProjectId ? String(defaultProjectId) : "",
      priority: "p3",
      assigneeIds: [],
    },
  });

  const projectIdStr = isCreate
    ? createForm.watch("projectId")
    : editForm.watch("projectId");
  const projectId = projectIdStr ? Number.parseInt(projectIdStr, 10) : 0;

  const { data: assignableData } = useListAssignableMembers(
    projectId,
    { for: "bug" },
    {
      query: {
        enabled: projectId > 0,
        queryKey: getListAssignableMembersQueryKey(projectId, { for: "bug" }),
      },
    },
  );
  const developers = (assignableData?.members ?? []).filter((m) => m.role === "developer");

  useEffect(() => {
    if (!open) return;
    if (editBug) {
      const ids =
        editBug.assignees?.map((a) => String(a.id)) ??
        editBug.assigneeIds?.map(String) ??
        (editBug.assigneeId ? [String(editBug.assigneeId)] : []);
      editForm.reset({
        projectId: String(editBug.projectId),
        title: editBug.title,
        priority: editBug.priority as EditFormValues["priority"],
        qaStatus: (editBug.qaStatus ?? "open") as EditFormValues["qaStatus"],
        devStatus: (editBug.devStatus ?? "open") as EditFormValues["devStatus"],
        finalStatus: (editBug.finalStatus ?? "open") as EditFormValues["finalStatus"],
        initialComment: "",
        assigneeIds: ids,
      });
      setAttachments(editBug.attachments ?? []);
    } else {
      createForm.reset({
        projectId: defaultProjectId ? String(defaultProjectId) : "",
        priority: "p3",
        assigneeIds: [],
      });
      setAttachments([]);
      setLineText("");
      setBatchRows([]);
      setSharedComment("");
      setBatchMode("lines");
    }
  }, [open, editBug, defaultProjectId, editForm, createForm]);

  const isReporter = editBug ? isBugReporter(editBug, userId) : true;

  const submitBatch = async (values: SharedFormValues) => {
    let rows = batchRows;
    if (batchMode === "lines") {
      rows = parseLinesToRows(lineText);
      setBatchRows(rows);
    }
    const err = validateBatchRows(rows);
    if (err) {
      toast.error(err);
      return;
    }

    const projectIdNum = Number.parseInt(values.projectId, 10);
    const assigneeIds = canAssign
      ? (values.assigneeIds ?? []).map((id) => Number.parseInt(id, 10)).filter(Boolean)
      : [];

    setBatchSubmitting(true);

    try {
      if (rows.length === 1) {
        const row = rows[0];
        await createMutation.mutateAsync({
          data: {
            projectId: projectIdNum,
            title: row.title.trim(),
            priority: values.priority,
            qaStatus: row.qaStatus,
            devStatus: row.devStatus,
            finalStatus: row.finalStatus,
            assigneeIds: assigneeIds.length ? assigneeIds : undefined,
            attachments: attachments.length ? attachments : undefined,
            initialComment: sharedComment.trim() || undefined,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
        toast.success("Bug created");
        onOpenChange(false);
        return;
      }

      await createBugBatch({
        projectId: projectIdNum,
        priority: values.priority,
        parentTitle: buildBatchParentTitle(rows),
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
        attachments: attachments.length ? attachments : undefined,
        initialComment: sharedComment.trim() || undefined,
        items: rowsToBatchItems(rows),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      toast.success(`Created batch with ${rows.length} issues`);
      onOpenChange(false);
    } catch (err) {
      toastApiError(err, "Could not create bugs. Check permissions and try again.");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const onSubmitEdit = async (values: EditFormValues) => {
    if (!editBug) return;
    const assigneeIds = canAssign
      ? (values.assigneeIds ?? []).map((id) => Number.parseInt(id, 10)).filter(Boolean)
      : undefined;
    const issueKey = editBug.issueKey;
    const isAssignee =
      !!userId &&
      (editBug.assigneeId === userId ||
        (editBug.assigneeIds?.includes(userId) ?? false));

    try {
      if (canFullEdit) {
        const data: Record<string, unknown> = {
          projectId: Number.parseInt(values.projectId, 10),
          title: values.title,
          priority: values.priority,
          assigneeIds,
          attachments: attachments.length ? attachments : undefined,
        };
        if (canSetQaStatus(userRole)) data.qaStatus = values.qaStatus;
        if (canSetDevStatus(userRole, isAssignee)) data.devStatus = values.devStatus;
        if (canSetFinalStatus(userRole)) data.finalStatus = values.finalStatus;
        if (issueKey) data.issueKey = issueKey;
        await updateMutation.mutateAsync({
          id: editBug.id,
          data,
        });
      } else {
        await updateMutation.mutateAsync({
          id: editBug.id,
          data: {
            devStatus: values.devStatus,
            attachments: attachments.length ? attachments : undefined,
          },
        });
      }
      toast.success("Bug updated");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
    } catch (err) {
      toastApiError(err, "Could not save bug");
    }
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || batchSubmitting;

  const pendingCount =
    batchMode === "lines" ? parseLinesToRows(lineText).length : batchRows.length;

  const renderAssigneePicker = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>,
    selected: string[],
  ) => (
    <FormField
      control={control}
      name="assigneeIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Assigned developers</FormLabel>
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-between font-normal h-10",
                  !selected.length && "text-muted-foreground",
                )}
              >
                {selected.length ? `${selected.length} selected` : "Select developers"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2" align="start">
              <div className="max-h-[220px] overflow-y-auto space-y-1">
                {developers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Select a project first</p>
                ) : (
                  developers.map((dev) => {
                    const checked = field.value?.includes(String(dev.id));
                    return (
                      <label
                        key={dev.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = new Set(field.value ?? []);
                            if (c) next.add(String(dev.id));
                            else next.delete(String(dev.id));
                            field.onChange([...next]);
                          }}
                        />
                        <span className="flex-1">{dev.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatUserRole(dev.role)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-card/95 backdrop-blur-xl border-border shadow-2xl",
          isCreate ? "sm:max-w-[720px]" : "sm:max-w-[640px]",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {editBug
              ? editBug.issueKey
                ? "Edit issue"
                : canFullEdit
                  ? "Edit bug"
                  : "Update bug"
              : "Report bugs"}
          </DialogTitle>
          <DialogDescription>
            {editBug
              ? "Update this issue."
              : "Add one or many issues. Each has QA, Dev, and Final status — saved as one report when you add several."}
          </DialogDescription>
        </DialogHeader>

        {isCreate ? (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(submitBatch)}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={!!defaultProjectId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectsData?.projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (all bugs)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>
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

              {canAssign &&
                renderAssigneePicker(
                  createForm.control,
                  createForm.watch("assigneeIds") ?? [],
                )}

              <BugBatchCreate
                mode={batchMode}
                onModeChange={setBatchMode}
                lineText={lineText}
                onLineTextChange={setLineText}
                rows={batchRows}
                onRowsChange={setBatchRows}
                userRole={userRole}
              />

              <div className="space-y-2">
                <Label htmlFor="shared-comment" className="text-xs">
                  Shared comment (optional, first bug only)
                </Label>
                <Textarea
                  id="shared-comment"
                  value={sharedComment}
                  onChange={(e) => setSharedComment(e.target.value)}
                  placeholder="Notes for the QA thread…"
                  className="min-h-[64px] text-sm"
                />
              </div>

              <div>
                <Label className="mb-2 block text-xs">Files / photos (shared)</Label>
                <MultiFileUploader
                  value={attachments}
                  onChange={setAttachments}
                  category="bugs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isPending || pendingCount === 0}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {pendingCount > 0
                    ? `Create ${pendingCount} bug${pendingCount !== 1 ? "s" : ""}`
                    : "Create bugs"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4 pt-2"
            >
              {canFullEdit && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              editForm.setValue("assigneeIds", []);
                            }}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectsData?.projects.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Short issue title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                                <SelectItem key={k} value={k}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {canAssign &&
                      renderAssigneePicker(
                        editForm.control,
                        editForm.watch("assigneeIds") ?? [],
                      )}
                  </div>

                  <div>
                    <Label className="mb-2 block">Files / photos</Label>
                    <MultiFileUploader
                      value={attachments}
                      onChange={setAttachments}
                      category="bugs"
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="mb-2 block">Status</Label>
                <BugTrackStatusRow
                  qaStatus={editForm.watch("qaStatus")}
                  devStatus={editForm.watch("devStatus")}
                  finalStatus={editForm.watch("finalStatus")}
                  userRole={userRole}
                  isAssignee={
                    !!userId &&
                    (editBug!.assigneeId === userId ||
                      (editBug!.assigneeIds?.includes(userId) ?? false))
                  }
                  onQaChange={(v) => editForm.setValue("qaStatus", v)}
                  onDevChange={(v) => editForm.setValue("devStatus", v)}
                  onFinalChange={(v) => editForm.setValue("finalStatus", v)}
                />
              </div>

              {!canFullEdit && (
                <div>
                  <Label className="mb-2 block">Add fix evidence</Label>
                  <MultiFileUploader
                    value={attachments}
                    onChange={setAttachments}
                    category="bugs"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
