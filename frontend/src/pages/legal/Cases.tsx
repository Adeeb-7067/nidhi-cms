import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockEmployeeCases } from "@/modules/legal/mock-data";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER, CASE_TYPE_LABELS } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { EmployeeLegalCase } from "@/modules/legal/types";

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

  const chipItems = useMemo(
    () => [
      { value: "all", label: "All", count: statusCounts.all },
      ...CASE_STATUS_ORDER.map((s) => ({
        value: s,
        label: CASE_STATUS_LABELS[s],
        count: statusCounts[s] ?? 0,
      })),
    ],
    [statusCounts],
  );

  const columns = useMemo<CmsColumn<EmployeeLegalCase>[]>(
    () => [
      {
        id: "caseNumber",
        header: "Case #",
        cell: (c) => (
          <Link href={`/legal/cases/${c.id}`} className="font-mono text-primary hover:underline">
            {c.caseNumber}
          </Link>
        ),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (c) => <span className="font-medium">{c.employeeName}</span>,
      },
      { id: "department", header: "Department", cell: (c) => c.department },
      { id: "type", header: "Type", cell: (c) => CASE_TYPE_LABELS[c.type] },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <LegalStatusBadge variant="case" value={c.status} />,
      },
      {
        id: "risk",
        header: "Risk",
        chip: true,
        cell: (c) => <LegalRiskBadge level={c.risk} />,
      },
      {
        id: "counsel",
        header: "Counsel",
        cell: (c) => <CounselAvatar name={c.assignedTo.name} />,
      },
      {
        id: "opened",
        header: "Opened",
        cell: (c) => (
          <span className="text-muted-foreground">{format(new Date(c.openedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "hearing",
        header: "Next hearing",
        cell: (c) => (
          <span className="text-muted-foreground">
            {c.nextHearing ? format(new Date(c.nextHearing), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
    ],
    [],
  );

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

      <LegalFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search cases, employees, departments…"
      />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        empty={{
          icon: Briefcase,
          title: "No cases found",
          description: "Adjust filters or open a new case.",
        }}
      />
    </PortalPageShell>
  );
}
