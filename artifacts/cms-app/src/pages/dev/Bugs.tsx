import React, { useState, useEffect, useMemo } from "react";
import {
  useListBugs,
  useCreateBug,
  useUpdateBug,
  useAssignBug,
  useListProjects,
  useListAssignableMembers,
  getListBugsQueryKey,
  getListAssignableMembersQueryKey,
  Bug,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdvancedTable } from "@/components/ui/advanced-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Bug as BugIcon, Filter, Loader2, Edit, CheckCircle2, Eye, FileText, DownloadCloud, AlertTriangle, Activity } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { PDFService } from "@/lib/pdf-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileUploader } from "@/components/ui/file-uploader";
import { useAuth } from "@/contexts/AuthContext";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const bugSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  priority: z.enum(["p1", "p2", "p3", "p4"]),
  status: z.enum(["open", "in_progress", "fixed", "verified", "wont_fix", "duplicate"]).optional(),
  platform: z.enum(["android", "ios", "web", "api", "all"]),
  description: z.string().optional(),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  buildVersion: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

type BugFormValues = z.infer<typeof bugSchema>;

export default function DevBugs() {
  const { user } = useAuth();
  const canCreateBug =
    user?.role === "developer" || user?.role === "tester" || user?.role === "super_admin";
  const canAssignBugs = user?.role === "tester" || user?.role === "super_admin";
  const canEditBugReport = canAssignBugs;
  const canUpdateStatus = canCreateBug;
  const isAdmin = user?.role === "super_admin";

  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewBug, setViewBug] = useState<Bug | null>(null);
  const [scope, setScope] = useState<"all" | "mine" | "unassigned">(
    isAdmin ? "all" : user?.role === "tester" ? "all" : "mine",
  );

  const defaultFormValues: BugFormValues = {
    projectId: "",
    title: "",
    severity: "medium",
    priority: "p3",
    status: "open",
    platform: "all",
    description: "",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
    buildVersion: "",
    assigneeId: "none",
    attachmentUrl: "",
  };

  const openCreateDialog = () => {
    setEditBug(null);
    form.reset(defaultFormValues);
    setCreateOpen(true);
  };

  const closeBugDialog = () => {
    setCreateOpen(false);
    setEditBug(null);
  };

  const { data, isLoading } = useListBugs({
    status: statusFilter !== "all" ? (statusFilter as Bug["status"]) : undefined,
    limit: 50,
    ...(scope !== "all" ? { scope } : {}),
  });
  const { data: projectsData } = useListProjects({ limit: 50 });
  const createBugMutation = useCreateBug();
  const updateBugMutation = useUpdateBug();
  const assignBugMutation = useAssignBug();

  const form = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
    defaultValues: defaultFormValues,
  });

  const watchedProjectId = form.watch("projectId");
  const assignProjectId = editBug?.projectId ?? (watchedProjectId ? Number.parseInt(watchedProjectId, 10) : 0);
  const { data: assignableData } = useListAssignableMembers(
    assignProjectId,
    { for: "bug" },
    {
      query: {
        enabled: assignProjectId > 0,
        queryKey: getListAssignableMembersQueryKey(assignProjectId, { for: "bug" }),
      },
    },
  );
  const assignableDevs = assignableData?.members ?? [];

  const { data: viewAssignableData } = useListAssignableMembers(
    viewBug?.projectId ?? 0,
    { for: "bug" },
    {
      query: {
        enabled: !!viewBug?.projectId,
        queryKey: getListAssignableMembersQueryKey(viewBug?.projectId ?? 0, { for: "bug" }),
      },
    },
  );
  const viewAssignableDevs = viewAssignableData?.members ?? assignableDevs;

  useEffect(() => {
    if (editBug) {
      form.reset({
        projectId: editBug.projectId.toString(),
        title: editBug.title,
        severity: editBug.severity as any,
        priority: editBug.priority as any,
        status: editBug.status as any,
        platform: editBug.platform as any,
        description: editBug.description || "",
        stepsToReproduce: editBug.stepsToReproduce || "",
        expectedBehavior: editBug.expectedBehavior || "",
        actualBehavior: editBug.actualBehavior || "",
        buildVersion: editBug.buildVersion || "",
        assigneeId: editBug.assigneeId?.toString() || "none",
        attachmentUrl: (editBug as any).attachmentUrl || "",
      });
    }
  }, [editBug, form]);

  const onSubmit = async (values: BugFormValues) => {
    try {
      const assigneeId =
        values.assigneeId && values.assigneeId !== "none"
          ? parseInt(values.assigneeId, 10)
          : null;

      if (editBug) {
        if (canEditBugReport) {
          await updateBugMutation.mutateAsync({
            id: editBug.id,
            data: {
              ...values,
              projectId: parseInt(values.projectId, 10),
              assigneeId,
            } as any,
          });
          toast.success("Bug updated!");
        } else {
          await updateBugMutation.mutateAsync({
            id: editBug.id,
            data: { status: values.status, assigneeId } as any,
          });
          toast.success("Status updated!");
        }
      } else {
        await createBugMutation.mutateAsync({
          data: {
            ...values,
            projectId: parseInt(values.projectId, 10),
            assigneeId: canAssignBugs ? assigneeId : null,
          } as any,
        });
        toast.success("Bug reported!");
      }
      closeBugDialog();
      form.reset(defaultFormValues);
      queryClient.invalidateQueries({
        queryKey: getListBugsQueryKey({
          status: statusFilter !== "all" ? (statusFilter as Bug["status"]) : undefined,
          limit: 50,
        }),
      });
    } catch (error: any) {
      toastApiError(error, "Action failed. Please try again.");
    }
  };

  const handleQuickClose = async (bug: Bug) => {
    try {
      await updateBugMutation.mutateAsync({
        id: bug.id,
        data: { status: 'fixed' } as any
      });
      toast.success("Bug marked as fixed");
      queryClient.invalidateQueries({ queryKey: getListBugsQueryKey({ status: statusFilter !== "all" ? statusFilter as any : undefined, limit: 50 }) });
    } catch (error: any) {
      toastApiError(error, "Failed to close bug");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await updateBugMutation.mutateAsync({ id: deleteId, data: { status: "closed" as any } });
      toast.success("Bug closed");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: getListBugsQueryKey() });
    } catch (error: any) {
      toastApiError(error, "Failed to close bug");
    }
  };

  const handleExportPDF = () => {
    if (filteredBugs.length === 0) {
      toast.error("No bugs available in the current filter to export.");
      return;
    }
    const activeProjectName = filteredBugs[0]?.projectName || "General Projects";
    PDFService.generateBugReportPDF(activeProjectName, "Direct Enterprise Client", filteredBugs);
    toast.success("Exporting QA Audit Report...");
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'text-red-500 border-red-500/50 bg-red-500/10';
      case 'in_progress': return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
      case 'fixed': return 'text-purple-500 border-purple-500/50 bg-purple-500/10';
      case 'verified': return 'text-green-500 border-green-500/50 bg-green-500/10';
      case 'wont_fix': case 'duplicate': return 'text-gray-500 border-gray-500/50 bg-gray-500/10';
      default: return '';
    }
  };

  const filteredBugs = data?.bugs.filter(bug => 
    bug.title.toLowerCase().includes(search.toLowerCase()) || 
    bug.bugNumber.toLowerCase().includes(search.toLowerCase()) ||
    bug.projectName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const bugStats = useMemo(() => {
    const bugs = data?.bugs ?? [];
    return {
      total: data?.total ?? bugs.length,
      open: bugs.filter((b) => b.status === "open").length,
      inProgress: bugs.filter((b) => b.status === "in_progress").length,
      critical: bugs.filter((b) => b.severity === "critical" || b.severity === "high").length,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bug Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Report, track, and resolve project issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF} className="h-9 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Export Audit (PDF)
          </Button>
          {canCreateBug && (
            <Button
              type="button"
              className="bg-primary text-primary-foreground h-9 text-xs"
              onClick={openCreateDialog}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Report Bug
            </Button>
          )}
          <Dialog
            open={createOpen || !!editBug}
            onOpenChange={(val) => {
              if (!val) closeBugDialog();
            }}
          >
          <DialogContent className="sm:max-w-[700px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>
                {editBug
                  ? canEditBugReport
                    ? "Edit Bug"
                    : "Update Bug Status"
                  : "Report a New Bug"}
              </DialogTitle>
              <DialogDescription>
                {editBug
                  ? canEditBugReport
                    ? "Update the details of this bug."
                    : "Change status or assignee for this issue."
                  : "Provide as much detail as possible to help the team fix it."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                {(!editBug || canEditBugReport) && (
                <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectsData?.projects.map((project) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bug Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Short descriptive title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="p1">P1 (Immediate)</SelectItem>
                            <SelectItem value="p2">P2 (High)</SelectItem>
                            <SelectItem value="p3">P3 (Normal)</SelectItem>
                            <SelectItem value="p4">P4 (Low)</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="android">Android</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buildVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Build Version (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1.0.4 (42)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {canAssignBugs && (
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to developer</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select developer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {assignableDevs.map((dev) => (
                              <SelectItem key={dev.id} value={dev.id.toString()}>
                                {dev.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                </div>

                </>
                )}

                {editBug && (
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="wont_fix">Won't Fix</SelectItem>
                            <SelectItem value="duplicate">Duplicate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(!editBug || canEditBugReport) && (
                <>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Overall description of the issue..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stepsToReproduce"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Steps to Reproduce (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="1. Open app\n2. Click..." className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="expectedBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Behavior (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What should happen?" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="actualBehavior"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Behavior (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What actually happens?" className="min-h-[60px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visual Evidence / Screenshot (Optional)</FormLabel>
                      <FormControl>
                        <FileUploader
                          category="bugs"
                          onUploadComplete={field.onChange}
                          value={field.value}
                          accept="image/*,.pdf,.zip"
                          label="Drag and drop issue screenshot or asset"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </>
                )}

                <DialogFooter className="pt-4 pb-10">
                  <Button
                    type="submit"
                    disabled={createBugMutation.isPending || updateBugMutation.isPending}
                  >
                    {(createBugMutation.isPending || updateBugMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editBug
                      ? canEditBugReport
                        ? "Update Bug"
                        : "Save Status"
                      : "Report Bug"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this bug report.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!viewBug} onOpenChange={(val) => !val && setViewBug(null)}>
          <SheetContent className="sm:max-w-[540px] bg-card border-border overflow-y-auto">
            {viewBug && (
              <div className="space-y-6">
                <SheetHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getSeverityColor(viewBug.severity)}>{viewBug.severity.toUpperCase()}</Badge>
                    <Badge variant="outline">{viewBug.status.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{viewBug.bugNumber}</span>
                  </div>
                  <SheetTitle className="text-xl">{viewBug.title}</SheetTitle>
                  <SheetDescription>
                    Project: {viewBug.projectName} | Platform: {viewBug.platform.toUpperCase()}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Priority</p>
                    <p className="font-medium capitalize">{viewBug.priority}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Assignee</p>
                    {canAssignBugs ? (
                      <Select
                        value={viewBug.assigneeId?.toString() ?? "none"}
                        onValueChange={async (value) => {
                          try {
                            const result = await assignBugMutation.mutateAsync({
                              id: viewBug.id,
                              data: {
                                assigneeId:
                                  value === "none" ? null : Number.parseInt(value, 10),
                              },
                            });
                            setViewBug(result);
                            toast.success(
                              value === "none" ? "Bug unassigned" : "Developer assigned",
                            );
                            queryClient.invalidateQueries({ queryKey: getListBugsQueryKey() });
                          } catch (err) {
                            toastApiError(err, "Failed to assign bug");
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue placeholder="Assign developer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {viewAssignableDevs.map((dev) => (
                            <SelectItem key={dev.id} value={dev.id.toString()}>
                              {dev.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{viewBug.assigneeName || "Unassigned"}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Reporter</p>
                    <p className="font-medium">{viewBug.reporterName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Build</p>
                    <p className="font-medium">{viewBug.buildVersion || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" /> Description
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
                      {viewBug.description || "No description provided."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Steps to Reproduce</h4>
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
                      {viewBug.stepsToReproduce || "No steps provided."}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Expected</h4>
                      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
                        {viewBug.expectedBehavior || "N/A"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Actual</h4>
                      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md min-h-[60px] whitespace-pre-wrap">
                        {viewBug.actualBehavior || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {(viewBug as any).attachmentUrl && (
                  <div className="space-y-2 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <DownloadCloud className="h-4 w-4 text-green-500" /> Visual Attachment
                    </h4>
                    <div className="border rounded-md overflow-hidden bg-muted/20">
                      {(viewBug as any).attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                        <a href={(viewBug as any).attachmentUrl} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
                          <img 
                            src={(viewBug as any).attachmentUrl} 
                            alt="Bug Evidence" 
                            className="w-full h-auto max-h-[240px] object-contain bg-zinc-900 mx-auto"
                          />
                        </a>
                      ) : (
                        <div className="p-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Document Attached</span>
                          <Button size="sm" variant="outline" asChild>
                            <a href={(viewBug as any).attachmentUrl} target="_blank" rel="noreferrer">Download File</a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 flex justify-end gap-3 border-t border-border">
                  {viewBug.status !== 'fixed' && viewBug.status !== 'verified' && (
                    <Button variant="outline" size="sm" onClick={() => handleQuickClose(viewBug)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Fixed
                    </Button>
                  )}
                  {canUpdateStatus && (
                    <Button variant="secondary" size="sm" onClick={() => { setViewBug(null); setEditBug(viewBug); }}>
                      <Edit className="mr-2 h-4 w-4" /> {canEditBugReport ? "Edit" : "Update Status"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
      </Sheet>

      {isLoading && !data ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard title="Total bugs" value={bugStats.total} hint="In current view" icon={BugIcon} accent="violet" delay={0} />
          <StatCard title="Open" value={bugStats.open} hint="Unresolved issues" icon={AlertTriangle} accent="red" alert={bugStats.open > 0} delay={1} />
          <StatCard title="In progress" value={bugStats.inProgress} hint="Being worked on" icon={Activity} accent="blue" delay={2} />
          <StatCard title="Critical / high" value={bugStats.critical} hint="Severity focus" icon={Filter} accent="amber" alert={bugStats.critical > 0} delay={3} />
        </PageKpiRow>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {(isAdmin || user?.role === "tester") && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <TabsList className="bg-muted/50 p-1 h-8">
              <TabsTrigger value="all" className="rounded-md text-xs h-7 px-3">All bugs</TabsTrigger>
              <TabsTrigger value="mine" className="rounded-md text-xs h-7 px-3">My queue</TabsTrigger>
              <TabsTrigger value="unassigned" className="rounded-md text-xs h-7 px-3">Unassigned</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
            <TabsTrigger value="open" className="rounded-md">Open</TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-md">In Progress</TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-md">Fixed</TabsTrigger>
            <TabsTrigger value="verified" className="rounded-md">Verified</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <AdvancedTable<Bug> 
              data={filteredBugs} 
              columns={[
                {
                  id: "bugNumber",
                  header: "ID",
                  accessorKey: "bugNumber",
                  cell: (bug: Bug) => <span className="font-mono text-[10px] text-muted-foreground">{bug.bugNumber}</span>
                },
                {
                  id: "title",
                  header: "Issue",
                  accessorKey: "title",
                  cell: (bug: Bug) => (
                    <div className="flex flex-col min-w-[140px] max-w-md">
                      <span className="font-medium text-[11px] whitespace-normal">{bug.title}</span>
                      <span className="text-[9px] text-muted-foreground">{bug.projectName}</span>
                    </div>
                  )
                },
                {
                  id: "description",
                  header: "Description",
                  detailOnly: true,
                  detailCell: (bug: Bug) => (
                    <p className="whitespace-pre-wrap text-sm">{bug.description?.trim() || "—"}</p>
                  ),
                },
                {
                  id: "steps",
                  header: "Steps to reproduce",
                  detailOnly: true,
                  detailCell: (bug: Bug) => (
                    <p className="whitespace-pre-wrap text-sm">{bug.stepsToReproduce?.trim() || "—"}</p>
                  ),
                },
                {
                  id: "expected",
                  header: "Expected behavior",
                  detailOnly: true,
                  detailCell: (bug: Bug) => (
                    <p className="whitespace-pre-wrap text-sm">{bug.expectedBehavior?.trim() || "—"}</p>
                  ),
                },
                {
                  id: "actual",
                  header: "Actual behavior",
                  detailOnly: true,
                  detailCell: (bug: Bug) => (
                    <p className="whitespace-pre-wrap text-sm">{bug.actualBehavior?.trim() || "—"}</p>
                  ),
                },
                {
                  id: "reporter",
                  header: "Reporter",
                  detailOnly: true,
                  detailCell: (bug: Bug) => bug.reporterName || "—",
                },
                {
                  id: "priority",
                  header: "Priority",
                  detailOnly: true,
                  detailCell: (bug: Bug) => bug.priority?.toUpperCase() || "—",
                },
                {
                  id: "buildVersion",
                  header: "Build version",
                  detailOnly: true,
                  detailCell: (bug: Bug) => bug.buildVersion || "—",
                },
                {
                  id: "createdAt",
                  header: "Reported",
                  detailOnly: true,
                  detailCell: (bug: Bug) => new Date(bug.createdAt).toLocaleString(),
                },
                {
                  id: "resolvedAt",
                  header: "Resolved",
                  detailOnly: true,
                  detailCell: (bug: Bug) =>
                    bug.resolvedAt ? new Date(bug.resolvedAt).toLocaleString() : "—",
                },
                {
                  id: "severity",
                  header: "Severity",
                  accessorKey: "severity",
                  cell: (bug: Bug) => (
                    <Badge className={cn("border-0 text-[9px] px-1.5 h-4", getSeverityColor(bug.severity))}>
                      {bug.severity.toUpperCase()}
                    </Badge>
                  )
                },
                {
                  id: "status",
                  header: "Status",
                  accessorKey: "status",
                  cell: (bug: Bug) => (
                    <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4", getStatusColor(bug.status))}>
                      {bug.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )
                },
                {
                  id: "assigneeName",
                  header: "Assignee",
                  accessorKey: "assigneeName",
                  cell: (bug: Bug) => <span className="text-[10px]">{bug.assigneeName || "—"}</span>
                },
                {
                  id: "platform",
                  header: "Platform",
                  accessorKey: "platform",
                  cell: (bug: Bug) => <Badge variant="secondary" className="text-[9px] px-1.5 h-4 uppercase">{bug.platform}</Badge>
                },
                {
                  id: "actions",
                  header: "",
                  hideInDetail: true,
                  cell: (bug: Bug) => (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setViewBug(bug); }}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      {canUpdateStatus && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditBug(bug); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )
                }
              ]} 
              searchKey="title" 
              searchPlaceholder="Search issues..." 
              filename="BugReport"
              viewStorageKey="bugs"
              onRowClick={(bug: Bug) => setViewBug(bug)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
