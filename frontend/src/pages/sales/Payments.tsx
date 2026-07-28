import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Plus, IndianRupee, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import { useListPayments, useSalesDashboard } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import {
  formatProjectLabel,
  formatSalesDateTime,
  formatSalesPaymentDate,
  paymentDocumentInvoiceId,
} from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  RecordPaymentDialog,
  ExecutiveAvatar,
} from "@/modules/sales/components";

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  card: "Card",
};

type PaymentRow = NonNullable<ReturnType<typeof useListPayments>["data"]>["payments"][number];

export default function Payments() {
  const [search, setSearch] = useState("");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [recordOpen, setRecordOpen] = useState(false);

  useEffect(() => {
    resetPage();
  }, [search, resetPage]);

  const listParams = {
    search: search || undefined,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListPayments(listParams);
  const { data: dashData } = useSalesDashboard();
  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;

  const collected = dashData?.totalRevenue ?? payments.reduce((s, p) => s + p.amount, 0);

  const columns: CmsColumn<PaymentRow>[] = [
    {
      id: "receipt",
      header: "Receipt #",
      headerClassName: "whitespace-nowrap min-w-[132px]",
      cell: (p) => (
        <Link
          href={`/sales/receipts/${p.id}`}
          className="font-mono whitespace-nowrap text-primary hover:underline underline-offset-2"
        >
          {p.receiptNumber}
        </Link>
      ),
    },
    {
      id: "invoice",
      header: "Invoice",
      headerClassName: "whitespace-nowrap min-w-[120px]",
      cell: (p) => {
        const docInvoiceId = paymentDocumentInvoiceId(p);
        return (
          <Link
            href={`/sales/invoices/${docInvoiceId}`}
            className="font-mono whitespace-nowrap text-primary hover:underline underline-offset-2"
          >
            {p.invoiceNumber ?? `INV-${docInvoiceId}`}
          </Link>
        );
      },
    },
    {
      id: "project",
      header: "Project",
      className: "max-w-[160px] truncate",
      cell: (p) => (
        <span title={formatProjectLabel(p.projectId, p.projectName)}>
          {formatProjectLabel(p.projectId, p.projectName)}
        </span>
      ),
    },
    {
      id: "installment",
      header: "Installment",
      className: "max-w-[140px] truncate text-muted-foreground",
      cell: (p) => p.installmentName ?? (p.installmentId ? `Inst #${p.installmentId}` : "—"),
    },
    {
      id: "mode",
      header: "Mode",
      cell: (p) => METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod,
    },
    {
      id: "txn",
      header: "Transaction ID",
      className: "font-mono text-muted-foreground max-w-[120px] truncate",
      cell: (p) => <span title={p.transactionId ?? undefined}>{p.transactionId ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Invoice status",
      chip: true,
      cell: (p) => (
        <SalesStatusBadge
          variant="invoice"
          value={p.invoiceStatus as "paid" | "partial" | "unpaid" | "overdue"}
        />
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.amount)}</span>,
    },
    {
      id: "paymentDate",
      header: "Payment date",
      cell: (p) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatSalesPaymentDate(p.paymentDate)}
        </span>
      ),
    },
    {
      id: "created",
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
          <ExecutiveAvatar name={p.recordedByName} avatarUrl={p.recordedByAvatarUrl} />
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

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Payments"
        description="Record full and partial payments, generate receipts, and track collections."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Payments" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setRecordOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Record payment
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Collected", value: formatCurrency(collected), icon: IndianRupee, accent: "green", delay: 0 },
          { title: "Payments logged", value: total, icon: Receipt, accent: "blue", delay: 1 },
          {
            title: "Outstanding",
            value: formatCurrency(dashData?.outstanding ?? 0),
            icon: IndianRupee,
            accent: "red",
            alert: true,
            delay: 2,
          },
          {
            title: "Pending invoices",
            value: dashData?.pendingInvoices ?? "—",
            icon: Receipt,
            accent: "amber",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipt #, transaction ID, or mode…"
      />

      <CmsDataTable
        columns={columns}
        rows={payments}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: IndianRupee,
          title: "No payments found",
          description: "Record a payment against an invoice.",
          actionLabel: "Record payment",
          onAction: () => setRecordOpen(true),
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: payments.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onSuccess={(paymentId) => {
          window.location.href = `/sales/receipts/${paymentId}`;
        }}
      />
    </PortalPageShell>
  );
}
