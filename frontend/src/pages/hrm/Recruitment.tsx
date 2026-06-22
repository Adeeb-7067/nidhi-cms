import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageHero,
  HrmPageShell,
  HrmContentCard,
  HrmField,
  portalActionButtonClass,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
} from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import {
  useCompleteOnboardingTask,
  useCreateCandidate,
  useHrmCandidates,
  useHrmDepartments,
  useOnboardingTasks,
  useStartOnboarding,
  useUpdateCandidate,
} from "@/api/hrm";
import type { HrmCandidate } from "@/modules/hrm/types";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const STAGES = Object.keys(STAGE_LABELS);

export default function HrmRecruitmentPage() {
  const { data, isLoading, refetch, isFetching } = useHrmCandidates();
  const { data: deptData } = useHrmDepartments();
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const startOnboarding = useStartOnboarding();
  const completeTask = useCompleteOnboardingTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingCandidateId, setOnboardingCandidateId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const candidates = data?.candidates ?? [];
  const departments = deptData?.departments ?? [];
  const { data: onboardingData } = useOnboardingTasks(onboardingCandidateId ?? undefined);
  const onboardingTasks = onboardingData?.tasks ?? [];

  const kpiItems = useMemo(() => {
    const active = candidates.filter((c) => !["hired", "rejected"].includes(c.stage)).length;
    const hired = candidates.filter((c) => c.stage === "hired").length;
    const interview = candidates.filter((c) => c.stage === "interview").length;
    return [
      { label: "Pipeline", value: active, hint: "Open candidates", icon: Users, accent: "violet" as const },
      { label: "In interview", value: interview, hint: "Active interviews", icon: ClipboardList, accent: "amber" as const },
      { label: "Hired", value: hired, hint: "Onboarding handoff", icon: CheckCircle2, accent: "green" as const },
      { label: "Total", value: candidates.length, hint: "All records", icon: UserPlus, accent: "blue" as const },
    ];
  }, [candidates]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPosition("");
    setDepartmentId("none");
    setNotes("");
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !position.trim()) {
      toast.error("Name, email, and position are required");
      return;
    }
    try {
      await createCandidate.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        position: position.trim(),
        departmentId: departmentId === "none" ? null : Number(departmentId),
        notes: notes.trim() || undefined,
      });
      toast.success("Candidate added");
      setCreateOpen(false);
      resetForm();
    } catch {
      // toast from mutation
    }
  };

  const handleStageChange = (candidate: HrmCandidate, stage: string) => {
    updateCandidate.mutate(
      { id: candidate.id, stage },
      { onSuccess: () => toast.success("Stage updated") },
    );
  };

  const columns = useMemo((): Column<HrmCandidate>[] => [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
      cell: (c) => <span className="text-muted-foreground">{c.email}</span>,
    },
    { id: "position", header: "Position", accessorKey: "position" },
    {
      id: "stage",
      header: "Stage",
      cell: (c) => (
        <Select value={c.stage} onValueChange={(v) => handleStageChange(c, v)}>
          <SelectTrigger className="h-8 w-36" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      exportValue: (c) => STAGE_LABELS[c.stage] ?? c.stage,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <div className="space-x-2" onClick={(e) => e.stopPropagation()}>
          {c.stage === "offer" && (
            <Button
              size="sm"
              variant="outline"
              disabled={startOnboarding.isPending}
              onClick={() =>
                startOnboarding.mutate(c.id, {
                  onSuccess: () => {
                    toast.success("Onboarding started");
                    setOnboardingCandidateId(c.id);
                  },
                })
              }
            >
              Start onboarding
            </Button>
          )}
          {c.stage === "hired" && (
            <Button size="sm" variant="ghost" onClick={() => setOnboardingCandidateId(c.id)}>
              View tasks
            </Button>
          )}
        </div>
      ),
    },
  ], [startOnboarding]);

  return (
    <HrmGate module="recruitment">
      <HrmPageShell>
        <HrmPageHero
          title="Recruitment"
          description={
            isLoading
              ? "Loading pipeline…"
              : `${hrmRefCountSubtitle(candidates.length, "candidate")} · pipeline and onboarding`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              <Button size="sm" className={portalActionButtonClass("h-8")} onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add candidate
              </Button>
            </div>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={candidates}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Filter candidates…"
            filename="HrmRecruitmentExport"
            viewStorageKey="hrm-recruitment"
          />
        </PortalTablePanel>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add candidate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </HrmField>
              <HrmField label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </HrmField>
              <HrmField label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </HrmField>
              <HrmField label="Position">
                <Input value={position} onChange={(e) => setPosition(e.target.value)} />
              </HrmField>
              <HrmField label="Department">
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrmField>
              <HrmField label="Notes">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </HrmField>
            </div>
            <DialogFooter>
              <Button className={portalActionButtonClass()} disabled={createCandidate.isPending} onClick={handleCreate}>
                Save candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={onboardingCandidateId != null} onOpenChange={(open) => !open && setOnboardingCandidateId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboarding checklist</DialogTitle>
            </DialogHeader>
            <HrmContentCard className="border-0 shadow-none p-0">
              <ul className="space-y-2">
                {onboardingTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                    {task.completed ? (
                      <Badge variant="outline" className="text-green-600">
                        Done
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completeTask.isPending}
                        onClick={() =>
                          completeTask.mutate(task.id, {
                            onSuccess: () => {
                              toast.success("Task completed");
                              void refetch();
                            },
                          })
                        }
                      >
                        Complete
                      </Button>
                    )}
                  </li>
                ))}
                {onboardingTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No onboarding tasks for this candidate.</p>
                )}
              </ul>
            </HrmContentCard>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
