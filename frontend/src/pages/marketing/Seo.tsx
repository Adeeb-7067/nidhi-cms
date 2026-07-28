import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, BookOpen, Gauge, Loader2, Plus, Hash, ClipboardList, Target } from "lucide-react";
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
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  useMarketingSeo,
  useCreateMarketingSeoKeyword,
  useUpdateMarketingSeoKeyword,
  useDeleteMarketingSeoKeyword,
} from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingDualLineChart,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { useAuth } from "@/contexts/AuthContext";
import { canDeleteMarketingItem, canFullyEditMarketingItem } from "@/lib/cms-project-manage";
import { CmsDataTable, type CmsColumn } from "@/components/cms";

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

type SeoKeywordRow = {
  id: string;
  keyword: string;
  clientName: string;
  accountId: number;
  createdBy?: number | null;
  currentRank: number;
  previousRank: number;
  trend: "up" | "down" | "stable";
  searchVolume: number;
  url: string;
};

const emptyForm = {
  accountId: "",
  keyword: "",
  currentRank: "",
  previousRank: "",
  trend: "stable" as "up" | "down" | "stable",
  searchVolume: "",
  url: "",
};

export default function MarketingSeo() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreate = can("marketing_seo", "create");
  const canEdit = can("marketing_seo", "edit");
  const canDelete = can("marketing_seo", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeoKeywordRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeoKeywordRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError, refetch } = useMarketingSeo(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createKeyword = useCreateMarketingSeoKeyword();
  const updateKeyword = useUpdateMarketingSeoKeyword();
  const deleteKeyword = useDeleteMarketingSeoKeyword();
  const saving = createKeyword.isPending || updateKeyword.isPending;

  const keywords = data?.keywords ?? [];
  const audits = data?.audits ?? [];
  const backlinks = data?.backlinksSummary ?? {
    total: 0,
    newThisMonth: 0,
    lost: 0,
    domainAuthority: 0,
  };
  const rankingTrend = data?.monthlyRankingTrend ?? [];
  const coreWebVitals = data?.coreWebVitals ?? [];
  const derivedMetricsNote = data?.derivedMetricsNote;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return keywords.filter(
      (k) =>
        !q ||
        k.keyword.toLowerCase().includes(q) ||
        k.clientName.toLowerCase().includes(q),
    );
  }, [keywords, search]);

  const kpis = useMemo(() => {
    const avgPosition =
      keywords.length === 0
        ? 0
        : Math.round(
            (keywords.reduce((sum, k) => sum + (k.currentRank ?? 0), 0) / keywords.length) * 10,
          ) / 10;
    return {
      keywordCount: keywords.length,
      avgPosition,
      topTen: keywords.filter((k) => k.currentRank > 0 && k.currentRank <= 10).length,
      auditCount: audits.length,
    };
  }, [keywords, audits]);

  const auditColumns = useMemo<CmsColumn<(typeof audits)[number]>[]>(
    () => [
      { id: "project", header: "Project", cell: (a) => a.clientName },
      { id: "score", header: "Score", align: "center", cell: (a) => `${a.score}/100` },
      { id: "issues", header: "Issues", align: "center", cell: (a) => a.issues },
      { id: "lastAudit", header: "Last audit", cell: (a) => a.lastAuditDate ? new Date(a.lastAuditDate).toLocaleDateString("en-IN") : "—" },
    ],
    [],
  );
  const keywordColumns = useMemo<CmsColumn<SeoKeywordRow>[]>(
    () => {
      const cols: CmsColumn<SeoKeywordRow>[] = [
        { id: "keyword", header: "Keyword", cell: (k) => <span className="font-medium">{k.keyword}</span> },
        { id: "project", header: "Project", cell: (k) => k.clientName },
        { id: "rank", header: "Rank", align: "center", cell: (k) => <span className="font-semibold">#{k.currentRank}</span> },
        { id: "trend", header: "Trend", align: "center", chip: true, cell: (k) => <div className="inline-flex items-center gap-1"><TrendIcon trend={k.trend} /><span className="text-[10px] text-muted-foreground">{k.previousRank !== k.currentRank ? `was #${k.previousRank}` : "—"}</span></div> },
        { id: "volume", header: "Volume", align: "right", cell: (k) => k.searchVolume.toLocaleString("en-IN") },
        { id: "url", header: "URL", cell: (k) => <span className="text-primary truncate max-w-[140px] block">{k.url}</span> },
      ];
      if (showActions) cols.push({ id: "actions", header: "Actions", align: "right", className: "w-[80px]", cell: (k) => <MarketingRowActions canEdit={canEdit && canFullyEditMarketingItem(user, k.createdBy)} canDelete={canDelete && canDeleteMarketingItem(user, k.createdBy)} onEdit={() => openEdit(k)} onDelete={() => setDeleteTarget(k)} /> });
      return cols;
    },
    [showActions, canEdit, canDelete, user],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, accountId: projectFilter || "" });
    setDialogOpen(true);
  };

  const openEdit = (k: SeoKeywordRow) => {
    setEditing(k);
    setForm({
      accountId: String(k.accountId),
      keyword: k.keyword,
      currentRank: String(k.currentRank),
      previousRank: String(k.previousRank),
      trend: k.trend,
      searchVolume: String(k.searchVolume),
      url: k.url,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.keyword.trim()) {
      toast.error("Keyword is required");
      return;
    }
    try {
      if (editing) {
        await updateKeyword.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: {
            keyword: form.keyword.trim(),
            currentRank: Number(form.currentRank),
            previousRank: Number(form.previousRank),
            trend: form.trend,
            searchVolume: Number(form.searchVolume),
            url: form.url.trim(),
          },
        });
        toast.success("Keyword updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        const rank = Number(form.currentRank);
        if (!Number.isFinite(rank) || rank < 1) {
          toast.error("Enter a valid current rank");
          return;
        }
        await createKeyword.mutateAsync({
          accountId: Number(form.accountId),
          keyword: form.keyword.trim(),
          currentRank: rank,
          previousRank: Number(form.previousRank) || rank,
          trend: form.trend,
          searchVolume: Number(form.searchVolume) || 0,
          ...(form.url.trim() ? { url: form.url.trim() } : {}),
        });
        toast.success("Keyword created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update keyword" : "Failed to create keyword");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKeyword.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Keyword deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete keyword");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="SEO panel"
        description="Keyword rankings, backlinks, audits, and Core Web Vitals"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "SEO" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add keyword
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Keywords", value: kpis.keywordCount, icon: Hash, accent: "blue", delay: 0 },
          { title: "Avg position", value: kpis.avgPosition, icon: Target, accent: "amber", delay: 1 },
          { title: "Top 10 rankings", value: kpis.topTen, icon: TrendingUp, accent: "green", delay: 2 },
          { title: "Audits", value: kpis.auditCount, icon: ClipboardList, accent: "violet", delay: 3 },
        ]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search keywords, projects…"
      >
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      {!isLoading && !isError ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total backlinks</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{backlinks.total.toLocaleString("en-IN")}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">New this month</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold text-emerald-600">+{backlinks.newThisMonth}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Lost</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold text-red-600">-{backlinks.lost}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Domain authority</CardTitle></CardHeader>
              <CardContent className="text-lg font-semibold">{backlinks.domainAuthority}</CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <ChartGridCell colSpan={8}>
              <ChartPanel title="Monthly ranking trend" description="Average rank and top-10 keywords" icon={BookOpen} accent="violet">
                <MarketingDualLineChart
                  data={rankingTrend}
                  line1Key="avgRank"
                  line2Key="keywordsTop10"
                  line1Label="Avg rank"
                  line2Label="Keywords in top 10"
                  line1Color="#8b5cf6"
                  line2Color="#22c55e"
                />
              </ChartPanel>
            </ChartGridCell>
            <ChartGridCell colSpan={4}>
              <ChartPanel title="Core Web Vitals" description="Site performance metrics" icon={Gauge} accent="amber">
                <div className="space-y-2">
                  {coreWebVitals.map((v) => (
                    <div key={v.metric} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-xs font-medium">{v.metric}</span>
                      <span className="text-xs">{v.value}</span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          v.status === "good" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
                          v.status === "needs_improvement" && "bg-amber-500/10 text-amber-700 border-amber-500/25",
                          v.status === "poor" && "bg-red-500/10 text-red-600 border-red-500/25",
                        )}
                      >
                        {v.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartPanel>
            </ChartGridCell>
          </div>

          {derivedMetricsNote && (
            <p className="text-[10px] text-muted-foreground px-1">{derivedMetricsNote}</p>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Recent audits</CardTitle></CardHeader>
            <CardContent className="p-0">
              <CmsDataTable columns={auditColumns} rows={audits.slice(0, 6)} rowKey={(a) => a.id} empty={{ icon: Search, title: "No recent audits" }} />
            </CardContent>
          </Card>
        </>
      ) : null}

      <CmsDataTable
        columns={keywordColumns}
        rows={filtered}
        rowKey={(k) => k.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{ icon: Search, title: "No keywords tracked", description: "Add keywords to monitor rankings for your digital projects.", actionLabel: canCreate ? "Add keyword" : undefined, onAction: canCreate ? openCreate : undefined }}
        errorMessage="Check your connection and try again."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit keyword" : "Add keyword"}</DialogTitle>
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
              <Label className="text-xs">Keyword</Label>
              <Input value={form.keyword} onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current rank</Label>
                <Input type="number" min={1} value={form.currentRank} onChange={(e) => setForm((f) => ({ ...f, currentRank: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Previous rank</Label>
                <Input type="number" min={1} value={form.previousRank} onChange={(e) => setForm((f) => ({ ...f, previousRank: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Trend</Label>
                <Select value={form.trend} onValueChange={(v) => setForm((f) => ({ ...f, trend: v as "up" | "down" | "stable" }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Up</SelectItem>
                    <SelectItem value="down">Down</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search volume</Label>
                <Input type="number" min={0} value={form.searchVolume} onChange={(e) => setForm((f) => ({ ...f, searchVolume: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL {editing ? "" : "(optional)"}</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="h-8 text-xs" />
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
        title="Delete keyword?"
        description={deleteTarget ? `"${deleteTarget.keyword}" will be removed.` : undefined}
        loading={deleteKeyword.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
