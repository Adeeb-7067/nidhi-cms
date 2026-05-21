/** Shared React Query tuning for snappy UI with fewer redundant requests. */
export const QUERY_STALE = {
  /** Lists, badges, dashboards */
  list: 45_000,
  /** Current user / session */
  profile: 120_000,
  /** Unread badge — socket invalidates; polling is backup only */
  notificationsBadge: 60_000,
} as const;

export const QUERY_GC = 5 * 60_000;

/** Poll interval when realtime socket is disconnected (ms). */
export const NOTIFICATION_POLL_DISCONNECTED_MS = 25_000;
