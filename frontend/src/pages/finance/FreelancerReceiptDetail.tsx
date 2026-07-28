import { useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  useGetFreelancerInstallmentReceipt,
  useListFreelancerEngagements,
} from "@/api/finance";
import { PAYMENT_MODE_LABELS } from "@/modules/finance/constants";
import type { PaymentMode } from "@/modules/finance/types";
import { FinanceEmptyState, FinanceErrorState } from "@/modules/finance/components";
import { SalesPageHeader, ReceiptDocument } from "@/modules/sales/components";
import { useSalesDocumentBranding } from "@/modules/sales/hooks/use-sales-document-branding";
import { downloadElementAsPdf } from "@/modules/sales/pdf-download";
import type { PaymentReceipt } from "@/modules/sales/types";

function paymentModeLabel(mode: string | null | undefined) {
  if (!mode) return "—";
  return PAYMENT_MODE_LABELS[mode as PaymentMode] ?? mode.replace(/_/g, " ");
}

function parseReceiptIds(path: string): { engagementId: number; installmentId: number } | null {
  const match =
    path.match(/\/freelancers\/receipts\/(\d+)\/(\d+)/) ||
    path.match(/\/finance\/freelancers\/receipts\/(\d+)\/(\d+)/);
  if (!match) return null;
  const engagementId = Number(match[1]);
  const installmentId = Number(match[2]);
  if (!Number.isFinite(engagementId) || !Number.isFinite(installmentId)) return null;
  return { engagementId, installmentId };
}

export default function FreelancerReceiptDetailPage() {
  const [path] = useLocation();
  const ids = useMemo(() => parseReceiptIds(path.split("?")[0]), [path]);
  const engagementId = ids?.engagementId ?? 0;
  const installmentId = ids?.installmentId ?? 0;

  const docRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const branding = useSalesDocumentBranding();

  const {
    data,
    isLoading: receiptLoading,
    isError: receiptError,
    refetch,
  } = useGetFreelancerInstallmentReceipt(engagementId, installmentId, !!ids);

  const { data: engagementsData, isLoading: listLoading } = useListFreelancerEngagements(
    undefined,
    !!ids && (receiptError || !data),
  );

  const fallback = useMemo(() => {
    if (!ids || data) return null;
    const engagement = engagementsData?.engagements?.find((e) => e.id === engagementId);
    const installment = engagement?.installments?.find((i) => i.id === installmentId);
    if (!engagement || !installment || installment.status !== "paid") return null;
    return { engagement, installment };
  }, [ids, data, engagementsData, engagementId, installmentId]);

  const isLoading = receiptLoading || (receiptError && listLoading);

  const receipt: PaymentReceipt | null = useMemo(() => {
    if (data?.installment && data.engagement) {
      return {
        id: data.installment.id,
        number:
          data.installment.receiptNumber ||
          data.payment?.receiptNumber ||
          `FL-REC-${data.installment.id}`,
        invoiceNumber: `FL-ENG-${data.engagement.id}`,
        installmentName: data.installment.label,
        customerName:
          data.engagement.freelancerName ?? `Freelancer #${data.engagement.userId}`,
        projectName:
          data.engagement.projectName ?? `Project #${data.engagement.projectId}`,
        amountPaid: data.installment.amount,
        remainingBalance: data.engagement.remainingBalance,
        paymentMethod: paymentModeLabel(
          data.installment.paymentMode ?? data.payment?.mode,
        ),
        transactionId:
          data.installment.reference?.trim() || data.payment?.reference || "—",
        note: data.installment.notes?.trim() || null,
        proofImageUrl: data.installment.proofImageUrl?.trim() || null,
        generatedAt:
          data.installment.paidAt || data.payment?.date || new Date().toISOString(),
        companyName: branding.companyName,
        companyAddress: branding.address,
        companyGstin: branding.gstin,
        companyPhone: branding.phone,
        companyEmail: branding.email,
        logoUrl: branding.logoUrl,
        sealUrl: branding.sealUrl,
        direction: "outgoing",
      };
    }
    if (fallback) {
      const { engagement, installment } = fallback;
      return {
        id: installment.id,
        number: installment.receiptNumber || `FL-REC-${installment.id}`,
        invoiceNumber: `FL-ENG-${engagement.id}`,
        installmentName: installment.label,
        customerName: engagement.freelancerName ?? `Freelancer #${engagement.userId}`,
        projectName: engagement.projectName ?? `Project #${engagement.projectId}`,
        amountPaid: installment.amount,
        remainingBalance: Math.max(0, engagement.agreedAmount - engagement.paidAmount),
        paymentMethod: paymentModeLabel(installment.paymentMode),
        transactionId: installment.reference?.trim() || "—",
        note: installment.notes?.trim() || null,
        proofImageUrl: installment.proofImageUrl?.trim() || null,
        generatedAt: installment.paidAt || new Date().toISOString(),
        companyName: branding.companyName,
        companyAddress: branding.address,
        companyGstin: branding.gstin,
        companyPhone: branding.phone,
        companyEmail: branding.email,
        logoUrl: branding.logoUrl,
        sealUrl: branding.sealUrl,
        direction: "outgoing",
      };
    }
    return null;
  }, [data, fallback, branding]);

  const handleDownloadPdf = async () => {
    const target = pdfRef.current ?? docRef.current;
    if (!target || !receipt) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(target, receipt.number, { singlePage: true, widthPx: 794 });
      toast.success("Receipt PDF downloaded");
    } catch {
      toast.error("Failed to generate receipt PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!ids) {
    return (
      <FinanceEmptyState
        title="Receipt not found"
        description="Invalid receipt link."
        actionLabel="Back to receipts"
        onAction={() => {
          window.location.href = "/freelancers/receipts";
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <PortalPageShell>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-96 w-full max-w-lg mx-auto rounded-xl" />
      </PortalPageShell>
    );
  }

  if (!receipt) {
    return (
      <PortalPageShell>
        <FinanceErrorState
          message="Could not load this freelancer receipt."
          onRetry={() => refetch()}
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <SalesPageHeader
        title={receipt.number}
        description={`${receipt.customerName} · ${receipt.invoiceNumber}`}
        breadcrumbs={[
          { label: "Freelancers", href: "/freelancers" },
          { label: "Payment Receipts", href: "/freelancers/receipts" },
          { label: receipt.number },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/freelancers/receipts">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
          </>
        }
      />

      <p className="text-xs text-muted-foreground mb-4">
        Payment via {receipt.paymentMethod}
        {receipt.transactionId !== "—" ? ` · ${receipt.transactionId}` : ""}
      </p>

      <div ref={docRef} className="flex justify-center">
        <ReceiptDocument receipt={receipt} />
      </div>

      <div
        ref={pdfRef}
        className="fixed left-[-10000px] top-0 w-[794px] pointer-events-none"
        aria-hidden
      >
        <ReceiptDocument receipt={receipt} compact />
      </div>
    </PortalPageShell>
  );
}
