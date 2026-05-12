import React from "react";
import { useListProjects, useGetApkReleases, getGetApkReleasesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, Download, Calendar, ArrowDownCircle } from "lucide-react";

export default function ClientApk() {
  const { data: projectsData, isLoading: isProjectsLoading } = useListProjects({ limit: 1 });
  const projectId = projectsData?.projects[0]?.id;

  const { data: apks, isLoading: isApksLoading } = useGetApkReleases(projectId || 0, {
    query: { queryKey: getGetApkReleasesQueryKey(projectId || 0), enabled: !!projectId }
  });

  if (isProjectsLoading || isApksLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  // Filter for client-visible APKs
  const clientApks = apks?.filter(apk => apk.audience === "client_visible") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Releases & Downloads</h1>
          <p className="text-muted-foreground">Access your app builds</p>
        </div>
      </div>

      {clientApks.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <Smartphone className="h-16 w-16 mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-medium mb-2">No releases yet</h3>
            <p className="text-muted-foreground">App builds will appear here once they are ready for your review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clientApks.map((apk, i) => (
            <Card key={apk.id} className={`bg-card relative overflow-hidden ${i === 0 ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border'}`}>
              {i === 0 && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  LATEST
                </div>
              )}
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">v{apk.version}</CardTitle>
                    <CardDescription>Build {apk.buildNumber}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">{apk.platform}</Badge>
                  <Badge variant="outline" className="capitalize text-muted-foreground">{apk.releaseType}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Released on {new Date(apk.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                {apk.changelog && (
                  <div className="bg-background border border-border rounded-md p-3 text-sm">
                    <h4 className="font-semibold mb-1 text-xs uppercase tracking-wider text-muted-foreground">Changelog</h4>
                    <p className="text-foreground/90 whitespace-pre-wrap">{apk.changelog}</p>
                  </div>
                )}
                
                <Button className="w-full mt-4" variant={i === 0 ? "default" : "outline"} asChild>
                  <a href={apk.fileUrl} download>
                    <Download className="mr-2 h-4 w-4" /> Download APK
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
