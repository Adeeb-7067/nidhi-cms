import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockMetaCampaigns } from "@/modules/marketing/mock-data";
import { META_OBJECTIVE_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingStatusBadge,
} from "@/modules/marketing/components";
import { toast } from "sonner";

export default function MarketingMetaAds() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("month");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockMetaCampaigns.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Meta Ads"
        description="Facebook & Instagram campaigns — objectives, budgets, audiences, and performance"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Meta Ads" }]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns, clients…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Meta Ads report export started (demo)")}
      />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Megaphone} title="No campaigns found" description="Adjust your search filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Objective</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs">Audience</TableHead>
                <TableHead className="text-xs text-right">Reach</TableHead>
                <TableHead className="text-xs text-right">Impr.</TableHead>
                <TableHead className="text-xs text-right">CTR</TableHead>
                <TableHead className="text-xs text-right">CPC</TableHead>
                <TableHead className="text-xs text-right">CPM</TableHead>
                <TableHead className="text-xs text-right">Leads</TableHead>
                <TableHead className="text-xs text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium max-w-[140px] truncate">{c.name}</TableCell>
                  <TableCell className="text-xs">{c.clientName}</TableCell>
                  <TableCell className="text-xs">{META_OBJECTIVE_LABELS[c.objective]}</TableCell>
                  <TableCell><MarketingStatusBadge variant="campaign" status={c.status} /></TableCell>
                  <TableCell className="text-xs text-right">{formatCompactCurrency(c.budgetInr)}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate">{c.audience}</TableCell>
                  <TableCell className="text-xs text-right">{c.reach.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-xs text-right">{c.impressions.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-xs text-right">{c.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-right">₹{c.cpc}</TableCell>
                  <TableCell className="text-xs text-right">₹{c.cpm}</TableCell>
                  <TableCell className="text-xs text-right">{c.leads}</TableCell>
                  <TableCell className="text-xs text-right">{c.roas.toFixed(1)}x</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
