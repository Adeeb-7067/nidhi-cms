import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Hash,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarketingAccounts,
  useMarketingPosts,
  useCreateMarketingPost,
  useUpdateMarketingPost,
  useDeleteMarketingPost,
  type MarketingPostDto,
} from "@/api/marketing";
import {
  POST_SCHEDULE_STATUS_LABELS,
  PLATFORM_LABELS,
  POST_CONTENT_FORMAT_LABELS,
  POST_CONTENT_FORMATS,
  ALL_MARKETING_PLATFORMS,
} from "@/modules/marketing/constants";
import type { MarketingPlatform, PostContentFormat, PostScheduleStatus } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  PlatformIconBadge,
  ApprovalStatusBadge,
  MarketingConfirmDialog,
  DigitalProjectSelect,
  MarketingAssigneeField,
  MarketingChipTabs,
  MarketingRowActions,
  resolveFormAssigneeId,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { useDigitalAssigneeGate } from "@/modules/marketing/use-digital-assignee-gate";
import {
  canDeleteMarketingItem,
  canFullyEditMarketingItem,
} from "@/lib/cms-project-manage";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";
import { cn } from "@/lib/utils";

const scheduleTabs: (PostScheduleStatus | "all")[] = [
  "all",
  "scheduled",
  "pending",
  "published",
  "rejected",
];

/** Prefer bound platforms first, then the rest of the full channel list. */
function platformsForAccount(
  platforms: string[] | null | undefined,
): MarketingPlatform[] {
  const known = ALL_MARKETING_PLATFORMS;
  const bound = (platforms ?? []).filter((p): p is MarketingPlatform =>
    known.includes(p as MarketingPlatform),
  );
  if (bound.length === 0) return [...known];
  const rest = known.filter((p) => !bound.includes(p));
  return [...bound, ...rest];
}

function pickPlatformForAccount(
  platforms: string[] | null | undefined,
  preferred?: MarketingPlatform | "",
): MarketingPlatform {
  const options = platformsForAccount(platforms);
  if (preferred && options.includes(preferred)) return preferred;
  const bound = (platforms ?? []).filter((p): p is MarketingPlatform =>
    ALL_MARKETING_PLATFORMS.includes(p as MarketingPlatform),
  );
  return bound[0] ?? options[0] ?? "instagram";
}

