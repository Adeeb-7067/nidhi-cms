import React from "react";
import { useListProjects, useGetApkReleases, getGetApkReleasesQueryKey } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, Download, Calendar } from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalEmptyState,
} from "@/components/layout/portal-page-kit";

export default function ClientApk() {
  const { data: projectsData, isLoading: isProjectsLoading } = useListProjects({ limit: 1 });
  const projectId = projectsData?.projects[0]?.id;

  const { data: apks, isLoading: isApksLoading } = useGetApkReleases(projectId!, {
    query: { 
      queryKey: getGetApkReleasesQueryKey(projectId!), 
      enabled: !!projectId 
    }
  });

  if (isProjectsLoading || isApksLoading) {
    return (
      <PortalPageShell>
        <PortalPageHero title="Releases & Downloads" subtitle="Access your app builds" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </PortalPageShell>
    );
  }

  // Filter for client-visible APKs
  const clientApks = apks?.filter(apk => apk.audience === "client_visible") || [];

  return (
    <PortalPageShell>
      <PortalPageHero
        title="Releases & Downloads"
        subtitle="Access your app builds"
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
                    <CardTitle className="text-lg">v{apk.version}</CardTitle>
                    <CardDescription className="text-xs">
                      Build {apk.buildNumber}
                      {apk.platform && <span className="ml-2">• {apk.platform.toUpperCase()}</span>}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">{apk.platform}</Badge>
                  <Badge variant="outline" className="capitalize text-muted-foreground text-[10px] px-1.5 py-0">{apk.releaseType}</Badge>
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
