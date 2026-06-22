import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCaVendors } from "@/modules/ca/mock-data";
import { formatCurrency, RECONCILIATION_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";

const reconStyles = {
  matched: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  unmatched: "bg-red-500/10 text-red-600 border-red-500/25",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/25",
};

export default function Vendors() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaVendors.filter(
      (v) => !q || v.name.toLowerCase().includes(q) || v.gstin.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Vendor summary"
        description="Vendor ledger, GST input credit, and reconciliation status"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Vendors" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, GSTIN…" />
      {filtered.length === 0 ? (
        <CAEmptyState icon={Building2} title="No vendors found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">PAN</TableHead>
                <TableHead className="text-xs text-right">Ledger balance</TableHead>
                <TableHead className="text-xs text-right">Input credit</TableHead>
                <TableHead className="text-xs">Reconciliation</TableHead>
                <TableHead className="text-xs">Last payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{v.name}</TableCell>
                  <TableCell className="text-xs font-mono">{v.gstin}</TableCell>
                  <TableCell className="text-xs font-mono">{v.pan}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(v.ledgerBalance)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(v.inputCreditAvailable)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${reconStyles[v.reconciliationStatus]}`}>
                      {RECONCILIATION_LABELS[v.reconciliationStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(v.lastPaymentAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
