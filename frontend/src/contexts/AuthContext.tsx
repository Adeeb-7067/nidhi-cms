import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/api";
import {
  useGetMe,
  setAuthTokenGetter,
  getGetMeQueryKey,
  logout as apiLogout,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  hasStoredSession,
  AUTH_TOKEN_REFRESHED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
} from "@/lib/auth-storage";
import {
  clearImpersonationMeta,
  getImpersonationMeta,
  setImpersonationMeta,
  type ImpersonationMeta,
} from "@/lib/impersonation-storage";
import { apiUrl } from "@/lib/api-base";
import { isDevPortalRole, isMonitorableStaffRole, isStaffEmployeeRole } from "@/lib/user-roles";
import { permissionsQueryKey } from "@/api/permissions";
import { customFetch } from "@/api/custom-fetch";
import { resolveFcmTokenForLogout, revokeFirebaseToken } from "@/lib/firebase";
import type { PermissionsResponse } from "@/api/permissions";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  isImpersonating: boolean;
  impersonation: ImpersonationMeta | null;
  isStoppingImpersonation: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  impersonate: (userId: number) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getHomePath(role: string): string {
  if (role === "super_admin") return "/admin";
  if (role === "hr") return "/hrm";
  if (role === "bde") return "/sales/bde";
  if (isDevPortalRole(role)) return "/dev";
  if (role === "client") return "/client";
  return "/sales";
}

