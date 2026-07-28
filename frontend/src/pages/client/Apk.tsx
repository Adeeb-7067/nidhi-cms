import React, { useState, useEffect, useMemo } from "react";
import { useClientTeam } from "@/contexts/ClientTeamContext";
import { useListProjects, useGetApkReleases, getGetApkReleasesQueryKey, type ApkRelease } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeroSkeleton, PageTableSkeleton } from "@/components/loading";
import { Smartphone, Download, Calendar, Package, Layers } from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
} from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsFilterBar, type CmsColumn } from "@/components/cms";
import {
  getApkAudienceBadgeClass,
  getApkAudienceLabel,
  resolveApkDisplayName,
  formatApkReleaseSubtitle,
} from "@/lib/apk-audience";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApkRow = ApkRelease;

export default function ClientApk() {
  const team = useClientTeam();
  const { data: projectsData, isLoading: isProjectsLoading } = useListProjects({ limit: 100 });
  const projects = projectsData?.projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId(null);
      return;
    }
    if (selectedProjectId == null || !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]!.id);
    }
  }, [projects, selectedProjectId]);

  const project = projects.find((p) => p.id === selectedProjectId) ?? projects[0];
  const projectId = project?.id;

  const { data: apks, isLoading: isApksLoading, isError: apksError, refetch: refetchApks } = useGetApkReleases(projectId ?? 0, {
    query: {
      queryKey: getGetApkReleasesQueryKey(projectId ?? 0),
      enabled: projectId != null && !(team.isClientUser && !team.isAdmin && !team.can("documents")),
    },
  });

  const clientApks = apks ?? [];

  const kpis = useMemo(() => {
    const platforms = new Set(clientApks.map((a) => a.platform)).size;
    return {
      total: clientApks.length,
      platforms,
      latest: clientApks[0] ? resolveApkDisplayName(clientApks[0]) : "—",
      projects: projects.length,
    };
  }, [clientApks, projects.length]);

  const columns = useMemo<CmsColumn<ApkRow>[]>(
    () => [
      {
        id: "name",
        header: "Release",
        cell: (apk) => (
          <div className="min-w-0">
            <p className="font-medium line-clamp-2" title={resolveApkDisplayName(apk)}>
              {resolveApkDisplayName(apk)}
            </p>
            <p className="text-[10px] text-muted-foreground">{formatApkReleaseSubtitle(apk)}</p>
          </div>
        ),
      },
      {
        id: "platform",
        header: "Platform",
        chip: true,
        cell: (apk) => (
          <Badge variant="secondary" className="capitalize text-[10px]">
            {apk.platform}
          </Badge>
        ),
      },
      {
        id: "type",
        header: "Type",
        chip: true,
        cell: (apk) => (
          <Badge variant="outline" className="capitalize text-[10px] text-muted-foreground">
            {apk.releaseType}
          </Badge>
        ),
      },
      {
        id: "audience",
        header: "Audience",
        chip: true,
        cell: (apk) => (
          <Badge variant="outline" className={cn("text-[10px]", getApkAudienceBadgeClass(apk.audience))}>
            {getApkAudienceLabel(apk.audience)}
          </Badge>
        ),
      },
      {
        id: "released",
        header: "Released",
        cell: (apk) => (
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Calendar className="h-3 w-3 shrink-0" />
            {apk.createdAt
              ? new Date(apk.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Download",
        align: "right",
        hideable: false,
        cell: (apk) => (
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <a href={apk.fileUrl} download>
              <Download className="mr-1.5 h-3 w-3" />
              APK
            </a>
          </Button>
        ),
      },
    ],
    [],
  );

  if (team.isClientUser && !team.isAdmin && !team.can("documents")) {
    return (
      <PortalPageShell>
        <PortalPageHero
          title="Releases & Downloads"
          subtitle="You don't have access to this section. Ask your Client Admin to enable it."
        />
      </PortalPageShell>
    );
  }

  if (isProjectsLoading) {
    return (
      <PortalPageShell>
        <PageHeroSkeleton withBreadcrumb={false} withActions={false} />
        <PageTableSkeleton rows={4} columns={5} showToolbar />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Releases & Downloads"
        subtitle="Access your app builds"
      />

      <PortalKpiGrid
        loading={isApksLoading}
        columns={4}
        count={4}
        items={[
          { title: "Releases", value: kpis.total, icon: Package, accent: "blue", delay: 0 },
          { title: "Platforms", value: kpis.platforms, icon: Layers, accent: "violet", delay: 1 },
          { title: "Latest", value: kpis.latest, hint: "Most recent build", icon: Smartphone, accent: "green", delay: 2 },
          { title: "Projects", value: kpis.projects, icon: Package, accent: "amber", delay: 3 },
        ]}
      />

      {projects.length > 1 ? (
        <CmsFilterBar>
          <Select
            value={String(project?.id ?? "")}
            onValueChange={(v) => setSelectedProjectId(parseInt(v, 10))}
          >
            <SelectTrigger className="h-9 w-full sm:w-[240px] bg-background text-xs">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CmsFilterBar>
      ) : null}

      <CmsDataTable
        columns={columns}
        rows={clientApks}
        rowKey={(apk) => apk.id}
        isLoading={isApksLoading}
        error={apksError}
        onRetry={() => refetchApks()}
        viewStorageKey="client-apk"
        defaultViewMode="grid"
        empty={{
          icon: Smartphone,
          title: "No releases yet",
          description: projectId
            ? "App builds will appear here once they are ready for your review."
            : "No project found for your account. Please contact support.",
        }}
        renderGridCard={(apk) => {
          const index = clientApks.findIndex((a) => a.id === apk.id);
          const isLatest = index === 0;
          return (
            <div
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
                isLatest ? "border-primary ring-1 ring-primary/20 shadow-md" : "border-border/60",
              )}
            >
              {isLatest ? (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  LATEST
                </div>
              ) : null}
              <div className="border-b border-border/50 bg-muted/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2" title={resolveApkDisplayName(apk)}>
                      {resolveApkDisplayName(apk)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatApkReleaseSubtitle(apk)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">{apk.platform}</Badge>
                  <Badge variant="outline" className="capitalize text-muted-foreground text-[10px] px-1.5 py-0">
                    {apk.releaseType}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getApkAudienceBadgeClass(apk.audience))}>
                    {getApkAudienceLabel(apk.audience)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  Released on{" "}
                  {apk.createdAt
                    ? new Date(apk.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </div>
                {apk.changelog ? (
                  <div className="rounded-md border border-border bg-background p-2 text-[10px]">
                    <h4 className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Changelog
                    </h4>
                    <p className="whitespace-pre-wrap text-foreground/90">{apk.changelog}</p>
                  </div>
                ) : null}
                <Button className="mt-auto h-8 w-full text-xs" variant={isLatest ? "default" : "outline"} asChild>
                  <a href={apk.fileUrl} download>
                    <Download className="mr-2 h-3.5 w-3.5" /> Download APK
                  </a>
                </Button>
              </div>
            </div>
          );
        }}
        gridClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      />
    </PortalPageShell>
  );
}
