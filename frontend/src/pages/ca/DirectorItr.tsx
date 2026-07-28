import { useMemo, useState } from "react";
import { format } from "date-fns";
import { UserCircle } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockDirectorItr } from "@/modules/ca/mock-data";
import { formatCurrency, FILING_STATUS_LABELS } from "@/modules/ca/constants";
import type { DirectorItr, FilingStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

export default function DirectorItr() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockDirectorItr.filter(
      (d) => !q || d.directorName.toLowerCase().includes(q) || d.pan.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<DirectorItr>[]>(
    () => [
      {
        id: "director",
        header: "Director",
        cell: (d) => <span className="font-medium">{d.directorName}</span>,
      },
      {
        id: "pan",
        header: "PAN",
        cell: (d) => <span className="font-mono">{d.pan}</span>,
      },
      { id: "fy", header: "Financial year", cell: (d) => d.financialYear },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (d) => (
          <CmsStatusChip
            label={FILING_STATUS_LABELS[d.filingStatus]}
            tone={filingTone[d.filingStatus]}
          />
        ),
      },
      {
        id: "due",
        header: "Due date",
        cell: (d) => format(new Date(d.dueDate), "MMM d, yyyy"),
      },
      {
        id: "tax",
        header: "Tax liability",
        align: "right",
        cell: (d) => <span className="tabular-nums">{formatCurrency(d.taxLiability)}</span>,
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Director ITR"
        description="Director-wise PAN, filing status, due dates, and tax liability"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Director ITR" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search directors, PAN…" />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(d) => d.id}
        empty={{ icon: UserCircle, title: "No director records found" }}
      />
    </PortalPageShell>
  );
}
