import { useEffect, useRef, useState } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkSession } from "@/contexts/WorkSessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Update elapsed timer every second while clocked in.
  // Must be declared before any conditional return (Rules of Hooks).
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const start = new Date(activeSession.startedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession]);

  const isDevRole = user?.role === "developer" || user?.role === "tester" || user?.role === "qa";
  if (!isDevRole) return null;
  if (isLoading) return null;

  const handleClick = async () => {
    setIsPending(true);
    try {
      if (isClockedIn) await clockOut();
      else await clockIn();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={isClockedIn ? "destructive" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "h-8 gap-1.5 px-3 text-xs font-semibold transition-all",
        isClockedIn && "bg-destructive/90 hover:bg-destructive",
      )}
      title={isClockedIn ? "Clock out" : "Clock in to start your session"}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isClockedIn ? (
        <Square className="h-3 w-3 fill-current" />
      ) : (
        <Play className="h-3 w-3 fill-current" />
      )}
      <span className="hidden sm:inline">
        {isClockedIn ? (elapsed > 0 ? formatDuration(elapsed) : "Clock Out") : "Clock In"}
      </span>
    </Button>
  );
}
