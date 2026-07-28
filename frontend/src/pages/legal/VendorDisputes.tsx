import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockVendorDisputes } from "@/modules/legal/mock-data";
import { formatCurrency } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalFilterBar,
  LegalStatusBadge,
  LegalRiskBadge,
  CounselAvatar,
} from "@/modules/legal/components";
import type { VendorDispute } from "@/modules/legal/types";

export default function VendorDisputes() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockVendorDisputes.filter(
      (d) =>
        !q ||
        d.vendorName.toLowerCase().includes(q) ||
        d.contractRef.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<VendorDispute>[]>(
    () => [
      { id: "vendor", header: "Vendor", cell: (d) => <span className="font-medium">{d.vendorName}</span> },
      { id: "contract", header: "Contract", cell: (d) => <span className="font-mono text-muted-foreground">{d.contractRef}</span> },
      { id: "status", header: "Status", chip: true, cell: (d) => <LegalStatusBadge variant="vendorDispute" value={d.status} /> },
      { id: "risk", header: "Risk", chip: true, cell: (d) => <LegalRiskBadge level={d.risk} /> },
      { id: "amount", header: "Amount in dispute", align: "right", cell: (d) => <span className="font-medium tabular-nums">{formatCurrency(d.amountInDispute)}</span> },
      { id: "counsel", header: "Counsel", cell: (d) => <CounselAvatar name={d.assignedTo.name} /> },
      { id: "opened", header: "Opened", cell: (d) => <span className="text-muted-foreground">{format(new Date(d.openedAt), "MMM d, yyyy")}</span> },
      { id: "summary", header: "Summary", cell: (d) => <span className="max-w-[200px] block truncate">{d.summary}</span> },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <LegalPageHeader
        title="Vendor disputes"
        description="Contract disagreements, SLA breaches, and vendor litigation."
        breadcrumbs={[{ label: "Legal", href: "/legal" }, { label: "Vendor disputes" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Log dispute
          </Button>
        }
      />
      <LegalFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, contracts…" />
      <CmsDataTable columns={columns} rows={filtered} rowKey={(d) => d.id} empty={{ icon: Handshake, title: "No disputes found" }} />
    </PortalPageShell>
  );
}
