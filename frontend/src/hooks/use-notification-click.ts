import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import type { Notification } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkNotificationRead } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { getNotificationTarget } from "@/lib/notification-navigation";
import { stopPersistentAlert } from "@/lib/notification-alert";
import { toast } from "sonner";

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

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (busyRef.current) return;

      const target = getNotificationTarget(notification, user?.role);
      if (!target) {
        toast.info("This notification has no linked page.");
        return;
      }

      const finish = () => {
        busyRef.current = false;
        setIsNavigating(false);
      };

      const runNavigate = () => {
        try {
          setLocation(target.href);
          onAfterNavigateRef.current?.();
        } finally {
          finish();
        }
      };

      busyRef.current = true;
      setIsNavigating(true);

      if (!notification.readAt) {
        markOneRead.mutate(
          { id: notification.id },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
              if ((unreadCountRef.current ?? 1) <= 1) {
                stopPersistentAlert();
              }
            },
            onSettled: () => {
              runNavigate();
            },
          },
        );
      } else {
        runNavigate();
      }
    },
    [user?.role, setLocation, markOneRead, queryClient],
  );

  return { handleNotificationClick, isNavigating, getTarget };
}
