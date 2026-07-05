import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getClientById,
  getClientCampaigns,
  getClientDeliverableUsage,
} from "@/modules/marketing/mock-data";
import { PACKAGE_LABELS, formatCompactCurrency, formatCurrencyInr } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingStatusBadge,
  PlatformIconBadge,
} from "@/modules/marketing/components";

export default function MarketingClientDetail() {
  const [, params] = useRoute("/marketing/clients/:id");
  const clientId = params?.id ?? "";
  const client = getClientById(clientId);
  const campaigns = getClientCampaigns(clientId);
  const usage = client ? getClientDeliverableUsage(clientId) : null;

  if (!client) {
    return (
      <PortalPageShell>
        <MarketingEmptyState
          title="Client not found"
          description={`No client with ID "${clientId}" exists in the demo data.`}
          actionLabel="Back to clients"
          onAction={() => window.history.back()}
        />
      </PortalPageShell>
    );
  }

  const deliverables = usage
    ? [
        { label: "Graphics", ...usage.graphics },
        { label: "UGC videos", ...usage.ugc },
        { label: "Reels", ...usage.reels },
        { label: "Blogs", ...usage.blogs },
      ]
    : [];

  return (
    <PortalPageShell className="pb-24">
      <MarketingPageHeader
        title={client.company}
        description={`${client.industry} · ${client.city} · ${PACKAGE_LABELS[client.package]} package`}
        breadcrumbs={[
          { label: "Digital", href: "/marketing" },
          { label: "Clients", href: "/marketing/clients" },
          { label: client.company },
        ]}
        actions={
          <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
            <Link href="/marketing/clients">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Account manager</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold">{client.accountManager}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Monthly budget</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold">{formatCurrencyInr(client.monthlyBudgetInr)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Renewal date</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold">{format(new Date(client.renewalDate), "MMM d, yyyy")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Performance score</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-semibold">{client.performanceScore}%</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platforms</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {client.platforms.map((p) => (
            <PlatformIconBadge key={p} platform={p} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deliverables vs package quota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deliverables.map((d) => (
            <div key={d.label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{d.label}</span>
                <span className="text-muted-foreground">
                  {d.used} / {d.quota}
                </span>
              </div>
              <Progress value={(d.used / d.quota) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Running campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Platform</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs text-right">Spent</TableHead>
                <TableHead className="text-xs">Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((camp) => (
                <TableRow key={camp.id}>
                  <TableCell className="text-xs font-medium">{camp.name}</TableCell>
                  <TableCell><PlatformIconBadge platform={camp.platform} showLabel={false} /></TableCell>
                  <TableCell><MarketingStatusBadge variant="campaign" status={camp.status} /></TableCell>
                  <TableCell className="text-xs text-right">{formatCompactCurrency(camp.budgetInr)}</TableCell>
                  <TableCell className="text-xs text-right">{formatCompactCurrency(camp.spentInr)}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(camp.startDate), "MMM d")} – {format(new Date(camp.endDate), "MMM d")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PortalPageShell>
  );
}
