import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ExternalLink, FileUp, Landmark, Link2, Trash2, Unlink, Wand2, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useListPayments } from "@/api/finance";
import {
  useAutoMatchCaBankStatement,
  useCaBankStatementLines,
  useCaBankStatements,
  useDeleteCaBankStatement,
  useIgnoreCaBankStatementLine,
  useImportCaBankStatement,
  useMatchCaBankStatementLine,
  useStatementCreditsToSuspense,
  useUnmatchCaBankStatementLine,
  useUnmatchedPaymentsToSuspense,
  type CaBankStatementDto,
  type CaBankStatementLineDto,
} from "@/api/ca";
import { formatCompactCurrency, formatCurrency } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, ReconciliationTable, CaRefLink } from "@/modules/ca/components";
import {
  filterByPeriod,
  mapFinancePaymentToBankTxn,
  summarizeBankRecon,
} from "@/modules/ca/adapters/finance";
import { financePaymentHref, financePaymentsListHref } from "@/modules/ca/routes";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

export default function BankReconciliation() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");

  const [view, setView] = useState<"statements" | "payments">("statements");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [directionTab, setDirectionTab] = useState<"all" | "incoming" | "outgoing">("all");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [accountName, setAccountName] = useState("Primary account");
  const [bankName, setBankName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [matchLineId, setMatchLineId] = useState<number | null>(null);
  const [paymentIdInput, setPaymentIdInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: statementsData, isLoading: statementsLoading, refetch: refetchStatements } =
    useCaBankStatements();
  const statements = statementsData?.statements ?? [];
  const activeId = selectedId ?? statements[0]?.id ?? null;

  const { data: linesData, isLoading: linesLoading, isError: linesError, refetch: refetchLines } =
    useCaBankStatementLines(activeId, undefined, view === "statements" && !!activeId);
  const lines = linesData?.lines ?? [];

  const importMutation = useImportCaBankStatement();
  const autoMatch = useAutoMatchCaBankStatement();
  const matchLine = useMatchCaBankStatementLine();
  const unmatchLine = useUnmatchCaBankStatementLine();
  const ignoreLine = useIgnoreCaBankStatementLine();
  const deleteStatement = useDeleteCaBankStatement();
  const toSuspense = useStatementCreditsToSuspense();
  const paymentsToSuspense = useUnmatchedPaymentsToSuspense();

  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError, refetch: refetchPayments } =
    useListPayments({ limit: 1000 }, view === "payments");

  const paymentRows = useMemo(() => {
    const periodRows = filterByPeriod(paymentsData?.payments ?? [], period);
    return periodRows.map(mapFinancePaymentToBankTxn);
  }, [paymentsData?.payments, period]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase();
    return paymentRows.filter((t) => {
      const matchesSearch =
        !q ||
        t.party.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.receiptNumber ?? "").toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.reconciliationStatus === tab;
      const matchesDirection = directionTab === "all" || t.direction === directionTab;
      return matchesSearch && matchesTab && matchesDirection;
    });
  }, [search, tab, directionTab, paymentRows]);

  const paymentSummary = useMemo(() => summarizeBankRecon(paymentRows), [paymentRows]);

  const filteredLines = useMemo(() => {
    const q = search.toLowerCase();
    return lines.filter((l) => {
      const matchesSearch =
        !q ||
        l.description.toLowerCase().includes(q) ||
        l.reference.toLowerCase().includes(q);
      const matchesTab = tab === "all" || l.status === tab;
      const matchesDirection = directionTab === "all" || l.direction === directionTab;
      return matchesSearch && matchesTab && matchesDirection;
    });
  }, [lines, search, tab, directionTab]);

  const activeStatement = statements.find((s) => s.id === activeId) ?? null;
  const statementKpis = {
    matched: activeStatement?.matchedCount ?? 0,
    unmatched: activeStatement?.unmatchedCount ?? 0,
    total: activeStatement?.lineCount ?? 0,
    incoming: lines.filter((l) => l.direction === "incoming").reduce((s, l) => s + l.amount, 0),
    outgoing: lines.filter((l) => l.direction === "outgoing").reduce((s, l) => s + l.amount, 0),
  };

  const lineColumns = useMemo<CmsColumn<CaBankStatementLineDto>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (l) => (
          <span className="text-muted-foreground">
            {l.date ? format(new Date(l.date), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "direction",
        header: "Flow",
        chip: true,
        cell: (l) => (
          <CmsStatusChip
            label={l.direction === "incoming" ? "Credit" : "Debit"}
            tone={l.direction === "incoming" ? "success" : "danger"}
          />
        ),
      },
      {
        id: "description",
        header: "Narration",
        className: "max-w-[220px]",
        cell: (l) => <span className="truncate block text-sm">{l.description || "—"}</span>,
      },
      {
        id: "reference",
        header: "Bank ref",
        cell: (l) => <span className="font-mono text-xs text-muted-foreground">{l.reference || "—"}</span>,
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (l) => (
          <span
            className={`font-medium tabular-nums ${
              l.direction === "incoming" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatCurrency(l.amount)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (l) => (
          <CmsStatusChip
            label={l.status}
            tone={l.status === "matched" ? "success" : l.status === "ignored" ? "neutral" : "danger"}
          />
        ),
      },
      {
        id: "payment",
        header: "Payment",
        cell: (l) =>
          l.financePaymentId ? (
            <CaRefLink href={financePaymentHref(l.financePaymentId)} mono>
              #{l.financePaymentId}
            </CaRefLink>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: (l) => (
          <CmsRowActions
            label="Statement line actions"
            canView={false}
            canEdit={false}
            canDelete={false}
            items={[
              {
                label: "Match",
                icon: Link2,
                onSelect: () => {
                  setMatchLineId(l.id);
                  setPaymentIdInput("");
                },
                hidden: !(canEdit && l.status !== "matched"),
              },
              {
                label: "Unmatch",
                icon: Unlink,
                disabled: unmatchLine.isPending,
                onSelect: async () => {
                  try {
                    await unmatchLine.mutateAsync(l.id);
                    toast.success("Line unmatched");
                  } catch (err) {
                    toastApiError(err, "Unmatch failed");
                  }
                },
                hidden: !(canEdit && l.status === "matched"),
              },
              {
                label: "Ignore",
                icon: X,
                disabled: ignoreLine.isPending,
                onSelect: async () => {
                  try {
                    await ignoreLine.mutateAsync(l.id);
                    toast.success("Line ignored");
                  } catch (err) {
                    toastApiError(err, "Ignore failed");
                  }
                },
                hidden: !(canEdit && l.status === "unmatched"),
              },
            ]}
          />
        ),
      },
    ],
    [canEdit, ignoreLine, unmatchLine],
  );

  const statementColumns = useMemo<CmsColumn<CaBankStatementDto>[]>(
    () => [
      {
        id: "account",
        header: "Account",
        cell: (s) => (
          <button type="button" className="text-left font-medium hover:text-primary" onClick={() => setSelectedId(s.id)}>
            {s.accountName}
          </button>
        ),
      },
      {
        id: "period",
        header: "Period",
        cell: (s) => (
          <span className="text-muted-foreground text-xs">
            {s.periodFrom && s.periodTo
              ? `${format(new Date(s.periodFrom), "MMM d")} – ${format(new Date(s.periodTo), "MMM d, yyyy")}`
              : "—"}
          </span>
        ),
      },
      {
        id: "counts",
        header: "Matched",
        cell: (s) => (
          <span className="tabular-nums text-xs">
            {s.matchedCount}/{s.lineCount}
          </span>
        ),
      },
      {
        id: "unmatched",
        header: "Unmatched",
        cell: (s) => (
          <span className={s.unmatchedCount > 0 ? "text-red-600 font-medium tabular-nums" : "tabular-nums"}>
            {s.unmatchedCount}
          </span>
        ),
      },
    ],
    [],
  );

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
  };

  const handleImport = async () => {
    if (!csvText.trim()) return toast.error("Paste or upload a CSV first");
    try {
      const result = await importMutation.mutateAsync({
        csvText,
        accountName: accountName.trim() || "Primary account",
        bankName: bankName.trim() || undefined,
        fileName: fileName || undefined,
        autoMatch: true,
      });
      setSelectedId(result.statement.id);
      setImportOpen(false);
      setCsvText("");
      setFileName(null);
      toast.success(
        `Imported ${result.imported} lines · auto-matched ${result.autoMatched}`,
      );
      if (result.parseWarnings?.length) {
        toast.message(`${result.parseWarnings.length} row warning(s)`, {
          description: result.parseWarnings.slice(0, 3).join("; "),
        });
      }
    } catch (err) {
      toastApiError(err, "Import failed");
    }
  };

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Bank reconciliation"
        description="Import bank CSV, match statement lines to Finance payments, and push unmatched credits to Suspense"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Bank reconciliation" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreate ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setImportOpen(true)}>
                <FileUp className="h-3.5 w-3.5" /> Import CSV
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={paymentsToSuspense.isPending}
                onClick={async () => {
                  try {
                    const r = await paymentsToSuspense.mutateAsync();
                    toast.success(`Suspense: ${r.created} created, ${r.linked} linked`);
                  } catch (err) {
                    toastApiError(err, "Could not create suspense");
                  }
                }}
              >
                <Link2 className="h-3.5 w-3.5" /> Unmatched payments → Suspense
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref()}>
                Open Finance
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
          </div>
        }
      />

      <CmsChipTabs
        value={view}
        onValueChange={(v) => setView(v as "statements" | "payments")}
        items={[
          { value: "statements", label: "Bank statements", count: statements.length },
          { value: "payments", label: "Payment linkage", count: paymentRows.length },
        ]}
      />

      {view === "statements" ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Imports
              </p>
              <CmsDataTable
                columns={statementColumns}
                rows={statements}
                rowKey={(s) => s.id}
                embedded
                isLoading={statementsLoading}
                onRowClick={(s) => setSelectedId(s.id)}
                empty={{
                  title: "No statements yet",
                  description: "Import a bank CSV to start true reconciliation.",
                  actionLabel: canCreate ? "Import CSV" : undefined,
                  onAction: canCreate ? () => setImportOpen(true) : undefined,
                }}
              />
            </div>

            <div className="space-y-3 min-w-0">
              {activeStatement ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{activeStatement.accountName}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeStatement.fileName || "Statement"}
                        {activeStatement.bankName ? ` · ${activeStatement.bankName}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          disabled={autoMatch.isPending}
                          onClick={async () => {
                            try {
                              const r = await autoMatch.mutateAsync(activeStatement.id);
                              toast.success(`Auto-matched ${r.matched} line(s)`);
                              void refetchLines();
                              void refetchStatements();
                            } catch (err) {
                              toastApiError(err, "Auto-match failed");
                            }
                          }}
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Auto-match
                        </Button>
                      ) : null}
                      {canCreate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          disabled={toSuspense.isPending}
                          onClick={async () => {
                            try {
                              const r = await toSuspense.mutateAsync(activeStatement.id);
                              toast.success(`Suspense: ${r.created} created`);
                            } catch (err) {
                              toastApiError(err, "Suspense create failed");
                            }
                          }}
                        >
                          Credits → Suspense
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-destructive"
                          disabled={deleteStatement.isPending}
                          onClick={async () => {
                            try {
                              await deleteStatement.mutateAsync(activeStatement.id);
                              setSelectedId(null);
                              toast.success("Statement deleted");
                            } catch (err) {
                              toastApiError(err, "Delete failed");
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <PortalKpiGrid
                    columns={4}
                    items={[
                      { title: "Lines", value: String(statementKpis.total), icon: Landmark, accent: "blue", delay: 0 },
                      { title: "Matched", value: String(statementKpis.matched), icon: Landmark, accent: "green", delay: 1 },
                      {
                        title: "Unmatched",
                        value: String(statementKpis.unmatched),
                        icon: Landmark,
                        accent: "red",
                        alert: statementKpis.unmatched > 0,
                        delay: 2,
                      },
                      {
                        title: "Credits",
                        value: formatCompactCurrency(statementKpis.incoming),
                        icon: Landmark,
                        accent: "green",
                        delay: 3,
                      },
                    ]}
                  />

                  <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search narration, ref…" />
                  <CmsChipTabs
                    value={directionTab}
                    onValueChange={(v) => setDirectionTab(v as "all" | "incoming" | "outgoing")}
                    items={[
                      { value: "all", label: "All", count: lines.length },
                      { value: "incoming", label: "Credits", count: lines.filter((l) => l.direction === "incoming").length },
                      { value: "outgoing", label: "Debits", count: lines.filter((l) => l.direction === "outgoing").length },
                    ]}
                  />
                  <CmsChipTabs
                    value={tab}
                    onValueChange={setTab}
                    items={[
                      { value: "all", label: "All status", count: lines.length },
                      { value: "matched", label: "Matched", count: lines.filter((l) => l.status === "matched").length },
                      { value: "unmatched", label: "Unmatched", count: lines.filter((l) => l.status === "unmatched").length },
                      { value: "ignored", label: "Ignored", count: lines.filter((l) => l.status === "ignored").length },
                    ]}
                  />
                  <CmsDataTable
                    columns={lineColumns}
                    rows={filteredLines}
                    rowKey={(l) => l.id}
                    isLoading={linesLoading}
                    error={linesError}
                    onRetry={() => void refetchLines()}
                    empty={{ title: "No statement lines", description: "Import a CSV or clear filters." }}
                  />
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Select or import a bank statement to reconcile lines against Finance payments.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <CAFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search party, reference…"
            period={period}
            onPeriodChange={setPeriod}
          />
          <PortalKpiGrid
            columns={4}
            items={[
              { title: "Matched", value: paymentsLoading ? "…" : String(paymentSummary.matched), icon: Landmark, accent: "green", delay: 0 },
              {
                title: "Unmatched",
                value: paymentsLoading ? "…" : String(paymentSummary.unmatched),
                icon: Landmark,
                accent: "red",
                alert: paymentSummary.unmatched > 0,
                delay: 1,
              },
              {
                title: "Incoming",
                value: paymentsLoading ? "…" : formatCompactCurrency(paymentSummary.incomingTotal),
                icon: Landmark,
                accent: "blue",
                delay: 2,
              },
              {
                title: "Outgoing",
                value: paymentsLoading ? "…" : formatCompactCurrency(paymentSummary.outgoingTotal),
                icon: Landmark,
                accent: "red",
                delay: 3,
              },
            ]}
          />
          <CmsChipTabs
            value={directionTab}
            onValueChange={(v) => setDirectionTab(v as "all" | "incoming" | "outgoing")}
            items={[
              { value: "all", label: "All flows", count: paymentRows.length },
              { value: "incoming", label: "Incoming", count: paymentRows.filter((r) => r.direction === "incoming").length },
              { value: "outgoing", label: "Outgoing", count: paymentRows.filter((r) => r.direction === "outgoing").length },
            ]}
          />
          <CmsChipTabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "all", label: "All recon", count: paymentRows.length },
              { value: "matched", label: "Matched", count: paymentSummary.matched },
              { value: "unmatched", label: "Unmatched", count: paymentSummary.unmatched },
              { value: "partial", label: "Partial", count: paymentSummary.partial },
            ]}
          />
          <ReconciliationTable
            rows={filteredPayments}
            isLoading={paymentsLoading}
            error={paymentsError}
            onRetry={() => void refetchPayments()}
          />
        </>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Import bank statement CSV</DialogTitle>
            <DialogDescription>
              Supports Date + Withdrawal/Deposit columns, or Date + Amount + CR/DR. Auto-match runs after import.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-6 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account name</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Bank</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1" placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label className="text-xs">CSV file</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="mt-1"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label className="text-xs">Or paste CSV</Label>
              <textarea
                className="mt-1 w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-xs font-mono"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Date,Narration,Ref,Withdrawal,Deposit,Balance"
              />
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={importMutation.isPending} onClick={() => void handleImport()}>
              Import &amp; match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={matchLineId != null} onOpenChange={(o) => !o && setMatchLineId(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Match to Finance payment</DialogTitle>
            <DialogDescription>Enter the Finance payment ID (same amount and direction).</DialogDescription>
          </DialogHeader>
          <DialogBody className="px-6 py-4 space-y-3">
            <div>
              <Label className="text-xs">Payment ID</Label>
              <Input
                type="number"
                className="mt-1"
                value={paymentIdInput}
                onChange={(e) => setPaymentIdInput(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
          </DialogBody>
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={() => setMatchLineId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={matchLine.isPending}
              onClick={async () => {
                if (!matchLineId) return;
                const paymentId = Number(paymentIdInput);
                if (!Number.isFinite(paymentId)) return toast.error("Enter a valid payment id");
                try {
                  await matchLine.mutateAsync({ lineId: matchLineId, paymentId });
                  toast.success("Matched");
                  setMatchLineId(null);
                } catch (err) {
                  toastApiError(err, "Match failed");
                }
              }}
            >
              Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
