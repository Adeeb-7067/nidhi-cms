import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { format, startOfYear, endOfYear, subMonths, subYears, startOfMonth } from "date-fns";
import {
  Briefcase,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Printer,
  Receipt,
  Shield,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, getListUsersQueryKey } from "@/api";
import { listQueryOptions } from "@/lib/list-query-options";
import type { User, UserListResult } from "@/api/generated/api.schemas";
import type {
  Customer,
  CustomerHubData,
  Installment,
  Proposal,
  SalesInvoice,
  SalesPayment,
} from "@/api/sales";
import { useAssignCustomerAdmin } from "@/api/sales";
import { resolveProposalTotal } from "@/modules/sales/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Progress } from "@/components/ui/progress";
import { ProjectInventoryPanel } from "@/components/inventory/ProjectInventoryPanel";
import { ExecutiveAvatar, SalesEmptyState, SalesStatusBadge } from "@/modules/sales/components";
import {
  FinancialSummaryCard,
  InstallmentCard,
  InstallmentProgress,
  OutstandingBadge,
  PaymentHistoryTable,
} from "@/modules/sales/components/financial-kit";
import { installmentCardData } from "@/modules/sales/adapters";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";

function PortalGate({ clientId, message }: { clientId: number | null; message: string }) {
  if (clientId) return null;
  return (
    <SalesEmptyState
      title="Portal not enabled"
      description={message}
    />
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function CustomerAdminSection({
  customer,
  hub,
  hubLoading,
}: {
  customer: Customer;
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const assignAdmin = useAssignCustomerAdmin();
  const staffListParams = { staff: "1", limit: 200 } as Parameters<typeof useListUsers>[0];
  const { data: usersData } = useListUsers(staffListParams, {
    query: {
      enabled: isSuperAdmin,
      ...listQueryOptions({ queryKey: getListUsersQueryKey(staffListParams) }),
    },
  });
  const staffUsers: User[] = (usersData as UserListResult | undefined)?.users ?? [];

  const assigned = customer.assignedAdmin ?? hub?.assignedAdmin ?? null;
  const clientAdmin = hub?.clientAdmin ?? null;

  const handleAssign = async (value: string) => {
    try {
      await assignAdmin.mutateAsync({
        id: customer.id,
        assignedAdminId: value === "none" ? null : Number(value),
      });
      toast.success(value === "none" ? "Custom admin removed" : "Custom admin assigned");
    } catch (err) {
      toastApiError(err, "Failed to assign admin");
    }
  };

  if (hubLoading) return <LoadingBlock />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Custom Admin (Internal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assigned ? (
            <div className="flex items-start gap-3">
              <ExecutiveAvatar name={assigned.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{assigned.name}</p>
                <p className="text-xs text-muted-foreground">{assigned.email}</p>
                {assigned.designation ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{assigned.designation}</p>
                ) : null}
                {assigned.phoneNumber ? (
                  <p className="text-xs text-muted-foreground mt-1">{assigned.phoneNumber}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No dedicated internal admin assigned yet.</p>
          )}
          {isSuperAdmin ? (
            <Select
              value={assigned?.id ? String(assigned.id) : "none"}
              onValueChange={handleAssign}
              disabled={assignAdmin.isPending}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Assign admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {staffUsers
                  .filter((u) => u.role !== "client")
                  .map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Client Portal Admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!customer.clientId ? (
            <p className="text-sm text-muted-foreground">
              Enable portal access to link a client admin account.
            </p>
          ) : clientAdmin ? (
            <div className="flex items-start gap-3">
              <ExecutiveAvatar name={clientAdmin.name} />
              <div>
                <p className="text-sm font-semibold">{clientAdmin.name}</p>
                <p className="text-xs text-muted-foreground">{clientAdmin.email}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">Portal admin</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Client record linked — no portal admin user found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CustomerProjectsSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;
  if (!clientId) {
    return (
      <PortalGate
        clientId={clientId}
        message="Link this customer to a client company (enable portal) to view project information."
      />
    );
  }

  const projects = hub?.projects ?? [];
  if (projects.length === 0) {
    return <SalesEmptyState title="No projects" description="No projects linked to this client company yet." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((p) => (
        <Link key={p.id} href={`/admin/projects/${p.id}`}>
          <Card className="hover:border-primary/30 transition-colors h-full">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.status?.replace(/_/g, " ")}</p>
                </div>
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              {p.pmName ? (
                <p className="text-xs text-muted-foreground">PM: {p.pmName}</p>
              ) : null}
              {p.deadline ? (
                <p className="text-[10px] text-muted-foreground">
                  Deadline {format(new Date(p.deadline), "MMM d, yyyy")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function CustomerTeamSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;
  if (!clientId) {
    return (
      <PortalGate
        clientId={clientId}
        message="Client team members appear after portal access is enabled for this customer."
      />
    );
  }

  const members = hub?.teamMembers ?? [];
  if (members.length === 0) {
    return (
      <SalesEmptyState
        title="No team members"
        description="The client has not added team members yet."
        actionLabel="Manage in client portal"
        onAction={() => window.open("/client/team", "_blank")}
      />
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Email</TableHead>
            <TableHead className="text-xs">Phone</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs font-medium">{m.name ?? "—"}</TableCell>
              <TableCell className="text-xs">{m.role ?? m.title ?? "Member"}</TableCell>
              <TableCell className="text-xs">
                {m.email ? (
                  <a href={`mailto:${m.email}`} className="text-primary hover:underline inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {m.email}
                  </a>
                ) : "—"}
              </TableCell>
              <TableCell className="text-xs">
                {m.phoneNumber ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {m.phoneNumber}
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomerCredentialsSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;

  const portalCreds = hub?.portalCredentials ?? [];
  const inventoryCreds = hub?.inventoryCredentials ?? [];

  if (!clientId && portalCreds.length === 0 && inventoryCreds.length === 0) {
    return (
      <PortalGate
        clientId={clientId}
        message="Shared credentials appear when portal access is enabled or project inventory credentials exist."
      />
    );
  }

  if (portalCreds.length === 0 && inventoryCreds.length === 0) {
    return <SalesEmptyState title="No shared credentials" description="No credentials have been shared with this client yet." />;
  }

  return (
    <div className="space-y-4">
      {portalCreds.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Portal login history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Label</TableHead>
                  <TableHead className="text-xs">Set by</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalCreds.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.label ?? "Portal login"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.setByLabel ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {inventoryCreds.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Project credentials</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryCreds.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.name ?? c.label}</TableCell>
                    <TableCell className="text-xs">{c.projectName ?? `#${c.projectId}`}</TableCell>
                    <TableCell className="text-xs font-mono">{c.username ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{c.category ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function CustomerTicketsSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;
  if (!clientId) {
    return <PortalGate clientId={clientId} message="Tickets appear once this customer is linked to a client company." />;
  }

  const tickets = hub?.tickets ?? [];
  if (tickets.length === 0) {
    return <SalesEmptyState title="No tickets" description="This customer has not raised any support tickets." />;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">ID</TableHead>
            <TableHead className="text-xs">Subject</TableHead>
            <TableHead className="text-xs">Priority</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Assigned to</TableHead>
            <TableHead className="text-xs">Created</TableHead>
            <TableHead className="text-xs">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-xs font-mono">#{t.id}</TableCell>
              <TableCell className="text-xs font-medium max-w-[200px] truncate">{t.subject}</TableCell>
              <TableCell className="text-xs capitalize">{t.priority}</TableCell>
              <TableCell className="text-xs capitalize">{t.status}</TableCell>
              <TableCell className="text-xs">{t.assignedToName ?? "Unassigned"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t.updatedAt ? format(new Date(t.updatedAt), "MMM d, yyyy") : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomerTasksSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;
  if (!clientId) {
    return <PortalGate clientId={clientId} message="Tasks appear when projects exist for this client company." />;
  }

  const tasks = hub?.tasks ?? [];
  if (tasks.length === 0) {
    return <SalesEmptyState title="No tasks" description="No development tasks linked to this customer's projects." />;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Task</TableHead>
            <TableHead className="text-xs">Project</TableHead>
            <TableHead className="text-xs">Developer</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Priority</TableHead>
            <TableHead className="text-xs">Due</TableHead>
            <TableHead className="text-xs">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-xs">
                <Link href={`/dev/tasks/${t.id}`} className="text-primary hover:underline font-medium">
                  {t.title}
                </Link>
                <p className="text-[10px] text-muted-foreground font-mono">{t.taskNumber}</p>
              </TableCell>
              <TableCell className="text-xs">{t.projectName ?? `#${t.projectId}`}</TableCell>
              <TableCell className="text-xs">{t.assigneeName ?? "Unassigned"}</TableCell>
              <TableCell className="text-xs capitalize">{t.status?.replace(/_/g, " ")}</TableCell>
              <TableCell className="text-xs capitalize">{t.priority}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell className="text-xs w-28">
                <Progress value={t.progress} className="h-1.5" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomerInventorySection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number | null;
}) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = hub?.projects ?? [];
  const activeProjectId = projectId ?? projects[0]?.id ?? null;

  if (hubLoading) return <LoadingBlock />;
  if (!clientId) {
    return <PortalGate clientId={clientId} message="Inventory is available per linked project after portal setup." />;
  }
  if (projects.length === 0) {
    return <SalesEmptyState title="No inventory" description="Create a project for this client to manage inventory." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Project</span>
        <Select
          value={activeProjectId ? String(activeProjectId) : undefined}
          onValueChange={(v) => setProjectId(Number(v))}
        >
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeProjectId ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href={`/admin/projects/${activeProjectId}?tab=inventory`}>Open in project</Link>
          </Button>
        ) : null}
      </div>
      {activeProjectId ? (
        <Card className="overflow-hidden">
          <ProjectInventoryPanel projectId={activeProjectId} />
        </Card>
      ) : null}
    </div>
  );
}

// ── Proposals ─────────────────────────────────────────────────────────────────

export function CustomerProposalsSection({
  proposals,
  customerId,
}: {
  proposals: Proposal[];
  customerId: number;
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const statuses = useMemo(() => [...new Set(proposals.map((p) => p.status))], [proposals]);
  const filtered = statusFilter === "all" ? proposals : proposals.filter((p) => p.status === statusFilter);

  const totalValue = useMemo(
    () => proposals.reduce((s, p) => s + resolveProposalTotal(p).finalTotal, 0),
    [proposals],
  );
  const approved = proposals.filter((p) => p.status === "approved" || (p.status as string) === "converted").length;
  const pending = proposals.filter((p) => p.status === "draft" || p.status === "sent" || p.status === "seen").length;

  if (proposals.length === 0) {
    return (
      <SalesEmptyState
        title="No proposals"
        description="No proposals have been created for this customer yet."
        actionLabel="Create first proposal"
        onAction={() => { window.location.href = `/sales/proposals/create?customerId=${customerId}`; }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total proposals</p>
            <p className="text-xl font-bold mt-0.5">{proposals.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total value</p>
            <p className="text-xl font-bold mt-0.5">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending review</p>
            <p className="text-xl font-bold mt-0.5 text-amber-600">{pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {["all", ...statuses].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All proposals" : s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {/* Proposals table */}
      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Proposal #</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Assigned to</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Valid until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const { finalTotal } = resolveProposalTotal(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-mono">
                        <Link href={`/sales/proposals/${p.id}`} className="text-primary hover:underline font-medium">
                          {p.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[220px]">
                        <div className="truncate">{p.title}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">
                        {formatCurrency(finalTotal)}
                      </TableCell>
                      <TableCell>
                        <SalesStatusBadge variant="proposal" value={p.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.assignedToUser?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.validUntil ? format(new Date(p.validUntil), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <SalesEmptyState
          title={`No ${statusFilter.replace(/_/g, " ")} proposals`}
          description="Try selecting a different status filter."
        />
      )}
    </div>
  );
}

// ── Statement ──────────────────────────────────────────────────────────────────

type PeriodPreset = "all" | "this_year" | "last_year" | "last_6m" | "last_3m" | "this_month" | "custom";

function buildLedger(
  invoices: SalesInvoice[],
  payments: SalesPayment[],
  from: Date | null,
  to: Date | null,
) {
  type LedgerRow = {
    key: string;
    date: string;
    details: string;
    amount: number;
    payment: number;
    balance: number;
    href?: string;
  };

  // Balance accumulated before the from-date window
  let beginningBalance = 0;
  if (from) {
    for (const inv of invoices) {
      if (new Date(inv.createdAt) < from) beginningBalance += inv.amount;
    }
    for (const pay of payments) {
      if (new Date(pay.createdAt) < from) beginningBalance -= pay.amount;
    }
    beginningBalance = Math.max(0, beginningBalance);
  }

  // Combine + sort entries within the window
  const entries = [
    ...invoices
      .filter((i) => {
        const d = new Date(i.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((i) => ({ sortKey: new Date(i.createdAt).getTime(), type: "invoice" as const, data: i })),
    ...payments
      .filter((p) => {
        const d = new Date(p.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((p) => ({ sortKey: new Date(p.createdAt).getTime(), type: "payment" as const, data: p })),
  ].sort((a, b) => a.sortKey - b.sortKey);

  let balance = beginningBalance;
  const rows: LedgerRow[] = [];

  for (const entry of entries) {
    if (entry.type === "invoice") {
      const inv = entry.data as SalesInvoice;
      balance += inv.amount;
      rows.push({
        key: `inv-${inv.id}`,
        date: inv.createdAt,
        details: `Invoice ${inv.number}`,
        amount: inv.amount,
        payment: 0,
        balance,
        href: `/sales/invoices/${inv.id}`,
      });
    } else {
      const pay = entry.data as SalesPayment;
      balance -= pay.amount;
      rows.push({
        key: `pay-${pay.id}`,
        date: pay.createdAt,
        details: `Payment ${pay.receiptNumber}`,
        amount: 0,
        payment: pay.amount,
        balance: Math.max(0, balance),
        href: `/sales/receipts/${pay.id}`,
      });
    }
  }

  const invoicedInPeriod = rows.reduce((s, r) => s + r.amount, 0);
  const paidInPeriod = rows.reduce((s, r) => s + r.payment, 0);
  const balanceDue = Math.max(0, beginningBalance + invoicedInPeriod - paidInPeriod);

  return { beginningBalance, rows, invoicedInPeriod, paidInPeriod, balanceDue };
}

function downloadStatementCsv(
  customer: Customer,
  from: Date | null,
  to: Date | null,
  rows: ReturnType<typeof buildLedger>["rows"],
  summary: { beginningBalance: number; invoicedInPeriod: number; paidInPeriod: number; balanceDue: number },
) {
  const lines = [
    `Customer Statement — ${customer.companyName}`,
    `Generated,${format(new Date(), "yyyy-MM-dd")}`,
    from ? `Period from,${format(from, "yyyy-MM-dd")}` : "Period,All time",
    to ? `Period to,${format(to, "yyyy-MM-dd")}` : "",
    "",
    "Account Summary",
    `Beginning Balance,${summary.beginningBalance}`,
    `Invoiced Amount,${summary.invoicedInPeriod}`,
    `Amount Paid,${summary.paidInPeriod}`,
    `Balance Due,${summary.balanceDue}`,
    "",
    "Transactions",
    "Date,Details,Amount,Payment,Balance",
    `${from ? format(from, "yyyy-MM-dd") : ""},Beginning Balance,,,${summary.beginningBalance}`,
    ...rows.map((r) =>
      `${format(new Date(r.date), "yyyy-MM-dd")},${r.details},${r.amount || ""},${r.payment || ""},${r.balance}`,
    ),
  ].filter((l) => l !== "");
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${customer.companyName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatementSummaryRow({
  label,
  value,
  bold,
  alert,
}: {
  label: string;
  value: string;
  bold?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("tabular-nums", bold && "font-semibold text-sm", alert && "text-destructive")}>
        {value}
      </span>
    </div>
  );
}

export function CustomerStatementSection({
  customer,
  statement,
  statementLoading,
  payments,
}: {
  customer: Customer;
  statement: {
    summary: { totalBilled: number; totalPaid: number; outstanding: number };
    invoices: SalesInvoice[];
    payments: SalesPayment[];
  } | undefined;
  statementLoading: boolean;
  payments: SalesPayment[];
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  function applyPreset(preset: PeriodPreset) {
    const now = new Date();
    setPeriod(preset);
    switch (preset) {
      case "all":
        setFromDate(""); setToDate(""); break;
      case "this_month":
        setFromDate(format(startOfMonth(now), "yyyy-MM-dd"));
        setToDate(format(now, "yyyy-MM-dd")); break;
      case "last_3m":
        setFromDate(format(subMonths(now, 3), "yyyy-MM-dd"));
        setToDate(format(now, "yyyy-MM-dd")); break;
      case "last_6m":
        setFromDate(format(subMonths(now, 6), "yyyy-MM-dd"));
        setToDate(format(now, "yyyy-MM-dd")); break;
      case "this_year":
        setFromDate(format(startOfYear(now), "yyyy-MM-dd"));
        setToDate(format(now, "yyyy-MM-dd")); break;
      case "last_year": {
        const ly = subYears(now, 1);
        setFromDate(format(startOfYear(ly), "yyyy-MM-dd"));
        setToDate(format(endOfYear(ly), "yyyy-MM-dd")); break;
      }
      default: break;
    }
  }

  const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
  const to = toDate ? new Date(toDate + "T23:59:59") : null;

  const allInvoices = statement?.invoices ?? [];
  const allPayments = payments;

  const ledger = useMemo(
    () => buildLedger(allInvoices, allPayments, from, to),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allInvoices, allPayments, fromDate, toDate],
  );

  const periodLabel = useMemo(() => {
    if (fromDate && toDate) return `${fromDate} To ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    if (toDate) return `Through ${toDate}`;
    return "All time";
  }, [fromDate, toDate]);

  const showingText = useMemo(() => {
    if (fromDate && toDate)
      return `Showing all invoices and payments between ${fromDate} and ${toDate}`;
    if (fromDate) return `Showing all invoices and payments from ${fromDate}`;
    if (toDate) return `Showing all invoices and payments through ${toDate}`;
    return "Showing all invoices and payments";
  }, [fromDate, toDate]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Statement — ${customer.companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 12px; color: #555; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
    .company-right { text-align: right; }
    .company-right .name { font-size: 14px; font-weight: 700; color: #111; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .summary-box { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #eee; }
    .summary-row:last-child { border-bottom: none; font-weight: 700; font-size: 13px; padding-top: 8px; }
    .showing-text { text-align: center; color: #777; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; font-size: 11px; border: 1px solid #e2e8f0; }
    td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
    .tr-alt { background: #fafafa; }
    .tr-begin { background: #f0f9ff; font-style: italic; color: #555; }
    .text-right { text-align: right; }
    .balance-col { font-weight: 600; }
    .text-red { color: #dc2626; }
    .text-green { color: #16a34a; }
    .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .to-name { font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>${printRef.current.innerHTML}</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 250);
  };

  if (statementLoading) return <LoadingBlock />;
  if (!statement) {
    return <SalesEmptyState title="Statement unavailable" description="Could not load the account statement." />;
  }

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={(v) => applyPreset(v as PeriodPreset)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_3m">Last 3 months</SelectItem>
                <SelectItem value="last_6m">Last 6 months</SelectItem>
                <SelectItem value="this_year">This year</SelectItem>
                <SelectItem value="last_year">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPeriod("custom"); }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPeriod("custom"); }}
              />
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handlePrint}
                title="Print statement"
              >
                <Printer className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => downloadStatementCsv(customer, from, to, ledger.rows, ledger)}
                title="Download CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                asChild
                title="Email customer"
              >
                <a href={`mailto:${customer.email}?subject=Account Statement — ${customer.companyName}&body=Please find your account statement attached.`}>
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Statement document ── */}
      <div ref={printRef} className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Document header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-6 pt-6 pb-5 border-b bg-muted/20">
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Customer Statement</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              For <span className="font-semibold text-foreground">{customer.companyName}</span>
            </p>
          </div>
          <div className="text-left sm:text-right space-y-0.5">
            <p className="text-sm font-semibold text-foreground">{BRAND.name}</p>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* To / Account Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Customer info */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">To</p>
              <p className="text-sm font-bold text-foreground">{customer.companyName}</p>
              {customer.location ? (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {customer.location}
                </p>
              ) : null}
              {customer.gstin ? (
                <p className="text-xs text-muted-foreground">GSTIN Number: {customer.gstin}</p>
              ) : null}
            </div>

            {/* Account Summary box */}
            <div className="rounded-lg border bg-muted/10 p-4 space-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-foreground">Account Summary</p>
                <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
              </div>
              <StatementSummaryRow
                label="Beginning Balance"
                value={formatCurrency(ledger.beginningBalance)}
              />
              <StatementSummaryRow
                label="Invoiced Amount"
                value={formatCurrency(ledger.invoicedInPeriod)}
              />
              <StatementSummaryRow
                label="Amount Paid"
                value={formatCurrency(ledger.paidInPeriod)}
              />
              <div className="border-t border-border/60 mt-1 pt-1">
                <StatementSummaryRow
                  label="Balance Due"
                  value={formatCurrency(ledger.balanceDue)}
                  bold
                  alert={ledger.balanceDue > 0}
                />
              </div>
            </div>
          </div>

          {/* Showing range label */}
          <p className="text-[11px] text-center text-muted-foreground border-y py-2">{showingText}</p>

          {/* Chronological ledger */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Details</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Payments</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Beginning balance row */}
                <TableRow className="bg-muted/20">
                  <TableCell className="text-xs text-muted-foreground">
                    {fromDate || format(new Date(allInvoices[0]?.createdAt ?? new Date()), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell className="text-xs italic text-muted-foreground">Beginning Balance</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">—</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold">
                    {formatCurrency(ledger.beginningBalance)}
                  </TableCell>
                </TableRow>

                {ledger.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                      No transactions in the selected period
                    </TableCell>
                  </TableRow>
                ) : null}

                {ledger.rows.map((row, i) => (
                  <TableRow key={row.key} className={i % 2 === 1 ? "bg-muted/10" : ""}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(row.date), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.href ? (
                        <Link href={row.href} className="text-primary hover:underline font-medium">
                          {row.details}
                        </Link>
                      ) : (
                        row.details
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {row.amount > 0 ? (
                        <span className="font-medium">{formatCurrency(row.amount)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {row.payment > 0 ? (
                        <span className="text-emerald-600 font-medium">{formatCurrency(row.payment)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right tabular-nums font-semibold",
                        row.balance > 0 ? "text-destructive" : "text-emerald-600",
                      )}
                    >
                      {formatCurrency(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row */}
                {ledger.rows.length > 0 ? (
                  <TableRow className="bg-muted/30 font-semibold border-t-2">
                    <TableCell className="text-xs" colSpan={2}>Total</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {formatCurrency(ledger.invoicedInPeriod)}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-600">
                      {formatCurrency(ledger.paidInPeriod)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right tabular-nums",
                        ledger.balanceDue > 0 ? "text-destructive" : "text-emerald-600",
                      )}
                    >
                      {formatCurrency(ledger.balanceDue)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerInstallmentsSection({
  installments,
  payments,
  invoices,
}: {
  installments: Installment[];
  payments: SalesPayment[];
  invoices: SalesInvoice[];
}) {
  const stats = useMemo(() => {
    const paid = installments.filter((i) => i.status === "paid").length;
    const partial = installments.filter((i) => i.status === "partial").length;
    const pending = installments.filter((i) => i.status === "pending" || i.status === "overdue").length;
    const upcoming = installments.filter((i) => {
      const due = new Date(i.dueDate);
      return due >= new Date() && i.status !== "paid";
    }).length;
    return { paid, partial, pending, upcoming };
  }, [installments]);

  if (installments.length === 0) {
    return (
      <SalesEmptyState title="No installments" description="Create installment plans from approved proposals." />
    );
  }

  const paymentsByInvoice = new Map<number, SalesPayment[]>();
  for (const p of payments) {
    const list = paymentsByInvoice.get(p.invoiceId) ?? [];
    list.push(p);
    paymentsByInvoice.set(p.invoiceId, list);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Paid</p><p className="text-lg font-bold">{stats.paid}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Partial</p><p className="text-lg font-bold">{stats.partial}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Pending</p><p className="text-lg font-bold">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Upcoming</p><p className="text-lg font-bold">{stats.upcoming}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {installments.map((inst) => (
          <InstallmentCard
            key={inst.id}
            installment={installmentCardData(inst)}
            href={`/sales/installments/${inst.id}`}
            compact
          />
        ))}
      </div>

      {installments.some((i) => i.status === "partial") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Partial installments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {installments
              .filter((i) => i.status === "partial")
              .map((inst) => {
                const remaining = calcRemaining(inst.dueAmount, inst.paidAmount);
                const invoice = invoices.find((inv) => inv.installmentId === inst.id);
                const instPayments = invoice ? paymentsByInvoice.get(invoice.id) ?? [] : [];
                return (
                  <div key={inst.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {format(new Date(inst.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <SalesStatusBadge variant="installment" value={inst.status} />
                    </div>
                    <InstallmentProgress paid={inst.paidAmount} total={inst.dueAmount} />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Paid</span><p className="font-semibold tabular-nums">{formatCurrency(inst.paidAmount)}</p></div>
                      <div><span className="text-muted-foreground">Remaining</span><p className="font-semibold tabular-nums text-destructive">{formatCurrency(remaining)}</p></div>
                      <div><span className="text-muted-foreground">Total</span><p className="font-semibold tabular-nums">{formatCurrency(inst.dueAmount)}</p></div>
                    </div>
                    {instPayments.length > 0 ? (
                      <div className="pt-2 border-t">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">Payment history</p>
                        {instPayments.map((p) => (
                          <div key={p.id} className="flex justify-between text-xs py-0.5">
                            <Link href={`/sales/receipts/${p.id}`} className="text-primary hover:underline font-mono">
                              {p.receiptNumber}
                            </Link>
                            <span className="tabular-nums">{formatCurrency(p.amount)}</span>
                            <span className="text-muted-foreground">{format(new Date(p.createdAt), "MMM d")}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {remaining > 0 ? <OutstandingBadge amount={remaining} /> : null}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function CustomerOverviewExtras({
  proposalsCount,
  invoicesCount,
  paymentsCount,
}: {
  proposalsCount: number;
  invoicesCount: number;
  paymentsCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 mt-4">
      <Card><CardContent className="p-3 flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] uppercase text-muted-foreground">Proposals</p><p className="text-sm font-bold">{proposalsCount}</p></div></CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] uppercase text-muted-foreground">Invoices</p><p className="text-sm font-bold">{invoicesCount}</p></div></CardContent></Card>
      <Card><CardContent className="p-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] uppercase text-muted-foreground">Payments</p><p className="text-sm font-bold">{paymentsCount}</p></div></CardContent></Card>
    </div>
  );
}
