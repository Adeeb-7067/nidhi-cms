import React, { useState } from "react";
import {
  useGetProjectMembers,
  getGetProjectMembersQueryKey,
  useAddProjectMember,
  useRemoveProjectMember,
  useListUsers,
  type ProjectMember,
} from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, UserPlus, ChevronRight, ListTodo, Clock } from "lucide-react";
import { TeamMemberWorkSheet, type MemberWorkTab } from "@/components/project/TeamMemberWorkSheet";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { getListProjectsQueryKey } from "@/api";

const SUB_TYPES = ["Developer", "QA", "Project Manager", "Designer", "DevOps"] as const;

type ProjectTeamPanelProps = {
  projectId: number;
  /** Switch project hub to the Logs tab (e.g. from member sheet). */
  onViewProjectLogs?: () => void;
};

export function ProjectTeamPanel({ projectId, onViewProjectLogs }: ProjectTeamPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [subType, setSubType] = useState<string>("Developer");
  const [workSheetOpen, setWorkSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [workSheetTab, setWorkSheetTab] = useState<MemberWorkTab>("tasks");

  const { data: members, isLoading } = useGetProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectMembersQueryKey(projectId) },
  });

  const { data: usersData } = useListUsers({ limit: 200 });
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const assignedIds = new Set((members ?? []).map((m) => m.userId));
  const availableUsers = (usersData?.users ?? []).filter(
    (u) =>
      (u.role === "developer" || u.role === "tester") &&
      u.status === "active" &&
      !assignedIds.has(u.id),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const handleAdd = async () => {
    if (!userId) {
      toast.error("Select a team member");
      return;
    }
    try {
      await addMember.mutateAsync({
        id: projectId,
        data: { userId: parseInt(userId, 10), subType },
      });
      toast.success("Team member added");
      setOpen(false);
      setUserId("");
      setSubType("Developer");
      invalidate();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        "Failed to add member";
      toastApiError(err, msg);
    }
  };

  const openMemberWork = (member: ProjectMember, tab: MemberWorkTab) => {
    setSelectedMember(member);
    setWorkSheetTab(tab);
    setWorkSheetOpen(true);
  };

  const handleRemove = async (member: ProjectMember) => {
    try {
      await removeMember.mutateAsync({ id: projectId, userId: member.userId });
      toast.success(`${member.name} removed from project`);
      invalidate();
    } catch (err: unknown) {
      toastApiError(err, "Failed to remove member");
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Project team</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-sm">Add team member</DialogTitle>
                <DialogDescription className="text-xs">
                  Assign a developer or QA to this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs">Team member</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No available users
                        </SelectItem>
                      ) : (
                        availableUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name} ({u.role === "tester" ? "QA" : "Dev"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Role on project</Label>
                  <Select value={subType} onValueChange={setSubType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAdd}
                  disabled={addMember.isPending || !userId}
                >
                  {addMember.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Add to project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading team…</p>
        ) : !members?.length ? (
          <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-lg">
            No team members assigned. Use Add member to assign developers or QA.
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-2 p-3 border border-border rounded-lg bg-background/50 hover:bg-muted/30 transition-colors"
              >
                <button
                  type="button"
                  className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openMemberWork(member, "tasks")}
                  aria-label={`View tasks and logs for ${member.name}`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {member.subType || member.designation || "Team"} · {member.employeeId || "—"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-right hidden md:block mr-1">
                    <p className="text-xs font-medium">{member.completionPct}%</p>
                    <p className="text-[10px] text-muted-foreground">
                      Last log:{" "}
                      {member.lastLogDate
                        ? new Date(member.lastLogDate).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 hidden sm:inline-flex"
                    onClick={() => openMemberWork(member, "tasks")}
                  >
                    <ListTodo className="h-3 w-3 mr-1" />
                    Tasks
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 hidden sm:inline-flex"
                    onClick={() => openMemberWork(member, "logs")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Logs
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    aria-label={`Remove ${member.name}`}
                    disabled={removeMember.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(member);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <TeamMemberWorkSheet
        projectId={projectId}
        member={selectedMember}
        open={workSheetOpen}
        onOpenChange={setWorkSheetOpen}
        initialTab={workSheetTab}
        onViewProjectLogs={onViewProjectLogs}
      />
    </Card>
  );
}
