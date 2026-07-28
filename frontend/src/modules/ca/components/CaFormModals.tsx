import { useEffect, useState } from "react";
import { FileUploader } from "@/components/ui/file-uploader";
import { CaFormDialog, CaField, CaTextInput, CaTextArea, CaSelect } from "./CaFormDialog";
import {
  useCreateCaTask,
  useUpdateCaTask,
  useCreateCaDocument,
  useUpdateCaDocument,
  useCreateCaCalendarEvent,
  useUpdateCaCalendarEvent,
  useCreateCaNotice,
  useUpdateCaNotice,
  useCreateCaGstFiling,
  useUpdateCaGstFiling,
  useCreateCaTdsReturn,
  useUpdateCaTdsReturn,
  useCreateCaTdsCertificate,
  useUpdateCaTdsCertificate,
  useCreateCaDirectorItr,
  useUpdateCaDirectorItr,
  useCreateCaRocFiling,
  useUpdateCaRocFiling,
  useCreateCaDinDsc,
  useUpdateCaDinDsc,
  useCreateCaAudit,
  useUpdateCaAudit,
  useCreateCaSuspense,
  useUpdateCaSuspense,
  useAssignCaSuspense,
  useCreateCaCompanyItr,
  useUpdateCaCompanyItr,
  type CaTaskDto,
  type CaDocumentDto,
  type CaCalendarEventDto,
  type CaNoticeDto,
  type CaGstFilingDto,
  type CaTdsReturnDto,
  type CaTdsCertificateDto,
  type CaDirectorItrDto,
  type CaRocFilingDto,
  type CaDinDscDto,
  type CaAuditDto,
  type CaSuspenseDto,
  type CaCompanyItrDto,
} from "@/api/ca";
import { useListClients } from "@/api/generated/api";
import { useListVendors } from "@/api/finance";
import {
  DOCUMENT_CATEGORY_LABELS,
  NOTICE_DEPARTMENT_LABELS,
  NOTICE_WORKFLOW_LABELS,
  FILING_STATUS_LABELS,
  TASK_STATUS_LABELS,
  ROC_FORM_LABELS,
  AUDIT_PHASE_LABELS,
  PAYMENT_MODE_LABELS,
  COMPLIANCE_TIMING_LABELS,
} from "../constants";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

type ModalProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: T | null;
  readOnly?: boolean;
};

function modalTitle(readOnly: boolean | undefined, editing: unknown, entity: string) {
  if (readOnly) return `View ${entity}`;
  if (editing) return `Edit ${entity}`;
  return `New ${entity}`;
}

