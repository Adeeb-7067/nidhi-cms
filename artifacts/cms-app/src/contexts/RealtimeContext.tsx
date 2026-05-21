import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";

import {
  initFirebase,
  requestFirebaseToken,
  subscribeForegroundMessages,
  isFirebaseConfigured,
} from "../lib/firebase";
import { startPersistentAlert, stopPersistentAlert } from "../lib/notification-alert";
import { getApiBaseUrl } from "../lib/api-base";
import {
  NOTIFICATION_POLL_DISCONNECTED_MS,
  QUERY_STALE,
} from "../lib/query-config";

interface RealtimeContextType {
  socket: Socket | null;
  isConnected: boolean;
  firebasePushEnabled: boolean;
  unreadNotificationCount: number;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [firebasePushEnabled, setFirebasePushEnabled] = useState(false);
  const queryClient = useQueryClient();
  const fcmRegisteredRef = useRef(false);

  const { data: unreadData } = useListNotifications(
    { unreadOnly: true, limit: 1 },
    {
      query: {
        queryKey: getListNotificationsQueryKey({ unreadOnly: true, limit: 1 }),
        enabled: !!user,
        staleTime: QUERY_STALE.notificationsBadge,
        refetchInterval: isConnected ? false : NOTIFICATION_POLL_DISCONNECTED_MS,
      },
    },
  );

  const unreadNotificationCount = unreadData?.unreadCount ?? 0;

  const handleIncomingAlert = useCallback(
    (title: string, body: string) => {
      toast.info(title, { description: body, duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      startPersistentAlert();

      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch {
          /* ignore */
        }
      }
    },
    [queryClient],
  );

  // Stop repeating alert when all notifications are read
  useEffect(() => {
    if (unreadNotificationCount === 0) {
      stopPersistentAlert();
    }
  }, [unreadNotificationCount]);

  // Firebase foreground push + token registration
  useEffect(() => {
    if (!user || !accessToken) return;

    let unsubscribeFcm: (() => void) | undefined;

    initFirebase().then((messaging) => {
      if (!messaging) {
        setFirebasePushEnabled(false);
        return;
      }

      setFirebasePushEnabled(isFirebaseConfigured());

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (vapidKey && !fcmRegisteredRef.current) {
        fcmRegisteredRef.current = true;
        requestFirebaseToken(vapidKey).then((token) => {
          if (token) {
            fetch("/api/auth/fcm-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ token }),
            }).catch(console.error);
          }
        });
      }

      unsubscribeFcm = subscribeForegroundMessages((payload) => {
        const title = payload.notification?.title || "New notification";
        const body = payload.notification?.body || "";
        handleIncomingAlert(title, body);
      });
    });

    return () => {
      unsubscribeFcm?.();
    };
  }, [user, accessToken, handleIncomingAlert]);

  const queryClientRef = useRef(queryClient);
  const handleIncomingAlertRef = useRef(handleIncomingAlert);
  const userIdRef = useRef(user?.id);
  queryClientRef.current = queryClient;
  handleIncomingAlertRef.current = handleIncomingAlert;
  userIdRef.current = user?.id;

  useEffect(() => {
    if (!user?.id || !accessToken) {
      setSocket(null);
      setIsConnected(false);
      stopPersistentAlert();
      return;
    }

    const apiBase = getApiBaseUrl();
    const socketInstance = io(apiBase, {
      path: "/socket.io",
      query: { userId: String(user.id) },
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    });

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));
    socketInstance.on("connect_error", () => setIsConnected(false));

    socketInstance.on("notification", (data: { title?: string; body?: string }) => {
      handleIncomingAlertRef.current(data.title || "New notification", data.body || "");
    });

    socketInstance.on("comment", (data: { comment?: { authorId?: number } }) => {
      queryClientRef.current.invalidateQueries({ queryKey: ["/api/comments"] });
      const authorId = data.comment?.authorId;
      if (authorId && authorId !== userIdRef.current) {
        queryClientRef.current.invalidateQueries({ queryKey: ["/api/notifications"] });
        startPersistentAlert();
      }
    });

    socketInstance.on("ticket_update", () => {
      queryClientRef.current.invalidateQueries({ queryKey: ["/api/tickets"] });
    });

    socketInstance.on("request_update", () => {
      queryClientRef.current.invalidateQueries({ queryKey: ["/api/requests"] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      stopPersistentAlert();
    };
  }, [user?.id, accessToken]);

  return (
    <RealtimeContext.Provider
      value={{ socket, isConnected, firebasePushEnabled, unreadNotificationCount }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};
