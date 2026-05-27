/** Shared React Query tuning for snappy UI with fewer redundant requests. */
export const QUERY_STALE = {
  /** Lists, badges, dashboards */
  list: 60_000,
  /** Reference data (users, projects pickers) */
  reference: 120_000,
  /** Charts / team & company analytics */
  analytics: 120_000,
  /** Current user / session */
  profile: 180_000,
  /** Unread badge — socket invalidates; polling is backup only */
  notificationsBadge: 60_000,
} as const;

export const QUERY_GC = 10 * 60_000;

/** Sensible caps for client-side list fetches */
export const LIST_LIMIT = {
  default: 50,
  picker: 100,
  admin: 150,
} as const;

/** Poll interval when realtime socket is disconnected (ms). */
export const NOTIFICATION_POLL_DISCONNECTED_MS = 25_000;
