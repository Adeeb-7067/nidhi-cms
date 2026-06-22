import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockEmployeeCases } from "@/modules/legal/mock-data";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER, CASE_TYPE_LABELS } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

export default function LegalCases() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");

  const filtered = useMemo(() => {
    return mockEmployeeCases.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.employeeName.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockEmployeeCases.length };
    for (const s of CASE_STATUS_ORDER) {
      counts[s] = mockEmployeeCases.filter((c) => c.status === s).length;
    }
    return counts;
  }, []);

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Employee legal cases"
        description="Internal matters — harassment, policy violations, termination, and IP disputes."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Employee cases" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Open case
          </Button>
        }
      />

      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search cases, employees, departments…" />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">
            All ({statusCounts.all})
          </TabsTrigger>
          {CASE_STATUS_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10">
              {CASE_STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <LegalEmptyState icon={Briefcase} title="No cases found" description="Adjust filters or open a new case." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Case #</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Counsel</TableHead>
                <TableHead className="text-xs">Opened</TableHead>
                <TableHead className="text-xs">Next hearing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Link href={`/legal/cases/${c.id}`} className="text-xs font-mono text-primary hover:underline">
                      {c.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{c.employeeName}</TableCell>
                  <TableCell className="text-xs">{c.department}</TableCell>
                  <TableCell className="text-xs">{CASE_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell><LegalStatusBadge variant="case" value={c.status} /></TableCell>
                  <TableCell><LegalRiskBadge level={c.risk} /></TableCell>
                  <TableCell><CounselAvatar name={c.assignedTo.name} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}
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