const filingStatusOptions = Object.entries(FILING_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const timingOptions = Object.entries(COMPLIANCE_TIMING_LABELS).map(([value, label]) => ({ value, label }));

async function saveOrToast(
  action: () => Promise<unknown>,
  onOpenChange: (v: boolean) => void,
  ok: string,
  fail: string,
) {
  try {
    await action();
    toast.success(ok);
    onOpenChange(false);
  } catch (err) {
    toastApiError(err, fail);
  }
}

export function CaTaskFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaTaskDto>) {
  const create = useCreateCaTask();
  const update = useUpdateCaTask();
  const [form, setForm] = useState({
    title: "",
    category: "GST",
    status: "pending",
    priority: "medium",
    dueDate: "",
    assignedByName: "",
    assignedToName: "",
    description: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: editing?.title ?? "",
      category: editing?.category ?? "GST",
      status: editing?.status ?? "pending",
      priority: editing?.priority ?? "medium",
      dueDate: editing?.dueDate ?? "",
      assignedByName: editing?.assignedBy && editing.assignedBy !== "—" ? editing.assignedBy : "",
      assignedToName: editing?.assignedTo && editing.assignedTo !== "—" ? editing.assignedTo : "",
      description: editing?.description ?? "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "task")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.title.trim()) return toast.error("Title is required");
        const payload = {
          title: form.title.trim(),
          category: form.category,
          status: form.status as CaTaskDto["status"],
          priority: form.priority as CaTaskDto["priority"],
          dueDate: form.dueDate || undefined,
          assignedByName: form.assignedByName || undefined,
          assignedToName: form.assignedToName || undefined,
          description: form.description || undefined,
        };
        void saveOrToast(
          () => (editing ? update.mutateAsync({ id: editing.id, ...payload }) : create.mutateAsync(payload)),
          onOpenChange,
          editing ? "Task updated" : "Task created",
          "Could not save task",
        );
      }}
    >
      <CaField label="Title">
        <CaTextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Category">
          <CaTextInput value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </CaField>
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Status">
          <CaSelect
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </CaField>
        <CaField label="Priority">
          <CaSelect
            value={form.priority}
            onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Assigned by">
          <CaTextInput value={form.assignedByName} onChange={(e) => setForm((f) => ({ ...f, assignedByName: e.target.value }))} />
        </CaField>
        <CaField label="Assigned to">
          <CaTextInput value={form.assignedToName} onChange={(e) => setForm((f) => ({ ...f, assignedToName: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Description">
        <CaTextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </CaField>
    </CaFormDialog>
  );
}

export function CaDocumentFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaDocumentDto>) {
  const create = useCreateCaDocument();
  const update = useUpdateCaDocument();
  const [form, setForm] = useState({
    title: "",
    category: "other",
    version: "1.0",
    fileUrl: "",
    linkedEntityType: "",
    linkedEntityId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: editing?.title ?? "",
      category: editing?.category ?? "other",
      version: editing?.version ?? "1.0",
      fileUrl: editing?.fileUrl ?? "",
      linkedEntityType: editing?.linkedEntityType ?? "",
      linkedEntityId: editing?.linkedEntityId != null ? String(editing.linkedEntityId) : "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "document")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.title.trim()) return toast.error("Title is required");
        const payload = {
          title: form.title.trim(),
          category: form.category as CaDocumentDto["category"],
          version: form.version,
          fileUrl: form.fileUrl || null,
          linkedEntityType: form.linkedEntityType || null,
          linkedEntityId: form.linkedEntityId ? Number(form.linkedEntityId) : null,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Document updated" : "Document created",
          "Could not save document",
        );
      }}
    >
      <CaField label="Title">
        <CaTextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Category">
          <CaSelect
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </CaField>
        <CaField label="Version">
          <CaTextInput value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Linked to">
          <CaSelect
            value={form.linkedEntityType || "none"}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                linkedEntityType: v === "none" ? "" : v,
                linkedEntityId: v === "none" ? "" : f.linkedEntityId,
              }))
            }
            options={[
              { value: "none", label: "None" },
              { value: "gst_filing", label: "GST filing" },
              { value: "tds_return", label: "TDS return" },
              { value: "roc_filing", label: "ROC filing" },
              { value: "notice", label: "Notice" },
              { value: "company_itr", label: "Company ITR" },
              { value: "director_itr", label: "Director ITR" },
              { value: "audit", label: "Audit" },
              { value: "task", label: "Task" },
            ]}
          />
        </CaField>
        <CaField label="Linked ID">
          <CaTextInput
            type="number"
            placeholder="Record id"
            value={form.linkedEntityId}
            onChange={(e) => setForm((f) => ({ ...f, linkedEntityId: e.target.value }))}
            disabled={!form.linkedEntityType}
          />
        </CaField>
      </div>
      <CaField label="File">
        <FileUploader
          accept="image/*,.pdf,.doc,.docx"
          category="ca"
          onUploadComplete={(url) => {
            if (!url) return;
            setForm((f) => ({ ...f, fileUrl: url }));
            toast.success("File uploaded");
          }}
        />
        {form.fileUrl ? (
          <p className="text-[10px] text-muted-foreground truncate mt-1">{form.fileUrl}</p>
        ) : null}
      </CaField>
    </CaFormDialog>
  );
}

