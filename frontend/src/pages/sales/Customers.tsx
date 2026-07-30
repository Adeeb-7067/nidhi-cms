import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Building2, Plus, Download, KeyRound, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { API_PAGE_LIMIT_CAP, useTablePagination } from "@/lib/table-pagination";
import { apiUrl } from "@/lib/api-base";
import { customFetch } from "@/api/custom-fetch";
import {
  useListCustomers,
  useCustomersSummary,
  useDeleteCustomer,
  salesKeys,
  type Customer,
  type CustomerStatus,
  type CustomerType,
} from "@/api/sales";
import {
  formatCurrency,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  CustomerFormModal,
  CustomerProvisionPortalDialog,
  CustomersSummaryBar,
} from "@/modules/sales/components";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCustomersCsv(customers: Customer[]) {
  const headers = [
    "ID",
    "Company",
    "Contact",
    "Email",
    "Phone",
    "Location",
    "Type",
    "Status",
    "Total Sales",
    "Outstanding",
    "Created by",
    "Created",
  ];
  const rows = customers.map((c) => [
    c.id,
    c.companyName,
    c.contactPerson,
    c.email,
    c.phone ?? "",
    c.location ?? "",
    c.type,
    c.status,
    c.totalSales,
    c.outstanding,
    c.createdByUser?.name ?? "",
    formatSalesDateTime(c.createdAt),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "all">("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [provisionTarget, setProvisionTarget] = useState<Customer | null>(null);
  const [exporting, setExporting] = useState(false);

  const deleteCustomer = useDeleteCustomer();

  const listParams = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListCustomers(listParams);
  const { data: summary, isLoading: summaryLoading } = useCustomersSummary();
  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportParams = { ...listParams, page: 1, limit: API_PAGE_LIMIT_CAP };
      const qs = new URLSearchParams(
        Object.entries(exportParams).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ).toString();
      const result = await qc.fetchQuery({
        queryKey: salesKeys.customers(exportParams),
        queryFn: () => customFetch<{ customers: Customer[]; total: number }>(
          apiUrl(`/api/sales/customers${qs ? `?${qs}` : ""}`),
        ),
      });
      downloadCustomersCsv(result.customers);
      toast.success(`Exported ${result.customers.length} customer(s)`);
    } catch (err) {
      toastApiError(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, typeFilter, resetPage]);

  const openCreate = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingCustomer(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer.mutateAsync(deleteTarget.id);
      toast.success(`Customer "${deleteTarget.companyName}" deleted`);
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete customer");
    }
  };

  const columns: CmsColumn<Customer>[] = [
    {
      id: "company",
      header: "Company",
      cell: (c) => (
        <Link href={`/sales/customers/${c.id}`} className="block min-w-0 hover:text-primary">
          <p className="font-medium">{c.companyName}</p>
          <p className="text-[10px] text-muted-foreground">{c.email}</p>
          {!c.portalUserId ? (
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Portal not enabled</p>
          ) : null}
        </Link>
      ),
    },
    {
      id: "createdBy",
      header: "Created by",
      className: "min-w-[120px]",
      cell: (c) =>
        c.createdByUser ? (
          <ExecutiveAvatar name={c.createdByUser.name} avatarUrl={c.createdByUser.avatarUrl} />
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        ),
    },
    { id: "contact", header: "Contact", cell: (c) => c.contactPerson },
    { id: "phone", header: "Phone", cell: (c) => c.phone ?? "—" },
    {
      id: "location",
      header: "Location",
      className: "max-w-[140px] truncate",
      cell: (c) => c.location ?? "—",
    },
    { id: "type", header: "Type", cell: (c) => <span className="capitalize">{c.type}</span> },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (c) => <SalesStatusBadge variant="customer" value={c.status} />,
    },
    {
      id: "sales",
      header: "Total sales",
      align: "right",
      cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.totalSales)}</span>,
    },
    {
      id: "outstanding",
      header: "Outstanding",
      align: "right",
      cell: (c) => (
        <span className={`tabular-nums ${c.outstanding > 0 ? "text-destructive font-medium" : ""}`}>
          {formatCurrency(c.outstanding)}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (c) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatSalesDateTime(c.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "w-[72px]",
      cell: (c) => (
        <CmsRowActions
          label="Customer actions"
          items={[
            {
              label: "Enable portal",
              icon: KeyRound,
              onSelect: () => setProvisionTarget(c),
              hidden: !!c.portalUserId,
            },
            {
              label: "Edit",
              icon: Pencil,
              onSelect: () => openEdit(c),
            },
            {
              label: "Delete",
              icon: Trash2,
              onSelect: () => setDeleteTarget(c),
              variant: "destructive",
              separatorBefore: true,
              disabled: c.hasPayments,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Customer management"
        description="Central customer database — profiles, proposals, invoices, and payments."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customers" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleExport}
              disabled={exporting || isLoading}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add customer
            </Button>
          </div>
        }
      />

      <CustomersSummaryBar loading={summaryLoading} summary={summary} />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search customers…">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as CustomerStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CUSTOMER_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as CustomerType | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SalesFilterBar>

      <CmsDataTable
        columns={columns}
        rows={customers}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: Building2,
          title: "No customers found",
          description: "Try a different search term or filter.",
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: customers.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />
      <CustomerFormModal
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        customer={editingCustomer}
      />

      {provisionTarget ? (
        <CustomerProvisionPortalDialog
          open={provisionTarget != null}
          onOpenChange={(open) => !open && setProvisionTarget(null)}
          customerId={provisionTarget.id}
          defaultEmail={provisionTarget.email}
          defaultCompany={provisionTarget.companyName}
          onSuccess={() => {
            void refetch();
            setProvisionTarget(null);
          }}
        />
      ) : null}

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                deleteTarget.hasPayments ? (
                  <>
                    <strong>{deleteTarget.companyName}</strong> has recorded payments and cannot be deleted.
                    Set status to inactive instead.
                  </>
                ) : (
                  <>
                    This will permanently remove <strong>{deleteTarget.companyName}</strong> from the sales
                    customer list. The linked admin company record is not deleted.
                  </>
                )
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCustomer.isPending}>
              {deleteTarget?.hasPayments ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {deleteTarget && !deleteTarget.hasPayments ? (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteCustomer.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }}
              >
                {deleteCustomer.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalPageShell>
  );
}
