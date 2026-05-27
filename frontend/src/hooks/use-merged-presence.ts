import { useMemo } from "react";
import { usePresence } from "@/contexts/PresenceContext";
import { mergeUserPresence, type PresenceStatus } from "@/lib/presence";

export type PresenceUserFields = {
  id: number;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  presenceStatus?: PresenceStatus | string | null;
  isActiveNow?: boolean;
  lastActivityAt?: string | null;
};

export function useMergedPresenceForUser<T extends PresenceUserFields>(user: T | null | undefined) {
  const { getPresence } = usePresence();
  return useMemo(() => {
    if (!user) return null;
    return mergeUserPresence(user, getPresence(user.id));
  }, [user, getPresence]);
}
