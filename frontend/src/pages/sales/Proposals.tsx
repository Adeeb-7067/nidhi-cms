import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, FileText, Send, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
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
  useListProposals,
  useSendProposal,
  useDeleteProposal,
  useSalesDashboard,
  type ProposalStatus,
  type Proposal,
} from "@/api/sales";
import { PROPOSAL_STATUS_LABELS, formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
} from "@/modules/sales/components";
import { resolveProposalTotal } from "@/modules/sales/utils";

const PAGE_SIZE = 20;

const STATUS_ORDER: (ProposalStatus | "all")[] = [
  "all",
  "draft",
  "sent",
  "seen",
  "revised",
  "approved",
  "declined",
  "counter_offer",
  "expired",
];

export default function Proposals() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => { setPage(1); }, [search, statusTab]);

  const listParams = {
    search: search || undefined,
    status: statusTab === "all" ? undefined : (statusTab as ProposalStatus),
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch } = useListProposals(listParams);
  const { data: dashData } = useSalesDashboard();
  const sendProposal = useSendProposal();
  const deleteProposal = useDeleteProposal();

  const proposals = data?.proposals ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusCounts = useMemo(() => {
    const pbs = dashData?.proposalByStatus ?? {};
    const counts: Record<string, number> = { all: dashData?.totalProposals ?? total };
    for (const s of STATUS_ORDER) {
      if (s === "all") continue;
      counts[s] = pbs[s] ?? 0;
    }
    return counts;
  }, [dashData, total]);

  const handleSend = async (p: Proposal) => {
    setSendingId(p.id);
    try {
      const result = await sendProposal.mutateAsync({ id: p.id });
      const emailSent = (result as { emailSent?: boolean; sentToEmail?: string })?.emailSent;
      const to = (result as { sentToEmail?: string })?.sentToEmail;
      toast.success("Proposal sent", {
        description: emailSent ? `Email delivered to ${to}` : "Status updated — no email on file.",
      });
    } catch (err) {
      toastApiError(err, "Failed to send proposal");
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProposal.mutateAsync(id);
      toast.success("Proposal deleted");
    } catch (err) {
      toastApiError(err, "Failed to delete proposal");
    } finally {
      setDeletingId(null);
    }
  };

  const deletingProposal = deletingId !== null ? proposals.find((p) => p.id === deletingId) : null;

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Proposals"
        description="Create, send, and track client proposals."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/sales/proposals/create">
              <Plus className="h-3.5 w-3.5" />
              New proposal
            </Link>
          </Button>
        }
      />

      {/* Delete confirmation dialog */}
      {deletingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-xl shadow-xl border w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Delete proposal?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This will permanently delete <strong>{deletingProposal.number}</strong> and all its audit history. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteProposal.isPending}
                onClick={() => handleDelete(deletingProposal.id)}
              >
                {deleteProposal.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search proposals…"
      />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {STATUS_ORDER.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="text-xs data-[state=active]:bg-primary/10"
            >
              {s === "all" ? "All" : ((PROPOSAL_STATUS_LABELS as Record<string, string>)[s] ?? s)} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState
          icon={FileText}
          title="Failed to load proposals"
          description="Could not fetch proposals from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : total === 0 ? (
        <SalesEmptyState
          icon={FileText}
          title="No proposals found"
          description="Adjust filters or create a new proposal."
          actionLabel="Create proposal"
          onAction={() => navigate("/sales/proposals/create")}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Number</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">For</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Executive</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Valid until</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => {
                  const total = resolveProposalTotal(p).finalTotal;
                  const forLabel = p.leadId
                    ? `Lead #${p.leadId}`
                    : p.customerId
                    ? `Customer #${p.customerId}`
                    : "—";
                  const canSend = ["draft", "revised", "counter_offer"].includes(p.status);
                  const canDelete = ["draft", "revised", "declined", "expired"].includes(p.status);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Link
                          href={`/sales/proposals/${p.id}`}
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {p.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-medium max-w-[180px] truncate">
                        {p.title}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground">
                        {forLabel}
                      </TableCell>
                      <TableCell>
                        <SalesStatusBadge variant="proposal" value={p.status} />
                      </TableCell>
                      <TableCell>
                        {p.assignedToUser ? (
                          <ExecutiveAvatar name={p.assignedToUser.name} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium tabular-nums">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.validUntil ? format(new Date(p.validUntil), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canSend && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Send proposal"
                              disabled={sendingId === p.id}
                              onClick={(e) => { e.stopPropagation(); handleSend(p); }}
                            >
                              <Send className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Edit proposal"
                            onClick={(e) => { e.stopPropagation(); navigate(`/sales/proposals/create?editId=${p.id}`); }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Delete proposal"
                              onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} proposal{total === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PortalPageShell>
  );
}
