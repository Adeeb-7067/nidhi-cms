import { format } from "date-fns";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { mockCompanyItr, companyItrDocuments } from "@/modules/ca/mock-data";
import { formatCompactCurrency, formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import { CAPageHeader } from "@/modules/ca/components";
import { toast } from "sonner";

export default function CompanyItr() {
  const itr = mockCompanyItr;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Company ITR"
        description="Corporate income tax return — revenue, profit, liability, and filing status"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Company ITR" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => toast.success("Upload started (demo)")}>
            <Upload className="h-3.5 w-3.5" /> Upload document
          </Button>
        }
      />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Revenue", value: formatCompactCurrency(itr.revenue), icon: FileText, accent: "green", delay: 0 },
          { title: "Expenses", value: formatCompactCurrency(itr.expenses), icon: FileText, accent: "red", delay: 1 },
          { title: "Profit before tax", value: formatCompactCurrency(itr.profitBeforeTax), icon: FileText, accent: "blue", delay: 2 },
          { title: "Tax liability", value: formatCompactCurrency(itr.taxLiability), icon: FileText, accent: "amber", delay: 3 },
        ]}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">FY {itr.financialYear}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground text-xs">Filing status</span><p className="font-medium">{FILING_STATUS_LABELS[itr.filingStatus]}</p></div>
          <div><span className="text-muted-foreground text-xs">Due date</span><p className="font-medium">{format(new Date(itr.dueDate), "MMM d, yyyy")}</p></div>
          <div><span className="text-muted-foreground text-xs">Filed on</span><p className="font-medium">{itr.filedAt ? format(new Date(itr.filedAt), "MMM d, yyyy") : "—"}</p></div>
        </CardContent>
      </Card>
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</p>
        {companyItrDocuments.map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm">{d.name}</span>
            <Badge variant={d.uploaded ? "default" : "outline"} className="text-[10px]">{d.uploaded ? "Uploaded" : "Missing"}</Badge>
          </div>
        ))}
      </div>
    </PortalPageShell>
  );
}
