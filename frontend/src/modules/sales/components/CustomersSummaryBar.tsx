import { Building2, LogIn, UserCheck, UserMinus, Users, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalKpiGrid } from "@/components/layout/portal-page-kit";
import type { CustomersSummary } from "@/api/sales";

/** Portfolio KPIs — same CmsKpi visual language as Invoices / Payments. */
export function CustomersSummaryBar({
  loading,
  summary,
}: {
  loading?: boolean;
  summary?: CustomersSummary;
}) {
  const activeCustomerPct = summary?.totalCustomers
    ? Math.round((summary.activeCustomers / summary.totalCustomers) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <PortalKpiGrid
        loading={loading}
        count={6}
        columns={6}
        items={[
          {
            title: "Total customers",
            value: summary?.totalCustomers ?? "—",
            icon: Building2,
            accent: "violet",
            delay: 0,
          },
          {
            title: "Active accounts",
            value: summary?.activeCustomers ?? "—",
            hint: summary ? `${activeCustomerPct}% of total` : undefined,
            icon: Users,
            accent: "green",
            delay: 1,
          },
          {
            title: "Inactive accounts",
            value: summary?.inactiveCustomers ?? "—",
            icon: UserMinus,
            accent: "red",
            delay: 2,
          },
          {
            title: "Active contacts",
            value: summary?.activeContacts ?? "—",
            hint: "Portal collaborators",
            icon: UserCheck,
            accent: "blue",
            delay: 3,
          },
          {
            title: "Inactive contacts",
            value: summary?.inactiveContacts ?? "—",
            icon: UsersRound,
            accent: "amber",
            delay: 4,
          },
          {
            title: "Logged in today",
            value: summary?.contactsLoggedInToday ?? "—",
            icon: LogIn,
            accent: "sky",
            delay: 5,
          },
        ]}
      />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" asChild>
          <Link href="/sales/client-team">
            Manage client team
            <UsersRound className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
