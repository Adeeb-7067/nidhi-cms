import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceEmptyState,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListFreelancerEngagements,
  type FreelancerEngagement,
  type FreelancerInstallment,
} from "@/api/finance";
import { FreelancerNavTabs } from "@/components/freelancers/FreelancerNavTabs";

type PaidReceiptItem = {
  engagement: FreelancerEngagement;
  installment: FreelancerInstallment;
};

export default function FreelancerReceiptsPage() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const paidReceiptsList = useMemo(() => {
    const list: PaidReceiptItem[] = [];
    for (const e of data?.engagements ?? []) {
      for (const i of e.installments ?? []) {
        if (i.status === "paid") {
          list.push({ engagement: e, installment: i });
        }
      }
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.engagement.freelancerName ?? "").toLowerCase().includes(q) ||
        (r.engagement.projectName ?? "").toLowerCase().includes(q) ||
        (r.installment.receiptNumber ?? "").toLowerCase().includes(q) ||
        (r.installment.reference ?? "").toLowerCase().includes(q),
    );
  }, [data?.engagements, search]);

  const kpis = useMemo(() => {
    const totalPaidAmount = paidReceiptsList.reduce((s, r) => s + r.installment.amount, 0);
    return { count: paidReceiptsList.length, totalPaidAmount };
  }, [paidReceiptsList]);

  if (isLoading) return <FinanceListPageSkeleton kpiCount={2} />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const openReceipt = (item: PaidReceiptItem) =>
    setLocation(`/freelancers/receipts/${item.engagement.id}/${item.installment.id}`);
  const columns: CmsColumn<PaidReceiptItem>[] = [
    {
      id: "receipt",
      header: "Receipt #",
      cell: (item) => {
        const receiptNo = item.installment.receiptNumber || `FL-REC-${item.installment.id}`;
        return <button type="button" className="font-mono text-primary hover:underline underline-offset-2 whitespace-nowrap" onClick={() => openReceipt(item)}>{receiptNo}</button>;
      },
    },
    { id: "freelancer", header: "Freelancer", cell: (item) => <span className="font-medium">{item.engagement.freelancerName ?? "—"}</span> },
    { id: "project", header: "Project", className: "max-w-[200px]", cell: (item) => <span className="truncate">{item.engagement.projectName ?? "—"}</span> },
    { id: "milestone", header: "Milestone", cell: (item) => <span className="text-muted-foreground">{item.installment.label}</span> },
    { id: "amount", header: "Amount", align: "right", cell: (item) => <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(item.installment.amount)}</span> },
    { id: "paid-date", header: "Paid date", cell: (item) => <span className="text-muted-foreground whitespace-nowrap">{item.installment.paidAt ? item.installment.paidAt.slice(0, 10) : "—"}</span> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (item) => <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openReceipt(item)}><Receipt className="h-3.5 w-3.5" />View</Button>,
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payment receipts"
        description="Branded payout vouchers — same document format as Sales receipts."
        breadcrumbs={[
          { label: "Freelancers", href: "/freelancers" },
          { label: "Receipts" },
        ]}
      />

      <FreelancerNavTabs activeTab="receipts" />

      <PortalKpiGrid
        columns={2}
        items={[
          {
            title: "Receipts",
            value: String(kpis.count),
            icon: Receipt,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Amount disbursed",
            value: formatCurrency(kpis.totalPaidAmount),
            icon: CheckCircle2,
            accent: "green",
            delay: 1,
          },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search receipt #, UTR, freelancer, or project…"
      />

      <CmsDataTable
        columns={columns}
        rows={paidReceiptsList}
        rowKey={(item) => `${item.engagement.id}-${item.installment.id}`}
        empty={{ icon: Receipt, title: "No payment receipts", description: "Record a freelancer payment to generate a branded receipt voucher." }}
      />
    </PortalPageShell>
  );
}
