import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockComplianceItems, complianceScore } from "@/modules/legal/mock-data";
import { formatPercent } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

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

      {filtered.length === 0 ? (
        <LegalEmptyState icon={ShieldCheck} title="No compliance items found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Framework</TableHead>
                <TableHead className="text-xs">Requirement</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Last review</TableHead>
                <TableHead className="text-xs">Next review</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{c.framework}</TableCell>
                  <TableCell className="text-xs max-w-[240px]">{c.requirement}</TableCell>
                  <TableCell><LegalStatusBadge variant="compliance" value={c.status} /></TableCell>
                  <TableCell><LegalRiskBadge level={c.risk} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.lastReview), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs">{format(new Date(c.nextReview), "MMM d, yyyy")}</TableCell>
                  <TableCell><CounselAvatar name={c.owner.name} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
