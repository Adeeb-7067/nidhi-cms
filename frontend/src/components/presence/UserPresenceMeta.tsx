import { cn } from "@/lib/utils";
import {
  formatLastLogin,
  formatLastSeen,
  PRESENCE_LABELS,
  type PresenceStatus,
} from "@/lib/presence";
import { PresenceBadge } from "./PresenceBadge";

type UserPresenceMetaProps = {
  presenceStatus: PresenceStatus;
  lastSeenAt?: string | null;
  lastLoginAt?: string | null;
  compact?: boolean;
  className?: string;
};

/** Last seen, last login, and presence status for profile / employee sheets. */
export function UserPresenceMeta({
  presenceStatus,
  lastSeenAt,
  lastLoginAt,
  compact = false,
  className,
}: UserPresenceMetaProps) {
  const lastSeenText = formatLastSeen(lastSeenAt, presenceStatus);

  if (compact) {
    return (
      <div className={cn("space-y-1 text-xs text-muted-foreground", className)}>
        <PresenceBadge status={presenceStatus} />
        <p>{lastSeenText}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Presence
        </span>
        <PresenceBadge status={presenceStatus} />
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-2 text-xs">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Activity</p>
          <p className="font-medium text-foreground">{lastSeenText}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{PRESENCE_LABELS[presenceStatus]}</p>
        </div>
        <div className="border-t border-border/50 pt-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">Last login</p>
          <p className="font-medium text-foreground tabular-nums">{formatLastLogin(lastLoginAt)}</p>
        </div>
      </div>
    </div>
  );
}
