import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { BookOpen, Plus, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/modules/finance/constants";
import type { LedgerType } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceErrorState,
  BankAccountFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceSectionSkeleton } from "@/components/loading";
import {
  useClientLedgers,
  useVendorLedgers,
  useExpenseCategoryLedgers,
  useBankLedgers,
  useDeleteBankAccount,
  type FinanceBankAccount,
  type LedgerAccount,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

const LEDGER_TABS: { value: LedgerType; label: string }[] = [
  { value: "client", label: "Client ledger" },
  { value: "vendor", label: "Vendor ledger" },
  { value: "expense", label: "Expense ledger" },
  { value: "bank", label: "Bank & cash" },
];

function ledgerToBankAccount(account: LedgerAccount): FinanceBankAccount {
  return {
    id: Number(account.id),
    name: account.name,
    bankName: null,
    accountNumberMasked: null,
    ifsc: null,
    openingBalance: account.openingBalance,
  };
}

export default function LedgersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<LedgerType>("client");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<FinanceBankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LedgerAccount | null>(null);
  const { can } = usePermissions();
  const canEditBank = can("finance_ledgers", "edit");
  const canDeleteBank = can("finance_ledgers", "delete");
  const deleteBankAccount = useDeleteBankAccount();

  const clientLedgers = useClientLedgers(null, activeTab === "client");
  const vendorLedgers = useVendorLedgers(null, activeTab === "vendor");
  const expenseLedgers = useExpenseCategoryLedgers(activeTab === "expense");
  const bankLedgers = useBankLedgers(null, activeTab === "bank");

  const activeQuery = { client: clientLedgers, vendor: vendorLedgers, expense: expenseLedgers, bank: bankLedgers }[activeTab];
  const accounts = activeQuery.data?.accounts ?? [];
  const filteredAccounts = accounts.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()));

  const openCreateBank = () => { setEditAccount(null); setBankModalOpen(true); };
  const openEditBank = (account: LedgerAccount) => {
    setEditAccount(ledgerToBankAccount(account));
    setBankModalOpen(true);
  };

  const handleDeleteBank = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBankAccount.mutateAsync(Number(deleteTarget.id));
      toast.success(`Bank account "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      bankLedgers.refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete bank account");
    }
  };

  if (activeQuery.isLoading) {
    return <FinanceSectionSkeleton />;
  }
  if (activeQuery.isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => activeQuery.refetch()} />
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
          activeTab === "bank" ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreateBank}>
              <Plus className="h-3.5 w-3.5" />
              Add bank account
            </Button>
          ) : (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.success("Ledger export started")}>
              Export ledger
            </button>
          )
        }
      />

      <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search account name…" onExport={() => toast.success("Export started")} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LedgerType)}>
        <TabsList className="h-9">
          {LEDGER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
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
                    <div className="flex items-center gap-2">
                      <div className="flex gap-4 text-xs">
                        <span><span className="text-muted-foreground">Opening:</span> <strong className="tabular-nums">{formatCurrency(account.openingBalance)}</strong></span>
                        <span><span className="text-muted-foreground">Closing:</span> <strong className="tabular-nums">{formatCurrency(account.closingBalance)}</strong></span>
                      </div>
                      {activeTab === "bank" && (canEditBank || canDeleteBank) && (
                        <div className="flex gap-1">
                          {canEditBank && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditBank(account)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDeleteBank && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(account)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {account.entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No activity yet.</p>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <BankAccountFormModal
        open={bankModalOpen}
        onOpenChange={(open) => { setBankModalOpen(open); if (!open) setEditAccount(null); }}
        account={editAccount}
        onSuccess={() => { bankLedgers.refetch(); setEditAccount(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete bank account?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed. Accounts with linked payments can't be deleted.` : undefined}
        loading={deleteBankAccount.isPending}
        onConfirm={handleDeleteBank}
      />
    </PortalPageShell>
  );
}
