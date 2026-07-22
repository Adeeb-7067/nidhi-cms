import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import type { Notification } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkNotificationRead, getListNotificationsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { getNotificationTarget } from "@/lib/notification-navigation";
import { stopPersistentAlert } from "@/lib/notification-alert";

export function useNotificationClick(options?: {
  onAfterNavigate?: () => void;
  unreadCount?: number;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const markOneRead = useMarkNotificationRead();
  const busyRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const onAfterNavigateRef = useRef(options?.onAfterNavigate);
  const unreadCountRef = useRef(options?.unreadCount);

  onAfterNavigateRef.current = options?.onAfterNavigate;
  unreadCountRef.current = options?.unreadCount;

  const getTarget = useCallback(
    (notification: Notification) => getNotificationTarget(notification, user?.role),
    [user?.role],
  );

  const bumpUnreadCaches = useCallback(() => {
    // Optimistically drop badge + dropdown unread lists so UI reacts immediately.
    queryClient.setQueryData(
      getListNotificationsQueryKey({ unreadOnly: true, limit: 1 }),
      (prev: { unreadCount?: number; notifications?: Notification[]; total?: number } | undefined) => {
        if (!prev) return prev;
        const next = Math.max(0, (prev.unreadCount ?? 1) - 1);
        return { ...prev, unreadCount: next, total: next };
      },
    );
    queryClient.setQueryData(
      getListNotificationsQueryKey({ unreadOnly: true, limit: 10 }),
      (prev: { unreadCount?: number; notifications?: Notification[]; total?: number } | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: Math.max(0, (prev.unreadCount ?? 1) - 1),
          total: Math.max(0, (prev.total ?? 1) - 1),
        };
      },
    );
  }, [queryClient]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (busyRef.current) return;

      const target = getNotificationTarget(notification, user?.role);

      const finish = () => {
        busyRef.current = false;
        setIsNavigating(false);
      };

      const runAfter = () => {
        try {
          if (target) setLocation(target.href);
          onAfterNavigateRef.current?.();
        } finally {
          finish();
        }
      };

      busyRef.current = true;
      setIsNavigating(true);

      // Always mark unread items read on click — even when there is no deep link
      // (e.g. informational work-session alerts). Previously those stayed stuck unread.
      if (!notification.readAt && Number.isFinite(notification.id) && notification.id > 0) {
        bumpUnreadCaches();
        markOneRead.mutate(
          { id: notification.id },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
              if ((unreadCountRef.current ?? 1) <= 1) {
                stopPersistentAlert();
              }
            },
            onError: () => {
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            },
            onSettled: () => {
              runAfter();
            },
          },
        );
      } else {
        runAfter();
      }
    },
    [user?.role, setLocation, markOneRead, queryClient, bumpUnreadCaches],
  );

  return { handleNotificationClick, isNavigating, getTarget };
}
