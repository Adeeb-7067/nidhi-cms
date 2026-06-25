import { useMemo, useState } from "react";
import { CalendarClock, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListInstallments } from "@/api/sales";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
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
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useListInstallments();
  const allInstallments = data?.installments ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allInstallments.filter((i) => {
      const matchesSearch = !q || i.name.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || i.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [allInstallments, search, statusTab]);

  const totalDue = allInstallments.reduce(
    (s, i) => s + calcRemaining(i.dueAmount, i.paidAmount),
    0,
  );
  const overdueCount = allInstallments.filter((i) => i.status === "overdue").length;
  const partialCount = allInstallments.filter((i) => i.status === "partial").length;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Installment management"
        description="Track milestone billing, partial payments, and collection progress per project."
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Installments" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New plan
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialSummaryCard title="Installments" value={allInstallments.length} icon={CalendarClock} accent="blue" />
        <FinancialSummaryCard title="Partial" value={partialCount} icon={CalendarClock} accent="amber" />
        <FinancialSummaryCard title="Overdue" value={overdueCount} icon={CalendarClock} accent="red" alert={overdueCount > 0} />
        <FinancialSummaryCard title="Outstanding" value={formatCurrency(totalDue)} icon={CalendarClock} accent="violet" hint={overdueCount ? `${overdueCount} overdue` : undefined} />
      </div>

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search installment name…" />

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "pending", "partial", "paid", "overdue"] as StatusTab[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s} ({s === "all" ? allInstallments.length : allInstallments.filter((i) => i.status === s).length})
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
      ) : filtered.length === 0 ? (
        <SalesEmptyState icon={Layers} title="No installments found" description="Create an installment plan from an approved proposal." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inst) => (
            <InstallmentCard key={inst.id} installment={installmentCardData(inst)} href={`/sales/installments/${inst.id}`} />
          ))}
        </div>
      )}
      <CreateInstallmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PortalPageShell>
  );
}
