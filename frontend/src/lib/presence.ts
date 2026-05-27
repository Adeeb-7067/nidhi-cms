import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export type PresenceStatus = "online" | "away" | "offline";

export type UserPresence = {
  userId: number;
  status: PresenceStatus;
  isActiveNow: boolean;
  lastSeenAt?: string | null;
  lastActivityAt?: string | null;
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};

export function parsePresenceStatus(value?: string | null): PresenceStatus {
  if (value === "online" || value === "away" || value === "offline") return value;
  return "offline";
}

export function formatLastLogin(iso?: string | null): string {
  if (!iso) return "Never logged in";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy • h:mm a");
}

export function formatLastSeen(iso?: string | null, status?: PresenceStatus): string {
  if (status === "online") return "Active now";
  if (!iso) return "Last seen unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Last seen unknown";

  if (isToday(d)) {
    return `Last seen ${formatDistanceToNow(d, { addSuffix: true })}`;
  }
  if (isYesterday(d)) {
    return "Last active yesterday";
  }
  return `Last seen at ${format(d, "h:mm a")}`;
}

export function mergeUserPresence<T extends { id: number }>(
  user: T,
  presence?: UserPresence | null,
): T & {
  presenceStatus: PresenceStatus;
  isActiveNow: boolean;
  lastSeenAt?: string | null;
  lastActivityAt?: string | null;
} {
  const status = parsePresenceStatus(
    presence?.status ?? (user as { presenceStatus?: string }).presenceStatus,
  );
  return {
    ...user,
    presenceStatus: status,
    isActiveNow: presence?.isActiveNow ?? (user as { isActiveNow?: boolean }).isActiveNow ?? status === "online",
    lastSeenAt: presence?.lastSeenAt ?? (user as { lastSeenAt?: string | null }).lastSeenAt ?? null,
    lastActivityAt:
      presence?.lastActivityAt ?? (user as { lastActivityAt?: string | null }).lastActivityAt ?? null,
  };
}