export function CaCalendarFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaCalendarEventDto>) {
  const create = useCreateCaCalendarEvent();
  const update = useUpdateCaCalendarEvent();
  const [form, setForm] = useState({
    title: "",
    category: "GST",
    dueDate: "",
    status: "upcoming",
    ownerName: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: editing?.title ?? "",
      category: editing?.category ?? "GST",
      dueDate: editing?.dueDate ?? "",
      status: editing?.status ?? "upcoming",
      ownerName: editing?.ownerName ?? "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "calendar event")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.title.trim() || !form.dueDate) return toast.error("Title and due date are required");
        const payload = {
          title: form.title.trim(),
          category: form.category as CaCalendarEventDto["category"],
          dueDate: form.dueDate,
          status: form.status as CaCalendarEventDto["status"],
          ownerName: form.ownerName || null,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Item updated" : "Item created",
          "Could not save calendar item",
        );
      }}
    >
      <CaField label="Title">
        <CaTextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Category">
          <CaSelect
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={["GST", "TDS", "ROC", "ITR", "Audit"].map((v) => ({ value: v, label: v }))}
          />
        </CaField>
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Status">
          <CaSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} options={timingOptions} />
        </CaField>
        <CaField label="Owner">
          <CaTextInput value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
        </CaField>
      </div>
    </CaFormDialog>
  );
}

export function CaNoticeFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
  defaultDepartment = "gst",
  lockDepartment = false,
}: ModalProps<CaNoticeDto> & {
  defaultDepartment?: string;
  lockDepartment?: boolean;
}) {
  const create = useCreateCaNotice();
  const update = useUpdateCaNotice();
  const [form, setForm] = useState({
    department: defaultDepartment,
    reference: "",
    subject: "",
    receivedAt: "",
    dueDate: "",
    workflowStatus: "received",
    assignedToName: "",
    replyNotes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      department: editing?.department ?? defaultDepartment,
      reference: editing?.reference ?? "",
      subject: editing?.subject ?? "",
      receivedAt: editing?.receivedAt ?? new Date().toISOString().slice(0, 10),
      dueDate: editing?.dueDate ?? "",
      workflowStatus: editing?.workflowStatus ?? "received",
      assignedToName: editing?.assignedTo && editing.assignedTo !== "—" ? editing.assignedTo : "",
      replyNotes: editing?.replyNotes ?? "",
    });
  }, [open, editing, defaultDepartment]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "notice")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.reference.trim() || !form.subject.trim() || !form.dueDate) {
          return toast.error("Reference, subject, and due date are required");
        }
        const payload = {
          department: form.department as CaNoticeDto["department"],
          reference: form.reference.trim(),
          subject: form.subject.trim(),
          receivedAt: form.receivedAt,
          dueDate: form.dueDate,
          workflowStatus: form.workflowStatus as CaNoticeDto["workflowStatus"],
          assignedToName: form.assignedToName || null,
          replyNotes: form.replyNotes.trim() || null,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Notice updated" : "Notice created",
          "Could not save notice",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Department">
          <CaSelect
            value={form.department}
            onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
            options={Object.entries(NOTICE_DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }))}
            disabled={lockDepartment}
          />
        </CaField>
        <CaField label="Workflow">
          <CaSelect
            value={form.workflowStatus}
            onValueChange={(v) => setForm((f) => ({ ...f, workflowStatus: v }))}
            options={Object.entries(NOTICE_WORKFLOW_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </CaField>
      </div>
      <CaField label="Reference">
        <CaTextInput value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
      </CaField>
      <CaField label="Subject">
        <CaTextInput value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Received">
          <CaTextInput type="date" value={form.receivedAt} onChange={(e) => setForm((f) => ({ ...f, receivedAt: e.target.value }))} />
        </CaField>
        <CaField label="Due">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Assigned to">
        <CaTextInput value={form.assignedToName} onChange={(e) => setForm((f) => ({ ...f, assignedToName: e.target.value }))} />
      </CaField>
      <CaField label="Reply / correspondence notes">
        <CaTextArea
          value={form.replyNotes}
          onChange={(e) => setForm((f) => ({ ...f, replyNotes: e.target.value }))}
          placeholder="Draft reply, portal acknowledgement, or follow-up notes…"
        />
      </CaField>
    </CaFormDialog>
  );
}

