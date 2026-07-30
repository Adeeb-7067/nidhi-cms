import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/modules/finance/constants";
import type { FinanceInvoiceStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  InvoiceFormModal,
  GstClassificationBadge,
  FinanceConfirmDialog,
  FinanceSourceBadge,
} from "@/modules/finance/components";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import {
  useListInvoices,
  useInvoiceAging,
  useInvoicesSummary,
  useDeleteInvoice,
  type ListInvoicesParams,
  type FinanceInvoice,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { useTablePagination } from "@/lib/table-pagination";
import { toast } from "sonner";

const STATUS_TABS: (FinanceInvoiceStatus | "all")[] = [
  "all",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
];

export default function FinanceInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const { page, setPage, resetPage, limit, apiLimit } = useTablePagination(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<FinanceInvoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceInvoice | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_invoices", "edit");
  const canDelete = can("finance_invoices", "delete");
  const deleteInvoice = useDeleteInvoice();

  const params: ListInvoicesParams = useMemo(
    () => ({
      page,
      limit: apiLimit,
      search: search || undefined,
      status: statusTab === "all" ? undefined : (statusTab as FinanceInvoiceStatus),
    }),
    [page, apiLimit, search, statusTab],
  );
  const { data, isLoading, isError, refetch } = useListInvoices(params);
  const { data: agingData } = useInvoiceAging();
  const { data: summaryData } = useInvoicesSummary();

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const buckets = agingData?.buckets ?? [];
  const statusCounts = summaryData?.counts ?? { all: 0 };
  const totalOutstanding = summaryData?.outstanding ?? 0;
  const gstCount = summaryData?.gstCount ?? 0;
  const nonGstCount = summaryData?.nonGstCount ?? 0;
  const gstTaxTotal = summaryData?.gstTaxTotal ?? 0;

  const openCreate = () => {
    setEditInvoice(null);
    setDrawerOpen(true);
  };
  const openEdit = (inv: FinanceInvoice) => {
    setEditInvoice(inv);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync(deleteTarget.id);
      toast.success(`Invoice ${deleteTarget.number} deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete invoice");
    }
  };

  const chipItems = useMemo(
    () =>
      STATUS_TABS.map((s) => ({
        value: s,
        label: s === "all" ? "All" : s.replace("_", " "),
        count: statusCounts[s] ?? 0,
      })),
    [statusCounts],
  );

  const columns = useMemo<CmsColumn<FinanceInvoice>[]>(
    () => [
      {
        id: "number",
        header: "Invoice #",
        cell: (inv) => {
          const href = inv.detailHref ?? `/finance/invoices/${inv.id}`;
          return (
            <Link href={href} className="font-mono hover:text-primary">
              {inv.number}
            </Link>
          );
        },
      },
      {
        id: "source",
        header: "Source",
        chip: true,
        cell: (inv) => <FinanceSourceBadge source={inv.source} />,
      },
      {
        id: "client",
        header: "Client",
        cell: (inv) => (
          <span className="font-medium max-w-[160px] block truncate">{inv.clientName}</span>
        ),
      },
      {
        id: "project",
        header: "Project",
        cell: (inv) => (
          <span className="text-muted-foreground max-w-[120px] block truncate">
            {inv.projectName ?? "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (inv) => <FinanceStatusBadge variant="invoice" value={inv.status} />,
      },
      {
        id: "gst",
        header: "GST",
        chip: true,
        cell: (inv) => <GstClassificationBadge gstEnabled={inv.gstEnabled} />,
      },
      {
        id: "tax",
        header: "Tax",
        align: "right",
        cell: (inv) => (
          <span className="tabular-nums text-muted-foreground">
            {inv.gstEnabled && (inv.tax ?? 0) > 0 ? formatCurrency(inv.tax ?? 0) : "—"}
          </span>
        ),
      },
      {
        id: "total",
        header: "Total",
        align: "right",
        cell: (inv) => (
          <span className="font-medium tabular-nums">{formatCurrency(inv.total ?? 0)}</span>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        align: "right",
        cell: (inv) => (
          <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(inv.paidAmount)}
          </span>
        ),
      },
      {
        id: "due",
        header: "Due date",
        cell: (inv) => (
          <span className="text-muted-foreground">
            {format(new Date(inv.dueDate), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (inv) => {
          const href = inv.detailHref ?? `/finance/invoices/${inv.id}`;
          const isFinance = !inv.source || inv.source === "finance";
          return (
            <CmsRowActions
              label="Invoice actions"
              viewHref={href}
              canEdit={isFinance && canEdit && inv.status !== "cancelled" && inv.paidAmount === 0}
              canDelete={isFinance && canDelete && inv.paidAmount === 0}
              onEdit={() => openEdit(inv)}
              onDelete={() => setDeleteTarget(inv)}
            />
          );
        },
      },
    ],
    [canEdit, canDelete],
  );

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Invoices"
        description="Create, track, and manage client billing documents."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Invoices" }]}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => toast.success("Bulk export started")}
            >
              <FileDown className="h-3.5 w-3.5" />
              Export all
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Create invoice
            </Button>
          </>
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        items={[
          { title: "Total invoices", value: statusCounts.all ?? 0, icon: Receipt, accent: "blue", delay: 0 },
          { title: "GST invoices", value: gstCount, icon: Receipt, accent: "blue", delay: 1 },
          { title: "Non-GST invoices", value: nonGstCount, icon: Receipt, accent: "default", delay: 2 },
          { title: "GST on invoices", value: formatCurrency(gstTaxTotal), icon: Receipt, accent: "amber", delay: 3 },
          {
            title: "Overdue",
            value: statusCounts.overdue ?? 0,
            icon: Receipt,
            accent: "red",
            alert: (statusCounts.overdue ?? 0) > 0,
            delay: 4,
          },
          {
            title: "Outstanding",
            value: formatCurrency(totalOutstanding),
            icon: Receipt,
            accent: "amber",
            alert: totalOutstanding > 0,
            delay: 5,
          },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          resetPage();
        }}
        searchPlaceholder="Search invoice # or client…"
        onExport={() => toast.success("Export started")}
      />

      <CmsChipTabs
        value={statusTab}
        onValueChange={(v) => {
          setStatusTab(v);
          resetPage();
        }}
        items={chipItems}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {buckets.map((b) => (
          <Card key={b.bucket}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
                {b.bucket}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-lg font-bold tabular-nums">{formatCurrency(b.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{b.count} invoices</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CmsDataTable
        columns={columns}
        rows={invoices}
        rowKey={(inv) => `${inv.source ?? "finance"}-${inv.id}`}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: Receipt,
          title: "No invoices found",
          description: "Adjust filters or create a new invoice.",
          actionLabel: "Create invoice",
          onAction: openCreate,
        }}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />

      <InvoiceFormModal
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditInvoice(null);
        }}
        invoice={editInvoice}
        onSuccess={() => {
          refetch();
          setEditInvoice(null);
        }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete invoice?"
        description={
          deleteTarget
            ? `${deleteTarget.number} will be permanently removed. Paid invoices must be cancelled instead.`
            : undefined
        }
        loading={deleteInvoice.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
