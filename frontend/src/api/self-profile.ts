import { customFetch } from "@/api/custom-fetch";
import type { User } from "@/api";
import type { TeamEmployeeRecord } from "@/api/team-employees";

/** PATCH /auth/me with full self-service employee profile fields. */
export async function patchSelfProfile(body: Record<string, unknown>): Promise<User> {
  return customFetch<User>("/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** GET /users/:id — same full record the admin team employee form uses (own user allowed). */
export async function fetchSelfEmployeeProfile(userId: number, signal?: AbortSignal) {
  return customFetch<TeamEmployeeRecord>(`/users/${userId}`, { signal });
}