export function CaGstFilingFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaGstFilingDto>) {
  const create = useCreateCaGstFiling();
  const update = useUpdateCaGstFiling();
  const [form, setForm] = useState({
    returnType: "GSTR-3B",
    period: "",
    dueDate: "",
    status: "pending",
    filedAt: "",
    lateFee: "0",
    interest: "0",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      returnType: editing?.returnType ?? "GSTR-3B",
      period: editing?.period ?? "",
      dueDate: editing?.dueDate ?? "",
      status: editing?.status ?? "pending",
      filedAt: editing?.filedAt ?? "",
      lateFee: String(editing?.lateFee ?? 0),
      interest: String(editing?.interest ?? 0),
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "GST filing")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.period || !form.dueDate) return toast.error("Period and due date are required");
        const payload = {
          returnType: form.returnType as CaGstFilingDto["returnType"],
          period: form.period,
          dueDate: form.dueDate,
          status: form.status as CaGstFilingDto["status"],
          filedAt: form.filedAt || undefined,
          lateFee: Number(form.lateFee) || 0,
          interest: Number(form.interest) || 0,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Filing updated" : "Filing created",
          "Could not save GST filing",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Return">
          <CaSelect
            value={form.returnType}
            onValueChange={(v) => setForm((f) => ({ ...f, returnType: v }))}
            options={[
              { value: "GSTR-1", label: "GSTR-1" },
              { value: "GSTR-3B", label: "GSTR-3B" },
            ]}
          />
        </CaField>
        <CaField label="Period">
          <CaTextInput placeholder="May 2026" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
        <CaField label="Status">
          <CaSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} options={filingStatusOptions} />
        </CaField>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <CaField label="Filed on">
          <CaTextInput type="date" value={form.filedAt} onChange={(e) => setForm((f) => ({ ...f, filedAt: e.target.value }))} />
        </CaField>
        <CaField label="Late fee">
          <CaTextInput type="number" value={form.lateFee} onChange={(e) => setForm((f) => ({ ...f, lateFee: e.target.value }))} />
        </CaField>
        <CaField label="Interest">
          <CaTextInput type="number" value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} />
        </CaField>
      </div>
    </CaFormDialog>
  );
}

