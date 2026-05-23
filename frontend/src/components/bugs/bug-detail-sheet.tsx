import React, { useState } from "react";
import {
  useGetBug,
  getGetBugQueryKey,
  useUpdateBug,
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import { AssigneeAvatars } from "./assignee-avatars";
import { BugAttachmentsGallery } from "./bug-attachments";
import { BugCommentsSection } from "./bug-comments";
import { BugTrackStatusRow, BugTrackStatusBadges } from "./bug-track-status";
import {
  PRIORITY_LABELS,
  formatUserRole,
  canUserModifyBug,
  type FinalStatus,
  type TrackStatus,
} from "@/lib/bug-workflow";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";

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

  const issues = bug?.children ?? bug?.issues ?? [];
  const isBatch = issues.length > 0;
  const activeIssue =
    activeIssueKey && isBatch
      ? issues.find((i) => i.issueKey === activeIssueKey)
      : null;

  const displayQa = activeIssue?.qaStatus ?? bug?.qaStatus;
  const displayDev = activeIssue?.devStatus ?? bug?.devStatus;
  const displayFinal = activeIssue?.finalStatus ?? bug?.finalStatus;
  const displayTitle = activeIssue?.title ?? bug?.title;

  return (
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
                  {canModify && !activeIssue && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onEdit(bug)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {canModify && !isBatch && (
                  <BugTrackStatusRow
                    qaStatus={displayQa}
                    devStatus={displayDev}
                    finalStatus={displayFinal}
                    userRole={userRole}
                    isAssignee={isAssignee}
                    disabled={updateMutation.isPending}
                    onQaChange={(v: TrackStatus) => void patchStatus({ qaStatus: v })}
                    onDevChange={(v: TrackStatus) => void patchStatus({ devStatus: v })}
                    onFinalChange={(v: FinalStatus) => void patchStatus({ finalStatus: v })}
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">Issues</p>
                    <ul className="rounded-lg border border-border/60 divide-y divide-border/50">
                      {issues.map((issue: IssueView) => (
                        <li key={issue.issueKey ?? issue.title}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40"
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
                        </li>
                      ))}
                    </ul>
                    {bug.description?.trim() && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                        {bug.description.trim()}
                      </p>
                    )}
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
  );
}
