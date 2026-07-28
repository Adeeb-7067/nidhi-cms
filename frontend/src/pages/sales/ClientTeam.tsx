import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Building2,
  KeyRound,
  LogIn,
  MoreHorizontal,
  Phone,
  RefreshCw,
  UserCheck,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListSalesClientTeam,
  useListCustomers,
  useDeactivateSalesClientTeamMember,
  useReactivateSalesClientTeamMember,
  useResendSalesClientTeamInvitation,
  useResetSalesClientTeamPassword,
  useCustomersSummary,
  type SalesClientTeamMember,
  type SalesClientTeamMemberStatus,
} from "@/api/sales";
import { readSearchParam } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
} from "@/modules/sales/components";
import { usePermissions } from "@/modules/permissions/usePermission";
import { formatSalesDateTime } from "@/modules/sales/utils";

type StatusTab = "all" | SalesClientTeamMemberStatus;

const STATUS_LABEL: Record<SalesClientTeamMemberStatus, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Inactive",
};

function statusTone(status: SalesClientTeamMemberStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "inactive":
      return "danger";
  }
}

export default function SalesClientTeamPage() {
  const { can } = usePermissions();
  const canManage = can("sales_customers", "edit");
  const customerIdParam = readSearchParam("customerId");
  const initialCustomerId = customerIdParam ? Number(customerIdParam) : undefined;

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [customerFilter, setCustomerFilter] = useState<string>(
    initialCustomerId ? String(initialCustomerId) : "all",
  );
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  const [deactivateTarget, setDeactivateTarget] = useState<SalesClientTeamMember | null>(null);
  const [resetTarget, setResetTarget] = useState<SalesClientTeamMember | null>(null);

  const deactivate = useDeactivateSalesClientTeamMember();
  const reactivate = useReactivateSalesClientTeamMember();
  const resendInvite = useResendSalesClientTeamInvitation();
  const resetPassword = useResetSalesClientTeamPassword();

  const listParams = {
    search: search || undefined,
    status: statusTab === "all" ? undefined : statusTab,
    customerId: customerFilter !== "all" ? Number(customerFilter) : undefined,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListSalesClientTeam(listParams);
  const { data: summary } = useCustomersSummary();
  const { data: customersData } = useListCustomers({ limit: 500 });

  const members = data?.members ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    resetPage();
  }, [search, statusTab, customerFilter, resetPage]);

  const companyOptions = useMemo(() => {
    return (customersData?.customers ?? [])
      .map((c) => ({ id: c.id, name: c.companyName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customersData?.customers]);

  const handleResend = (member: SalesClientTeamMember) => {
    resendInvite.mutate(member.id, {
      onSuccess: (result) => {
        if (result.invitation.sent) {
          toast.success(`Invitation sent to ${member.email}`);
        } else if (result.invitation.temporaryPassword) {
          toast.success(`Temporary password: ${result.invitation.temporaryPassword}`, { duration: 12_000 });
        } else {
          toast.success("Invitation updated");
        }
      },
      onError: (err) => toastApiError(err, "Failed to resend invitation"),
    });
  };

  const handleReactivate = (member: SalesClientTeamMember) => {
    reactivate.mutate(member.id, {
      onSuccess: () => toast.success(`${member.name ?? "Member"} reactivated`),
      onError: (err) => toastApiError(err, "Failed to reactivate member"),
    });
  };

  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    deactivate.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success(`${deactivateTarget.name ?? "Member"} deactivated`);
        setDeactivateTarget(null);
      },
      onError: (err) => toastApiError(err, "Failed to deactivate member"),
    });
  };

  const handleResetPassword = () => {
    if (!resetTarget) return;
    resetPassword.mutate(
      { id: resetTarget.id },
      {
        onSuccess: (result) => {
          toast.success(
            result.temporaryPassword
              ? `Temporary password: ${result.temporaryPassword}`
              : "Password reset successfully",
            { duration: 12_000 },
          );
          setResetTarget(null);
        },
        onError: (err) => toastApiError(err, "Failed to reset password"),
      },
    );
  };

  const columns: CmsColumn<SalesClientTeamMember>[] = [
    {
      id: "member",
      header: "Member",
      headerClassName: "min-w-[200px]",
      className: "min-w-[200px] max-w-[260px]",
      cell: (member) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name ?? ""} /> : null}
            <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
              {(member.name ?? member.email ?? "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{member.name ?? "—"}</p>
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="text-[10px] text-muted-foreground hover:text-primary truncate block"
              >
                {member.email}
              </a>
            ) : null}
            {member.phoneNumber ? (
              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 shrink-0" />
                {member.phoneNumber}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "company",
      header: "Company",
      headerClassName: "min-w-[140px]",
      className: "min-w-[140px] max-w-[180px]",
      cell: (member) => (
        <Link
          href={`/sales/customers/${member.clientCompanyId}`}
          className="inline-flex items-center gap-1 text-primary hover:underline min-w-0"
        >
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {member.companyName ?? `Customer #${member.clientCompanyId}`}
          </span>
        </Link>
      ),
    },
    {
      id: "role",
      header: "Role",
      headerClassName: "min-w-[96px] hidden sm:table-cell",
      className: "text-muted-foreground hidden sm:table-cell max-w-[120px] truncate",
      cell: (member) => member.title ?? "Member",
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      headerClassName: "min-w-[88px]",
      cell: (member) => (
        <CmsStatusChip label={STATUS_LABEL[member.status]} tone={statusTone(member.status)} />
      ),
    },
    {
      id: "lastLogin",
      header: "Last login",
      headerClassName: "min-w-[108px] hidden md:table-cell",
      className: "text-muted-foreground whitespace-nowrap hidden md:table-cell",
      cell: (member) =>
        member.lastLoginAt ? format(new Date(member.lastLoginAt), "MMM d, yyyy") : "Never",
    },
    {
      id: "added",
      header: "Added",
      headerClassName: "min-w-[108px] hidden lg:table-cell",
      className: "text-muted-foreground whitespace-nowrap hidden lg:table-cell",
      cell: (member) => formatSalesDateTime(member.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-[72px]",
      cell: (member) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/sales/customers/${member.clientCompanyId}`}>View customer</Link>
            </DropdownMenuItem>
            {canManage ? (
              <>
                <DropdownMenuSeparator />
                {member.status === "inactive" ? (
                  <DropdownMenuItem onClick={() => handleReactivate(member)}>
                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                    Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeactivateTarget(member)}
                  >
                    <UserMinus className="mr-2 h-3.5 w-3.5" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleResend(member)}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Resend invitation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setResetTarget(member)}>
                  <KeyRound className="mr-2 h-3.5 w-3.5" />
                  Reset password
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Client team"
        description="Portal collaborators invited by customers — manage access across all companies."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customers", href: "/sales/customers" },
          { label: "Client team" },
        ]}
      />

      <PortalKpiGrid
        items={[
          {
            title: "Active contacts",
            value: summary?.activeContacts ?? "—",
            hint: "Can sign in to portal",
            icon: UserCheck,
            accent: "green",
            delay: 0,
          },
          {
            title: "Inactive",
            value: summary?.inactiveContacts ?? "—",
            icon: UserMinus,
            accent: "red",
            delay: 1,
          },
          {
            title: "Logged in today",
            value: summary?.contactsLoggedInToday ?? "—",
            icon: LogIn,
            accent: "blue",
            delay: 2,
          },
          {
            title: "Listed below",
            value: total,
            hint: "Matching current filters",
            icon: UsersRound,
            accent: "violet",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search name, email, or company…">
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companyOptions.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SalesFilterBar>

      <CmsChipTabs
        value={statusTab}
        onValueChange={(v) => setStatusTab(v as StatusTab)}
        items={(["all", "active", "pending", "inactive"] as StatusTab[]).map((tab) => ({
          value: tab,
          label: tab === "all" ? "All" : STATUS_LABEL[tab],
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={members}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        empty={{
          icon: UsersRound,
          title: "No team members found",
          description:
            "Customers invite collaborators from their client portal. Adjust filters or check back later.",
          actionLabel: "View customers",
          onAction: () => window.location.assign("/sales/customers"),
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: members.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.name ?? "This member"} will lose portal access until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleDeactivate();
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be generated for {resetTarget?.name ?? "this member"}.
              Share it securely if email delivery is unavailable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResetPassword();
              }}
            >
              Reset password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
