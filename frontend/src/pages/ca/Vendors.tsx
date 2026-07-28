import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockCaVendors } from "@/modules/ca/mock-data";
import { formatCurrency, RECONCILIATION_LABELS } from "@/modules/ca/constants";
import type { CaVendor, ReconciliationStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const reconTone: Record<ReconciliationStatus, "success" | "danger" | "warning"> = {
  matched: "success",
  unmatched: "danger",
  partial: "warning",
};

export default function Vendors() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaVendors.filter(
      (v) => !q || v.name.toLowerCase().includes(q) || v.gstin.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<CaVendor>[]>(
    () => [
      {
        id: "name",
        header: "Vendor",
        cell: (v) => <span className="font-medium">{v.name}</span>,
      },
      {
        id: "gstin",
        header: "GSTIN",
        cell: (v) => <span className="font-mono">{v.gstin}</span>,
      },
      {
        id: "pan",
        header: "PAN",
        cell: (v) => <span className="font-mono">{v.pan}</span>,
      },
      {
        id: "ledger",
        header: "Ledger balance",
        align: "right",
        cell: (v) => <span className="tabular-nums">{formatCurrency(v.ledgerBalance)}</span>,
      },
      {
        id: "credit",
        header: "Input credit",
        align: "right",
        cell: (v) => (
          <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(v.inputCreditAvailable)}
          </span>
        ),
      },
      {
        id: "recon",
        header: "Reconciliation",
        chip: true,
        cell: (v) => (
          <CmsStatusChip
            label={RECONCILIATION_LABELS[v.reconciliationStatus]}
            tone={reconTone[v.reconciliationStatus]}
          />
        ),
      },
      {
        id: "lastPayment",
        header: "Last payment",
        cell: (v) => (
          <span className="text-muted-foreground">
            {format(new Date(v.lastPaymentAt), "MMM d, yyyy")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Vendor summary"
        description="Vendor ledger, GST input credit, and reconciliation status"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Vendors" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, GSTIN…" />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(v) => v.id}
        empty={{ icon: Building2, title: "No vendors found" }}
      />
    </PortalPageShell>
  );
}
