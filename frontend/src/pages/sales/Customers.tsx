import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Building2, Plus, Download, Pencil, Trash2, KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DataPagination } from "@/components/ui/data-pagination";
import { API_PAGE_LIMIT_CAP, useTablePagination } from "@/lib/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api-base";
import { customFetch } from "@/api/custom-fetch";
import {
  useListCustomers,
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
  SalesEmptyState,
  CustomerFormModal,
  CustomerProvisionPortalDialog,
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

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState icon={Building2} title="Failed to load customers" description="Could not fetch customers." actionLabel="Retry" onAction={() => refetch()} />
      ) : customers.length === 0 ? (
        <SalesEmptyState icon={Building2} title="No customers found" description="Try a different search term or filter." />
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Created by</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Total sales</TableHead>
                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link href={`/sales/customers/${c.id}`} className="block min-w-0 hover:text-primary">
                        <p className="text-xs font-medium">{c.companyName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.email}</p>
                        {!c.portalUserId ? (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Portal not enabled</p>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      {c.createdByUser ? (
                        <ExecutiveAvatar name={c.createdByUser.name} avatarUrl={c.createdByUser.avatarUrl} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.contactPerson}</TableCell>
                    <TableCell className="text-xs">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">{c.location ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{c.type}</TableCell>
                    <TableCell>
                      <SalesStatusBadge variant="customer" value={c.status} />
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(c.totalSales)}</TableCell>
                    <TableCell className={`text-xs text-right tabular-nums ${c.outstanding > 0 ? "text-destructive font-medium" : ""}`}>
                      {formatCurrency(c.outstanding)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatSalesDateTime(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        {!c.portalUserId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-700 hover:text-amber-800"
                            title="Enable client portal"
                            onClick={() => setProvisionTarget(c)}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit customer"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete customer"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          <DataPagination
            page={page}
            total={total}
            limit={limit}
            loadedRowCount={customers.length}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
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
                deleteTarget.totalSales > 0 || deleteTarget.outstanding > 0 ? (
                  <>
                    <strong>{deleteTarget.companyName}</strong> has billing history and cannot be deleted.
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
              {deleteTarget && (deleteTarget.totalSales > 0 || deleteTarget.outstanding > 0) ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {deleteTarget && deleteTarget.totalSales === 0 && deleteTarget.outstanding === 0 ? (
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
