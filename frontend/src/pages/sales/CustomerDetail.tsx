import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, Globe, MapPin, Pencil, Bell, KeyRound, FilePlus, Trash2, MessageSquare, IndianRupee, Wallet, AlertCircle } from "lucide-react";
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
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CmsChipTabs } from "@/components/cms";
import {
  useGetCustomer,
  useGetCustomerHub,
  useGetCustomerStatement,
  useListProposals,
  useListInvoices,
  useListPayments,
  useDeleteCustomer,
  useBootstrapCustomerDiscussion,
} from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import { getDiscussionsHref } from "@/lib/discussions-navigation";
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
  CustomerInvoicesSection,
  CustomerPaymentsSection,
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
  const validId = Number.isFinite(customerId) && customerId > 0;
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const deleteCustomer = useDeleteCustomer();
  const bootstrapDiscussion = useBootstrapCustomerDiscussion();

  const { data: customer, isLoading, isError } = useGetCustomer(customerId, validId);
  const { data: hub, isLoading: hubLoading } = useGetCustomerHub(customerId, validId);
  const { data: proposalsData } = useListProposals({ customerId, limit: 500 }, validId);
  const billingListParams = { customerId, limit: 500 };
  const { data: invoicesData, isLoading: invoicesLoading } = useListInvoices(billingListParams, validId);
  const { data: paymentsData, isLoading: paymentsLoading } = useListPayments(billingListParams, validId);
  const { data: statement, isLoading: statementLoading } = useGetCustomerStatement(
    customerId,
    validId && tab === "statement",
  );

  const proposals = proposalsData?.proposals ?? [];
  const proposalsTotal = proposalsData?.total ?? proposals.length;
  const payments = paymentsData?.payments ?? [];

  if (!validId) {
    return (
      <SalesEmptyState
        title="Invalid customer"
        description="The customer link is not valid."
        actionLabel="Back to customers"
        onAction={() => navigate("/sales/customers")}
      />
    );
  }

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
  const invoices = invoicesData?.invoices ?? customer.invoices ?? [];
  const hasInstallmentSchedule = installments.length > 0;
  const totalCollected =
    customer.totalCollected ??
    (hasInstallmentSchedule
      ? installments.reduce((sum, row) => sum + row.paidAmount, 0)
      : Math.max(0, customer.totalSales - customer.outstanding));
  const canDeleteCustomer = !(customer.hasPayments ?? false) && payments.length === 0;

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast.success(`Customer "${customer.companyName}" deleted`);
      navigate("/sales/customers");
    } catch (err) {
      toastApiError(err, "Failed to delete customer");
    }
  };

  const handleCreateDiscussion = async () => {
    try {
      const result = await bootstrapDiscussion.mutateAsync(customer.id);
      toast.success("Discussion channel created");
      if (result.directConversationId) {
        navigate(getDiscussionsHref(null, { directConversationId: result.directConversationId }));
      }
    } catch (err) {
      toastApiError(err, "Failed to create discussion channel");
    }
  };

  const ticketCount = hub?.tickets.length ?? 0;
  const taskCount = hub?.tasks.length ?? 0;
  const teamCount = hub?.teamMembers.length ?? 0;
  const projectCount = hub?.projects.length ?? 0;
  const tabCount = (n: number) => (n > 0 ? n : undefined);

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
            {customer.portalUserId ? (
              customer.directConversationId ? (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                  <Link
                    href={getDiscussionsHref(null, { directConversationId: customer.directConversationId })}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Open discussion
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => void handleCreateDiscussion()}
                  disabled={bootstrapDiscussion.isPending}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Create discussion
                </Button>
              )
            ) : null}
            {!customer.portalUserId ? (
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
            {canDeleteCustomer ? (
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
        {customer.portalUserId ? (
          <span className="text-xs text-green-700 dark:text-green-400">Portal enabled</span>
        ) : (
          <span className="text-xs text-amber-700 dark:text-amber-400">Portal not enabled</span>
        )}
        <Link href={`/admin/clients`} className="text-xs text-primary hover:underline">
          Company #{customer.id}
        </Link>
      </div>

      <div className="space-y-4">
        <CmsChipTabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: "overview", label: "Overview" },
            { value: "proposals", label: "Proposals", count: tabCount(proposalsTotal) },
            { value: "invoices", label: "Invoices", count: tabCount(invoices.length) },
            { value: "payments", label: "Payments", count: tabCount(payments.length) },
            { value: "installments", label: "Installments", count: tabCount(installments.length) },
            { value: "statement", label: "Statement" },
            { value: "projects", label: "Projects", count: tabCount(projectCount) },
            { value: "team", label: "Team", count: tabCount(teamCount) },
            { value: "admin", label: "Admin" },
            { value: "credentials", label: "Credentials" },
            { value: "tickets", label: "Tickets", count: tabCount(ticketCount) },
            { value: "tasks", label: "Tasks", count: tabCount(taskCount) },
            { value: "inventory", label: "Inventory" },
          ]}
        />
        <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="overview" className="mt-0">
          <PortalKpiGrid
            columns={3}
            count={3}
            items={[
              {
                title: hasInstallmentSchedule ? "Scheduled" : "Total sales",
                value: formatCurrency(customer.totalSales),
                hint: hasInstallmentSchedule
                  ? `${installments.length} milestone${installments.length === 1 ? "" : "s"}`
                  : undefined,
                icon: IndianRupee,
                accent: "blue",
                delay: 0,
              },
              {
                title: "Collected",
                value: formatCurrency(totalCollected),
                icon: Wallet,
                accent: "green",
                delay: 1,
              },
              {
                title: "Outstanding",
                value: formatCurrency(customer.outstanding),
                icon: AlertCircle,
                accent: "red",
                alert: customer.outstanding > 0,
                delay: 2,
              },
            ]}
          />

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
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p>Company record #{customer.id} (shared with Admin → Companies)</p>
                {customer.portalUserId ? (
                  customer.directConversationId ? (
                    <p>Portal enabled — client discussion channel is active</p>
                  ) : (
                    <p>Portal enabled — use Create discussion to open a client chat channel</p>
                  )
                ) : (
                  <p>Portal access not enabled — use Enable portal to add login</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {formatSalesDateTime(customer.createdAt)}
              </p>
            </CardContent>
          </Card>

          <CustomerOverviewExtras
            proposalsCount={proposalsTotal}
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

        <TabsContent value="invoices" className="mt-4">
          <CustomerInvoicesSection
            invoices={invoices}
            customerId={customer.id}
            outstanding={customer.outstanding}
            isLoading={invoicesLoading}
            invoicesTotal={invoicesData?.total}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <CustomerPaymentsSection
            payments={payments}
            customerId={customer.id}
            isLoading={paymentsLoading}
            paymentsTotal={paymentsData?.total}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <CustomerProjectsSection
            hub={hub}
            hubLoading={hubLoading}
            clientId={customer.id}
            customerId={customer.id}
          />
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <CustomerAdminSection customer={customer} hub={hub} hubLoading={hubLoading} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <CustomerTeamSection hub={hub} hubLoading={hubLoading} clientId={customer.id} />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <CustomerCredentialsSection hub={hub} hubLoading={hubLoading} portalUserId={customer.portalUserId} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <CustomerTicketsSection hub={hub} hubLoading={hubLoading} clientId={customer.id} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CustomerTasksSection hub={hub} hubLoading={hubLoading} clientId={customer.id} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <CustomerInventorySection hub={hub} hubLoading={hubLoading} clientId={customer.id} />
        </TabsContent>

        <TabsContent value="statement" className="mt-4">
          <CustomerStatementSection
            customer={customer}
            statement={statement}
            statementLoading={statementLoading}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4">
          <CustomerInstallmentsSection
            installments={installments}
            payments={payments}
            invoices={invoices}
            customerId={customer.id}
          />
        </TabsContent>
      </Tabs>
      </div>

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
              This permanently removes <strong>{customer.companyName}</strong> from the sales customer list.
              Customers with recorded payments cannot be deleted — set status to inactive instead.
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
