const NOTIFICATION_LIST_PROJECTION = {
  id: 1,
  userId: 1,
  type: 1,
  title: 1,
  body: 1,
  entityType: 1,
  entityId: 1,
  isRead: 1,
  readAt: 1,
  createdAt: 1
};
function unreadNotificationFilter(userId) {
  return {
    userId,
    $or: [{ isRead: false }, { isRead: { $exists: false } }]
  };
}
function formatNotificationRow(n) {
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
    createdAt: (n.createdAt ?? /* @__PURE__ */ new Date()).toISOString()
  };
}
export {
  NOTIFICATION_LIST_PROJECTION,
  formatNotificationRow,
  unreadNotificationFilter
};
