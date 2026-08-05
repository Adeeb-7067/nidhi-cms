import { useMemo, useState } from "react";
import { Search, Loader2, Plus, PauseCircle, FileEdit, PlayCircle, IndianRupee, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Badge } from "@/components/ui/badge";
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
  type MarketingGoogleCampaignDto,
} from "@/api/marketing";
import { GOOGLE_CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingStatusBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingChipTabs,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useAuth } from "@/contexts/AuthContext";
import {
  canDeleteMarketingItem,
  canEditMarketingAdsItem,
  isDigitalAdminView,
} from "@/lib/cms-project-manage";
import type { CampaignStatus, GoogleCampaignType } from "@/modules/marketing/types";
import { CmsDataTable, type CmsColumn } from "@/components/cms";

const CREATE_GOOGLE_TYPES: GoogleCampaignType[] = ["search", "display", "shopping", "performance_max", "youtube"];

const emptyForm = {
  accountId: "",
  name: "",
  status: "draft" as CampaignStatus,
  budgetInr: "",
  type: "search" as GoogleCampaignType,
  keywords: "",
  qualityScore: "",
  cpa: "",
  conversions: "",
  roas: "",
};

export default function MarketingGoogleAds() {
  const { user } = useAuth();
  const { can } = usePermissions();
  // Org admin / Account Manager / Digital Specialist → full portfolio.
  // Craft employees (Ads Manager, roster AM without AM specialty) → own campaigns only.
  const isAdminView = isDigitalAdminView(user);
  const canCreate = can("marketing_ads", "create");
  const canEdit = can("marketing_ads", "edit");
  const canDeleteModule = can("marketing_ads", "delete");
  /** Own campaigns: create/edit is enough (craft roles often lack module delete). */
  const canDeleteOwn = canDeleteModule || canCreate || canEdit;
  const showActions = canEdit || canDeleteOwn;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingGoogleCampaignDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingGoogleCampaignDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError, refetch } = useMarketingCampaigns(
    "google",
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createCampaign = useCreateMarketingCampaign();
  const updateCampaign = useUpdateMarketingCampaign();
  const deleteCampaign = useDeleteMarketingCampaign();
  const campaigns = (data?.campaigns ?? []) as MarketingGoogleCampaignDto[];
  const saving = createCampaign.isPending || updateCampaign.isPending;

  // Backend already scopes employees to createdBy=self; keep a client filter as defense-in-depth.
  const visibleCampaigns = useMemo(() => {
    if (isAdminView) return campaigns;
    return campaigns.filter(
      (c) => user?.id != null && c.createdBy != null && Number(c.createdBy) === Number(user.id),
    );
  }, [campaigns, isAdminView, user?.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visibleCampaigns.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q));
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [visibleCampaigns, search, statusTab]);

  const statusChipItems = useMemo(
    () => [
      {
        value: "all",
        label: isAdminView ? "All campaigns" : "All my campaigns",
        count: visibleCampaigns.length,
      },
      ...(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((status) => ({
        value: status,
        label: CAMPAIGN_STATUS_LABELS[status],
        count: visibleCampaigns.filter((c) => c.status === status).length,
      })),
    ],
    [visibleCampaigns, isAdminView],
  );

  const kpis = useMemo(() => {
    const pool = visibleCampaigns;
    return {
      total: pool.length,
      active: pool.filter((c) => c.status === "active").length,
      paused: pool.filter((c) => c.status === "paused").length,
      draft: pool.filter((c) => c.status === "draft").length,
      budget: pool.reduce((sum, c) => sum + (c.budgetInr || 0), 0),
      conversions: pool.reduce((sum, c) => sum + (c.conversions || 0), 0),
    };
  }, [visibleCampaigns]);

  const columns = useMemo<CmsColumn<MarketingGoogleCampaignDto>[]>(
    () => {
      const cols: CmsColumn<MarketingGoogleCampaignDto>[] = [
        { id: "campaign", header: "Campaign", cell: (c) => <span className="font-medium max-w-[140px] block truncate">{c.name}</span> },
        { id: "project", header: "Project", cell: (c) => c.clientName },
        { id: "type", header: "Type", cell: (c) => GOOGLE_CAMPAIGN_TYPE_LABELS[c.type as GoogleCampaignType] ?? c.type },
        { id: "status", header: "Status", chip: true, cell: (c) => <MarketingStatusBadge variant="campaign" status={c.status as CampaignStatus} /> },
        { id: "budget", header: "Budget", align: "right", cell: (c) => formatCompactCurrency(c.budgetInr) },
      ];

      if (isAdminView) {
        cols.push(
          {
            id: "keywords",
            header: "Keywords",
            chip: true,
            cell: (c) => (
              <div className="flex flex-wrap gap-1 max-w-[160px]">
                {c.keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="text-[9px] px-1 py-0 truncate max-w-[80px]">
                    {k}
                  </Badge>
                ))}
              </div>
            ),
          },
          { id: "qualityScore", header: "QS", align: "center", cell: (c) => `${c.qualityScore}/10` },
          { id: "cpa", header: "CPA", align: "right", cell: (c) => `₹${c.cpa}` },
          { id: "roas", header: "ROAS", align: "right", cell: (c) => `${c.roas.toFixed(1)}x` },
          { id: "conversions", header: "Conv.", align: "right", cell: (c) => c.conversions },
        );
      } else {
        cols.push(
          { id: "qualityScore", header: "QS", align: "center", cell: (c) => `${c.qualityScore}/10` },
          { id: "conversions", header: "Conv.", align: "right", cell: (c) => c.conversions },
          { id: "roas", header: "ROAS", align: "right", cell: (c) => `${c.roas.toFixed(1)}x` },
        );
      }

      if (showActions) {
        cols.push({
          id: "actions",
          header: "Actions",
          align: "right",
          className: "w-[80px]",
          cell: (c) => (
            <MarketingRowActions
              canEdit={canEdit && canEditMarketingAdsItem(user, c.createdBy)}
              canDelete={canDeleteOwn && canDeleteMarketingItem(user, c.createdBy)}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ),
        });
      }
      return cols;
    },
    [showActions, canEdit, canDeleteOwn, user, isAdminView],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, accountId: projectFilter || "" });
    setDialogOpen(true);
  };

  const openEdit = (c: MarketingGoogleCampaignDto) => {
    setEditing(c);
    setForm({
      accountId: String(c.accountId),
      name: c.name,
      status: c.status as CampaignStatus,
      budgetInr: String(c.budgetInr),
      type: c.type as GoogleCampaignType,
      keywords: c.keywords.join(", "),
      qualityScore: String(c.qualityScore),
      cpa: String(c.cpa),
      conversions: String(c.conversions),
      roas: String(c.roas),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editing && !canEditMarketingAdsItem(user, editing.createdBy)) {
      toast.error("You can only edit campaigns you created");
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
            type: form.type,
            keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
            qualityScore: Number(form.qualityScore),
            cpa: Number(form.cpa),
            conversions: Number(form.conversions),
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
          network: "google",
          name: form.name.trim(),
          budgetInr: Number(form.budgetInr) || 0,
          type: form.type,
          status: form.status,
          keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          qualityScore: Number(form.qualityScore) || 0,
          cpa: Number(form.cpa) || 0,
          conversions: Number(form.conversions) || 0,
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

  const adminKpiItems = [
    { title: "Total campaigns", value: kpis.total, icon: Search, accent: "blue" as const, delay: 0 },
    { title: "Active", value: kpis.active, icon: PlayCircle, accent: "green" as const, delay: 1 },
    { title: "Paused", value: kpis.paused, icon: PauseCircle, accent: "amber" as const, delay: 2 },
    { title: "Draft", value: kpis.draft, icon: FileEdit, accent: "violet" as const, delay: 3 },
    { title: "Total budget", value: formatCompactCurrency(kpis.budget), icon: IndianRupee, accent: "green" as const, delay: 4 },
    { title: "Conversions", value: kpis.conversions.toLocaleString("en-IN"), icon: Target, accent: "sky" as const, delay: 5 },
  ];

  const employeeKpiItems = [
    { title: "My campaigns", value: kpis.total, icon: Search, accent: "blue" as const, delay: 0 },
    { title: "Active", value: kpis.active, icon: PlayCircle, accent: "green" as const, delay: 1 },
    { title: "Paused", value: kpis.paused, icon: PauseCircle, accent: "amber" as const, delay: 2 },
    { title: "Draft", value: kpis.draft, icon: FileEdit, accent: "violet" as const, delay: 3 },
  ];

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title={isAdminView ? "Google Ads" : "My Google Ads"}
        description={
          isAdminView
            ? "Account Manager portfolio — Search, Display, Shopping, PMax, and YouTube across digital projects"
            : "Your Google Ads workspace — create and manage campaigns you own"
        }
        breadcrumbs={[
          { label: "Digital", href: "/marketing" },
          { label: isAdminView ? "Google Ads" : "My Ads" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New campaign
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isAdminView ? "Portfolio overview" : "My work overview"}
        </p>
        <PortalKpiGrid
          loading={isLoading}
          columns={isAdminView ? 3 : 4}
          count={isAdminView ? adminKpiItems.length : employeeKpiItems.length}
          items={isAdminView ? adminKpiItems : employeeKpiItems}
        />
      </div>

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          isAdminView ? "Search campaigns, keywords, projects…" : "Search your campaigns…"
        }
      >
        <DigitalProjectSelect
          allowAll
          allLabel={isAdminView ? "All digital projects" : "All my projects"}
          value={projectFilter}
          onValueChange={setProjectFilter}
          className="h-8 w-[220px] text-xs"
        />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: Search,
          title: isAdminView ? "No campaigns found" : "No campaigns yet",
          description: isAdminView
            ? "Adjust your search filters or create a new Google campaign."
            : "Create a Google campaign to start tracking performance for your projects.",
          actionLabel: canCreate ? "New campaign" : undefined,
          onAction: canCreate ? openCreate : undefined,
        }}
        errorMessage="Check your connection and try again."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Google campaign" : "New Google campaign"}</DialogTitle>
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
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as GoogleCampaignType }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(editing ? Object.entries(GOOGLE_CAMPAIGN_TYPE_LABELS) : CREATE_GOOGLE_TYPES.map((k) => [k, GOOGLE_CAMPAIGN_TYPE_LABELS[k]])).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget (INR)</Label>
              <Input type="number" min={0} value={form.budgetInr} onChange={(e) => setForm((f) => ({ ...f, budgetInr: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords (comma-separated)</Label>
              <Input value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Quality score</Label>
                <Input type="number" min={0} max={10} value={form.qualityScore} onChange={(e) => setForm((f) => ({ ...f, qualityScore: e.target.value }))} className="h-8 text-xs" />
              </div>
              {(isAdminView || editing) && (
                <div className="space-y-1.5">
                  <Label className="text-xs">CPA (₹)</Label>
                  <Input type="number" min={0} value={form.cpa} onChange={(e) => setForm((f) => ({ ...f, cpa: e.target.value }))} className="h-8 text-xs" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Conversions</Label>
                <Input type="number" min={0} value={form.conversions} onChange={(e) => setForm((f) => ({ ...f, conversions: e.target.value }))} className="h-8 text-xs" />
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
