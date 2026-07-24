import { useMemo, useState } from "react";
import { Share2, TrendingUp, TrendingDown, Loader2, Plus, Users, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MarketingEmptyState,
  PlatformIconBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { MarketingListPageSkeleton } from "@/components/loading";
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
  const { data, isLoading, isError } = useMarketingSocial(
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

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs={false} />
      ) : isError ? (
        <MarketingEmptyState icon={Share2} title="Could not load social metrics" description="Check your connection and try again." />
      ) : metrics.length === 0 ? (
        <MarketingEmptyState
          icon={Share2}
          title="No social metrics yet"
          description="Add platform metrics for a digital project to track performance."
          onAction={canUpsert ? openCreate : undefined}
          actionLabel="Add metrics"
        />
      ) : (
        <div className="grid gap-4">
          {metrics.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PlatformIconBadge platform={m.platform} />
                    <div>
                      {PLATFORM_LABELS[m.platform]}
                      {m.clientName ? (
                        <p className="text-[10px] font-normal text-muted-foreground">{m.clientName}</p>
                      ) : null}
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{m.engagementRate}% engagement rate</span>
                    {showActions && (
                      <MarketingRowActions
                        canEdit={canEdit && canFullyEditMarketingItem(user, m.createdBy)}
                        canDelete={canDelete && canDeleteMarketingItem(user, m.createdBy)}
                        onEdit={() => openEdit(m)}
                        onDelete={() => setDeleteTarget(m)}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PortalKpiGrid
                  columns={3}
                  count={3}
                  items={[
                    { title: "Followers", value: m.followers.toLocaleString("en-IN"), icon: Share2, accent: "blue", delay: 0 },
                    { title: "Reach", value: m.reach.toLocaleString("en-IN"), icon: TrendingUp, accent: "green", delay: 1 },
                    { title: "Engagement", value: m.engagement.toLocaleString("en-IN"), icon: TrendingDown, accent: "violet", delay: 2 },
                  ]}
                />
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <div className="rounded-lg border bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">Best post</p>
                    <p className="text-xs mt-1">{m.bestPostTitle}</p>
                  </div>
                  <div className="rounded-lg border bg-red-500/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-red-600 font-medium">Needs improvement</p>
                    <p className="text-xs mt-1">{m.worstPostTitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
