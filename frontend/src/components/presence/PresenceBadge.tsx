import { cn } from "@/lib/utils";
import { PRESENCE_LABELS, type PresenceStatus } from "@/lib/presence";
import { PresenceIndicator } from "./PresenceIndicator";

type PresenceBadgeProps = {
  status: PresenceStatus;
  showLabel?: boolean;
  pulse?: boolean;
  className?: string;
};

/** Online / Away / Offline with optional live dot. */
export function PresenceBadge({
  status,
  showLabel = true,
  pulse = true,
  className,
}: PresenceBadgeProps) {
  const label = PRESENCE_LABELS[status];
  const tone =
    status === "online"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "away"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone,
        className,
      )}
      title={label}
    >
      <PresenceIndicator status={status} pulse={pulse && status === "online"} size="sm" />
      {showLabel ? <span>{label}</span> : null}
    </span>
  );
}
