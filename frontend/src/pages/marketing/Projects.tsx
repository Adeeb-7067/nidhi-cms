import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Briefcase, CheckCircle2, Loader2, PauseCircle, Plus, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PageTableSkeleton, MarketingListPageSkeleton } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DigitalProjectServiceFields } from "@/components/project/DigitalProjectServiceFields";
import {
  EMPTY_DIGITAL_SERVICES,
  EMPTY_SOCIAL_LINKS,
  type DigitalServicesForm,
  type SocialLinksForm,
} from "@/lib/project-type-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListProjects,
  useListClients,
  useCreateProject,
  getListProjectsQueryKey,
  getListClientsQueryKey,
  ListProjectsType,
  ProjectInputPriority,
  type Project,
} from "@/api";
import { QUERY_STALE } from "@/lib/query-config";
import { canManageCmsProjects } from "@/lib/cms-project-manage";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingChipTabs,
} from "@/modules/marketing/components";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/modules/permissions/usePermission";

const STATUS_LABELS: Record<string, string> = {
  scoping: "Scoping",
  in_progress: "In progress",
  on_hold: "On hold",
  uat: "UAT",
  completed: "Completed",
  maintenance: "Maintenance",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

type ProjectTeamPreview = {
  userId: number;
  name: string;
  subType?: string | null;
  avatarUrl?: string | null;
};

type DigitalProjectRow = Project & {
  teamMembers?: ProjectTeamPreview[];
};

type CreateProjectForm = {
  name: string;
  clientId: string;
  priority: ProjectInputPriority;
  startDate: string;
  deadline: string;
  description: string;
  platforms: string[];
  digitalServices: DigitalServicesForm;
  socialLinks: SocialLinksForm;
  websiteUrl: string;
  figmaUrl: string;
};

const emptyForm: CreateProjectForm = {
  name: "",
  clientId: "",
  priority: ProjectInputPriority.medium,
  startDate: new Date().toISOString().slice(0, 10),
  deadline: "",
  description: "",
  platforms: [],
  digitalServices: { ...EMPTY_DIGITAL_SERVICES },
  socialLinks: { ...EMPTY_SOCIAL_LINKS },
  websiteUrl: "",
  figmaUrl: "",
};

export default function MarketingProjects() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreate = canManageCmsProjects(user) && can("marketing_clients", "create");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, isError } = useListProjects({
    type: ListProjectsType.digital,
    search: search || undefined,
    limit: 100,
  });

  const clientsPickerParams = { limit: 100 };
  const { data: clientsData } = useListClients(clientsPickerParams, {
    query: {
      queryKey: getListClientsQueryKey(clientsPickerParams),
      staleTime: QUERY_STALE.reference,
      enabled: createOpen,
    },
  });
  const createProject = useCreateProject();

  const rows = useMemo(
    () => ((data?.projects ?? []) as DigitalProjectRow[]).filter((p) => p.type === "digital"),
    [data],
  );

  const filteredRows = useMemo(() => {
    if (statusTab === "all") return rows;
    return rows.filter((p) => p.status === statusTab);
  }, [rows, statusTab]);

  const statusChipItems = useMemo(
    () => [
      { value: "all", label: "All", count: rows.length },
      ...Object.keys(STATUS_LABELS).map((status) => ({
        value: status,
        label: STATUS_LABELS[status],
        count: rows.filter((p) => p.status === status).length,
      })),
    ],
    [rows],
  );
  const kpis = useMemo(
    () => ({
      total: rows.length,
      inProgress: rows.filter((p) => p.status === "in_progress").length,
      onHold: rows.filter((p) => p.status === "on_hold").length,
      completed: rows.filter((p) => p.status === "completed").length,
    }),
    [rows],
  );
  const companies = clientsData?.clients ?? [];

  const columns = useMemo<Column<DigitalProjectRow>[]>(
    () => [
      {
        id: "name",
        header: "Project",
        accessorKey: "name",
        cell: (p) => (
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <Avatar className="h-8 w-8 shrink-0 rounded-md border border-border/60">
              {p.logoUrl ? (
                <AvatarImage src={p.logoUrl} alt={p.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
                {p.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                href={`/marketing/projects/${p.id}`}
                className="font-semibold text-xs text-primary hover:underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {p.name}
              </Link>
              <p className="text-[10px] text-muted-foreground truncate">
                {p.companyName || p.clientName || "—"}
              </p>
            </div>
          </div>
        ),
        exportValue: (p) => p.name,
      },
      {
        id: "team",
        header: "Team",
        cell: (p) => {
          const team = p.teamMembers ?? [];
          if (!team.length) {
            return <span className="text-[10px] text-muted-foreground">No members</span>;
          }
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex -space-x-1.5">
                {team.slice(0, 4).map((m) => (
                  <Avatar key={m.userId} className="h-7 w-7 border-2 border-background">
                    {m.avatarUrl ? (
                      <AvatarImage src={m.avatarUrl} alt={m.name} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="text-[9px] bg-primary/15 text-primary">
                      {m.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {team.length > 4 ? (
                <span className="text-[10px] text-muted-foreground tabular-nums">+{team.length - 4}</span>
              ) : null}
            </div>
          );
        },
        exportValue: (p) => (p.teamMembers ?? []).map((m) => m.name).join(", ") || "—",
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: (p) => (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {STATUS_LABELS[p.status] ?? p.status}
          </Badge>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        accessorKey: "priority",
        cell: (p) => (
          <Badge variant="outline" className="text-[10px] font-normal">
            {PRIORITY_LABELS[p.priority] ?? p.priority}
          </Badge>
        ),
      },
      {
        id: "start",
        header: "Start",
        cell: (p) => (p.startDate ? format(new Date(p.startDate), "MMM d, yyyy") : "—"),
        exportValue: (p) => (p.startDate ? format(new Date(p.startDate), "yyyy-MM-dd") : ""),
      },
      {
        id: "deadline",
        header: "Deadline",
        cell: (p) => (p.deadline ? format(new Date(p.deadline), "MMM d, yyyy") : "—"),
        exportValue: (p) => (p.deadline ? format(new Date(p.deadline), "yyyy-MM-dd") : ""),
      },
      {
        id: "progress",
        header: "Progress",
        cell: (p) => (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={p.completionPct ?? 0} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
              {p.completionPct ?? 0}%
            </span>
          </div>
        ),
        exportValue: (p) => `${p.completionPct ?? 0}%`,
      },
    ],
    [],
  );

  const openCreate = () => {
    setForm({
      ...emptyForm,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!form.clientId) {
      toast.error("Select a company");
      return;
    }
    if (!form.startDate || !form.deadline) {
      toast.error("Start date and deadline are required");
      return;
    }
    const companyId = Number(form.clientId);
    try {
      const created = await createProject.mutateAsync({
        data: {
          name: form.name.trim(),
          clientId: companyId,
          companyId,
          type: "digital",
          priority: form.priority,
          status: "scoping",
          startDate: form.startDate,
          deadline: form.deadline,
          description: form.description.trim() || undefined,
          techStack: form.platforms,
          digitalServices: form.digitalServices,
          socialLinks: form.socialLinks,
          websiteUrl: form.websiteUrl.trim() || undefined,
          figmaUrl: form.figmaUrl.trim() || undefined,
        },
      });
      toast.success("Digital project created");
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ["marketing", "accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing", "media"] });
      if (created?.id) {
        setLocation(`/marketing/projects/${created.id}`);
      }
    } catch (err) {
      toastApiError(err, "Failed to create digital project");
    }
  };

  if (isLoading && !data) {
    return <MarketingListPageSkeleton />;
  }

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Digital projects"
        description="Projects with type Digital — companies stay under Manage → Clients"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Projects" }]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add project
            </Button>
          ) : undefined
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total projects", value: kpis.total, icon: Briefcase, accent: "blue", delay: 0 },
          { title: "In progress", value: kpis.inProgress, icon: PlayCircle, accent: "amber", delay: 1 },
          { title: "On hold", value: kpis.onHold, icon: PauseCircle, accent: "violet", delay: 2 },
          { title: "Completed", value: kpis.completed, icon: CheckCircle2, accent: "green", delay: 3 },
        ]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects…"
      />

      <MarketingChipTabs value={statusTab} onValueChange={setStatusTab} items={statusChipItems} />

      {isError ? (
        <MarketingEmptyState
          title="Could not load projects"
          description="Check that the API is running and you have access."
        />
      ) : isLoading ? (
        <PageTableSkeleton rows={8} columns={7} showToolbar />
      ) : filteredRows.length === 0 ? (
        <MarketingEmptyState
          icon={Briefcase}
          title="No digital projects yet"
          description="Add a digital project here, or create one under Manage → Projects with type Digital."
          actionLabel={canCreate ? "Add project" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <AdvancedTable
          data={filteredRows}
          columns={columns}
          filename="DigitalProjects"
          viewStorageKey="marketing-digital-projects"
          onRowClick={(p) => setLocation(`/marketing/projects/${p.id}`)}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add digital project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-8 text-xs"
                placeholder="e.g. Brand campaigns Q3"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companies.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  No companies yet. Create one under Manage → Clients first.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as ProjectInputPriority }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-[72px] text-xs resize-y"
                rows={3}
              />
            </div>
            <DigitalProjectServiceFields
              compact
              services={form.digitalServices}
              socialLinks={form.socialLinks}
              platforms={form.platforms}
              onServicesChange={(digitalServices) => setForm((f) => ({ ...f, digitalServices }))}
              onSocialLinksChange={(socialLinks) => setForm((f) => ({ ...f, socialLinks }))}
              onPlatformsChange={(platforms) => setForm((f) => ({ ...f, platforms }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Assets / Drive Link</Label>
                <Input
                  placeholder="https://drive.google.com/..."
                  value={form.figmaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, figmaUrl: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website / Landing Page</Label>
                <Input
                  placeholder="https://example.com/campaign"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createProject.isPending || !form.name.trim() || !form.clientId}
              onClick={() => void handleCreate()}
            >
              {createProject.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
