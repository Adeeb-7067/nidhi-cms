import { useState, useMemo } from "react";
import { useListScreenshots } from "@/api/monitoring";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkSession } from "@/contexts/WorkSessionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenshotHourBlock } from "@/components/monitoring/ScreenshotHourBlock";
import {
  ScreenshotSlideViewer,
  type ScreenshotSlideViewState,
} from "@/components/monitoring/ScreenshotSlideViewer";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  ImageOff,
  AlertCircle,
} from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { isMonitorableStaffRole } from "@/lib/user-roles";
import {
  dateNavLabel,
  groupScreenshotsByHour,
  hourLabel,
  isFutureCalendarDate,
  localDayRange,
} from "@/lib/screenshot-gallery-utils";

export default function MyScreenshotsPage() {
  const { user } = useAuth();
  const { isClockedIn } = useWorkSession();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slideView, setSlideView] = useState<ScreenshotSlideViewState | null>(null);

  const canView = isMonitorableStaffRole(user?.role);
  const dayRange = useMemo(() => localDayRange(selectedDate), [selectedDate]);
  const pollToday = isToday(selectedDate);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt, isFetching } = useListScreenshots(
    {
      startDate: dayRange.startDate,
      endDate: dayRange.endDate,
    },
    canView,
    pollToday ? 30_000 : undefined,
    true,
  );

  const hourBuckets = useMemo(
    () => groupScreenshotsByHour(data?.data ?? []),
    [data],
  );

  const hours = Array.from(hourBuckets.keys()).sort((a, b) => a - b);
  const totalCount = data?.total ?? 0;
  const isFuture = isFutureCalendarDate(selectedDate);

  const openSlide = (hour: number) => {
    const items = hourBuckets.get(hour) ?? [];
    if (!items.length) return;
    setSlideView({ slides: items, index: 0, hourLabel: hourLabel(hour) });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Monitor className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">My Screenshots</h1>
              <p className="text-xs text-muted-foreground leading-tight">
                {isLoading
                  ? "Loading…"
                  : isError
                    ? "Could not load screenshots"
                    : totalCount
                      ? `${totalCount} capture${totalCount !== 1 ? "s" : ""} on ${dateNavLabel(selectedDate).toLowerCase()}`
                      : `No captures on ${dateNavLabel(selectedDate).toLowerCase()}`}
                {!isLoading && !isError && dataUpdatedAt > 0 && pollToday && (
                  <span className="text-muted-foreground/70">
                    {" · "}
                    {isFetching ? "Refreshing…" : `Updated ${format(dataUpdatedAt, "h:mm:ss a")}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isClockedIn && (
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                Clocked in — capturing
              </Badge>
            )}

            <div className="flex items-center rounded-lg border border-border bg-muted/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => subDays(d, 1))}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-r border-border"
                aria-label="Previous day"
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
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!isToday(selectedDate) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setSelectedDate(d);
                }}
              >
                Today
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 max-w-2xl">
          View screenshots captured from your desktop app while clocked in.
          {user?.name ? ` Showing captures for ${user.name}.` : ""}
        </p>

      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
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
        ) : isLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-[160px] shrink-0 space-y-1">
                <Skeleton className="h-[90px] w-full rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : !hours.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
              <ImageOff className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground/60">
              {isFuture
                ? "No captures for a future date"
                : "No screenshots captured on this day"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              {isClockedIn
                ? "Screenshots will appear here as they are captured by the desktop app."
                : "Clock in with the desktop app to start screenshot capture."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
              <Badge variant="secondary" className="shrink-0 text-xs">
                {totalCount} capture{totalCount !== 1 ? "s" : ""}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Hourly timeline for {dateNavLabel(selectedDate).toLowerCase()}
              </p>
            </div>
            <div className="px-4 py-3 overflow-x-auto">
              <div className="flex gap-3 pb-1">
                {hours.map((h) => (
                  <ScreenshotHourBlock
                    key={h}
                    hour={h}
                    items={hourBuckets.get(h)!}
                    onOpen={() => openSlide(h)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ScreenshotSlideViewer
        state={slideView}
        onClose={() => setSlideView(null)}
        onNavigate={(i) => setSlideView((prev) => (prev ? { ...prev, index: i } : null))}
        readOnly
      />
    </div>
  );
}
