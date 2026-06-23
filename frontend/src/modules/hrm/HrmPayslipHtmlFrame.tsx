import { useCallback, useEffect, useRef } from "react";
import { HrmPayslipDownloadButton } from "./HrmPayslipDownloadButton";
import { cn } from "@/lib/utils";

/** Injected only in preview iframe — keeps PDF/print at full A4 width. */
const PREVIEW_STYLE = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
  }
  .page {
    width: 100% !important;
    max-width: 794px !important;
    margin: 0 auto !important;
    padding: 20px 14px 16px !important;
    overflow: visible !important;
  }
  .brand-name, .month-value { font-size: clamp(18px, 4vw, 28px) !important; }
  .net-banner-amount { font-size: clamp(20px, 4.5vw, 28px) !important; }
  .net-banner { flex-wrap: wrap !important; }
  .footer-title { word-break: break-word !important; }
  @media (max-width: 640px) {
    .hero, .footer-grid, .accounts, .mini-stats, .tables {
      grid-template-columns: 1fr !important;
    }
  }
`;

function fitPayslipIframe(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc?.body) return;

  if (!doc.getElementById("cms-payslip-preview-style")) {
    const style = doc.createElement("style");
    style.id = "cms-payslip-preview-style";
    style.textContent = PREVIEW_STYLE;
    doc.head.appendChild(style);
  }

  const page = doc.querySelector(".page") as HTMLElement | null;
  const contentWidth = page?.offsetWidth ?? doc.body.scrollWidth;
  const contentHeight = page?.offsetHeight ?? doc.body.scrollHeight;
  const frameWidth = frame.clientWidth;

  doc.body.style.transform = "";
  doc.body.style.transformOrigin = "";
  doc.body.style.width = "";

  if (frameWidth > 0 && contentWidth > frameWidth) {
    const scale = frameWidth / contentWidth;
    doc.body.style.width = `${contentWidth}px`;
    doc.body.style.transform = `scale(${scale})`;
    doc.body.style.transformOrigin = "top left";
    frame.style.height = `${Math.ceil(contentHeight * scale)}px`;
  } else {
    frame.style.height = `${contentHeight}px`;
  }
}

export function HrmPayslipHtmlFrame({
  htmlContent,
  payslipId,
  showDownload = true,
  className,
}: {
  htmlContent: string;
  payslipId: number;
  showDownload?: boolean;
  className?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const syncFrame = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    fitPayslipIframe(frame);
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    const raf = requestAnimationFrame(() => {
      syncFrame();
      requestAnimationFrame(syncFrame);
    });

    const host = hostRef.current;
    const ro = host ? new ResizeObserver(() => syncFrame()) : null;
    if (host && ro) ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [htmlContent, syncFrame]);

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div
        ref={hostRef}
        className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <iframe
          ref={iframeRef}
          title="Salary slip preview"
          className="block w-full border-0 bg-white"
          style={{ minHeight: 320 }}
          sandbox="allow-same-origin"
          scrolling="no"
        />
      </div>
      {showDownload ? (
        <div className="flex justify-center">
          <HrmPayslipDownloadButton
            payslipId={payslipId}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          />
        </div>
      ) : null}
    </div>
  );
}
