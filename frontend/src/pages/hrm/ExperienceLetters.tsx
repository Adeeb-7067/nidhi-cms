import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  ScrollText,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmField,
  HrmPageHero,
  HrmPageShell,
  HrmRefRefreshButton,
  portalActionButtonClass,
} from "@/modules/hrm/components";
import { HrmRefDetailRow, HrmRefDetailSection } from "@/modules/hrm/hrm-reference-kit";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { HrmEmployeeAvatar } from "@/modules/hrm/dashboard-sections";
import { useHrmPermission } from "@/modules/hrm/useHrmPermission";
import {
  downloadExperienceLetterPdf,
  useCreateExperienceLetter,
  useDeleteExperienceLetter,
  useHrmEmployees,
  useHrmExperienceLetter,
  useHrmExperienceLetters,
  usePreviewExperienceLetter,
  useSendExperienceLetter,
} from "@/api/hrm";
import type { HrmEmployee, HrmExperienceLetter } from "@/modules/hrm/types";

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(`${value.slice(0, 10)}T12:00:00`), "PPP");
  } catch {
    return value;
  }
}

function letterTypeLabel(type: string) {
  if (type === "relieving") return "Relieving";
  if (type === "offer") return "Offer";
  return "Experience";
}

export default function HrmExperienceLettersPage() {
  const canCreate = useHrmPermission("letters", "create");
  const canEdit = useHrmPermission("letters", "edit");
  const canDelete = useHrmPermission("letters", "delete");
  const canExport = useHrmPermission("letters", "export");

  const { data: employeesData, isLoading: employeesLoading } = useHrmEmployees({ limit: 500 });
  const employees = employeesData?.employees ?? [];

  const { data: lettersData, isLoading: lettersLoading, refetch, isFetching } = useHrmExperienceLetters();
  const letters = lettersData?.letters ?? [];

  const previewMutation = usePreviewExperienceLetter();
  const createMutation = useCreateExperienceLetter();
  const sendMutation = useSendExperienceLetter();
  const deleteMutation = useDeleteExperienceLetter();

  const [employeeId, setEmployeeId] = useState<string>("");
  const [letterType, setLetterType] = useState<"experience" | "relieving" | "offer">("experience");
  const [relievingDate, setRelievingDate] = useState("");
  const [joiningDateInput, setJoiningDateInput] = useState("");
  const [offeredCtc, setOfferedCtc] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [viewLetterId, setViewLetterId] = useState<number | null>(null);
  const { data: viewLetterDetail, isLoading: viewLetterLoading } = useHrmExperienceLetter(viewLetterId ?? undefined, {
    enabled: viewLetterId != null,
  });
  const viewLetter = viewLetterDetail ?? null;
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === Number(employeeId)),
    [employees, employeeId],
  );
  const resolvedOfferJoiningDate = joiningDateInput || selectedEmployee?.joiningDate?.slice(0, 10) || "";

  useEffect(() => {
    if (letterType !== "offer") return;
    if (joiningDateInput) return;
    const fallback = selectedEmployee?.joiningDate?.slice(0, 10) ?? "";
    if (fallback) setJoiningDateInput(fallback);
  }, [letterType, selectedEmployee?.joiningDate, joiningDateInput]);

  useEffect(() => {
    if (!employeeId || !relievingDate || (letterType === "offer" && !resolvedOfferJoiningDate)) {
      setPreviewHtml(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void previewMutation
        .mutateAsync({
          userId: Number(employeeId),
          relievingDate,
          joiningDate: letterType === "offer" ? resolvedOfferJoiningDate : undefined,
          offeredCtc: letterType === "offer" && offeredCtc ? Number(offeredCtc) : undefined,
          letterType,
          additionalNotes: additionalNotes.trim() || undefined,
        })
        .then((res) => setPreviewHtml(res.htmlContent))
        .catch(() => setPreviewHtml(null));
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced preview on form fields
  }, [employeeId, relievingDate, letterType, resolvedOfferJoiningDate, offeredCtc, additionalNotes]);

  const kpiItems = useMemo(
    () => [
      {
        label: "Employees",
        value: employees.length,
        hint: "Available for letters",
        icon: Users,
        accent: "violet" as const,
      },
      {
        label: "Generated",
        value: letters.length,
        hint: "Saved letters",
        icon: ScrollText,
        accent: "blue" as const,
      },
      {
        label: "Emailed",
        value: letters.filter((l) => l.emailSentAt).length,
        hint: "Sent to employees",
        icon: Mail,
        accent: "green" as const,
      },
    ],
    [employees.length, letters],
  );

  const handleGenerate = async () => {
    if (!employeeId || !relievingDate || (letterType === "offer" && !resolvedOfferJoiningDate)) {
      toast.error(letterType === "offer" ? "Select an employee, offer date, and joining date" : "Select an employee and relieving date");
      return;
    }
    try {
      const letter = await createMutation.mutateAsync({
        userId: Number(employeeId),
        relievingDate,
        joiningDate: letterType === "offer" ? resolvedOfferJoiningDate : undefined,
        offeredCtc: letterType === "offer" && offeredCtc ? Number(offeredCtc) : undefined,
        letterType,
        additionalNotes: additionalNotes.trim() || undefined,
      });
      toast.success("Letter generated and saved");
      setViewLetterId(letter.id);
      void refetch();
    } catch {
      // toast from mutation
    }
  };

  const handleDownload = async (letter: HrmExperienceLetter) => {
    if (!canExport) return;
    try {
      const fileName = `${letter.letterType}_letter_${letter.employeeCode}.pdf`;
      await downloadExperienceLetterPdf(letter.id, fileName);
      toast.success("Download started");
    } catch {
      toast.error("Could not download PDF");
    }
  };

  const handleSend = async (letter: HrmExperienceLetter) => {
    if (!canEdit) return;
    try {
      const result = await sendMutation.mutateAsync(letter.id);
      if (result.emailSent) {
        toast.success(result.message);
      } else {
        toast.message(result.message);
      }
      void refetch();
    } catch {
      // mutation toast
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Letter deleted");
      setDeleteId(null);
      void refetch();
    } catch {
      // mutation toast
    }
  };

  const columns = useMemo((): Column<HrmExperienceLetter>[] => [
    {
      id: "employee",
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{r.employeeName}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{r.employeeCode}</p>
        </div>
      ),
      exportValue: (r) => r.employeeName,
    },
    {
      id: "type",
      header: "Type",
      cell: (r) => (
        <span className="text-xs font-medium">{letterTypeLabel(r.letterType)}</span>
      ),
      exportValue: (r) => letterTypeLabel(r.letterType),
    },
    {
      id: "period",
      header: "Tenure",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.letterType === "offer"
            ? `Offer: ${formatDisplayDate(r.relievingDate)} · Join: ${formatDisplayDate(r.joiningDate)}`
            : `${formatDisplayDate(r.joiningDate)} → ${formatDisplayDate(r.relievingDate)}`}
        </span>
      ),
      exportValue: (r) =>
        r.letterType === "offer"
          ? `Offer: ${r.relievingDate} · Join: ${r.joiningDate ?? ""}`
          : `${r.joiningDate ?? ""} – ${r.relievingDate}`,
    },
    {
      id: "created",
      header: "Generated",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      exportValue: (r) => r.createdAt ?? "",
    },
    {
      id: "email",
      header: "Email",
      cell: (r) =>
        r.emailSentAt ? (
          <span className="text-[10px] text-emerald-600">Sent</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        ),
      exportValue: (r) => (r.emailSentAt ? "Sent" : ""),
    },
    {
      id: "actions",
      header: "",
      hideInDetail: true,
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewLetterId(r.id)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canExport ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleDownload(r)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={sendMutation.isPending}
              onClick={() => void handleSend(r)}
            >
              <Mail className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ], [canDelete, canEdit, canExport, sendMutation.isPending]);

  return (
    <HrmGate module="letters">
      <HrmPageShell>
        <HrmPageHero
          title="Employee letters"
          description="Generate experience, relieving, and offer letters with company branding — download anytime or email to the employee."
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Letters" }]}
          actions={<HrmRefRefreshButton onClick={() => void refetch()} loading={isFetching} />}
        />
        <HrmPageKpiRow items={kpiItems} loading={employeesLoading || lettersLoading} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold">New letter</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <HrmField label="Employee">
                  <Select value={employeeId} onValueChange={setEmployeeId} disabled={!canCreate}>
                    <SelectTrigger>
                      <SelectValue placeholder={employeesLoading ? "Loading…" : "Select employee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e: HrmEmployee) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          <span className="flex items-center gap-2">
                            <span>{e.name}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {e.employeeId ?? e.id}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </HrmField>
              </div>

              {selectedEmployee ? (
                <div className="sm:col-span-2 rounded-lg border border-border/50 bg-muted/20 p-3 flex items-center gap-3">
                  <HrmEmployeeAvatar name={selectedEmployee.name} avatarUrl={selectedEmployee.avatarUrl} />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold truncate">{selectedEmployee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmployee.designation ?? "—"} · {selectedEmployee.departmentName ?? selectedEmployee.department ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedEmployee.email}</p>
                  </div>
                </div>
              ) : null}

              <HrmField label="Employee name">
                <Input value={selectedEmployee?.name ?? ""} readOnly placeholder="Auto-filled" className="bg-muted/30" />
              </HrmField>
              <HrmField label="Joining date">
                <Input
                  value={
                    letterType === "offer"
                      ? resolvedOfferJoiningDate
                      : (selectedEmployee?.joiningDate ? formatDisplayDate(selectedEmployee.joiningDate) : "")
                  }
                  type={letterType === "offer" ? "date" : undefined}
                  onChange={letterType === "offer" ? (e) => setJoiningDateInput(e.target.value) : undefined}
                  readOnly={letterType !== "offer"}
                  placeholder="Auto-filled from profile"
                  className={letterType === "offer" ? undefined : "bg-muted/30"}
                />
              </HrmField>

              <HrmField label="Letter type">
                <Select
                  value={letterType}
                  onValueChange={(v) => setLetterType(v as "experience" | "relieving" | "offer")}
                  disabled={!canCreate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="experience">Experience letter</SelectItem>
                    <SelectItem value="relieving">Relieving letter</SelectItem>
                    <SelectItem value="offer">Offer letter</SelectItem>
                  </SelectContent>
                </Select>
              </HrmField>

              <HrmField
                label={letterType === "offer" ? "Offer date" : "Relieving / end date"}
                hint={letterType === "offer" ? "Date of issue" : "Last working day"}
              >
                <Input
                  type="date"
                  value={relievingDate}
                  onChange={(e) => setRelievingDate(e.target.value)}
                  disabled={!canCreate}
                />
              </HrmField>
              {letterType === "offer" ? (
                <HrmField label="Offered CTC (optional)">
                  <Input
                    type="number"
                    min={0}
                    value={offeredCtc}
                    onChange={(e) => setOfferedCtc(e.target.value)}
                    disabled={!canCreate}
                    placeholder="e.g. 600000"
                  />
                </HrmField>
              ) : null}

              <div className="sm:col-span-2">
                <HrmField label="Additional notes" hint="Optional paragraph appended to the letter">
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={3}
                    disabled={!canCreate}
                    placeholder="e.g. We appreciate your contribution to the mobile app project."
                  />
                </HrmField>
              </div>
            </div>

            {canCreate ? (
              <Button
                className={portalActionButtonClass()}
                disabled={!employeeId || !relievingDate || (letterType === "offer" && !resolvedOfferJoiningDate) || createMutation.isPending}
                onClick={() => void handleGenerate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ScrollText className="mr-2 h-4 w-4" />
                )}
                Generate & save letter
              </Button>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col min-h-[420px]">
            <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between bg-muted/20">
              <p className="text-sm font-semibold">Live preview</p>
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            <div className="flex-1 bg-slate-50/80 overflow-auto p-2">
              {previewHtml ? (
                <iframe
                  title="Letter preview"
                  srcDoc={previewHtml}
                  className="w-full min-h-[520px] rounded-md border border-border/40 bg-white"
                  sandbox=""
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center text-center px-6">
                  <p className="text-sm text-muted-foreground">
                    Select an employee and relieving date to preview the letter. Logo watermark and official seal
                    come from Settings → Organization.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <PortalTablePanel isLoading={lettersLoading}>
          <AdvancedTable
            data={letters}
            columns={columns}
            searchKey="employeeName"
            searchPlaceholder="Search saved letters…"
            filename="HrmExperienceLettersExport"
            viewStorageKey="hrm-experience-letters"
          />
          </PortalTablePanel>
        </div>

        <Dialog open={viewLetterId != null} onOpenChange={(open) => !open && setViewLetterId(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewLetter ? `${letterTypeLabel(viewLetter.letterType)} — ${viewLetter.employeeName}` : "Letter"}
              </DialogTitle>
            </DialogHeader>
            {viewLetterLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewLetter?.htmlContent ? (
              <iframe
                title="Letter view"
                srcDoc={viewLetter.htmlContent}
                className="w-full min-h-[480px] rounded-md border border-border/60 bg-white"
                sandbox=""
              />
            ) : null}
            {viewLetter ? (
              <HrmRefDetailSection title="Details">
                <HrmRefDetailRow label="Employee" value={viewLetter.employeeName} />
                <HrmRefDetailRow label="Joining" value={formatDisplayDate(viewLetter.joiningDate)} />
                <HrmRefDetailRow
                  label={viewLetter.letterType === "offer" ? "Offer date" : "Relieving"}
                  value={formatDisplayDate(viewLetter.relievingDate)}
                />
                {viewLetter.letterType === "offer" ? (
                  <HrmRefDetailRow
                    label="Offered CTC"
                    value={viewLetter.offeredCtc != null ? `₹${Number(viewLetter.offeredCtc).toLocaleString("en-IN")}` : "—"}
                  />
                ) : null}
                <HrmRefDetailRow
                  label="Email status"
                  value={viewLetter.emailSentAt ? `Sent to ${viewLetter.emailSentTo}` : "Not sent"}
                />
              </HrmRefDetailSection>
            ) : null}
            <DialogFooter className="gap-2">
              {viewLetter && canExport ? (
                <Button variant="outline" onClick={() => void handleDownload(viewLetter)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              ) : null}
              {viewLetter && canEdit ? (
                <Button onClick={() => void handleSend(viewLetter)} disabled={sendMutation.isPending}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email to employee
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this letter?</AlertDialogTitle>
              <AlertDialogDescription>
                The saved PDF and record will be removed. You can generate a new letter later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
