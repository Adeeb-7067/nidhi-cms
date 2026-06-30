import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, Globe, MapPin, Pencil, Bell, KeyRound, FilePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetCustomer,
  useGetCustomerHub,
  useGetCustomerStatement,
  useListProposals,
  useListPayments,
  useDeleteCustomer,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  SalesEmptyState,
  CustomerFormModal,
  CustomerRemindDialog,
  CustomerProvisionPortalDialog,
  ProposalFormSheet,
} from "@/modules/sales/components";
import {
  CustomerAdminSection,
  CustomerCredentialsSection,
  CustomerInstallmentsSection,
  CustomerInventorySection,
  CustomerOverviewExtras,
  CustomerProjectsSection,
  CustomerProposalsSection,
  CustomerStatementSection,
  CustomerTasksSection,
  CustomerTeamSection,
  CustomerTicketsSection,
} from "@/modules/sales/components/customer-detail-sections";

export default function CustomerDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/sales/customers/:id");
  const customerId = Number(params?.id);
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const deleteCustomer = useDeleteCustomer();

  const { data: customer, isLoading, isError } = useGetCustomer(customerId, !!customerId);
  const { data: hub, isLoading: hubLoading } = useGetCustomerHub(customerId, !!customerId);
  const { data: proposalsData } = useListProposals({ customerId }, !!customerId);
  const { data: paymentsData } = useListPayments({ customerId }, !!customerId);
  const { data: statement, isLoading: statementLoading } = useGetCustomerStatement(
    customerId,
    !!customerId && tab === "statement",
  );

  const proposals = proposalsData?.proposals ?? [];
  const payments = paymentsData?.payments ?? [];

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </PortalPageShell>
    );
  }

  if (isError || !customer) {
    return (
      <SalesEmptyState
        title="Customer not found"
        description={`No customer with ID #${customerId} exists.`}
        actionLabel="Back to customers"
        onAction={() => window.history.back()}
      />
    );
  }

  const installments = customer.installments ?? [];
  const invoices = customer.invoices ?? [];
  const hasBillingHistory =
    proposals.length > 0 || invoices.length > 0 || installments.length > 0 || payments.length > 0;

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast.success(`Customer "${customer.companyName}" deleted`);
      navigate("/sales/customers");
    } catch (err) {
      toastApiError(err, "Failed to delete customer");
    }
  };

  const ticketCount = hub?.tickets.length ?? 0;
  const taskCount = hub?.tasks.length ?? 0;
  const teamCount = hub?.teamMembers.length ?? 0;
  const projectCount = hub?.projects.length ?? 0;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={customer.companyName}
        description={`${customer.contactPerson}${customer.location ? ` · ${customer.location.split("\n")[0]}` : ""}`}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customers", href: "/sales/customers" },
          { label: customer.companyName },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setProposalOpen(true)}>
              <FilePlus className="h-3.5 w-3.5" />
              New proposal
            </Button>
            {!customer.clientId && !customer.portalUserId ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setPortalOpen(true)}>
                <KeyRound className="h-3.5 w-3.5" />
                Enable portal
              </Button>
            ) : null}
            {customer.outstanding > 0 ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setRemindOpen(true)}>
                <Bell className="h-3.5 w-3.5" />
                Send reminder
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {!hasBillingHistory ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/sales/customers">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="customer" value={customer.status} />
        <span className="text-xs text-muted-foreground capitalize">{customer.type}</span>
        {customer.leadId ? (
          <Link href={`/sales/leads/${customer.leadId}`} className="text-xs text-primary hover:underline">
            Lead #{customer.leadId}
          </Link>
        ) : null}
        {customer.clientId ? (
          <Link href={`/admin/clients`} className="text-xs text-primary hover:underline">
            Client #{customer.clientId}
          </Link>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">Customer info</TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs">Proposals ({proposals.length})</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs">Projects ({projectCount})</TabsTrigger>
          <TabsTrigger value="admin" className="text-xs">Custom admin</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Team ({teamCount})</TabsTrigger>
          <TabsTrigger value="credentials" className="text-xs">Credentials</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs">Tickets ({ticketCount})</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks ({taskCount})</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
          <TabsTrigger value="statement" className="text-xs">Statement</TabsTrigger>
          <TabsTrigger value="installments" className="text-xs">Installments ({installments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] uppercase text-muted-foreground">Total sales</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(customer.totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] uppercase text-muted-foreground">Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className={`text-lg font-bold ${customer.outstanding > 0 ? "text-destructive" : ""}`}>
                  {formatCurrency(customer.outstanding)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Customer information</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${customer.email}`} className="hover:text-primary">{customer.email}</a>
              </div>
              {customer.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              ) : null}
              {customer.location ? (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{customer.location}</span>
                </div>
              ) : null}
              {customer.website ? (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={customer.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {customer.website}
                  </a>
                </div>
              ) : null}
              {customer.gstin ? <p className="text-xs text-muted-foreground">GSTIN: {customer.gstin}</p> : null}
              {(customer.clientId || customer.portalUserId) ? (
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  {customer.clientId ? <p>Client record #{customer.clientId}</p> : null}
                  {customer.portalUserId ? <p>Portal access enabled</p> : null}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Customer since {format(new Date(customer.createdAt), "MMMM yyyy")}
              </p>
            </CardContent>
          </Card>

          <CustomerOverviewExtras
            proposalsCount={proposals.length}
            invoicesCount={invoices.length}
            paymentsCount={payments.length}
          />

          {proposals.length > 0 ? (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent proposals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {proposals.slice(0, 5).map((p) => (
                  <Link key={p.id} href={`/sales/proposals/${p.id}`}>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2 hover:border-primary/30">
                      <div>
                        <p className="text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.number}</p>
                      </div>
                      <SalesStatusBadge variant="proposal" value={p.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          <CustomerProposalsSection proposals={proposals} customerId={customer.id} />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <CustomerProjectsSection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <CustomerAdminSection customer={customer} hub={hub} hubLoading={hubLoading} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <CustomerTeamSection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <CustomerCredentialsSection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <CustomerTicketsSection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CustomerTasksSection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <CustomerInventorySection hub={hub} hubLoading={hubLoading} clientId={customer.clientId} />
        </TabsContent>

        <TabsContent value="statement" className="mt-4">
          <CustomerStatementSection
            customer={customer}
            statement={statement}
            statementLoading={statementLoading}
            payments={payments}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4">
          <CustomerInstallmentsSection
            installments={installments}
            payments={payments}
            invoices={invoices}
          />
        </TabsContent>
      </Tabs>

      <CustomerFormModal open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <ProposalFormSheet open={proposalOpen} onOpenChange={setProposalOpen} defaultCustomerId={customer.id} />
      <CustomerRemindDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        customerId={customer.id}
        customerEmail={customer.email}
      />
      <CustomerProvisionPortalDialog
        open={portalOpen}
        onOpenChange={setPortalOpen}
        customerId={customer.id}
        defaultEmail={customer.email}
        defaultCompany={customer.companyName}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{customer.companyName}</strong> from the sales database.
              Customers with billing history cannot be deleted — set status to inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteCustomer.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
