import React, { useState } from "react";
import {
  useGetProjectMembers,
  getGetProjectMembersQueryKey,
  useRemoveProjectMember,
  useListUsers,
  getListUsersQueryKey,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatUserRole } from "@/lib/bug-workflow";
import {
  Loader2,
  Trash2,
  UserPlus,
  ChevronRight,
  ListTodo,
  Clock,
  ChevronDown,
  X,
} from "lucide-react";
import { TeamMemberWorkSheet, type MemberWorkTab } from "@/components/project/TeamMemberWorkSheet";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { addProjectMembersBatch, getListProjectsQueryKey } from "@/api";

const SUB_TYPES = ["Developer", "QA", "Project Manager", "Designer", "DevOps"] as const;

type ProjectTeamPanelProps = {
  projectId: number;
  /** Switch project hub to the Logs tab (e.g. from member sheet). */
  onViewProjectLogs?: () => void;
};

export function ProjectTeamPanel({ projectId, onViewProjectLogs }: ProjectTeamPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [subType, setSubType] = useState<string>("Developer");
  const [workSheetOpen, setWorkSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [workSheetTab, setWorkSheetTab] = useState<MemberWorkTab>("tasks");

  const { data: members, isLoading } = useGetProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectMembersQueryKey(projectId) },
  });

  const staffParams = { staff: "1" as const, limit: 100 };
  const { data: usersData } = useListUsers(staffParams, {
    query: {
      queryKey: getListUsersQueryKey(staffParams),
      staleTime: 120_000,
    },
  });
  const [adding, setAdding] = useState(false);
  const removeMember = useRemoveProjectMember();

  const assignedIds = new Set((members ?? []).map((m) => m.userId));
  const availableUsers = (usersData?.users ?? []).filter(
    (u) =>
      (u.role === "developer" || u.role === "tester" || u.role === "qa") &&
      u.status === "active" &&
      !assignedIds.has(u.id),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const resetAddDialog = () => {
    setSelectedUserIds([]);
    setSubType("Developer");
  };

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return [...next];
    });
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Select at least one team member");
      return;
    }
    setAdding(true);
    try {
      const userIds = selectedUserIds.map((id) => Number.parseInt(id, 10));
      const result = await addProjectMembersBatch(projectId, userIds, subType);
      if (result.addedCount > 0) {
        toast.success(
          result.addedCount === 1
            ? "Team member added"
            : `${result.addedCount} team members added`,
        );
        invalidate();
        setOpen(false);
        resetAddDialog();
      }
      if (result.skippedCount > 0) {
        toast.error(
          result.skippedCount === userIds.length
            ? "No members were added (already on project or invalid)."
            : `${result.skippedCount} skipped (already assigned or invalid).`,
        );
      }
    } catch (err: unknown) {
      toastApiError(err, "Failed to add members");
    } finally {
      setAdding(false);
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
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) resetAddDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add members
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-sm">Add team members</DialogTitle>
                <DialogDescription className="text-xs">
                  Select one or more developers or QA to assign to this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs">Team members</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-between font-normal h-9 text-xs",
                          !selectedUserIds.length && "text-muted-foreground",
                        )}
                      >
                        {selectedUserIds.length
                          ? `${selectedUserIds.length} selected`
                          : "Select members"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                      {availableUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">
                          No available users — everyone active is already on this project.
                        </p>
                      ) : (
                        <div className="max-h-[240px] overflow-y-auto space-y-0.5">
                          {availableUsers.map((u) => {
                            const id = String(u.id);
                            const checked = selectedUserIds.includes(id);
                            return (
                              <label
                                key={u.id}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => toggleUser(id, c === true)}
                                />
                                <span className="flex-1 text-xs font-medium truncate">{u.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatUserRole(u.role)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedUserIds.map((id) => {
                        const u = availableUsers.find((x) => String(x.id) === id);
                        if (!u) return null;
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="text-[10px] font-normal gap-1 pr-1"
                          >
                            {u.name}
                            <button
                              type="button"
                              className="rounded-sm hover:bg-muted p-0.5"
                              aria-label={`Remove ${u.name}`}
                              onClick={() => toggleUser(id, false)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
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
                  onClick={() => void handleAdd()}
                  disabled={adding || selectedUserIds.length === 0}
                >
                  {adding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  {selectedUserIds.length > 1
                    ? `Add ${selectedUserIds.length} members`
                    : "Add to project"}
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
