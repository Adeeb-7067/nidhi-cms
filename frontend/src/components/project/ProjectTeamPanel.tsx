import React, { useMemo, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatUserRole } from "@/lib/bug-workflow";
import { isStaffEmployeeRole } from "@/lib/user-roles";
import { FreelancerEngagementDialog } from "@/components/project/FreelancerEngagementDialog";
import { usePermissions } from "@/modules/permissions/usePermission";
import {
  Loader2,
  Trash2,
  UserPlus,
  ChevronRight,
  ListTodo,
  Clock,
  ChevronDown,
  X,
  Wallet,
  Pencil,
} from "lucide-react";
import { TeamMemberWorkSheet, type MemberWorkTab } from "@/components/project/TeamMemberWorkSheet";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useQueryClient } from "@tanstack/react-query";
import { addProjectMembersBatch, updateProjectMember, getListProjectsQueryKey } from "@/api";

function employeeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return (parts[0]?.charAt(0) ?? "?").toUpperCase();
}

function EmployeeAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("h-8 w-8 shrink-0", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
        {employeeInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const DEV_SUB_TYPES = ["Developer", "QA", "Project Manager", "Designer", "DevOps", "Freelancer"] as const;
const DIGITAL_SUB_TYPES = [
  "Digital Specialist",
  "Content Creator",
  "Account Manager",
  "Designer",
  "Ads Manager",
  "Video Editor",
  "SEO Expert",
  "Freelancer",
] as const;

type ProjectTeamPanelProps = {
  projectId: number;
  /** Switch project hub to the Logs tab (e.g. from member sheet). */
  onViewProjectLogs?: () => void;
  /** Digital projects: filter roster to digital team roles and labels. */
  variant?: "development" | "digital";
  /** Show add/remove controls (API allows super_admin only). */
  canManage?: boolean;
};

export function ProjectTeamPanel({
  projectId,
  onViewProjectLogs,
  variant = "development",
  canManage = true,
}: ProjectTeamPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const subTypes = variant === "digital" ? DIGITAL_SUB_TYPES : DEV_SUB_TYPES;
  const [subType, setSubType] = useState<string>(subTypes[0]);
  const [editMember, setEditMember] = useState<ProjectMember | null>(null);
  const [editSubType, setEditSubType] = useState<string>(subTypes[0]);
  const [editing, setEditing] = useState(false);
  const [workSheetOpen, setWorkSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [workSheetTab, setWorkSheetTab] = useState<MemberWorkTab>("tasks");

  const { data: members, isLoading } = useGetProjectMembers(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectMembersQueryKey(projectId) },
  });

  const staffParams = { staff: "1" as const, limit: 300 };
  const { data: usersData } = useListUsers(staffParams, {
    query: {
      queryKey: getListUsersQueryKey(staffParams),
      staleTime: 120_000,
    },
  });
  const [adding, setAdding] = useState(false);
  const removeMember = useRemoveProjectMember();
  const { can } = usePermissions();
  const canManagePay = can("finance_freelancers", "create") || can("finance_freelancers", "edit");
  const [payMember, setPayMember] = useState<{ userId: number; name: string } | null>(null);
  /** Freelancers just added — fee dialogs open one after another for expense tracking. */
  const [payQueue, setPayQueue] = useState<{ userId: number; name: string }[]>([]);

  const assignedIds = new Set((members ?? []).map((m) => m.userId));
  const userById = useMemo(() => {
    const map = new Map<number, { id: number; role?: string; name: string; avatarUrl?: string | null }>();
    for (const u of usersData?.users ?? []) map.set(u.id, u);
    return map;
  }, [usersData?.users]);

  const availableUsers = (usersData?.users ?? []).filter((u) => {
    if (u.status !== "active" || assignedIds.has(u.id)) return false;
    if (variant === "digital") {
      return (
        u.role === "digital" ||
        u.role === "freelancer" ||
        u.role === "manager" ||
        u.role === "super_admin"
      );
    }
    return isStaffEmployeeRole(u.role) && u.role !== "digital";
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetProjectMembersQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  };

  const resetAddDialog = () => {
    setSelectedUserIds([]);
    setSubType(subTypes[0]);
  };

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      const ids = [...next];
      // Default project role to Freelancer when every selected person is a freelancer.
      if (ids.length > 0 && ids.every((uid) => userById.get(Number(uid))?.role === "freelancer")) {
        setSubType("Freelancer");
      }
      return ids;
    });
  };

  const openFeeDialogsFor = (people: { userId: number; name: string }[]) => {
    if (!canManagePay || people.length === 0) return;
    setPayQueue(people);
    setPayMember(people[0] ?? null);
  };

  const advanceFeeQueue = () => {
    setPayQueue((queue) => {
      const rest = queue.slice(1);
      setPayMember(rest[0] ?? null);
      return rest;
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
        // Capture project fee right after hire so finance can track expenses.
        const freelancersToPay = result.added
          .filter((m) => userById.get(m.userId)?.role === "freelancer")
          .map((m) => ({ userId: m.userId, name: m.name }));
        if (freelancersToPay.length > 0) {
          openFeeDialogsFor(freelancersToPay);
          if (canManagePay) {
            toast.message(
              freelancersToPay.length === 1
                ? "Set the project fee for this freelancer"
                : `Set project fees for ${freelancersToPay.length} freelancers`,
            );
          }
        }
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

  const openEditMember = (member: ProjectMember) => {
    const current = member.subType && (subTypes as readonly string[]).includes(member.subType)
      ? member.subType
      : subTypes[0];
    setEditSubType(current);
    setEditMember(member);
  };

  const handleEditMember = async () => {
    if (!editMember) return;
    setEditing(true);
    try {
      await updateProjectMember(projectId, editMember.userId, { subType: editSubType });
      toast.success(`Updated ${editMember.name}'s role on this project`);
      setEditMember(null);
      invalidate();
    } catch (err: unknown) {
      toastApiError(err, "Failed to update member");
    } finally {
      setEditing(false);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Project team</CardTitle>
          {canManage ? (
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
                  {variant === "digital"
                    ? "Select digital specialists or freelancers to assign to this project."
                    : "Select developers, QA, or freelancers to assign to this project."}
                  {canManagePay
                    ? " Freelancers will be asked for their project fee next (expense tracking)."
                    : ""}
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
                                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => toggleUser(id, c === true)}
                                />
                                <EmployeeAvatar
                                  name={u.name}
                                  avatarUrl={u.avatarUrl}
                                  className="h-7 w-7"
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
                            className="text-[10px] font-normal gap-1.5 pl-1 pr-1"
                          >
                            <EmployeeAvatar
                              name={u.name}
                              avatarUrl={u.avatarUrl}
                              className="h-4 w-4"
                            />
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
                      {subTypes.map((t) => (
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
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading team…</p>
        ) : !members?.length ? (
          <div className="text-center py-8 text-muted-foreground text-xs border border-dashed rounded-lg">
            {variant === "digital"
              ? "No digital team assigned yet."
              : "No team members assigned. Use Add member to assign developers or QA."}
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
                  <EmployeeAvatar
                    name={member.name}
                    avatarUrl={
                      member.avatarUrl ?? userById.get(member.userId)?.avatarUrl ?? null
                    }
                  />
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
                  {canManagePay &&
                  (userById.get(member.userId)?.role === "freelancer" ||
                    member.subType === "Freelancer") ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        const person = { userId: member.userId, name: member.name };
                        setPayQueue([person]);
                        setPayMember(person);
                      }}
                    >
                      <Wallet className="h-3 w-3 mr-1" />
                      Pay
                    </Button>
                  ) : null}
                  {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Edit ${member.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditMember(member);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  ) : null}
                  {canManage ? (
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
                  ) : null}
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

      {payMember ? (
        <FreelancerEngagementDialog
          open={!!payMember}
          onOpenChange={(next) => {
            if (!next) advanceFeeQueue();
          }}
          projectId={projectId}
          userId={payMember.userId}
          freelancerName={payMember.name}
          intent="hire"
          queueHint={
            payQueue.length > 1 ? `${payQueue.length} freelancers left` : undefined
          }
        />
      ) : null}

      <Dialog
        open={!!editMember}
        onOpenChange={(next) => {
          if (!next) setEditMember(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit team member</DialogTitle>
            <DialogDescription className="text-xs">
              Update {editMember?.name ?? "member"}&apos;s role on this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <EmployeeAvatar
                name={editMember?.name ?? ""}
                avatarUrl={
                  editMember?.avatarUrl ??
                  (editMember ? userById.get(editMember.userId)?.avatarUrl : null) ??
                  null
                }
              />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{editMember?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {editMember?.employeeId || "—"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Role on project</Label>
              <Select value={editSubType} onValueChange={setEditSubType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleEditMember()}
              disabled={editing || !editMember}
            >
              {editing && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
