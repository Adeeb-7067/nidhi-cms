import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockClientPayments, clientPaymentSummary } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import type { ClientPayment, PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";
import { toast } from "sonner";

export default function ClientPayments() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");

  const summary = clientPaymentSummary[period];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockClientPayments.filter(
      (p) => !q || p.clientName.toLowerCase().includes(q) || p.invoiceRef.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<ClientPayment>[]>(
    () => [
      {
        id: "client",
        header: "Client",
        cell: (p) => <span className="font-medium">{p.clientName}</span>,
      },
      {
        id: "invoice",
        header: "Invoice",
        cell: (p) => <span className="font-mono">{p.invoiceRef}</span>,
      },
      {
        id: "classification",
        header: "Classification",
        chip: true,
        cell: (p) => (
          <CmsStatusChip
            label={p.gstClassification === "gst" ? "GST" : "Non-GST"}
            tone={p.gstClassification === "gst" ? "info" : "neutral"}
          />
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (p) => <span className="tabular-nums">{formatCurrency(p.amount)}</span>,
      },
      {
        id: "gst",
        header: "GST",
        align: "right",
        cell: (p) => (
          <span className="tabular-nums text-muted-foreground">{formatCurrency(p.gstAmount)}</span>
        ),
      },
      { id: "mode", header: "Mode", cell: (p) => PAYMENT_MODE_LABELS[p.mode] },
      {
        id: "received",
        header: "Received",
        cell: (p) => (
          <span className="text-muted-foreground">
            {format(new Date(p.receivedAt), "MMM d, yyyy")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Client payment summary"
        description="Incoming payments with GST / Non-GST classification"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Client payments" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => toast.success("Export started (demo)")}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />
      <CAFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients, invoices…"
        period={period}
        onPeriodChange={setPeriod}
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "GST payments", value: formatCompactCurrency(summary.gst), icon: CreditCard, accent: "blue", delay: 0 },
          { title: "Non-GST payments", value: formatCompactCurrency(summary.nonGst), icon: CreditCard, accent: "violet", delay: 1 },
          { title: "Total received", value: formatCompactCurrency(summary.total), icon: CreditCard, accent: "green", delay: 2 },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        empty={{ icon: CreditCard, title: "No payments found" }}
      />
    </PortalPageShell>
  );
}
