import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockAgreements } from "@/modules/legal/mock-data";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { AgreementRecord } from "@/modules/legal/types";

export default function Agreements() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockAgreements.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.counterparty.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<AgreementRecord>[]>(
    () => [
      { id: "title", header: "Title", cell: (a) => <span className="font-medium">{a.title}</span> },
      { id: "counterparty", header: "Counterparty", cell: (a) => a.counterparty },
      { id: "type", header: "Type", cell: (a) => <span className="uppercase">{a.type}</span> },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (a) => <LegalStatusBadge variant="agreement" value={a.status} />,
      },
      {
        id: "effective",
        header: "Effective",
        cell: (a) => <span className="text-muted-foreground">{format(new Date(a.effectiveFrom), "MMM d, yyyy")}</span>,
      },
      { id: "renewal", header: "Renewal", cell: (a) => format(new Date(a.renewalDate), "MMM d, yyyy") },
      {
        id: "renewalIn",
        header: "Renewal in",
        cell: (a) => {
          const daysToRenewal = differenceInDays(new Date(a.renewalDate), new Date());
          return (
            <span className={`tabular-nums ${daysToRenewal < 60 ? "text-amber-600 font-medium" : ""}`}>
              {daysToRenewal > 0 ? `${daysToRenewal}d` : "Overdue"}
            </span>
          );
        },
      },
      { id: "risk", header: "Risk", chip: true, cell: (a) => <LegalRiskBadge level={a.risk} /> },
      { id: "counsel", header: "Counsel", cell: (a) => <CounselAvatar name={a.assignedTo.name} /> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Agreement management"
        description="MSAs, SLAs, employment contracts, and vendor agreements with renewal reminders."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Agreements" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New agreement
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search agreements…" />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(a) => a.id}
        empty={{ icon: FileText, title: "No agreements found" }}
      />
    </PortalPageShell>
  );
}
