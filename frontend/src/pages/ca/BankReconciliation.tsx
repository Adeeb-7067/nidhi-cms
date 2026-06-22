import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockBankTransactions, bankReconciliationSummary } from "@/modules/ca/mock-data";
import { formatCompactCurrency } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CAEmptyState, ReconciliationTable } from "@/modules/ca/components";

export default function BankReconciliation() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockBankTransactions.filter((t) => {
      const matchesSearch = !q || t.party.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.reconciliationStatus === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  const summary = bankReconciliationSummary;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Bank reconciliation"
        description="Incoming/outgoing transactions — NEFT, RTGS, UPI — matched vs unmatched"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Bank reconciliation" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search party, reference…" />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Matched", value: String(summary.matched), icon: Landmark, accent: "green", delay: 0 },
          { title: "Unmatched", value: String(summary.unmatched), icon: Landmark, accent: "red", alert: summary.unmatched > 0, delay: 1 },
          { title: "Incoming", value: formatCompactCurrency(summary.incomingTotal), icon: Landmark, accent: "blue", delay: 2 },
          { title: "Outgoing", value: formatCompactCurrency(summary.outgoingTotal), icon: Landmark, accent: "red", delay: 3 },
        ]}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          <TabsTrigger value="matched" className="text-xs data-[state=active]:bg-primary/10">Matched</TabsTrigger>
          <TabsTrigger value="unmatched" className="text-xs data-[state=active]:bg-primary/10">Unmatched</TabsTrigger>
          <TabsTrigger value="partial" className="text-xs data-[state=active]:bg-primary/10">Partial</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <CAEmptyState icon={Landmark} title="No transactions found" />
      ) : (
        <ReconciliationTable rows={filtered} />
      )}
    </PortalPageShell>
  );
}
