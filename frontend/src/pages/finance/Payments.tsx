import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Wallet, ArrowDownLeft, ArrowUpRight, Bell, Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MONEY_IN_CLASS, MONEY_OUT_CLASS, PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceErrorState,
  FinanceSourceBadge,
  GstClassificationBadge,
  RecordOutgoingPaymentModal,
  PaymentEditModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { useTablePagination } from "@/lib/table-pagination";
import { usePermissions } from "@/modules/permissions/usePermission";
import type { FinancePayment } from "@/api/finance";
import { PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import {
  PageHeroSkeleton,
  PageChartGridSkeleton,
  PageFilterBarSkeleton,
  PageTabsSkeleton,
  PageTableSkeleton,
} from "@/components/loading";
import { useListPayments, useListInvoices, useRemindInvoice, usePaymentsSummary, useSyncSalesPayments, useDeletePayment, type ListPaymentsParams } from "@/api/finance";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [directionTab, setDirectionTab] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    const d = new URLSearchParams(window.location.search).get("direction");
    return d === "incoming" || d === "outgoing" ? d : "all";
  });
  const { page, setPage, resetPage, limit, apiLimit } = useTablePagination(20);
  const [outgoingModalOpen, setOutgoingModalOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<FinancePayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancePayment | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_payments", "edit");
  const canDelete = can("finance_payments", "delete");
  const deletePayment = useDeletePayment();

  // Deep-link from CA: /finance/payments?create=1&direction=incoming
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      setOutgoingModalOpen(true);
    }
  }, []);

  const params: ListPaymentsParams = useMemo(
    () => ({
      page,
      limit: apiLimit,
      search: search || undefined,
      direction: directionTab === "all" ? undefined : (directionTab as "incoming" | "outgoing"),
    }),
    [page, apiLimit, search, directionTab],
  );
  const { data, isLoading, isError, refetch } = useListPayments(params);
  const { data: summary } = usePaymentsSummary();
  const { data: overdueInvoicesData } = useListInvoices({ status: "overdue", limit: 20 });
  const { data: upcomingInvoicesData } = useListInvoices({ status: "unpaid", limit: 4 });
  const remindInvoice = useRemindInvoice();
  const syncSales = useSyncSalesPayments();

  const payments = data?.payments ?? [];
  const total = data?.total ?? 0;
  const overdueInvoices = overdueInvoicesData?.invoices ?? [];
  const upcomingInvoices = upcomingInvoicesData?.invoices ?? [];

  const incomingTotal = summary?.incoming ?? 0;
  const outgoingTotal = summary?.outgoing ?? 0;
  const gstIncoming = summary?.gstIncoming ?? 0;
  const nonGstIncoming = summary?.nonGstIncoming ?? 0;
  const gstTaxCollected = summary?.gstTaxCollected ?? 0;

  const handleRemind = async (id: number, number: string) => {
    try {
      await remindInvoice.mutateAsync(id);
      toast.success(`Reminder sent for ${number}`);
    } catch (err) {
      toastApiError(err, "Failed to send reminder");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePayment.mutateAsync(deleteTarget.id);
      toast.success("Payment deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete payment");
    }
  };

  const showActions = canEdit || canDelete;

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

  const chipItems = (["all", "incoming", "outgoing"] as const).map((d) => ({
    value: d,
    label: d === "all" ? "All" : d,
  }));

  const columns: CmsColumn<FinancePayment>[] = [
    {
      id: "date",
      header: "Date",
      cell: (p) => (
        <Link href={`/finance/payments/${p.source ?? "finance"}/${p.id}`} className="hover:text-primary">
          {format(new Date(p.date), "MMM d, yyyy")}
        </Link>
      ),
    },
    {
      id: "source",
      header: "Source",
      chip: true,
      cell: (p) => <FinanceSourceBadge source={p.source} />,
    },
    {
      id: "direction",
      header: "Direction",
      cell: (p) =>
        p.direction === "incoming" ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <ArrowDownLeft className="h-3 w-3" /> In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
            <ArrowUpRight className="h-3 w-3" /> Out
          </span>
        ),
    },
    {
      id: "party",
      header: "Party",
      className: "max-w-[160px] truncate",
      cell: (p) => <span className="font-medium">{p.partyName}</span>,
    },
    {
      id: "reference",
      header: "Reference",
      cell: (p) => <span className="font-mono text-muted-foreground">{p.reference}</span>,
    },
    {
      id: "mode",
      header: "Mode",
      cell: (p) => PAYMENT_MODE_LABELS[p.mode],
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) => <FinanceStatusBadge variant="payment" value={p.status} />,
    },
    {
      id: "gst",
      header: "GST",
      chip: true,
      cell: (p) => <GstClassificationBadge gstEnabled={p.gstEnabled} />,
    },
    {
      id: "gstAmt",
      header: "GST amt",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums text-muted-foreground">
          {(p.gstAmount ?? 0) > 0 ? formatCurrency(p.gstAmount ?? 0) : "—"}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (p) => (
        <span
          className={`font-medium tabular-nums ${p.direction === "incoming" ? MONEY_IN_CLASS : MONEY_OUT_CLASS}`}
        >
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    ...(showActions
      ? [
          {
            id: "actions",
            header: "Actions",
            align: "right" as const,
            cell: (p: FinancePayment) => {
              const isFinance = !p.source || p.source === "finance";
              if (!isFinance) return <span className="text-[10px] text-muted-foreground">Sales</span>;
              return (
                <div className="flex justify-end gap-1">
                  {canEdit && p.direction === "outgoing" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditPayment(p)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => setDeleteTarget(p)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            },
          } satisfies CmsColumn<FinancePayment>,
        ]
      : []),
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payments"
        description="Track incoming and outgoing payments, receipts, and due reminders."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payments" }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              disabled={syncSales.isPending}
              onClick={async () => {
                try {
                  const result = await syncSales.mutateAsync({ limit: 500 });
                  toast.success(`Synced ${result.mirrored} sales payment(s)`);
                  refetch();
                } catch (err) {
                  toastApiError(err, "Sales sync failed");
                }
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncSales.isPending ? "animate-spin" : ""}`} />
              Sync sales
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setOutgoingModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Record payment
            </Button>
          </div>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Incoming", value: formatCurrency(incomingTotal), icon: ArrowDownLeft, accent: "green", delay: 0 },
          { title: "GST incoming", value: formatCurrency(gstIncoming), icon: ArrowDownLeft, accent: "blue", delay: 1 },
          { title: "Non-GST incoming", value: formatCurrency(nonGstIncoming), icon: ArrowDownLeft, accent: "default", delay: 2 },
          { title: "GST collected", value: formatCurrency(gstTaxCollected), icon: Wallet, accent: "amber", delay: 3 },
          { title: "Outgoing", value: formatCurrency(outgoingTotal), icon: ArrowUpRight, accent: "red", delay: 4 },
          { title: "Net cash flow", value: formatCurrency(incomingTotal - outgoingTotal), icon: Wallet, accent: "blue", delay: 5 },
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
              <div key={`${inv.source ?? "finance"}-${inv.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{inv.number}</p>
                    <FinanceSourceBadge source={inv.source} />
                  </div>
                  <p className="text-muted-foreground">{inv.clientName}</p>
                </div>
                {inv.source === "finance" ? (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleRemind(inv.id, inv.number)} disabled={remindInvoice.isPending}>
                    Send reminder
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                    <Link href={inv.detailHref ?? `/sales/invoices/${inv.id}`}>View</Link>
                  </Button>
                )}
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

      <FinanceFilterBar search={search} onSearchChange={(v) => { setSearch(v); resetPage(); }} searchPlaceholder="Search party, reference…" onExport={() => toast.success("Payments export started")} />

      <CmsChipTabs
        value={directionTab}
        onValueChange={(v) => {
          setDirectionTab(v);
          resetPage();
        }}
        items={chipItems}
      />

      <CmsDataTable
        columns={columns}
        rows={payments}
        rowKey={(p) => `${p.source ?? "finance"}-${p.id}`}
        empty={{
          icon: Wallet,
          title: "No payments found",
          description: "Adjust filters to see payment records.",
        }}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />

      <RecordOutgoingPaymentModal open={outgoingModalOpen} onOpenChange={setOutgoingModalOpen} onSuccess={() => refetch()} />
      <PaymentEditModal
        open={editPayment != null}
        onOpenChange={(open) => { if (!open) setEditPayment(null); }}
        payment={editPayment}
        onSuccess={() => { refetch(); setEditPayment(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete payment?"
        description={
          deleteTarget?.direction === "incoming"
            ? "This receipt will be removed and any linked invoice balance restored."
            : "This disbursement will be permanently removed."
        }
        loading={deletePayment.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
