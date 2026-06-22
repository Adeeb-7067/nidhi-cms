import { useMemo, useState } from "react";
import { Download, Eye, FileText, Receipt, Calendar, Wallet } from "lucide-react";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageHero, HrmPageShell, HrmFilterRow, portalActionButtonClass } from "@/modules/hrm/components";
import { HrmPageKpiRow } from "@/modules/hrm/page-kpis";
import { useMyPayslips, useHrmPayslip } from "@/api/hrm";
import { HrmPayslipPreview } from "@/modules/hrm/HrmPayslipPreview";
import {
  buildPayslipPrintHtml,
  downloadPayslipHtml,
  formatInr,
  payslipDownloadFilename,
  payslipPeriodLabel,
  printPayslipHtml,
} from "@/modules/hrm/payslip-utils";
import type { HrmPayslip, HrmPayslipDetail } from "@/modules/hrm/types";
import { toast } from "sonner";
import { customFetch } from "@/api/custom-fetch";
import { apiUrl } from "@/lib/api-base";
import { toastApiError } from "@/lib/api-error";

const PAYSLIP_PREVIEW_ID = "hrm-payslip-preview";

export default function HrmMyPayslipsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const yearNum = Number(year);
  const { data, isLoading } = useMyPayslips(yearNum);
  const { data: slipDetail, isLoading: slipLoading } = useHrmPayslip(selectedId ?? undefined);

  const slips = data?.slips ?? [];
  const yearOptions = useMemo(() => {
    const years = new Set(slips.map((s) => s.year));
    years.add(currentYear);
    years.add(currentYear - 1);
    return [...years].sort((a, b) => b - a);
  }, [slips, currentYear]);

  const kpiItems = useMemo(() => {
    const latest = slips[0];
    const latestLabel = latest ? payslipPeriodLabel(latest.month, latest.year) : "—";
    const totalNet = slips.reduce((sum, s) => sum + (s.net ?? 0), 0);
    return [
      { label: `${year} payslips`, value: slips.length, icon: FileText, accent: "blue" as const },
      { label: "Latest period", value: latestLabel, icon: Calendar, accent: "violet" as const },
      { label: "Total net (YTD)", value: formatInr(totalNet), icon: Wallet, accent: "green" as const },
      { label: "Available", value: slips.length, icon: Receipt, accent: "amber" as const },
    ];
  }, [slips, year]);

  const handleDownload = () => {
    if (!slipDetail) return;
    downloadSlipDetail(slipDetail);
  };

  const downloadSlipDetail = (detail: HrmPayslipDetail) => {
    const filename = payslipDownloadFilename(detail);
    const html = detail.htmlContent ?? buildPayslipPrintHtml(detail);
    const printed = printPayslipHtml(html, filename);
    if (!printed) {
      downloadPayslipHtml(html, filename);
      toast.success("Payslip downloaded — open the file and print to PDF if needed");
    }
  };

  const downloadSlipById = async (id: number) => {
    try {
      const detail = await customFetch<HrmPayslipDetail>(apiUrl(`/api/hrm/payslips/${id}`));
      downloadSlipDetail(detail);
    } catch (e: unknown) {
      toastApiError(e, "Could not download payslip");
    }
  };

  const columns = useMemo((): Column<HrmPayslip>[] => [
    {
      id: "period",
      header: "Month",
      cell: (s) => (
        <span className="font-medium">{payslipPeriodLabel(s.month, s.year)}</span>
      ),
      exportValue: (s) => payslipPeriodLabel(s.month, s.year),
    },
    {
      id: "gross",
      header: "Gross",
      cell: (s) => (
        <span className="tabular-nums text-muted-foreground">
          {s.gross != null ? formatInr(s.gross) : "—"}
        </span>
      ),
      exportValue: (s) => (s.gross != null ? String(s.gross) : ""),
    },
    {
      id: "net",
      header: "Net pay",
      cell: (s) => (
        <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
          {s.net != null ? formatInr(s.net) : "—"}
        </span>
      ),
      exportValue: (s) => (s.net != null ? String(s.net) : ""),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right w-[200px]",
      cell: (s) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setSelectedId(s.id)}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            onClick={() => void downloadSlipById(s.id)}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <HrmGate module="my_payslips">
      <HrmPageShell>
        <HrmPageHero
          title="My payslips"
          description="View and download monthly salary slips after HR finalizes payroll"
          breadcrumbs={[{ label: "HRM", href: "/hrm" }, { label: "Payslips" }]}
        />

        <HrmPageKpiRow items={kpiItems} loading={isLoading} />

        <HrmFilterRow>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-full sm:w-[140px] bg-background">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </HrmFilterRow>

        <PortalTablePanel isLoading={isLoading}>
          <AdvancedTable
            data={slips}
            columns={columns}
            onRowClick={(s) => setSelectedId(s.id)}
            filename="HrmMyPayslipsExport"
            viewStorageKey="hrm-my-payslips"
          />
        </PortalTablePanel>

        <Dialog open={selectedId != null} onOpenChange={(open) => !open && setSelectedId(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {slipDetail
                  ? `Salary slip — ${payslipPeriodLabel(slipDetail.month, slipDetail.year)}`
                  : "Salary slip"}
              </DialogTitle>
            </DialogHeader>

            {slipLoading && !slipDetail ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading payslip…</p>
            ) : slipDetail ? (
              <HrmPayslipPreview id={PAYSLIP_PREVIEW_ID} detail={slipDetail} />
            ) : (
              <p className="text-sm text-muted-foreground">Payslip content unavailable.</p>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                Close
              </Button>
              <Button
                id="hrm-payslip-download-btn"
                className={portalActionButtonClass("bg-primary text-primary-foreground hover:bg-primary/90")}
                disabled={!slipDetail}
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download / Print PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
