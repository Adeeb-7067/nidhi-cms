import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfYear, endOfYear, subMonths, subYears, startOfMonth } from "date-fns";
import {
  Briefcase,
  ExternalLink,
  FileText,
  IndianRupee,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  Shield,
  Trash2,
  TrendingUp,
  User as UserIcon,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import { useListUsers, getListUsersQueryKey, useCreateProject, useUpdateProject, useDeleteProject, getListProjectsQueryKey } from "@/api";
import { listQueryOptions } from "@/lib/list-query-options";
import type { User, UserListResult } from "@/api/generated/api.schemas";
import type {
  Customer,
  CustomerHubData,
  CustomerHubProject,
  Installment,
  Proposal,
  SalesInvoice,
  SalesPayment,
} from "@/api/sales";
import { salesKeys, useAssignCustomerAdmin, useDeleteProposal } from "@/api/sales";
import { formatPaymentMethod, resolveProposalTotal, formatSalesDateTime, formatSalesPaymentDate, paymentDocumentInvoiceId } from "@/modules/sales/utils";
import { useSalesDocumentBranding } from "@/modules/sales/hooks/use-sales-document-branding";
import { customFieldsForDocument } from "@/modules/sales/company-branding";
import {
  buildCustomerStatementLedger,
  formatStatementSummaryAmount,
  formatStatementTableAmount,
} from "@/modules/sales/customer-statement-ledger";
import { downloadCustomerStatementPdf } from "@/modules/sales/customer-statement-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Progress } from "@/components/ui/progress";
import { ProjectInventoryPanel } from "@/components/inventory/ProjectInventoryPanel";
import { ExecutiveAvatar, SalesEmptyState, SalesStatusBadge } from "@/modules/sales/components";
import {
  InstallmentCard,
  InstallmentProgress,
  OutstandingBadge,
  PaymentHistoryTable,
} from "@/modules/sales/components/financial-kit";
import { installmentCardData } from "@/modules/sales/adapters";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import { ProposalFormSheet } from "./ProposalFormSheet";
import { InvoiceFormSheet } from "./InvoiceFormSheet";
import { CreateInstallmentDialog, CreateInvoiceDialog, RecordPaymentDialog } from "./sales-action-dialogs";

function PortalGate({ portalEnabled, message }: { portalEnabled: boolean; message: string }) {
  if (portalEnabled) return null;
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
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
            <UserIcon className="h-4 w-4" />
            Created by
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.createdByUser ? (
            <div className="flex items-start gap-3">
              <ExecutiveAvatar name={customer.createdByUser.name} avatarUrl={customer.createdByUser.avatarUrl} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{customer.createdByUser.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Added {formatSalesDateTime(customer.createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Creator not recorded for this customer.</p>
          )}
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
          {!customer.portalUserId ? (
            <p className="text-sm text-muted-foreground">
              Enable portal access to create the client admin login for this company.
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

const PROJECT_STATUS_OPTIONS = [
  { value: "scoping", label: "Scoping" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "uat", label: "UAT" },
  { value: "completed", label: "Completed" },
  { value: "maintenance", label: "Maintenance" },
];

const PROJECT_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "maintenance", label: "Maintenance" },
  { value: "digital", label: "Digital" },
] as const;

function ProjectQuickDialog({
  open,
  onOpenChange,
  clientId,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  project: CustomerHubProject | null;
  onSaved: () => void;
}) {
  const isEdit = project != null;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    "scoping" | "in_progress" | "on_hold" | "uat" | "completed" | "maintenance"
  >("scoping");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [projectType, setProjectType] = useState<"development" | "maintenance" | "digital">("development");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setStatus((project?.status as typeof status) ?? "scoping");
    setPriority("medium");
    setProjectType(
      ((project as { type?: string } | null)?.type as typeof projectType) ?? "development",
    );
    setDeadline(project?.deadline ? project.deadline.slice(0, 10) : "");
  }, [open, project]);

  const isPending = createProject.isPending || updateProject.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !deadline) {
      toast.error("Project name and deadline are required");
      return;
    }
    try {
      if (isEdit && project) {
        await updateProject.mutateAsync({
          id: project.id,
          data: { name: name.trim(), status, deadline, type: projectType },
        });
        toast.success("Project updated");
      } else {
        await createProject.mutateAsync({
          data: {
            name: name.trim(),
            clientId,
            companyId: clientId,
            priority,
            status,
            type: projectType,
            startDate: new Date().toISOString().slice(0, 10),
            deadline,
          },
        });
        toast.success("Project created");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toastApiError(err, isEdit ? "Failed to update project" : "Failed to create project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project's name, status, or deadline."
              : "Create a new project for this client company."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile App Revamp" />
          </div>
          {!isEdit ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as typeof projectType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as typeof projectType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerProjectsSection({
  hub,
  hubLoading,
  clientId,
  customerId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number;
  customerId: number;
}) {
  const queryClient = useQueryClient();
  const deleteProject = useDeleteProject();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerHubProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerHubProject | null>(null);

  const refreshProjects = () => {
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    queryClient.invalidateQueries({ queryKey: [...salesKeys.customer(customerId), "hub"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync({ id: deleteTarget.id });
      toast.success("Project deleted");
      setDeleteTarget(null);
      refreshProjects();
    } catch (err) {
      toastApiError(err, "Failed to delete project");
    }
  };

  if (hubLoading) return <LoadingBlock />;

  const projects = hub?.projects ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <SalesEmptyState
          title="No projects"
          description="No projects linked to this client company yet."
          actionLabel="Create first project"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id} className="hover:border-primary/30 transition-colors h-full">
              <CardContent className="p-4 space-y-2">
                <Link href={`/admin/projects/${p.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.status?.replace(/_/g, " ")}</p>
                    </div>
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  {p.pmName ? (
                    <p className="text-xs text-muted-foreground mt-2">PM: {p.pmName}</p>
                  ) : null}
                  {p.deadline ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Deadline {format(new Date(p.deadline), "MMM d, yyyy")}
                    </p>
                  ) : null}
                </Link>
                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setEditTarget(p)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(p)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectQuickDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
        project={null}
        onSaved={refreshProjects}
      />
      <ProjectQuickDialog
        open={editTarget != null}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        clientId={clientId}
        project={editTarget}
        onSaved={refreshProjects}
      />
      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong> and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const customerTeamColumns: CmsColumn<NonNullable<CustomerHubData["teamMembers"]>[number]>[] = [
  {
    id: "name",
    header: "Name",
    className: "min-w-[120px]",
    cell: (m) => <span className="font-medium max-w-[160px] truncate block">{m.name ?? "—"}</span>,
  },
  {
    id: "role",
    header: "Role",
    className: "min-w-[88px]",
    cell: (m) => <span className="max-w-[120px] truncate block">{m.role ?? m.title ?? "Member"}</span>,
  },
  {
    id: "email",
    header: "Email",
    className: "min-w-[160px]",
    cell: (m) =>
      m.email ? (
        <a href={`mailto:${m.email}`} className="text-primary hover:underline inline-flex items-center gap-1 min-w-0 max-w-full">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{m.email}</span>
        </a>
      ) : (
        "—"
      ),
  },
  {
    id: "phone",
    header: "Phone",
    className: "min-w-[110px] hidden sm:table-cell",
    headerClassName: "hidden sm:table-cell",
    cell: (m) =>
      m.phoneNumber ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Phone className="h-3 w-3" />
          {m.phoneNumber}
        </span>
      ) : (
        "—"
      ),
  },
  {
    id: "status",
    header: "Status",
    className: "min-w-[80px]",
    chip: true,
    cell: (m) => <Badge variant="outline" className="text-[10px] capitalize">{m.status}</Badge>,
  },
];

export function CustomerTeamSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number;
}) {
  if (hubLoading) return <LoadingBlock />;

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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {members.length} team member{members.length === 1 ? "" : "s"} on this account
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
          <Link href={`/sales/client-team?customerId=${clientId}`}>
            View all & manage
          </Link>
        </Button>
      </div>
      <CmsDataTable
        embedded
        className="min-w-[640px]"
        columns={customerTeamColumns}
        rows={members}
        rowKey={(m) => m.id}
      />
    </div>
  );
}

const portalCredentialColumns: CmsColumn<NonNullable<CustomerHubData["portalCredentials"]>[number]>[] = [
  { id: "label", header: "Label", cell: (c) => c.label ?? "Portal login" },
  { id: "setBy", header: "Set by", cell: (c) => <span className="text-muted-foreground">{c.setByLabel ?? "—"}</span> },
  {
    id: "date",
    header: "Date",
    cell: (c) => <span className="text-muted-foreground">{formatSalesDateTime(c.createdAt)}</span>,
  },
];

const inventoryCredentialColumns: CmsColumn<NonNullable<CustomerHubData["inventoryCredentials"]>[number]>[] = [
  { id: "name", header: "Name", cell: (c) => <span className="font-medium">{c.name ?? c.label}</span> },
  { id: "project", header: "Project", cell: (c) => c.projectName ?? `#${c.projectId}` },
  { id: "username", header: "Username", cell: (c) => <span className="font-mono">{c.username ?? "—"}</span> },
  { id: "type", header: "Type", cell: (c) => <span className="capitalize">{c.category ?? "—"}</span> },
  {
    id: "url",
    header: "URL",
    cell: (c) =>
      c.url ? (
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
          Open <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        "—"
      ),
  },
];

const customerTicketColumns: CmsColumn<NonNullable<CustomerHubData["tickets"]>[number]>[] = [
  { id: "id", header: "ID", cell: (t) => <span className="font-mono">#{t.id}</span> },
  { id: "subject", header: "Subject", cell: (t) => <span className="font-medium max-w-[200px] truncate block">{t.subject}</span> },
  { id: "priority", header: "Priority", cell: (t) => <span className="capitalize">{t.priority}</span> },
  { id: "status", header: "Status", cell: (t) => <span className="capitalize">{t.status}</span> },
  { id: "assigned", header: "Assigned to", cell: (t) => t.assignedToName ?? "Unassigned" },
  {
    id: "created",
    header: "Created",
    cell: (t) => <span className="text-muted-foreground">{formatSalesDateTime(t.createdAt)}</span>,
  },
  {
    id: "updated",
    header: "Updated",
    cell: (t) => (
      <span className="text-muted-foreground">
        {t.updatedAt ? format(new Date(t.updatedAt), "MMM d, yyyy") : "—"}
      </span>
    ),
  },
];

const customerTaskColumns: CmsColumn<NonNullable<CustomerHubData["tasks"]>[number]>[] = [
  {
    id: "task",
    header: "Task",
    cell: (t) => (
      <>
        <Link href={`/dev/tasks/${t.id}`} className="text-primary hover:underline font-medium">
          {t.title}
        </Link>
        <p className="text-[10px] text-muted-foreground font-mono">{t.taskNumber}</p>
      </>
    ),
  },
  { id: "project", header: "Project", cell: (t) => t.projectName ?? `#${t.projectId}` },
  { id: "developer", header: "Developer", cell: (t) => t.assigneeName ?? "Unassigned" },
  { id: "status", header: "Status", cell: (t) => <span className="capitalize">{t.status?.replace(/_/g, " ")}</span> },
  { id: "priority", header: "Priority", cell: (t) => <span className="capitalize">{t.priority}</span> },
  {
    id: "due",
    header: "Due",
    cell: (t) => (
      <span className="text-muted-foreground">
        {t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "—"}
      </span>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    className: "w-28",
    cell: (t) => <Progress value={t.progress} className="h-1.5" />,
  },
];

export function CustomerCredentialsSection({
  hub,
  hubLoading,
  portalUserId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  portalUserId: number | null;
}) {
  if (hubLoading) return <LoadingBlock />;

  const portalCreds = hub?.portalCredentials ?? [];
  const inventoryCreds = hub?.inventoryCredentials ?? [];

  if (!portalUserId && portalCreds.length === 0 && inventoryCreds.length === 0) {
    return (
      <PortalGate
        portalEnabled={false}
        message="Enable portal access to view login history, or add project inventory credentials."
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
            <CmsDataTable
              embedded
              columns={portalCredentialColumns}
              rows={portalCreds}
              rowKey={(c) => c.id}
            />
          </CardContent>
        </Card>
      ) : null}

      {inventoryCreds.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Project credentials</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CmsDataTable
              embedded
              columns={inventoryCredentialColumns}
              rows={inventoryCreds}
              rowKey={(c) => c.id}
            />
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
  clientId: number;
}) {
  if (hubLoading) return <LoadingBlock />;

  const tickets = hub?.tickets ?? [];
  if (tickets.length === 0) {
    return <SalesEmptyState title="No tickets" description="This customer has not raised any support tickets." />;
  }

  return (
    <CmsDataTable
      embedded
      columns={customerTicketColumns}
      rows={tickets}
      rowKey={(t) => t.id}
    />
  );
}

export function CustomerTasksSection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number;
}) {
  if (hubLoading) return <LoadingBlock />;

  const tasks = hub?.tasks ?? [];
  if (tasks.length === 0) {
    return <SalesEmptyState title="No tasks" description="No development tasks linked to this customer's projects." />;
  }

  return (
    <CmsDataTable
      embedded
      columns={customerTaskColumns}
      rows={tasks}
      rowKey={(t) => t.id}
    />
  );
}

export function CustomerInventorySection({
  hub,
  hubLoading,
  clientId,
}: {
  hub: CustomerHubData | undefined;
  hubLoading: boolean;
  clientId: number;
}) {
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = hub?.projects ?? [];
  const activeProjectId = projectId ?? projects[0]?.id ?? null;

  if (hubLoading) return <LoadingBlock />;
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null);
  const deleteProposal = useDeleteProposal();

  const statuses = useMemo(() => [...new Set(proposals.map((p) => p.status))], [proposals]);
  const filtered = statusFilter === "all" ? proposals : proposals.filter((p) => p.status === statusFilter);

  const totalValue = useMemo(
    () => proposals.reduce((s, p) => s + resolveProposalTotal(p).finalTotal, 0),
    [proposals],
  );
  const approved = proposals.filter((p) => p.status === "approved" || (p.status as string) === "converted").length;
  const pending = proposals.filter((p) => p.status === "draft" || p.status === "sent" || p.status === "seen").length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProposal.mutateAsync(deleteTarget.id);
      toast.success(`Proposal ${deleteTarget.number} deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete proposal");
    }
  };

  const proposalColumns = useMemo<CmsColumn<Proposal>[]>(
    () => [
      {
        id: "number",
        header: "Proposal #",
        cell: (p) => (
          <Link href={`/sales/proposals/${p.id}`} className="font-mono text-primary hover:underline font-medium">
            {p.number}
          </Link>
        ),
      },
      {
        id: "title",
        header: "Title",
        cell: (p) => <div className="font-medium max-w-[220px] truncate">{p.title}</div>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (p) => (
          <span className="tabular-nums font-medium">{formatCurrency(resolveProposalTotal(p).finalTotal)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (p) => <SalesStatusBadge variant="proposal" value={p.status} />,
      },
      {
        id: "assigned",
        header: "Assigned to",
        cell: (p) => <span className="text-muted-foreground">{p.assignedToUser?.name ?? "—"}</span>,
      },
      {
        id: "created",
        header: "Created",
        cell: (p) => <span className="text-muted-foreground">{formatSalesDateTime(p.createdAt)}</span>,
      },
      {
        id: "validUntil",
        header: "Valid until",
        cell: (p) => (
          <span className="text-muted-foreground">
            {p.validUntil ? format(new Date(p.validUntil), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (p) => {
          const canDelete = ["draft", "revised", "declined", "expired"].includes(p.status);
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Edit proposal"
                onClick={() => setEditId(p.id)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              {canDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Delete proposal"
                  onClick={() => setDeleteTarget(p)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [setEditId, setDeleteTarget],
  );

  const proposalDialogs = (
    <>
      <ProposalFormSheet open={createOpen} onOpenChange={setCreateOpen} defaultCustomerId={customerId} />
      <ProposalFormSheet
        open={editId !== null}
        onOpenChange={(o) => { if (!o) setEditId(null); }}
        editId={editId}
      />
      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>{deleteTarget?.number}</strong> and all its audit history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteProposal.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (proposals.length === 0) {
    return (
      <>
        <SalesEmptyState
          title="No proposals"
          description="No proposals have been created for this customer yet."
          actionLabel="Create first proposal"
          onAction={() => setCreateOpen(true)}
        />
        {proposalDialogs}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New proposal
        </Button>
      </div>

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
            <CmsDataTable
              embedded
              columns={proposalColumns}
              rows={filtered}
              rowKey={(p) => p.id}
            />
          </CardContent>
        </Card>
      ) : (
        <SalesEmptyState
          title={`No ${statusFilter.replace(/_/g, " ")} proposals`}
          description="Try selecting a different status filter."
        />
      )}
      {proposalDialogs}
    </div>
  );
}

// ── Invoices ───────────────────────────────────────────────────────────────────

const customerInvoiceColumns: CmsColumn<SalesInvoice>[] = [
  {
    id: "number",
    header: "Invoice #",
    cell: (inv) => (
      <Link href={`/sales/invoices/${inv.id}`} className="font-mono text-primary hover:underline font-medium">
        {inv.number}
      </Link>
    ),
  },
  {
    id: "title",
    header: "Title",
    cell: (inv) => <span className="max-w-[200px] truncate block">{inv.title ?? "—"}</span>,
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (inv) => <span className="tabular-nums font-medium">{formatCurrency(inv.amount)}</span>,
  },
  {
    id: "paid",
    header: "Paid",
    align: "right",
    cell: (inv) => (
      <span className="tabular-nums text-emerald-600">{formatCurrency(inv.paidAmount ?? 0)}</span>
    ),
  },
  {
    id: "due",
    header: "Due",
    align: "right",
    cell: (inv) => {
      const remaining = calcRemaining(inv.amount, inv.paidAmount ?? 0);
      return (
        <span
          className={cn(
            "tabular-nums font-medium",
            remaining > 0 && inv.status !== "cancelled" && "text-destructive",
          )}
        >
          {inv.status === "cancelled" ? "—" : formatCurrency(remaining)}
        </span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    chip: true,
    cell: (inv) => <SalesStatusBadge variant="invoice" value={inv.status} />,
  },
  {
    id: "dueDate",
    header: "Due date",
    cell: (inv) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {format(new Date(inv.dueDate), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "created",
    header: "Created",
    cell: (inv) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatSalesDateTime(inv.createdAt)}</span>
    ),
  },
];

const customerPaymentColumns: CmsColumn<SalesPayment>[] = [
  {
    id: "receipt",
    header: "Receipt #",
    className: "whitespace-nowrap min-w-[132px]",
    cell: (p) => (
      <Link href={`/sales/receipts/${p.id}`} className="font-mono font-medium text-primary hover:underline">
        {p.receiptNumber}
      </Link>
    ),
  },
  {
    id: "invoice",
    header: "Invoice",
    className: "whitespace-nowrap min-w-[120px]",
    cell: (p) => {
      const docInvoiceId = paymentDocumentInvoiceId(p);
      return (
        <Link href={`/sales/invoices/${docInvoiceId}`} className="font-mono text-primary hover:underline">
          {p.invoiceNumber ?? `INV-${docInvoiceId}`}
        </Link>
      );
    },
  },
  {
    id: "installment",
    header: "Installment",
    cell: (p) => (
      <span className="text-muted-foreground max-w-[140px] truncate block">
        {p.installmentName ?? (p.installmentId ? `Inst #${p.installmentId}` : "—")}
      </span>
    ),
  },
  { id: "mode", header: "Mode", cell: (p) => formatPaymentMethod(p.paymentMethod) },
  {
    id: "transactionId",
    header: "Transaction ID",
    cell: (p) => (
      <span className="font-mono text-muted-foreground max-w-[120px] truncate block" title={p.transactionId ?? undefined}>
        {p.transactionId ?? "—"}
      </span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    cell: (p) => <span className="tabular-nums font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>,
  },
  {
    id: "invoiceStatus",
    header: "Invoice status",
    chip: true,
    cell: (p) => <SalesStatusBadge variant="invoice" value={p.invoiceStatus} />,
  },
  {
    id: "paymentDate",
    header: "Payment date",
    cell: (p) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatSalesPaymentDate(p.paymentDate)}</span>
    ),
  },
  {
    id: "createdAt",
    header: "Created at",
    cell: (p) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatSalesDateTime(p.createdAt)}</span>
    ),
  },
  {
    id: "createdBy",
    header: "Created by",
    cell: (p) =>
      p.recordedByName ? (
        <ExecutiveAvatar name={p.recordedByName} avatarUrl={p.recordedByAvatarUrl} className="max-w-[140px]" />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    align: "right",
    cell: (p) => {
      const docInvoiceId = paymentDocumentInvoiceId(p);
      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/sales/invoices/${docInvoiceId}`}>Invoice</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/sales/receipts/${p.id}`}>Receipt</Link>
          </Button>
        </div>
      );
    },
  },
];

type StatementTableRow = {
  key: string;
  date: string;
  details: string;
  href?: string;
  amount: number;
  payment: number;
  balance: number;
  isBeginning?: boolean;
  isEmpty?: boolean;
};

const statementLedgerColumns: CmsColumn<StatementTableRow>[] = [
  {
    id: "date",
    header: "Date",
    className: "w-[100px]",
    cell: (row) => <span className="text-muted-foreground">{row.date}</span>,
  },
  {
    id: "details",
    header: "Details",
    cell: (row) =>
      row.isEmpty ? (
        <span className="block text-center text-muted-foreground py-6">{row.details}</span>
      ) : row.href ? (
        <Link href={row.href} className="text-primary hover:underline leading-relaxed">
          {row.details}
        </Link>
      ) : (
        <span className={row.isBeginning ? "text-muted-foreground" : undefined}>{row.details}</span>
      ),
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    className: "w-[90px]",
    cell: (row) =>
      row.isEmpty ? null : (
        <span className="tabular-nums text-red-700 dark:text-red-400">
          {row.amount > 0 ? formatStatementTableAmount(row.amount) : row.isBeginning ? "0.00" : ""}
        </span>
      ),
  },
  {
    id: "payment",
    header: "Payments",
    align: "right",
    className: "w-[90px]",
    cell: (row) =>
      row.isEmpty ? null : (
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
          {row.payment > 0 ? formatStatementTableAmount(row.payment) : row.isBeginning ? "0.00" : ""}
        </span>
      ),
  },
  {
    id: "balance",
    header: "Balance",
    align: "right",
    className: "w-[100px]",
    cell: (row) =>
      row.isEmpty ? null : (
        <span
          className={cn(
            "tabular-nums font-medium",
            row.balance < 0 && "text-amber-700",
            row.balance > 0 && "text-foreground",
          )}
        >
          {formatStatementTableAmount(row.balance)}
        </span>
      ),
  },
];

export function CustomerInvoicesSection({
  invoices,
  customerId,
  outstanding,
  isLoading = false,
  invoicesTotal,
}: {
  invoices: SalesInvoice[];
  customerId: number;
  outstanding?: number;
  isLoading?: boolean;
  invoicesTotal?: number;
}) {
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);

  if (isLoading) return <LoadingBlock />;

  const billableInvoices = invoices.filter((i) => i.status !== "cancelled");
  const totalInvoiced = billableInvoices.reduce((s, i) => s + i.amount, 0);
  const computedOutstanding =
    outstanding ??
    billableInvoices.reduce((s, i) => s + Math.max(0, i.amount - (i.paidAmount ?? 0)), 0);
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const invoicesTruncated = invoicesTotal != null && invoicesTotal > invoices.length;

  if (invoices.length === 0) {
    return (
      <>
        <div className="flex items-center justify-end">
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </Button>
        </div>
        <SalesEmptyState
          title="No invoices"
          description="No invoices have been raised for this customer yet."
          actionLabel="Create first invoice"
          onAction={() => setCreateInvoiceOpen(true)}
        />
        <InvoiceFormSheet open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen} defaultCustomerId={customerId} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateInvoiceOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New invoice
        </Button>
      </div>

      <PortalKpiGrid
        columns={3}
        count={3}
        items={[
          { title: "Invoices", value: invoices.length, icon: FileText, accent: "blue", delay: 0 },
          {
            title: "Total invoiced",
            value: formatCurrency(totalInvoiced),
            icon: IndianRupee,
            accent: "violet",
            delay: 1,
          },
          {
            title: "Outstanding",
            value: formatCurrency(computedOutstanding),
            icon: Receipt,
            accent: "red",
            alert: computedOutstanding > 0,
            delay: 2,
          },
        ]}
      />

      {invoicesTruncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          Showing {invoices.length} of {invoicesTotal} invoices. Use the global Invoices list for the full history.
        </p>
      ) : null}

      <CmsDataTable
        embedded
        columns={customerInvoiceColumns}
        rows={sortedInvoices}
        rowKey={(inv) => inv.id}
      />

      <InvoiceFormSheet open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen} defaultCustomerId={customerId} />
    </div>
  );
}

