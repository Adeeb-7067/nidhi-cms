import type { CompanySettings } from "@/api/generated/api.schemas";
import type { SalesDocumentBrandingFields } from "@/api/sales";
import { COMPANY_BILLING } from "./constants";

export type DocumentCompanyBranding = {
  companyName: string;
  address: string;
  logoUrl: string | null;
  sealUrl: string | null;
};

export type SalesDocumentBranding = DocumentCompanyBranding & SalesDocumentBrandingFields;

export type SalesDocumentKind = "invoice" | "receipt" | "proposal" | "statement";

const CUSTOM_FIELD_VISIBILITY: Record<SalesDocumentKind, keyof SalesDocumentBrandingFields["customFields"][number]> = {
  invoice: "showOnInvoice",
  receipt: "showOnReceipt",
  proposal: "showOnProposal",
  statement: "showOnStatement",
};

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function defaultDocumentBrandingFields(): SalesDocumentBrandingFields {
  return {
    gstin: "",
    email: "",
    phone: "",
    pan: null,
    cin: null,
    website: null,
    bankName: null,
    bankAccount: null,
    bankIfsc: null,
    customFields: [],
  };
}

function normalizeBrandingFields(fields?: SalesDocumentBrandingFields | null): SalesDocumentBrandingFields {
  const src = fields ?? defaultDocumentBrandingFields();
  return {
    gstin: trimOrEmpty(src.gstin),
    email: trimOrEmpty(src.email),
    phone: trimOrEmpty(src.phone),
    pan: trimOrNull(src.pan),
    cin: trimOrNull(src.cin),
    website: trimOrNull(src.website),
    bankName: trimOrNull(src.bankName),
    bankAccount: trimOrNull(src.bankAccount),
    bankIfsc: trimOrNull(src.bankIfsc),
    customFields: src.customFields ?? [],
  };
}

type OrgBrandingSource = Pick<CompanySettings, "companyName" | "address" | "logoUrl" | "sealUrl"> | null | undefined;

export function resolveDocumentCompany(settings?: OrgBrandingSource): DocumentCompanyBranding {
  return {
    companyName: settings?.companyName?.trim() || COMPANY_BILLING.name,
    address: settings?.address?.trim() || COMPANY_BILLING.address,
    logoUrl: settings?.logoUrl ?? null,
    sealUrl: settings?.sealUrl ?? null,
  };
}

export function resolveSalesDocumentBranding(
  orgSettings?: OrgBrandingSource,
  documentBranding?: SalesDocumentBrandingFields | null,
): SalesDocumentBranding {
  return {
    ...resolveDocumentCompany(orgSettings),
    ...normalizeBrandingFields(documentBranding),
  };
}

export function resolvePublicProposalBranding(proposal: {
  companySettings?: { companyName: string; logoUrl?: string | null; sealUrl?: string | null; address?: string | null } | null;
  documentBranding?: SalesDocumentBrandingFields | null;
}): SalesDocumentBranding {
  return resolveSalesDocumentBranding(proposal.companySettings, proposal.documentBranding);
}

export function customFieldsForDocument(
  branding: SalesDocumentBranding,
  kind: SalesDocumentKind,
) {
  const key = CUSTOM_FIELD_VISIBILITY[kind];
  return branding.customFields.filter((field) => field.value.trim() && field[key]);
}

/** Payload shape for saving branding — empty strings become null. */
export function serializeDocumentBrandingForSave(
  fields: SalesDocumentBrandingFields,
): SalesDocumentBrandingFields {
  return {
    gstin: trimOrEmpty(fields.gstin),
    email: trimOrEmpty(fields.email),
    phone: trimOrEmpty(fields.phone),
    pan: trimOrNull(fields.pan),
    cin: trimOrNull(fields.cin),
    website: trimOrNull(fields.website),
    bankName: trimOrNull(fields.bankName),
    bankAccount: trimOrNull(fields.bankAccount),
    bankIfsc: trimOrNull(fields.bankIfsc),
    customFields: fields.customFields,
  };
}
