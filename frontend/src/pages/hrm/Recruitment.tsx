import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, CheckCircle2, ClipboardList, Pencil, Plus, Rocket, Trash2, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { normalizePhoneForSubmit, phoneValidationError, sanitizePhoneDigits } from "@/lib/phone-input";
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
  HrmField,
  portalActionButtonClass,
  HrmRefRefreshButton,
  hrmRefCountSubtitle,
  HrmRatingStars,
} from "@/modules/hrm/components";
import { HrmRefStatusPill } from "@/modules/hrm/hrm-reference-kit";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import {
  CANDIDATE_SOURCES,
  RECRUITMENT_STAGES,
  RECRUITMENT_STAGE_LABELS,
  RECRUITMENT_ONBOARDING_STAGES,
  stageTone,
} from "@/modules/hrm/recruitment-constants";
import {
  useCreateCandidate,
  useDeleteCandidate,
  useHrmCandidates,
  useHrmDepartments,
  useOnboardingTasks,
  useStartOnboarding,
  useToggleOnboardingTask,
  useUpdateCandidate,
} from "@/api/hrm";
import { useCreateEmployeeFromCandidate } from "@/api/team-employees";
import type { CreateEmployeeFromCandidateResult } from "@/api/team-employees";
import { HRM_EMPLOYEE_ROLES, formatStaffRoleLabel } from "@/lib/user-roles";
import type { HrmCandidate } from "@/modules/hrm/types";

type CandidateForm = {
  name: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  notes: string;
  experienceYears: string;
  source: string;
  rating: number;
};

const emptyForm = (): CandidateForm => ({
  name: "",
  email: "",
  phone: "",
  position: "",
  departmentId: "none",
  notes: "",
  experienceYears: "",
  source: "",
  rating: 0,
});

