import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Plus,
  Mail,
  KeyRound,
  Power,
  PowerOff,
  ShieldCheck,
  Activity,
  RefreshCw,
  Search,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useClientTeam } from "@/contexts/ClientTeamContext";
import {
  useClientTeamMembers,
  useCreateClientTeamMember,
  useDeactivateClientTeamMember,
  useReactivateClientTeamMember,
  useResendClientTeamInvitation,
  useResetClientTeamMemberPassword,
  useUpdateClientTeamMember,
  useUpdateClientTeamMemberPermissions,
  type ClientTeamMember,
} from "@/api/client-team";
import {
  CLIENT_PERMISSION_LABELS,
  CLIENT_PERMISSION_LEVELS,
  CLIENT_PORTAL_SECTIONS,
  CLIENT_SECTION_DESCRIPTIONS,
  CLIENT_SECTION_LABELS,
  defaultMemberPermissions,
  memberStatusBadgeClass,
  permissionBadgeClass,
  type ClientPermissionLevel,
  type ClientPortalSection,
} from "@/lib/client-team";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  PortalContentCard,
  PortalEmptyState,
} from "@/components/layout/portal-page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* =================================================================== */

function memberInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function statusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending invitation";
  if (status === "inactive") return "Inactive";
  return status;
}

/* =================================================================== */
/*                       Permission editor (shared)                     */
/* =================================================================== */

interface PermissionEditorProps {
  permissions: Partial<Record<ClientPortalSection, ClientPermissionLevel>>;
  onChange: (next: Partial<Record<ClientPortalSection, ClientPermissionLevel>>) => void;
  disabled?: boolean;
}

