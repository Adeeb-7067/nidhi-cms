import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { isElectron } from "@/lib/electron-bridge";
import { getApiBaseUrl } from "@/lib/api-base";
import { useAuth } from "@/contexts/AuthContext";
import { useMonitoringStatus, useConsentStatus } from "@/api/monitoring";
import { useActiveSession, useClockIn, useClockOut, activeSessionQueryKey, type WorkSession } from "@/api/work-sessions";
import { useListNotifications, getListNotificationsQueryKey } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { isClockableStaffRole, isMonitorableStaffRole } from "@/lib/user-roles";
import { ensureNotificationPermission } from "@/lib/web-push-notify";
import {
  markWorkSessionAlertShown,
  wasWorkSessionAlertShown,
} from "@/lib/work-session-utils";

interface WorkSessionContextType {
  activeSession: WorkSession | null;
  isLoading: boolean;
  clockIn: () => Promise<void>;
  clockOut: (reason?: "clock_out" | "app_quit" | "logout") => Promise<void>;
  isClockedIn: boolean;
}

const WorkSessionContext = createContext<WorkSessionContextType>({
  activeSession: null,
  isLoading: false,
  clockIn: async () => {},
  clockOut: async () => {},
  isClockedIn: false,
});

export function WorkSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Only clockable staff roles have work sessions. On web, skip polling for other roles
  // to avoid 30-second background requests that always return null for admins/clients.
  // In Electron the desktop app always belongs to a clockable employee, so allow any logged-in user.
  const isClockableRole = isClockableStaffRole(user?.role);
  const isMonitorableRole = isMonitorableStaffRole(user?.role);
  const sessionEnabled = !!user && (isElectron() || isClockableRole);

  const { data: activeData, isLoading: sessionLoading } = useActiveSession(sessionEnabled);
  const workSessionAlertParams = { unreadOnly: true as const, limit: 10 };
  const { data: unreadAlerts } = useListNotifications(workSessionAlertParams, {
    query: {
      queryKey: getListNotificationsQueryKey(workSessionAlertParams),
      enabled: sessionEnabled,
      staleTime: 60_000,
    },
  });
  const { data: status } = useMonitoringStatus(!!user && isMonitorableRole);
  const { data: consent } = useConsentStatus(
    isElectron() && !!user && isMonitorableRole && !!status?.screenshotEnabled,
  );

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const activeSession = activeData?.session ?? null;

  // Web + desktop open together: refetch when this tab/window gains focus.
  useEffect(() => {
    if (!sessionEnabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void queryClient.invalidateQueries({ queryKey: activeSessionQueryKey() });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sessionEnabled, queryClient]);

  // Keep stable refs so the pre-quit handler never captures stale closures.
  // useMutation and activeSession both change identity across renders.
  const clockOutMutationRef = useRef(clockOutMutation);
  useEffect(() => { clockOutMutationRef.current = clockOutMutation; });

  const activeSessionRef = useRef(activeSession);
  useEffect(() => { activeSessionRef.current = activeSession; });

  // Guard against concurrent clock-in calls (e.g. rapid double-click).
  const isClockingInRef = useRef(false);
  const shownSessionAlertRef = useRef<Set<number>>(new Set());

  // Surface unread work-session alerts once (persisted) — not on every app restart.
  useEffect(() => {
    if (!isClockableRole || !unreadAlerts?.notifications?.length) return;
    for (const item of unreadAlerts.notifications) {
      if (item.type !== "work_session" || shownSessionAlertRef.current.has(item.id)) continue;
      const alertKey = `notif:${item.id}`;
      if (wasWorkSessionAlertShown(alertKey)) continue;
      shownSessionAlertRef.current.add(item.id);
      markWorkSessionAlertShown(alertKey);
      toast.warning(item.title, {
        description: item.body,
        duration: 12_000,
      });
    }
  }, [isClockableRole, unreadAlerts]);

  // Sync Electron session + screenshot scheduler once active session is confirmed from API.
  useEffect(() => {
    if (!isElectron() || !window.electron || sessionLoading) return;

    const shouldCapture =
      !!activeSession &&
      !!status?.screenshotEnabled &&
      !!consent?.hasConsented &&
      !!consent?.isCurrentVersion;

    window.electron.setScreenshotConfig({
      enabled: shouldCapture,
      intervalMs: shouldCapture ? status!.screenshotIntervalMinutes * 60 * 1000 : 0,
      sessionId: activeSession?.id ?? 0,
      apiBaseUrl: getApiBaseUrl() || undefined,
      blurSensitiveApps: shouldCapture,
      accessToken: localStorage.getItem("accessToken") ?? undefined,
    });
  }, [activeSession, status, consent, sessionLoading]);

  // Main process may clock out (sleep, shutdown) — local events only; server sync is silent.
  useEffect(() => {
    if (!isElectron() || !window.electron?.onSessionEnded) return;
    const SESSION_END_MESSAGES: Record<string, string> = {
      system_sleep: "Work session ended — PC went to sleep.",
      system_shutdown: "Work session ended — PC is shutting down.",
      network_lost: "Work session ended — no network for an extended period.",
      app_quit: "Work session ended — app closed.",
      client_disconnected: "Work session ended — no longer active on the server.",
      session_expired: "Work session ended — 24-hour limit reached.",
      day_ended: "Work session ended — a new work day started.",
      shift_ended: "Automatically clocked out at shift end. Clock in again to continue your day.",
      logout: "Work session ended — you logged out.",
      admin_terminated: "Work session ended — an administrator ended your session.",
    };
    const unsubscribe = window.electron.onSessionEnded(({ stopReason }) => {
      queryClient.setQueryData(activeSessionQueryKey(), { session: null });
      queryClient.invalidateQueries({ queryKey: ["work-sessions"] });
      const message = SESSION_END_MESSAGES[stopReason];
      if (message) {
        toast.info(message, { duration: 8_000 });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Safety net: stop Electron scheduler when user is cleared (token expiry, forced logout).
  // Explicit logout is already handled in AuthContext.logout() before tokens are cleared;
  // this effect catches the remaining cases (session_expired event, admin revocation).
  useEffect(() => {
    if (!user && isElectron() && window.electron) {
      window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
    }
  }, [user]);

  // Clock out and notify main process just before the Electron app quits.
  // Uses a ref for clockOutMutation so this effect only re-registers when
  // activeSession changes — not on every render.
  useEffect(() => {
    if (!isElectron() || !window.electron) return;
    const unsubscribe = window.electron.onPreQuit(async () => {
      try {
        if (activeSessionRef.current) {
          await clockOutMutationRef.current.mutateAsync("app_quit");
        }
      } catch { /* best-effort: main process will force-quit after 4 s anyway */ }
      finally {
        window.electron!.notifyClockOutDone();
      }
    });
    return unsubscribe;
  }, [activeSession]); // stable: clockOutMutationRef never changes identity

  const clockIn = useCallback(async () => {
    if (activeSession?.isActive) {
      toast.info("You are already clocked in.");
      return;
    }
    if (isClockingInRef.current) return;
    isClockingInRef.current = true;
    try {
      const deviceInfo = isElectron()
        ? `Electron/${window.electron?.platform ?? "desktop"}`
        : "Web";
      const result = await clockInMutation.mutateAsync(deviceInfo);
      if (isClockableRole) {
        void ensureNotificationPermission();
      }
      if (result.resumed) {
        toast.success("Session resumed — your timer continues from where you left off.");
      } else {
        toast.success("Clocked in. Have a productive session!");
      }
    } catch (error) {
      toastApiError(error, "Failed to clock in. Please try again.");
    } finally {
      isClockingInRef.current = false;
    }
  }, [activeSession, clockInMutation]);

  const clockOut = useCallback(
    async (reason: "clock_out" | "app_quit" | "logout" = "clock_out") => {
      if (!activeSession?.isActive) {
        if (reason === "clock_out") toast.info("You are not clocked in.");
        return;
      }
      // Stop Electron scheduler immediately — don't wait for the API response.
      if (isElectron() && window.electron) {
        window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
      }
      try {
        await clockOutMutation.mutateAsync(reason);
        if (reason === "clock_out") {
          toast.success("Session paused. Clock in again today to continue where you left off.");
        }
      } catch (error) {
        if (reason === "clock_out") toastApiError(error, "Failed to clock out. Please try again.");
      }
    },
    [activeSession, clockOutMutation],
  );

  return (
    <WorkSessionContext.Provider
      value={{
        activeSession,
        isLoading: sessionLoading,
        clockIn,
        clockOut,
        isClockedIn: !!activeSession?.isActive,
      }}
    >
      {children}
    </WorkSessionContext.Provider>
  );
}

export function useWorkSession() {
  return useContext(WorkSessionContext);
}
