import { useEffect, useMemo } from "react";
import { Briefcase, File, Folder, HardDrive } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { MarketingListPageSkeleton } from "@/components/loading";
import { useMarketingAccounts, useMarketingMediaTree } from "@/api/marketing";
import {
  MarketingPageHeader,
  MediaDesktopExplorer,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";

function legacyProjectAccountId(accounts: { id: number; projectId: number | null }[]): string {
  if (typeof window === "undefined") return "";
  const project = new URLSearchParams(window.location.search).get("project");
  if (!project || !accounts.length) return "";
  const match = accounts.find((a) => String(a.projectId) === project);
  return match ? String(match.id) : "";
}

export default function MarketingMedia() {
  const { data, isLoading, isError } = useMarketingAccounts();
  const accounts = data?.accounts ?? [];
  const [accountId, setAccountId] = useAccountProjectFilter();

  useEffect(() => {
    if (!accounts.length || accountId) return;
    const legacy = legacyProjectAccountId(accounts);
    if (legacy) setAccountId(legacy);
  }, [accounts, accountId, setAccountId]);

  const selectedId = useMemo(() => {
    if (accountId) return Number(accountId);
    if (accounts[0]) return accounts[0].id;
    return undefined;
  }, [accountId, accounts]);

  const { data: treeData, isLoading: treeLoading } = useMarketingMediaTree(selectedId);
  const mediaItems = treeData?.items ?? [];

  const accountKpis = useMemo(() => {
    const withProject = accounts.filter((a) => a.projectId != null).length;
    return {
      totalAccounts: accounts.length,
      withProject,
      withoutProject: accounts.length - withProject,
    };
  }, [accounts]);

  const vaultKpis = useMemo(() => {
    const folders = mediaItems.filter((i) => i.kind === "folder").length;
    const files = mediaItems.filter((i) => i.kind !== "folder").length;
    return { folders, files };
  }, [mediaItems]);

  const kpiLoading = isLoading || (selectedId != null && treeLoading);

  if (isLoading) {
    return (
      <PortalPageShell className="pb-16">
        <MarketingPageHeader
          title="Media"
          description="Per-project vault — images, documents, brand packs, and videos"
          breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Media" }]}
        />
        <MarketingListPageSkeleton kpiCount={3} showTabs={false} />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell className="pb-16">
      <MarketingPageHeader
        title="Media"
        description="Per-project vault — images, documents, brand packs, and videos"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Media" }]}
        actions={
          <div className="flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <DigitalProjectSelect
              value={selectedId != null ? String(selectedId) : undefined}
              onValueChange={setAccountId}
            />
          </div>
        }
      />

      {selectedId == null ? (
        <PortalKpiGrid
          loading={kpiLoading}
          columns={3}
          count={3}
          items={[
            { title: "Digital projects", value: accountKpis.totalAccounts, icon: Briefcase, accent: "blue", delay: 0 },
            { title: "Linked to Manage", value: accountKpis.withProject, icon: HardDrive, accent: "green", delay: 1 },
            { title: "Unlinked", value: accountKpis.withoutProject, icon: Folder, accent: "amber", delay: 2 },
          ]}
        />
      ) : (
        <PortalKpiGrid
          loading={kpiLoading}
          columns={4}
          count={4}
          items={[
            { title: "Projects available", value: accountKpis.totalAccounts, icon: Briefcase, accent: "blue", delay: 0 },
            { title: "Linked to Manage", value: accountKpis.withProject, icon: HardDrive, accent: "violet", delay: 1 },
            { title: "Vault folders", value: vaultKpis.folders, icon: Folder, accent: "amber", delay: 2 },
            { title: "Vault files", value: vaultKpis.files, icon: File, accent: "green", delay: 3 },
          ]}
        />
      )}

      {isError ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Couldn’t load digital projects. Check permissions and try again.
        </div>
      ) : selectedId ? (
        <MediaDesktopExplorer accountId={selectedId} />
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Create a Digital project under Manage → Projects, then open its media vault here.
        </div>
      )}
    </PortalPageShell>
  );
}
