import { useEffect, useState } from "react";
import { CalendarClock, Layers, Plus } from "lucide-react";
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
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListInstallments, useListCustomers } from "@/api/sales";
import { formatCurrency } from "@/modules/sales/constants";
import { readSearchParam } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesEmptyState,
  InstallmentCard,
  FinancialSummaryCard,
  CreateInstallmentDialog,
} from "@/modules/sales/components";
import { installmentCardData } from "@/modules/sales/adapters";

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

  useEffect(() => { resetPage(); }, [search, statusTab, customerId, resetPage]);

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
  const summary = data?.summary ?? { total: 0, pending: 0, partial: 0, paid: 0, overdue: 0, outstanding: 0 };

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialSummaryCard title="Installments" value={summary.total} icon={CalendarClock} accent="blue" />
        <FinancialSummaryCard title="Partial" value={summary.partial} icon={CalendarClock} accent="amber" />
        <FinancialSummaryCard title="Overdue" value={summary.overdue} icon={CalendarClock} accent="red" alert={summary.overdue > 0} />
        <FinancialSummaryCard title="Outstanding" value={formatCurrency(summary.outstanding)} icon={CalendarClock} accent="violet" hint={summary.overdue ? `${summary.overdue} overdue` : undefined} />
      </div>

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search installment or client…">
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
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

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "pending", "partial", "paid", "overdue"] as StatusTab[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s} ({s === "all" ? summary.total : summary[s]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState icon={Layers} title="Failed to load installments" description="Could not fetch installments." actionLabel="Retry" onAction={() => refetch()} />
      ) : installments.length === 0 ? (
        <SalesEmptyState icon={Layers} title="No installments found" description="Create an installment plan from an approved proposal or change the client filter." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {installments.map((inst) => (
              <InstallmentCard key={inst.id} installment={installmentCardData(inst)} href={`/sales/installments/${inst.id}`} />
            ))}
          </div>
          <DataPagination
            page={page}
            total={total}
            limit={limit}
            loadedRowCount={installments.length}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
      <CreateInstallmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PortalPageShell>
  );
}
