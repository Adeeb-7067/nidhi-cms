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

export function updateInventoryResource(
  projectId: number,
  id: number,
  data: Record<string, unknown>,
) {
  return inv<any>(`${projectId}/inventory/resources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteInventoryResource(projectId: number, id: number) {
  return inv<{ message: string }>(`${projectId}/inventory/resources/${id}`, { method: "DELETE" });
}

export const PROJECT_DESCRIPTION_CATEGORY = "project_description";

export type DescriptionResourceAttachment = {
  url: string;
  name: string;
  mimeType?: string | null;
  resourceId?: number;
};

export async function listProjectDescriptionResources(projectId: number) {
  const { resources } = await listInventoryResources(projectId, {
    category: PROJECT_DESCRIPTION_CATEGORY,
    limit: "50",
  });
  return resources;
}

export async function syncProjectDescriptionResources(
  projectId: number,
  attachments: DescriptionResourceAttachment[],
  baselineByUrl: Map<string, number>,
) {
  const currentUrls = new Set(attachments.map((a) => a.url).filter(Boolean));

  for (const att of attachments) {
    if (!att.url || baselineByUrl.has(att.url)) continue;
    await createInventoryResource(projectId, {
      name: att.name || "Project document",
      type: "document",
      fileUrl: att.url,
      mimeType: att.mimeType ?? undefined,
      category: PROJECT_DESCRIPTION_CATEGORY,
      visibility: "client_visible",
      tags: [PROJECT_DESCRIPTION_CATEGORY],
    });
  }

  for (const [url, id] of baselineByUrl.entries()) {
    if (!currentUrls.has(url)) {
      await deleteInventoryResource(projectId, id);
    }
  }
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
