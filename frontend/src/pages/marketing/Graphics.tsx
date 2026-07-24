import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Image, ExternalLink, Loader2, Plus, CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  useMarketingGraphics,
  useCreateMarketingGraphic,
  useUpdateMarketingGraphic,
  useDeleteMarketingGraphic,
  type MarketingGraphicDto,
} from "@/api/marketing";
import { APPROVAL_STAGE_LABELS, APPROVAL_STAGE_ORDER, GRAPHIC_FILE_LABELS } from "@/modules/marketing/constants";
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
import { cn } from "@/lib/utils";
import type { ApprovalStage, GraphicFileType } from "@/modules/marketing/types";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";

const emptyForm = {
  accountId: "",
  title: "",
  status: "internal_review" as ApprovalStage,
  revisionCount: "",
  dueDate: "",
  fileTypes: [] as GraphicFileType[],
  brandGuidelineUrl: "",
  assigneeId: "",
};

export default function MarketingGraphics() {
  const { can } = usePermissions();
  const canCreate = can("marketing_content", "create");
  const canEdit = can("marketing_content", "edit");
  const canDelete = can("marketing_content", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingGraphicDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingGraphicDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const formAccountId = form.accountId ? Number(form.accountId) : accountFilterId;
  const { user, canAssignOthers } = useDigitalAssigneeGate(formAccountId);
  const { data, isLoading, isError } = useMarketingGraphics(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createGraphic = useCreateMarketingGraphic();
  const updateGraphic = useUpdateMarketingGraphic();
  const deleteGraphic = useDeleteMarketingGraphic();
  const graphics = data?.graphics ?? [];
  const saving = createGraphic.isPending || updateGraphic.isPending;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return graphics.filter((g) => {
      const matchesSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.clientName.toLowerCase().includes(q) ||
        g.assignee.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || g.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [graphics, search, statusTab]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: graphics.length },
      ...APPROVAL_STAGE_ORDER.map((stage) => ({
        value: stage,
        label: APPROVAL_STAGE_LABELS[stage],
        count: graphics.filter((g) => g.status === stage).length,
      })),
    ],
    [graphics],
  );

  const kpis = useMemo(
    () => ({
      total: graphics.length,
      internalReview: graphics.filter((g) => g.status === "internal_review").length,
      revision: graphics.filter((g) => g.status === "revision").length,
      approvedPlus: graphics.filter((g) =>
        g.status === "approved" || g.status === "scheduled" || g.status === "published",
      ).length,
    }),
    [graphics],
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

  const openEdit = (g: MarketingGraphicDto) => {
    setEditing(g);
    setForm({
      accountId: String(g.accountId),
      title: g.title,
      status: g.status as ApprovalStage,
      revisionCount: String(g.revisionCount),
      dueDate: g.dueDate?.slice(0, 10) ?? "",
      fileTypes: (g.fileTypes ?? []) as GraphicFileType[],
      brandGuidelineUrl: g.brandGuidelineUrl === "#" ? "" : (g.brandGuidelineUrl ?? ""),
      assigneeId: g.assigneeId != null ? String(g.assigneeId) : "",
    });
    setDialogOpen(true);
  };

  const toggleFileType = (fileType: GraphicFileType) => {
    setForm((f) => ({
      ...f,
      fileTypes: f.fileTypes.includes(fileType)
        ? f.fileTypes.filter((t) => t !== fileType)
        : [...f.fileTypes, fileType],
    }));
  };

  const handleSave = async () => {
    if (editing && !canFullyEditMarketingItem(user, editing.createdBy)) {
      toast.error("Only the creator or an org admin can edit this graphic");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const revisions = Number(form.revisionCount);
    if (!Number.isFinite(revisions) || revisions < 0) {
      toast.error("Enter a valid revision count");
      return;
    }
    const payload = {
      title: form.title.trim(),
      revisionCount: revisions,
      dueDate: form.dueDate || null,
      fileTypes: form.fileTypes,
      brandGuidelineUrl: form.brandGuidelineUrl.trim() || null,
      assigneeId: resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id),
    };
    try {
      if (editing) {
        await updateGraphic.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: payload,
        });
        toast.success("Graphic updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createGraphic.mutateAsync({
          accountId: Number(form.accountId),
          ...payload,
        });
        toast.success("Graphic created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update graphic" : "Failed to create graphic");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGraphic.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Graphic deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete graphic");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Graphics queue"
        description="Design requests, revisions, brand guidelines, and deliverable files"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Graphics" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New graphic
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total", value: kpis.total, icon: Image, accent: "blue", delay: 0 },
          { title: "Internal review", value: kpis.internalReview, icon: Eye, accent: "amber", delay: 1 },
          { title: "Revision", value: kpis.revision, icon: RotateCcw, accent: "violet", delay: 2 },
          { title: "Approved / published", value: kpis.approvedPlus, icon: CheckCircle2, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search designs, projects…">
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs />
      ) : isError ? (
        <MarketingEmptyState icon={Image} title="Could not load graphics" description="Check your connection and try again." />
      ) : filtered.length === 0 ? (
        <MarketingEmptyState
          icon={Image}
          title="No graphic requests"
          description="The queue is empty for current filters."
          actionLabel={canCreate ? "New graphic" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Design</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Revisions</TableHead>
                <TableHead className="text-xs">Files</TableHead>
                <TableHead className="text-xs">Brand guide</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                {showActions && <TableHead className="text-xs text-right w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">{g.title}</TableCell>
                  <TableCell className="text-xs">{g.clientName}</TableCell>
                  <TableCell>
                    <ApprovalStatusBadge stage={g.status as ApprovalStage} />
                  </TableCell>
                  <TableCell className="text-xs text-center">{g.revisionCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {g.fileTypes.map((f) => (
                        <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0">
                          {GRAPHIC_FILE_LABELS[f as GraphicFileType] ?? f}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {g.brandGuidelineUrl && g.brandGuidelineUrl !== "#" ? (
                      <a
                        href={g.brandGuidelineUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{g.assignee}</TableCell>
                  <TableCell className="text-xs">
                    {g.dueDate ? format(new Date(g.dueDate), "MMM d") : "—"}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <MarketingRowActions
                        canEdit={canEdit && canFullyEditMarketingItem(user, g.createdBy)}
                        canDelete={canDelete && canFullyEditMarketingItem(user, g.createdBy)}
                        onEdit={() => openEdit(g)}
                        onDelete={() => setDeleteTarget(g)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit graphic" : "New graphic request"}</DialogTitle>
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
            <div className="space-y-1.5">
              <Label className="text-xs">File types</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GRAPHIC_FILE_LABELS) as GraphicFileType[]).map((fileType) => {
                  const selected = form.fileTypes.includes(fileType);
                  return (
                    <Badge
                      key={fileType}
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-[10px] px-2 py-0.5 select-none",
                        selected && "hover:bg-primary/90",
                      )}
                      onClick={() => toggleFileType(fileType)}
                    >
                      {GRAPHIC_FILE_LABELS[fileType]}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand guideline URL</Label>
              <Input
                type="url"
                placeholder="https://…"
                value={form.brandGuidelineUrl}
                onChange={(e) => setForm((f) => ({ ...f, brandGuidelineUrl: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assignee</Label>
              <MarketingAssigneeField
                accountId={formAccountId}
                value={form.assigneeId}
                onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Revision count</Label>
              <Input
                type="number"
                min={0}
                value={form.revisionCount}
                onChange={(e) => setForm((f) => ({ ...f, revisionCount: e.target.value }))}
                className="h-8 text-xs"
              />
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
        title="Delete graphic?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
        loading={deleteGraphic.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
