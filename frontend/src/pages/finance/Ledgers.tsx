import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { BookOpen, ArrowRight } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockLedgers } from "@/modules/finance/mock-data";
import { formatCurrency } from "@/modules/finance/constants";
import type { LedgerType } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinancePageLoader,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { toast } from "sonner";

const LEDGER_TABS: { value: LedgerType; label: string }[] = [
  { value: "client", label: "Client ledger" },
  { value: "vendor", label: "Vendor ledger" },
  { value: "expense", label: "Expense ledger" },
  { value: "bank", label: "Bank & cash" },
];

export default function LedgersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<LedgerType>("client");
  const { loading } = useMockPageState();

  const accounts = mockLedgers.filter((l) => l.type === activeTab);
  const filteredAccounts = accounts.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading ledgers…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Ledgers"
        description="Client, vendor, expense, and bank account ledgers."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Ledgers" }]}
        actions={
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.success("Ledger export started (demo)")}>
            Export ledger
          </button>
        }
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search account name…" onExport={() => toast.success("Export started (demo)")} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LedgerType)}>
        <TabsList className="h-9">
          {LEDGER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {LEDGER_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-4">
            {filteredAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No accounts in this ledger.</p>
            ) : (
              filteredAccounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {account.name}
                      </CardTitle>
                      <div className="flex gap-4 text-xs">
                        <span><span className="text-muted-foreground">Opening:</span> <strong className="tabular-nums">{formatCurrency(account.openingBalance)}</strong></span>
                        <span><span className="text-muted-foreground">Closing:</span> <strong className="tabular-nums">{formatCurrency(account.closingBalance)}</strong></span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Reference</TableHead>
                            <TableHead className="text-xs text-right">Debit</TableHead>
                            <TableHead className="text-xs text-right">Credit</TableHead>
                            <TableHead className="text-xs text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {account.entries.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="text-xs">{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-xs">{e.description}</TableCell>
                              <TableCell className="text-xs">
                                {e.referenceHref ? (
                                  <Link href={e.referenceHref} className="font-mono text-primary hover:underline inline-flex items-center gap-0.5">
                                    {e.reference} <ArrowRight className="h-3 w-3" />
                                  </Link>
                                ) : (
                                  <span className="font-mono text-muted-foreground">{e.reference}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{e.debit > 0 ? formatCurrency(e.debit) : "—"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{e.credit > 0 ? formatCurrency(e.credit) : "—"}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(e.balance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </PortalPageShell>
  );
}
