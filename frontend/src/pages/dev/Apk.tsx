import React, { useMemo, useState } from "react";
import {
  useListProjects,
  useGetApkReleases,
  useCreateApkRelease,
  getGetApkReleasesQueryKey,
  type ApkReleaseAudience,
} from "@/api";
import { useQueryClient } from "@tanstack/react-query";
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
import { PageCardGridSkeleton } from "@/components/loading";
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
import { ApkAudienceField } from "@/components/apk/apk-audience-field";
import {
  getApkAudienceBadgeClass,
  getApkAudienceLabel,
  resolveApkDisplayName,
  formatApkReleaseSubtitle,
  toApkReleaseInput,
} from "@/lib/apk-audience";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileUploader } from "@/components/ui/file-uploader";

function isStoredFileUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const apkReleaseSchema = z.object({
  name: z.string().min(1, "APK name is required"),
  version: z.string().min(1, "Version is required"),
  buildNumber: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  releaseType: z.enum(["alpha", "beta", "rc", "production"]),
  platform: z.enum(["android", "ios"]),
  audience: z.enum(["team_only", "client_visible", "all_visible"]),
  changelog: z.string().optional(),
  fileUrl: z
    .string()
    .min(1, "APK file is required")
    .refine(isStoredFileUrl, "Upload a valid APK/IPA file"),
  minOsVersion: z.string().optional(),
});

type ApkReleaseFormValues = z.infer<typeof apkReleaseSchema>;

const APK_FORM_DEFAULTS: ApkReleaseFormValues = {
  name: "",
  version: "",
  buildNumber: undefined,
  releaseType: "beta",
  platform: "android",
  audience: "team_only",
  changelog: "",
  fileUrl: "",
  minOsVersion: "",
};

export default function DevApk() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data: projectsData, isLoading: projectsLoading } = useListProjects({ limit: 50 });
  const { data: releasesData, isLoading: releasesLoading } = useGetApkReleases(
    selectedProjectId!,
    {
      query: {
        enabled: !!selectedProjectId,
        queryKey: getGetApkReleasesQueryKey(selectedProjectId!),
      },
    },
  );

  const createRelease = useCreateApkRelease();

  const form = useForm<ApkReleaseFormValues>({
    resolver: zodResolver(apkReleaseSchema),
    defaultValues: APK_FORM_DEFAULTS,
  });

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(APK_FORM_DEFAULTS);
  };

  const onSubmit = async (values: ApkReleaseFormValues) => {
    if (!selectedProjectId) return;
    try {
      const created = await createRelease.mutateAsync({
        id: selectedProjectId,
        data: toApkReleaseInput(values),
      });
      toast.success(
        created.audience === "all_visible"
          ? "Release uploaded — visible to everyone on the project."
          : created.audience === "client_visible"
            ? "Release uploaded — visible to clients and team."
            : "Release uploaded — team only.",
      );
      setOpen(false);
      form.reset(APK_FORM_DEFAULTS);
      await queryClient.invalidateQueries({
        queryKey: getGetApkReleasesQueryKey(selectedProjectId),
      });
    } catch (error: unknown) {
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

  const getAudienceColor = getApkAudienceBadgeClass;

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

        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-[640px] max-h-[min(92dvh,900px)] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle>Upload New Release</DialogTitle>
              <DialogDescription>
                Provide release details and the download link for the build.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>APK name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Satya Kabir Android App" {...field} />
                      </FormControl>
                      <FormDescription>
                        Display name shown to team and clients on release lists
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="releaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
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
                        <Select value={field.value} onValueChange={field.onChange}>
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
                      <ApkAudienceField
                        value={field.value as ApkReleaseAudience}
                        onChange={field.onChange}
                        disabled={createRelease.isPending}
                      />
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
                          onUploadComplete={(url, meta) => {
                            field.onChange(url);
                            if (url) {
                              void form.trigger("fileUrl");
                            }
                            if (meta?.fileName && !form.getValues("name")?.trim()) {
                              const suggested = meta.fileName
                                .replace(/\.(apk|ipa|aab|zip|app)$/i, "")
                                .replace(/[-_]+/g, " ")
                                .trim();
                              if (suggested) {
                                form.setValue("name", suggested, { shouldValidate: true });
                              }
                            }
                          }}
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
                <DialogFooter className="gap-2 border-t border-border/60 pt-4 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={createRelease.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRelease.isPending || !form.watch("fileUrl")}>
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
        <PageCardGridSkeleton count={3} itemClassName="h-48" />
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
                    {getApkAudienceLabel(release.audience).toUpperCase()}
                  </Badge>
                </div>
                <CardTitle
                  className="text-base font-semibold leading-snug sm:text-lg"
                  title={resolveApkDisplayName(release)}
                >
                  <span className="line-clamp-2">{resolveApkDisplayName(release)}</span>
                </CardTitle>
                <CardDescription className="space-y-1.5 text-xs">
                  <span className="block text-foreground/80">
                    {formatApkReleaseSubtitle(release)}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                      {release.platform}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(release.createdAt).toLocaleDateString()}
                    </span>
                  </span>
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