export default function HrmRecruitmentPage() {
  const canCreate = useHrmPermission("recruitment", "create");
  const canEdit = useHrmPermission("recruitment", "edit");
  const canDelete = useHrmPermission("recruitment", "delete");
  const canOnboard = useHrmPermission("onboarding", "create");

  const { data, isLoading, refetch, isFetching } = useHrmCandidates();
  const { data: deptData } = useHrmDepartments();
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const startOnboarding = useStartOnboarding();
  const toggleTask = useToggleOnboardingTask();
  const createEmployeeFromCandidate = useCreateEmployeeFromCandidate();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HrmCandidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrmCandidate | null>(null);
  const [onboardingCandidateId, setOnboardingCandidateId] = useState<number | null>(null);
  const [form, setForm] = useState<CandidateForm>(emptyForm());
  const [hireConfirmCandidate, setHireConfirmCandidate] = useState<HrmCandidate | null>(null);
  const [hireRole, setHireRole] = useState("developer");
  const [hirePassword, setHirePassword] = useState("");
  const [hireStartOnboarding, setHireStartOnboarding] = useState(true);
  const [hireCreatedResult, setHireCreatedResult] = useState<CreateEmployeeFromCandidateResult | null>(
    null,
  );

  const candidates = data?.candidates ?? [];
  const departments = deptData?.departments ?? [];
  const { data: onboardingData } = useOnboardingTasks(onboardingCandidateId ?? undefined);
  const onboardingRecord = onboardingData?.record ?? null;

  const kpiItems = useMemo(() => {
    const active = candidates.filter(
      (c) => !["hired", "rejected", "onboarding"].includes(c.stage),
    ).length;
    const interview = candidates.filter((c) => c.stage === "interview").length;
    const offer = candidates.filter((c) => c.stage === "offer").length;
    const onboarding = candidates.filter((c) => c.stage === "onboarding").length;
    const hired = candidates.filter((c) => c.stage === "hired").length;
    const rejected = candidates.filter((c) => c.stage === "rejected").length;
    return [
      { label: "Pipeline", value: active, hint: "Open candidates", icon: Users, accent: "violet" as const },
      { label: "In interview", value: interview, hint: "Active interviews", icon: ClipboardList, accent: "amber" as const },
      { label: "Offers", value: offer, hint: "Pending hire", icon: Rocket, accent: "blue" as const },
      { label: "Onboarding", value: onboarding, hint: "Ready for checklist", icon: UserPlus, accent: "violet" as const },
      { label: "Hired", value: hired, hint: "Completed hire", icon: CheckCircle2, accent: "green" as const },
      { label: "Rejected", value: rejected, hint: "Closed out", icon: Trash2, accent: "rose" as const },
    ];
  }, [candidates]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (candidate: HrmCandidate) => {
    setEditing(candidate);
    setForm({
      name: candidate.name,
      email: candidate.email,
      phone: sanitizePhoneDigits(candidate.phone ?? ""),
      position: candidate.position,
      departmentId: candidate.departmentId != null ? String(candidate.departmentId) : "none",
      notes: candidate.notes ?? "",
      experienceYears: candidate.experienceYears != null ? String(candidate.experienceYears) : "",
      source: candidate.source ?? "",
      rating: candidate.rating ?? 0,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.position.trim()) {
      toast.error("Name, email, and position are required");
      return;
    }
    const phoneErr = phoneValidationError(form.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: normalizePhoneForSubmit(form.phone) || undefined,
      position: form.position.trim(),
      departmentId: form.departmentId === "none" ? null : Number(form.departmentId),
      notes: form.notes.trim() || undefined,
      experienceYears: form.experienceYears.trim() ? Number(form.experienceYears) : undefined,
      source: form.source.trim() || undefined,
      rating: form.rating > 0 ? form.rating : undefined,
    };
    try {
      if (editing) {
        await updateCandidate.mutateAsync({ id: editing.id, ...payload });
        toast.success("Candidate updated");
      } else {
        await createCandidate.mutateAsync(payload);
        toast.success("Candidate added");
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      // mutation toast
    }
  };

  const openHireDialog = (candidate: HrmCandidate, options?: { startOnboarding?: boolean }) => {
    setHireRole("developer");
    setHirePassword("");
    setHireStartOnboarding(
      options?.startOnboarding ?? candidate.stage === "onboarding",
    );
    setHireCreatedResult(null);
    setHireConfirmCandidate(candidate);
  };

  const closeHireDialog = () => {
    setHireConfirmCandidate(null);
    setHireCreatedResult(null);
    setHirePassword("");
  };

  const handleStageChange = (candidate: HrmCandidate, stage: string) => {
    updateCandidate.mutate(
      { id: candidate.id, stage },
      {
        onSuccess: () => {
          toast.success("Stage updated");
          if ((stage === "hired" || stage === "onboarding") && candidate.hiredUserId == null) {
            openHireDialog({ ...candidate, stage });
          }
        },
      },
    );
  };

  const handleCreateEmployee = async () => {
    if (!hireConfirmCandidate) return;
    const trimmedPassword = hirePassword.trim();
    if (trimmedPassword && trimmedPassword.length < 8) {
      toast.error("Password must be at least 8 characters, or leave blank to auto-generate");
      return;
    }
    try {
      const result = await createEmployeeFromCandidate.mutateAsync({
        candidateId: hireConfirmCandidate.id,
        role: hireRole,
        password: trimmedPassword || undefined,
        startOnboarding: hireStartOnboarding,
      });
      setHireCreatedResult(result);
      if (result.alreadyExisted) {
        toast.info("Employee account already exists for this candidate");
      } else if (result.temporaryPassword) {
        toast.success("Employee created — copy the temporary password below");
      } else {
        toast.success(`Employee account created for ${hireConfirmCandidate.name}`);
      }
      if (result.onboardingRecord && hireStartOnboarding) {
        setOnboardingCandidateId(hireConfirmCandidate.id);
      }
    } catch {
      // error toast handled by hook
    }
  };

  const handleStartOnboarding = (candidate: HrmCandidate) => {
    if (!candidate.hiredUserId) {
      openHireDialog(candidate, { startOnboarding: true });
      toast.info("Create the employee account first, then onboarding will start automatically");
      return;
    }
    startOnboarding.mutate(candidate.id, {
      onSuccess: () => {
        toast.success("Onboarding started — open Onboarding to track checklist");
        setOnboardingCandidateId(candidate.id);
      },
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCandidate.mutateAsync(deleteTarget.id);
      toast.success("Candidate removed");
      setDeleteTarget(null);
    } catch {
      // mutation toast
    }
  };

  const columns = useMemo((): Column<HrmCandidate>[] => [
    {
      id: "name",
      header: "Candidate",
      accessorKey: "name",
      cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-[11px] text-muted-foreground">{c.email}</p>
        </div>
      ),
      exportValue: (c) => `${c.name} <${c.email}>`,
    },
    {
      id: "role",
      header: "Role",
      cell: (c) => (
        <div>
          <p className="text-sm">{c.position}</p>
          <p className="text-[11px] text-muted-foreground">{c.departmentName ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "exp",
      header: "Exp",
      cell: (c) => (c.experienceYears != null ? `${c.experienceYears}y` : "—"),
    },
    {
      id: "source",
      header: "Source",
      cell: (c) => <span className="text-muted-foreground">{c.source ?? "—"}</span>,
    },
    {
      id: "rating",
      header: "Rating",
      cell: (c) => <HrmRatingStars value={c.rating ?? 0} />,
    },
    {
      id: "applied",
      header: "Applied",
      cell: (c) => {
        const d = c.appliedOn ?? c.createdAt;
        return d ? (
          <span className="text-xs tabular-nums">{format(new Date(d), "MMM d, yyyy")}</span>
        ) : (
          "—"
        );
      },
    },
    {
      id: "stage",
      header: "Stage",
      cell: (c) =>
        canEdit ? (
          <Select value={c.stage} onValueChange={(v) => handleStageChange(c, v)}>
            <SelectTrigger className="h-8 w-36" onClick={(e) => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECRUITMENT_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {RECRUITMENT_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <HrmRefStatusPill tone={stageTone(c.stage)}>
            {RECRUITMENT_STAGE_LABELS[c.stage] ?? c.stage}
          </HrmRefStatusPill>
        ),
      exportValue: (c) => RECRUITMENT_STAGE_LABELS[c.stage] ?? c.stage,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (c) => (
        <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {RECRUITMENT_ONBOARDING_STAGES.includes(c.stage as (typeof RECRUITMENT_ONBOARDING_STAGES)[number]) && canOnboard ? (
            <Button
              size="sm"
              variant="outline"
              disabled={startOnboarding.isPending}
              onClick={() => handleStartOnboarding(c)}
            >
              <Rocket className="mr-1 h-3 w-3" />
              Onboard
            </Button>
          ) : null}
          {canEdit ? (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => setDeleteTarget(c)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ], [canDelete, canEdit, canOnboard, startOnboarding.isPending]);

  return (
    <HrmGate module="recruitment">
      <HrmPageShell>
        <HrmPageHero
          title="Recruitment"
          description={
            isLoading
              ? "Loading pipeline…"
              : `${hrmRefCountSubtitle(candidates.length, "candidate")} · pipeline and hiring funnel`
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />
              <Link href="/hrm/onboarding">
                <Button size="sm" variant="outline" className="h-8">
                  Onboarding
                </Button>
              </Link>
              {canCreate ? (
                <Button size="sm" className={portalActionButtonClass("h-8")} onClick={openCreate}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add candidate
                </Button>
              ) : null}
            </div>
          }
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} columns={3} />

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

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit candidate" : "Add candidate"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <HrmField label="Full name">
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </HrmField>
              <HrmField label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </HrmField>
              <HrmField label="Phone" hint="10-digit mobile number">
                <PhoneInput
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </HrmField>
              <HrmField label="Position">
                <Input
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </HrmField>
              <HrmField label="Department">
                <Select
                  value={form.departmentId}
                  onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
                >
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
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </HrmField>
              <div className="grid gap-4 sm:grid-cols-2">
                <HrmField label="Experience (years)">
                  <Input
                    type="number"
                    min={0}
                    value={form.experienceYears}
                    onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                  />
                </HrmField>
                <HrmField label="Source">
                  <Select value={form.source || "none"} onValueChange={(v) => setForm((f) => ({ ...f, source: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {CANDIDATE_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
              </div>
              <HrmField label="Rating">
                <HrmRatingStars
                  value={form.rating}
                  editable
                  onChange={(rating) => setForm((f) => ({ ...f, rating }))}
                  size="md"
                />
              </HrmField>
            </div>
            <DialogFooter>
              <Button
                className={portalActionButtonClass()}
                disabled={createCandidate.isPending || updateCandidate.isPending}
                onClick={() => void handleSave()}
              >
                {editing ? "Save changes" : "Save candidate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={onboardingCandidateId != null} onOpenChange={(open) => !open && setOnboardingCandidateId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboarding started</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Track the full checklist on the{" "}
              <Link href="/hrm/onboarding" className="text-primary underline-offset-2 hover:underline">
                Onboarding
              </Link>{" "}
              page. Ensure the employee exists in Team with the same email as the candidate.
            </p>
            {onboardingRecord?.tasks?.length ? (
              <ul className="mt-3 space-y-1.5">
                {onboardingRecord.tasks.map((task, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={toggleTask.isPending}
                      onClick={() =>
                        toggleTask.mutate(
                          { recordId: onboardingRecord.id, taskIndex: i },
                          { onSuccess: () => toast.success("Task updated") },
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-left hover:bg-muted/40"
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded ${
                          task.completed ? "bg-emerald-600 text-white" : "border border-border"
                        }`}
                      >
                        {task.completed ? <Check className="size-3" /> : null}
                      </div>
                      <span className={task.completed ? "text-sm line-through text-muted-foreground" : "text-sm"}>
                        {task.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No checklist loaded yet.</p>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget ? `"${deleteTarget.name}" will be removed from the pipeline.` : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCandidate.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteCandidate.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create employee when stage → Hired / Onboarding or Onboard without account */}
        <Dialog open={hireConfirmCandidate != null} onOpenChange={(open) => !open && closeHireDialog()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {hireCreatedResult ? "Employee account ready" : "Create employee account"}
              </DialogTitle>
            </DialogHeader>
            {!hireCreatedResult ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Stage:{" "}
                  <strong>{RECRUITMENT_STAGE_LABELS[hireConfirmCandidate?.stage ?? ""] ?? ""}</strong>.
                  Create a Team login for this candidate. Leave password blank to auto-generate a
                  temporary one.
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name: </span>
                    {hireConfirmCandidate?.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    {hireConfirmCandidate?.email}
                  </p>
                  {hireConfirmCandidate?.position && (
                    <p>
                      <span className="text-muted-foreground">Role applied: </span>
                      {hireConfirmCandidate.position}
                    </p>
                  )}
                  {hireConfirmCandidate?.phone && (
                    <p>
                      <span className="text-muted-foreground">Phone: </span>
                      {hireConfirmCandidate.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <HrmField label="Staff role">
                    <Select value={hireRole} onValueChange={setHireRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HRM_EMPLOYEE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {formatStaffRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HrmField>
                  <HrmField
                    label="Login password (optional)"
                    hint="Min 8 characters, or leave blank to auto-generate"
                  >
                    <PasswordInput
                      value={hirePassword}
                      onChange={(e) => setHirePassword(e.target.value)}
                      placeholder="Auto-generate if empty"
                      autoComplete="new-password"
                    />
                  </HrmField>
                  {canOnboard ? (
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="hire-start-onboarding"
                        checked={hireStartOnboarding}
                        onCheckedChange={(v) => setHireStartOnboarding(v === true)}
                      />
                      <Label htmlFor="hire-start-onboarding" className="text-sm font-normal leading-snug">
                        Start onboarding checklist after creating the account
                      </Label>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  {hireCreatedResult.alreadyExisted
                    ? "This candidate is already linked to an employee account."
                    : "Share these login details with the new hire. They will be prompted to change the password on first login."}
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 space-y-1">
                  <p>
                    <span className="text-muted-foreground">Employee ID: </span>
                    <span className="font-mono font-medium">
                      {String(hireCreatedResult.user?.employeeId ?? "—")}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email: </span>
                    {String(hireCreatedResult.user?.email ?? hireConfirmCandidate?.email ?? "—")}
                  </p>
                  {hireCreatedResult.temporaryPassword ? (
                    <p>
                      <span className="text-muted-foreground">Temporary password: </span>
                      <span className="font-mono font-semibold text-foreground">
                        {hireCreatedResult.temporaryPassword}
                      </span>
                    </p>
                  ) : null}
                </div>
                {hireCreatedResult.onboardingRecord ? (
                  <p className="text-xs text-muted-foreground">
                    Onboarding checklist started — track progress on the{" "}
                    <Link href="/hrm/onboarding" className="text-primary underline-offset-2 hover:underline">
                      Onboarding
                    </Link>{" "}
                    page.
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Complete profile, department, and documents in{" "}
                  <Link href="/admin/employees" className="text-primary underline-offset-2 hover:underline">
                    Team → Employees
                  </Link>
                  .
                </p>
              </div>
            )}
            <DialogFooter>
              {hireCreatedResult ? (
                <Button className={portalActionButtonClass()} onClick={closeHireDialog}>
                  Done
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={closeHireDialog}>
                    Skip for now
                  </Button>
                  <Button
                    className={portalActionButtonClass()}
                    disabled={createEmployeeFromCandidate.isPending}
                    onClick={() => void handleCreateEmployee()}
                  >
                    {createEmployeeFromCandidate.isPending
                      ? "Creating…"
                      : hireStartOnboarding && canOnboard
                        ? "Create & start onboarding"
                        : "Create employee"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
