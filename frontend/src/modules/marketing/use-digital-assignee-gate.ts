import { useAuth } from "@/contexts/AuthContext";
import { useMarketingAccounts } from "@/api/marketing";
import { useGetProjectMembers, getGetProjectMembersQueryKey } from "@/api";
import { canAssignDigitalTasksToOthers, isDigitalElevatedLead } from "@/lib/cms-project-manage";

/**
 * Resolve whether the current user may assign digital work to others for an account,
 * and the projectId used to scope the assignee picker to the project roster.
 */
export function useDigitalAssigneeGate(accountId: number | null | undefined) {
  const { user } = useAuth();
  const { data: accountsData } = useMarketingAccounts();
  const accounts = accountsData?.accounts ?? [];
  const activeAccount =
    accountId != null && Number.isFinite(Number(accountId))
      ? (accounts.find((a) => a.id === Number(accountId)) ?? null)
      : null;
  const projectId = activeAccount?.projectId ?? null;
  const elevated = isDigitalElevatedLead(user);

  const { data: projectMembers } = useGetProjectMembers(projectId ?? 0, {
    query: {
      enabled: projectId != null && !elevated,
      queryKey: getGetProjectMembersQueryKey(projectId ?? 0),
      staleTime: 60_000,
    },
  });
  const myProjectMember = (projectMembers ?? []).find(
    (m) => Number(m.userId) === Number(user?.id),
  );

  const canAssignOthers = canAssignDigitalTasksToOthers(user, {
    projectMemberSubType: myProjectMember?.subType,
    accountManagerId: activeAccount?.accountManagerId,
  });

  return {
    user,
    activeAccount,
    projectId,
    canAssignOthers,
    isElevatedLead: elevated,
  };
}
