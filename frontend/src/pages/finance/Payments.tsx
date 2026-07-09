import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Wallet, ArrowDownLeft, ArrowUpRight, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  RecordOutgoingPaymentModal,
} from "@/modules/finance/components";
import { PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import {
  PageHeroSkeleton,
  PageChartGridSkeleton,
  PageFilterBarSkeleton,
  PageTabsSkeleton,
  PageTableSkeleton,
} from "@/components/loading";
import { useListPayments, useListInvoices, useRemindInvoice, type ListPaymentsParams } from "@/api/finance";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [directionTab, setDirectionTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [outgoingModalOpen, setOutgoingModalOpen] = useState(false);

  const params: ListPaymentsParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      direction: directionTab === "all" ? undefined : (directionTab as "incoming" | "outgoing"),
    }),
    [page, search, directionTab],
  );
  const { data, isLoading, isError, refetch } = useListPayments(params);
  const { data: allPayments } = useListPayments({ limit: 500 });
  const { data: overdueInvoicesData } = useListInvoices({ status: "overdue", limit: 20 });
  const { data: upcomingInvoicesData } = useListInvoices({ status: "unpaid", limit: 4 });
  const remindInvoice = useRemindInvoice();

  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const overdueInvoices = overdueInvoicesData?.invoices ?? [];
  const upcomingInvoices = upcomingInvoicesData?.invoices ?? [];

  const incomingTotal = (allPayments?.payments ?? []).filter((p) => p.direction === "incoming" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const outgoingTotal = (allPayments?.payments ?? []).filter((p) => p.direction === "outgoing" && p.status === "completed").reduce((s, p) => s + p.amount, 0);

  const handleRemind = async (id: number, number: string) => {
    try {
      await remindInvoice.mutateAsync(id);
      toast.success(`Reminder sent for ${number}`);
    } catch (err) {
      toastApiError(err, "Failed to send reminder");
    }
  };

  if (isLoading) {
    return (
      <PortalPageShell>
        <PageHeroSkeleton />
        <PageKpiSkeleton count={3} columns={3} />
        <PageChartGridSkeleton count={2} />
        <PageFilterBarSkeleton />
        <PageTabsSkeleton count={3} />
        <PageTableSkeleton rows={8} columns={7} showToolbar />
      </PortalPageShell>
    );
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payments"
        description="Track incoming and outgoing payments, receipts, and due reminders."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payments" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setOutgoingModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Incoming", value: formatCurrency(incomingTotal), icon: ArrowDownLeft, accent: "green", delay: 0 },
          { title: "Outgoing", value: formatCurrency(outgoingTotal), icon: ArrowUpRight, accent: "red", delay: 1 },
          { title: "Net cash flow", value: formatCurrency(incomingTotal - outgoingTotal), icon: Wallet, accent: "blue", delay: 2 },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              Overdue invoices — send reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueInvoices.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No overdue invoices.</p>}
            {overdueInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs">
                <div>
                  <p className="font-medium">{inv.number}</p>
                  <p className="text-muted-foreground">{inv.clientName}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleRemind(inv.id, inv.number)} disabled={remindInvoice.isPending}>
                  Send reminder
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming due dates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcomingInvoices.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Nothing due.</p>}
            {upcomingInvoices.map((inv) => (
              <div key={inv.id} className="flex justify-between text-xs border-b pb-2 last:border-0">
                <span className="truncate max-w-[180px]">{inv.number} — {inv.clientName}</span>
                <span className="tabular-nums font-medium">{formatCurrency((inv.total ?? 0) - inv.paidAmount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <FinanceFilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search party, reference…" onExport={() => toast.success("Payments export started")} />

      <Tabs value={directionTab} onValueChange={(v) => { setDirectionTab(v); setPage(1); }}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "incoming", "outgoing"] as const).map((d) => (
            <TabsTrigger key={d} value={d} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {d === "all" ? "All" : d}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {payments.length === 0 ? (
        <FinanceEmptyState icon={Wallet} title="No payments found" description="Adjust filters to see payment records." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Direction</TableHead>
                <TableHead className="text-xs">Party</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {p.direction === "incoming" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700"><ArrowDownLeft className="h-3 w-3" /> In</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700"><ArrowUpRight className="h-3 w-3" /> Out</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[160px] truncate">{p.partyName}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{p.reference}</TableCell>
                  <TableCell className="text-xs">{PAYMENT_MODE_LABELS[p.mode]}</TableCell>
                  <TableCell><FinanceStatusBadge variant="payment" value={p.status} /></TableCell>
                  <TableCell className={`text-xs text-right font-medium tabular-nums ${p.direction === "incoming" ? "text-emerald-700" : "text-red-700"}`}>
                    {p.direction === "incoming" ? "+" : "−"}{formatCurrency(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground border-t">
            <span>{total} total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={payments.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}

      <RecordOutgoingPaymentModal open={outgoingModalOpen} onOpenChange={setOutgoingModalOpen} onSuccess={() => refetch()} />
    </PortalPageShell>
  );
}
