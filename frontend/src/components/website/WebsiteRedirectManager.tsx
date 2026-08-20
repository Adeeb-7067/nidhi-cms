import React, { useState, useEffect } from "react";
import {
  fetchAdminRedirects,
  createAdminRedirect,
  deleteAdminRedirect,
  WebsiteRedirectRule,
} from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import { CmsDataTable, CmsFilterBar, CmsStatusChip, CmsRowActions, type CmsColumn } from "@/components/cms";
import { ArrowRightLeft, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebsiteRedirectManager() {
  const { toast } = useToast();
  const [redirects, setRedirects] = useState<WebsiteRedirectRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState(301);

  useEffect(() => {
    loadRedirects();
  }, []);

  async function loadRedirects() {
    try {
      setLoading(true);
      const data = await fetchAdminRedirects();
      setRedirects(data || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load redirect rules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRedirect(e: React.FormEvent) {
    e.preventDefault();
    if (!fromPath || !toPath) return;
    try {
      setAdding(true);
      await createAdminRedirect({ fromPath, toPath, statusCode });
      toast({ title: "Success", description: "Redirect rule created successfully." });
      setFromPath("");
      setToPath("");
      await loadRedirects();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create redirect rule.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAdminRedirect(id);
      toast({ title: "Success", description: "Redirect rule deleted successfully." });
      await loadRedirects();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Delete failed.", variant: "destructive" });
    }
  }

  const filtered = redirects.filter(
    (r) =>
      !search ||
      r.fromPath.toLowerCase().includes(search.toLowerCase()) ||
      r.toPath.toLowerCase().includes(search.toLowerCase())
  );

  const columns: CmsColumn<WebsiteRedirectRule>[] = [
    {
      key: "fromPath",
      header: "Old URL Path",
      cell: (r) => <span className="font-mono font-semibold text-indigo-400">{r.fromPath}</span>,
    },
    {
      key: "arrow",
      header: "Routing",
      cell: () => <ArrowRight className="w-4 h-4 text-slate-500" />,
    },
    {
      key: "toPath",
      header: "Destination URL",
      cell: (r) => <span className="font-mono font-bold text-emerald-400">{r.toPath}</span>,
    },
    {
      key: "statusCode",
      header: "HTTP Code",
      cell: (r) => (
        <CmsStatusChip
          label={`HTTP ${r.statusCode}`}
          tone={r.statusCode === 301 ? "blue" : "amber"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <CmsRowActions
          actions={[
            {
              label: "Delete Rule",
              icon: Trash2,
              tone: "danger",
              onClick: () => handleDelete(r._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Create Redirect Card Form */}
      <form onSubmit={handleAddRedirect} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" /> Create New URL Redirect Rule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Old Request Path</label>
            <Input
              required
              placeholder="e.g. /old-services"
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Destination URL</label>
            <Input
              required
              placeholder="e.g. /services/ai"
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">HTTP Redirect Type</label>
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={301}>301 Permanent Redirect (SEO Recommended)</option>
              <option value={302}>302 Temporary Redirect</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={adding} size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> Add Redirect Rule
          </Button>
        </div>
      </form>

      {/* Filter Bar & Data Table */}
      <CmsFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search redirect paths..."
      />

      <CmsDataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyState={{
          title: "No Redirect Rules Found",
          description: "Create a redirect rule above to automatically forward traffic from old URLs.",
          icon: ArrowRightLeft,
        }}
      />
    </div>
  );
}
