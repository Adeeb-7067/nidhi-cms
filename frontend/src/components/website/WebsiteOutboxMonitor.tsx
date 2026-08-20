import React, { useState, useEffect } from "react";
import { fetchAdminOutbox } from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import { CmsDataTable, CmsFilterBar, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { Inbox, CheckCircle2, Clock, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WebsiteOutboxMonitor() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    loadOutbox();
  }, []);

  async function loadOutbox() {
    try {
      setLoading(true);
      const res = await fetchAdminOutbox();
      setItems(res.items || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Error loading outbox pipeline.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.inquiryId?.toLowerCase().includes(search.toLowerCase()) ||
      item.targetSystem?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(item.payload).toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: CmsColumn<any>[] = [
    {
      key: "inquiryId",
      header: "Reference ID",
      cell: (row) => <span className="font-mono font-semibold text-indigo-400">{row.inquiryId}</span>,
    },
    {
      key: "targetSystem",
      header: "Target System",
      cell: (row) => <span className="font-bold text-slate-200">{row.targetSystem}</span>,
    },
    {
      key: "payload",
      header: "Lead Details",
      cell: (row) => (
        <div className="max-w-xs truncate text-slate-300" title={JSON.stringify(row.payload)}>
          {row.payload?.name ? `${row.payload.name} (${row.payload.email})` : JSON.stringify(row.payload)}
        </div>
      ),
    },
    {
      key: "status",
      header: "Dispatch Status",
      cell: (row) => {
        const tone = row.status === "PROCESSED" ? "green" : row.status === "FAILED" ? "red" : "amber";
        return <CmsStatusChip label={row.status} tone={tone} />;
      },
    },
    {
      key: "createdAt",
      header: "Submitted At",
      cell: (row) => <span className="text-slate-400">{new Date(row.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* CMS Filter Bar */}
      <CmsFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lead forms, reference IDs, or emails..."
        selectFilters={[
          {
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "ALL", label: "All Statuses" },
              { value: "PROCESSED", label: "Delivered to CRM/HRM" },
              { value: "PENDING", label: "Pending Processing" },
              { value: "FAILED", label: "Failed Dispatches" },
            ],
          },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={loadOutbox} disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Leads
          </Button>
        }
      />

      {/* Standard CMS Data Table */}
      <CmsDataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        emptyState={{
          title: "No Form Submissions Yet",
          description: "Incoming prospective lead forms and candidate job applications will be displayed here.",
          icon: Inbox,
        }}
      />
    </div>
  );
}
