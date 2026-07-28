import { useMemo, useState } from "react";
import { Megaphone, Loader2, Plus, PauseCircle, FileEdit, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
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
  useMarketingCampaigns,
  useCreateMarketingCampaign,
  useUpdateMarketingCampaign,
  useDeleteMarketingCampaign,
  type MarketingMetaCampaignDto,
} from "@/api/marketing";
import { META_OBJECTIVE_LABELS, CAMPAIGN_STATUS_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingStatusBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingChipTabs,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useAuth } from "@/contexts/AuthContext";
import { canDeleteMarketingItem, canFullyEditMarketingItem } from "@/lib/cms-project-manage";
import type { CampaignStatus, MetaCampaignObjective } from "@/modules/marketing/types";
import { CmsDataTable, type CmsColumn } from "@/components/cms";

const emptyForm = {
  accountId: "",
  name: "",
  status: "draft" as CampaignStatus,
  budgetInr: "",
  objective: "awareness" as MetaCampaignObjective,
  audience: "",
  reach: "",
  impressions: "",
  ctr: "",
  cpc: "",
  cpm: "",
  leads: "",
  roas: "",
};

export default function MarketingMetaAds() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreate = can("marketing_ads", "create");
  const canEdit = can("marketing_ads", "edit");
  const canDelete = can("marketing_ads", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingMetaCampaignDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingMetaCampaignDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError, refetch } = useMarketingCampaigns(
    "meta",
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createCampaign = useCreateMarketingCampaign();
  const updateCampaign = useUpdateMarketingCampaign();
  const deleteCampaign = useDeleteMarketingCampaign();
  const campaigns = (data?.campaigns ?? []) as MarketingMetaCampaignDto[];
  const saving = createCampaign.isPending || updateCampaign.isPending;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return campaigns.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusTab]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: campaigns.length },
      ...(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((status) => ({
        value: status,
        label: CAMPAIGN_STATUS_LABELS[status],
        count: campaigns.filter((c) => c.status === status).length,
      })),
    ],
    [campaigns],
  );

  const kpis = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === "active").length,
      paused: campaigns.filter((c) => c.status === "paused").length,
      draft: campaigns.filter((c) => c.status === "draft").length,
    }),
    [campaigns],
  );

  const columns = useMemo<CmsColumn<MarketingMetaCampaignDto>[]>(
    () => {
      const cols: CmsColumn<MarketingMetaCampaignDto>[] = [
        { id: "campaign", header: "Campaign", cell: (c) => <span className="font-medium max-w-[140px] block truncate">{c.name}</span> },
        { id: "project", header: "Project", cell: (c) => c.clientName },
        { id: "objective", header: "Objective", cell: (c) => META_OBJECTIVE_LABELS[c.objective as MetaCampaignObjective] ?? c.objective },
        { id: "status", header: "Status", chip: true, cell: (c) => <MarketingStatusBadge variant="campaign" status={c.status as CampaignStatus} /> },
        { id: "budget", header: "Budget", align: "right", cell: (c) => formatCompactCurrency(c.budgetInr) },
        { id: "audience", header: "Audience", cell: (c) => <span className="max-w-[120px] block truncate">{c.audience}</span> },
        { id: "reach", header: "Reach", align: "right", cell: (c) => c.reach.toLocaleString("en-IN") },
        { id: "impressions", header: "Impr.", align: "right", cell: (c) => c.impressions.toLocaleString("en-IN") },
        { id: "ctr", header: "CTR", align: "right", cell: (c) => `${c.ctr.toFixed(2)}%` },
        { id: "cpc", header: "CPC", align: "right", cell: (c) => `₹${c.cpc}` },
        { id: "cpm", header: "CPM", align: "right", cell: (c) => `₹${c.cpm}` },
        { id: "leads", header: "Leads", align: "right", cell: (c) => c.leads },
        { id: "roas", header: "ROAS", align: "right", cell: (c) => `${c.roas.toFixed(1)}x` },
      ];
      if (showActions) cols.push({ id: "actions", header: "Actions", align: "right", className: "w-[80px]", cell: (c) => <MarketingRowActions canEdit={canEdit && canFullyEditMarketingItem(user, c.createdBy)} canDelete={canDelete && canDeleteMarketingItem(user, c.createdBy)} onEdit={() => openEdit(c)} onDelete={() => setDeleteTarget(c)} /> });
      return cols;
    },
    [showActions, canEdit, canDelete, user],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, accountId: projectFilter || "" });
    setDialogOpen(true);
  };

  const openEdit = (c: MarketingMetaCampaignDto) => {
    setEditing(c);
    setForm({
      accountId: String(c.accountId),
      name: c.name,
      status: c.status as CampaignStatus,
      budgetInr: String(c.budgetInr),
      objective: c.objective as MetaCampaignObjective,
      audience: c.audience,
      reach: String(c.reach),
      impressions: String(c.impressions),
      ctr: String(c.ctr),
      cpc: String(c.cpc),
      cpm: String(c.cpm),
      leads: String(c.leads),
      roas: String(c.roas),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editing) {
        await updateCampaign.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: {
            name: form.name.trim(),
            status: form.status,
            budgetInr: Number(form.budgetInr),
            objective: form.objective,
            audience: form.audience,
            reach: Number(form.reach),
            impressions: Number(form.impressions),
            ctr: Number(form.ctr),
            cpc: Number(form.cpc),
            cpm: Number(form.cpm),
            leads: Number(form.leads),
            roas: Number(form.roas),
          },
        });
        toast.success("Campaign updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createCampaign.mutateAsync({
          accountId: Number(form.accountId),
          network: "meta",
          name: form.name.trim(),
          budgetInr: Number(form.budgetInr) || 0,
          objective: form.objective,
          status: form.status,
          audience: form.audience,
          reach: Number(form.reach) || 0,
          impressions: Number(form.impressions) || 0,
          ctr: Number(form.ctr) || 0,
          cpc: Number(form.cpc) || 0,
          cpm: Number(form.cpm) || 0,
          leads: Number(form.leads) || 0,
          roas: Number(form.roas) || 0,
        });
        toast.success("Campaign created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update campaign" : "Failed to create campaign");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Campaign deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete campaign");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Meta Ads"
        description="Facebook & Instagram campaigns — objectives, budgets, audiences, and performance"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Meta Ads" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New campaign
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total campaigns", value: kpis.total, icon: Megaphone, accent: "blue", delay: 0 },
          { title: "Active", value: kpis.active, icon: PlayCircle, accent: "green", delay: 1 },
          { title: "Paused", value: kpis.paused, icon: PauseCircle, accent: "amber", delay: 2 },
          { title: "Draft", value: kpis.draft, icon: FileEdit, accent: "violet", delay: 3 },
        ]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns, projects…"
      >
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      <CmsDataTable columns={columns} rows={filtered} rowKey={(c) => c.id} isLoading={isLoading} error={isError} onRetry={() => refetch()} empty={{ icon: Megaphone, title: "No campaigns found", description: "Adjust your search filters.", actionLabel: canCreate ? "New campaign" : undefined, onAction: canCreate ? openCreate : undefined }} errorMessage="Check your connection and try again." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Meta campaign" : "New Meta campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">Digital project</Label>
                <DigitalProjectSelect
                  value={form.accountId}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                  className="h-8 w-full text-xs"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CampaignStatus }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Objective</Label>
                <Select value={form.objective} onValueChange={(v) => setForm((f) => ({ ...f, objective: v as MetaCampaignObjective }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(META_OBJECTIVE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Budget (INR)</Label>
                <Input type="number" min={0} value={form.budgetInr} onChange={(e) => setForm((f) => ({ ...f, budgetInr: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <Input value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Reach</Label>
                <Input type="number" min={0} value={form.reach} onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Impressions</Label>
                <Input type="number" min={0} value={form.impressions} onChange={(e) => setForm((f) => ({ ...f, impressions: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CTR (%)</Label>
                <Input type="number" min={0} step="0.01" value={form.ctr} onChange={(e) => setForm((f) => ({ ...f, ctr: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPC (₹)</Label>
                <Input type="number" min={0} value={form.cpc} onChange={(e) => setForm((f) => ({ ...f, cpc: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPM (₹)</Label>
                <Input type="number" min={0} value={form.cpm} onChange={(e) => setForm((f) => ({ ...f, cpm: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Leads</Label>
                <Input type="number" min={0} value={form.leads} onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ROAS</Label>
                <Input type="number" min={0} step="0.1" value={form.roas} onChange={(e) => setForm((f) => ({ ...f, roas: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete campaign?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed.` : undefined}
        loading={deleteCampaign.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
