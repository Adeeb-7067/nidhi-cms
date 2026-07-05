import { useEffect, useRef, useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { useWorkSession } from "@/contexts/WorkSessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMonitoringStatus, useConsentStatus } from "@/api/monitoring";
import { useDailySessionTotals } from "@/api/work-sessions";
import { isElectron } from "@/lib/electron-bridge";
import { cn } from "@/lib/utils";
import { getLiveActiveDurationMs, getLiveDailyActiveMs } from "@/lib/work-session-utils";
import { isClockableStaffRole, isMonitorableStaffRole } from "@/lib/user-roles";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function ClockInButton() {
  const { user } = useAuth();
  const { activeSession, isLoading, clockIn, clockOut, isClockedIn } = useWorkSession();
  const isClockable = isClockableStaffRole(user?.role);
  const isMonitorable = isMonitorableStaffRole(user?.role);
  const { data: monitoring } = useMonitoringStatus(!!user && isMonitorable);
  const { data: consent } = useConsentStatus(
    !!user && isMonitorable && isElectron() && !!monitoring?.screenshotEnabled,
  );

  const { data: dailyData } = useDailySessionTotals(
    {},
    { refetchInterval: isClockedIn ? 60_000 : false },
  );
  const todayKey = new Date().toLocaleDateString("en-CA");
  const todayTotalMs =
    dailyData?.data.find((row) => row.date === todayKey)?.totalMs ??
    dailyData?.data[0]?.totalMs ??
    0;

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!activeSession?.isActive) {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const tick = () => {
      if (!activeSession) return;
      const sessionMs = getLiveActiveDurationMs(activeSession);
      const dailyMs = getLiveDailyActiveMs(todayTotalMs, activeSession);
      // Show today's total when it includes prior segments; otherwise this session only.
      setElapsed(dailyMs > sessionMs + 60_000 ? dailyMs : sessionMs);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession, todayTotalMs]);

  if (!isClockable) return null;

  const handleClick = async () => {
    setIsPending(true);
    try {
      if (isClockedIn) await clockOut();
      else await clockIn();
    } finally {
      setIsPending(false);
    }
  };

  const monitoringActive =
    isClockedIn &&
    isElectron() &&
    !!monitoring?.screenshotEnabled &&
    !!consent?.hasConsented &&
    !!consent?.isCurrentVersion;

  const title = isClockedIn
    ? monitoringActive
      ? "Clock out — screen monitoring is active"
      : "Clock out — end your work session"
    : isElectron() && monitoring?.screenshotEnabled
      ? "Clock in — monitoring starts after consent (desktop)"
      : "Clock in — start your work session";

  const label = isPending
    ? "…"
    : isClockedIn
      ? elapsed > 0
        ? formatDuration(elapsed)
        : "Clock out"
      : "Clock in";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || isLoading}
      title={title}
      aria-label={isClockedIn ? "Clock out" : "Clock in"}
      className={cn(
        "group relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-60",
        isClockedIn
          ? "border-red-500/35 bg-gradient-to-r from-red-500/15 to-rose-500/10 text-red-700 hover:from-red-500/20 hover:to-rose-500/15 dark:text-red-300"
          : "border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-800 hover:from-emerald-500/22 hover:to-teal-500/15 hover:shadow-md dark:text-emerald-300",
      )}
    >
      {isClockedIn && !isPending && (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              monitoringActive ? "animate-ping bg-red-400" : "bg-red-500/60",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              monitoringActive ? "bg-red-500" : "bg-red-400",
            )}
          />
        </span>
      )}

      {isPending || isLoading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-80" />
      ) : isClockedIn ? (
        <LogOut className="h-3.5 w-3.5 shrink-0 opacity-90" />
      ) : (
        <LogIn className="h-3.5 w-3.5 shrink-0 opacity-90" />
      )}

      <span className="tabular-nums">{label}</span>

      {monitoringActive && (
        <span className="hidden rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700 dark:text-red-200 sm:inline">
          Live
        </span>
      )}
    </button>
  );
}
