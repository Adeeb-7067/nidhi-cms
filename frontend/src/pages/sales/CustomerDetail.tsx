import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCustomerById,
  mockProposals,
  mockPayments,
  getInstallmentsByCustomer,
  getInvoicesByCustomer,
  getTimelineByCustomer,
  mockCustomerProjects,
} from "@/modules/sales/mock-data";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesStatusBadge,
  SalesEmptyState,
  InstallmentCard,
  FinancialActivityTimeline,
  InstallmentProgress,
} from "@/modules/sales/components";

export default function CustomerDetail() {
  const [, params] = useRoute("/sales/customers/:id");
  const customerId = Number(params?.id);
  const customer = getCustomerById(customerId);
  const [tab, setTab] = useState("overview");

  const proposals = useMemo(
    () => mockProposals.filter((p) => p.customerId === customerId),
    [customerId],
  );

  const installments = useMemo(
    () => getInstallmentsByCustomer(customerId),
    [customerId],
  );

  const invoices = useMemo(
    () => getInvoicesByCustomer(customerId),
    [customerId],
  );

  const timeline = useMemo(
    () => getTimelineByCustomer(customerId),
    [customerId],
  );

  const projects = useMemo(
    () => mockCustomerProjects.filter((p) => p.customerId === customerId),
    [customerId],
  );

  const payments = useMemo(
    () =>
      mockPayments.filter((p) =>
        p.customerName.toLowerCase().includes(customer?.companyName.split(" ")[0].toLowerCase() ?? ""),
      ),
    [customer?.companyName],
  );

  if (!customer) {
    return (
      <SalesEmptyState
        title="Customer not found"
        description={`No customer with ID #${customerId} in demo data.`}
        actionLabel="Back to customers"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={customer.companyName}
        description={`${customer.contactPerson} · ${customer.location}`}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customers", href: "/sales/customers" },
          { label: customer.companyName },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/sales/customers">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SalesStatusBadge variant="customer" value={customer.status} />
        <span className="text-xs text-muted-foreground capitalize">{customer.type}</span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="proposals" className="text-xs">
            Proposals ({proposals.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">
            Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="financial" className="text-xs">
            Financial
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] uppercase text-muted-foreground">
                  Total sales
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(customer.totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-[10px] uppercase text-muted-foreground">
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p
                  className={`text-lg font-bold ${customer.outstanding > 0 ? "text-destructive" : ""}`}
                >
                  {formatCurrency(customer.outstanding)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="hover:text-primary">
                  {customer.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{customer.location}</span>
              </div>
              {customer.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {customer.website}
                  </a>
                </div>
              )}
              {customer.gstin && (
                <p className="text-xs text-muted-foreground">GSTIN: {customer.gstin}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Customer since {format(new Date(customer.createdAt), "MMMM yyyy")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4 space-y-2">
          {proposals.length === 0 ? (
            <SalesEmptyState title="No proposals" description="No proposals linked to this customer." />
          ) : (
            proposals.map((p) => (
              <Link key={p.id} href={`/sales/proposals/${p.id}`}>
                <Card className="hover:border-primary/30">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.number}</p>
                    </div>
                    <SalesStatusBadge variant="proposal" value={p.status} />
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-2">
          {invoices.length === 0 ? (
            <SalesEmptyState title="No invoices" description="Invoices appear after installment billing is set up." />
          ) : (
            invoices.map((inv) => (
              <Link key={inv.id} href={`/sales/invoices/${inv.id}`}>
                <Card className="hover:border-primary/30">
                  <CardContent className="p-4 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono">{inv.number}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.installmentName ?? inv.projectName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <SalesStatusBadge variant="invoice" value={inv.status} />
                      <p className="text-xs font-bold mt-1 tabular-nums">{formatCurrency(inv.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <SalesEmptyState title="No payments" description="No payment records for this customer." />
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell className="text-xs font-mono">{pay.invoiceNumber}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatCurrency(pay.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(pay.dueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{pay.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="financial" className="mt-4 space-y-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InstallmentProgress paid={project.paidAmount} total={project.totalAmount} />
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Project value</p><p className="font-bold">{formatCurrency(project.totalAmount)}</p></div>
                  <div><p className="text-muted-foreground">Paid</p><p className="font-bold text-emerald-700">{formatCurrency(project.paidAmount)}</p></div>
                  <div><p className="text-muted-foreground">Outstanding</p><p className="font-bold text-amber-700">{formatCurrency(calcRemaining(project.totalAmount, project.paidAmount))}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
          {installments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {installments.map((inst) => (
                <InstallmentCard key={inst.id} installment={inst} href={`/sales/installments/${inst.id}`} compact />
              ))}
            </div>
          )}
          {timeline.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Financial timeline</CardTitle></CardHeader>
              <CardContent><FinancialActivityTimeline events={timeline} limit={8} /></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <SalesEmptyState
                title="No notes"
                description="Add internal notes about this customer account."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
