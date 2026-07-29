import { useState, useMemo, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Camera,
  Users,
  Clock,
  Monitor,
  ImageOff,
  Activity,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, subDays, isToday } from "date-fns";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { MONITORABLE_STAFF_ROLES } from "@/lib/user-roles";
import {
  dateNavLabel,
  hourLabel,
  localDayRange,
} from "@/lib/screenshot-gallery-utils";
import { ScreenshotHourBlock } from "@/components/monitoring/ScreenshotHourBlock";
import {
  ScreenshotSlideViewer,
  type ScreenshotSlideViewState,
} from "@/components/monitoring/ScreenshotSlideViewer";
import { useDailySessionTotals, useAdminActiveAll, type WorkSession } from "@/api/work-sessions";
import { formatActiveDuration, getLiveDailyActiveMs } from "@/lib/work-session-utils";
import { PortalPageShell, PortalPageHero, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsFilterBar } from "@/components/cms";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface UserInfo {
  id: number;
  name: string;
  avatarUrl?: string | null;
  role: string;
  status?: string;
}

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
  }, [
    baseDailyMs,
    activeSession?.id,
    activeSession?.durationMs,
    activeSession?.lastHeartbeatAt,
    activeSession?.isActive,
  ]);

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
              <ScreenshotHourBlock
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

export default function ScreenshotsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [slideView, setSlideView] = useState<ScreenshotSlideViewState | null>(null);

  const { data: usersData, isLoading: usersLoading } = useListUsers({ staff: "1", limit: 200 });
  const allUsers: UserInfo[] = usersData?.users ?? [];
  const employees = allUsers.filter((u) =>
    MONITORABLE_STAFF_ROLES.includes(u.role as (typeof MONITORABLE_STAFF_ROLES)[number]),
  );
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

  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } = useListScreenshots(
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
      employeeName: userMap[userId]?.name,
      hourLabel: hourLabel(hour),
    });
  };

  const totalToday = data?.total ?? 0;
  const pageLoading = usersLoading || isLoading;

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Screenshots"
        subtitle={
          pageLoading
            ? "Loading capture gallery…"
            : isError
              ? "Could not load screenshots"
              : `${visibleEmployees.length} employee${visibleEmployees.length !== 1 ? "s" : ""} · ${totalToday} capture${totalToday !== 1 ? "s" : ""} on ${dateNavLabel(selectedDate).toLowerCase()}`
        }
        actions={
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
            {!isToday(selectedDate) ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            ) : null}
          </div>
        }
      />

      <PortalKpiGrid
        loading={pageLoading}
        columns={4}
        count={4}
        items={[
          {
            title: "Employees",
            value: visibleEmployees.length,
            hint: "Shown for this day",
            icon: Users,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Captures",
            value: totalToday,
            hint: dateNavLabel(selectedDate),
            icon: Camera,
            accent: "violet",
            delay: 1,
          },
          {
            title: "Live sessions",
            value: activeAll?.total ?? 0,
            hint: "Clocked in now",
            icon: Activity,
            accent: "green",
            delay: 2,
          },
          {
            title: "Last refresh",
            value:
              dataUpdatedAt > 0
                ? isFetching
                  ? "Refreshing…"
                  : format(dataUpdatedAt, "h:mm a")
                : "—",
            hint: "Gallery sync",
            icon: Monitor,
            accent: "amber",
            delay: 3,
          },
        ]}
      />

      <CmsFilterBar>
        <Select
          value={selectedUserId ? String(selectedUserId) : "all"}
          onValueChange={(v) => {
            setSelectedUserId(v === "all" ? undefined : Number(v));
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-56 bg-background text-sm">
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
      </CmsFilterBar>

      <div className="space-y-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Failed to load screenshots</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              {getApiErrorMessage(error, "Please try again.")}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : pageLoading ? (
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

      <ScreenshotSlideViewer
        state={slideView}
        onClose={() => setSlideView(null)}
        onDelete={handleDelete}
        onNavigate={(i) => setSlideView((prev) => (prev ? { ...prev, index: i } : null))}
      />
    </PortalPageShell>
  );
}
