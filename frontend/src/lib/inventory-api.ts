import { apiUrl } from "@/lib/api-base";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function inv<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(`/api/projects/${path}`), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type InventorySummary = {
  resources: number;
  credentials: number;
  environments: number;
  devices: number;
  subscriptions: number;
  builds: number;
};

export function getInventorySummary(projectId: number) {
  return inv<InventorySummary>(`${projectId}/inventory/summary`);
}

export function listInventoryResources(projectId: number, params?: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return inv<{ resources: any[]; total: number }>(`${projectId}/inventory/resources?${q}`);
}

export function createInventoryResource(projectId: number, data: Record<string, unknown>) {
  return inv<any>(`${projectId}/inventory/resources`, { method: "POST", body: JSON.stringify(data) });
}

export function listInventoryCredentials(projectId: number) {
  return inv<any[]>(`${projectId}/inventory/credentials`);
}

export function createInventoryCredential(projectId: number, data: Record<string, unknown>) {
  return inv<any>(`${projectId}/inventory/credentials`, { method: "POST", body: JSON.stringify(data) });
}

export function revealCredential(projectId: number, id: number, password: string) {
  return inv<any>(`${projectId}/inventory/credentials/${id}/reveal`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function listInventoryEnvironments(projectId: number) {
  return inv<any[]>(`${projectId}/inventory/environments`);
}

export function createInventoryEnvironment(projectId: number, data: Record<string, unknown>) {
  return inv<any>(`${projectId}/inventory/environments`, { method: "POST", body: JSON.stringify(data) });
}

export function listInventoryDevices(projectId: number) {
  return inv<any[]>(`${projectId}/inventory/devices`);
}

export function listInventorySubscriptions(projectId: number) {
  return inv<any[]>(`${projectId}/inventory/subscriptions`);
}

export function listInventoryBuilds(projectId: number) {
  return inv<{ builds: any[] }>(`${projectId}/inventory/builds`);
}

export function listInventoryActivities(projectId: number) {
  return inv<{ activities: any[] }>(`${projectId}/inventory/activities?limit=50`);
}
