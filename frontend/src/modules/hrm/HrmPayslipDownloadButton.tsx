import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { customFetch } from "@/api/custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { toastApiError } from "@/lib/api-error";
import type { HrmPayslipDetail } from "./types";
import {
  buildPayslipPrintHtml,
  downloadPayslipHtml,
  payslipDownloadFilename,
  printPayslipHtml,
} from "./payslip-utils";
import { downloadPayslipPdfFromHtml } from "./payslip-download";

export function HrmPayslipDownloadButton({
  payslipId,
  className,
}: {
  payslipId: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!payslipId) {
      toast.error("Missing payslip id");
      return;
    }
    setLoading(true);
    try {
      const detail = await customFetch<HrmPayslipDetail>(apiUrl(`/api/hrm/payslips/${payslipId}`));
      const filename = payslipDownloadFilename(detail);
      const html = detail.htmlContent ?? buildPayslipPrintHtml(detail);

      if (detail.htmlContent?.trim()) {
        await downloadPayslipPdfFromHtml(html, filename);
        toast.success("Salary slip PDF downloaded");
        return;
      }

      const printed = printPayslipHtml(html, filename);
      if (!printed) {
        downloadPayslipHtml(html, filename);
        toast.success("Payslip downloaded — open the file and print to PDF if needed");
      } else {
        toast.success("Payslip opened for print / save as PDF");
      }
    } catch (err) {
      toastApiError(err, "Could not download payslip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-stop-row-click
      className={
        className ??
        "flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
      }
      onClick={handleClick}
      disabled={loading || !payslipId}
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
      PDF
    </button>
  );
}
