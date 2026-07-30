import React, { useState, useEffect, useMemo } from "react";
import {
  useListProjects,
  useListClients,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  getListClientsQueryKey,
  ListProjectsType,
  ListProjectsPriority,
} from "@/api";
import { QUERY_STALE } from "@/lib/query-config";
import {
  EMPTY_DIGITAL_SERVICES,
  EMPTY_SOCIAL_LINKS,
  normalizeDigitalServicesForm,
  normalizeSocialLinksForm,
  projectStackFieldLabel,
  projectStackOptions,
} from "@/lib/project-type-fields";
import { DigitalProjectServiceFields } from "@/components/project/DigitalProjectServiceFields";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTablePagination } from "@/lib/table-pagination";
import { AdvancedTable, Column } from "@/components/ui/advanced-table";
import {
  Plus,
  Briefcase,
  Mail,
  Building2,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  PortalPageShell,
  PortalPageHero,
  PortalKpiGrid,
  portalActionButtonClass,
} from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsFilterBar, CmsRowActions } from "@/components/cms";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUploader } from "@/components/ui/file-uploader";
import { ProjectDescriptionResourcesField } from "@/components/project/ProjectDescriptionResourcesField";
import {
  syncProjectDescriptionResources,
  type DescriptionResourceAttachment,
} from "@/lib/inventory-api";
import { Link } from "wouter";
import { PageTableSkeleton } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { listQueryOptions } from "@/lib/list-query-options";
import { useQueryClient } from "@tanstack/react-query";
import { Project } from "@/api";
import { cn } from "@/lib/utils";

type ProjectTeamPreview = {
  userId: number;
  name: string;
  subType?: string | null;
  avatarUrl?: string | null;
};
type ProjectListItem = Project & {
  companyContactPerson?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  teamMembers?: ProjectTeamPreview[];
};

