import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import { useListInvoices, useSalesDashboard, type SalesInvoice } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { formatProjectLabel, formatSalesDateTime } from "@/modules/sales/utils";
import { readSearchParam } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  InvoiceFormSheet,
} from "@/modules/sales/components";

type InvoiceStatus = "paid" | "unpaid" | "partial" | "overdue" | "cancelled";

const STATUS_TABS: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue", "cancelled"];

export default function Invoices() {
  const initialStatus = readSearchParam("status");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>(
    initialStatus && STATUS_TABS.includes(initialStatus as InvoiceStatus | "all") ? initialStatus : "all",
  );
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    resetPage();
  }, [search, statusTab, resetPage]);

  const listParams = {
    search: search || undefined,
    status: statusTab === "all" ? undefined : (statusTab as InvoiceStatus),
    page,
    limit: apiLimit,
  };

  const { data: invData, isLoading, isError, refetch } = useListInvoices(listParams);
  const { data: dashData } = useSalesDashboard();
  const invoices = invData?.invoices ?? [];
  const total = invData?.total ?? 0;

  const statusCounts = useMemo(() => {
    const ibs = dashData?.invoiceByStatus ?? {};
    const counts: Record<string, number> = {
      all: Object.values(ibs).reduce((sum, v) => sum + (v.count ?? 0), 0),
    };
    for (const s of STATUS_TABS) {
      if (s === "all") continue;
      counts[s] = ibs[s]?.count ?? 0;
    }
    return counts;
  }, [dashData]);

  const totalDue = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + Math.max(0, i.amount - i.paidAmount), 0);
  const paidCount = dashData?.invoiceByStatus?.paid?.count ?? statusCounts.paid ?? 0;
  const unpaidCount = dashData?.invoiceByStatus?.unpaid?.count ?? statusCounts.unpaid ?? 0;

  const columns: CmsColumn<SalesInvoice>[] = [
    {
      id: "number",
      header: "Invoice #",
      cell: (inv) => (
        <Link href={`/sales/invoices/${inv.id}`} className="font-mono hover:text-primary">
          {inv.number}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      className: "max-w-[180px] truncate font-medium",
      cell: (inv) => inv.customerName ?? `Customer #${inv.customerId}`,
    },
    {
      id: "project",
      header: "Project",
      className: "max-w-[160px] truncate",
      cell: (inv) => (
        <span title={formatProjectLabel(inv.projectId, inv.projectName)}>
          {formatProjectLabel(inv.projectId, inv.projectName)}
        </span>
      ),
    },
    {
      id: "installment",
      header: "Installment",
      className: "max-w-[140px] truncate text-muted-foreground",
      cell: (inv) =>
        inv.installmentName ?? (inv.installmentId ? `Installment #${inv.installmentId}` : "—"),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (inv) => <SalesStatusBadge variant="invoice" value={inv.status} />,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (inv) => <span className="font-medium tabular-nums">{formatCurrency(inv.amount)}</span>,
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (inv) => (
        <span className="tabular-nums text-emerald-700">{formatCurrency(inv.paidAmount)}</span>
      ),
    },
    {
      id: "due",
      header: "Due date",
      cell: (inv) => (
        <span className="text-muted-foreground">{format(new Date(inv.dueDate), "MMM d, yyyy")}</span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (inv) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatSalesDateTime(inv.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (inv) => (
        <CmsRowActions
          label="Invoice actions"
          viewHref={`/sales/invoices/${inv.id}`}
        />
      ),
    },
  ];

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Invoices"
        description="Receive payment on installments from approved proposals. Invoices are created automatically when you record a payment."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Invoices" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Total invoices", value: statusCounts.all || total, icon: Receipt, accent: "blue", delay: 0 },
          { title: "Paid", value: paidCount, icon: Receipt, accent: "green", delay: 1 },
          { title: "Unpaid", value: unpaidCount, icon: Receipt, accent: "amber", delay: 2 },
          {
            title: "Outstanding",
            value: formatCurrency(dashData?.outstanding ?? totalDue),
            icon: Receipt,
            accent: "red",
            alert: true,
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoice # or customer…"
      />

      <CmsChipTabs
        value={statusTab}
        onValueChange={setStatusTab}
        items={STATUS_TABS.map((s) => ({
          value: s,
          label: s === "all" ? "All" : s,
          count: statusCounts[s] ?? 0,
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={invoices}
        rowKey={(inv) => inv.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: Receipt,
          title: "No invoices found",
          description: "Adjust filters or create a new invoice.",
          actionLabel: "New invoice",
          onAction: () => setCreateOpen(true),
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: invoices.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <InvoiceFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PortalPageShell>
  );
}
