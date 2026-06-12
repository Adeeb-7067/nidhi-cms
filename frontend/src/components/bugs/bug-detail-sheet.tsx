import React, { useMemo, useState } from "react";
import {
  useGetBug,
  getGetBugQueryKey,
  useUpdateBug,
  deleteBug,
  deleteBugIssue,
  type Bug,
} from "@/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight, Pencil, Search, Trash2, X } from "lucide-react";
import { AssigneeAvatars } from "./assignee-avatars";
import { BugAttachmentsGallery } from "./bug-attachments";
import { BugCommentsSection } from "./bug-comments";
import { BugTrackStatusRow, BugTrackStatusBadges } from "./bug-track-status";
import {
  PRIORITY_LABELS,
  formatUserRole,
  canAddBugIssues,
  canUserModifyBug,
  type FinalStatus,
  type TrackStatus,
} from "@/lib/bug-workflow";
import { BugAddIssuesForm } from "./bug-add-issues-form";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
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

type IssueView = NonNullable<Bug["children"]>[number];

export function BugDetailSheet({
  bugId,
  open,
  onOpenChange,
  onEdit,
  canComment,
  userRole,
  userId,
  listQueryKey,
  initialIssueKey,
  onSelectChild,
  onSelectParent,
}: {
  bugId: number | null;
  open: boolean;
  /** Open sheet focused on an embedded batch issue */
  initialIssueKey?: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (bug: Bug) => void;
  onSelectChild?: (bug: Bug, issueKey?: string) => void;
  onSelectParent?: (parentId: number) => void;
  canComment: boolean;
  userRole?: string;
  userId?: number;
  listQueryKey?: unknown;
}) {
  const queryClient = useQueryClient();
  const [activeIssueKey, setActiveIssueKey] = useState<string | null>(null);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueTrack, setIssueTrack] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<"bug" | string | null>(null); // "bug" or issueKey
  const [isDeleting, setIsDeleting] = useState(false);

  React.useEffect(() => {
    if (open && initialIssueKey) setActiveIssueKey(initialIssueKey);
    if (!open) setActiveIssueKey(null);
  }, [open, initialIssueKey, bugId]);

  const id = bugId ?? 0;
  const { data: bug, isLoading } = useGetBug(id, {
    query: {
      enabled: open && !!bugId,
      queryKey: getGetBugQueryKey(id),
    },
  });

  const parentId = bug?.parentBugId ?? null;
  const { data: parentBug } = useGetBug(parentId ?? 0, {
    query: {
      enabled: open && !!parentId,
      queryKey: getGetBugQueryKey(parentId ?? 0),
    },
  });

  const updateMutation = useUpdateBug();

  const invalidate = (bugIdNum: number) => {
    queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
    if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
    queryClient.invalidateQueries({ queryKey: getGetBugQueryKey(bugIdNum) });
  };

  const patchStatus = async (
    payload: Record<string, string>,
    issueKey?: string,
  ) => {
    if (!bug) return;
    try {
      await updateMutation.mutateAsync({
        id: bug.id,
        data: issueKey ? { ...payload, issueKey } : payload,
      });
      invalidate(bug.id);
      toast.success("Status updated");
    } catch (err) {
      toastApiError(err, "Status update failed");
    }
  };

  const canDelete =
    userRole === "super_admin" ||
    ((userRole === "tester" || userRole === "qa") && bug?.reporterId === userId);

  const confirmDelete = async () => {
    if (!bug || !deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget === "bug") {
        await deleteBug(bug.id);
        queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
        if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
        toast.success("Bug deleted");
        onOpenChange(false);
      } else {
        const updated = await deleteBugIssue(bug.id, deleteTarget);
        queryClient.setQueryData(getGetBugQueryKey(bug.id), updated);
        queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
        if (listQueryKey) queryClient.invalidateQueries({ queryKey: listQueryKey as string[] });
        if (activeIssueKey === deleteTarget) setActiveIssueKey(null);
        toast.success("Issue deleted");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const issues = bug?.children ?? bug?.issues ?? [];
  const isBatch = issues.length > 0;

  const filteredIssues = useMemo(() => {
    let result = issues;
    const q = issueSearch.trim().toLowerCase();
    if (q) result = result.filter((i) => (i.title ?? "").toLowerCase().includes(q));
    if (issueTrack === "open")
      result = result.filter((i) => i.qaStatus === "open" || i.devStatus === "open" || i.finalStatus === "open");
    else if (issueTrack === "dev_fixed") result = result.filter((i) => i.devStatus === "fixed");
    else if (issueTrack === "qa_verified") result = result.filter((i) => i.qaStatus === "fixed");
    else if (issueTrack === "resolved") result = result.filter((i) => i.finalStatus === "resolved");
    return result;
  }, [issues, issueSearch, issueTrack]);
  const activeIssue =
    activeIssueKey && isBatch
      ? issues.find((i) => i.issueKey === activeIssueKey)
      : null;

  const displayQa = activeIssue?.qaStatus ?? bug?.qaStatus;
  const displayDev = activeIssue?.devStatus ?? bug?.devStatus;
  const displayFinal = activeIssue?.finalStatus ?? bug?.finalStatus;
  const displayTitle = activeIssue?.title ?? bug?.title;

  const editTarget: Bug | null = bug
    ? activeIssue
      ? ({
          ...bug,
          issueKey: activeIssue.issueKey,
          title: activeIssue.title,
          qaStatus: activeIssue.qaStatus,
          devStatus: activeIssue.devStatus,
          finalStatus: activeIssue.finalStatus,
        } as Bug)
      : bug
    : null;

  return (
    <>
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) setActiveIssueKey(null);
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0 bg-card border-border"
      >
        {isLoading || !bug ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (() => {
          const canModify = canUserModifyBug(userRole, userId, bug);
          const isAssignee =
            userId != null &&
            (bug.assigneeId === userId ||
              (bug.assigneeIds?.includes(userId) ?? false));

          return (
            <>
              <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60 text-left space-y-3 shrink-0">
                {activeIssue && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveIssueKey(null)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to report
                  </button>
                )}
                {!activeIssue && parentBug && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onSelectParent?.(parentBug.id)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to {parentBug.title}
                  </button>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{bug.bugNumber}</span>
                  <Badge variant="outline" className="text-[10px] h-5 font-normal">
                    {PRIORITY_LABELS[bug.priority] ?? bug.priority}
                  </Badge>
                  {isBatch && !activeIssue && (
                    <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                      {issues.length} issues
                    </Badge>
                  )}
                </div>

                <SheetTitle className="text-base font-semibold leading-snug pr-6">
                  {displayTitle}
                </SheetTitle>

                <p className="text-xs text-muted-foreground">
                  {bug.projectName} · {bug.reporterName} ({formatUserRole(bug.reporterRole)})
                </p>

                <div className="flex items-center justify-between gap-2">
                  <AssigneeAvatars assignees={bug.assignees} size="sm" />
                  <div className="flex items-center gap-1.5">
                    {canModify && editTarget && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onEdit(editTarget)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canDelete && !activeIssue && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget("bug")}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {canModify && !activeIssue && (
                  <BugTrackStatusRow
                    qaStatus={displayQa}
                    devStatus={displayDev}
                    finalStatus={displayFinal}
                    userRole={userRole}
                    isAssignee={isAssignee}
                    disabled={updateMutation.isPending}
                    onQaChange={(v: TrackStatus) =>
                      void patchStatus({ qaStatus: v })
                    }
                    onDevChange={(v: TrackStatus) =>
                      void patchStatus({ devStatus: v })
                    }
                    onFinalChange={(v: FinalStatus) =>
                      void patchStatus({ finalStatus: v })
                    }
                  />
                )}

                {canModify && activeIssue && activeIssue.issueKey && (
                  <BugTrackStatusRow
                    qaStatus={displayQa}
                    devStatus={displayDev}
                    finalStatus={displayFinal}
                    userRole={userRole}
                    isAssignee={isAssignee}
                    disabled={updateMutation.isPending}
                    onQaChange={(v) =>
                      void patchStatus({ qaStatus: v }, activeIssue.issueKey)
                    }
                    onDevChange={(v) =>
                      void patchStatus({ devStatus: v }, activeIssue.issueKey)
                    }
                    onFinalChange={(v) =>
                      void patchStatus({ finalStatus: v }, activeIssue.issueKey)
                    }
                  />
                )}

                {!canModify && (
                  <BugTrackStatusBadges
                    qaStatus={displayQa}
                    devStatus={displayDev}
                    finalStatus={displayFinal}
                  />
                )}

                {bug.description?.trim() && !isBatch && (
                  <section>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Description</p>
                    <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/30 border border-border/40 p-3">
                      {bug.description.trim()}
                    </p>
                  </section>
                )}

                {isBatch && !activeIssue && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Issues</p>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {filteredIssues.length === issues.length
                          ? `${issues.length} total`
                          : `${filteredIssues.length} of ${issues.length}`}
                      </span>
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                        <Input
                          value={issueSearch}
                          onChange={(e) => setIssueSearch(e.target.value)}
                          placeholder="Search issues…"
                          className="h-7 pl-7 text-xs"
                        />
                      </div>
                      <Select value={issueTrack} onValueChange={setIssueTrack}>
                        <SelectTrigger className="h-7 text-xs w-[130px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                          <SelectItem value="open" className="text-xs">Open</SelectItem>
                          <SelectItem value="dev_fixed" className="text-xs">Dev fixed</SelectItem>
                          <SelectItem value="qa_verified" className="text-xs">QA verified</SelectItem>
                          <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      {(issueSearch || issueTrack !== "all") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => { setIssueSearch(""); setIssueTrack("all"); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {canAddBugIssues(userRole) && (
                      <div className="mb-3">
                        <BugAddIssuesForm
                          bugId={bug.id}
                          existingCount={issues.length}
                          onAdded={() => invalidate(bug.id)}
                        />
                      </div>
                    )}

                    {filteredIssues.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No issues match the current filters.
                      </p>
                    ) : (
                      <ul className="rounded-lg border border-border/60 divide-y divide-border/50">
                        {filteredIssues.map((issue: IssueView) => (
                          <li key={issue.issueKey ?? issue.title} className="flex items-center">
                            <button
                              type="button"
                              className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 min-w-0"
                              onClick={() => setActiveIssueKey(issue.issueKey ?? null)}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{issue.title}</p>
                                <BugTrackStatusBadges
                                  qaStatus={issue.qaStatus}
                                  devStatus={issue.devStatus}
                                  finalStatus={issue.finalStatus}
                                  className="mt-1"
                                />
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                            {canDelete && issue.issueKey && (
                              <button
                                type="button"
                                className="shrink-0 p-2 mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                aria-label="Delete issue"
                                onClick={() => setDeleteTarget(issue.issueKey!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {bug.description?.trim() && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                        {bug.description.trim()}
                      </p>
                    )}
                  </section>
                )}

                {!isBatch && canAddBugIssues(userRole) && !activeIssue && (
                  <section>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Multiple issues in one report
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Group related bugs under this report without creating a new one.
                    </p>
                    <BugAddIssuesForm
                      bugId={bug.id}
                      existingCount={0}
                      onAdded={() => invalidate(bug.id)}
                    />
                  </section>
                )}

                {(bug.attachments?.length ?? 0) > 0 && (
                  <section>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Attachments</p>
                    <BugAttachmentsGallery attachments={bug.attachments} />
                  </section>
                )}

                <BugCommentsSection bugId={bug.id} canComment={canComment} />
              </div>

              <div className="px-5 py-3 border-t border-border/60 text-[10px] text-muted-foreground shrink-0">
                Reported {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>

    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === "bug" ? "Delete bug?" : "Delete issue?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "bug" ? (
                <>
                  <span className="font-medium">{bug?.bugNumber} — {bug?.title}</span>
                  <br />
                  This will permanently delete the bug and all its comments. This cannot be undone.
                </>
              ) : (
                <>
                  This will permanently remove the issue from this batch report. This cannot be undone.
                </>
              )}
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
    </>
  );
}