const projectSchema = z
  .object({
    name: z.string().min(1, "Project name is required"),
    logoUrl: z.string().optional(),
    clientId: z.string().min(1, "Company is required"),
    priority: z.enum(["low", "medium", "high", "critical"]),
    type: z.enum(["development", "maintenance", "digital"]),
    status: z
      .enum([
        "scoping",
        "in_progress",
        "on_hold",
        "uat",
        "completed",
        "maintenance",
      ])
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    deadline: z.string().min(1, "Deadline is required"),
    description: z.string().optional(),
    techStack: z.array(z.string()).optional(),
    digitalServices: z
      .object({
        seo: z.boolean(),
        metaAds: z.boolean(),
        googleAds: z.boolean(),
      })
      .optional(),
    socialLinks: z
      .object({
        facebook: z.string().optional(),
        instagram: z.string().optional(),
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
        youtube: z.string().optional(),
        tiktok: z.string().optional(),
        pinterest: z.string().optional(),
        whatsapp: z.string().optional(),
        google_my_business: z.string().optional(),
        other: z.string().optional(),
      })
      .optional(),
    figmaUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    repoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    adminUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    postmanJson: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      !data.deadline ||
      !data.startDate ||
      new Date(data.deadline) >= new Date(data.startDate),
    {
      message: "Deadline must be after start date",
      path: ["deadline"],
    },
  );

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function AdminProjects() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [descriptionResources, setDescriptionResources] = useState<DescriptionResourceAttachment[]>([]);
  const [descriptionResourceBaseline, setDescriptionResourceBaseline] = useState<Map<string, number>>(
    () => new Map(),
  );
  const { page, setPage, resetPage, limit, apiLimit, setLimit } = useTablePagination();
  const [activeTab, setActiveTab] = useState<ListProjectsType>(
    ListProjectsType.development,
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<ListProjectsPriority | "">("");

  useEffect(() => {
    setStatusFilter("");
    resetPage();
  }, [activeTab, resetPage]);

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, priorityFilter, resetPage]);

  const { data, isLoading } = useListProjects({
    ...(search ? { search } : {}),
    type: activeTab,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter as ListProjectsPriority } : {}),
    page,
    limit: apiLimit,
  });
  const clientsPickerParams = { limit: 100 };
  const { data: clientsData } = useListClients(clientsPickerParams, {
    query: {
      queryKey: getListClientsQueryKey(clientsPickerParams),
      staleTime: QUERY_STALE.reference,
      enabled: isDialogOpen,
    },
  });
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      clientId: "",
      priority: "medium",
      type: activeTab,
      status: "scoping",
      startDate: new Date().toISOString().split("T")[0],
      deadline: "",
      description: "",
      techStack: [],
      digitalServices: { ...EMPTY_DIGITAL_SERVICES },
      socialLinks: { ...EMPTY_SOCIAL_LINKS },
      figmaUrl: "",
      repoUrl: "",
      adminUrl: "",
      websiteUrl: "",
      postmanJson: "",
    },
  });

  useEffect(() => {
    if (editProject) {
      form.reset({
        name: editProject.name,
        logoUrl: editProject.logoUrl || "",
        clientId: editProject.clientId.toString(),
        priority: editProject.priority as any,
        type: editProject.type as any,
        status: editProject.status as any,
        startDate: editProject.startDate.split("T")[0],
        deadline: editProject.deadline.split("T")[0],
        description: editProject.description || "",
        techStack: editProject.techStack || [],
        digitalServices: normalizeDigitalServicesForm(editProject.digitalServices),
        socialLinks: normalizeSocialLinksForm(editProject.socialLinks),
        figmaUrl: editProject.figmaUrl || "",
        repoUrl: editProject.repoUrl || "",
        adminUrl: editProject.adminUrl || "",
        websiteUrl: editProject.websiteUrl || "",
        postmanJson: editProject.postmanJson || "",
      });
    } else {
      form.reset({
        name: "",
        logoUrl: "",
        clientId: "",
        priority: "medium",
        type: activeTab,
        status: "scoping",
        startDate: new Date().toISOString().split("T")[0],
        deadline: "",
        description: "",
        techStack: [],
        digitalServices: { ...EMPTY_DIGITAL_SERVICES },
        socialLinks: { ...EMPTY_SOCIAL_LINKS },
        figmaUrl: "",
        repoUrl: "",
        adminUrl: "",
        websiteUrl: "",
        postmanJson: "",
      });
    }
  }, [editProject, form]);

  useEffect(() => {
    if (!isDialogOpen) {
      setDescriptionResources([]);
      setDescriptionResourceBaseline(new Map());
    }
  }, [isDialogOpen]);

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      if (editProject) {
        const { clientId: _company, ...updatePayload } = values;
        await updateProjectMutation.mutateAsync({
          id: editProject.id,
          data: {
            ...updatePayload,
            techStack: values.techStack || [],
            ...(values.type === "digital"
              ? {
                  digitalServices: values.digitalServices || EMPTY_DIGITAL_SERVICES,
                  socialLinks: values.socialLinks || EMPTY_SOCIAL_LINKS,
                }
              : {}),
          },
        });
        if (descriptionResources.length || descriptionResourceBaseline.size) {
          await syncProjectDescriptionResources(
            editProject.id,
            descriptionResources,
            descriptionResourceBaseline,
          );
        }
        toast.success("Project updated");
        setEditProject(null);
      } else {
        const created = await createProjectMutation.mutateAsync({
          data: {
            ...values,
            clientId: parseInt(values.clientId),
            companyId: parseInt(values.clientId),
            techStack: values.techStack || [],
            ...(values.type === "digital"
              ? {
                  digitalServices: values.digitalServices || EMPTY_DIGITAL_SERVICES,
                  socialLinks: values.socialLinks || EMPTY_SOCIAL_LINKS,
                }
              : {}),
          },
        });
        if (descriptionResources.length && created?.id) {
          await syncProjectDescriptionResources(created.id, descriptionResources, new Map());
        }
        toast.success(
          values.type === "digital"
            ? "Digital project created — it will appear under Digital → Projects"
            : "Project created",
        );
        setIsDialogOpen(false);
      }
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } catch (error: unknown) {
      toastApiError(error, "Failed to save project");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProjectMutation.mutateAsync({ id: deleteId });
      toast.success("Project deleted");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
    } catch (error: unknown) {
      toastApiError(error, "Failed to delete project");
    }
  };

  const list = (data?.projects ?? []) as ProjectListItem[];

  const projectStats = useMemo(() => {
    const now = Date.now();
    let overdue = 0;
    let highPriority = 0;
    let totalCompletion = 0;
    for (const p of list) {
      totalCompletion += p.completionPct ?? 0;
      if (p.priority === "high" || p.priority === "critical") highPriority++;
      if (p.status !== "completed" && new Date(p.deadline).getTime() < now) overdue++;
    }
    return {
      total: data?.total ?? list.length,
      avgCompletion: list.length ? Math.round(totalCompletion / list.length) : 0,
      overdue,
      highPriority,
    };
  }, [list, data?.total]);

  const columns: Column<ProjectListItem>[] = [
    {
      id: "name",
      header: "Project Name",
      accessorKey: "name",
      cell: (project) => (
        <div className="flex flex-col gap-1 min-w-[140px]">
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar className="h-7 w-7 shrink-0 rounded-md border border-border/60">
              {project.logoUrl ? (
                <AvatarImage src={project.logoUrl} alt={project.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
                {project.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <Link
              href={
                project.type === "digital"
                  ? `/marketing/projects/${project.id}`
                  : `/admin/projects/${project.id}`
              }
              className="font-semibold hover:underline text-xs"
            >
              {project.name}
            </Link>
            {(project.priority === "high" || project.priority === "critical") && (
              <Badge
                variant="outline"
                className={
                  project.priority === "critical"
                    ? "text-[9px] h-4 border-red-500/50 bg-red-500/10 text-red-600"
                    : "text-[9px] h-4 border-orange-500/50 bg-orange-500/10 text-orange-600"
                }
              >
                {project.priority === "critical" ? "CRITICAL" : "HIGH"}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{project.companyName ?? project.clientName}</span>
        </div>
      ),
    },
    {
      id: "client",
      header: "Client / Company",
      cell: (project) => (
        <div className="text-xs min-w-[160px] space-y-0.5">
          <p className="font-medium flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            {project.companyName ?? project.clientName}
          </p>
          {project.companyContactPerson && (
            <p className="text-[10px] text-muted-foreground">{project.companyContactPerson}</p>
          )}
          {project.companyEmail && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
              <Mail className="h-2.5 w-2.5 shrink-0" />
              {project.companyEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "team",
      header: "Team",
      cell: (project) => {
        const team = project.teamMembers ?? [];
        if (!team.length) {
          return <span className="text-[10px] text-muted-foreground">No members</span>;
        }
        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <div className="flex -space-x-1.5">
              {team.slice(0, 4).map((m) => (
                <Avatar key={m.userId} className="h-6 w-6 border-2 border-background">
                  {m.avatarUrl ? (
                    <AvatarImage src={m.avatarUrl} alt={m.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-[9px] bg-primary/15 text-primary">
                    {m.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {/* <p className="text-[10px] text-muted-foreground line-clamp-2">{team.map((m) => m.name).join(", ")}</p> */}
          </div>
        );
      },
    },
    {
      id: "completion",
      header: "Progress",
      cell: (project) => (
        <div className="min-w-[100px] space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Done</span>
            <span className="font-semibold">{project.completionPct}%</span>
          </div>
          <Progress value={project.completionPct} className="h-1.5" />
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (project) => (
        <Badge variant="secondary" className={`${getStatusColor(project.status || 'scoping')} text-[10px]`}>
          {project.status?.replace("_", " ").toUpperCase() || "SCOPING"}
        </Badge>
      )
    },
    {
      id: "priority",
      header: "Priority",
      accessorKey: "priority",
      cell: (project) => (
        <div className="flex items-center text-[10px] font-medium">
          <span className={`h-2 w-2 rounded-full mr-1.5 bg-current ${getPriorityColor(project.priority)}`}></span>
          <span className={getPriorityColor(project.priority)}>
            {project.priority?.toUpperCase() || "MEDIUM"}
          </span>
        </div>
      )
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      cell: (project) => <span className="text-xs capitalize">{project.type}</span>
    },
    {
      id: "deadline",
      header: "Deadline",
      accessorKey: "deadline",
      cell: (project) => {
        const status = getDeadlineStatus(project.deadline);
        return (
          <div className={`font-medium text-xs ${status.text}`}>
            {new Date(project.deadline).toLocaleDateString()}
          </div>
        );
      }
    },
    {
      id: "description",
      header: "Description",
      detailOnly: true,
      detailCell: (project) => (
        <p className="whitespace-pre-wrap text-sm">{project.description?.trim() || "—"}</p>
      ),
    },
    {
      id: "company",
      header: "Company",
      detailOnly: true,
      accessorKey: "companyName",
    },
    {
      id: "pm",
      header: "Project manager",
      detailOnly: true,
      detailCell: (project) => project.pmName || "—",
    },
    {
      id: "startDate",
      header: "Start date",
      detailOnly: true,
      detailCell: (project) => new Date(project.startDate).toLocaleDateString(),
    },
    {
      id: "techStack",
      header: activeTab === ListProjectsType.digital ? "Platforms" : "Tech stack",
      detailOnly: true,
      detailCell: (project) =>
        project.techStack?.length ? project.techStack.join(", ") : "—",
    },
    {
      id: "completion",
      header: "Completion",
      detailOnly: true,
      detailCell: (project) => `${project.completionPct ?? 0}%`,
    },
    {
      id: "memberCount",
      header: "Team size",
      detailOnly: true,
      detailCell: (project) => String(project.memberCount ?? 0),
    },
    {
      id: "links",
      header: "Links",
      detailOnly: true,
      detailCell: (project) => {
        const links = [
          ["Figma", project.figmaUrl],
          ["Repo", project.repoUrl],
          ["Staging", project.stagingUrl],
          ["Production", project.productionUrl],
          ["Admin", project.adminUrl],
          ["Website", project.websiteUrl],
        ].filter(([, url]) => url);
        if (!links.length) return "—";
        return (
          <ul className="space-y-1 text-sm">
            {links.map(([label, url]) => (
              <li key={label}>
                <span className="text-muted-foreground">{label}: </span>
                <a href={url!} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created",
      detailOnly: true,
      detailCell: (project) => new Date(project.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      header: "Actions",
      hideInDetail: true,
      cell: (project) => (
          <CmsRowActions
            label="Project actions"
            onEdit={() => setEditProject(project)}
            onDelete={() => setDeleteId(project.id)}
          />
        ),
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "on_hold":
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
      case "scoping":
        return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      case "uat":
        return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20";
      case "maintenance":
        return "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-amber-500";
      case "low":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  function getDeadlineStatus(deadline: string) {
    const daysLeft = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0)
      return {
        label: "Overdue",
        color: "border-red-500",
        bg: "bg-red-500/5",
        text: "text-red-500",
      };
    if (daysLeft <= 7)
      return {
        label: `${daysLeft}d left`,
        color: "border-red-400",
        bg: "bg-red-500/5",
        text: "text-red-400",
      };
    if (daysLeft <= 30)
      return {
        label: `${daysLeft}d left`,
        color: "border-amber-400",
        bg: "bg-amber-500/5",
        text: "text-amber-400",
      };
    return {
      label: `${daysLeft}d left`,
      color: "border-green-500",
      bg: "",
      text: "text-green-500",
    };
  }

  return (
    <PortalPageShell>
      <PortalPageHero
        title="All projects"
        subtitle="Development, maintenance, and digital portfolios"
        actions={
          <Dialog
            open={isDialogOpen || !!editProject}
            onOpenChange={(open) => {
              if (!open) {
                setIsDialogOpen(false);
                setEditProject(null);
              } else {
                setIsDialogOpen(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className={portalActionButtonClass("bg-primary text-primary-foreground")}>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle>
                {editProject ? "Edit Project" : "New Project"}
              </DialogTitle>
              <DialogDescription>
                {editProject
                  ? "Update project details."
                  : "Create a new project for a client."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Mobile App Redesign"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project logo / image</FormLabel>
                          <FormControl>
                            <FileUploader
                              category="misc"
                              accept="image/*"
                              label="Upload project logo"
                              value={field.value}
                              maxSizeMB={5}
                              onUploadComplete={(url) => field.onChange(url)}
                            />
                          </FormControl>
                          {field.value ? (
                            <img
                              src={field.value}
                              alt="Project logo preview"
                              className="h-12 object-contain rounded border border-border p-2 bg-muted/30"
                            />
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Category</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("techStack", []);
                                form.setValue("digitalServices", { ...EMPTY_DIGITAL_SERVICES });
                                form.setValue("socialLinks", { ...EMPTY_SOCIAL_LINKS });
                              }}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="development">
                                  Development
                                </SelectItem>
                                <SelectItem value="maintenance">
                                  Maintenance
                                </SelectItem>
                                <SelectItem value="digital">
                                  Digital
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clientsData?.clients.map((client) => (
                                  <SelectItem
                                    key={client.id}
                                    value={client.id.toString()}
                                  >
                                    {client.companyName}
                                  </SelectItem>
                                ))}
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
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">
                                  Critical
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="scoping">Scoping</SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="uat">UAT</SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="maintenance">
                                  Maintenance
                                </SelectItem>
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
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief project overview..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <ProjectDescriptionResourcesField
                    projectId={editProject?.id}
                    value={descriptionResources}
                    onChange={setDescriptionResources}
                    onBaselineChange={setDescriptionResourceBaseline}
                  />
                  {(() => {
                    const currentType = form.watch("type");
                    const isDigital = currentType === "digital";
                    const platformOptions = projectStackOptions(currentType);

                    return (
                      <>
                        {isDigital ? (
                          <DigitalProjectServiceFields
                            services={normalizeDigitalServicesForm(form.watch("digitalServices"))}
                            socialLinks={normalizeSocialLinksForm(form.watch("socialLinks"))}
                            platforms={form.watch("techStack") || []}
                            onServicesChange={(digitalServices) =>
                              form.setValue("digitalServices", digitalServices, {
                                shouldDirty: true,
                              })
                            }
                            onSocialLinksChange={(socialLinks) =>
                              form.setValue("socialLinks", socialLinks, { shouldDirty: true })
                            }
                            onPlatformsChange={(techStack) =>
                              form.setValue("techStack", techStack, { shouldDirty: true })
                            }
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="techStack"
                            render={() => (
                              <FormItem>
                                <FormLabel>{projectStackFieldLabel(currentType)}</FormLabel>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border rounded-md p-3">
                                  {platformOptions.map((tech) => (
                                    <FormField
                                      key={tech}
                                      control={form.control}
                                      name="techStack"
                                      render={({ field }) => {
                                        return (
                                          <FormItem
                                            key={tech}
                                            className="flex flex-row items-start space-x-2 space-y-0"
                                          >
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(tech)}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                    ? field.onChange([
                                                        ...(field.value || []),
                                                        tech,
                                                      ])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                          (value) => value !== tech,
                                                        ),
                                                      );
                                                }}
                                              />
                                            </FormControl>
                                            <FormLabel className="text-xs font-normal cursor-pointer">
                                              {tech}
                                            </FormLabel>
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="figmaUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isDigital ? "Assets / Drive Link" : "Figma URL"}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={isDigital ? "https://drive.google.com/..." : "https://figma.com/..."}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {!isDigital && (
                            <FormField
                              control={form.control}
                              name="repoUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Repository URL</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="https://github.com/..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="adminUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isDigital ? "Analytics Dashboard Link" : "Admin Portal URL"}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={isDigital ? "https://analytics.google.com/..." : "https://admin.example.com"}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="websiteUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isDigital ? "Website / Landing Page Link" : "Website URL"}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={isDigital ? "https://example.com/campaign" : "https://example.com"}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {!isDigital && (
                          <FormField
                            control={form.control}
                            name="postmanJson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postman Collection JSON</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Paste exported Postman JSON blob here..."
                                    className="min-h-[100px] font-mono text-[10px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    );
                  })()}
                  </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    disabled={
                      createProjectMutation.isPending ||
                      updateProjectMutation.isPending
                    }
                  >
                    {createProjectMutation.isPending ||
                    updateProjectMutation.isPending
                      ? editProject
                        ? "Updating..."
                        : "Creating..."
                      : editProject
                        ? "Update Project"
                        : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />
      <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <PortalKpiGrid
        items={[
          {
            title: "Projects",
            value: projectStats.total,
            hint: "In this view",
            icon: Briefcase,
            accent: "blue",
            delay: 0,
          },
          {
            title: "Avg completion",
            value: `${projectStats.avgCompletion}%`,
            hint: "Across listed projects",
            icon: TrendingUp,
            accent: "green",
            delay: 1,
          },
          {
            title: "High priority",
            value: projectStats.highPriority,
            hint: "High + critical",
            icon: AlertTriangle,
            accent: "amber",
            alert: projectStats.highPriority > 0,
            delay: 2,
          },
          {
            title: "Overdue",
            value: projectStats.overdue,
            hint: "Past deadline",
            icon: BarChart3,
            accent: "red",
            alert: projectStats.overdue > 0,
            delay: 3,
          },
        ]}
      />

      <CmsChipTabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ListProjectsType)}
        items={[
          { value: ListProjectsType.development, label: "Development" },
          { value: ListProjectsType.maintenance, label: "Maintenance" },
          { value: ListProjectsType.digital, label: "Digital" },
        ]}
      />

      <CmsFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects…"
        filters={[
          {
            key: "status",
            value: statusFilter || "all",
            onChange: (v) => setStatusFilter(v === "all" ? "" : v),
            placeholder: "Status",
            allOption: { value: "all", label: "All statuses" },
            options: [
              { value: "scoping", label: "Scoping" },
              { value: "in_progress", label: "In progress" },
              { value: "on_hold", label: "On hold" },
              { value: "uat", label: "UAT" },
              { value: "completed", label: "Completed" },
              { value: "maintenance", label: "Maintenance" },
            ],
          },
          {
            key: "priority",
            value: priorityFilter || "all",
            onChange: (v) =>
              setPriorityFilter(v === "all" ? "" : (v as ListProjectsPriority)),
            placeholder: "Priority",
            allOption: { value: "all", label: "All priorities" },
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ],
          },
        ]}
      />

      <div className="mt-1">
        {isLoading ? (
          <div className="p-4 rounded-md border border-border bg-card">
            <PageTableSkeleton rows={8} columns={7} showToolbar />
          </div>
        ) : (
          <AdvancedTable
            data={list}
            columns={columns}
            filename="ProjectsExport"
            viewStorageKey="admin-projects"
            defaultViewMode="table"
            showViewToggle
            renderGridCard={(project) => {
              const href =
                project.type === "digital"
                  ? `/marketing/projects/${project.id}`
                  : `/admin/projects/${project.id}`;
              return (
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0 rounded-md border border-border/60">
                      {project.logoUrl ? (
                        <AvatarImage src={project.logoUrl} alt={project.name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {project.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Link href={href} className="text-sm font-semibold hover:text-primary line-clamp-2">
                        {project.name}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {project.companyName ?? project.clientName ?? "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] capitalize shrink-0", getStatusColor(project.status))}>
                      {project.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-semibold text-foreground">{project.completionPct ?? 0}%</span>
                    </div>
                    <Progress value={project.completionPct ?? 0} className="h-1.5" />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-[10px] capitalize text-muted-foreground">{project.priority} priority</span>
                    <CmsRowActions
                      label="Project actions"
                      onEdit={() => setEditProject(project)}
                      onDelete={() => setDeleteId(project.id)}
                    />
                  </div>
                </div>
              );
            }}
            getRowClassName={(project) =>
              project.priority === "critical"
                ? "bg-red-500/[0.04] border-l-2 border-l-red-500"
                : project.priority === "high"
                  ? "bg-orange-500/[0.04] border-l-2 border-l-orange-500"
                  : undefined
            }
          />
        )}
      </div>
      <DataPagination
        page={data?.page ?? page}
        total={data?.total ?? 0}
        limit={limit}
        loadedRowCount={list.length}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </PortalPageShell>
  );
}
