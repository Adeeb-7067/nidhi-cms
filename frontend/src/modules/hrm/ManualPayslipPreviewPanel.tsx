import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useManualPayslip } from "@/api/hrm";
import { HrmPayslipDocument } from "./HrmPayslipDocument";
import { HrmPayslipHtmlFrame } from "./HrmPayslipHtmlFrame";
import { hrmPayslipToViewModel } from "./payslip-view-model";

/**
 * Preview panel for manual payslips. Mirrors HrmPayslipPreviewPanel but resolves
 * the slip through the manual-payslip endpoint so the same UI is reused.
 */
export function ManualPayslipPreviewPanel({
  payslipId,
  showDownload = true,
}: {
  payslipId?: number | null;
  showDownload?: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useManualPayslip(payslipId ?? undefined);

  if (!payslipId) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        Select a payslip to preview.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">Loading payslip…</p>
      </div>
    );
  }

  if (isError || !data) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : "Could not load payslip preview.";
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-12 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">Payslip unavailable</p>
        <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (data.htmlContent?.trim()) {
    return (
      <HrmPayslipHtmlFrame
        htmlContent={data.htmlContent}
        payslipId={data.id}
        downloadDetailUrl={`/api/hrm/manual-payslips/${data.id}`}
        showDownload={showDownload}
      />
    );
  }

  return <HrmPayslipDocument data={hrmPayslipToViewModel(data)} showDownload={showDownload} />;
}
