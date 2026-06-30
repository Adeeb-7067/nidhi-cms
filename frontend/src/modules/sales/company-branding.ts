import type { CompanySettings } from "@/api/generated/api.schemas";
import { COMPANY_BILLING } from "./constants";

export type DocumentCompanyBranding = {
  companyName: string;
  address: string;
  logoUrl: string | null;
  sealUrl: string | null;
};

export function resolveDocumentCompany(settings?: CompanySettings | null): DocumentCompanyBranding {
  return {
    companyName: settings?.companyName?.trim() || COMPANY_BILLING.name,
    address: settings?.address?.trim() || COMPANY_BILLING.address,
    logoUrl: settings?.logoUrl ?? null,
    sealUrl: settings?.sealUrl ?? null,
  };
}
