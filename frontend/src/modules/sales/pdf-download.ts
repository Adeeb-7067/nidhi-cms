import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_") || "document";
}

/** A4 content width at ~96dpi — keeps PDF layout consistent. */
const A4_CONTENT_PX = 794;

function resolveCaptureRoot(element: HTMLElement): HTMLElement {
  if (element.children.length === 1) {
    return element.children[0] as HTMLElement;
  }
  return element;
}

async function waitForLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 3000);
        }),
    ),
  );
}

/**
 * Inline remote images as data URLs so html2canvas does not taint the canvas.
 * Logos/seals are hosted on object storage with a wildcard `Access-Control-Allow-Origin: *`
 * CORS policy — the Fetch spec forbids the browser from exposing that response to a
 * credentialed request, so `credentials: "include"` made this fetch fail every time. The
 * image still renders fine on-screen because plain <img> tags never go through CORS.
 */
async function inlineImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      try {
        const response = await fetch(src, { credentials: "omit", mode: "cors" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.setAttribute("src", dataUrl);
        img.removeAttribute("crossorigin");
      } catch {
        // Leave the original (non-inlined) src in place and mark it for anonymous CORS
        // loading — html2canvas's own `useCORS` pass then gets a chance to draw it directly
        // instead of the image being permanently dropped from the export.
        img.setAttribute("crossorigin", "anonymous");
      }
    }),
  );
}

function stripSvgIcons(root: HTMLElement): void {
  root.querySelectorAll("svg").forEach((svg) => svg.remove());
}

/** Prevent clipped text and hidden overflow in PDF captures. */
function normalizeCloneForPdf(root: HTMLElement): void {
  root.style.overflow = "visible";
  root.style.maxHeight = "none";

  root.querySelectorAll("*").forEach((node) => {
    const el = node as HTMLElement;
    if (el.classList?.contains("truncate")) {
      el.classList.remove("truncate");
      el.style.overflow = "visible";
      el.style.textOverflow = "clip";
      el.style.whiteSpace = "normal";
      el.style.wordBreak = "break-word";
    }
    Array.from(el.classList ?? []).forEach((cls) => {
      if (cls.startsWith("line-clamp-")) el.classList.remove(cls);
    });
    if (el.style.overflow === "hidden") el.style.overflow = "visible";
    const computed = window.getComputedStyle(el);
    if (computed.overflow === "hidden" || computed.overflowX === "hidden" || computed.overflowY === "hidden") {
      el.style.overflow = "visible";
    }
    if (computed.textOverflow === "ellipsis") {
      el.style.textOverflow = "clip";
      el.style.whiteSpace = "normal";
      el.style.wordBreak = "break-word";
    }
    if (computed.maxHeight && computed.maxHeight !== "none") {
      el.style.maxHeight = "none";
    }
  });
}

function prepareClone(clone: HTMLElement, captureWidth: number): void {
  clone.querySelectorAll("[data-pdf-hide]").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });
  stripSvgIcons(clone);
  normalizeCloneForPdf(clone);
  clone.style.width = `${captureWidth}px`;
  clone.style.maxWidth = `${captureWidth}px`;
  clone.style.boxSizing = "border-box";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.opacity = "1";
  clone.style.visibility = "visible";
  clone.style.transform = "none";
  clone.style.background = "#ffffff";
  clone.style.overflow = "visible";
}

export type PdfDownloadOptions = {
  /** Scale content to fit on one A4 page (no page breaks). */
  singlePage?: boolean;
  /** Margin in mm (default 10). */
  marginMm?: number;
  /** Fixed capture width in px (default 794 for A4). */
  widthPx?: number;
};

async function renderCanvas(
  host: HTMLElement,
  clone: HTMLElement,
  captureWidth: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
  return html2canvas(host, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    width: captureWidth,
    height,
    windowWidth: captureWidth,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    onclone: (_doc, clonedNode) => {
      const node = clonedNode as HTMLElement;
      node.style.opacity = "1";
      node.style.visibility = "visible";
      node.style.transform = "none";
      node.style.background = "#ffffff";
      node.style.overflow = "visible";
      normalizeCloneForPdf(node);
      node.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style.opacity === "0") htmlEl.style.opacity = "1";
      });
    },
  });
}

function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  options: { singlePage?: boolean; marginMm: number },
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = options.marginMm;
  const contentW = pageWidth - margin * 2;
  const contentH = pageHeight - margin * 2;

  if (options.singlePage) {
    const naturalH = (canvas.height * contentW) / canvas.width;
    let renderW = contentW;
    let renderH = naturalH;
    if (naturalH > contentH) {
      renderH = contentH;
      renderW = (canvas.width * renderH) / canvas.height;
    }
    const x = (pageWidth - renderW) / 2;
    const y = margin;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, renderW, renderH);
    return;
  }

  const fullImgH = (canvas.height * contentW) / canvas.width;
  if (fullImgH <= contentH) {
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, contentW, fullImgH);
    return;
  }

  const pageHeightPx = (contentH / fullImgH) * canvas.height;
  let srcY = 0;
  let pageIndex = 0;

  while (srcY < canvas.height - 0.5) {
    if (pageIndex > 0) pdf.addPage();
    const slicePx = Math.min(pageHeightPx, canvas.height - srcY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(slicePx);
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    const sliceHmm = (slicePx * contentW) / canvas.width;
    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentW, sliceHmm);
    srcY += slicePx;
    pageIndex += 1;
  }
}

/** Capture a DOM node and save as a PDF. */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfDownloadOptions,
): Promise<void> {
  const source = resolveCaptureRoot(element);
  const captureWidth = options?.widthPx ?? A4_CONTENT_PX;
  const clone = source.cloneNode(true) as HTMLElement;
  prepareClone(clone, captureWidth);

  const host = document.createElement("div");
  host.setAttribute("data-pdf-capture-host", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${captureWidth}px`;
  host.style.opacity = "1";
  host.style.visibility = "visible";
  host.style.pointerEvents = "none";
  host.style.zIndex = "99999";
  host.style.background = "#ffffff";
  host.style.overflow = "visible";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForLayout();
    await inlineImages(clone);
    await waitForImages(clone);
    await waitForLayout();

    const contentHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
    host.style.height = `${contentHeight}px`;

    const scale = options?.singlePage ? 1.5 : 2;
    let canvas: HTMLCanvasElement;
    try {
      canvas = await renderCanvas(host, clone, captureWidth, scale);
    } catch {
      stripSvgIcons(clone);
      // Only drop images that never made it to a safe data: URL — those are the ones
      // capable of tainting the canvas. Successfully inlined images are harmless and
      // should stay in the retry so the export doesn't lose more than it has to.
      clone.querySelectorAll("img").forEach((img) => {
        if (!img.getAttribute("src")?.startsWith("data:")) {
          img.style.display = "none";
        }
      });
      canvas = await renderCanvas(host, clone, captureWidth, 1);
    }

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("PDF capture produced an empty canvas");
    }

    let imgData: string;
    try {
      imgData = canvas.toDataURL("image/png");
    } catch {
      throw new Error("PDF export blocked by cross-origin content");
    }

    if (imgData.length < 1000) {
      throw new Error("PDF capture produced blank content");
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginMm = options?.marginMm ?? 10;

    addCanvasToPdf(pdf, canvas, {
      singlePage: options?.singlePage,
      marginMm,
    });

    pdf.save(`${sanitizeFilename(filename)}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
