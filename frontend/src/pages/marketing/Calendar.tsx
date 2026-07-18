import { useMemo, useState, Fragment } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Clock, Loader2, Plus, Send } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarketingPosts,
  useCreateMarketingPost,
  useUpdateMarketingPost,
  useDeleteMarketingPost,
  type MarketingPostDto,
} from "@/api/marketing";
import { POST_SCHEDULE_STATUS_LABELS, PLATFORM_LABELS } from "@/modules/marketing/constants";
import type { MarketingPlatform, PostScheduleStatus } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  PlatformIconBadge,
  ApprovalStatusBadge,
  MarketingStatusBadge,
  MarketingRowActions,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingAssigneeSelect,
  MarketingChipTabs,
  parseAssigneeId,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";

const scheduleTabs: (PostScheduleStatus | "all")[] = ["all", "scheduled", "pending", "published", "rejected"];

const CALENDAR_PLATFORMS: MarketingPlatform[] = [
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "twitter",
];

const emptyForm = {
  accountId: "",
  platform: "instagram" as MarketingPlatform,
  caption: "",
  scheduledAt: "",
  scheduleStatus: "pending" as PostScheduleStatus,
  hashtags: "",
  assigneeId: "",
};

function parseHashtags(raw: string): string[] {
  return raw.split(",").map((h) => h.trim()).filter(Boolean);
}

function toIsoScheduledAt(value: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return new Date(value).toISOString();
  }
  return value;
}

export default function MarketingCalendar() {
  const { can } = usePermissions();
  const canCreate = can("marketing_calendar", "create");
  const canEdit = can("marketing_calendar", "edit");
  const canDelete = can("marketing_calendar", "delete");
  const showActions = canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingPostDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingPostDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError } = useMarketingPosts(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createPost = useCreateMarketingPost();
  const updatePost = useUpdateMarketingPost();
  const deletePost = useDeleteMarketingPost();
  const posts = data?.posts ?? [];
  const saving = createPost.isPending || updatePost.isPending;

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (p.caption ?? "").toLowerCase().includes(q) ||
        (p.clientName ?? "").toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || p.scheduleStatus === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, statusTab]);

  const statusChipItems = useMemo(
    () =>
      scheduleTabs.map((s) => ({
        value: s,
        label: s === "all" ? "All" : POST_SCHEDULE_STATUS_LABELS[s],
        count: s === "all" ? posts.length : posts.filter((p) => p.scheduleStatus === s).length,
      })),
    [posts],
  );

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, MarketingPostDto[]>();
    for (const p of filtered) {
      const key = p.scheduledAt
        ? format(new Date(p.scheduledAt), "yyyy-MM-dd")
        : "unscheduled";
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === "unscheduled") return 1;
      if (b[0] === "unscheduled") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const tableColSpan = showActions ? 8 : 7;

  const kpis = useMemo(
    () => ({
      total: posts.length,
      scheduled: posts.filter((p) => p.scheduleStatus === "scheduled").length,
      pending: posts.filter((p) => p.scheduleStatus === "pending").length,
      published: posts.filter((p) => p.scheduleStatus === "published").length,
    }),
    [posts],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      scheduleStatus: "pending",
      accountId: projectFilter || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (p: MarketingPostDto) => {
    setEditing(p);
    setForm({
      accountId: String(p.accountId),
      platform: p.platform,
      caption: p.caption ?? "",
      scheduleStatus: p.scheduleStatus,
      scheduledAt: p.scheduledAt?.slice(0, 16) ?? "",
      hashtags: (p.hashtags ?? []).join(", "),
      assigneeId: p.assigneeId != null ? String(p.assigneeId) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updatePost.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: {
            platform: form.platform,
            caption: form.caption.trim(),
            scheduledAt: toIsoScheduledAt(form.scheduledAt),
            hashtags: parseHashtags(form.hashtags),
            assigneeId: parseAssigneeId(form.assigneeId),
          },
        });
        toast.success("Post updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createPost.mutateAsync({
          accountId: Number(form.accountId),
          platform: form.platform,
          caption: form.caption.trim(),
          scheduledAt: toIsoScheduledAt(form.scheduledAt),
          hashtags: parseHashtags(form.hashtags),
          assigneeId: parseAssigneeId(form.assigneeId),
        });
        toast.success("Post created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update post" : "Failed to create post");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePost.mutateAsync({ id: deleteTarget.id, accountId: deleteTarget.accountId });
      toast.success("Post deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete post");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Content calendar"
        description="Scheduled posts — platform, caption, hashtags, and approval status"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Calendar" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              New post
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total posts", value: kpis.total, icon: Calendar, accent: "blue", delay: 0 },
          { title: "Scheduled", value: kpis.scheduled, icon: Send, accent: "violet", delay: 1 },
          { title: "Pending", value: kpis.pending, icon: Clock, accent: "amber", delay: 2 },
          { title: "Published", value: kpis.published, icon: CheckCircle2, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search posts, projects…">
        <DigitalProjectSelect allowAll value={projectFilter} onValueChange={setProjectFilter} className="h-8 w-[220px] text-xs" />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs />
      ) : isError ? (
        <MarketingEmptyState icon={Calendar} title="Couldn't load posts" description="Check API permissions and try again." />
      ) : filtered.length === 0 ? (
        <MarketingEmptyState
          icon={Calendar}
          title="No posts found"
          description="Adjust filters or schedule a new post."
          actionLabel={canCreate ? "New post" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Scheduled</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Platform</TableHead>
                <TableHead className="text-xs">Caption</TableHead>
                <TableHead className="text-xs">Hashtags</TableHead>
                <TableHead className="text-xs">Approval</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                {showActions && <TableHead className="text-xs text-right w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedByDay.map(([dayKey, dayPosts]) => (
                <Fragment key={dayKey}>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={tableColSpan} className="p-0">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b sticky top-0 z-10">
                        {dayKey === "unscheduled"
                          ? "Unscheduled"
                          : format(new Date(`${dayKey}T12:00:00`), "EEEE, MMM d")}
                      </div>
                    </TableCell>
                  </TableRow>
                  {dayPosts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {p.scheduledAt ? format(new Date(p.scheduledAt), "MMM d, h:mm a") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{p.clientName}</TableCell>
                      <TableCell><PlatformIconBadge platform={p.platform} showLabel={false} /></TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{p.caption}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(p.hashtags ?? []).map((h) => (
                            <Badge key={h} variant="secondary" className="text-[9px] px-1 py-0">{h}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><ApprovalStatusBadge stage={p.approvalStage} /></TableCell>
                      <TableCell><MarketingStatusBadge variant="postSchedule" status={p.scheduleStatus} /></TableCell>
                      {showActions && (
                        <TableCell className="text-right">
                          <MarketingRowActions
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onEdit={() => openEdit(p)}
                            onDelete={() => setDeleteTarget(p)}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit post" : "Schedule post"}</DialogTitle>
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
              <Label className="text-xs">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm((f) => ({ ...f, platform: v as MarketingPlatform }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CALENDAR_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caption</Label>
              <Input
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hashtags (comma-separated)</Label>
              <Input
                value={form.hashtags}
                onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                placeholder="marketing, brand, launch"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assignee</Label>
              <MarketingAssigneeSelect
                value={form.assigneeId}
                onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Scheduled date & time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
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
        title="Delete post?"
        description={deleteTarget ? "This scheduled post will be removed." : undefined}
        loading={deletePost.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
