import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockSuspenseEntries, totalSuspenseAmount } from "@/modules/ca/mock-data";
import { formatCurrency, formatCompactCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";
import { toast } from "sonner";

export default function Suspense() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockSuspenseEntries.filter(
      (e) => !q || e.bankRef.toLowerCase().includes(q) || e.remarks.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Suspense account"
        description="Unidentified payments — assign to client or vendor"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Suspense" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search bank ref, remarks…" />
      <PortalKpiGrid
        columns={2}
        items={[
          { title: "Total suspense", value: formatCompactCurrency(totalSuspenseAmount), icon: AlertTriangle, accent: "red", alert: true, delay: 0 },
          { title: "Open entries", value: String(mockSuspenseEntries.length), icon: AlertTriangle, accent: "amber", delay: 1 },
        ]}
      />
      {filtered.length === 0 ? (
        <CAEmptyState icon={AlertTriangle} title="No suspense entries" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Received</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Bank ref</TableHead>
                <TableHead className="text-xs">Age</TableHead>
                <TableHead className="text-xs">Remarks</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(e.receivedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-xs">{PAYMENT_MODE_LABELS[e.mode]}</TableCell>
                  <TableCell className="text-xs font-mono">{e.bankRef}</TableCell>
                  <TableCell className="text-xs tabular-nums">{e.ageDays}d</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{e.remarks}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toast.success("Assign to client (demo)")}>Client</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toast.success("Assign to vendor (demo)")}>Vendor</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
