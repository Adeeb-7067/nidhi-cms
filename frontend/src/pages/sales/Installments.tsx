import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockInstallments, mockCustomerProjects } from "@/modules/sales/mock-data";
import { calcRemaining, formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesEmptyState,
  InstallmentCard,
  FinancialSummaryCard,
} from "@/modules/sales/components";
import { toast } from "sonner";

type StatusTab = "all" | "pending" | "partial" | "paid" | "overdue";

export default function InstallmentsPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockInstallments.filter((i) => {
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.projectName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || i.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const totalDue = mockInstallments.reduce(
    (s, i) => s + calcRemaining(i.dueAmount, i.paidAmount),
    0,
  );
  const overdueCount = mockInstallments.filter((i) => i.status === "overdue").length;
  const partialCount = mockInstallments.filter((i) => i.status === "partial").length;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Installment management"
        description="Track milestone billing, partial payments, and collection progress per project."
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Installments" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Create installment plan (demo)")}>
            <Plus className="h-3.5 w-3.5" />
            New plan
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialSummaryCard title="Active projects" value={mockCustomerProjects.length} icon={Layers} accent="blue" hint="With installment plans" />
        <FinancialSummaryCard title="Installments" value={mockInstallments.length} icon={CalendarClock} accent="violet" />
        <FinancialSummaryCard title="Partial" value={partialCount} icon={CalendarClock} accent="amber" />
        <FinancialSummaryCard title="Outstanding" value={formatCurrency(totalDue)} icon={CalendarClock} accent="red" alert={overdueCount > 0} hint={overdueCount ? `${overdueCount} overdue` : undefined} />
      </div>

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search project, customer, installment…" />

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "pending", "partial", "paid", "overdue"] as StatusTab[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {s} ({s === "all" ? mockInstallments.length : mockInstallments.filter((i) => i.status === s).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <SalesEmptyState icon={Layers} title="No installments found" description="Create an installment plan from an approved proposal." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inst) => (
            <InstallmentCard key={inst.id} installment={inst} href={`/sales/installments/${inst.id}`} />
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
