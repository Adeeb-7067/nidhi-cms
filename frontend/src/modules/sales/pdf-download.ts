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

/** Inline remote images as data URLs so html2canvas does not taint the canvas. */
async function inlineImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      try {
        const response = await fetch(src, { credentials: "include" });
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
        img.style.display = "none";
      }
    }),
  );
}

function stripSvgIcons(root: HTMLElement): void {
  root.querySelectorAll("svg").forEach((svg) => svg.remove());
}

function prepareClone(clone: HTMLElement, captureWidth: number): void {
  clone.querySelectorAll("[data-pdf-hide]").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });
  stripSvgIcons(clone);
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
}

export type PdfDownloadOptions = {
  /** Scale content to fit on one A4 page (no page breaks). */
  singlePage?: boolean;
  /** Margin in mm when using singlePage (default 8). */
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
      node.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style.opacity === "0") htmlEl.style.opacity = "1";
      });
    },
  });
}

/** Capture a DOM node and save as a PDF. */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfDownloadOptions,
): Promise<void> {
  const source = resolveCaptureRoot(element);
  const captureWidth = options?.widthPx ?? Math.max(source.offsetWidth || element.offsetWidth || 0, A4_CONTENT_PX);
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
      clone.querySelectorAll("img").forEach((img) => {
        img.style.display = "none";
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
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (options?.singlePage) {
      const margin = options.marginMm ?? 8;
      const maxW = pageWidth - margin * 2;
      const maxH = pageHeight - margin * 2;
      const naturalH = (canvas.height * maxW) / canvas.width;
      let renderW = maxW;
      let renderH = naturalH;
      if (naturalH > maxH) {
        renderH = maxH;
        renderW = (canvas.width * renderH) / canvas.height;
      }
      const x = (pageWidth - renderW) / 2;
      const y = margin;
      pdf.addImage(imgData, "PNG", x, y, renderW, renderH);
    } else {
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    pdf.save(`${sanitizeFilename(filename)}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