// ── Payments ─────────────────────────────────────────────────────────────────────

export function CustomerPaymentsSection({
  payments,
  customerId,
  isLoading = false,
  paymentsTotal,
}: {
  payments: SalesPayment[];
  customerId: number;
  isLoading?: boolean;
  paymentsTotal?: number;
}) {
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  if (isLoading) return <LoadingBlock />;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.paymentDate ?? b.createdAt).getTime() - new Date(a.paymentDate ?? a.createdAt).getTime(),
  );
  const paymentsTruncated = paymentsTotal != null && paymentsTotal > payments.length;

  if (payments.length === 0) {
    return (
      <>
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setRecordPaymentOpen(true)}>
            <Receipt className="h-3.5 w-3.5" />
            Record payment
          </Button>
        </div>
        <SalesEmptyState
          title="No payments"
          description="No payments have been recorded for this customer yet."
          actionLabel="Record payment"
          onAction={() => setRecordPaymentOpen(true)}
        />
        <RecordPaymentDialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen} customerId={customerId} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setRecordPaymentOpen(true)}>
          <Receipt className="h-3.5 w-3.5" />
          Record payment
        </Button>
      </div>

      <PortalKpiGrid
        columns={2}
        count={2}
        items={[
          { title: "Payments", value: payments.length, icon: Receipt, accent: "green", delay: 0 },
          {
            title: "Total paid",
            value: formatCurrency(totalPaid),
            icon: TrendingUp,
            accent: "green",
            delay: 1,
          },
        ]}
      />

      {paymentsTruncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          Showing {payments.length} of {paymentsTotal} payments. Use the global Payments list for the full history.
        </p>
      ) : null}

      <CmsDataTable
        embedded
        className="min-w-[1100px]"
        columns={customerPaymentColumns}
        rows={sortedPayments}
        rowKey={(p) => p.id}
      />

      <RecordPaymentDialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen} customerId={customerId} />
    </div>
  );
}

