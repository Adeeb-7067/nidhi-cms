import { useMemo, useState } from "react";
import { ExternalLink, Landmark } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs } from "@/components/cms";
import { useListPayments } from "@/api/finance";
import { formatCompactCurrency } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, ReconciliationTable } from "@/modules/ca/components";
import { mapFinancePaymentToBankTxn, summarizeBankRecon } from "@/modules/ca/adapters/finance";
import { financePaymentsListHref } from "@/modules/ca/routes";

export default function BankReconciliation() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const { data, isLoading, isError, refetch } = useListPayments({ limit: 300 });

  const rows = useMemo(() => (data?.payments ?? []).map(mapFinancePaymentToBankTxn), [data?.payments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((t) => {
      const matchesSearch =
        !q || t.party.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.reconciliationStatus === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab, rows]);

  const summary = useMemo(() => summarizeBankRecon(rows), [rows]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Bank reconciliation"
        description="Click party or reference to open the Finance payment — unmatched means no invoice/expense link"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Bank reconciliation" }]}
        actions={
          <div className="flex gap-2">
            {summary.unmatched > 0 ? (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setTab("unmatched")}>
                Review unmatched ({summary.unmatched})
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref()}>
                Open Finance payments
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
          </div>
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search party, reference…" />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Matched", value: isLoading ? "…" : String(summary.matched), icon: Landmark, accent: "green", delay: 0 },
          {
            title: "Unmatched",
            value: isLoading ? "…" : String(summary.unmatched),
            icon: Landmark,
            accent: "red",
            alert: summary.unmatched > 0,
            delay: 1,
          },
          {
            title: "Incoming",
            value: isLoading ? "…" : formatCompactCurrency(summary.incomingTotal),
            icon: Landmark,
            accent: "blue",
            delay: 2,
          },
          {
            title: "Outgoing",
            value: isLoading ? "…" : formatCompactCurrency(summary.outgoingTotal),
            icon: Landmark,
            accent: "red",
            delay: 3,
          },
        ]}
      />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: rows.length },
          { value: "matched", label: "Matched", count: summary.matched },
          { value: "unmatched", label: "Unmatched", count: summary.unmatched },
          { value: "partial", label: "Partial", count: summary.partial },
        ]}
      />
      <ReconciliationTable
        rows={filtered}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
      />
    </PortalPageShell>
  );
}
