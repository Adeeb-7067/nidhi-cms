import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockMarketingClients } from "@/modules/marketing/mock-data";
import { PACKAGE_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  PlatformIconBadge,
} from "@/modules/marketing/components";

export default function MarketingClients() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockMarketingClients.filter(
      (c) =>
        !q ||
        c.company.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.accountManager.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Assigned clients"
        description="Client accounts — packages, budgets, platforms, and renewal dates"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Clients" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search clients, industry, account manager…" />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Building2} title="No clients found" description="Adjust your search filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Industry</TableHead>
                <TableHead className="text-xs">Package</TableHead>
                <TableHead className="text-xs">Account manager</TableHead>
                <TableHead className="text-xs">Platforms</TableHead>
                <TableHead className="text-xs text-right">Budget/mo</TableHead>
                <TableHead className="text-xs">Renewal</TableHead>
                <TableHead className="text-xs text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">
                    <Link href={`/marketing/clients/${c.id}`} className="hover:underline">
                      {c.company}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{c.industry}</TableCell>
                  <TableCell className="text-xs">{PACKAGE_LABELS[c.package]}</TableCell>
                  <TableCell className="text-xs">{c.accountManager}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.slice(0, 3).map((p) => (
                        <PlatformIconBadge key={p} platform={p} showLabel={false} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right">{formatCompactCurrency(c.monthlyBudgetInr)}</TableCell>
                  <TableCell className="text-xs">{format(new Date(c.renewalDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{c.performanceScore}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
