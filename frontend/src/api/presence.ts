import { customFetch } from "./custom-fetch";
import type { UserPresence } from "@/lib/presence";

export type PresenceMapResult = {
  presence: Record<string, UserPresence>;
};

export type PresenceHeartbeatInput = {
  /** false when the CMS tab is in the background */
  tabVisible?: boolean;
};

export async function fetchPresence(ids?: number[]): Promise<PresenceMapResult> {
  const qs =
    ids && ids.length > 0
      ? `?ids=${ids.map(String).join(",")}`
      : "";
  return customFetch<PresenceMapResult>(`/api/presence${qs}`);
}

export async function fetchMyPresence(): Promise<UserPresence> {
  return customFetch<UserPresence>("/api/presence/me");
}

export async function postPresenceHeartbeat(
  input?: PresenceHeartbeatInput,
): Promise<UserPresence> {
  return customFetch<UserPresence>("/api/presence/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabVisible: input?.tabVisible !== false,
    }),
  });
}

export function presenceQueryKey(ids?: number[]) {
  return ["/api/presence", ids?.slice().sort((a, b) => a - b).join(",") ?? "live"] as const;
}
