import { useMemo, useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { Banknote, Plus, Eye, CheckCircle2, AlertTriangle, Shield, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  formatCurrency,
  CHEQUE_PURPOSE_LABELS,
  CHEQUE_PAYEE_TYPE_LABELS,
} from "@/modules/finance/constants";
import type { ChequeStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  ChequeFormModal,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListCheques, useChequeClearanceForecast, type FinanceCheque } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ChequesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCheque, setEditCheque] = useState<FinanceCheque | null>(null);
  const { can } = usePermissions();
  const canCreate = can("finance_cheques", "create");
  const canEdit = can("finance_cheques", "edit");
  const { data, isLoading, isError, refetch } = useListCheques();
  const cheques = data?.cheques ?? [];
  const { data: forecastData } = useChequeClearanceForecast();

  const openCreate = () => {
    setEditCheque(null);
    setDrawerOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cheques.filter((c) => {
      const matchesSearch =
        !q ||
        c.payeeName.toLowerCase().includes(q) ||
        c.chequeNumber.toLowerCase().includes(q) ||
        c.reference.toLowerCase().includes(q) ||
        (c.bankName ?? "").toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || c.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [cheques, search, statusTab]);

  const now = new Date();
  const weekEnd = endOfDay(addDays(startOfDay(now), 7));
  const issued = cheques.filter((c) => c.status === "issued");
  const clearingThisWeek = issued.filter((c) => {
    const d = new Date(c.clearanceDate);
    return isWithinInterval(d, { start: startOfDay(now), end: weekEnd });
  });
  const clearedThisMonth = cheques.filter((c) => {
    if (c.status !== "cleared") return false;
    const d = new Date(c.clearedAt ?? c.clearanceDate);
    return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
  });
  const securityOutstanding = issued.filter((c) => c.purpose === "security_deposit");

  if (isLoading) {
    return <FinanceListPageSkeleton kpiCount={4} />;
  }
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const chipItems = (["all", "issued", "cleared", "cancelled", "bounced"] as const).map((value) => ({ value, label: value === "all" ? "All" : value, count: value === "all" ? cheques.length : cheques.filter((c) => c.status === value).length }));
  const columns: CmsColumn<FinanceCheque>[] = [
    { id: "payee", header: "Payee", cell: (c) => <Link href={`/finance/cheques/${c.id}`} className="hover:text-primary"><div className="font-medium">{c.payeeName}</div><div className="text-[10px] text-muted-foreground">{CHEQUE_PAYEE_TYPE_LABELS[c.payeeType]} · {c.reference}</div></Link> },
    { id: "purpose", header: "Purpose", cell: (c) => <span className="text-muted-foreground">{CHEQUE_PURPOSE_LABELS[c.purpose]}</span> },
    { id: "cheque", header: "Cheque #", cell: (c) => <span className="font-mono">{c.chequeNumber}</span> },
    { id: "issue", header: "Issue", cell: (c) => <span className="text-muted-foreground">{format(new Date(c.issueDate), "MMM d, yyyy")}</span> },
    { id: "clears", header: "Clears", cell: (c) => <span className="text-muted-foreground">{format(new Date(c.clearanceDate), "MMM d, yyyy")}</span> },
    { id: "status", header: "Status", chip: true, cell: (c) => <FinanceStatusBadge variant="cheque" value={c.status} /> },
    { id: "amount", header: "Amount", align: "right", cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.amount)}</span> },
    { id: "expense", header: "Expense", cell: (c) => c.expenseReference ? <Link href={`/finance/expenses?search=${encodeURIComponent(c.expenseReference)}`} className="font-mono text-primary hover:underline">{c.expenseReference}</Link> : "—" },
    { id: "actions", header: "Actions", align: "right", cell: (c) => <div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild title="View"><Link href={`/finance/cheques/${c.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>{canEdit && c.status === "issued" && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => { setEditCheque(c); setDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}</div> },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Cheques"
        description="Issue bank cheques to vendors, clients, or employees. Clearing settles the linked expense."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Cheques" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Issue cheque
            </Button>
          ) : null
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Issued", value: issued.length, icon: Banknote, accent: "blue", delay: 0 },
          {
            title: "Clearing this week",
            value: clearingThisWeek.length,
            icon: AlertTriangle,
            accent: "amber",
            delay: 1,
          },
          {
            title: "Cleared this month",
            value: clearedThisMonth.length,
            icon: CheckCircle2,
            accent: "green",
            delay: 2,
          },
          {
            title: "Security deposits out",
            value: securityOutstanding.length,
            icon: Shield,
            accent: "violet",
            delay: 3,
          },
        ]}
      />

      {forecastData && forecastData.length > 0 && (
        <Card className="mb-6 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-500" />
              Cash Flow Runway: Upcoming Cheque Clearances (Working Capital Projection)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="_id"
                  tickFormatter={(str) => {
                    try {
                      return format(new Date(str), "MMM d");
                    } catch {
                      return str;
                    }
                  }}
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val.toLocaleString("en-IN")}`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ fontSize: "12px", color: "hsl(var(--primary))" }}
                  labelFormatter={(label) => {
                    try {
                      return `Clearance Date: ${format(new Date(label), "MMM d, yyyy")}`;
                    } catch {
                      return label;
                    }
                  }}
                  formatter={(value: any, name, props) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    `Total Outflow (${props.payload.count} cheque${props.payload.count > 1 ? "s" : ""})` as any
                  ]}
                />
                <Bar dataKey="totalAmount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payee, cheque #, reference…"
      />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable columns={columns} rows={filtered} rowKey={(c) => c.id} empty={{ icon: Banknote, title: "No cheques found", description: "Issue a bank cheque to create a linked unpaid expense.", actionLabel: canCreate ? "Issue cheque" : undefined, onAction: canCreate ? openCreate : undefined }} />

      <ChequeFormModal
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cheque={editCheque}
        onSuccess={() => refetch()}
      />
    </PortalPageShell>
  );
}