function PermissionEditor({ permissions, onChange, disabled }: PermissionEditorProps) {
  function setLevel(section: ClientPortalSection, level: ClientPermissionLevel) {
    onChange({ ...permissions, [section]: level });
  }

  return (
    <div className="space-y-2">
      {CLIENT_PORTAL_SECTIONS.map((section) => {
        const level = (permissions[section] ?? "none") as ClientPermissionLevel;
        return (
          <div
            key={section}
            className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{CLIENT_SECTION_LABELS[section]}</p>
              <p className="text-xs text-muted-foreground">
                {CLIENT_SECTION_DESCRIPTIONS[section]}
              </p>
            </div>
            <Select
              value={level}
              onValueChange={(value) =>
                setLevel(section, value as ClientPermissionLevel)
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_PERMISSION_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {CLIENT_PERMISSION_LABELS[lvl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

/* =================================================================== */
/*                            Add member dialog                         */
/* =================================================================== */

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sendInvitationEmail, setSendInvitationEmail] = useState(true);
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [permissions, setPermissions] = useState<
    Partial<Record<ClientPortalSection, ClientPermissionLevel>>
  >(defaultMemberPermissions());
  const create = useCreateClientTeamMember();

  function reset() {
    setName("");
    setEmail("");
    setTitle("");
    setPhoneNumber("");
    setSendInvitationEmail(true);
    setUseCustomPassword(false);
    setCustomPassword("");
    setPermissions(defaultMemberPermissions());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter the team member's name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter a valid email.");
      return;
    }
    if (useCustomPassword && customPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        sendInvitationEmail,
        permissions,
        ...(useCustomPassword ? { password: customPassword } : {}),
      },
      {
        onSuccess: (data) => {
          if (data.invitation.sent) {
            toast.success(
              `Invitation sent to ${email}. They can sign in once they receive it.`,
            );
          } else if (useCustomPassword) {
            toast.success(`Team member added with the password you set.`);
          } else {
            toast.success(
              `Team member added. Share their temporary password: ${data.invitation.temporaryPassword ?? ""}`,
              { duration: 12_000 },
            );
          }
          reset();
          onOpenChange(false);
        },
        onError: (err) => toastApiError(err),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Create a separate login for someone in your company. They'll get
            their own credentials and only see what you allow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-name">Full name</Label>
              <Input
                id="ct-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-email">Login email</Label>
              <Input
                id="ct-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-title">Title or role</Label>
              <Input
                id="ct-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Project Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-phone">Phone (optional)</Label>
              <Input
                id="ct-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={useCustomPassword}
              onChange={(e) => setUseCustomPassword(e.target.checked)}
            />
            <span className="flex-1">
              <span className="font-medium">Set the password manually.</span>
              <br />
              <span className="text-muted-foreground">
                Leave unchecked to auto-generate a secure temporary password.
              </span>
              {useCustomPassword ? (
                <Input
                  type="text"
                  className="mt-2 h-9 font-mono text-sm"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              ) : null}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={sendInvitationEmail}
              onChange={(e) => setSendInvitationEmail(e.target.checked)}
            />
            <span>
              <span className="font-medium">Send invitation email with login details.</span>
              <br />
              <span className="text-muted-foreground">
                {useCustomPassword
                  ? "The email will include the password you typed above."
                  : "If unchecked, you'll get a temporary password to share manually."}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Permissions</p>
            <p className="text-xs text-muted-foreground">
              Choose what this team member can see and do.
            </p>
            <PermissionEditor
              permissions={permissions}
              onChange={setPermissions}
              disabled={create.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Inviting…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =================================================================== */
/*                         Edit member side sheet                       */
/* =================================================================== */

interface EditMemberSheetProps {
  member: ClientTeamMember | null;
  onClose: () => void;
}

function EditMemberSheet({ member, onClose }: EditMemberSheetProps) {
  const update = useUpdateClientTeamMember();
  const updatePerms = useUpdateClientTeamMemberPermissions();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [permissions, setPermissions] = useState<
    Partial<Record<ClientPortalSection, ClientPermissionLevel>>
  >({});

  // Re-seed the form whenever a different member is selected. Avoids stale
  // values flashing when the sheet opens for a second member.
  useEffect(() => {
    if (!member) return;
    setName(member.name ?? "");
    setEmail(member.email ?? "");
    setTitle(member.title ?? "");
    setPhoneNumber(member.phoneNumber ?? "");
    setPermissions(member.permissions ?? defaultMemberPermissions());
  }, [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDetailsSave() {
    if (!member) return;
    if (!name.trim()) {
      toast.error("Name cannot be blank.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email cannot be blank.");
      return;
    }
    update.mutate(
      {
        id: member.id,
        name: name.trim(),
        email: email.trim(),
        title: title.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      },
      {
        onSuccess: () => toast.success("Team member updated."),
        onError: (err) => toastApiError(err),
      },
    );
  }

  function handlePermissionsSave() {
    if (!member) return;
    updatePerms.mutate(
      { id: member.id, permissions },
      {
        onSuccess: () => toast.success("Permissions updated."),
        onError: (err) => toastApiError(err),
      },
    );
  }

  return (
    <Sheet open={!!member} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit team member</SheetTitle>
          <SheetDescription>
            Update details and permissions for{" "}
            <span className="font-medium">{member?.name}</span>.
          </SheetDescription>
        </SheetHeader>

        {member ? (
          <div className="mt-6 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Full name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Login email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleDetailsSave} disabled={update.isPending}>
                  {update.isPending ? "Saving…" : "Save details"}
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Permissions</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissions(defaultMemberPermissions())}
                  disabled={updatePerms.isPending}
                >
                  Reset to defaults
                </Button>
              </div>
              <PermissionEditor
                permissions={permissions}
                onChange={setPermissions}
                disabled={updatePerms.isPending}
              />
              <div className="flex justify-end">
                <Button onClick={handlePermissionsSave} disabled={updatePerms.isPending}>
                  {updatePerms.isPending ? "Saving…" : "Save permissions"}
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* =================================================================== */
/*                              Main page                               */
/* =================================================================== */

export default function ClientTeamPage() {
  const { user } = useAuth();
  const team = useClientTeam();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "pending" | "inactive">("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ClientTeamMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ClientTeamMember | null>(null);
  const [resetting, setResetting] = useState<ClientTeamMember | null>(null);

  const isAdmin = team.isAdmin;
  const list = useClientTeamMembers(
    { search: search || undefined, status: statusFilter || undefined, limit: 200 },
    isAdmin,
  );
  const deactivate = useDeactivateClientTeamMember();
  const reactivate = useReactivateClientTeamMember();
  const resendInvite = useResendClientTeamInvitation();
  const resetPassword = useResetClientTeamMemberPassword();

  if (!user || user.role !== "client") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          This page is only available to client accounts.
        </p>
      </div>
    );
  }

  if (team.isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </PortalPageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PortalPageShell>
        <PortalPageHero
          badge="Client team"
          title="Team management"
          subtitle="Only the Client Admin for your company can invite and manage team members."
        />
        <PortalEmptyState
          icon={ShieldCheck}
          title="You don't have permission to manage the team"
          description="Ask your company's primary contact to grant access or invite new members."
        />
      </PortalPageShell>
    );
  }

  const members = list.data?.members ?? [];
  const total = list.data?.total ?? 0;
  const counts = {
    active: members.filter((m) => m.status === "active").length,
    pending: members.filter((m) => m.status === "pending").length,
    inactive: members.filter((m) => m.status === "inactive").length,
  };

  function handleResendInvite(member: ClientTeamMember) {
    resendInvite.mutate(member.id, {
      onSuccess: (data) => {
        if (data.invitation.sent) {
          toast.success(`Invitation re-sent to ${member.email}.`);
        } else {
          toast.success(
            `New temporary password: ${data.invitation.temporaryPassword ?? ""}. Share it manually.`,
            { duration: 12_000 },
          );
        }
      },
      onError: (err) => toastApiError(err),
    });
  }

  function handleResetPassword() {
    if (!resetting) return;
    resetPassword.mutate(
      { id: resetting.id },
      {
        onSuccess: (data) => {
          toast.success(
            data.temporaryPassword
              ? `New temporary password: ${data.temporaryPassword}. Share it manually.`
              : "Password reset.",
            { duration: 12_000 },
          );
          setResetting(null);
        },
        onError: (err) => toastApiError(err),
      },
    );
  }

  function handleDeactivate() {
    if (!confirmDeactivate) return;
    deactivate.mutate(confirmDeactivate.id, {
      onSuccess: () => {
        toast.success(`${confirmDeactivate.name ?? "Team member"} deactivated.`);
        setConfirmDeactivate(null);
      },
      onError: (err) => toastApiError(err),
    });
  }

  return (
    <PortalPageShell>
      <PortalPageHero
        badge="Client team"
        title={team.companyName ? `${team.companyName} — Team` : "Team management"}
        subtitle="Invite team members, manage their permissions, and review activity."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link href="/client/team/activity">
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                View activity
              </Link>
            </Button>
            <Button onClick={() => setAddOpen(true)} size="sm" className="h-9 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Invite member
            </Button>
          </div>
        }
      />

      <PortalKpiGrid
        loading={list.isLoading}
        items={[
          {
            title: "Total members",
            value: String(total),
            icon: Users,
            hint: "Including any pending invitations.",
          },
          {
            title: "Active",
            value: String(counts.active),
            icon: ShieldCheck,
            hint: "Signed in and using the portal.",
            accent: "green",
          },
          {
            title: "Pending",
            value: String(counts.pending),
            icon: Mail,
            hint: "Invited but haven't logged in yet.",
            accent: "amber",
          },
          {
            title: "Inactive",
            value: String(counts.inactive),
            icon: PowerOff,
            hint: "Deactivated — no portal access.",
          },
        ]}
      />

      <PortalContentCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? "" : (value as typeof statusFilter))
              }
            >
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => list.refetch()}
              disabled={list.isFetching}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", list.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {list.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <PortalEmptyState
            icon={Users}
            title="No team members yet"
            description="Invite your first team member to share controlled access to your projects."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/60">
                          <AvatarImage src={m.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                            {memberInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{m.name ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.email ?? ""}</p>
                          {m.title ? (
                            <p className="truncate text-[11px] text-muted-foreground/80">
                              {m.title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-medium", memberStatusBadgeClass(m.status))}
                      >
                        {statusLabel(m.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const visible = CLIENT_PORTAL_SECTIONS.slice(0, 4);
                          const visibleNonNone = visible.filter(
                            (s) => ((m.permissions[s] ?? "none") as ClientPermissionLevel) !== "none",
                          );
                          const remaining = CLIENT_PORTAL_SECTIONS.length - visible.length;
                          return (
                            <>
                              {visibleNonNone.map((section) => {
                                const lvl = (m.permissions[section] ?? "none") as ClientPermissionLevel;
                                return (
                                  <Tooltip key={section}>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className={cn("text-[10px]", permissionBadgeClass(lvl))}
                                      >
                                        {CLIENT_SECTION_LABELS[section].split(" ")[0]}: {lvl}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {CLIENT_SECTION_LABELS[section]}: {CLIENT_PERMISSION_LABELS[lvl]}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {remaining > 0 ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="cursor-default text-[10px] text-muted-foreground"
                                    >
                                      + {remaining} more
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    <div className="space-y-0.5">
                                      {CLIENT_PORTAL_SECTIONS.map((section) => {
                                        const lvl = (m.permissions[section] ?? "none") as ClientPermissionLevel;
                                        return (
                                          <div key={section} className="flex justify-between gap-3">
                                            <span>{CLIENT_SECTION_LABELS[section]}</span>
                                            <span className="font-mono text-[10px]">
                                              {CLIENT_PERMISSION_LABELS[lvl]}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {m.lastLoginAt
                          ? formatDistanceToNow(new Date(m.lastLoginAt), { addSuffix: true })
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => setEditing(m)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit details & permissions</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => handleResendInvite(m)}
                              disabled={resendInvite.isPending}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Resend invitation / new password</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => setResetting(m)}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reset password</TooltipContent>
                        </Tooltip>
                        {m.status === "inactive" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() =>
                                  reactivate.mutate(m.id, {
                                    onSuccess: () => toast.success(`${m.name} reactivated.`),
                                    onError: (err) => toastApiError(err),
                                  })
                                }
                                disabled={reactivate.isPending}
                              >
                                <Power className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reactivate account</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => setConfirmDeactivate(m)}
                              >
                                <PowerOff className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate account</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PortalContentCard>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditMemberSheet member={editing} onClose={() => setEditing(null)} />

      <AlertDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => { if (!open) setConfirmDeactivate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeactivate?.name ?? "This member"} will lose portal access
              immediately. You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivate.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeactivate(); }}
              disabled={deactivate.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deactivate.isPending ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!resetting}
        onOpenChange={(open) => { if (!open) setResetting(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be generated for{" "}
              <span className="font-medium">{resetting?.name}</span> and any
              active sessions will be signed out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPassword.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleResetPassword(); }}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "Resetting…" : "Reset password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