function postPlatforms(p: MarketingPostDto): MarketingPlatform[] {
  if (Array.isArray(p.platforms) && p.platforms.length > 0) return p.platforms;
  return p.platform ? [p.platform] : [];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_ACCENT: Record<PostScheduleStatus, string> = {
  scheduled: "bg-violet-500",
  pending: "bg-amber-500",
  published: "bg-emerald-500",
  rejected: "bg-destructive",
};

const STATUS_RING: Record<PostScheduleStatus, string> = {
  scheduled: "ring-violet-500/30",
  pending: "ring-amber-500/30",
  published: "ring-emerald-500/30",
  rejected: "ring-destructive/30",
};

const emptyForm = {
  accountId: "",
  platforms: ["instagram"] as MarketingPlatform[],
  contentFormat: "graphic" as PostContentFormat,
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

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export default function MarketingCalendar() {
  const { can } = usePermissions();
  const canCreate = can("marketing_calendar", "create");
  const canEdit = can("marketing_calendar", "edit");
  const canDeleteModule = can("marketing_calendar", "delete");
  /** Own posts: create/edit is enough (AM/craft often lack module delete). */
  const canDeleteOwn = canDeleteModule || canCreate || canEdit;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [statusTab, setStatusTab] = useState<string>("all");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingPostDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingPostDto | null>(null);
  const [previewTarget, setPreviewTarget] = useState<MarketingPostDto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const formAccountId = form.accountId ? Number(form.accountId) : accountFilterId;
  const { user, canAssignOthers } = useDigitalAssigneeGate(formAccountId);

  /** Visible month grid (± week padding) — fetch by window, not a flat 200-row page. */
  const postsQuery = useMemo(() => {
    const from = startOfWeek(startOfMonth(monthCursor));
    const to = endOfWeek(endOfMonth(monthCursor));
    return {
      ...(accountFilterId ? { accountId: accountFilterId } : {}),
      scheduledFrom: from.toISOString(),
      scheduledTo: to.toISOString(),
      includeUnscheduled: true,
      limit: 1000,
    };
  }, [monthCursor, accountFilterId]);

  const { data, isLoading, isError } = useMarketingPosts(postsQuery);
  const { data: accountsData } = useMarketingAccounts();
  const accounts = accountsData?.accounts ?? [];
  const createPost = useCreateMarketingPost();
  const updatePost = useUpdateMarketingPost();
  const deletePost = useDeleteMarketingPost();
  const posts = data?.posts ?? [];
  const windowTotal = data?.total ?? posts.length;
  const saving = createPost.isPending || updatePost.isPending;

  const scheduleAccount = useMemo(() => {
    const id = form.accountId ? Number(form.accountId) : NaN;
    if (!Number.isFinite(id)) return null;
    return accounts.find((a) => a.id === id) ?? null;
  }, [accounts, form.accountId]);

  const schedulePlatformOptions = useMemo(
    () => platformsForAccount(scheduleAccount?.platforms),
    [scheduleAccount],
  );

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

  const postsByDay = useMemo(() => {
    const map = new Map<string, MarketingPostDto[]>();
    for (const p of filtered) {
      if (!p.scheduledAt) continue;
      const key = format(new Date(p.scheduledAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return ta - tb;
      });
    }
    return map;
  }, [filtered]);

  const unscheduled = useMemo(
    () => filtered.filter((p) => !p.scheduledAt),
    [filtered],
  );

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor));
    const end = endOfWeek(endOfMonth(monthCursor));
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const selectedKey = dayKey(selectedDay);
  const selectedPosts = postsByDay.get(selectedKey) ?? [];

  const statusChipItems = useMemo(
    () =>
      scheduleTabs.map((s) => ({
        value: s,
        label: s === "all" ? "All" : POST_SCHEDULE_STATUS_LABELS[s],
        count:
          s === "all"
            ? windowTotal
            : posts.filter((p) => p.scheduleStatus === s).length,
      })),
    [posts, windowTotal],
  );

  const kpis = useMemo(
    () => ({
      total: windowTotal,
      scheduled: posts.filter((p) => p.scheduleStatus === "scheduled").length,
      pending: posts.filter((p) => p.scheduleStatus === "pending").length,
      published: posts.filter((p) => p.scheduleStatus === "published").length,
    }),
    [posts, windowTotal],
  );

  const openCreate = (prefillDay?: Date) => {
    setEditing(null);
    const day = prefillDay ?? selectedDay;
    const stamp = `${format(day, "yyyy-MM-dd")}T10:00`;
    const accountId = projectFilter || "";
    const account = accountId
      ? accounts.find((a) => String(a.id) === accountId)
      : null;
    setForm({
      ...emptyForm,
      scheduleStatus: "pending",
      accountId,
      platforms: [pickPlatformForAccount(account?.platforms)],
      scheduledAt: stamp,
      assigneeId: canAssignOthers ? "" : user?.id != null ? String(user.id) : "",
    });
    setDialogOpen(true);
  };

  const openEdit = (p: MarketingPostDto) => {
    setEditing(p);
    setForm({
      accountId: String(p.accountId),
      platforms: postPlatforms(p),
      contentFormat: (p.contentFormat ?? "post") as PostContentFormat,
      caption: p.caption ?? "",
      scheduleStatus: p.scheduleStatus,
      scheduledAt: p.scheduledAt?.slice(0, 16) ?? "",
      hashtags: (p.hashtags ?? []).join(", "),
      assigneeId: p.assigneeId != null ? String(p.assigneeId) : "",
    });
    setDialogOpen(true);
  };

  const focusCalendarOnScheduledAt = (isoOrLocal: string | null | undefined) => {
    if (!isoOrLocal) return;
    const when = new Date(isoOrLocal);
    if (Number.isNaN(when.getTime())) return;
    setSelectedDay(when);
    setMonthCursor(startOfMonth(when));
    setStatusTab("all");
  };

  const handleSave = async () => {
    if (editing && !canFullyEditMarketingItem(user, editing.createdBy)) {
      toast.error("Only the creator or an org admin can edit this post");
      return;
    }
    try {
      const selectedPlatforms =
        form.platforms.length > 0 ? form.platforms : [pickPlatformForAccount(undefined)];
      const scheduledIso = toIsoScheduledAt(form.scheduledAt);
      if (editing) {
        await updatePost.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: {
            platforms: selectedPlatforms,
            platform: selectedPlatforms[0],
            contentFormat: form.contentFormat,
            caption: form.caption.trim(),
            scheduledAt: scheduledIso,
            hashtags: parseHashtags(form.hashtags),
            assigneeId: resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id),
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
          platforms: selectedPlatforms,
          platform: selectedPlatforms[0],
          contentFormat: form.contentFormat,
          caption: form.caption.trim(),
          scheduledAt: scheduledIso,
          hashtags: parseHashtags(form.hashtags),
          assigneeId: resolveFormAssigneeId(canAssignOthers, form.assigneeId, user?.id),
        });
        // Keep list filter aligned with the account we just wrote to.
        if (projectFilter && projectFilter !== form.accountId) {
          setProjectFilter(form.accountId);
        }
        toast.success(
          scheduledIso
            ? `Post scheduled for ${format(new Date(scheduledIso), "MMM d, yyyy 'at' h:mm a")}`
            : "Post created",
        );
      }
      focusCalendarOnScheduledAt(scheduledIso);
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
        description="Plan the week visually — pick a day, then schedule posts by platform"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Calendar" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              Schedule post
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Posts this board", value: kpis.total, icon: Calendar, accent: "blue", delay: 0 },
          { title: "Scheduled", value: kpis.scheduled, icon: Send, accent: "violet", delay: 1 },
          { title: "Pending", value: kpis.pending, icon: Clock, accent: "amber", delay: 2 },
          { title: "Published", value: kpis.published, icon: CheckCircle2, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search captions, projects…">
        <DigitalProjectSelect
          allowAll
          value={projectFilter}
          onValueChange={setProjectFilter}
          className="h-8 w-[220px] text-xs"
        />
      </MarketingFilterBar>

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs />
      ) : isError ? (
        <MarketingEmptyState
          icon={Calendar}
          title="Couldn't load posts"
          description="Check API permissions and try again."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          {/* Month board */}
          <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-br from-primary/[0.07] via-background to-background px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Publishing board
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {format(monthCursor, "MMMM yyyy")}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonthCursor((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    const today = new Date();
                    setMonthCursor(startOfMonth(today));
                    setSelectedDay(today);
                  }}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMonthCursor((m) => addMonths(m, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px border-b border-border/60 bg-border/40 px-2 pt-2 sm:px-3">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-border/30 p-2 sm:p-3">
              {monthDays.map((day) => {
                const key = dayKey(day);
                const dayPosts = postsByDay.get(key) ?? [];
                const inMonth = isSameMonth(day, monthCursor);
                const selected = isSameDay(day, selectedDay);
                const today = isToday(day);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      if (!isSameMonth(day, monthCursor)) {
                        setMonthCursor(startOfMonth(day));
                      }
                    }}
                    onDoubleClick={() => {
                      if (canCreate) openCreate(day);
                    }}
                    className={cn(
                      "group relative flex min-h-[72px] flex-col rounded-xl border p-1.5 text-left transition-all duration-200 sm:min-h-[88px] sm:p-2",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      inMonth
                        ? "border-transparent bg-background/80 hover:border-primary/25 hover:bg-primary/[0.04]"
                        : "border-transparent bg-muted/20 text-muted-foreground/70",
                      selected && "border-primary/40 bg-primary/[0.08] shadow-sm ring-1 ring-primary/25",
                      today && !selected && "border-primary/20",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                        today && "bg-primary text-primary-foreground",
                        selected && !today && "bg-primary/15 text-primary",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-auto flex flex-wrap gap-0.5">
                      {dayPosts.slice(0, 4).map((p) => (
                        <span
                          key={p.id}
                          title={
                            p.caption ||
                            postPlatforms(p)
                              .map((plat) => PLATFORM_LABELS[plat])
                              .join(", ")
                          }
                          className={cn(
                            "h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2",
                            STATUS_ACCENT[p.scheduleStatus],
                          )}
                        />
                      ))}
                      {dayPosts.length > 4 ? (
                        <span className="text-[9px] font-medium text-muted-foreground">
                          +{dayPosts.length - 4}
                        </span>
                      ) : null}
                    </div>
                    {dayPosts.length > 0 ? (
                      <span className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded-md bg-muted/80 px-1 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground sm:group-hover:inline">
                        {dayPosts.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground sm:px-5">
              {(
                [
                  ["scheduled", "Scheduled"],
                  ["pending", "Pending"],
                  ["published", "Published"],
                  ["rejected", "Rejected"],
                ] as const
              ).map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_ACCENT[key])} />
                  {label}
                </span>
              ))}
              <span className="ml-auto hidden sm:inline">Double-click a day to schedule</span>
            </div>
          </section>

          {/* Day timeline */}
          <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="border-b border-border/70 px-4 py-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Day agenda
              </p>
              <div className="mt-0.5 flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                  {format(selectedDay, "EEEE, MMM d")}
                </h2>
                {canCreate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 shrink-0 gap-1 text-xs"
                    onClick={() => openCreate(selectedDay)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedPosts.length === 0
                  ? "Nothing scheduled — free day to plan."
                  : `${selectedPosts.length} post${selectedPosts.length === 1 ? "" : "s"} lined up`}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {filtered.length === 0 ? (
                <MarketingEmptyState
                  icon={Calendar}
                  title="No posts match"
                  description="Try clearing filters or schedule something new."
                  actionLabel={canCreate ? "Schedule post" : undefined}
                  onAction={canCreate ? () => openCreate() : undefined}
                />
              ) : selectedPosts.length === 0 ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Open day</p>
                  <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                    No posts on this date. Schedule Instagram, website, or social content here.
                  </p>
                  {canCreate ? (
                    <Button
                      size="sm"
                      className="mt-4 h-8 gap-1.5"
                      onClick={() => openCreate(selectedDay)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Schedule for this day
                    </Button>
                  ) : null}
                </div>
              ) : (
                <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border/80">
                  {selectedPosts.map((p, index) => (
                    <li
                      key={p.id}
                      className={cn(
                        "relative pl-9 transition-transform duration-200 hover:-translate-y-0.5",
                        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                      )}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <span
                        className={cn(
                          "absolute left-2 top-4 h-3.5 w-3.5 rounded-full ring-4 ring-card",
                          STATUS_ACCENT[p.scheduleStatus],
                        )}
                      />
                      <article
                        className={cn(
                          "rounded-xl border border-border/70 bg-background/90 p-3 shadow-sm ring-1",
                          STATUS_RING[p.scheduleStatus],
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {postPlatforms(p).map((plat) => (
                                <PlatformIconBadge key={plat} platform={plat} />
                              ))}
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {POST_CONTENT_FORMAT_LABELS[
                                  (p.contentFormat ?? "post") as PostContentFormat
                                ]}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-normal capitalize">
                                {POST_SCHEDULE_STATUS_LABELS[p.scheduleStatus]}
                              </Badge>
                            </div>
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
                              {p.caption?.trim() || (
                                <span className="italic text-muted-foreground">No caption yet</span>
                              )}
                            </p>
                          </div>
                          <time className="shrink-0 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
                            {p.scheduledAt ? format(new Date(p.scheduledAt), "h:mm a") : "—"}
                          </time>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="truncate font-medium text-foreground/80">{p.clientName}</span>
                          {p.assignee ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3 w-3" />
                              {p.assignee}
                            </span>
                          ) : null}
                          <ApprovalStatusBadge stage={p.approvalStage} />
                        </div>

                        {(p.hashtags?.length ?? 0) > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.hashtags.slice(0, 6).map((h) => (
                              <span
                                key={h}
                                className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                <Hash className="h-2.5 w-2.5" />
                                {h}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex justify-end border-t border-border/50 pt-2">
                          <MarketingRowActions
                            label="Post actions"
                            items={[
                              {
                                label: "Preview",
                                icon: Eye,
                                onSelect: () => setPreviewTarget(p),
                              },
                              {
                                label: "Edit",
                                icon: Pencil,
                                onSelect: () => openEdit(p),
                                hidden: !(canEdit && canFullyEditMarketingItem(user, p.createdBy)),
                              },
                              {
                                label: "Delete",
                                icon: Trash2,
                                onSelect: () => setDeleteTarget(p),
                                variant: "destructive",
                                separatorBefore: true,
                                hidden: !(canDeleteOwn && canDeleteMarketingItem(user, p.createdBy)),
                              },
                            ]}
                          />
                        </div>
                      </article>
                    </li>
                  ))}
                </ol>
              )}

              {unscheduled.length > 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/15 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unscheduled drafts · {unscheduled.length}
                  </p>
                  <div className="mt-2 space-y-2">
                    {unscheduled.map((p) => (
                      <div
                        key={p.id}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-left transition-colors hover:border-primary/30"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (canEdit && canFullyEditMarketingItem(user, p.createdBy)) {
                              openEdit(p);
                            } else {
                              setPreviewTarget(p);
                            }
                          }}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <span className="flex shrink-0 items-center gap-0.5">
                            {postPlatforms(p).slice(0, 3).map((plat) => (
                              <PlatformIconBadge key={plat} platform={plat} showLabel={false} />
                            ))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{p.clientName}</span>
                            <span className="line-clamp-1 text-[11px] text-muted-foreground">
                              {p.caption || "No caption"}
                            </span>
                          </span>
                        </button>
                        <MarketingRowActions
                          label="Post actions"
                          items={[
                            {
                              label: "Preview",
                              icon: Eye,
                              onSelect: () => setPreviewTarget(p),
                            },
                            {
                              label: "Delete",
                              icon: Trash2,
                              onSelect: () => setDeleteTarget(p),
                              variant: "destructive",
                              separatorBefore: true,
                              hidden: !(canDeleteOwn && canDeleteMarketingItem(user, p.createdBy)),
                            },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
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
                  onValueChange={(v) => {
                    const account = accounts.find((a) => String(a.id) === v);
                    setForm((f) => ({
                      ...f,
                      accountId: v,
                      platforms: [pickPlatformForAccount(account?.platforms, f.platforms?.[0])],

                    }));
                  }}
                  className="h-8 w-full text-xs"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Platforms (Select one or multiple)</Label>
              {!editing && !form.accountId ? (
                <p className="text-xs text-muted-foreground italic py-1">Select a digital project first</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {schedulePlatformOptions.map((p) => {
                    const selected = (form.platforms ?? []).includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setForm((f) => {
                            const current = f.platforms ?? [];
                            const exists = current.includes(p);
                            let next: MarketingPlatform[];
                            if (exists) {
                              next = current.filter((item) => item !== p);
                              if (next.length === 0) next = [p];
                            } else {
                              next = [...current, p];
                            }
                            return { ...f, platforms: next };
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                          selected
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <PlatformIconBadge platform={p} />
                        <span>{PLATFORM_LABELS[p]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What are you scheduling?</Label>
              <Select
                value={form.contentFormat}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, contentFormat: v as PostContentFormat }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_CONTENT_FORMATS.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>
                      {POST_CONTENT_FORMAT_LABELS[fmt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caption</Label>
              <Textarea
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                rows={4}
                className="min-h-[88px] resize-y text-xs"
                placeholder="Write the post caption…"
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
              <MarketingAssigneeField
                accountId={formAccountId}
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
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete post?"
        description={deleteTarget ? "This scheduled post will be removed." : undefined}
        loading={deletePost.isPending}
        onConfirm={() => void handleDelete()}
      />

      {/* Content Preview Dialog */}
      <Dialog open={previewTarget != null} onOpenChange={(open) => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl border-border/80 shadow-2xl">
          {previewTarget ? (
            <div className="flex flex-col bg-background">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <PlatformIconBadge platform={previewTarget.platform} />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground leading-none">
                      {previewTarget.clientName || "Digital Post"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {previewTarget.scheduledAt
                        ? format(new Date(previewTarget.scheduledAt), "EEEE, MMM d, yyyy 'at' h:mm a")
                        : "Unscheduled Draft"}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {POST_CONTENT_FORMAT_LABELS[(previewTarget.contentFormat ?? "graphic") as PostContentFormat]}
                </Badge>
              </div>

              {/* Social Media Post Feed Card */}
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {previewTarget.clientName?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {previewTarget.clientName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {postPlatforms(previewTarget)
                            .map((plat) => PLATFORM_LABELS[plat])
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal capitalize">
                        {POST_SCHEDULE_STATUS_LABELS[previewTarget.scheduleStatus]}
                      </Badge>
                      <ApprovalStatusBadge stage={previewTarget.approvalStage} />
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {previewTarget.caption?.trim() || (
                      <span className="italic text-muted-foreground">No caption content written yet.</span>
                    )}
                  </div>

                  {/* Hashtags */}
                  {previewTarget.hashtags && previewTarget.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {previewTarget.hashtags.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-0.5 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        >
                          <Hash className="h-2.5 w-2.5" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground">Content Format</span>
                    <span className="font-medium text-foreground">
                      {POST_CONTENT_FORMAT_LABELS[(previewTarget.contentFormat ?? "graphic") as PostContentFormat]}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground">Scheduled Time</span>
                    <span className="font-medium text-foreground">
                      {previewTarget.scheduledAt
                        ? format(new Date(previewTarget.scheduledAt), "h:mm a (MMM d)")
                        : "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground">Assignee</span>
                    <span className="font-medium text-foreground inline-flex items-center gap-1">
                      <UserRound className="h-3 w-3 text-muted-foreground" />
                      {previewTarget.assignee || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-muted-foreground">Approval Stage</span>
                    <span className="font-medium text-foreground capitalize">
                      {previewTarget.approvalStage ? previewTarget.approvalStage.replace("_", " ") : "Internal review"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
                <div className="flex items-center gap-2">
                  {canEdit && canFullyEditMarketingItem(user, previewTarget.createdBy) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        const target = previewTarget;
                        setPreviewTarget(null);
                        openEdit(target);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Content
                    </Button>
                  ) : null}
                  {canDeleteOwn && canDeleteMarketingItem(user, previewTarget.createdBy) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        const target = previewTarget;
                        setPreviewTarget(null);
                        setDeleteTarget(target);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPreviewTarget(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
