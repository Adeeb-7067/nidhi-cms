import { PresenceBadge } from "./PresenceBadge";
import { formatLastLogin, formatLastSeen, type PresenceStatus } from "@/lib/presence";
import { Clock } from "lucide-react";

type PresenceTableCellProps = {
  presenceStatus: PresenceStatus;
  lastSeenAt?: string | null;
  lastLoginAt?: string | null;
  /** "presence" | "lastSeen" | "lastLogin" | "combined" */
  variant?: "presence" | "lastSeen" | "lastLogin" | "combined";
};

export function PresenceTableCell({
  presenceStatus,
  lastSeenAt,
  lastLoginAt,
  variant = "combined",
}: PresenceTableCellProps) {
  if (variant === "presence") {
    return <PresenceBadge status={presenceStatus} />;
  }

  if (variant === "lastSeen") {
    return (
      <p className="text-xs text-muted-foreground leading-snug">
        {formatLastSeen(lastSeenAt, presenceStatus)}
      </p>
    );
  }

  if (variant === "lastLogin") {
    return (
      <p className="text-xs text-foreground/90 tabular-nums leading-snug flex items-start gap-1.5">
        <Clock className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
        <span>{formatLastLogin(lastLoginAt)}</span>
      </p>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[120px]">
      <PresenceBadge status={presenceStatus} />
      <p className="text-[10px] text-muted-foreground leading-snug">
        {formatLastSeen(lastSeenAt, presenceStatus)}
      </p>
      <p className="text-[10px] text-muted-foreground/90 leading-snug flex items-center gap-1 tabular-nums">
        <Clock className="h-2.5 w-2.5 shrink-0" />
        {formatLastLogin(lastLoginAt)}
      </p>
    </div>
  );
}
