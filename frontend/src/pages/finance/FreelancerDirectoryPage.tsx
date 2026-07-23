import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function FreelancerDirectoryPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useListFreelancerEngagements();

  const allFreelancersList = useMemo(() => {
    const list = data?.engagements ?? [];
    const map = new Map<number, { freelancerName: string; userId: number; projects: string[]; totalAgreed: number; totalPaid: number; remaining: number }>();
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
    return result.filter((item) =>
      item.freelancerName.toLowerCase().includes(q) ||
      item.projects.some((p) => p.toLowerCase().includes(q))
    );
  }, [data?.engagements, search]);

  const kpis = useMemo(() => {
    const rows = data?.engagements ?? [];
    const agreed = rows.reduce((s, e) => s + e.agreedAmount, 0);
    const paid = rows.reduce((s, e) => s + e.paidAmount, 0);
    const remaining = rows.reduce((s, e) => s + e.remainingAmount, 0);
    const uniqueFreelancers = new Set(rows.map((e) => e.userId)).size;
    return { count: rows.length, uniqueFreelancers, agreed, paid, remaining };
  }, [data?.engagements]);

  if (isLoading) return <FinanceListPageSkeleton />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="All Working Freelancers"
        description="Directory of active freelancers working across projects with agreed fees and payout balances"
      />

      <PortalKpiGrid
        items={[
          { title: "Total Working Freelancers", value: String(kpis.uniqueFreelancers), icon: Users, accent: "blue" },
          { title: "Agreed Contracts Total", value: formatCurrency(kpis.agreed), icon: Users, accent: "violet" },
          { title: "Total Paid", value: formatCurrency(kpis.paid), icon: Users, accent: "green" },
          { title: "Remaining Payable", value: formatCurrency(kpis.remaining), icon: Users, accent: "amber" },
        ]}
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search freelancer name or project…" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Freelancer Roster ({allFreelancersList.length})
          </h3>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/employees?role=freelancer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Team Accounts
            </Link>
          </Button>
        </div>

        {allFreelancersList.length === 0 ? (
          <FinanceEmptyState
            title="No working freelancers found"
            description="No freelancers match your search query."
          />
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Freelancer</TableHead>
                  <TableHead>Assigned Projects</TableHead>
                  <TableHead>Total Agreed</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allFreelancersList.map((f) => (
                  <TableRow key={f.userId}>
                    <TableCell className="font-medium flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {f.freelancerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium leading-none">{f.freelancerName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">User #{f.userId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.projects.map((p, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(f.totalAgreed)}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{formatCurrency(f.totalPaid)}</TableCell>
                    <TableCell className="text-amber-600">{formatCurrency(f.remaining)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/freelancers/payments">View Payments</Link>

                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PortalPageShell>
  );
}
