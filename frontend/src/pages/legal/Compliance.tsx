import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockComplianceItems, complianceScore } from "@/modules/legal/mock-data";
import { formatPercent } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { ComplianceItem } from "@/modules/legal/types";

export default function Compliance() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockComplianceItems.filter(
      (c) =>
        !q ||
        c.framework.toLowerCase().includes(q) ||
        c.requirement.toLowerCase().includes(q),
    );
  }, [search]);

  const compliantCount = mockComplianceItems.filter((c) => c.status === "compliant").length;

  const columns = useMemo<CmsColumn<ComplianceItem>[]>(
    () => [
      { id: "framework", header: "Framework", cell: (c) => <span className="font-medium">{c.framework}</span> },
      { id: "requirement", header: "Requirement", cell: (c) => <span className="max-w-[240px] block">{c.requirement}</span> },
      { id: "status", header: "Status", chip: true, cell: (c) => <LegalStatusBadge variant="compliance" value={c.status} /> },
      { id: "risk", header: "Risk", chip: true, cell: (c) => <LegalRiskBadge level={c.risk} /> },
      { id: "lastReview", header: "Last review", cell: (c) => <span className="text-muted-foreground">{format(new Date(c.lastReview), "MMM d, yyyy")}</span> },
      { id: "nextReview", header: "Next review", cell: (c) => format(new Date(c.nextReview), "MMM d, yyyy") },
      { id: "owner", header: "Owner", cell: (c) => <CounselAvatar name={c.owner.name} /> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Compliance tracker"
        description="Regulatory and statutory compliance — ROC, GST, DPDP, labour codes, and more."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Compliance" }]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Overall score</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-2xl font-bold">{formatPercent(complianceScore)}</p>
            <Progress value={complianceScore} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Compliant items</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-2xl font-bold text-green-700">
            {compliantCount}/{mockComplianceItems.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-2xl font-bold text-amber-700">
            {mockComplianceItems.filter((c) => c.status !== "compliant").length}
          </CardContent>
        </Card>
      </div>

      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search frameworks, requirements…" />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        empty={{ icon: ShieldCheck, title: "No compliance items found" }}
      />
    </PortalPageShell>
  );
}
