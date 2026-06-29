import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Building2, Plus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
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
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
  CustomerFormModal,
} from "@/modules/sales/components";

const PAGE_SIZE = 20;

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
    format(new Date(c.createdAt), "yyyy-MM-dd"),
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
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const listParams = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch } = useListCustomers(listParams);
  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportParams = { ...listParams, page: 1, limit: 1000 };
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
    setPage(1);
  }, [search, statusFilter, typeFilter]);

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
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setDrawerOpen(true)}>
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
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Total sales</TableHead>
                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link href={`/sales/customers/${c.id}`} className="block min-w-0 hover:text-primary">
                        <p className="text-xs font-medium">{c.companyName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.email}</p>
                      </Link>
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
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} customer{total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
      <CustomerFormModal open={drawerOpen} onOpenChange={setDrawerOpen} />
    </PortalPageShell>
  );
}
