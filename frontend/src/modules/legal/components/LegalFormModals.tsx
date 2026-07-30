import { useEffect, useState } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import {
  useLegalCounsel,
  useCreateLegalCase,
  useUpdateLegalCase,
  useCreateLegalVendorDispute,
  useUpdateLegalVendorDispute,
  useCreateLegalClientMatter,
  useUpdateLegalClientMatter,
  useCreateLegalNda,
  useUpdateLegalNda,
  useCreateLegalAgreement,
  useUpdateLegalAgreement,
  useCreateLegalNotice,
  useUpdateLegalNotice,
  useCreateLegalCourtCase,
  useUpdateLegalCourtCase,
  useCreateLegalCompliance,
  useUpdateLegalCompliance,
  useCreateLegalExpense,
  useUpdateLegalExpense,
  useCreateLegalCounsel,
  useUpdateLegalCounsel,
} from "@/api/legal";
import type {
  AgreementRecord,
  ClientMatter,
  ComplianceItem,
  CourtCase,
  EmployeeLegalCase,
  LegalCounsel,
  LegalExpense,
  LegalNotice,
  NdaRecord,
  VendorDispute,
} from "@/modules/legal/types";
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  VENDOR_DISPUTE_STATUS_LABELS,
  CLIENT_MATTER_STATUS_LABELS,
  NDA_STATUS_LABELS,
  AGREEMENT_STATUS_LABELS,
  NOTICE_STATUS_LABELS,
  COURT_CASE_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  RISK_LABELS,
  COUNSEL_ROLE_LABELS,
} from "@/modules/legal/constants";
import {
  LegalFormDialog,
  LegalField,
  LegalTextInput,
  LegalTextArea,
  LegalSelect,
} from "./LegalFormDialog";

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

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toDateTimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function optionsFrom(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function useCounselOptions() {
  const { data } = useLegalCounsel({ limit: 200 });
  const list = data?.counsel ?? [];
  return list.map((c) => ({ value: String(c.id), label: c.name }));
}

function CounselSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = useCounselOptions();
  return (
    <div className="space-y-1">
      <LegalSelect
        value={value}
        onValueChange={onChange}
        placeholder={options.length ? "Select counsel" : "No counsel yet"}
        options={options}
      />
      {!options.length ? (
        <p className="text-[10px] text-muted-foreground">
          Add people on{" "}
          <a href="/legal/counsel" className="text-primary underline underline-offset-2">
            Counsel
          </a>{" "}
          first.
        </p>
      ) : null}
    </div>
  );
}

