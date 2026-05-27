import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";
import { ApiError } from "@/api";
import { fetchPresence, postPresenceHeartbeat } from "@/api/presence";
import {
  mergeUserPresence,
  type PresenceStatus,
  type UserPresence,
} from "@/lib/presence";

type PresenceContextValue = {
  getPresence: (userId: number) => UserPresence | undefined;
  getStatus: (userId: number) => PresenceStatus;
  refreshPresence: (userIds?: number[]) => Promise<void>;
  signalActive: () => void;
};

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

const HEARTBEAT_INTERVAL_MS = 30_000;
/** Avoid burst heartbeats on route change + focus + mount. */
const HEARTBEAT_MIN_GAP_MS = 4_000;

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function normalizePresenceMap(
  raw: Record<string, UserPresence>,
): Record<number, UserPresence> {
  const out: Record<number, UserPresence> = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = Number(key);
    if (!Number.isFinite(id)) continue;
    out[id] = { ...value, userId: value.userId ?? id };
  }
  return out;
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const [location] = useLocation();
  const [byUserId, setByUserId] = useState<Record<number, UserPresence>>({});
  const presenceApiEnabledRef = useRef(true);
  const lastHeartbeatAtRef = useRef(0);

  const applyUpdate = useCallback((snap: UserPresence) => {
    const id = Number(snap.userId);
    if (!Number.isFinite(id)) return;
    setByUserId((prev) => ({ ...prev, [id]: { ...snap, userId: id } }));
  }, []);

  const markPresenceApiUnavailable = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) {
      presenceApiEnabledRef.current = false;
    }
  }, []);

  const refreshPresence = useCallback(async (userIds?: number[]) => {
    if (!user || !presenceApiEnabledRef.current) return;
    try {
      const { presence } = await fetchPresence(userIds);
      setByUserId((prev) => ({ ...prev, ...normalizePresenceMap(presence) }));
    } catch (err) {
      markPresenceApiUnavailable(err);
    }
  }, [user, markPresenceApiUnavailable]);

  const sendHeartbeat = useCallback(
    (options?: { force?: boolean }) => {
      if (!user) return;

      const now = Date.now();
      if (!options?.force && now - lastHeartbeatAtRef.current < HEARTBEAT_MIN_GAP_MS) {
        return;
      }
      lastHeartbeatAtRef.current = now;

      const tabVisible = isTabVisible();
      socket?.emit("presence:heartbeat", { tabVisible });

      if (!presenceApiEnabledRef.current) return;
      void postPresenceHeartbeat({ tabVisible })
        .then(applyUpdate)
        .catch(markPresenceApiUnavailable);
    },
    [user, socket, applyUpdate, markPresenceApiUnavailable],
  );

  const signalActive = useCallback(() => {
    sendHeartbeat({ force: true });
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!user) return;
    void refreshPresence();
  }, [user?.id, refreshPresence]);

  useEffect(() => {
    if (!user) return;

    sendHeartbeat({ force: true });
    const interval = setInterval(() => sendHeartbeat({ force: true }), HEARTBEAT_INTERVAL_MS);

    const onActivity = () => sendHeartbeat();
    document.addEventListener("visibilitychange", onActivity);
    window.addEventListener("focus", onActivity);
    window.addEventListener("pageshow", onActivity);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onActivity);
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("pageshow", onActivity);
    };
  }, [user, sendHeartbeat]);

  useEffect(() => {
    if (!user) return;
    sendHeartbeat();
  }, [location, user, sendHeartbeat]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (snap: UserPresence) => applyUpdate(snap);
    socket.on("presence:update", onUpdate);
    return () => {
      socket.off("presence:update", onUpdate);
    };
  }, [socket, applyUpdate]);

  const getPresence = useCallback(
    (userId: number) => byUserId[userId],
    [byUserId],
  );

  const getStatus = useCallback(
    (userId: number): PresenceStatus => byUserId[userId]?.status ?? "offline",
    [byUserId],
  );

  const value = useMemo(
    () => ({ getPresence, getStatus, refreshPresence, signalActive }),
    [getPresence, getStatus, refreshPresence, signalActive],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("usePresence must be used within PresenceProvider");
  }
  return ctx;
}

export function useUserWithPresence<T extends { id: number }>(user: T | null | undefined) {
  const { getPresence } = usePresence();
  return useMemo(() => {
    if (!user) return null;
    return mergeUserPresence(user, getPresence(user.id));
  }, [user, getPresence]);
}
