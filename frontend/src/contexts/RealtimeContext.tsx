import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useListNotifications, getListNotificationsQueryKey, getGetSettingsQueryKey, type Comment, type CompanySettings } from "@/api";
import { appendCommentToListCache } from "@/lib/comment-thread-query";
import { applyProjectCommentToCaches, discussionCommentPreview } from "@/lib/discussion-realtime";
import { patchDirectConversationFromComment } from "@/api/direct-conversations";
import { isElectron } from "@/lib/electron-bridge";
import { monitoringStatusQueryKey, consentStatusQueryKey } from "@/api/monitoring";
import { activeSessionQueryKey, type WorkSession } from "@/api/work-sessions";

import {
  initFirebase,
  requestFirebaseToken,
  subscribeForegroundMessages,
  isFirebaseConfigured,
} from "../lib/firebase";
import { playNotificationAlert, stopPersistentAlert } from "../lib/notification-alert";
import { apiUrl, getApiBaseUrl } from "../lib/api-base";
import { BRAND } from "@/lib/brand";
import { showWebPushNotification, ensureNotificationPermission } from "@/lib/web-push-notify";
import { isClockableStaffRole } from "@/lib/user-roles";
import {
  markWorkSessionAlertShown,
  wasWorkSessionAlertShown,
  workSessionAlertKey,
} from "@/lib/work-session-utils";
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
  const { user, accessToken, logout } = useAuth();
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
      playNotificationAlert();

      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: BRAND.faviconSrc });
        } catch {
          /* ignore */
        }
      }
    },
    [queryClient],
  );

  // Cancel any pending beeps when all notifications are read
  useEffect(() => {
    if (unreadNotificationCount === 0) {
      stopPersistentAlert();
    }
  }, [unreadNotificationCount]);

  // Request browser notification permission early for clockable staff (web push when tab closed).
  useEffect(() => {
    if (!user?.id || !accessToken) return;
    if (isClockableStaffRole(user.role)) {
      void ensureNotificationPermission();
    }
  }, [user?.id, user?.role, accessToken]);

  // Firebase foreground push + token registration
  useEffect(() => {
    if (!user || !accessToken) {
      fcmRegisteredRef.current = false;
      setFirebasePushEnabled(false);
      return;
    }

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
            fetch(apiUrl("/api/auth/fcm-token"), {
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
  const logoutRef = useRef(logout);
  queryClientRef.current = queryClient;
  handleIncomingAlertRef.current = handleIncomingAlert;
  logoutRef.current = logout;

  useEffect(() => {
    if (!user?.id || !accessToken) {
      setSocket(null);
      setIsConnected(false);
      stopPersistentAlert();
      return;
    }

    const apiBase = getApiBaseUrl();
    const socketOptions = {
      path: "/socket.io",
      query: { userId: String(user.id) },
      auth: { token: accessToken },
      transports: ["polling", "websocket"] as ("polling" | "websocket")[],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
    };
    const socketInstance = apiBase ? io(apiBase, socketOptions) : io(socketOptions);

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));
    socketInstance.on("connect_error", () => setIsConnected(false));

    socketInstance.on("notification", (data: { title?: string; body?: string; type?: string }) => {
      if (data.type === "work_session") {
        queryClientRef.current.invalidateQueries({ queryKey: ["/api/notifications"] });
        return;
      }
      handleIncomingAlertRef.current(data.title || "New notification", data.body || "");
    });

    socketInstance.on(
      "comment",
      (data: { threadType?: string; threadId?: number; comment?: Comment }) => {
        const { threadType, threadId, comment } = data;
        if (threadType && threadId != null && comment?.id != null) {
          if (
            threadType === "project" ||
            threadType === "project_internal" ||
            threadType === "company_team" ||
            threadType === "company_team_unofficial"
          ) {
            applyProjectCommentToCaches(
              queryClientRef.current,
              threadId,
              comment,
              threadType as "project" | "project_internal" | "company_team" | "company_team_unofficial",
            );
          } else if (threadType === "direct") {
            appendCommentToListCache(
              queryClientRef.current,
              threadType,
              threadId,
              comment,
            );
            patchDirectConversationFromComment(queryClientRef.current, threadId, {
              lastMessageAt: comment.createdAt ?? new Date().toISOString(),
              lastPreview: discussionCommentPreview(comment),
              lastAuthorName: comment.authorName,
              lastAuthorId: comment.authorId,
            });
          } else {
            appendCommentToListCache(
              queryClientRef.current,
              threadType,
              threadId,
              comment,
            );
          }
        } else if (threadId != null) {
          queryClientRef.current.invalidateQueries({
            predicate: (q) => {
              const key = q.queryKey[0];
              if (key !== "/api/comments") return false;
              return JSON.stringify(q.queryKey).includes(String(threadId));
            },
          });
        }
      },
    );

    socketInstance.on("ticket_update", () => {
      queryClientRef.current.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "/api/tickets",
        refetchType: "active",
      });
    });

    socketInstance.on("request_update", () => {
      queryClientRef.current.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "/api/requests",
        refetchType: "active",
      });
    });

    socketInstance.on("session_terminated", () => {
      if (isElectron() && window.electron) {
        window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
      }
      queryClientRef.current.setQueryData(activeSessionQueryKey(), { session: null });
      queryClientRef.current.invalidateQueries({ queryKey: ["work-sessions"] });
      toast.warning("Your work session was ended by an administrator.", { duration: 10_000 });
    });

    // User clock in/out on web or desktop — keep every open client in sync (no toast).
    socketInstance.on(
      "work_session_sync",
      (data: { session?: WorkSession | null }) => {
        const session = data?.session?.isActive ? data.session : null;
        queryClientRef.current.setQueryData(activeSessionQueryKey(), { session });
        queryClientRef.current.invalidateQueries({ queryKey: ["work-sessions"] });
        if (isElectron() && window.electron && !session) {
          window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
        }
      },
    );

    socketInstance.on("hrm_leave_updated", () => {
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "leave"] });
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "attendance"] });
    });

    socketInstance.on("hrm_attendance_updated", () => {
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "attendance"] });
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    });

    socketInstance.on("hrm_wfh_updated", () => {
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "wfh"] });
      queryClientRef.current.invalidateQueries({ queryKey: ["hrm", "dashboard"] });
    });

    socketInstance.on(
      "shift_auto_clock_out",
      (data: { title?: string; body?: string; entityId?: number }) => {
        if (isElectron() && window.electron) {
          window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
        }
        queryClientRef.current.setQueryData(activeSessionQueryKey(), { session: null });
        queryClientRef.current.invalidateQueries({ queryKey: ["work-sessions"] });
        queryClientRef.current.invalidateQueries({ queryKey: ["/api/notifications"] });

        const dedupeKey =
          data.entityId != null
            ? workSessionAlertKey(data.entityId, "shift_ended")
            : `socket:shift_ended:${data.title ?? ""}`;
        if (wasWorkSessionAlertShown(dedupeKey)) return;
        markWorkSessionAlertShown(dedupeKey);

        const title = data.title ?? "Automatically clocked out";
        const body =
          data.body ??
          "Your shift has ended. Clock in again if you are doing extra work.";
        toast.info(title, { description: body, duration: 10_000 });
        if (!isElectron()) {
          showWebPushNotification(title, body, { tag: "work-session-shift-ended" });
        }
      },
    );

    socketInstance.on(
      "work_session_ended",
      (data: { title?: string; body?: string; stopReason?: string; entityId?: number }) => {
        if (isElectron() && window.electron) {
          window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
        }
        queryClientRef.current.setQueryData(activeSessionQueryKey(), { session: null });
        queryClientRef.current.invalidateQueries({ queryKey: ["work-sessions"] });
        queryClientRef.current.invalidateQueries({ queryKey: ["/api/notifications"] });

        const stopReason = data.stopReason ?? "unknown";
        const dedupeKey =
          data.entityId != null
            ? workSessionAlertKey(data.entityId, stopReason)
            : `socket:${stopReason}:${data.title ?? ""}`;
        if (wasWorkSessionAlertShown(dedupeKey)) return;
        markWorkSessionAlertShown(dedupeKey);

        const title = data.title ?? "Work session ended";
        const body =
          data.body ??
          "Your work session has ended. Clock in again today to continue the same shift.";
        toast.warning(title, { description: body, duration: 10_000 });
        if (!isElectron()) {
          showWebPushNotification(title, body, {
            tag: data.stopReason ? `work-session-${data.stopReason}` : "work-session-ended",
          });
        }
      },
    );

    socketInstance.on("monitoring:config-updated", (data: Record<string, unknown>) => {
      queryClientRef.current.setQueryData(monitoringStatusQueryKey(), data);
      queryClientRef.current.setQueryData(getGetSettingsQueryKey(), (prev: CompanySettings | undefined) =>
        prev
          ? {
              ...prev,
              screenshotEnabled: Boolean(data.screenshotEnabled),
              screenshotIntervalMinutes: Number(data.screenshotIntervalMinutes ?? prev.screenshotIntervalMinutes ?? 10),
              screenshotRetentionDays: Number(data.screenshotRetentionDays ?? prev.screenshotRetentionDays ?? 30),
              screenshotBlurEnabled: true,
              screenshotConsentVersion: String(data.screenshotConsentVersion ?? prev.screenshotConsentVersion ?? "1.0"),
            }
          : prev,
      );
      queryClientRef.current.invalidateQueries({ queryKey: consentStatusQueryKey() });
    });

    socketInstance.on("user_deactivated", () => {
      toast.error("Your account has been deactivated. Logging out…", { duration: 6_000 });
      setTimeout(() => logoutRef.current(), 3_000);
    });

    socketInstance.on("role_updated", () => {
      toast.info("Your role has been updated. Please log in again.", { duration: 8_000 });
      setTimeout(() => logoutRef.current(), 4_000);
    });

    socketInstance.on("consent_version_changed", () => {
      queryClientRef.current.invalidateQueries({ queryKey: consentStatusQueryKey() });
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
