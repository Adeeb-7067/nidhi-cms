import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { CheckCircle, Clock, Eye, RotateCcw, Trash2 } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { MarketingKanbanSkeleton } from "@/components/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useMarketingApprovals,
  useUpdateMarketingApprovalStage,
  useUpdateMarketingApproval,
  useDeleteMarketingApproval,
} from "@/api/marketing";
import { APPROVAL_STAGE_LABELS, APPROVAL_STAGE_ORDER } from "@/modules/marketing/constants";
import type { ApprovalStage } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  ApprovalStatusBadge,
  MarketingEmptyState,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingAssigneeSelect,
  parseAssigneeId,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";

const NEXT_STAGE: Partial<Record<ApprovalStage, ApprovalStage>> = {
  internal_review: "client_review",
  client_review: "approved",
  revision: "internal_review",
  approved: "scheduled",
  scheduled: "published",
};

const REVISION_FROM: ApprovalStage[] = ["internal_review", "client_review", "approved"];

export default function MarketingApprovals() {
  const [, navigate] = useLocation();
  const { can } = usePermissions();
  const canEdit = can("marketing_approvals", "edit");
  const canDelete = can("marketing_approvals", "delete");

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string; accountId: number } | null>(null);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError } = useMarketingApprovals(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const updateStage = useUpdateMarketingApprovalStage();
  const updateApproval = useUpdateMarketingApproval();
  const deleteApproval = useDeleteMarketingApproval();
  const approvals = data?.approvals ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return approvals.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        (a.clientName ?? "").toLowerCase().includes(q),
    );
  }, [approvals, search]);

  const byStage = useMemo(() => {
    const map: Record<ApprovalStage, typeof filtered> = {
      internal_review: [],
      client_review: [],
      revision: [],
      approved: [],
      scheduled: [],
      published: [],
    };
    for (const item of filtered) {
      if (map[item.stage]) map[item.stage].push(item);
    }
    return map;
  }, [filtered]);

  const kpis = useMemo(
    () => ({
      total: approvals.length,
      inReview:
        approvals.filter((a) => a.stage === "internal_review" || a.stage === "client_review").length,
      revision: approvals.filter((a) => a.stage === "revision").length,
      approvedPlus: approvals.filter((a) =>
        a.stage === "approved" || a.stage === "scheduled" || a.stage === "published",
      ).length,
    }),
    [approvals],
  );

  const setStage = async (id: number, stage: ApprovalStage, accountId: number) => {
    try {
      await updateStage.mutateAsync({ id, stage, accountId });
      toast.success(`Moved to ${APPROVAL_STAGE_LABELS[stage]}`);
    } catch (err) {
      toastApiError(err, "Failed to update stage");
    }
  };

  const advance = async (id: number, stage: ApprovalStage, accountId: number) => {
    const next = NEXT_STAGE[stage];
    if (!next) return;
    await setStage(id, next, accountId);
  };

  const handleAssigneeChange = async (
    id: number,
    accountId: number,
    assigneeId: string,
  ) => {
    try {
      await updateApproval.mutateAsync({
        id,
        accountId,
        data: { assigneeId: parseAssigneeId(assigneeId) },
      });
      toast.success("Assignee updated");
    } catch (err) {
      toastApiError(err, "Failed to update assignee");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApproval.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Approval deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete approval");
    }
  };

  if (isLoading) {
    return <MarketingKanbanSkeleton />;
  }

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Approval workflow"
        description="Pipeline: Internal Review → Client Review → Revision → Approved → Scheduled → Published"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Approvals" }]}
      />

      <PortalKpiGrid
        loading={false}
        columns={4}
        count={4}
        items={[
          { title: "Total", value: kpis.total, icon: CheckCircle, accent: "blue", delay: 0 },
          { title: "In review", value: kpis.inReview, icon: Eye, accent: "amber", delay: 1 },
          { title: "Revision", value: kpis.revision, icon: RotateCcw, accent: "violet", delay: 2 },
          { title: "Approved+", value: kpis.approvedPlus, icon: Clock, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search approvals, projects…">
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      {isError ? (
        <MarketingEmptyState title="Couldn't load approvals" description="Check API permissions and try again." />
      ) : approvals.length === 0 ? (
        <MarketingEmptyState
          icon={CheckCircle}
          title="No approvals yet"
          description="Create content, posts, or graphics — items enter this pipeline when they need review."
          actionLabel="Open content"
          onAction={() => navigate("/marketing/content")}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {APPROVAL_STAGE_ORDER.map((stage) => (
            <div
              key={stage}
              className="min-w-[220px] flex-1 rounded-xl border bg-muted/20 p-2"
            >
              <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-md bg-muted/20 px-1 py-1">
                <ApprovalStatusBadge stage={stage} />
                <span className="text-[10px] text-muted-foreground">{byStage[stage].length}</span>
              </div>
              <div className="min-h-[120px] space-y-2">
                {byStage[stage].map((item) => (
                  <Card key={item.id} className={cn("shadow-sm")}>
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex items-start justify-between gap-1">
                        <p className="flex-1 text-xs font-medium leading-snug">{item.title}</p>
                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 shrink-0 p-0 text-destructive"
                            title="Delete"
                            onClick={() => setDeleteTarget({ id: item.id, title: item.title, accountId: item.accountId })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{item.clientName}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                        <span>{item.type}</span>
                        <span>{item.updatedAt ? format(new Date(item.updatedAt), "MMM d") : "—"}</span>
                      </div>
                      {canEdit ? (
                        <MarketingAssigneeSelect
                          value={item.assigneeId != null ? String(item.assigneeId) : ""}
                          onValueChange={(v) => void handleAssigneeChange(item.id, item.accountId, v)}
                          className="h-7 w-full text-[10px]"
                        />
                      ) : (
                        <p className="text-[10px] text-muted-foreground">{item.assignee || "Unassigned"}</p>
                      )}
                      {canEdit && (
                        <div className="flex flex-col gap-1">
                          {NEXT_STAGE[item.stage] && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-full text-[10px]"
                              disabled={updateStage.isPending}
                              onClick={() => void advance(item.id, item.stage, item.accountId)}
                            >
                              Advance → {APPROVAL_STAGE_LABELS[NEXT_STAGE[item.stage]!]}
                            </Button>
                          )}
                          {REVISION_FROM.includes(item.stage) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-full text-[10px] text-amber-700"
                              disabled={updateStage.isPending}
                              onClick={() => void setStage(item.id, "revision", item.accountId)}
                            >
                              Request revision
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {byStage[stage].length === 0 && (
                  <div className="rounded-lg border border-dashed px-3 py-6 text-center text-[10px] text-muted-foreground">
                    <CheckCircle className="mx-auto mb-1 h-4 w-4 opacity-40" />
                    No items in {APPROVAL_STAGE_LABELS[stage]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Stages: {APPROVAL_STAGE_ORDER.map((s) => APPROVAL_STAGE_LABELS[s]).join(" → ")}
      </p>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete approval?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed from the pipeline.` : undefined}
        loading={deleteApproval.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
