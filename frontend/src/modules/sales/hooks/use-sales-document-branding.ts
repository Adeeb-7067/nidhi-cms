import { useMemo } from "react";
import { useGetSettings } from "@/api/generated/api";
import { useSalesSettings } from "@/api/sales";
import { resolveSalesDocumentBranding } from "@/modules/sales/company-branding";

export function useSalesDocumentBranding(enabled = true) {
  const { data: orgSettings } = useGetSettings({ query: { enabled } });
  const { data: salesSettings } = useSalesSettings(enabled);
  return useMemo(
    () => resolveSalesDocumentBranding(orgSettings, salesSettings?.documentBranding),
    [orgSettings, salesSettings?.documentBranding],
  );
}
