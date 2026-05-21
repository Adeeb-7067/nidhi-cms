/** Preserves super-admin tokens while viewing the app as another user. */

export const IMPERSONATION_META_KEY = "cms:impersonationMeta";

export type ImpersonationMeta = {
  adminAccessToken: string;
  adminRefreshToken: string;
  adminUser: { id: number; name: string; role: string };
  targetUser: { id: number; name: string; role: string };
};

export function getImpersonationMeta(): ImpersonationMeta | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(IMPERSONATION_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationMeta;
  } catch {
    return null;
  }
}

export function setImpersonationMeta(meta: ImpersonationMeta): void {
  localStorage.setItem(IMPERSONATION_META_KEY, JSON.stringify(meta));
}

export function clearImpersonationMeta(): void {
  localStorage.removeItem(IMPERSONATION_META_KEY);
}

export function isImpersonating(): boolean {
  return getImpersonationMeta() !== null;
}
