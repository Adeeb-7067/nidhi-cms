import { useState, useMemo, useEffect, useCallback } from "react";
import { useListUsers } from "@/api";
import {
  useListScreenshots,
  useDeleteScreenshot,
  type ScreenshotItem,
} from "@/api/monitoring";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Users,
  Trash2,
  Clock,
  Monitor,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  isToday,
  isYesterday,
} from "date-fns";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function hourLabel(h: number) {
  const start = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  const end = h + 1 === 12 ? "12 PM" : h + 1 < 12 ? `${h + 1} AM` : h + 1 === 24 ? "12 AM" : `${h + 1 - 12} PM`;
  return `${start} – ${end}`;
}

function dateNavLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

interface UserInfo {
  id: number;
  name: string;
  avatarUrl?: string | null;
  role: string;
}

interface SlideViewState {
  slides: ScreenshotItem[];
  index: number;
  employee: UserInfo | undefined;
  hourLabel: string;
}

// ─── HourBlock ───────────────────────────────────────────────────────────────

function HourBlock({
  hour,
  items,
  onOpen,
}: {
  hour: number;
  items: ScreenshotItem[];
  onOpen: () => void;
}) {
  const thumb = items[0];
  const label = hourLabel(hour);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150 text-left w-[160px] shrink-0"
    >
      {/* Thumbnail */}
      <div className="relative h-[90px] bg-muted overflow-hidden">
        {thumb ? (
          <img
            src={thumb.fileUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        {/* dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* count badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            {items.length}
          </span>
        </div>
        {/* stack effect if multiple */}
        {items.length > 1 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-0.5">
            {Array.from({ length: Math.min(items.length, 4) }).map((_, i) => (
              <div
                key={i}
                className="h-1 w-3 rounded-full bg-white/60"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {items.length} capture{items.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

function EmployeeRow({
  employee,
  hourBuckets,
  onOpenSlide,
}: {
  employee: UserInfo;
  hourBuckets: Map<number, ScreenshotItem[]>;
  onOpenSlide: (hour: number) => void;
}) {
  const totalCaptures = Array.from(hourBuckets.values()).reduce((s, a) => s + a.length, 0);
  const hours = Array.from(hourBuckets.keys()).sort((a, b) => a - b);

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      {/* Employee header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
        <Avatar className="h-8 w-8 text-xs shrink-0">
          {employee.avatarUrl && <AvatarImage src={employee.avatarUrl} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">{employee.name}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{employee.role.replace("_", " ")}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {totalCaptures} capture{totalCaptures !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Hour blocks horizontal scroll */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-3 pb-1">
          {hours.map((h) => (
            <HourBlock
              key={h}
              hour={h}
              items={hourBuckets.get(h)!}
              onOpen={() => onOpenSlide(h)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SlideViewer ──────────────────────────────────────────────────────────────

function SlideViewer({
  state,
  onClose,
  onDelete,
  onNavigate,
}: {
  state: SlideViewState | null;
  onClose: () => void;
  onDelete: (id: number) => Promise<void>;
  onNavigate: (index: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const slides = state?.slides ?? [];
  const idx = state?.index ?? 0;
  const current = slides[idx];

  const prev = useCallback(() => {
    if (idx > 0) onNavigate(idx - 1);
  }, [idx, onNavigate]);

  const next = useCallback(() => {
    if (idx < slides.length - 1) onNavigate(idx + 1);
  }, [idx, slides.length, onNavigate]);

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, prev, next, onClose]);

  const handleDelete = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await onDelete(current.id);
      // Stay open if more slides remain
      if (slides.length <= 1) {
        onClose();
      } else {
        onNavigate(Math.min(idx, slides.length - 2));
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[92vw] w-full max-h-[94vh] p-0 gap-0 overflow-hidden rounded-2xl bg-zinc-950 border-zinc-800 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Screenshot Viewer</DialogTitle>
        {state && current && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                {state.employee && (
                  <>
                    <Avatar className="h-7 w-7 text-[10px] shrink-0">
                      {state.employee.avatarUrl && <AvatarImage src={state.employee.avatarUrl} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                        {getInitials(state.employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-white truncate">
                      {state.employee.name}
                    </span>
                    <span className="text-zinc-500">·</span>
                  </>
                )}
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{state.hourLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500 font-medium tabular-nums">
                  {idx + 1} / {slides.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete this screenshot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main image */}
            <div className="relative flex-1 flex items-center justify-center min-h-0 bg-zinc-950 px-14 py-4">
              <img
                key={current.id}
                src={current.fileUrl}
                alt="screenshot"
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              />

              {/* Prev arrow */}
              <button
                type="button"
                onClick={prev}
                disabled={idx === 0}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 backdrop-blur text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all",
                  idx === 0 && "opacity-20 cursor-not-allowed",
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Next arrow */}
              <button
                type="button"
                onClick={next}
                disabled={idx === slides.length - 1}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 backdrop-blur text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all",
                  idx === slides.length - 1 && "opacity-20 cursor-not-allowed",
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Timestamp + size bar */}
            <div className="flex items-center justify-center gap-3 py-1.5 text-xs text-zinc-500">
              <span>{format(new Date(current.takenAt), "h:mm:ss a")}</span>
              {current.fileSize && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span>{(current.fileSize / 1024).toFixed(0)} KB</span>
                </>
              )}
            </div>

            {/* Thumbnail filmstrip */}
            {slides.length > 1 && (
              <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onNavigate(i)}
                      className={cn(
                        "relative shrink-0 h-12 w-20 rounded-md overflow-hidden border-2 transition-all",
                        i === idx
                          ? "border-primary shadow-md shadow-primary/30"
                          : "border-transparent opacity-50 hover:opacity-80",
                      )}
                    >
                      <img
                        src={s.fileUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] px-1 rounded">
                        {format(new Date(s.takenAt), "h:mm")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScreenshotsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [slideView, setSlideView] = useState<SlideViewState | null>(null);

  const { data: usersData } = useListUsers({ limit: 200 });
  const allUsers: UserInfo[] = usersData?.users ?? [];
  const employees = allUsers.filter((u) =>
    ["developer", "tester", "qa", "super_admin", "admin"].includes(u.role),
  );
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  const startDate = startOfDay(selectedDate).toISOString();
  const endDate = endOfDay(selectedDate).toISOString();

  const { data, isLoading } = useListScreenshots({
    userId: selectedUserId,
    startDate,
    endDate,
    limit: 500,
    page: 1,
  });

  const { mutateAsync: deleteOne } = useDeleteScreenshot();

  // Group: employeeId → hour → screenshots[]
  const grouped = useMemo(() => {
    const screenshots = data?.data ?? [];
    const byEmployee = new Map<number, Map<number, ScreenshotItem[]>>();

    for (const item of screenshots) {
      const h = new Date(item.takenAt).getHours();
      if (!byEmployee.has(item.userId)) byEmployee.set(item.userId, new Map());
      const byHour = byEmployee.get(item.userId)!;
      if (!byHour.has(h)) byHour.set(h, []);
      byHour.get(h)!.push(item);
    }
    return byEmployee;
  }, [data]);

  const handleDelete = async (id: number) => {
    try {
      await deleteOne(id);
      // Optimistically remove from the slide viewer immediately.
      // The useDeleteScreenshot mutation's onSuccess already invalidates
      // ["screenshots"] so the gallery re-fetches in the background.
      setSlideView((prev) => {
        if (!prev) return null;
        const remaining = prev.slides.filter((s) => s.id !== id);
        if (!remaining.length) return null;
        return { ...prev, slides: remaining, index: Math.min(prev.index, remaining.length - 1) };
      });
      toast.success("Screenshot deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete screenshot."));
    }
  };

  const openSlide = (userId: number, hour: number) => {
    const byHour = grouped.get(userId);
    if (!byHour) return;
    const items = byHour.get(hour) ?? [];
    if (!items.length) return;
    setSlideView({
      slides: items,
      index: 0,
      employee: userMap[userId],
      hourLabel: hourLabel(hour),
    });
  };

  const employeeIds = Array.from(grouped.keys()).sort((a, b) => {
    const na = userMap[a]?.name ?? "";
    const nb = userMap[b]?.name ?? "";
    return na.localeCompare(nb);
  });

  const totalToday = data?.total ?? 0;
  const isFuture = selectedDate > new Date();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Monitor className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Screenshots</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {isLoading
                  ? "Loading…"
                  : totalToday
                    ? `${totalToday} capture${totalToday !== 1 ? "s" : ""} on ${dateNavLabel(selectedDate).toLowerCase()}`
                    : `No captures on ${dateNavLabel(selectedDate).toLowerCase()}`}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Date navigator */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => subDays(d, 1))}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r border-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-medium min-w-[110px] text-center">
                {dateNavLabel(selectedDate)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                disabled={isToday(selectedDate)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l border-border",
                  isToday(selectedDate) && "opacity-30 cursor-not-allowed",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Today shortcut */}
            {!isToday(selectedDate) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            )}

            {/* Employee filter */}
            <Select
              value={selectedUserId ? String(selectedUserId) : "all"}
              onValueChange={(v) => {
                setSelectedUserId(v === "all" ? undefined : Number(v));
              }}
            >
              <SelectTrigger className="w-44 h-8 text-sm">
                {selectedUserId && userMap[selectedUserId] ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-4 w-4 shrink-0">
                      {userMap[selectedUserId].avatarUrl && (
                        <AvatarImage src={userMap[selectedUserId].avatarUrl!} />
                      )}
                      <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                        {getInitials(userMap[selectedUserId].name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{userMap[selectedUserId].name}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs">All employees</span>
                  </div>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    All employees
                  </div>
                </SelectItem>
                {employees.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      {u.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
        {isLoading ? (
          // Skeleton
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="px-4 py-3 flex gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="w-[160px] shrink-0 space-y-1">
                      <Skeleton className="h-[90px] w-full rounded-lg" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !employeeIds.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
              <ImageOff className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/60">
              {isFuture
                ? "No captures for a future date"
                : selectedUserId
                  ? "No screenshots for this employee on this day"
                  : "No screenshots captured on this day"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
              {!isFuture && "Screenshots appear here once employees clock in with the desktop app"}
            </p>
          </div>
        ) : (
          employeeIds.map((uid) => {
            const emp = userMap[uid] ?? { id: uid, name: `User #${uid}`, role: "unknown" };
            const byHour = grouped.get(uid)!;
            return (
              <EmployeeRow
                key={uid}
                employee={emp}
                hourBuckets={byHour}
                onOpenSlide={(h) => openSlide(uid, h)}
              />
            );
          })
        )}
      </div>

      {/* ── Slide Viewer ── */}
      <SlideViewer
        state={slideView}
        onClose={() => setSlideView(null)}
        onDelete={handleDelete}
        onNavigate={(i) => setSlideView((prev) => prev ? { ...prev, index: i } : null)}
      />
    </div>
  );
}
