import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";

const STATUS_DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-400",
  offline: "bg-muted-foreground/50",
};

type PresenceIndicatorProps = {
  status: PresenceStatus;
  /** Pulsing live badge when online */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
};

const SIZE = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
} as const;

/** Live presence dot — green pulse when online. */
export function PresenceIndicator({
  status,
  pulse = true,
  size = "md",
  className,
  title,
}: PresenceIndicatorProps) {
  const showPulse = pulse && status === "online";

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      {showPulse && (
        <span
          className={cn(
            "absolute inline-flex rounded-full bg-emerald-500 opacity-75 animate-ping",
            SIZE[size],
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full ring-2 ring-background",
          SIZE[size],
          STATUS_DOT[status],
        )}
      />
    </span>
  );
}
