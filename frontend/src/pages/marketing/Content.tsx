import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText, Loader2, Plus, CheckCircle2, Eye, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Progress } from "@/components/ui/progress";
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
  useMarketingContent,
  useCreateMarketingContent,
  useUpdateMarketingContentItem,
  useDeleteMarketingContentItem,
  type MarketingContentDto,
} from "@/api/marketing";
import { APPROVAL_STAGE_LABELS, APPROVAL_STAGE_ORDER, CONTENT_TYPE_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  ApprovalStatusBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingAssigneeField,
  MarketingChipTabs,
  resolveFormAssigneeId,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { useDigitalAssigneeGate } from "@/modules/marketing/use-digital-assignee-gate";
import { canFullyEditMarketingItem } from "@/lib/cms-project-manage";
import { MarketingListPageSkeleton } from "@/components/loading";
import type { ApprovalStage, ContentType } from "@/modules/marketing/types";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { CmsDataTable, type CmsColumn } from "@/components/cms";

const emptyForm = {
  accountId: "",
  title: "",
  type: "blog" as ContentType,
  status: "internal_review" as ApprovalStage,
  seoScore: "",
  wordCount: "",
  dueDate: "",
  assigneeId: "",
};

export default function MarketingContent() {
  const { can } = usePermissions();
  const canCreate = can("marketing_content", "create");
  const canEdit = can("marketing_content", "edit");
  const canDelete = can("marketing_content", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingContentDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingContentDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const formAccountId = form.accountId ? Number(form.accountId) : accountFilterId;
  const { user, canAssignOthers } = useDigitalAssigneeGate(formAccountId);
  const { data, isLoading, isError, refetch } = useMarketingContent(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createContent = useCreateMarketingContent();
  const updateContent = useUpdateMarketingContentItem();
  const deleteContent = useDeleteMarketingContentItem();
  const items = data?.content ?? [];
  const saving = createContent.isPending || updateContent.isPending;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((c) => {
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusTab]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: items.length },
      ...APPROVAL_STAGE_ORDER.map((stage) => ({
        value: stage,
        label: APPROVAL_STAGE_LABELS[stage],
        count: items.filter((c) => c.status === stage).length,
      })),
    ],
    [items],
  );

  const kpis = useMemo(() => {
    const avgSeo =
      items.length === 0
        ? 0
        : Math.round(items.reduce((sum, c) => sum + (c.seoScore ?? 0), 0) / items.length);
    return {
      total: items.length,
      inReview: items.filter((c) => c.status === "internal_review" || c.status === "client_review").length,
      approvedPlus: items.filter((c) =>
        c.status === "approved" || c.status === "scheduled" || c.status === "published",
      ).length,
      avgSeo,
    };
  }, [items]);

  const columns = useMemo<CmsColumn<MarketingContentDto>[]>(
    () => {
      const cols: CmsColumn<MarketingContentDto>[] = [
        { id: "title", header: "Title", cell: (c) => <span className="font-medium max-w-[200px] block truncate">{c.title}</span> },
        { id: "type", header: "Type", cell: (c) => CONTENT_TYPE_LABELS[c.type as ContentType] ?? c.type },
        { id: "project", header: "Project", cell: (c) => c.clientName },
        { id: "status", header: "Status", chip: true, cell: (c) => <ApprovalStatusBadge stage={c.status as ApprovalStage} /> },
        {
          id: "seoScore",
          header: "SEO score",
          cell: (c) => <div className="flex items-center gap-2 min-w-[100px]"><Progress value={c.seoScore} className="h-1.5 flex-1" /><span className="text-[10px] text-muted-foreground w-8">{c.seoScore}</span></div>,
        },
        { id: "words", header: "Words", align: "right", cell: (c) => c.wordCount },
        { id: "assignee", header: "Assignee", cell: (c) => c.assignee },
        { id: "due", header: "Due", cell: (c) => c.dueDate ? format(new Date(c.dueDate), "MMM d") : "—" },
      ];
      if (showActions) cols.push({
        id: "actions", header: "Actions", align: "right", className: "w-[80px]",
        cell: (c) => <MarketingRowActions canEdit={canEdit && canFullyEditMarketingItem(user, c.createdBy)} canDelete={canDelete && canFullyEditMarketingItem(user, c.createdBy)} onEdit={() => openEdit(c)} onDelete={() => setDeleteTarget(c)} />,
      });
      return cols;
    },
    [showActions, canEdit, canDelete, user],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      accountId: projectFilter || "",
      assigneeId: canAssignOthers ? "" : user?.id != null ? String(user.id) : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: MarketingContentDto) => {
    setEditing(c);
    setForm({
      accountId: String(c.accountId),
      title: c.title,
      type: c.type as ContentType,
      status: c.status as ApprovalStage,
      seoScore: String(c.seoScore),
      wordCount: String(c.wordCount),
      dueDate: c.dueDate?.slice(0, 10) ?? "",
      assigneeId: c.assigneeId != null ? String(c.assigneeId) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editing && !canFullyEditMarketingItem(user, editing.createdBy)) {
      toast.error("Only the creator or an org admin can edit this content");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const seoScore = form.seoScore === "" ? 0 : Number(form.seoScore);
    const wordCount = form.wordCount === "" ? 0 : Number(form.wordCount);
    if (!Number.isFinite(seoScore) || seoScore < 0 || seoScore > 100) {
      toast.error("SEO score must be 0–100");
      return;
    }
    if (!Number.isFinite(wordCount) || wordCount < 0) {
      toast.error("Enter a valid word count");
      return;
    }
    const payload = {
      title: form.title.trim(),
      type: form.type,
      seoScore,
      wordCount,
      dueDate: form.dueDate || null,
      assigneeId: resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id),
    };
    try {
      if (editing) {
        await updateContent.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: payload,
        });
        toast.success("Content updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createContent.mutateAsync({
          accountId: Number(form.accountId),
          ...payload,
        });
        toast.success("Content created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update content" : "Failed to create content");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContent.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Content deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete content");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Content writer queue"
        description="Blogs, captions, scripts, and emails with approval status and SEO scores"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Content" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New content
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total pieces", value: kpis.total, icon: FileText, accent: "blue", delay: 0 },
          { title: "In review", value: kpis.inReview, icon: Eye, accent: "amber", delay: 1 },
          { title: "Approved+", value: kpis.approvedPlus, icon: CheckCircle2, accent: "green", delay: 2 },
          { title: "Avg SEO score", value: kpis.avgSeo, icon: Gauge, accent: "violet", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search content, projects…">
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{ icon: FileText, title: "No content items", description: "The queue is empty for current filters.", actionLabel: canCreate ? "New content" : undefined, onAction: canCreate ? openCreate : undefined }}
        errorMessage="Check your connection and try again."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit content" : "New content item"}</DialogTitle>
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
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as ContentType }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SEO score</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.seoScore}
                  onChange={(e) => setForm((f) => ({ ...f, seoScore: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Word count</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.wordCount}
                  onChange={(e) => setForm((f) => ({ ...f, wordCount: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assignee</Label>
              <MarketingAssigneeField
                accountId={formAccountId}
                value={form.assigneeId}
                onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
              />
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
        title="Delete content?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
        loading={deleteContent.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
