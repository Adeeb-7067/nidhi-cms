import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { apiUrl } from "@/lib/api-base";

export interface ProjectClientContact {
  userId: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  title: string | null;
  isAdmin: boolean;
  status: string;
}

export interface ProjectClientTeamResponse {
  primaryContact: ProjectClientContact | null;
  members: ProjectClientContact[];
}

export const getProjectClientTeamQueryKey = (projectId: number) =>
  ["project-client-team", projectId] as const;

export function useGetProjectClientTeam(projectId: number, enabled = true) {
  return useQuery<ProjectClientTeamResponse>({
    queryKey: getProjectClientTeamQueryKey(projectId),
    queryFn: () =>
      customFetch<ProjectClientTeamResponse>(
        apiUrl(`/api/projects/${projectId}/client-team`),
      ),
    enabled: enabled && !!projectId,
    staleTime: 60_000,
  });
}
