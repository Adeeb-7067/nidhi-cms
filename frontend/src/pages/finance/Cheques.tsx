import { useMemo, useState } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { Banknote, Plus, Eye, CheckCircle2, AlertTriangle, Shield } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useListCheques, type FinanceCheque } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";

export default function ChequesPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCheque, setEditCheque] = useState<FinanceCheque | null>(null);
  const { can } = usePermissions();
  const canCreate = can("finance_cheques", "create");
  const { data, isLoading, isError, refetch } = useListCheques();
  const cheques = data?.cheques ?? [];

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

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search payee, cheque #, reference…"
      />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "issued", "cleared", "cancelled", "bounced"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {t === "all" ? "All" : t} (
              {t === "all" ? cheques.length : cheques.filter((c) => c.status === (t as ChequeStatus)).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState
          icon={Banknote}
          title="No cheques found"
          description="Issue a bank cheque to create a linked unpaid expense."
          actionLabel={canCreate ? "Issue cheque" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Payee</TableHead>
                <TableHead className="text-xs">Purpose</TableHead>
                <TableHead className="text-xs">Cheque #</TableHead>
                <TableHead className="text-xs">Issue</TableHead>
                <TableHead className="text-xs">Clears</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Expense</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">
                    <Link href={`/finance/cheques/${c.id}`} className="hover:text-primary">
                      <div className="font-medium">{c.payeeName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {CHEQUE_PAYEE_TYPE_LABELS[c.payeeType]} · {c.reference}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {CHEQUE_PURPOSE_LABELS[c.purpose]}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{c.chequeNumber}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.issueDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.clearanceDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <FinanceStatusBadge variant="cheque" value={c.status} />
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">
                    {formatCurrency(c.amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.expenseReference ? (
                      <Link
                        href={`/finance/expenses?search=${encodeURIComponent(c.expenseReference)}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {c.expenseReference}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild title="View">
                      <Link href={`/finance/cheques/${c.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ChequeFormModal
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cheque={editCheque}
        onSuccess={() => refetch()}
      />
    </PortalPageShell>
  );
}
