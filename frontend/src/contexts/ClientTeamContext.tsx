import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useClientTeamMe,
  type ClientTeamMeResponse,
} from "@/api/client-team";
import {
  CLIENT_PORTAL_SECTIONS,
  CLIENT_SECTION_LABELS,
  hasPermission,
  type ClientPermissionLevel,
  type ClientPortalSection,
} from "@/lib/client-team";

export interface ClientTeamContextValue {
  isClientUser: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  companyId: number | null;
  companyName: string | null;
  memberId: number | null;
  permissions: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
  /** Returns true when the current user has at least `level` for `section`. */
  can: (section: ClientPortalSection, level?: ClientPermissionLevel) => boolean;
  refetch: () => Promise<unknown>;
  data: ClientTeamMeResponse | null;
}

const ClientTeamContext = createContext<ClientTeamContextValue | undefined>(undefined);

const FALLBACK_VALUE: ClientTeamContextValue = {
  isClientUser: false,
  isAdmin: false,
  isLoading: false,
  companyId: null,
  companyName: null,
  memberId: null,
  permissions: {},
  can: () => false,
  refetch: async () => null,
  data: null,
};

export function ClientTeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const enabled = Boolean(user && user.role === "client");
  // Keep this short so a team member's portal reflects permission changes
  // made by their Client Admin within seconds rather than after a long
  // cache TTL. Window-focus refetch picks up changes when they tab back in.
  const { data, isLoading, refetch } = useClientTeamMe({
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const can = useCallback(
    (section: ClientPortalSection, level: ClientPermissionLevel = "view") => {
      if (!enabled) return false;
      if (data?.isAdmin) return true;
      const granted = data?.permissions?.[section];
      return hasPermission(granted, level);
    },
    [enabled, data],
  );

  const value = useMemo<ClientTeamContextValue>(() => {
    if (!enabled) return FALLBACK_VALUE;
    return {
      isClientUser: data?.isClientUser ?? false,
      isAdmin: data?.isAdmin ?? false,
      isLoading,
      companyId: data?.companyId ?? null,
      companyName: data?.companyName ?? null,
      memberId: data?.memberId ?? null,
      permissions: data?.permissions ?? {},
      can,
      refetch,
      data: data ?? null,
    };
  }, [enabled, data, isLoading, can, refetch]);

  return <ClientTeamContext.Provider value={value}>{children}</ClientTeamContext.Provider>;
}

export function useClientTeam(): ClientTeamContextValue {
  const ctx = useContext(ClientTeamContext);
  return ctx ?? FALLBACK_VALUE;
}

/** Convenience hook: true when the user can perform `level` on `section`. */
export function useClientPermission(
  section: ClientPortalSection,
  level: ClientPermissionLevel = "view",
): boolean {
  const { can } = useClientTeam();
  return can(section, level);
}

/** All sections the current user can at least view, in canonical order. */
export function useVisibleClientSections(): ClientPortalSection[] {
  const { can } = useClientTeam();
  return CLIENT_PORTAL_SECTIONS.filter((section) => can(section, "view"));
}

export { CLIENT_SECTION_LABELS };
