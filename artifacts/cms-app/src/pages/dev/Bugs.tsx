import React, { useState, useEffect } from "react";
import { useListBugs, useCreateBug, useUpdateBug, useListProjects, useListUsers, getListBugsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Bug as BugIcon, Search, Filter, Loader2, Edit, Trash2, CheckCircle2, Eye, MoreHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Bug } from "@workspace/api-client-react";

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
});

type BugFormValues = z.infer<typeof bugSchema>;

export default function DevBugs() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editBug, setEditBug] = useState<Bug | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewBug, setViewBug] = useState<Bug | null>(null);

  const { data, isLoading } = useListBugs({ 
    status: statusFilter !== "all" ? statusFilter as any : undefined, 
    limit: 50 
  });
  const { data: projectsData } = useListProjects({ limit: 50 });
  const { data: usersData } = useListUsers({ role: 'developer', limit: 100 });
  const createBugMutation = useCreateBug();
  const updateBugMutation = useUpdateBug();

  const form = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
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
      assigneeId: "",
    },
  });

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
        assigneeId: editBug.assigneeId?.toString() || "",
      });
    } else {
      form.reset({
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
        assigneeId: "",
      });
    }
  }, [editBug, form]);

  const onSubmit = async (values: BugFormValues) => {
    try {
      if (editBug) {
        await updateBugMutation.mutateAsync({
          id: editBug.id,
          data: {
            ...values,
            projectId: parseInt(values.projectId),
            assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null,
          } as any,
        });
        toast.success("Bug updated!");
        setEditBug(null);
      } else {
        await createBugMutation.mutateAsync({
          data: {
            ...values,
            projectId: parseInt(values.projectId),
            assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null,
          } as any,
        });
        toast.success("Bug reported!");
        setOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListBugsQueryKey({ status: statusFilter !== "all" ? statusFilter as any : undefined, limit: 50 }) });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Action failed. Please try again.";
      toast.error(msg);
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
      toast.error("Failed to close bug");
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
      toast.error("Failed to close bug");
    }
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bug Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Report and track project issues</p>
        </div>
        <Dialog open={open || !!editBug} onOpenChange={(val) => {
          if (!val) {
            setOpen(false);
            setEditBug(null);
          } else {
            setOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Report Bug
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-card border-border overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editBug ? "Edit Bug" : "Report a New Bug"}</DialogTitle>
              <DialogDescription>
                {editBug ? "Update the details of this bug." : "Provide as much detail as possible to help developers fix it."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select developer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {usersData?.users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

                <DialogFooter className="pt-4 pb-10">
                  <Button type="submit" disabled={createBugMutation.isPending || updateBugMutation.isPending}>
                    {(createBugMutation.isPending || updateBugMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editBug ? "Update Bug" : "Report Bug"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase font-semibold">Assignee</p>
                    <p className="font-medium">{viewBug.assigneeName || "Unassigned"}</p>
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

                <div className="pt-6 flex justify-end gap-3 border-t border-border">
                  {viewBug.status !== 'fixed' && viewBug.status !== 'verified' && (
                    <Button variant="outline" size="sm" onClick={() => handleQuickClose(viewBug)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Fixed
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => { setViewBug(null); setEditBug(viewBug); }}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-between gap-4">
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
        <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search bugs..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-xs">ID</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center">
                      <BugIcon className="h-8 w-8 mb-2 opacity-50" />
                      <p>No bugs found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBugs.map((bug) => (
                  <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50 text-xs group" onClick={() => setViewBug(bug)}>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{bug.bugNumber}</TableCell>
                    <TableCell className="font-medium text-xs">{bug.title}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{bug.projectName}</TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-[10px]", getSeverityColor(bug.severity))}>
                        {bug.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", getStatusColor(bug.status))}>
                        {bug.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center justify-between">
                        <span>{bug.assigneeName || <span className="text-muted-foreground italic">Unassigned</span>}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewBug(bug); }}>
                                <Eye className="mr-2 h-3 w-3" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditBug(bug); }}>
                                <Edit className="mr-2 h-3 w-3" /> Edit
                              </DropdownMenuItem>
                              {bug.status !== 'fixed' && bug.status !== 'verified' && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickClose(bug); }}>
                                  <CheckCircle2 className="mr-2 h-3 w-3 text-green-500" /> Close Bug
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteId(bug.id); }}>
                                <Trash2 className="mr-2 h-3 w-3" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