// ── Statement ──────────────────────────────────────────────────────────────────

type PeriodPreset = "all" | "this_year" | "last_year" | "last_6m" | "last_3m" | "this_month" | "custom";

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
}: {
  customer: Customer;
  statement: {
    summary: { totalBilled: number; totalPaid: number; outstanding: number };
    invoices: SalesInvoice[];
    payments: SalesPayment[];
  } | undefined;
  statementLoading: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const branding = useSalesDocumentBranding();

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
  const allPayments = statement?.payments ?? [];

  const ledger = useMemo(
    () => buildCustomerStatementLedger(allInvoices, allPayments, from, to),
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

  const statementRows = useMemo<StatementTableRow[]>(() => {
    const beginningDate =
      fromDate || format(new Date(allInvoices[0]?.createdAt ?? new Date()), "yyyy-MM-dd");
    const rows: StatementTableRow[] = [
      {
        key: "__beginning",
        date: beginningDate,
        details: "Beginning Balance",
        amount: 0,
        payment: 0,
        balance: ledger.beginningBalance,
        isBeginning: true,
      },
    ];
    if (ledger.rows.length === 0) {
      rows.push({
        key: "__empty",
        date: "",
        details: "No transactions in the selected period",
        amount: 0,
        payment: 0,
        balance: 0,
        isEmpty: true,
      });
    } else {
      rows.push(
        ...ledger.rows.map((row) => ({
          key: row.key,
          date: format(new Date(row.date), "yyyy-MM-dd"),
          details: row.details,
          href: row.href,
          amount: row.amount,
          payment: row.payment,
          balance: row.balance,
        })),
      );
    }
    return rows;
  }, [ledger, fromDate, allInvoices]);

  const handleDownloadPdf = () => {
    setPdfLoading(true);
    try {
      downloadCustomerStatementPdf({
        customer,
        company: branding,
        companyGstin: branding.gstin,
        ledger,
        periodLabel,
        showingText,
        fromDate,
      });
      toast.success("Statement PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

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
                className="h-8 gap-1.5 text-xs"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                title="Download PDF"
              >
                {pdfLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                PDF
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
      <div ref={printRef} className="rounded-xl border bg-white shadow-sm overflow-hidden text-foreground">
        {/* Issuer letterhead */}
        <div className="px-8 pt-8 pb-6 border-b">
          <p className="text-sm font-bold leading-snug">{branding.companyName}</p>
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed max-w-md">
            {branding.address}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            GSTIN Number: {branding.gstin}
          </p>
          {customFieldsForDocument(branding, "statement").map((field) => (
            <p key={field.id} className="text-xs text-muted-foreground mt-1">
              {field.label}: {field.value}
            </p>
          ))}
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* To / Account Summary */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">To</p>
              <p className="text-sm font-bold">{customer.companyName}</p>
              {customer.location ? (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {customer.location}
                </p>
              ) : null}
              {customer.gstin ? (
                <p className="text-xs text-muted-foreground">GSTIN Number: {customer.gstin}</p>
              ) : null}
            </div>

            <div className="space-y-1 sm:text-right">
              <div className="flex items-start justify-between sm:justify-end gap-4 sm:block">
                <p className="text-sm font-bold">Account Summary</p>
                <p className="text-[11px] text-muted-foreground sm:mt-1">{periodLabel}</p>
              </div>
              <StatementSummaryRow
                label="Beginning Balance"
                value={formatStatementSummaryAmount(ledger.beginningBalance)}
              />
              <StatementSummaryRow
                label="Invoiced Amount"
                value={formatStatementSummaryAmount(ledger.invoicedInPeriod)}
              />
              <StatementSummaryRow
                label="Amount Paid"
                value={formatStatementSummaryAmount(ledger.paidInPeriod)}
              />
              <StatementSummaryRow
                label="Balance Due"
                value={formatStatementSummaryAmount(ledger.balanceDue)}
                bold
                alert={ledger.balanceDue > 0}
              />
            </div>
          </div>

          <p className="text-[11px] text-center text-muted-foreground py-1">{showingText}</p>

          {/* Ledger table */}
          <CmsDataTable
            embedded
            columns={statementLedgerColumns}
            rows={statementRows}
            rowKey={(row) => row.key}
            getRowClassName={(row) =>
              row.isBeginning
                ? "bg-muted/20 hover:bg-muted/20"
                : row.isEmpty
                  ? "hover:bg-transparent"
                  : undefined
            }
          />

          <p className="text-sm font-bold text-right pt-2">
            Balance Due {formatStatementSummaryAmount(ledger.balanceDue)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CustomerInstallmentsSection({
  installments,
  payments,
  invoices,
  customerId,
}: {
  installments: Installment[];
  payments: SalesPayment[];
  invoices: SalesInvoice[];
  customerId: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
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

  const createDialog = (
    <CreateInstallmentDialog open={createOpen} onOpenChange={setCreateOpen} defaultCustomerId={customerId} />
  );

  if (installments.length === 0) {
    return (
      <>
        <SalesEmptyState
          title="No installments"
          description="Open an approved proposal, create a payment schedule, then receive payment on each milestone when the client pays."
          actionLabel="View proposals"
          onAction={() => { window.location.href = "/sales/proposals"; }}
        />
        {createDialog}
      </>
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
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New installment
        </Button>
      </div>

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
            editable
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
                const invoice =
                  invoices.find((inv) => inv.id === inst.invoiceId) ??
                  invoices.find((inv) => inv.installmentId === inst.id);
                const instPayments = payments.filter(
                  (p) =>
                    p.installmentId === inst.id ||
                    (invoice ? p.invoiceId === invoice.id : inst.invoiceId ? p.invoiceId === inst.invoiceId : false),
                );
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
                    {(invoice || inst.invoiceId) ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Invoice</span>
                        <Link
                          href={`/sales/invoices/${invoice?.id ?? inst.invoiceId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {invoice?.number ?? `INV-${inst.invoiceId}`}
                        </Link>
                        {invoice ? <SalesStatusBadge variant="invoice" value={invoice.status} /> : null}
                      </div>
                    ) : null}
                    <InstallmentProgress paid={inst.paidAmount} total={inst.dueAmount} />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Paid</span><p className="font-semibold tabular-nums">{formatCurrency(inst.paidAmount)}</p></div>
                      <div><span className="text-muted-foreground">Remaining</span><p className="font-semibold tabular-nums text-destructive">{formatCurrency(remaining)}</p></div>
                      <div><span className="text-muted-foreground">Total</span><p className="font-semibold tabular-nums">{formatCurrency(inst.dueAmount)}</p></div>
                    </div>
                    {instPayments.length > 0 ? (
                      <div className="pt-2 border-t">
                        <p className="text-[10px] uppercase text-muted-foreground mb-1">Payment history</p>
                        {instPayments.map((p) => {
                          const docInvoiceId = paymentDocumentInvoiceId(p);
                          return (
                          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-xs py-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link href={`/sales/receipts/${p.id}`} className="text-primary hover:underline font-mono">
                                {p.receiptNumber}
                              </Link>
                              <Link
                                href={`/sales/invoices/${docInvoiceId}`}
                                className="text-primary hover:underline font-mono"
                              >
                                {p.invoiceNumber ?? `INV-${docInvoiceId}`}
                              </Link>
                            </div>
                            <span className="tabular-nums">{formatCurrency(p.amount)}</span>
                            <span className="text-muted-foreground">{formatSalesPaymentDate(p.paymentDate)}</span>
                            <span className="text-muted-foreground/70 text-[10px]">· {formatSalesDateTime(p.createdAt)}</span>
                          </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {remaining > 0 ? <OutstandingBadge amount={remaining} /> : null}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ) : null}
      {createDialog}
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
