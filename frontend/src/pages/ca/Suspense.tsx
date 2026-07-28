import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockSuspenseEntries, totalSuspenseAmount } from "@/modules/ca/mock-data";
import { formatCurrency, formatCompactCurrency, PAYMENT_MODE_LABELS } from "@/modules/ca/constants";
import type { SuspenseEntry } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";
import { toast } from "sonner";

export default function Suspense() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockSuspenseEntries.filter(
      (e) => !q || e.bankRef.toLowerCase().includes(q) || e.remarks.toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<SuspenseEntry>[]>(
    () => [
      {
        id: "received",
        header: "Received",
        cell: (e) => (
          <span className="text-muted-foreground">
            {format(new Date(e.receivedAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (e) => <span className="font-medium tabular-nums">{formatCurrency(e.amount)}</span>,
      },
      { id: "mode", header: "Mode", cell: (e) => PAYMENT_MODE_LABELS[e.mode] },
      {
        id: "bankRef",
        header: "Bank ref",
        cell: (e) => <span className="font-mono">{e.bankRef}</span>,
      },
      {
        id: "age",
        header: "Age",
        cell: (e) => <span className="tabular-nums">{e.ageDays}d</span>,
      },
      {
        id: "remarks",
        header: "Remarks",
        cell: (e) => <span className="max-w-[200px] block truncate">{e.remarks}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: () => (
          <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => toast.success("Assign to client (demo)")}
            >
              Client
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => toast.success("Assign to vendor (demo)")}
            >
              Vendor
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Suspense account"
        description="Unidentified payments — assign to client or vendor"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Suspense" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search bank ref, remarks…" />
      <PortalKpiGrid
        columns={2}
        items={[
          {
            title: "Total suspense",
            value: formatCompactCurrency(totalSuspenseAmount),
            icon: AlertTriangle,
            accent: "red",
            alert: true,
            delay: 0,
          },
          {
            title: "Open entries",
            value: String(mockSuspenseEntries.length),
            icon: AlertTriangle,
            accent: "amber",
            delay: 1,
          },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(e) => e.id}
        empty={{ icon: AlertTriangle, title: "No suspense entries" }}
      />
    </PortalPageShell>
  );
}
