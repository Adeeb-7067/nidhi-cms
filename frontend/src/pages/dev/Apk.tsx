import React, { useMemo, useState } from "react";
import { useListProjects, useGetApkReleases, useCreateApkRelease } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, Download, Loader2, Info, Briefcase, Package, Rocket } from "lucide-react";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevToolbar,
  DevEmptyState,
  devActionButtonClass,
} from "@/components/dev/dev-page-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileUploader } from "@/components/ui/file-uploader";

const apkReleaseSchema = z.object({
  version: z.string().min(1, "Version is required"),
  buildNumber: z.coerce.number().optional(),
  releaseType: z.enum(["alpha", "beta", "rc", "production"]),
  platform: z.enum(["android", "ios"]),
  audience: z.enum(["team_only", "client_visible"]),
  changelog: z.string().optional(),
  fileUrl: z.string().url("Must be a valid URL"),
  minOsVersion: z.string().optional(),
});

type ApkReleaseFormValues = z.infer<typeof apkReleaseSchema>;

export default function DevApk() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data: projectsData, isLoading: projectsLoading } = useListProjects({ limit: 50 });
  const { data: releasesData, isLoading: releasesLoading, refetch: refetchReleases } = useGetApkReleases(
    selectedProjectId!,
    {
      query: {
        enabled: !!selectedProjectId,
        queryKey: ["getApkReleases", selectedProjectId],
      }
    }
  );

  const createRelease = useCreateApkRelease();

  const form = useForm<ApkReleaseFormValues>({
    resolver: zodResolver(apkReleaseSchema),
    defaultValues: {
      version: "",
      buildNumber: undefined,
      releaseType: "beta",
      platform: "android",
      audience: "team_only",
      changelog: "",
      fileUrl: "",
      minOsVersion: "",
    },
  });

  const onSubmit = async (values: ApkReleaseFormValues) => {
    if (!selectedProjectId) return;
    try {
      await createRelease.mutateAsync({
        id: selectedProjectId,
        data: values,
      });
      toast.success("Release uploaded!");
      setOpen(false);
      form.reset();
      refetchReleases();
    } catch (error: any) {
      toastApiError(error, "Action failed. Please try again.");
    }
  };

  const getReleaseTypeColor = (type: string) => {
    switch (type) {
      case "alpha": return "bg-purple-500/10 text-purple-500 border-purple-500/50";
      case "beta": return "bg-amber-500/10 text-amber-500 border-amber-500/50";
      case "rc": return "bg-blue-500/10 text-blue-500 border-blue-500/50";
      case "production": return "bg-green-500/10 text-green-500 border-green-500/50";
      default: return "";
    }
  };

  const apkStats = useMemo(() => {
    const projects = projectsData?.projects ?? [];
    const releases = releasesData ?? [];
    const production = releases.filter((r) => r.releaseType === "production").length;
    const latest = releases.length
      ? [...releases].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]
      : null;
    return {
      projects: projects.length,
      releases: selectedProjectId ? releases.length : 0,
      production: selectedProjectId ? production : 0,
      latestVersion: latest ? `v${latest.version}` : "—",
    };
  }, [projectsData?.projects, releasesData, selectedProjectId]);

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case "team_only": return "bg-slate-500/10 text-slate-500 border-slate-500/50";
      case "client_visible": return "bg-primary/10 text-primary border-primary/50";
      default: return "";
    }
  };

  return (
    <DevPageShell>
      <DevPageHero
        title="APK Releases"
        subtitle="Upload and manage application builds"
        badge={
          selectedProjectId
            ? projectsData?.projects.find((p) => p.id === selectedProjectId)?.name
            : undefined
        }
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    className={devActionButtonClass()}
                    disabled={!selectedProjectId}
                    onClick={() => setOpen(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Upload Release
                  </Button>
                </span>
              </TooltipTrigger>
              {!selectedProjectId && (
                <TooltipContent>
                  <p>Select a project first to upload a release</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        }
      />

      <DevKpiGrid
        loading={projectsLoading}
        items={[
          { title: "Projects", value: apkStats.projects, hint: "Assigned to you", icon: Briefcase, accent: "blue" },
          {
            title: "Releases",
            value: apkStats.releases,
            hint: selectedProjectId ? "Selected project" : "Select a project",
            icon: Package,
            accent: "violet",
          },
          {
            title: "Production",
            value: apkStats.production,
            hint: "Live builds",
            icon: Rocket,
            accent: "green",
          },
          {
            title: "Latest build",
            value: apkStats.latestVersion,
            hint: "Most recent upload",
            icon: Smartphone,
            accent: "amber",
          },
        ]}
      />

      <DevToolbar>
        <div className="w-full sm:max-w-md space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Select a project to view its releases
          </label>
          <Select
            value={selectedProjectId?.toString()}
            onValueChange={(v) => setSelectedProjectId(parseInt(v))}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projectsData?.projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()} className="text-xs">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DevToolbar>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Upload New Release</DialogTitle>
              <DialogDescription>
                Provide release details and the download link for the build.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="version"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1.0.4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buildNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Build Number</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 42" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="releaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="alpha">Alpha</SelectItem>
                            <SelectItem value="beta">Beta</SelectItem>
                            <SelectItem value="rc">RC</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="audience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audience</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select audience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="team_only">Team Only</SelectItem>
                            <SelectItem value="client_visible">Client Visible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="fileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Binary Attachment (APK/IPA)</FormLabel>
                      <FormControl>
                        <FileUploader
                          category="apk"
                          onUploadComplete={field.onChange}
                          value={field.value}
                          accept=".apk,.ipa,.zip,.aar,.app"
                          label="Drag & drop build or click to select"
                        />
                      </FormControl>
                      <FormDescription>Select the build artifact to upload directly to system storage</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minOsVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min OS Version (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Android 8.0 / iOS 14.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="changelog"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Changelog</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what's new in this release..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createRelease.isPending}>
                    {createRelease.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload Release
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {!selectedProjectId ? (
        <DevEmptyState
          icon={Smartphone}
          title="Select a project"
          description="Choose a project above to view its APK releases or upload a new build."
        />
      ) : releasesLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : !releasesData || releasesData.length === 0 ? (
        <DevEmptyState
          icon={Info}
          title="No releases found"
          description='There are no releases for this project yet. Use "Upload Release" to add one.'
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {releasesData.map((release) => (
            <Card key={release.id} className="bg-card hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={cn("text-[10px]", getReleaseTypeColor(release.releaseType))}>
                    {release.releaseType.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", getAudienceColor(release.audience))}>
                    {release.audience.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  v{release.version}
                  {release.buildNumber && <span className="text-xs font-normal text-muted-foreground">({release.buildNumber})</span>}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0"> {release.platform}</Badge>
                  <span>•</span>
                  <span>{new Date(release.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {release.changelog && (
                  <div className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded">
                    {release.changelog}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[10px] text-muted-foreground">
                    By {release.uploaderName}
                  </div>
                  <Button size="sm" className="h-8 text-xs" asChild>
                    <a href={release.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DevPageShell>
  );
}
