import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Users, ExternalLink, IndianRupee, CheckCircle2, Wallet, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceEmptyState,
  FinanceErrorState,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListFreelancerEngagements } from "@/api/finance";
import { FreelancerNavTabs } from "@/components/freelancers/FreelancerNavTabs";

export default function FreelancerDirectoryPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const allFreelancersList = useMemo(() => {
    const list = data?.engagements ?? [];
    const map = new Map<
      number,
      {
        freelancerName: string;
        userId: number;
        projects: string[];
        totalAgreed: number;
        totalPaid: number;
        remaining: number;
      }
    >();
    for (const e of list) {
      const existing = map.get(e.userId) ?? {
        freelancerName: e.freelancerName ?? `Freelancer #${e.userId}`,
        userId: e.userId,
        projects: [],
        totalAgreed: 0,
        totalPaid: 0,
        remaining: 0,
      };
      if (e.projectName && !existing.projects.includes(e.projectName)) {
        existing.projects.push(e.projectName);
      }
      existing.totalAgreed += e.agreedAmount;
      existing.totalPaid += e.paidAmount;
      existing.remaining += e.remainingAmount;
      map.set(e.userId, existing);
    }
    const result = Array.from(map.values());
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (item) =>
        item.freelancerName.toLowerCase().includes(q) ||
        item.projects.some((p) => p.toLowerCase().includes(q)),
    );
  }, [data?.engagements, search]);

  const kpis = useMemo(() => {
    const rows = data?.engagements ?? [];
    const agreed = rows.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = rows.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = rows.reduce((s, e) => s + e.remainingAmount, 0);
    const uniqueFreelancers = new Set(rows.map((e) => e.userId)).size;
    return { uniqueFreelancers, agreed, paid, remaining };
  }, [data?.engagements]);

  if (isLoading) return <FinanceListPageSkeleton />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  type FreelancerRow = (typeof allFreelancersList)[number];
  const columns: CmsColumn<FreelancerRow>[] = [
    {
      id: "freelancer",
      header: "Freelancer",
      cell: (f) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {f.freelancerName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-none">{f.freelancerName}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">#{f.userId}</p>
          </div>
        </div>
      ),
    },
    {
      id: "projects",
      header: "Projects",
      className: "max-w-[320px]",
      chip: true,
      cell: (f) => f.projects.length === 0 ? <span className="text-muted-foreground">—</span> : f.projects.map((p) => (
        <Badge key={p} variant="secondary" className="text-[10px] font-normal">{p}</Badge>
      )),
    },
    { id: "agreed", header: "Agreed", align: "right", cell: (f) => <span className="font-medium tabular-nums">{formatCurrency(f.totalAgreed)}</span> },
    { id: "paid", header: "Paid", align: "right", cell: (f) => <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(f.totalPaid)}</span> },
    { id: "remaining", header: "Remaining", align: "right", cell: (f) => <span className="tabular-nums text-amber-600">{formatCurrency(f.remaining)}</span> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: () => (
        <CmsRowActions
          label="Freelancer actions"
          items={[{ label: "View payments", icon: Eye, href: "/freelancers/payments" }]}
        />
      ),
    },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="All freelancers"
        description="Directory of freelancers with project fees and payout balances."
        breadcrumbs={[
          { label: "Freelancers", href: "/freelancers" },
          { label: "Directory" },
        ]}
        actions={
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/admin/employees?role=freelancer">
              <ExternalLink className="h-3.5 w-3.5" />
              Team accounts
            </Link>
          </Button>
        }
      />

      <FreelancerNavTabs activeTab="freelancers" />

      <PortalKpiGrid
        items={[
          {
            title: "Working freelancers",
            value: String(kpis.uniqueFreelancers),
            icon: Users,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Agreed total",
            value: formatCurrency(kpis.agreed),
            icon: IndianRupee,
            accent: "violet",
            delay: 1,
          },
          {
            title: "Paid out",
            value: formatCurrency(kpis.paid),
            icon: CheckCircle2,
            accent: "green",
            delay: 2,
          },
          {
            title: "Outstanding",
            value: formatCurrency(kpis.remaining),
            icon: Wallet,
            accent: "amber",
            alert: kpis.remaining > 0,
            delay: 3,
          },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search freelancer name or project…"
      />

      <CmsDataTable
        columns={columns}
        rows={allFreelancersList}
        rowKey={(f) => f.userId}
        empty={{ icon: Users, title: "No freelancers found", description: "No freelancers match your search, or none have project fees yet." }}
      />
    </PortalPageShell>
  );
}
