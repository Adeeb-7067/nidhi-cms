export const NOTIFICATION_LIST_PROJECTION = {
  id: 1,
  userId: 1,
  type: 1,
  title: 1,
  body: 1,
  entityType: 1,
  entityId: 1,
  isRead: 1,
  readAt: 1,
  createdAt: 1,
} as const;

export function unreadNotificationFilter(userId: number) {
  return {
    userId,
    $or: [{ isRead: false }, { isRead: { $exists: false } }],
  };
}

export function formatNotificationRow(n: {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: number | null;
  isRead?: boolean;
  readAt?: Date | null;
  createdAt?: Date | null;
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType ?? null,
    entityId: n.entityId ?? null,
    isRead: Boolean(n.isRead),
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: (n.createdAt ?? new Date()).toISOString(),
  };
}
