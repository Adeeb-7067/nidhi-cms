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
import { useRealtime } from "@/contexts/RealtimeContext";
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
  clockIn: (opts?: { quietSuccess?: boolean }) => Promise<void>;
  clockOut: (reason?: "clock_out" | "app_quit" | "logout") => Promise<void>;
  isClockedIn: boolean;
  /** True only when Electron screenshot scheduler is actually enabled. */
  isScreenshotCapturing: boolean;
}

const WorkSessionContext = createContext<WorkSessionContextType>({
  activeSession: null,
  isLoading: false,
  clockIn: async () => {},
  clockOut: async () => {},
  isClockedIn: false,
  isScreenshotCapturing: false,
});

export function WorkSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isConnected } = useRealtime();
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

  const isScreenshotCapturing =
    isElectron() &&
    !!activeSession?.isActive &&
    !!status?.screenshotEnabled &&
    !!consent?.hasConsented &&
    !!consent?.isCurrentVersion;

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
  const shownStopReasonRef = useRef<string | null>(null);
  const clockInRef = useRef<(opts?: { quietSuccess?: boolean }) => Promise<void>>(async () => {});

  const SESSION_END_POLL_MESSAGES: Record<string, string> = {
    shift_ended: "Automatically clocked out — your shift ended. Clock in again for overtime.",
    day_ended: "Previous work day ended — clock in to start today's new session.",
    session_expired: "Session closed — 24-hour limit reached.",
    system_sleep: "Session paused — PC went to sleep.",
    system_shutdown: "Session paused — PC shut down.",
    app_quit: "Session paused — app was closed.",
  };

  // Server-side policy closed the session between polls (shift end, day end, etc.).
  useEffect(() => {
    if (!sessionEnabled || activeSession) return;
    const reason = activeData?.stopReason;
    if (!reason || reason === shownStopReasonRef.current) return;
    shownStopReasonRef.current = reason;
    const message = SESSION_END_POLL_MESSAGES[reason];
    if (!message) return;
    if (reason === "shift_ended" || reason === "day_ended" || reason === "app_quit") {
      toast.warning(message, {
        duration: Infinity,
        action: {
          label: "Clock in",
          onClick: () => window.dispatchEvent(new Event("cms:request-clock-in")),
        },
      });
    } else {
      toast.info(message, { duration: 10_000 });
    }
  }, [sessionEnabled, activeSession, activeData?.stopReason]);

  useEffect(() => {
    if (activeSession) shownStopReasonRef.current = null;
  }, [activeSession]);
  useEffect(() => {
    // RealtimeContext handles live work-session toasts via dedicated socket events.
    // Only fall back to polling unread notifications when the socket is disconnected.
    if (!isClockableRole || isConnected || !unreadAlerts?.notifications?.length) return;
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
  }, [isClockableRole, isConnected, unreadAlerts]);

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
      system_sleep: "Session paused — PC went to sleep. It will resume when the PC wakes.",
      system_shutdown: "Session paused — PC is shutting down.",
      app_quit: "Session paused — desktop app was closed.",
      session_expired: "Session closed — 24-hour limit reached.",
      day_ended: "Previous work day ended — clock in to start today's new session.",
      shift_ended: "Automatically clocked out — your shift ended. Clock in again for overtime.",
      logout: "Session paused — you logged out.",
      admin_terminated: "Session ended — an administrator ended your session.",
    };
    const unsubscribe = window.electron.onSessionEnded(({ stopReason }) => {
      queryClient.setQueryData(activeSessionQueryKey(), { session: null });
      queryClient.invalidateQueries({ queryKey: ["work-sessions"] });
      const message = SESSION_END_MESSAGES[stopReason];
      if (!message) return;
      // Sleep is followed by auto-resume — keep this short. Shift end needs a sticky CTA.
      if (stopReason === "shift_ended" || stopReason === "day_ended" || stopReason === "app_quit") {
        toast.warning(message, {
          duration: Infinity,
          action: {
            label: "Clock in",
            onClick: () => window.dispatchEvent(new Event("cms:request-clock-in")),
          },
        });
      } else {
        toast.info(message, { duration: 8_000 });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // After sleep/hibernate: auto clock-in so unpaid gaps don't grow until someone notices.
  useEffect(() => {
    if (!isElectron() || !window.electron?.onSystemResumed) return;
    const unsubscribe = window.electron.onSystemResumed(async ({ shouldClockIn }) => {
      await queryClient.invalidateQueries({ queryKey: activeSessionQueryKey() });
      if (!shouldClockIn) return;
      // Wait a beat for network/token after wake, then resume.
      await new Promise((r) => setTimeout(r, 1500));
      if (activeSessionRef.current?.isActive) {
        toast.success("Still clocked in — session continued after wake.");
        return;
      }
      try {
        await clockInRef.current({ quietSuccess: true });
        toast.warning(
          "PC woke from sleep — session was paused while asleep and has been resumed. Sleep time is not counted as work.",
          { duration: 12_000 },
        );
      } catch {
        toast.error("Could not auto-resume after sleep. Please clock in manually.", {
          duration: Infinity,
          action: {
            label: "Clock in",
            onClick: () => window.dispatchEvent(new Event("cms:request-clock-in")),
          },
        });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Sticky toasts / OS resume can request clock-in without going through the navbar button.
  useEffect(() => {
    const onRequest = () => {
      void clockInRef.current();
    };
    window.addEventListener("cms:request-clock-in", onRequest);
    return () => window.removeEventListener("cms:request-clock-in", onRequest);
  }, []);
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

  const clockIn = useCallback(async (opts?: { quietSuccess?: boolean }) => {
    if (isClockingInRef.current) return;
    if (activeSession?.isActive) {
      if (!opts?.quietSuccess) toast.info("You are already clocked in.");
      return;
    }
    isClockingInRef.current = true;
    try {
      const deviceInfo = isElectron()
        ? `Electron/${window.electron?.platform ?? "desktop"}`
        : "Web";
      const result = await clockInMutation.mutateAsync(deviceInfo);
      if (!result.session?.isActive) {
        toast.error("Clock-in did not start a session. Please try again.");
        await queryClient.invalidateQueries({ queryKey: activeSessionQueryKey() });
        return;
      }
      if (isClockableRole) {
        void ensureNotificationPermission();
      }
      if (!opts?.quietSuccess) {
        if (result.resumed) {
          toast.success("Session resumed — your timer continues from where you left off.");
        } else {
          toast.success("Clocked in. Have a productive session!");
        }
      }
    } catch (error) {
      toastApiError(error, "Failed to clock in. Please try again.");
      throw error;
    } finally {
      isClockingInRef.current = false;
    }
  }, [activeSession, clockInMutation, queryClient, isClockableRole]);

  useEffect(() => {
    clockInRef.current = clockIn;
  }, [clockIn]);
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
        isScreenshotCapturing,
      }}
    >
      {children}
    </WorkSessionContext.Provider>
  );
}

export function useWorkSession() {
  return useContext(WorkSessionContext);
}
