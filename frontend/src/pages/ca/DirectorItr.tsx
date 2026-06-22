import { format } from "date-fns";
import { UserCircle } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockDirectorItr } from "@/modules/ca/mock-data";
import { formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";
import { useMemo, useState } from "react";

const filingStyles = {
  filed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

export default function DirectorItr() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockDirectorItr.filter(
      (d) => !q || d.directorName.toLowerCase().includes(q) || d.pan.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Director ITR"
        description="Director-wise PAN, filing status, due dates, and tax liability"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Director ITR" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search directors, PAN…" />
      {filtered.length === 0 ? (
        <CAEmptyState icon={UserCircle} title="No director records found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Director</TableHead>
                <TableHead className="text-xs">PAN</TableHead>
                <TableHead className="text-xs">Financial year</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs text-right">Tax liability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{d.directorName}</TableCell>
                  <TableCell className="text-xs font-mono">{d.pan}</TableCell>
                  <TableCell className="text-xs">{d.financialYear}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filingStyles[d.filingStatus]}`}>
                      {FILING_STATUS_LABELS[d.filingStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(d.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(d.taxLiability)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
