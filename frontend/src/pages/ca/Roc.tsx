import { format } from "date-fns";
import { Scale } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockRocFilings } from "@/modules/ca/mock-data";
import { FILING_STATUS_LABELS, ROC_FORM_LABELS } from "@/modules/ca/constants";
import { CAPageHeader } from "@/modules/ca/components";

const filingStyles = {
  filed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

export default function Roc() {
  const filed = mockRocFilings.filter((f) => f.status === "filed").length;
  const pending = mockRocFilings.filter((f) => f.status === "pending").length;
  const overdue = mockRocFilings.filter((f) => f.status === "overdue").length;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="ROC compliance"
        description="AOC-4, MGT-7, ADT-1, DIR-3 KYC — filed, pending, and overdue"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "ROC" }]}
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Filed", value: String(filed), icon: Scale, accent: "green", delay: 0 },
          { title: "Pending", value: String(pending), icon: Scale, accent: "amber", alert: pending > 0, delay: 1 },
          { title: "Overdue", value: String(overdue), icon: Scale, accent: "red", alert: overdue > 0, delay: 2 },
        ]}
      />
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Form</TableHead>
              <TableHead className="text-xs">Financial year</TableHead>
              <TableHead className="text-xs">Due date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Filed on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockRocFilings.map((f) => (
              <TableRow key={f.id} className="hover:bg-muted/30">
                <TableCell className="text-xs font-medium">{ROC_FORM_LABELS[f.form]}</TableCell>
                <TableCell className="text-xs">{f.financialYear}</TableCell>
                <TableCell className="text-xs">{format(new Date(f.dueDate), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filingStyles[f.status]}`}>
                    {FILING_STATUS_LABELS[f.status]}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.filedAt ? format(new Date(f.filedAt), "MMM d, yyyy") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
