import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { BookOpen, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, MONEY_IN_CLASS, MONEY_OUT_CLASS } from "@/modules/finance/constants";
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

type LedgerEntry = LedgerAccount["entries"][number];

const entryColumns: CmsColumn<LedgerEntry>[] = [
  {
    id: "date",
    header: "Date",
    cell: (e) => format(new Date(e.date), "MMM d, yyyy"),
  },
  { id: "description", header: "Description", cell: (e) => e.description },
  {
    id: "reference",
    header: "Reference",
    cell: (e) =>
      e.referenceHref ? (
        <Link
          href={e.referenceHref}
          className="font-mono text-primary hover:underline inline-flex items-center gap-0.5"
        >
          {e.reference} <ArrowRight className="h-3 w-3" />
        </Link>
      ) : (
        <span className="font-mono text-muted-foreground">{e.reference}</span>
      ),
  },
  {
    id: "debit",
    header: "Debit",
    align: "right",
    cell: (e) => (
      <span className={`tabular-nums font-medium ${MONEY_OUT_CLASS}`}>
        {e.debit > 0 ? formatCurrency(e.debit) : "—"}
      </span>
    ),
  },
  {
    id: "credit",
    header: "Credit",
    align: "right",
    cell: (e) => (
      <span className={`tabular-nums font-medium ${MONEY_IN_CLASS}`}>
        {e.credit > 0 ? formatCurrency(e.credit) : "—"}
      </span>
    ),
  },
  {
    id: "balance",
    header: "Balance",
    align: "right",
    cell: (e) => <span className="tabular-nums font-medium">{formatCurrency(e.balance)}</span>,
  },
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

  const activeQuery = {
    client: clientLedgers,
    vendor: vendorLedgers,
    expense: expenseLedgers,
    bank: bankLedgers,
  }[activeTab];
  const accounts = activeQuery.data?.accounts ?? [];
  const filteredAccounts = accounts.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreateBank = () => {
    setEditAccount(null);
    setBankModalOpen(true);
  };
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
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => toast.success("Ledger export started")}
            >
              Export ledger
            </button>
          )
        }
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search account name…"
        onExport={() => toast.success("Export started")}
      />

      <CmsChipTabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LedgerType)}
        items={LEDGER_TABS.map((t) => ({ value: t.value, label: t.label }))}
      />

      <div className="mt-1 space-y-4">
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
                      <span>
                        <span className="text-muted-foreground">Opening:</span>{" "}
                        <strong className="tabular-nums">{formatCurrency(account.openingBalance)}</strong>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Closing:</span>{" "}
                        <strong className="tabular-nums">{formatCurrency(account.closingBalance)}</strong>
                      </span>
                    </div>
                    {activeTab === "bank" && (canEditBank || canDeleteBank) && (
                      <CmsRowActions
                        label="Bank account actions"
                        canEdit={canEditBank}
                        canDelete={canDeleteBank}
                        onEdit={() => openEditBank(account)}
                        onDelete={() => setDeleteTarget(account)}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CmsDataTable
                  columns={entryColumns}
                  rows={account.entries}
                  rowKey={(e) => e.id}
                  embedded
                  empty={{ title: "No activity yet." }}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BankAccountFormModal
        open={bankModalOpen}
        onOpenChange={(open) => {
          setBankModalOpen(open);
          if (!open) setEditAccount(null);
        }}
        account={editAccount}
        onSuccess={() => {
          bankLedgers.refetch();
          setEditAccount(null);
        }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete bank account?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed. Accounts with linked payments can't be deleted.`
            : undefined
        }
        loading={deleteBankAccount.isPending}
        onConfirm={handleDeleteBank}
      />
    </PortalPageShell>
  );
}