function prefetchPermissions(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.prefetchQuery({
    queryKey: permissionsQueryKey(),
    queryFn: () =>
      customFetch<PermissionsResponse>(apiUrl("/api/permissions/me")),
    staleTime: 5 * 60_000,
  });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!data.accessToken || !data.refreshToken) return null;

  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [isInitializing, setIsInitializing] = useState(() => hasStoredSession());
  const [impersonation, setImpersonation] = useState<ImpersonationMeta | null>(() =>
    getImpersonationMeta(),
  );
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);

  const isImpersonating = impersonation !== null;

  useEffect(() => {
    setAuthTokenGetter(() => getAccessToken());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!hasStoredSession()) {
        setIsInitializing(false);
        return;
      }

      try {
        let token = getAccessToken();
        if (!token) {
          token = await refreshAccessToken();
          if (cancelled) return;
          if (token) {
            setAccessToken(token);
            prefetchPermissions(queryClient);
          } else {
            clearTokens();
            clearImpersonationMeta();
            setImpersonation(null);
            setAccessToken(null);
          }
        }
      } catch {
        // Network unavailable (e.g. Electron app opened offline) — clear the
        // stale session so the user is taken to the login screen immediately.
        if (!cancelled) {
          clearTokens();
          clearImpersonationMeta();
          setImpersonation(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onRefreshed = (e: Event) => {
      const token = (e as CustomEvent<{ accessToken?: string }>).detail?.accessToken;
      setAccessToken(token ?? getAccessToken());
      void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    };
    const onExpired = () => {
      if (getImpersonationMeta()) {
        clearImpersonationMeta();
        setImpersonation(null);
      }
      setAccessToken(null);
      queryClient.clear();
    };

    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, onRefreshed);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, onRefreshed);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [queryClient]);

  const {
    data: user,
    isLoading: isUserLoading,
    error,
    isError,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!accessToken && !isInitializing,
      retry: false,
    },
  });

  useEffect(() => {
    if (!isError || !error) return;

    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403) {
      const tryRefresh = async () => {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessToken(newToken);
          void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          return;
        }
        clearTokens();
        clearImpersonationMeta();
        setImpersonation(null);
        setAccessToken(null);
        queryClient.clear();
      };
      void tryRefresh();
    }
  }, [isError, error, queryClient]);

  useEffect(() => {
    if (user && accessToken) prefetchPermissions(queryClient);
  }, [user?.id, accessToken, queryClient]);

  const login = useCallback(
    (token: string, refreshToken: string, userData: User) => {
      clearImpersonationMeta();
      setImpersonation(null);
      setTokens(token, refreshToken);
      setAccessToken(token);
      void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      prefetchPermissions(queryClient);
      setLocation(getHomePath(userData.role));
    },
    [queryClient, setLocation],
  );

  const stopImpersonation = useCallback(async () => {
    const meta = getImpersonationMeta();
    if (!meta) return;

    setIsStoppingImpersonation(true);
    const impersonationRefresh = getRefreshToken();
    const token = getAccessToken();

    // Clock out the impersonated employee (if their role can have a session)
    // before revoking their token. Best-effort — don't block admin restoration.
    const targetCanHaveSession = isMonitorableStaffRole(meta.targetUser.role);
    if (targetCanHaveSession && token) {
      try {
        await fetch(apiUrl("/api/work-sessions/clock-out"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ stopReason: "logout" }),
        });
      } catch { /* network unavailable — stale session purge will clean up */ }
    }

    try {
      if (token && impersonationRefresh) {
        await fetch(apiUrl("/api/auth/stop-impersonate"), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: impersonationRefresh }),
        });
      }
    } catch {
      // Still restore admin session locally
    }

    setTokens(meta.adminAccessToken, meta.adminRefreshToken);
    setAccessToken(meta.adminAccessToken);
    clearImpersonationMeta();
    setImpersonation(null);
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setLocation("/admin");
    setIsStoppingImpersonation(false);
  }, [queryClient, setLocation]);

  const impersonate = useCallback(
    async (userId: number) => {
      const adminAccess = getAccessToken();
      const adminRefresh = getRefreshToken();
      if (!adminAccess || !adminRefresh || !user || user.role !== "super_admin") {
        throw new Error("Only super admins can use view-as");
      }
      if (isImpersonating) {
        throw new Error("Already viewing as another user. Exit first.");
      }

      const res = await fetch(apiUrl(`/api/auth/impersonate/${userId}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${adminAccess}` },
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
      };

      if (!res.ok || !body.accessToken || !body.refreshToken || !body.user) {
        throw new Error(body.message ?? body.error ?? "Failed to start impersonation");
      }

      setImpersonationMeta({
        adminAccessToken: adminAccess,
        adminRefreshToken: adminRefresh,
        adminUser: { id: user.id, name: user.name, role: user.role },
        targetUser: {
          id: body.user.id,
          name: body.user.name,
          role: body.user.role,
        },
      });
      setImpersonation(getImpersonationMeta());

      setTokens(body.accessToken, body.refreshToken);
      setAccessToken(body.accessToken);
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation(getHomePath(body.user.role));
    },
    [user, isImpersonating, queryClient, setLocation],
  );

  const logout = useCallback(async () => {
    if (isImpersonating) {
      await stopImpersonation();
      return;
    }

    // Capture token NOW — before anything is cleared.
    const token = getAccessToken();

    if (token) {
      // Stop Electron screenshot scheduler immediately (before API calls).
      if (typeof window !== "undefined" && window.electron) {
        window.electron.setScreenshotConfig({ enabled: false, intervalMs: 0, sessionId: 0 });
      }
      // Clock out only if this role can have an active session (monitorable staff).
      // Admins and clients never clock in, so calling clock-out for them would hit a 403.
      const canHaveSession = isMonitorableStaffRole(user?.role ?? "");
      if (canHaveSession) {
        try {
          await fetch(apiUrl("/api/work-sessions/clock-out"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ stopReason: "logout" }),
          });
        } catch { /* network unavailable — stale-session purge job will clean up */ }
      }
    }

    const refreshToken = getRefreshToken();
    const fcmToken = await resolveFcmTokenForLogout().catch(() => null);
    try {
      if (token) {
        await apiLogout({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            refreshToken,
            ...(fcmToken ? { fcmToken } : {}),
          }),
        });
      }
    } catch {
      // Clear local session even if API call fails
    } finally {
      await revokeFirebaseToken().catch(() => undefined);
      clearTokens();
      clearImpersonationMeta();
      setImpersonation(null);
      setAccessToken(null);
      queryClient.clear();
      setLocation("/login");
    }
  }, [isImpersonating, stopImpersonation, queryClient, setLocation, user]);

  const isLoading = Boolean(accessToken && !isInitializing && isUserLoading);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        accessToken,
        isLoading,
        isInitializing,
        isImpersonating,
        impersonation,
        isStoppingImpersonation,
        login,
        logout,
        impersonate,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