export function CaTdsReturnFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaTdsReturnDto>) {
  const create = useCreateCaTdsReturn();
  const update = useUpdateCaTdsReturn();
  const [form, setForm] = useState({ returnType: "26Q", quarter: "", dueDate: "", status: "pending" });

  useEffect(() => {
    if (!open) return;
    setForm({
      returnType: editing?.returnType ?? "26Q",
      quarter: editing?.quarter ?? "",
      dueDate: editing?.dueDate ?? "",
      status: editing?.status ?? "pending",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "TDS return")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.quarter || !form.dueDate) return toast.error("Quarter and due date are required");
        const payload = {
          returnType: form.returnType as CaTdsReturnDto["returnType"],
          quarter: form.quarter,
          dueDate: form.dueDate,
          status: form.status as CaTdsReturnDto["status"],
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Return updated" : "Return created",
          "Could not save TDS return",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Return">
          <CaSelect
            value={form.returnType}
            onValueChange={(v) => setForm((f) => ({ ...f, returnType: v }))}
            options={["24Q", "26Q", "27Q"].map((v) => ({ value: v, label: v }))}
          />
        </CaField>
        <CaField label="Quarter">
          <CaTextInput placeholder="Q4 FY25-26" value={form.quarter} onChange={(e) => setForm((f) => ({ ...f, quarter: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
        <CaField label="Status">
          <CaSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} options={filingStatusOptions} />
        </CaField>
      </div>
    </CaFormDialog>
  );
}

export function CaTdsCertificateFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaTdsCertificateDto>) {
  const create = useCreateCaTdsCertificate();
  const update = useUpdateCaTdsCertificate();
  const [form, setForm] = useState({ form: "16A", party: "", pan: "", amount: "", issued: "false" });

  useEffect(() => {
    if (!open) return;
    setForm({
      form: editing?.form ?? "16A",
      party: editing?.party ?? "",
      pan: editing?.pan ?? "",
      amount: String(editing?.amount ?? ""),
      issued: editing?.issued ? "true" : "false",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "TDS certificate")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.party || !form.pan) return toast.error("Party and PAN are required");
        const payload = {
          form: form.form as CaTdsCertificateDto["form"],
          party: form.party,
          pan: form.pan,
          amount: Number(form.amount) || 0,
          issued: form.issued === "true",
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Certificate updated" : "Certificate created",
          "Could not save certificate",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Form">
          <CaSelect
            value={form.form}
            onValueChange={(v) => setForm((f) => ({ ...f, form: v }))}
            options={[
              { value: "16", label: "Form 16" },
              { value: "16A", label: "Form 16A" },
            ]}
          />
        </CaField>
        <CaField label="Issued">
          <CaSelect
            value={form.issued}
            onValueChange={(v) => setForm((f) => ({ ...f, issued: v }))}
            options={[
              { value: "false", label: "Pending" },
              { value: "true", label: "Issued" },
            ]}
          />
        </CaField>
      </div>
      <CaField label="Party">
        <CaTextInput value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="PAN">
          <CaTextInput value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} />
        </CaField>
        <CaField label="Amount">
          <CaTextInput type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        </CaField>
      </div>
    </CaFormDialog>
  );
}

export function CaDirectorItrFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaDirectorItrDto>) {
  const create = useCreateCaDirectorItr();
  const update = useUpdateCaDirectorItr();
  const [form, setForm] = useState({
    directorName: "",
    pan: "",
    financialYear: "",
    filingStatus: "pending",
    dueDate: "",
    taxLiability: "0",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      directorName: editing?.directorName ?? "",
      pan: editing?.pan ?? "",
      financialYear: editing?.financialYear ?? "",
      filingStatus: editing?.filingStatus ?? "pending",
      dueDate: editing?.dueDate ?? "",
      taxLiability: String(editing?.taxLiability ?? 0),
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "director ITR")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.directorName || !form.pan || !form.financialYear || !form.dueDate) {
          return toast.error("Name, PAN, FY, and due date are required");
        }
        const payload = {
          directorName: form.directorName,
          pan: form.pan,
          financialYear: form.financialYear,
          filingStatus: form.filingStatus as CaDirectorItrDto["filingStatus"],
          dueDate: form.dueDate,
          taxLiability: Number(form.taxLiability) || 0,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Record updated" : "Record created",
          "Could not save director ITR",
        );
      }}
    >
      <CaField label="Director">
        <CaTextInput value={form.directorName} onChange={(e) => setForm((f) => ({ ...f, directorName: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="PAN">
          <CaTextInput value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} />
        </CaField>
        <CaField label="Financial year">
          <CaTextInput placeholder="2025-26" value={form.financialYear} onChange={(e) => setForm((f) => ({ ...f, financialYear: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Status">
          <CaSelect value={form.filingStatus} onValueChange={(v) => setForm((f) => ({ ...f, filingStatus: v }))} options={filingStatusOptions} />
        </CaField>
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Tax liability">
        <CaTextInput type="number" value={form.taxLiability} onChange={(e) => setForm((f) => ({ ...f, taxLiability: e.target.value }))} />
      </CaField>
    </CaFormDialog>
  );
}

export function CaRocFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaRocFilingDto>) {
  const create = useCreateCaRocFiling();
  const update = useUpdateCaRocFiling();
  const [form, setForm] = useState({ form: "AOC-4", financialYear: "", dueDate: "", status: "pending" });

  useEffect(() => {
    if (!open) return;
    setForm({
      form: editing?.form ?? "AOC-4",
      financialYear: editing?.financialYear ?? "",
      dueDate: editing?.dueDate ?? "",
      status: editing?.status ?? "pending",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "ROC filing")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.financialYear || !form.dueDate) return toast.error("FY and due date are required");
        const payload = {
          form: form.form as CaRocFilingDto["form"],
          financialYear: form.financialYear,
          dueDate: form.dueDate,
          status: form.status as CaRocFilingDto["status"],
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Filing updated" : "Filing created",
          "Could not save ROC filing",
        );
      }}
    >
      <CaField label="Form">
        <CaSelect
          value={form.form}
          onValueChange={(v) => setForm((f) => ({ ...f, form: v }))}
          options={Object.entries(ROC_FORM_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Financial year">
          <CaTextInput value={form.financialYear} onChange={(e) => setForm((f) => ({ ...f, financialYear: e.target.value }))} />
        </CaField>
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Status">
        <CaSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} options={filingStatusOptions} />
      </CaField>
    </CaFormDialog>
  );
}

export function CaDinDscFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaDinDscDto>) {
  const create = useCreateCaDinDsc();
  const update = useUpdateCaDinDsc();
  const [form, setForm] = useState({ directorName: "", din: "", dscExpiry: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      directorName: editing?.directorName ?? "",
      din: editing?.din ?? "",
      dscExpiry: editing?.dscExpiry ?? "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "DIN / DSC")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.directorName || !form.din || !form.dscExpiry) {
          return toast.error("Director, DIN, and DSC expiry are required");
        }
        const payload = { directorName: form.directorName, din: form.din, dscExpiry: form.dscExpiry };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Record updated" : "Record created",
          "Could not save DIN/DSC",
        );
      }}
    >
      <CaField label="Director">
        <CaTextInput value={form.directorName} onChange={(e) => setForm((f) => ({ ...f, directorName: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="DIN">
          <CaTextInput value={form.din} onChange={(e) => setForm((f) => ({ ...f, din: e.target.value }))} />
        </CaField>
        <CaField label="DSC expiry">
          <CaTextInput type="date" value={form.dscExpiry} onChange={(e) => setForm((f) => ({ ...f, dscExpiry: e.target.value }))} />
        </CaField>
      </div>
    </CaFormDialog>
  );
}

export function CaAuditFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaAuditDto>) {
  const create = useCreateCaAudit();
  const update = useUpdateCaAudit();
  const [form, setForm] = useState({
    type: "statutory",
    auditor: "",
    financialYear: "",
    phase: "planning",
    observations: "0",
    status: "upcoming",
    firm: "",
    partner: "",
    membershipNo: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      type: editing?.type ?? "statutory",
      auditor: editing?.auditor ?? "",
      financialYear: editing?.financialYear ?? "",
      phase: editing?.phase ?? "planning",
      observations: String(editing?.observations ?? 0),
      status: editing?.status ?? "upcoming",
      firm: editing?.firm ?? "",
      partner: editing?.partner ?? "",
      membershipNo: editing?.membershipNo ?? "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "audit")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.auditor || !form.financialYear) return toast.error("Auditor and FY are required");
        const payload = {
          type: form.type as CaAuditDto["type"],
          auditor: form.auditor,
          financialYear: form.financialYear,
          phase: form.phase as CaAuditDto["phase"],
          observations: Number(form.observations) || 0,
          status: form.status as CaAuditDto["status"],
          firm: form.firm || null,
          partner: form.partner || null,
          membershipNo: form.membershipNo || null,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Audit updated" : "Audit created",
          "Could not save audit",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Type">
          <CaSelect
            value={form.type}
            onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={[
              { value: "internal", label: "Internal" },
              { value: "statutory", label: "Statutory" },
            ]}
          />
        </CaField>
        <CaField label="Phase">
          <CaSelect
            value={form.phase}
            onValueChange={(v) => setForm((f) => ({ ...f, phase: v }))}
            options={Object.entries(AUDIT_PHASE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </CaField>
      </div>
      <CaField label="Auditor">
        <CaTextInput value={form.auditor} onChange={(e) => setForm((f) => ({ ...f, auditor: e.target.value }))} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Financial year">
          <CaTextInput value={form.financialYear} onChange={(e) => setForm((f) => ({ ...f, financialYear: e.target.value }))} />
        </CaField>
        <CaField label="Observations">
          <CaTextInput type="number" value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Status">
        <CaSelect value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))} options={timingOptions} />
      </CaField>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Firm">
          <CaTextInput value={form.firm} onChange={(e) => setForm((f) => ({ ...f, firm: e.target.value }))} />
        </CaField>
        <CaField label="Partner">
          <CaTextInput value={form.partner} onChange={(e) => setForm((f) => ({ ...f, partner: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Membership no.">
        <CaTextInput value={form.membershipNo} onChange={(e) => setForm((f) => ({ ...f, membershipNo: e.target.value }))} />
      </CaField>
    </CaFormDialog>
  );
}

export function CaSuspenseFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaSuspenseDto>) {
  const create = useCreateCaSuspense();
  const update = useUpdateCaSuspense();
  const [form, setForm] = useState({
    receivedAt: "",
    amount: "",
    bankRef: "",
    mode: "neft",
    remarks: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      receivedAt: editing?.receivedAt ?? new Date().toISOString().slice(0, 10),
      amount: String(editing?.amount ?? ""),
      bankRef: editing?.bankRef ?? "",
      mode: editing?.mode ?? "neft",
      remarks: editing?.remarks ?? "",
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "suspense entry")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.bankRef || !form.amount || !form.receivedAt) {
          return toast.error("Bank ref, amount, and date are required");
        }
        const payload = {
          receivedAt: form.receivedAt,
          amount: Number(form.amount) || 0,
          bankRef: form.bankRef,
          mode: form.mode as CaSuspenseDto["mode"],
          remarks: form.remarks,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "Entry updated" : "Entry created",
          "Could not save suspense entry",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Received">
          <CaTextInput type="date" value={form.receivedAt} onChange={(e) => setForm((f) => ({ ...f, receivedAt: e.target.value }))} />
        </CaField>
        <CaField label="Amount">
          <CaTextInput type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Bank ref">
          <CaTextInput value={form.bankRef} onChange={(e) => setForm((f) => ({ ...f, bankRef: e.target.value }))} />
        </CaField>
        <CaField label="Mode">
          <CaSelect
            value={form.mode}
            onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}
            options={Object.entries(PAYMENT_MODE_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </CaField>
      </div>
      <CaField label="Remarks">
        <CaTextArea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
      </CaField>
    </CaFormDialog>
  );
}

export function CaSuspenseAssignModal({
  open,
  onOpenChange,
  entry,
  initialTarget = "client",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CaSuspenseDto | null;
  initialTarget?: "client" | "vendor";
}) {
  const assign = useAssignCaSuspense();
  const { data: clientsData } = useListClients({ limit: 200 }, { query: { enabled: open } });
  const { data: vendorsData } = useListVendors(undefined, open);
  const [target, setTarget] = useState<"client" | "vendor">("client");
  const [partyId, setPartyId] = useState("");

  useEffect(() => {
    if (open) {
      setTarget(initialTarget);
      setPartyId("");
    }
  }, [open, entry, initialTarget]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign suspense entry"
      saving={assign.isPending}
      submitLabel="Assign & create payment"
      onSubmit={() => {
        if (!entry || !partyId) return toast.error("Select a client or vendor");
        const id = Number(partyId);
        void saveOrToast(
          () =>
            assign.mutateAsync({
              id: entry.id,
              clientId: target === "client" ? id : null,
              vendorId: target === "vendor" ? id : null,
            }),
          onOpenChange,
          "Suspense assigned — Finance payment created",
          "Could not assign suspense entry",
        );
      }}
    >
      <p className="text-xs text-muted-foreground -mt-1 mb-1">
        Creates a Finance payment (source of truth) and closes this suspense row.
      </p>
      <CaField label="Assign to">
        <CaSelect
          value={target}
          onValueChange={(v) => {
            setTarget(v as "client" | "vendor");
            setPartyId("");
          }}
          options={[
            { value: "client", label: "Client (incoming)" },
            { value: "vendor", label: "Vendor (outgoing)" },
          ]}
        />
      </CaField>
      <CaField label={target === "client" ? "Client" : "Vendor"}>
        <CaSelect
          value={partyId || "none"}
          onValueChange={(v) => setPartyId(v === "none" ? "" : v)}
          placeholder={`Select ${target}`}
          options={[
            { value: "none", label: `Select ${target}…` },
            ...(target === "client"
              ? (clientsData?.clients ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.companyName ?? `Client #${c.id}`,
                }))
              : (vendorsData?.vendors ?? []).map((v) => ({
                  value: String(v.id),
                  label: v.name,
                }))),
          ]}
        />
      </CaField>
    </CaFormDialog>
  );
}

export function CaCompanyItrFormModal({ open, onOpenChange, editing, readOnly = false }: ModalProps<CaCompanyItrDto>) {
  const create = useCreateCaCompanyItr();
  const update = useUpdateCaCompanyItr();
  const [form, setForm] = useState({
    financialYear: "",
    revenue: "0",
    expenses: "0",
    profitBeforeTax: "0",
    taxLiability: "0",
    filingStatus: "draft",
    dueDate: "",
    documents: [] as Array<{ id: number; name: string; uploaded: boolean; fileUrl?: string | null }>,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      financialYear: editing?.financialYear ?? "",
      revenue: String(editing?.revenue ?? 0),
      expenses: String(editing?.expenses ?? 0),
      profitBeforeTax: String(editing?.profitBeforeTax ?? 0),
      taxLiability: String(editing?.taxLiability ?? 0),
      filingStatus: editing?.filingStatus ?? "draft",
      dueDate: editing?.dueDate ?? "",
      documents: editing?.documents ?? [
        { id: 1, name: "Audited financials", uploaded: false },
        { id: 2, name: "Tax computation", uploaded: false },
        { id: 3, name: "ITR acknowledgement", uploaded: false },
      ],
    });
  }, [open, editing]);

  return (
    <CaFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "company ITR")}
      readOnly={readOnly}
      saving={create.isPending || update.isPending}
      onSubmit={() => {
        if (!form.financialYear || !form.dueDate) return toast.error("FY and due date are required");
        const payload = {
          financialYear: form.financialYear,
          revenue: Number(form.revenue) || 0,
          expenses: Number(form.expenses) || 0,
          profitBeforeTax: Number(form.profitBeforeTax) || 0,
          taxLiability: Number(form.taxLiability) || 0,
          filingStatus: form.filingStatus as CaCompanyItrDto["filingStatus"],
          dueDate: form.dueDate,
          documents: form.documents,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...payload })
              : create.mutateAsync(payload),
          onOpenChange,
          editing ? "ITR updated" : "ITR created",
          "Could not save company ITR",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Financial year">
          <CaTextInput value={form.financialYear} onChange={(e) => setForm((f) => ({ ...f, financialYear: e.target.value }))} />
        </CaField>
        <CaField label="Due date">
          <CaTextInput type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Revenue">
          <CaTextInput type="number" value={form.revenue} onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))} />
        </CaField>
        <CaField label="Expenses">
          <CaTextInput type="number" value={form.expenses} onChange={(e) => setForm((f) => ({ ...f, expenses: e.target.value }))} />
        </CaField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CaField label="Profit before tax">
          <CaTextInput type="number" value={form.profitBeforeTax} onChange={(e) => setForm((f) => ({ ...f, profitBeforeTax: e.target.value }))} />
        </CaField>
        <CaField label="Tax liability">
          <CaTextInput type="number" value={form.taxLiability} onChange={(e) => setForm((f) => ({ ...f, taxLiability: e.target.value }))} />
        </CaField>
      </div>
      <CaField label="Status">
        <CaSelect value={form.filingStatus} onValueChange={(v) => setForm((f) => ({ ...f, filingStatus: v }))} options={filingStatusOptions} />
      </CaField>
      <CaField label="Checklist uploads">
        <div className="space-y-2">
          {form.documents.map((doc, idx) => (
            <div key={doc.id} className="rounded border p-2 space-y-1">
              <p className="text-xs font-medium">{doc.name}</p>
              <FileUploader
                accept="image/*,.pdf"
                category="ca"
                onUploadComplete={(url) => {
                  if (!url) return;
                  setForm((f) => {
                    const documents = [...f.documents];
                    documents[idx] = { ...documents[idx], uploaded: true, fileUrl: url };
                    return { ...f, documents };
                  });
                  toast.success(`${doc.name} uploaded`);
                }}
              />
            </div>
          ))}
        </div>
      </CaField>
    </CaFormDialog>
  );
}
