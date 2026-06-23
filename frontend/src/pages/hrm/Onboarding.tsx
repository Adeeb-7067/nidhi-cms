import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, ClipboardList, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageHero, HrmPageShell, portalActionButtonClass } from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import {
  useCompleteOnboardingTask,
  useHrmCandidates,
  useOnboardingTasks,
} from "@/api/hrm";
import type { HrmCandidate } from "@/modules/hrm/types";

export default function HrmOnboardingPage() {
  const { data, isLoading } = useHrmCandidates();
  const completeTask = useCompleteOnboardingTask();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const hiredCandidates = useMemo(
    () => (data?.candidates ?? []).filter((c) => c.stage === "hired"),
    [data?.candidates],
  );
  const { data: taskData } = useOnboardingTasks(selectedId ?? undefined);
  const tasks = taskData?.tasks ?? [];

  const kpiItems = useMemo(() => {
    const open = hiredCandidates.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    return [
      { label: "Active onboardings", value: open, icon: UserPlus, accent: "violet" as const },
      { label: "Tasks done", value: completedTasks, icon: CheckCircle2, accent: "green" as const },
      { label: "Open tasks", value: Math.max(0, tasks.length - completedTasks), icon: ClipboardList, accent: "amber" as const },
      { label: "Total hired", value: open, icon: ClipboardList, accent: "blue" as const },
    ];
  }, [hiredCandidates.length, tasks]);

  const columns = useMemo((): Column<HrmCandidate>[] => [
    { id: "name", header: "Candidate", accessorKey: "name", cell: (c) => <span className="font-medium">{c.name}</span> },
    { id: "position", header: "Role", accessorKey: "position" },
    {
      id: "stage",
      header: "Stage",
      cell: () => <Badge variant="outline">Onboarding</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedId(c.id)}>
          View checklist
        </Button>
      ),
    },
  ], []);

  return (
    <HrmGate module="recruitment">
      <HrmPageShell>
        <HrmPageHero
          title="Onboarding"
          description="Track new hire checklists and completion progress"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Onboarding" }]}
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={hiredCandidates}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Filter new hires…"
            filename="HrmOnboardingExport"
            viewStorageKey="hrm-onboarding"
          />
        </PortalTablePanel>

        <Dialog open={selectedId != null} onOpenChange={(open) => !open && setSelectedId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboarding checklist</DialogTitle>
            </DialogHeader>
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className={task.completed ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                  {task.completed ? (
                    <Badge variant="outline" className="text-green-600">
                      Done {task.completedAt ? format(new Date(task.completedAt), "MMM d") : ""}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className={portalActionButtonClass()}
                      disabled={completeTask.isPending}
                      onClick={() =>
                        completeTask.mutate(task.id, {
                          onSuccess: () => toast.success("Task completed"),
                        })
                      }
                    >
                      Mark done
                    </Button>
                  )}
                </li>
              ))}
              {!tasks.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No onboarding tasks yet. Start onboarding from Recruitment.
                </p>
              )}
            </ul>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
