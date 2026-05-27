import { useEffect, useMemo } from "react";
import { usePresence } from "@/contexts/PresenceContext";

/** Fetch live presence for a set of user ids (stable, debounced by id list). */
export function useRefreshPresenceForUserIds(userIds: number[] | undefined) {
  const { refreshPresence } = usePresence();

  const idsKey = useMemo(() => {
    if (!userIds?.length) return "";
    return [...new Set(userIds)].sort((a, b) => a - b).join(",");
  }, [userIds]);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",").map((s) => Number.parseInt(s, 10));
    void refreshPresence(ids);
  }, [idsKey, refreshPresence]);
}
