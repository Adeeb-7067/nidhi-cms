import React, { useState, useEffect } from "react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { WebsiteBlockStudio } from "@/components/website/WebsiteBlockStudio";
import { fetchAdminPages, seedDefaultPagesApi } from "@/api/website";
import { FileText, CheckCircle2, FileEdit, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function WebsitePagesPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ total: 11, live: 11, draft: 0 });
  const [syncing, setSyncing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  async function loadStats() {
    try {
      const res = await fetchAdminPages({ limit: 100 });
      const pages = res.pages || [];
      setStats({
        total: pages.length,
        live: pages.filter((p) => p.status === "PUBLISHED").length,
        draft: pages.filter((p) => p.status === "DRAFT").length,
      });
    } catch (e) {
      // Keep initial stats
    }
  }

  async function handleSyncPages() {
    try {
      setSyncing(true);
      const seedRes = await seedDefaultPagesApi();
      toast({
        title: "Success",
        description: `Imported ${seedRes.seededCount} website pages into your directory.`,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to sync pages.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <PortalPageShell className="px-6 py-4 space-y-6">
      <PortalPageHero
        title="Website pages & layout studio"
        subtitle="Manage landing pages, section layouts, and digital marketing content"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncPages}
              disabled={syncing}
              className={portalActionButtonClass("bg-secondary text-secondary-foreground")}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sync Pages
            </Button>
          </div>
        }
      />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Total Managed Pages", value: `${stats.total}`, icon: FileText, hint: "System Total", accent: "blue" },
          { title: "Live Published Pages", value: `${stats.live}`, icon: CheckCircle2, hint: "Public Pages", accent: "green" },
          { title: "Draft Pages", value: `${stats.draft}`, icon: FileEdit, hint: "Under Editing", accent: "amber" },
        ]}
      />
      <div>
        <WebsiteBlockStudio refreshTrigger={refreshTrigger} />
      </div>
    </PortalPageShell>
  );
}
