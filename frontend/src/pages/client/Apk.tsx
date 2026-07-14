import React, { useState, useEffect } from "react";
import { useClientTeam } from "@/contexts/ClientTeamContext";
import { useListProjects, useGetApkReleases, getGetApkReleasesQueryKey } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyticsChartsSkeleton, PageCardGridSkeleton, PageHeroSkeleton } from "@/components/loading";
import { Smartphone, Download, Calendar } from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalEmptyState,
} from "@/components/layout/portal-page-kit";
import {
  getApkAudienceBadgeClass,
  getApkAudienceLabel,
  resolveApkDisplayName,
  formatApkReleaseSubtitle,
} from "@/lib/apk-audience";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const { data: apks, isLoading: isApksLoading } = useGetApkReleases(projectId ?? 0, {
    query: { 
      queryKey: getGetApkReleasesQueryKey(projectId ?? 0), 
      enabled: projectId != null 
    }
  });

  if (isProjectsLoading || isApksLoading) {
    return (
      <PortalPageShell>
        <PageHeroSkeleton withBreadcrumb={false} withActions={false} />
        <PageCardGridSkeleton count={3} itemClassName="h-64" />
      </PortalPageShell>
    );
  }

  const clientApks = apks ?? [];

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Releases & Downloads"
        subtitle="Access your app builds"
        actions={
          projects.length > 1 ? (
            <Select
              value={String(project.id)}
              onValueChange={(v) => setSelectedProjectId(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-[240px] bg-background/80">
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
          ) : undefined
        }
      />

      {clientApks.length === 0 ? (
        <PortalEmptyState
          icon={Smartphone}
          title="No releases yet"
          description={
            projectId
              ? "App builds will appear here once they are ready for your review."
              : "No project found for your account. Please contact support."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientApks.map((apk, i) => (
            <Card key={apk.id} className={`bg-card relative overflow-hidden ${i === 0 ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border'}`}>
              {i === 0 && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  LATEST
                </div>
              )}
              <CardHeader className="pb-2 border-b border-border/50 bg-muted/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-md">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-snug" title={resolveApkDisplayName(apk)}>
                      <span className="line-clamp-2">{resolveApkDisplayName(apk)}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-foreground/80">
                      {formatApkReleaseSubtitle(apk)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">{apk.platform}</Badge>
                  <Badge variant="outline" className="capitalize text-muted-foreground text-[10px] px-1.5 py-0">{apk.releaseType}</Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", getApkAudienceBadgeClass(apk.audience))}
                  >
                    {getApkAudienceLabel(apk.audience)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 p-4">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  Released on {apk.createdAt ? new Date(apk.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </div>
                
                {apk.changelog && (
                  <div className="bg-background border border-border rounded-md p-2 text-[10px]">
                    <h4 className="font-semibold mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Changelog</h4>
                    <p className="text-foreground/90 whitespace-pre-wrap">{apk.changelog}</p>
                  </div>
                )}
                
                <Button className="w-full mt-2 h-8 text-xs" variant={i === 0 ? "default" : "outline"} asChild>
                  <a href={apk.fileUrl} download>
                    <Download className="mr-2 h-3.5 w-3.5" /> Download APK
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
