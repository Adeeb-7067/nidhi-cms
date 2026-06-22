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
  addDays,
  subDays,
  isToday,
  isYesterday,
} from "date-fns";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { MONITORABLE_STAFF_ROLES } from "@/lib/user-roles";
import { formatCaptureTimestamp } from "@/lib/screenshot-gallery-utils";
import { useDailySessionTotals, useAdminActiveAll, type WorkSession } from "@/api/work-sessions";
import { formatActiveDuration, getLiveDailyActiveMs } from "@/lib/work-session-utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function hourLabel(h: number) {
  const start = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  const end = h + 1 === 12 ? "12 PM" : h + 1 < 12 ? `${h + 1} AM` : h + 1 === 24 ? "12 AM" : `${h + 1 - 12} PM`;
  return `${start} – ${end}`;
}

/** Local calendar day bounds for API filters. */
function localDayRange(date: Date): { startDate: string; endDate: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
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
  status?: string;
}

interface SlideViewState {
  slides: ScreenshotItem[];
  index: number;
  employee: UserInfo | undefined;
  hourLabel: string;
  sessionTotalMs?: number;
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
      title={`${label} · ${items.length} capture${items.length !== 1 ? "s" : ""} · click to view`}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150 text-left w-[160px] shrink-0"
    >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-1.5 right-1.5">
          <span className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            {items.length}
          </span>
        </div>
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
  serialNumber,
  employee,
  hourBuckets,
  sessionTotalMs,
  sessionInProgress,
  activeSession,
  onOpenSlide,
}: {
  serialNumber: number;
  employee: UserInfo;
  hourBuckets: Map<number, ScreenshotItem[]>;
  sessionTotalMs?: number;
  sessionInProgress?: boolean;
  activeSession?: WorkSession;
  onOpenSlide: (hour: number) => void;
}) {
  const baseDailyMs = sessionTotalMs ?? 0;
  const [liveDailyMs, setLiveDailyMs] = useState(() =>
    getLiveDailyActiveMs(baseDailyMs, activeSession),
  );

  useEffect(() => {
    const tick = () => setLiveDailyMs(getLiveDailyActiveMs(baseDailyMs, activeSession));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [baseDailyMs, activeSession?.id, activeSession?.durationMs, activeSession?.lastHeartbeatAt, activeSession?.isActive]);

  const totalCaptures = Array.from(hourBuckets.values()).reduce((s, a) => s + a.length, 0);
  const hours = Array.from(hourBuckets.keys()).sort((a, b) => a - b);
  const isInactive = employee.status === "inactive";

  return (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums text-muted-foreground"
          title={`Rank #${serialNumber} by session time`}
        >
          {serialNumber}
        </span>
        <Avatar className="h-8 w-8 text-xs shrink-0">
          {employee.avatarUrl && <AvatarImage src={employee.avatarUrl} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">{employee.name}</p>
          <p className="text-[11px] text-muted-foreground capitalize flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{employee.role.replace("_", " ")}</span>
            {isInactive && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-amber-600 normal-case font-medium">Inactive</span>
              </>
            )}
            {(liveDailyMs > 0 || sessionInProgress) && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums normal-case font-medium text-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatActiveDuration(liveDailyMs)}
                  <span className="text-muted-foreground font-normal">active today</span>
                  {sessionInProgress && (
                    <span className="text-emerald-600 font-medium">live</span>
                  )}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {(liveDailyMs > 0 || sessionInProgress) && (
            <Badge
              variant="outline"
              className="text-[10px] tabular-nums border-emerald-200 text-emerald-700 dark:text-emerald-400"
            >
              {formatActiveDuration(liveDailyMs)} active
            </Badge>
          )}
          <Badge variant={totalCaptures > 0 ? "secondary" : "outline"} className="text-xs">
            {totalCaptures} capture{totalCaptures !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="px-4 py-3 overflow-x-auto">
        {hours.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
            <ImageOff className="h-4 w-4 shrink-0 opacity-50" />
            No captures on this day
          </div>
        ) : (
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
        )}
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
  const captureTimestamp = current ? formatCaptureTimestamp(current.takenAt) : "";

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
                    {state.sessionTotalMs != null && state.sessionTotalMs > 0 && (
                      <>
                        <span className="text-zinc-500">·</span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {formatActiveDuration(state.sessionTotalMs)}
                        </span>
                      </>
                    )}
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

            <div className="relative flex-1 flex items-center justify-center min-h-0 bg-zinc-950 px-14 py-4">
              <div className="relative inline-flex max-w-full max-h-full">
                <img
                  key={current.id}
                  src={current.fileUrl}
                  alt="screenshot"
                  className="max-w-full max-h-[calc(94vh-180px)] rounded-lg shadow-2xl object-contain"
                />

                <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-black/65 backdrop-blur-md px-2.5 py-1.5 text-sm font-semibold text-white tabular-nums shadow-lg">
                    <Clock className="h-3.5 w-3.5 text-white/80 shrink-0" />
                    {captureTimestamp}
                  </span>
                  {current.fileSize ? (
                    <span className="rounded-md bg-black/65 backdrop-blur-md px-2 py-1 text-[10px] text-white/80 tabular-nums shadow-lg">
                      {(current.fileSize / 1024).toFixed(0)} KB
                    </span>
                  ) : null}
                </div>
              </div>

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

            {slides.length > 1 && (
              <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onNavigate(i)}
                      title={formatCaptureTimestamp(s.takenAt)}
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
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-3 pb-0.5 px-1 pointer-events-none">
                        <span className="block text-center text-[8px] font-medium text-white tabular-nums truncate">
                          {format(new Date(s.takenAt), "MMM d · h:mm a")}
                        </span>
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

  const { data: usersData, isLoading: usersLoading } = useListUsers({ staff: "1", limit: 200 });
  const allUsers: UserInfo[] = usersData?.users ?? [];
  const employees = allUsers.filter((u) => MONITORABLE_STAFF_ROLES.includes(u.role as typeof MONITORABLE_STAFF_ROLES[number]));
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  const dayRange = useMemo(() => localDayRange(selectedDate), [selectedDate]);
  const dayKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const { data: dailyTotals } = useDailySessionTotals(
    {
      fromDate: dayKey,
      toDate: dayKey,
      limit: 200,
    },
    { refetchInterval: isToday(selectedDate) ? 30_000 : false },
  );

  const { data: activeAll } = useAdminActiveAll();

  const activeSessionByUser = useMemo(() => {
    const map = new Map<number, WorkSession>();
    for (const s of activeAll?.data ?? []) {
      map.set(s.userId, s);
    }
    return map;
  }, [activeAll]);

  const sessionByUserId = useMemo(() => {
    const map = new Map<number, { totalMs: number; hasActiveSession: boolean }>();
    for (const row of dailyTotals?.data ?? []) {
      map.set(row.userId, { totalMs: row.totalMs, hasActiveSession: row.hasActiveSession });
    }
    return map;
  }, [dailyTotals]);

  /** All visible staff, ranked by daily active session time (longest first). */
  const visibleEmployees = useMemo(() => {
    const list = selectedUserId
      ? employees.filter((u) => u.id === selectedUserId)
      : employees;
    return [...list].sort((a, b) => {
      const sa = getLiveDailyActiveMs(
        sessionByUserId.get(a.id)?.totalMs ?? 0,
        activeSessionByUser.get(a.id),
      );
      const sb = getLiveDailyActiveMs(
        sessionByUserId.get(b.id)?.totalMs ?? 0,
        activeSessionByUser.get(b.id),
      );
      if (sb !== sa) return sb - sa;
      const liveA = sessionByUserId.get(a.id)?.hasActiveSession ? 1 : 0;
      const liveB = sessionByUserId.get(b.id)?.hasActiveSession ? 1 : 0;
      if (liveB !== liveA) return liveB - liveA;
      return a.name.localeCompare(b.name);
    });
  }, [employees, selectedUserId, sessionByUserId, activeSessionByUser]);

  const { data, isLoading, dataUpdatedAt, isFetching } = useListScreenshots(
    {
      userId: selectedUserId,
      startDate: dayRange.startDate,
      endDate: dayRange.endDate,
    },
    true,
    30_000,
    true,
  );

  const { mutateAsync: deleteOne } = useDeleteScreenshot();

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
    for (const [, byHour] of byEmployee.entries()) {
      for (const [h, list] of byHour.entries()) {
        byHour.set(
          h,
          [...list].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()),
        );
      }
    }
    return byEmployee;
  }, [data]);

  const handleDelete = async (id: number) => {
    try {
      await deleteOne(id);
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
      sessionTotalMs: sessionByUserId.get(userId)?.totalMs,
    });
  };

  const totalToday = data?.total ?? 0;
  const pageLoading = usersLoading || isLoading;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Monitor className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Screenshots</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {pageLoading
                  ? "Loading…"
                  : `${visibleEmployees.length} employee${visibleEmployees.length !== 1 ? "s" : ""} · ${totalToday} capture${totalToday !== 1 ? "s" : ""} on ${dateNavLabel(selectedDate).toLowerCase()} · sorted by active time`}
                {!pageLoading && dataUpdatedAt > 0 && (
                  <span className="text-muted-foreground/70">
                    {" · "}
                    {isFetching ? "Refreshing…" : `Updated ${format(dataUpdatedAt, "h:mm:ss a")}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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

      <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
        {pageLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
        ) : !visibleEmployees.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/60">
              {selectedUserId
                ? "Employee not found"
                : "No monitorable staff in the system"}
            </p>
          </div>
        ) : (
          visibleEmployees.map((emp, index) => {
            const byHour = grouped.get(emp.id) ?? new Map<number, ScreenshotItem[]>();
            const session = sessionByUserId.get(emp.id);
            return (
              <EmployeeRow
                key={emp.id}
                serialNumber={index + 1}
                employee={emp}
                hourBuckets={byHour}
                sessionTotalMs={session?.totalMs}
                sessionInProgress={session?.hasActiveSession}
                activeSession={activeSessionByUser.get(emp.id)}
                onOpenSlide={(h) => openSlide(emp.id, h)}
              />
            );
          })
        )}
      </div>

      <SlideViewer
        state={slideView}
        onClose={() => setSlideView(null)}
        onDelete={handleDelete}
        onNavigate={(i) => setSlideView((prev) => prev ? { ...prev, index: i } : null)}
      />
    </div>
  );
}
