import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Wallet, ArrowDownLeft, ArrowUpRight, Bell, Printer, FileDown } from "lucide-react";
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
import { mockPayments, mockFinanceInvoices, upcomingPayments } from "@/modules/finance/mock-data";
import { formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinancePageLoader,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { useClientPagination } from "@/lib/table-pagination";
import { DataPagination } from "@/components/ui/data-pagination";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [directionTab, setDirectionTab] = useState<string>("all");
  const { loading } = useMockPageState();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockPayments.filter((p) => {
      const matchesSearch =
        !q ||
        p.partyName.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q);
      const matchesDirection = directionTab === "all" || p.direction === directionTab;
      return matchesSearch && matchesDirection;
    });
  }, [search, directionTab]);

  const { pageItems, pagination } = useClientPagination(filtered);

  const incomingTotal = mockPayments.filter((p) => p.direction === "incoming" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const outgoingTotal = mockPayments.filter((p) => p.direction === "outgoing" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const overdueInvoices = mockFinanceInvoices.filter((i) => i.status === "overdue");

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading payments…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payments"
        description="Track incoming and outgoing payments, receipts, and due reminders."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payments" }]}
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
            {overdueInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs">
                <div>
                  <p className="font-medium">{inv.number}</p>
                  <p className="text-muted-foreground">{inv.clientName}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toast.success(`Reminder sent for ${inv.number} (demo)`)}>
                  Send reminder
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming due dates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcomingPayments.slice(0, 4).map((p) => (
              <div key={p.id} className="flex justify-between text-xs border-b pb-2 last:border-0">
                <span className="truncate max-w-[180px]">{p.party}</span>
                <span className="tabular-nums font-medium">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search party, reference…" onExport={() => toast.success("Payments export started (demo)")} />

      <Tabs value={directionTab} onValueChange={setDirectionTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "incoming", "outgoing"] as const).map((d) => (
            <TabsTrigger key={d} value={d} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {d === "all" ? "All" : d}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState icon={Wallet} title="No payments found" description="Adjust filters to see payment records." />
      ) : (
        <>
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
                  <TableHead className="text-xs text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => (
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
                    <TableCell className="text-right">
                      {p.direction === "incoming" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success("Receipt preview opened (demo)")}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toast.success("Receipt PDF download (demo)")}>
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination {...pagination} />
        </>
      )}
    </PortalPageShell>
  );
}
