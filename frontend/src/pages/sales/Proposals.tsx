import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, FileText, Send, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import { useTablePagination } from "@/lib/table-pagination";
import {
  useListProposals,
  useSendProposal,
  useDeleteProposal,
  useSalesDashboard,
  type ProposalStatus,
  type Proposal,
} from "@/api/sales";
import { PROPOSAL_STATUS_LABELS, formatCurrency } from "@/modules/sales/constants";
import { formatSalesDateTime } from "@/modules/sales/utils";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  ProposalFormSheet,
} from "@/modules/sales/components";
import { resolveProposalTotal } from "@/modules/sales/utils";

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
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => { resetPage(); }, [search, statusTab, resetPage]);

  const listParams = {
    search: search || undefined,
    status: statusTab === "all" ? undefined : (statusTab as ProposalStatus),
    page,
    limit: apiLimit,
  };

  const { data, isLoading, isError, refetch } = useListProposals(listParams);
  const { data: dashData } = useSalesDashboard();
  const sendProposal = useSendProposal();
  const deleteProposal = useDeleteProposal();

  const proposals = data?.proposals ?? [];
  const total = data?.total ?? 0;

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

  const columns: CmsColumn<Proposal>[] = [
    {
      id: "number",
      header: "Number",
      cell: (p) => (
        <Link href={`/sales/proposals/${p.id}`} className="font-mono text-primary hover:underline">
          {p.number}
        </Link>
      ),
    },
    {
      id: "title",
      header: "Title",
      className: "max-w-[180px] truncate font-medium",
      cell: (p) => p.title,
    },
    {
      id: "for",
      header: "For",
      className: "max-w-[140px] truncate text-muted-foreground",
      cell: (p) =>
        p.lead?.name ??
        p.customer?.companyName ??
        p.customer?.contactPerson ??
        (p.leadId ? `Lead #${p.leadId}` : p.customerId ? `Customer #${p.customerId}` : "—"),
    },
    {
      id: "status",
      header: "Status",
      chip: true,
      cell: (p) => <SalesStatusBadge variant="proposal" value={p.status} />,
    },
    {
      id: "executive",
      header: "Executive",
      cell: (p) =>
        p.assignedToUser ? (
          <ExecutiveAvatar name={p.assignedToUser.name} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (p) => (
        <span className="font-medium tabular-nums">{formatCurrency(resolveProposalTotal(p).finalTotal)}</span>
      ),
    },
    {
      id: "valid",
      header: "Valid until",
      cell: (p) => (
        <span className="text-muted-foreground">
          {p.validUntil ? format(new Date(p.validUntil), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      cell: (p) => <span className="text-muted-foreground">{formatSalesDateTime(p.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (p) => {
        const canSend = ["draft", "revised", "counter_offer"].includes(p.status);
        const canDelete = ["draft", "revised", "declined", "expired"].includes(p.status);
        return (
          <CmsRowActions
            label="Proposal actions"
            items={[
              {
                label: "Send",
                icon: Send,
                onSelect: () => handleSend(p),
                disabled: sendingId === p.id,
                hidden: !canSend,
              },
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => setEditId(p.id),
              },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => setDeletingId(p.id),
                variant: "destructive",
                separatorBefore: true,
                hidden: !canDelete,
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
    <PortalPageShell>
      <SalesPageHeader
        title="Proposals"
        description="Create, send, and track client proposals."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Proposals" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New proposal
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

      <PortalKpiGrid
        items={[
          {
            title: "Total proposals",
            value: statusCounts.all || total,
            icon: FileText,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Sent / seen",
            value: (statusCounts.sent ?? 0) + (statusCounts.seen ?? 0),
            icon: Send,
            accent: "violet",
            delay: 1,
          },
          {
            title: "Approved",
            value: statusCounts.approved ?? 0,
            icon: CheckCircle2,
            accent: "green",
            delay: 2,
          },
          {
            title: "Declined / expired",
            value: (statusCounts.declined ?? 0) + (statusCounts.expired ?? 0),
            icon: XCircle,
            accent: "red",
            delay: 3,
          },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search proposals…"
      />

      <CmsChipTabs
        value={statusTab}
        onValueChange={setStatusTab}
        items={STATUS_ORDER.map((s) => ({
          value: s,
          label: s === "all" ? "All" : ((PROPOSAL_STATUS_LABELS as Record<string, string>)[s] ?? s),
          count: statusCounts[s] ?? 0,
        }))}
      />

      <CmsDataTable
        columns={columns}
        rows={proposals}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        empty={{
          icon: FileText,
          title: "No proposals found",
          description: "Adjust filters or create a new proposal.",
          actionLabel: "Create proposal",
          onAction: () => setCreateOpen(true),
        }}
        pagination={{
          page,
          total,
          limit,
          loadedRowCount: proposals.length,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />
    </PortalPageShell>
    <ProposalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    <ProposalFormSheet open={editId !== null} onOpenChange={(o) => { if (!o) setEditId(null); }} editId={editId} />
  </>
  );
}
