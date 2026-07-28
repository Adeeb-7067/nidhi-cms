import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, CreditCard, ExternalLink, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useListPayments, type FinancePayment } from "@/api/finance";
import { formatCompactCurrency, formatCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRefLink, CaRowActions } from "@/modules/ca/components";
import {
  filterByPeriod,
  mapFinancePaymentMode,
  summarizeIncomingPayments,
} from "@/modules/ca/adapters/finance";
import {
  financeInvoiceHref,
  financePaymentHref,
  financePaymentsListHref,
} from "@/modules/ca/routes";

export default function ClientPayments() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const { data, isLoading, isError, refetch } = useListPayments({
    direction: "incoming",
    search: search || undefined,
    limit: 200,
  });

  const payments = useMemo(() => {
    const incoming = (data?.payments ?? []).filter((p) => p.direction === "incoming");
    return filterByPeriod(
      incoming.map((p) => ({ ...p, receivedAt: p.date })),
      period,
    );
  }, [data?.payments, period]);

  const summary = useMemo(() => summarizeIncomingPayments(payments), [payments]);

  const columns = useMemo<CmsColumn<FinancePayment & { receivedAt?: string }>[]>(
    () => [
      {
        id: "client",
        header: "Client",
        cell: (p) => <span className="font-medium">{p.partyName || "—"}</span>,
      },
      {
        id: "invoice",
        header: "Reference",
        cell: (p) => {
          const label = p.receiptNumber || p.reference || "—";
          if (p.invoiceId) {
            return <CaRefLink href={financeInvoiceHref(p.invoiceId)} mono>{label}</CaRefLink>;
          }
          return (
            <CaRefLink href={financePaymentHref(p.id, p.source === "sales" ? "sales" : "finance")} mono>
              {label}
            </CaRefLink>
          );
        },
      },
      {
        id: "classification",
        header: "Classification",
        chip: true,
        cell: (p) => (
          <CmsStatusChip
            label={p.gstEnabled || (p.gstAmount ?? 0) > 0 ? "GST" : "Non-GST"}
            tone={p.gstEnabled || (p.gstAmount ?? 0) > 0 ? "info" : "neutral"}
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
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(Number(p.gstAmount ?? 0))}
          </span>
        ),
      },
      {
        id: "mode",
        header: "Mode",
        cell: (p) => PAYMENT_MODE_LABELS[mapFinancePaymentMode(p.mode)],
      },
      {
        id: "received",
        header: "Received",
        cell: (p) => (
          <span className="text-muted-foreground">
            {format(new Date(p.date), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (p) => {
          const href = financePaymentHref(p.id, p.source === "sales" ? "sales" : "finance");
          return (
            <CaRowActions
              canView
              canEdit
              canDelete={false}
              onView={() => {
                window.location.href = href;
              }}
              onEdit={() => {
                window.location.href = href;
              }}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Client payment summary"
        description="Incoming payments from Finance — click a reference or View to open the payment"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Client payments" }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref({ direction: "incoming" })}>
                <Download className="h-3.5 w-3.5" /> Open Finance
              </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref({ direction: "incoming", create: true })}>
                <Plus className="h-3.5 w-3.5" /> Record payment
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
          </div>
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
        rows={payments}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        onRowClick={(p) => {
          window.location.href = financePaymentHref(p.id, p.source === "sales" ? "sales" : "finance");
        }}
        empty={{
          icon: CreditCard,
          title: "No payments found",
          actionLabel: "Open Finance payments",
          onAction: () => {
            window.location.href = financePaymentsListHref({ direction: "incoming" });
          },
        }}
      />
    </PortalPageShell>
  );
}
