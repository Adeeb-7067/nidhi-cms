import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { isElectron } from "@/lib/electron-bridge";
import { useAuth } from "@/contexts/AuthContext";
import { useMonitoringStatus, useConsentStatus } from "@/api/monitoring";
import { useActiveSession, useClockIn, useClockOut, type WorkSession } from "@/api/work-sessions";
import { toast } from "sonner";

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

  // Only developer/tester/qa have work sessions. On web, skip polling for other roles
  // to avoid 30-second background requests that always return null for admins/clients.
  // In Electron the desktop app always belongs to a monitorable employee, so allow any logged-in user.
  const isMonitorableRole = ["developer", "tester", "qa"].includes(user?.role ?? "");
  const sessionEnabled = !!user && (isElectron() || isMonitorableRole);

  const { data: activeData, isLoading: sessionLoading } = useActiveSession(sessionEnabled);
  const { data: status } = useMonitoringStatus(isElectron() && !!user);
  const { data: consent } = useConsentStatus(
    isElectron() && !!user && !!status?.screenshotEnabled,
  );

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const activeSession = activeData?.session ?? null;

  // Keep stable refs so the pre-quit handler never captures stale closures.
  // useMutation and activeSession both change identity across renders.
  const clockOutMutationRef = useRef(clockOutMutation);
  useEffect(() => { clockOutMutationRef.current = clockOutMutation; });

  const activeSessionRef = useRef(activeSession);
  useEffect(() => { activeSessionRef.current = activeSession; });

  // Guard against concurrent clock-in calls (e.g. rapid double-click).
  const isClockingInRef = useRef(false);

  // Sync the Electron screenshot scheduler whenever session/monitoring state changes.
  useEffect(() => {
    if (!isElectron() || !window.electron) return;

    const shouldCapture =
      !!activeSession &&
      !!status?.screenshotEnabled &&
      !!consent?.hasConsented &&
      !!consent?.isCurrentVersion;

    window.electron.setScreenshotConfig({
      enabled: shouldCapture,
      intervalMs: shouldCapture ? status!.screenshotIntervalMinutes * 60 * 1000 : 0,
      sessionId: activeSession?.id ?? 0,
    });
  }, [activeSession, status, consent]);

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
    // Reject if already clocked in or a clock-in is already in flight.
    if (activeSession || isClockingInRef.current) return;
    isClockingInRef.current = true;
    try {
      const deviceInfo = isElectron()
        ? `Electron/${window.electron?.platform ?? "desktop"}`
        : "Web";
      await clockInMutation.mutateAsync(deviceInfo);
      toast.success("Clocked in. Have a productive session!");
    } catch {
      toast.error("Failed to clock in. Please try again.");
    } finally {
      isClockingInRef.current = false;
    }
  }, [activeSession, clockInMutation]);

  const clockOut = useCallback(
    async (reason: "clock_out" | "app_quit" | "logout" = "clock_out") => {
      if (!activeSession) return;
      // Stop Electron scheduler immediately — don't wait for the API response.
      if (isElectron() && window.electron) {
        window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
      }
      try {
        await clockOutMutation.mutateAsync(reason);
        if (reason === "clock_out") toast.success("Clocked out. See you next time!");
      } catch {
        if (reason === "clock_out") toast.error("Failed to clock out. Please try again.");
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
        isClockedIn: !!activeSession,
      }}
    >
      {children}
    </WorkSessionContext.Provider>
  );
}

export function useWorkSession() {
  return useContext(WorkSessionContext);
}
