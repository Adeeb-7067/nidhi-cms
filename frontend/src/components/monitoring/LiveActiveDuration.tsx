import { useEffect, useState } from "react";
import type { WorkSession } from "@/api/work-sessions";
import { formatActiveDuration, getLiveActiveDurationMs } from "@/lib/work-session-utils";

/** Ticking active work time — matches employee clock (pauses excluded). */
export function LiveActiveDuration({
  session,
  className,
}: {
  session: WorkSession;
  className?: string;
}) {
  const [ms, setMs] = useState(() => getLiveActiveDurationMs(session));

  useEffect(() => {
    const tick = () => setMs(getLiveActiveDurationMs(session));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    session.id,
    session.durationMs,
    session.lastHeartbeatAt,
    session.startedAt,
    session.isActive,
    session.pausePeriods,
  ]);

  return <span className={className}>{formatActiveDuration(ms)}</span>;
}
