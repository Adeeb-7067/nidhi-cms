import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  AlertCircle,
  CalendarClock,
  Clock,
  IndianRupee,
  Layers,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import { useListInstallments, useListCustomers, type Installment } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { formatInstallmentSequence, formatSalesDateTime, readSearchParam } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  CreateInstallmentDialog,
} from "@/modules/sales/components";

type StatusTab = "all" | "pending" | "partial" | "paid" | "overdue";

export default function InstallmentsPage() {
  const proposalIdParam = readSearchParam("proposalId");
  const customerIdParam = readSearchParam("customerId");
  const proposalId = proposalIdParam ? Number(proposalIdParam) : undefined;
  const initialCustomerId = customerIdParam ? Number(customerIdParam) : undefined;
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [customerId, setCustomerId] = useState<string>(
    initialCustomerId ? String(initialCustomerId) : "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();

  useEffect(() => {
    resetPage();
  }, [search, statusTab, customerId, resetPage]);

  const { data: customersData } = useListCustomers({ limit: 300 });
  const customers = customersData?.customers ?? [];

  const listParams = {
    ...(proposalId ? { proposalId } : {}),
    ...(customerId !== "all" ? { customerId: Number(customerId) } : {}),
    ...(statusTab !== "all" ? { status: statusTab } : {}),
    search: search.trim() || undefined,
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListInstallments(listParams);
  const installments = data?.installments ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary ?? {
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    outstanding: 0,
  };

  const columns = useMemo<CmsColumn<Installment>[]>(
    () => [
      {
        id: "name",
        header: "Milestone",
        cell: (inst) => (
          <div className="min-w-0">
            <Link
              href={`/sales/installments/${inst.id}`}
              className="font-medium hover:text-primary"
            >
              {inst.name}
            </Link>
            {formatInstallmentSequence(inst.sequenceNumber, inst.sequenceTotal) ? (
              <p className="text-[10px] text-muted-foreground">
                {formatInstallmentSequence(inst.sequenceNumber, inst.sequenceTotal)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        className: "max-w-[180px] truncate",
        cell: (inst) => inst.customerName ?? `Customer #${inst.customerId}`,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (inst) => <SalesStatusBadge variant="installment" value={inst.status} />,
      },
      {
        id: "due",
        header: "Due",
        align: "right",
        cell: (inst) => (
          <span className="font-medium tabular-nums">{formatCurrency(inst.dueAmount)}</span>
        ),
      },
      {
        id: "paid",
        header: "Paid",
        align: "right",
        cell: (inst) => (
          <span className="tabular-nums text-emerald-700">{formatCurrency(inst.paidAmount)}</span>
        ),
      },
      {
        id: "remaining",
        header: "Remaining",
        align: "right",
        cell: (inst) => (
          <span className="tabular-nums">
            {formatCurrency(Math.max(0, inst.dueAmount - inst.paidAmount))}
          </span>
        ),
      },
      {
        id: "dueDate",
        header: "Due date",
        cell: (inst) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {format(new Date(inst.dueDate), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "created",
        header: "Created",
        cell: (inst) => (
          <span className="text-muted-foreground whitespace-nowrap text-[11px]">
            {formatSalesDateTime(inst.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        hideable: false,
        cell: (inst) => (
          <CmsRowActions
            label="Installment actions"
            viewHref={`/sales/installments/${inst.id}`}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Installment management"
        description={
          proposalId
            ? `Milestones for proposal #${proposalId}. Open a milestone and receive payment when the client pays.`
            : "Track milestone billing from approved proposals. Receive payment on each installment — invoices are created automatically."
        }
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Installments" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New plan
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Installments", value: summary.total, icon: CalendarClock, accent: "blue", delay: 0 },
          { title: "Partial", value: summary.partial, icon: Clock, accent: "amber", delay: 1 },
          {
            title: "Overdue",
            value: summary.overdue,
            icon: AlertCircle,
            accent: "red",
            alert: summary.overdue > 0,
            delay: 2,
          },
          {
            title: "Outstanding",
            value: formatCurrency(summary.outstanding),
            hint: summary.overdue ? `${summary.overdue} overdue` : undefined,
            icon: IndianRupee,
            accent: "violet",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search installment or client…"
      >
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="h-9 w-full sm:w-[220px]">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SalesFilterBar>

      <CmsChipTabs
        value={statusTab}
        onValueChange={(v) => setStatusTab(v as StatusTab)}
        items={(["all", "pending", "partial", "paid", "overdue"] as StatusTab[]).map((s) => ({
          value: s,
          label: s === "all" ? "All" : s,
          count: s === "all" ? summary.total : summary[s],
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={installments}
        rowKey={(inst) => inst.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        viewStorageKey="sales-installments"
        empty={{
          icon: Layers,
          title: "No installments found",
          description: "Create an installment plan from an approved proposal or change the client filter.",
          actionLabel: "New plan",
          onAction: () => setCreateOpen(true),
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: installments.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      <CreateInstallmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PortalPageShell>
  );
}
