import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Clock,
  Edit,
  Eye,
  LineChart,
  LogIn,
  Mail,
  Plus,
  Search,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useDeleteUser, type User } from "@/api";
import { useSalesTeam, type SalesTeamMember } from "@/api/sales";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/contexts/PresenceContext";
import { toastApiError } from "@/lib/api-error";
import { getAdminEmployeeDetailHref } from "@/lib/employee-routes";
import { useTablePagination } from "@/lib/table-pagination";
import { formatStaffRoleLabel, staffRoleBadgeClass } from "@/lib/user-roles";
import { parsePresenceStatus } from "@/lib/presence";
import { useRefreshPresenceForUserIds } from "@/hooks/use-presence-refresh";
import { useMergedPresenceForUser } from "@/hooks/use-merged-presence";
import { AvatarWithPresence } from "@/components/presence/AvatarWithPresence";
import { PresenceTableCell } from "@/components/presence/PresenceTableCell";
import { PortalContentCard, PortalKpiGrid, portalActionButtonClass } from "@/components/layout/portal-page-kit";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageTableSkeleton } from "@/components/loading";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SalesEmptyState } from "@/modules/sales/components";
import { formatCompactCurrency } from "@/modules/sales/constants";
import { BdeTeamFormDialog } from "./BdeTeamFormDialog";

function canViewAsBde(user: SalesTeamMember): boolean {
  return user.status === "active" && user.role === "bde";
}

function RosterPresenceCell({ member }: { member: SalesTeamMember }) {
  const merged = useMergedPresenceForUser(member);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      lastLoginAt={merged.lastLoginAt}
      variant="presence"
    />
  );
}

function RosterPresenceDetailCell({ member }: { member: SalesTeamMember }) {
  const merged = useMergedPresenceForUser(member);
  if (!merged) return "—";
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      lastLoginAt={merged.lastLoginAt}
      variant="combined"
    />
  );
}

function RosterLastSeenCell({ member }: { member: SalesTeamMember }) {
  const merged = useMergedPresenceForUser(member);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastSeenAt={merged.lastSeenAt}
      variant="lastSeen"
    />
  );
}

function RosterLastLoginCell({ member }: { member: SalesTeamMember }) {
  const merged = useMergedPresenceForUser(member);
  if (!merged) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <PresenceTableCell
      presenceStatus={merged.presenceStatus}
      lastLoginAt={merged.lastLoginAt}
      variant="lastLogin"
    />
  );
}

function memberToUser(member: SalesTeamMember): User {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: "bde",
    status: member.status ?? "active",
    avatarUrl: member.avatarUrl,
    employeeId: member.employeeId,
    designation: member.designation,
    department: member.department,
    phoneNumber: member.phoneNumber,
    joiningDate: member.joiningDate,
    subType: member.subType,
    linkedinUrl: member.linkedinUrl,
    lastLoginAt: member.lastLoginAt,
    lastSeenAt: member.lastSeenAt,
    presenceStatus: member.presenceStatus,
    createdAt: member.createdAt ?? "",
  } as User;
}

function RosterActionButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`h-7 w-7 shrink-0 ${className ?? ""}`}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function BdeTeamRosterPanel({
  onOpenSalesDetail,
}: {
  onOpenSalesDetail?: (member: SalesTeamMember) => void;
}) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { impersonate, isImpersonating } = useAuth();
  const { getPresence } = usePresence();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, resetPage]);

  const listParams = {
    status: statusFilter,
    search: search.trim() || undefined,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError } = useSalesTeam(listParams);
  const deleteUserMutation = useDeleteUser();

  const team = data?.team ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary ?? { total: 0, active: 0, inactive: 0 };
  const pageUserIds = useMemo(() => team.map((m) => m.id), [team]);
  useRefreshPresenceForUserIds(pageUserIds);

  const presenceForMember = (member: SalesTeamMember) =>
    parsePresenceStatus(getPresence(member.id)?.status ?? member.presenceStatus);

  const handleViewAs = async (member: SalesTeamMember, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canViewAsBde(member)) return;
    if (isImpersonating) {
      toast.error("Exit the current view-as session first.");
      return;
    }
    setImpersonatingId(member.id);
    try {
      await impersonate(member.id);
      toast.success(`Viewing as ${member.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to view as BDE";
      toast.error(message);
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUserMutation.mutateAsync({ id: deleteId });
      toast.success("BDE member deactivated");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["sales-team"] });
    } catch (error: unknown) {
      toastApiError(error, "Failed to deactivate member");
    }
  };

  const columns: Column<SalesTeamMember>[] = [
    {
      id: "name",
      header: "Employee",
      accessorKey: "name",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <AvatarWithPresence
            name={member.name}
            avatarUrl={member.avatarUrl}
            presenceStatus={presenceForMember(member)}
            avatarClassName="h-8 w-8"
          />
          <div>
            <p className="text-xs font-medium">{member.name}</p>
            <p className="text-[10px] text-muted-foreground flex items-center mt-0.5">
              <Mail className="h-2.5 w-2.5 mr-1" />
              {member.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: (member) => (
        <div className="flex flex-col gap-1">
          <Badge variant="secondary" className={`${staffRoleBadgeClass(member.role)} w-fit text-[10px]`}>
            {formatStaffRoleLabel(member.role)}
          </Badge>
          <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">
            {member.designation || "BDE"}
          </span>
        </div>
      ),
    },
    {
      id: "employeeId",
      header: "ID",
      accessorKey: "employeeId",
      cell: (member) => (
        <span className="text-muted-foreground font-mono text-[10px]">{member.employeeId ?? "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (member) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${member.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}`}
        >
          {member.status ?? "active"}
        </Badge>
      ),
    },
    {
      id: "presence",
      header: "Presence",
      cell: (member) => <RosterPresenceCell member={member} />,
      detailCell: (member) => <RosterPresenceDetailCell member={member} />,
    },
    {
      id: "lastSeen",
      header: "Last seen",
      cell: (member) => <RosterLastSeenCell member={member} />,
    },
    {
      id: "lastLoginAt",
      header: "Last login",
      accessorKey: "lastLoginAt",
      cell: (member) => <RosterLastLoginCell member={member} />,
    },
    {
      id: "department",
      header: "Department",
      detailOnly: true,
      accessorKey: "department",
      detailCell: (member) => member.department ?? "—",
    },
    {
      id: "phoneNumber",
      header: "Phone",
      detailOnly: true,
      detailCell: (member) => member.phoneNumber ?? "—",
    },
    {
      id: "joiningDate",
      header: "Joining date",
      detailOnly: true,
      detailCell: (member) =>
        member.joiningDate ? new Date(member.joiningDate).toLocaleDateString() : "—",
    },
    {
      id: "linkedin",
      header: "LinkedIn",
      detailOnly: true,
      detailCell: (member) =>
        member.linkedinUrl ? (
          <a href={member.linkedinUrl} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
            {member.linkedinUrl}
          </a>
        ) : (
          "—"
        ),
    },
    {
      id: "subType",
      header: "Sub-type",
      detailOnly: true,
      detailCell: (member) => member.subType ?? "—",
    },
    {
      id: "createdAt",
      header: "Joined system",
      detailOnly: true,
      detailCell: (member) =>
        member.createdAt ? new Date(member.createdAt).toLocaleString() : "—",
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      className: "w-[1%] whitespace-nowrap align-middle",
      cell: (member) => (
        <div
          className="flex items-center justify-end gap-0.5 flex-nowrap min-w-[9.5rem]"
          onClick={(e) => e.stopPropagation()}
        >
          <RosterActionButton
            label="Open profile"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(getAdminEmployeeDetailHref(member.id));
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </RosterActionButton>
          {onOpenSalesDetail ? (
            <RosterActionButton
              label="Sales performance"
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSalesDetail(member);
              }}
            >
              <LineChart className="h-3.5 w-3.5" />
            </RosterActionButton>
          ) : null}
          {canViewAsBde(member) ? (
            <RosterActionButton
              label="View as BDE"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              disabled={impersonatingId === member.id || isImpersonating}
              onClick={(e) => void handleViewAs(member, e)}
            >
              <LogIn className="h-3.5 w-3.5" />
            </RosterActionButton>
          ) : null}
          <RosterActionButton
            label="Edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditMember(memberToUser(member));
              setIsDialogOpen(true);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </RosterActionButton>
          <RosterActionButton
            label={member.status !== "active" ? "Already deactivated" : "Deactivate"}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-30"
            disabled={member.status !== "active"}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(member.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </RosterActionButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PortalKpiGrid
        loading={isLoading}
        items={[
          { title: "BDE team", value: summary.total, hint: "All BDE accounts", icon: Users, accent: "violet" },
          { title: "Active", value: summary.active, hint: "Can sign in", icon: Zap, accent: "green" },
          {
            title: "Inactive",
            value: summary.inactive,
            hint: "Deactivated accounts",
            icon: Clock,
            accent: "amber",
            alert: summary.inactive > 0,
          },
          {
            title: "Revenue (page)",
            value: formatCompactCurrency(data?.totals.revenue ?? 0),
            hint: "Collected on current page",
            icon: BarChart3,
            accent: "blue",
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search name, email, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All BDEs</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          className={portalActionButtonClass("bg-primary text-primary-foreground")}
          onClick={() => {
            setEditMember(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add BDE
        </Button>
      </div>

      <PortalContentCard className="p-0 overflow-hidden">
        {isLoading ? (
          <PageTableSkeleton rows={8} columns={6} showToolbar />
        ) : isError ? (
          <div className="p-6">
            <SalesEmptyState title="Failed to load roster" description="Could not fetch BDE team members." />
          </div>
        ) : team.length === 0 ? (
          <div className="p-6">
            <SalesEmptyState
              title="No BDE members found"
              description={search || statusFilter !== "all" ? "Try adjusting your filters." : "Add your first BDE team member."}
            />
          </div>
        ) : (
          <AdvancedTable
            data={team}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Filter on this page…"
            filename="BdeTeamExport"
            viewStorageKey="sales-bde-team"
            showRowDetails
            onRowClick={(member) => setLocation(getAdminEmployeeDetailHref(member.id))}
          />
        )}
      </PortalContentCard>

      {pagination ? (
        <DataPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      ) : null}

      <BdeTeamFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditMember(null);
        }}
        editUser={editMember}
        onSaved={() => resetPage()}
      />

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate BDE member?</AlertDialogTitle>
            <AlertDialogDescription>
              This deactivates the account. They will no longer be able to sign in or appear in active sales assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
