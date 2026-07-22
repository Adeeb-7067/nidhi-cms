import { useEffect, useMemo } from "react";
import { Briefcase, File, Folder, HardDrive, FolderOpen } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { MarketingListPageSkeleton } from "@/components/loading";
import { useMarketingAccounts, useMarketingMediaTree, type MarketingAccount } from "@/api/marketing";
import {
  MarketingPageHeader,
  MediaDesktopExplorer,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { digitalAccountLabel } from "@/modules/marketing/digital-account-label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function legacyProjectAccountId(accounts: { id: number; projectId: number | null }[]): string {
  if (typeof window === "undefined") return "";
  const project = new URLSearchParams(window.location.search).get("project");
  if (!project || !accounts.length) return "";
  const match = accounts.find((a) => String(a.projectId) === project);
  return match ? String(match.id) : "";
}

/** Home view: one folder per assigned digital project vault. */
function ProjectVaultHome({
  accounts,
  onOpen,
}: {
  accounts: MarketingAccount[];
  onOpen: (accountId: string) => void;
}) {
  const projectAccounts = accounts.filter((a) => a.projectId != null);

  if (!projectAccounts.length) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No digital project vaults yet. Open a Digital project first — Media folders are created per
        project.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
          This PC — Digital project vaults
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {projectAccounts.length} project{projectAccounts.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="mb-4 text-[11px] text-muted-foreground">
          Open a project folder to browse Brand assets, Documents, Images, and Videos for that
          client.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {projectAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => onOpen(String(account.id))}
              onDoubleClick={() => onOpen(String(account.id))}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-xl border border-transparent p-3 text-center",
                "transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 transition-transform group-hover:scale-105 dark:text-amber-400">
                <FolderOpen className="h-9 w-9" />
              </div>
              <span className="line-clamp-2 w-full text-[11px] font-medium leading-snug">
                {account.projectName || digitalAccountLabel(account)}
              </span>
              <span className="line-clamp-1 w-full text-[10px] text-muted-foreground">
                {account.companyName}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketingMedia() {
  const { data, isLoading, isError } = useMarketingAccounts();
  const accounts = data?.accounts ?? [];
  const [accountId, setAccountId] = useAccountProjectFilter();

  // Only auto-open when deep-linked (?account= or legacy ?project=) — never force the first project.
  useEffect(() => {
    if (!accounts.length || accountId) return;
    const legacy = legacyProjectAccountId(accounts);
    if (legacy) setAccountId(legacy);
  }, [accounts, accountId, setAccountId]);

  const selectedId = useMemo(() => {
    if (!accountId) return undefined;
    const id = Number(accountId);
    return Number.isFinite(id) ? id : undefined;
  }, [accountId]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedId) ?? null,
    [accounts, selectedId],
  );

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
        description="All assigned digital projects appear as vault folders — open one to browse files"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Media" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedId != null ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAccountId("")}
              >
                All projects
              </Button>
            ) : null}
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <DigitalProjectSelect
              value={selectedId != null ? String(selectedId) : undefined}
              onValueChange={setAccountId}
              allowAll
              allLabel="All project vaults"
              placeholder="Jump to project vault"
              className="h-8 w-[280px] text-xs"
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
            {
              title: "Projects available",
              value: accountKpis.totalAccounts,
              icon: Briefcase,
              accent: "blue",
              delay: 0,
            },
            {
              title: "Linked to Manage",
              value: accountKpis.withProject,
              icon: HardDrive,
              accent: "green",
              delay: 1,
            },
            {
              title: "Unlinked",
              value: accountKpis.withoutProject,
              icon: Folder,
              accent: "amber",
              delay: 2,
            },
          ]}
        />
      ) : (
        <PortalKpiGrid
          loading={kpiLoading}
          columns={4}
          count={4}
          items={[
            {
              title: "Projects available",
              value: accountKpis.totalAccounts,
              icon: Briefcase,
              accent: "blue",
              delay: 0,
            },
            {
              title: "Open vault",
              value: selectedAccount?.projectName ?? "Project",
              icon: FolderOpen,
              accent: "violet",
              delay: 1,
            },
            {
              title: "Vault folders",
              value: vaultKpis.folders,
              icon: Folder,
              accent: "amber",
              delay: 2,
            },
            {
              title: "Vault files",
              value: vaultKpis.files,
              icon: File,
              accent: "green",
              delay: 3,
            },
          ]}
        />
      )}

      {isError ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Couldn’t load digital projects. Check permissions and try again.
        </div>
      ) : selectedId ? (
        <MediaDesktopExplorer
          accountId={selectedId}
          onBackToAllProjects={() => setAccountId("")}
        />
      ) : (
        <ProjectVaultHome accounts={accounts} onOpen={setAccountId} />
      )}
    </PortalPageShell>
  );
}