export function LegalCounselFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<LegalCounsel>) {
  const create = useCreateLegalCounsel();
  const update = useUpdateLegalCounsel();
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "associate",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: editing?.name ?? "",
      email: editing?.email ?? "",
      role: editing?.role ?? "associate",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "counsel")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.name.trim() || !form.email.trim()) {
          toast.error("Name and email are required");
          return;
        }
        const body = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Counsel updated" : "Counsel added",
          "Could not save counsel",
        );
      }}
    >
      <LegalField label="Name">
        <LegalTextInput
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Email">
        <LegalTextInput
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Role">
        <LegalSelect
          value={form.role}
          onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
          options={optionsFrom(COUNSEL_ROLE_LABELS)}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalCaseFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<EmployeeLegalCase>) {
  const create = useCreateLegalCase();
  const update = useUpdateLegalCase();
  const [form, setForm] = useState({
    employeeName: "",
    department: "",
    type: "other",
    status: "open",
    risk: "medium",
    assignedToId: "",
    summary: "",
    nextHearing: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      employeeName: editing?.employeeName ?? "",
      department: editing?.department ?? "",
      type: editing?.type ?? "other",
      status: editing?.status ?? "open",
      risk: editing?.risk ?? "medium",
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
      summary: editing?.summary ?? "",
      nextHearing: toDateTimeLocal(editing?.nextHearing),
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "employee case")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.employeeName || !form.department || !form.summary || !form.assignedToId) {
          toast.error("Employee, department, summary, and counsel are required");
          return;
        }
        const body = {
          employeeName: form.employeeName,
          department: form.department,
          type: form.type,
          status: form.status,
          risk: form.risk,
          assignedToId: Number(form.assignedToId),
          summary: form.summary,
          nextHearing: form.nextHearing || null,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Case updated" : "Case opened",
          "Could not save case",
        );
      }}
    >
      <LegalField label="Employee">
        <LegalTextInput
          value={form.employeeName}
          onChange={(e) => setForm((f) => ({ ...f, employeeName: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Department">
        <LegalTextInput
          value={form.department}
          onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Type">
        <LegalSelect
          value={form.type}
          onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
          options={optionsFrom(CASE_TYPE_LABELS)}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(CASE_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
      <LegalField label="Next hearing">
        <LegalTextInput
          type="datetime-local"
          value={form.nextHearing}
          onChange={(e) => setForm((f) => ({ ...f, nextHearing: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Summary">
        <LegalTextArea
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalVendorDisputeFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<VendorDispute>) {
  const create = useCreateLegalVendorDispute();
  const update = useUpdateLegalVendorDispute();
  const [form, setForm] = useState({
    vendorName: "",
    contractRef: "",
    status: "open",
    risk: "medium",
    amountInDispute: "",
    assignedToId: "",
    summary: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      vendorName: editing?.vendorName ?? "",
      contractRef: editing?.contractRef ?? "",
      status: editing?.status ?? "open",
      risk: editing?.risk ?? "medium",
      amountInDispute: editing ? String(editing.amountInDispute) : "",
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
      summary: editing?.summary ?? "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "vendor dispute")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.vendorName || !form.contractRef || !form.summary || !form.assignedToId) {
          toast.error("Vendor, contract, summary, and counsel are required");
          return;
        }
        const body = {
          vendorName: form.vendorName,
          contractRef: form.contractRef,
          status: form.status,
          risk: form.risk,
          amountInDispute: Number(form.amountInDispute) || 0,
          assignedToId: Number(form.assignedToId),
          summary: form.summary,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Dispute updated" : "Dispute logged",
          "Could not save dispute",
        );
      }}
    >
      <LegalField label="Vendor">
        <LegalTextInput
          value={form.vendorName}
          onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Contract ref">
        <LegalTextInput
          value={form.contractRef}
          onChange={(e) => setForm((f) => ({ ...f, contractRef: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Amount in dispute">
        <LegalTextInput
          type="number"
          min={0}
          value={form.amountInDispute}
          onChange={(e) => setForm((f) => ({ ...f, amountInDispute: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(VENDOR_DISPUTE_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
      <LegalField label="Summary">
        <LegalTextArea
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalClientMatterFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<ClientMatter>) {
  const create = useCreateLegalClientMatter();
  const update = useUpdateLegalClientMatter();
  const [form, setForm] = useState({
    clientName: "",
    matterTitle: "",
    status: "active",
    risk: "medium",
    contractValue: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      clientName: editing?.clientName ?? "",
      matterTitle: editing?.matterTitle ?? "",
      status: editing?.status ?? "active",
      risk: editing?.risk ?? "medium",
      contractValue: editing ? String(editing.contractValue) : "",
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "client matter")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.clientName || !form.matterTitle || !form.assignedToId) {
          toast.error("Client, matter title, and counsel are required");
          return;
        }
        const body = {
          clientName: form.clientName,
          matterTitle: form.matterTitle,
          status: form.status,
          risk: form.risk,
          contractValue: Number(form.contractValue) || 0,
          assignedToId: Number(form.assignedToId),
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Matter updated" : "Matter created",
          "Could not save matter",
        );
      }}
    >
      <LegalField label="Client">
        <LegalTextInput
          value={form.clientName}
          onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Matter title">
        <LegalTextInput
          value={form.matterTitle}
          onChange={(e) => setForm((f) => ({ ...f, matterTitle: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Contract value">
        <LegalTextInput
          type="number"
          min={0}
          value={form.contractValue}
          onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(CLIENT_MATTER_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalNdaFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<NdaRecord>) {
  const create = useCreateLegalNda();
  const update = useUpdateLegalNda();
  const [form, setForm] = useState({
    partyName: "",
    partyType: "vendor",
    status: "draft",
    risk: "low",
    signedAt: "",
    expiresAt: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      partyName: editing?.partyName ?? "",
      partyType: editing?.partyType ?? "vendor",
      status: editing?.status ?? "draft",
      risk: editing?.risk ?? "low",
      signedAt: toDateInput(editing?.signedAt),
      expiresAt: toDateInput(editing?.expiresAt),
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "NDA")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.partyName || !form.expiresAt || !form.assignedToId) {
          toast.error("Party, expiry, and counsel are required");
          return;
        }
        const body = {
          partyName: form.partyName,
          partyType: form.partyType,
          status: form.status,
          risk: form.risk,
          signedAt: form.signedAt || null,
          expiresAt: form.expiresAt,
          assignedToId: Number(form.assignedToId),
        };
        void saveOrToast(
          () =>
            editing ? update.mutateAsync({ id: editing.id, ...body }) : create.mutateAsync(body),
          onOpenChange,
          editing ? "NDA updated" : "NDA added",
          "Could not save NDA",
        );
      }}
    >
      <LegalField label="Party">
        <LegalTextInput
          value={form.partyName}
          onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Party type">
        <LegalSelect
          value={form.partyType}
          onValueChange={(v) => setForm((f) => ({ ...f, partyType: v }))}
          options={[
            { value: "employee", label: "Employee" },
            { value: "vendor", label: "Vendor" },
            { value: "client", label: "Client" },
            { value: "partner", label: "Partner" },
          ]}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(NDA_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Signed">
        <LegalTextInput
          type="date"
          value={form.signedAt}
          onChange={(e) => setForm((f) => ({ ...f, signedAt: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Expires">
        <LegalTextInput
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalAgreementFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<AgreementRecord>) {
  const create = useCreateLegalAgreement();
  const update = useUpdateLegalAgreement();
  const [form, setForm] = useState({
    title: "",
    counterparty: "",
    type: "msa",
    status: "draft",
    risk: "low",
    effectiveFrom: "",
    renewalDate: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: editing?.title ?? "",
      counterparty: editing?.counterparty ?? "",
      type: editing?.type ?? "msa",
      status: editing?.status ?? "draft",
      risk: editing?.risk ?? "low",
      effectiveFrom: toDateInput(editing?.effectiveFrom),
      renewalDate: toDateInput(editing?.renewalDate),
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "agreement")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.title || !form.counterparty || !form.effectiveFrom || !form.renewalDate || !form.assignedToId) {
          toast.error("Title, counterparty, dates, and counsel are required");
          return;
        }
        const body = {
          title: form.title,
          counterparty: form.counterparty,
          type: form.type,
          status: form.status,
          risk: form.risk,
          effectiveFrom: form.effectiveFrom,
          renewalDate: form.renewalDate,
          assignedToId: Number(form.assignedToId),
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Agreement updated" : "Agreement created",
          "Could not save agreement",
        );
      }}
    >
      <LegalField label="Title">
        <LegalTextInput
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Counterparty">
        <LegalTextInput
          value={form.counterparty}
          onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Type">
        <LegalSelect
          value={form.type}
          onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
          options={[
            { value: "msa", label: "MSA" },
            { value: "sla", label: "SLA" },
            { value: "employment", label: "Employment" },
            { value: "vendor", label: "Vendor" },
            { value: "license", label: "License" },
          ]}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(AGREEMENT_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Effective from">
        <LegalTextInput
          type="date"
          value={form.effectiveFrom}
          onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Renewal date">
        <LegalTextInput
          type="date"
          value={form.renewalDate}
          onChange={(e) => setForm((f) => ({ ...f, renewalDate: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalNoticeFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<LegalNotice>) {
  const create = useCreateLegalNotice();
  const update = useUpdateLegalNotice();
  const [form, setForm] = useState({
    subject: "",
    counterparty: "",
    direction: "outgoing",
    status: "draft",
    risk: "medium",
    dueDate: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      subject: editing?.subject ?? "",
      counterparty: editing?.counterparty ?? "",
      direction: editing?.direction ?? "outgoing",
      status: editing?.status ?? "draft",
      risk: editing?.risk ?? "medium",
      dueDate: toDateInput(editing?.dueDate),
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "legal notice")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.subject || !form.counterparty || !form.dueDate || !form.assignedToId) {
          toast.error("Subject, counterparty, due date, and counsel are required");
          return;
        }
        const body = {
          subject: form.subject,
          counterparty: form.counterparty,
          direction: form.direction,
          status: form.status,
          risk: form.risk,
          dueDate: form.dueDate,
          assignedToId: Number(form.assignedToId),
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Notice updated" : "Notice drafted",
          "Could not save notice",
        );
      }}
    >
      <LegalField label="Subject">
        <LegalTextInput
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Counterparty">
        <LegalTextInput
          value={form.counterparty}
          onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Direction">
        <LegalSelect
          value={form.direction}
          onValueChange={(v) => setForm((f) => ({ ...f, direction: v }))}
          options={[
            { value: "incoming", label: "Incoming" },
            { value: "outgoing", label: "Outgoing" },
          ]}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(NOTICE_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Due date">
        <LegalTextInput
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalCourtCaseFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<CourtCase>) {
  const create = useCreateLegalCourtCase();
  const update = useUpdateLegalCourtCase();
  const [form, setForm] = useState({
    court: "",
    title: "",
    status: "filed",
    risk: "medium",
    nextHearing: "",
    assignedToId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      court: editing?.court ?? "",
      title: editing?.title ?? "",
      status: editing?.status ?? "filed",
      risk: editing?.risk ?? "medium",
      nextHearing: toDateTimeLocal(editing?.nextHearing),
      assignedToId: editing?.assignedTo ? String(editing.assignedTo.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "court case")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.court || !form.title || !form.assignedToId) {
          toast.error("Court, title, and counsel are required");
          return;
        }
        const body = {
          court: form.court,
          title: form.title,
          status: form.status,
          risk: form.risk,
          nextHearing: form.nextHearing || null,
          assignedToId: Number(form.assignedToId),
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Court case updated" : "Court case registered",
          "Could not save court case",
        );
      }}
    >
      <LegalField label="Court">
        <LegalTextInput
          value={form.court}
          onChange={(e) => setForm((f) => ({ ...f, court: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Title">
        <LegalTextInput
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(COURT_CASE_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Next hearing">
        <LegalTextInput
          type="datetime-local"
          value={form.nextHearing}
          onChange={(e) => setForm((f) => ({ ...f, nextHearing: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Counsel">
        <CounselSelect
          value={form.assignedToId}
          onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalComplianceFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<ComplianceItem>) {
  const create = useCreateLegalCompliance();
  const update = useUpdateLegalCompliance();
  const [form, setForm] = useState({
    framework: "",
    requirement: "",
    status: "review_pending",
    risk: "medium",
    lastReview: "",
    nextReview: "",
    ownerId: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      framework: editing?.framework ?? "",
      requirement: editing?.requirement ?? "",
      status: editing?.status ?? "review_pending",
      risk: editing?.risk ?? "medium",
      lastReview: toDateInput(editing?.lastReview),
      nextReview: toDateInput(editing?.nextReview),
      ownerId: editing?.owner ? String(editing.owner.id) : "",
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "compliance item")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.framework || !form.requirement || !form.nextReview || !form.ownerId) {
          toast.error("Framework, requirement, next review, and owner are required");
          return;
        }
        const body = {
          framework: form.framework,
          requirement: form.requirement,
          status: form.status,
          risk: form.risk,
          lastReview: form.lastReview || new Date().toISOString().slice(0, 10),
          nextReview: form.nextReview,
          ownerId: Number(form.ownerId),
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Compliance item updated" : "Compliance item added",
          "Could not save compliance item",
        );
      }}
    >
      <LegalField label="Framework">
        <LegalTextInput
          value={form.framework}
          onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Requirement">
        <LegalTextInput
          value={form.requirement}
          onChange={(e) => setForm((f) => ({ ...f, requirement: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Status">
        <LegalSelect
          value={form.status}
          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          options={optionsFrom(COMPLIANCE_STATUS_LABELS)}
        />
      </LegalField>
      <LegalField label="Risk">
        <LegalSelect
          value={form.risk}
          onValueChange={(v) => setForm((f) => ({ ...f, risk: v }))}
          options={optionsFrom(RISK_LABELS)}
        />
      </LegalField>
      <LegalField label="Last review">
        <LegalTextInput
          type="date"
          value={form.lastReview}
          onChange={(e) => setForm((f) => ({ ...f, lastReview: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Next review">
        <LegalTextInput
          type="date"
          value={form.nextReview}
          onChange={(e) => setForm((f) => ({ ...f, nextReview: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Owner">
        <CounselSelect
          value={form.ownerId}
          onChange={(v) => setForm((f) => ({ ...f, ownerId: v }))}
        />
      </LegalField>
    </LegalFormDialog>
  );
}

export function LegalExpenseFormModal({
  open,
  onOpenChange,
  editing,
  readOnly = false,
}: ModalProps<LegalExpense>) {
  const create = useCreateLegalExpense();
  const update = useUpdateLegalExpense();
  const [form, setForm] = useState({
    date: "",
    category: "misc",
    description: "",
    amount: "",
    matterRef: "",
    approvedBy: "",
    receiptAttached: false,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      date: toDateInput(editing?.date) || new Date().toISOString().slice(0, 10),
      category: editing?.category ?? "misc",
      description: editing?.description ?? "",
      amount: editing ? String(editing.amount) : "",
      matterRef: editing?.matterRef ?? "",
      approvedBy: editing?.approvedBy ?? "",
      receiptAttached: editing?.receiptAttached ?? false,
    });
  }, [open, editing]);

  return (
    <LegalFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={modalTitle(readOnly, editing, "expense")}
      saving={create.isPending || update.isPending}
      readOnly={readOnly}
      onSubmit={() => {
        if (!form.description || !form.matterRef || !form.approvedBy) {
          toast.error("Description, matter ref, and approver are required");
          return;
        }
        const body = {
          date: form.date,
          category: form.category,
          description: form.description,
          amount: Number(form.amount) || 0,
          matterRef: form.matterRef,
          approvedBy: form.approvedBy,
          receiptAttached: form.receiptAttached,
        };
        void saveOrToast(
          () =>
            editing
              ? update.mutateAsync({ id: editing.id, ...body })
              : create.mutateAsync(body),
          onOpenChange,
          editing ? "Expense updated" : "Expense logged",
          "Could not save expense",
        );
      }}
    >
      <LegalField label="Date">
        <LegalTextInput
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Category">
        <LegalSelect
          value={form.category}
          onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          options={optionsFrom(EXPENSE_CATEGORY_LABELS)}
        />
      </LegalField>
      <LegalField label="Amount">
        <LegalTextInput
          type="number"
          min={0}
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Matter ref">
        <LegalTextInput
          value={form.matterRef}
          onChange={(e) => setForm((f) => ({ ...f, matterRef: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Approved by">
        <LegalTextInput
          value={form.approvedBy}
          onChange={(e) => setForm((f) => ({ ...f, approvedBy: e.target.value }))}
        />
      </LegalField>
      <LegalField label="Description">
        <LegalTextArea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </LegalField>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={form.receiptAttached}
          onChange={(e) => setForm((f) => ({ ...f, receiptAttached: e.target.checked }))}
        />
        Receipt attached
      </label>
    </LegalFormDialog>
  );
}
