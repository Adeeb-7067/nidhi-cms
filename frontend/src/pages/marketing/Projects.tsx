import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Briefcase, CheckCircle2, Loader2, PauseCircle, Plus, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/api";
import { QUERY_STALE } from "@/lib/query-config";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingChipTabs,
} from "@/modules/marketing/components";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";

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

type CreateProjectForm = {
  name: string;
  clientId: string;
  priority: ProjectInputPriority;
  startDate: string;
  deadline: string;
  description: string;
};

const emptyForm: CreateProjectForm = {
  name: "",
  clientId: "",
  priority: ProjectInputPriority.medium,
  startDate: new Date().toISOString().slice(0, 10),
  deadline: "",
  description: "",
};

export default function MarketingProjects() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  // POST /projects is role-gated (super_admin | bde | digital)
  const canCreate = user?.role === "super_admin" || user?.role === "bde" || user?.role === "digital";
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
    () => (data?.projects ?? []).filter((p) => p.type === "digital"),
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
          techStack: [],
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

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs />
      ) : isError ? (
        <MarketingEmptyState
          icon={Briefcase}
          title="Couldn't load projects"
          description="Check that the API is running and you have access."
        />
      ) : filteredRows.length === 0 ? (
        <MarketingEmptyState
          icon={Briefcase}
          title="No digital projects yet"
          description="Add a digital project here, or create one under Manage → Projects with type Digital."
          actionLabel={canCreate ? "Add project" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">Deadline</TableHead>
                <TableHead className="text-xs">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">
                    <Link
                      href={`/marketing/projects/${p.id}`}
                      className="text-primary hover:underline underline-offset-2"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.companyName || p.clientName || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {PRIORITY_LABELS[p.priority] ?? p.priority}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.startDate ? format(new Date(p.startDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.deadline ? format(new Date(p.deadline), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={p.completionPct ?? 0} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 tabular-nums">
                        {p.completionPct ?? 0}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
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
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="h-8 text-xs"
              />
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
