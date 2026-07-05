import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockGoogleCampaigns } from "@/modules/marketing/mock-data";
import { GOOGLE_CAMPAIGN_TYPE_LABELS, formatCompactCurrency } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingStatusBadge,
} from "@/modules/marketing/components";
import { toast } from "sonner";

export default function MarketingGoogleAds() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("month");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockGoogleCampaigns.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Google Ads"
        description="Search, Display, Shopping, PMax, and YouTube campaigns with keyword performance"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Google Ads" }]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search campaigns, keywords, clients…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Google Ads report export started (demo)")}
      />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Search} title="No campaigns found" description="Adjust your search filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs">Keywords</TableHead>
                <TableHead className="text-xs text-center">QS</TableHead>
                <TableHead className="text-xs text-right">CPA</TableHead>
                <TableHead className="text-xs text-right">ROAS</TableHead>
                <TableHead className="text-xs text-right">Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium max-w-[140px] truncate">{c.name}</TableCell>
                  <TableCell className="text-xs">{c.clientName}</TableCell>
                  <TableCell className="text-xs">{GOOGLE_CAMPAIGN_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell><MarketingStatusBadge variant="campaign" status={c.status} /></TableCell>
                  <TableCell className="text-xs text-right">{formatCompactCurrency(c.budgetInr)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {c.keywords.map((k) => (
                        <Badge key={k} variant="secondary" className="text-[9px] px-1 py-0 truncate max-w-[80px]">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-center font-medium">{c.qualityScore}/10</TableCell>
                  <TableCell className="text-xs text-right">₹{c.cpa}</TableCell>
                  <TableCell className="text-xs text-right">{c.roas.toFixed(1)}x</TableCell>
                  <TableCell className="text-xs text-right">{c.conversions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
