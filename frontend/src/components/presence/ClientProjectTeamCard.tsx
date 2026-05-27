import { useGetProjectMembers, getGetProjectMembersQueryKey } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { TeamMemberPresenceRow } from "./TeamMemberPresenceRow";
import { useRefreshPresenceForUserIds } from "@/hooks/use-presence-refresh";
import { useMemo } from "react";

type ClientProjectTeamCardProps = {
  projectId: number | undefined;
  className?: string;
};

export function ClientProjectTeamCard({ projectId, className }: ClientProjectTeamCardProps) {
  const { data: members, isLoading } = useGetProjectMembers(projectId ?? 0, {
    query: {
      enabled: Boolean(projectId),
      queryKey: getGetProjectMembersQueryKey(projectId ?? 0),
    },
  });

  const memberIds = useMemo(() => members?.map((m) => m.userId) ?? [], [members]);
  useRefreshPresenceForUserIds(memberIds);

  const staffMembers = useMemo(
    () => (members ?? []).filter((m) => m.name && m.userId > 0),
    [members],
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-2 p-4 border-b">
        <CardTitle className="flex items-center text-sm font-semibold">
          <Users className="mr-2 h-4 w-4 text-violet-500" />
          Your project team
        </CardTitle>
        <CardDescription className="text-xs">
          Live presence and last login for developers working on this project
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : staffMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Team members will appear here once assigned to your project.
          </p>
        ) : (
          staffMembers.map((m) => (
            <TeamMemberPresenceRow key={m.userId} member={m} compact />
          ))
        )}
      </CardContent>
    </Card>
  );
}
