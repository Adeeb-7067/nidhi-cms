import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Video, Check, X, Loader2, Plus, Clapperboard, Download, Sparkles } from "lucide-react";
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
  useMarketingVideos,
  useCreateMarketingVideo,
  useUpdateMarketingVideo,
  useDeleteMarketingVideo,
  type MarketingVideoDto,
} from "@/api/marketing";
import { VIDEO_EXPORT_LABELS, VIDEO_RENDER_STATUS_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingStatusBadge,
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
import type { VideoExportTarget, VideoRenderStatus } from "@/modules/marketing/types";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { CmsDataTable, type CmsColumn } from "@/components/cms";

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-3.5 w-3.5 text-emerald-600" />
  ) : (
    <X className="h-3.5 w-3.5 text-muted-foreground" />
  );
}

const emptyForm = {
  accountId: "",
  title: "",
  renderStatus: "raw_uploaded" as VideoRenderStatus,
  hasVoiceover: "false",
  hasSubtitles: "false",
  hasThumbnail: "false",
  exportTarget: "reel" as VideoExportTarget,
  dueDate: "",
  assigneeId: "",
};

export default function MarketingVideos() {
  const { can } = usePermissions();
  const canCreate = can("marketing_content", "create");
  const canEdit = can("marketing_content", "edit");
  const canDelete = can("marketing_content", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingVideoDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingVideoDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const formAccountId = form.accountId ? Number(form.accountId) : accountFilterId;
  const { user, canAssignOthers } = useDigitalAssigneeGate(formAccountId);
  const { data, isLoading, isError, refetch } = useMarketingVideos(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createVideo = useCreateMarketingVideo();
  const updateVideo = useUpdateMarketingVideo();
  const deleteVideo = useDeleteMarketingVideo();
  const videos = data?.videos ?? [];
  const saving = createVideo.isPending || updateVideo.isPending;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return videos.filter((v) => {
      const matchesSearch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.clientName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || v.renderStatus === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [videos, search, statusTab]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: videos.length },
      ...(Object.keys(VIDEO_RENDER_STATUS_LABELS) as VideoRenderStatus[]).map((status) => ({
        value: status,
        label: VIDEO_RENDER_STATUS_LABELS[status],
        count: videos.filter((v) => v.renderStatus === status).length,
      })),
    ],
    [videos],
  );

  const kpis = useMemo(
    () => ({
      total: videos.length,
      editing: videos.filter((v) => v.renderStatus === "editing").length,
      ready: videos.filter((v) => v.renderStatus === "ready").length,
      exported: videos.filter((v) => v.renderStatus === "exported").length,
    }),
    [videos],
  );

  const columns = useMemo<CmsColumn<MarketingVideoDto>[]>(
    () => {
      const cols: CmsColumn<MarketingVideoDto>[] = [
        { id: "title", header: "Title", cell: (v) => <span className="font-medium max-w-[180px] block truncate">{v.title}</span> },
        { id: "project", header: "Project", cell: (v) => v.clientName },
        { id: "renderStatus", header: "Render status", chip: true, cell: (v) => <MarketingStatusBadge variant="videoRender" status={v.renderStatus as VideoRenderStatus} /> },
        { id: "voiceover", header: "VO", align: "center", cell: (v) => <BoolIcon value={v.hasVoiceover} /> },
        { id: "subtitles", header: "Subs", align: "center", cell: (v) => <BoolIcon value={v.hasSubtitles} /> },
        { id: "thumbnail", header: "Thumb", align: "center", cell: (v) => <BoolIcon value={v.hasThumbnail} /> },
        { id: "export", header: "Export", cell: (v) => VIDEO_EXPORT_LABELS[v.exportTarget as VideoExportTarget] ?? v.exportTarget },
        { id: "assignee", header: "Assignee", cell: (v) => v.assignee },
        { id: "due", header: "Due", cell: (v) => v.dueDate ? format(new Date(v.dueDate), "MMM d") : "—" },
      ];
      if (showActions) cols.push({ id: "actions", header: "Actions", align: "right", className: "w-[80px]", cell: (v) => <MarketingRowActions canEdit={canEdit && canFullyEditMarketingItem(user, v.createdBy)} canDelete={canDelete && canFullyEditMarketingItem(user, v.createdBy)} onEdit={() => openEdit(v)} onDelete={() => setDeleteTarget(v)} /> });
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

  const openEdit = (v: MarketingVideoDto) => {
    setEditing(v);
    setForm({
      accountId: String(v.accountId),
      title: v.title,
      renderStatus: v.renderStatus as VideoRenderStatus,
      hasVoiceover: String(v.hasVoiceover),
      hasSubtitles: String(v.hasSubtitles),
      hasThumbnail: String(v.hasThumbnail),
      exportTarget: v.exportTarget as VideoExportTarget,
      dueDate: v.dueDate?.slice(0, 10) ?? "",
      assigneeId: v.assigneeId != null ? String(v.assigneeId) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editing && !canFullyEditMarketingItem(user, editing.createdBy)) {
      toast.error("Only the creator or an org admin can edit this video");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      title: form.title.trim(),
      renderStatus: form.renderStatus,
      hasVoiceover: form.hasVoiceover === "true",
      hasSubtitles: form.hasSubtitles === "true",
      hasThumbnail: form.hasThumbnail === "true",
      exportTarget: form.exportTarget,
      dueDate: form.dueDate || null,
      assigneeId: resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id),
    };
    try {
      if (editing) {
        await updateVideo.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: payload,
        });
        toast.success("Video updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createVideo.mutateAsync({
          accountId: Number(form.accountId),
          ...payload,
        });
        toast.success("Video created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update video" : "Failed to create video");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVideo.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Video deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete video");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Video & reel queue"
        description="Raw files, voiceover, subtitles, thumbnails, and export targets"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Videos" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New video
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total videos", value: kpis.total, icon: Video, accent: "blue", delay: 0 },
          { title: "Editing", value: kpis.editing, icon: Clapperboard, accent: "amber", delay: 1 },
          { title: "Ready", value: kpis.ready, icon: Sparkles, accent: "violet", delay: 2 },
          { title: "Exported", value: kpis.exported, icon: Download, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search videos, projects…">
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      <CmsDataTable columns={columns} rows={filtered} rowKey={(v) => v.id} isLoading={isLoading} error={isError} onRetry={() => refetch()} empty={{ icon: Video, title: "No video requests", description: "The queue is empty for current filters.", actionLabel: canCreate ? "New video" : undefined, onAction: canCreate ? openCreate : undefined }} errorMessage="Check your connection and try again." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit video" : "New video request"}</DialogTitle>
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
                <Label className="text-xs">Render status</Label>
                <Select
                  value={form.renderStatus}
                  onValueChange={(v) => setForm((f) => ({ ...f, renderStatus: v as VideoRenderStatus }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIDEO_RENDER_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Export target</Label>
                <Select
                  value={form.exportTarget}
                  onValueChange={(v) => setForm((f) => ({ ...f, exportTarget: v as VideoExportTarget }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIDEO_EXPORT_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Voiceover</Label>
                <Select value={form.hasVoiceover} onValueChange={(v) => setForm((f) => ({ ...f, hasVoiceover: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtitles</Label>
                <Select value={form.hasSubtitles} onValueChange={(v) => setForm((f) => ({ ...f, hasSubtitles: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thumbnail</Label>
                <Select value={form.hasThumbnail} onValueChange={(v) => setForm((f) => ({ ...f, hasThumbnail: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
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
        title="Delete video?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
        loading={deleteVideo.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
