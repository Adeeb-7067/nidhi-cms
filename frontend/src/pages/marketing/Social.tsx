import { useMemo, useState } from "react";
import { Share2, TrendingUp, Loader2, Plus, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarketingSocial,
  useUpsertMarketingSocial,
  useDeleteMarketingSocial,
  type MarketingSocialMetricDto,
} from "@/api/marketing";
import { PLATFORM_LABELS } from "@/modules/marketing/constants";
import type { MarketingPlatform } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  PlatformIconBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useAuth } from "@/contexts/AuthContext";
import { canDeleteMarketingItem, canFullyEditMarketingItem } from "@/lib/cms-project-manage";

const SOCIAL_PLATFORMS: MarketingPlatform[] = [
  "instagram",
  "facebook",
  "linkedin",
  "twitter",
  "youtube",
  "google_my_business",
];

const emptyForm = {
  accountId: "",
  platform: "instagram" as MarketingPlatform,
  followers: "",
  reach: "",
  engagement: "",
  engagementRate: "",
  bestPostTitle: "",
  worstPostTitle: "",
};

export default function MarketingSocial() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreate = can("marketing_analytics", "create");
  const canEdit = can("marketing_analytics", "edit");
  const canDelete = can("marketing_analytics", "delete");
  const canUpsert = canCreate || canEdit;
  const showActions = canEdit || canDelete;

  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingSocialMetricDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingSocialMetricDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError, refetch } = useMarketingSocial(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const upsertSocial = useUpsertMarketingSocial();
  const deleteSocial = useDeleteMarketingSocial();
  const metrics = data?.metrics ?? [];
  const saving = upsertSocial.isPending;

  const kpis = useMemo(() => {
    const platforms = new Set(metrics.map((m) => m.platform)).size;
    const followers = metrics.reduce((sum, m) => sum + (m.followers ?? 0), 0);
    const reach = metrics.reduce((sum, m) => sum + (m.reach ?? 0), 0);
    const avgEngagement =
      metrics.length === 0
        ? 0
        : Math.round(
            (metrics.reduce((sum, m) => sum + (m.engagementRate ?? 0), 0) / metrics.length) * 10,
          ) / 10;
    return { platforms, followers, reach, avgEngagement };
  }, [metrics]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, accountId: projectFilter || "" });
    setDialogOpen(true);
  };

  const openEdit = (m: MarketingSocialMetricDto) => {
    setEditing(m);
    setForm({
      accountId: String(m.accountId),
      platform: m.platform,
      followers: String(m.followers),
      reach: String(m.reach),
      engagement: String(m.engagement),
      engagementRate: String(m.engagementRate),
      bestPostTitle: m.bestPostTitle,
      worstPostTitle: m.worstPostTitle,
    });
    setDialogOpen(true);
  };

  const columns = useMemo<CmsColumn<MarketingSocialMetricDto>[]>(
    () => [
      {
        id: "platform",
        header: "Platform",
        cell: (m) => (
          <div className="flex items-center gap-2">
            <PlatformIconBadge platform={m.platform} />
            <span className="font-medium">{PLATFORM_LABELS[m.platform]}</span>
          </div>
        ),
      },
      {
        id: "client",
        header: "Project",
        className: "max-w-[160px] truncate",
        cell: (m) => m.clientName ?? "—",
      },
      {
        id: "followers",
        header: "Followers",
        align: "right",
        cell: (m) => <span className="tabular-nums">{m.followers.toLocaleString("en-IN")}</span>,
      },
      {
        id: "reach",
        header: "Reach",
        align: "right",
        cell: (m) => <span className="tabular-nums">{m.reach.toLocaleString("en-IN")}</span>,
      },
      {
        id: "engagement",
        header: "Engagement",
        align: "right",
        cell: (m) => <span className="tabular-nums">{m.engagement.toLocaleString("en-IN")}</span>,
      },
      {
        id: "rate",
        header: "Eng. rate",
        align: "right",
        chip: true,
        cell: (m) => <span className="font-medium tabular-nums">{m.engagementRate}%</span>,
      },
      {
        id: "best",
        header: "Best post",
        className: "max-w-[180px] truncate",
        hideInGrid: true,
        cell: (m) => <span className="text-emerald-700 dark:text-emerald-400">{m.bestPostTitle}</span>,
      },
      {
        id: "worst",
        header: "Needs work",
        className: "max-w-[180px] truncate",
        hideInGrid: true,
        cell: (m) => <span className="text-red-600 dark:text-red-400">{m.worstPostTitle}</span>,
      },
      ...(showActions
        ? [
            {
              id: "actions",
              header: "Actions",
              align: "right" as const,
              hideable: false,
              cell: (m: MarketingSocialMetricDto) => (
                <MarketingRowActions
                  canEdit={canEdit && canFullyEditMarketingItem(user, m.createdBy)}
                  canDelete={canDelete && canDeleteMarketingItem(user, m.createdBy)}
                  onEdit={() => openEdit(m)}
                  onDelete={() => setDeleteTarget(m)}
                />
              ),
            },
          ]
        : []),
    ],
    [showActions, canEdit, canDelete, user],
  );

  const handleSave = async () => {
    const accountId = editing ? editing.accountId : Number(form.accountId);
    if (!Number.isFinite(accountId)) {
      toast.error("Digital project is required");
      return;
    }
    try {
      await upsertSocial.mutateAsync({
        accountId,
        platform: editing ? editing.platform : form.platform,
        followers: Number(form.followers),
        reach: Number(form.reach),
        engagement: Number(form.engagement),
        engagementRate: Number(form.engagementRate),
        bestPostTitle: form.bestPostTitle.trim(),
        worstPostTitle: form.worstPostTitle.trim(),
      });
      toast.success(editing ? "Social metrics updated" : "Social metrics added");
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update metrics" : "Failed to add metrics");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSocial.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Social metrics deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete metrics");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Social analytics"
        description="Per-platform followers, reach, engagement, and top/bottom posts"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Social" }]}
        actions={
          canUpsert ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add metrics
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Platforms tracked", value: kpis.platforms, icon: Share2, accent: "blue", delay: 0 },
          { title: "Total followers", value: kpis.followers.toLocaleString("en-IN"), icon: Users, accent: "violet", delay: 1 },
          { title: "Total reach", value: kpis.reach.toLocaleString("en-IN"), icon: Radio, accent: "amber", delay: 2 },
          { title: "Avg engagement rate", value: `${kpis.avgEngagement}%`, icon: TrendingUp, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar>
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <CmsDataTable
        columns={columns}
        rows={metrics}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        viewStorageKey="marketing-social"
        empty={{
          icon: Share2,
          title: "No social metrics yet",
          description: "Add platform metrics for a digital project to track performance.",
          actionLabel: canUpsert ? "Add metrics" : undefined,
          onAction: canUpsert ? openCreate : undefined,
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${PLATFORM_LABELS[editing.platform]} metrics`
                : "Add social metrics"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Digital project</Label>
                  <DigitalProjectSelect
                    value={form.accountId}
                    onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                    className="h-8 w-full text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Platform</Label>
                  <Select
                    value={form.platform}
                    onValueChange={(v) => setForm((f) => ({ ...f, platform: v as MarketingPlatform }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Followers</Label>
                <Input type="number" min={0} value={form.followers} onChange={(e) => setForm((f) => ({ ...f, followers: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reach</Label>
                <Input type="number" min={0} value={form.reach} onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Engagement</Label>
                <Input type="number" min={0} value={form.engagement} onChange={(e) => setForm((f) => ({ ...f, engagement: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Engagement rate %</Label>
                <Input type="number" min={0} step={0.1} value={form.engagementRate} onChange={(e) => setForm((f) => ({ ...f, engagementRate: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Best post</Label>
              <Input value={form.bestPostTitle} onChange={(e) => setForm((f) => ({ ...f, bestPostTitle: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Needs improvement</Label>
              <Input value={form.worstPostTitle} onChange={(e) => setForm((f) => ({ ...f, worstPostTitle: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={saving || (!editing && !canUpsert) || (!!editing && !canEdit)}
              onClick={() => void handleSave()}
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete social metrics?"
        description={deleteTarget ? `${PLATFORM_LABELS[deleteTarget.platform]} metrics will be removed.` : undefined}
        loading={deleteSocial.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
