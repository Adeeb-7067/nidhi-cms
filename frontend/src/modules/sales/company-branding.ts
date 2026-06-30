import type { CompanySettings } from "@/api/generated/api.schemas";
import type { getSettingsResponseSuccess } from "@/api/generated/api";
import { COMPANY_BILLING } from "./constants";

export type DocumentCompanyBranding = {
  companyName: string;
  address: string;
  logoUrl: string | null;
  sealUrl: string | null;
};

type SettingsInput =
  | CompanySettings
  | { data?: CompanySettings | null }
  | getSettingsResponseSuccess
  | null
  | undefined;

function unwrapCompanySettings(settings: SettingsInput): CompanySettings | null | undefined {
  if (!settings) return settings;
  if (typeof settings === "object" && "data" in settings) {
    return settings.data ?? undefined;
  }
  return settings as CompanySettings;
}

export function resolveDocumentCompany(settings?: SettingsInput): DocumentCompanyBranding {
  const resolved = unwrapCompanySettings(settings);
  return {
    companyName: resolved?.companyName?.trim() || COMPANY_BILLING.name,
    address: resolved?.address?.trim() || COMPANY_BILLING.address,
    logoUrl: resolved?.logoUrl ?? null,
    sealUrl: resolved?.sealUrl ?? null,
  };
}
