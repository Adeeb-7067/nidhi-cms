import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** Render stored payslip HTML off-screen and save as a PDF (Satyakabir-style). */
export async function downloadPayslipPdfFromHtml(htmlContent: string, filename: string) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.background = "#fff";
  host.innerHTML = htmlContent;
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const quality = 0.82;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(canvas.toDataURL("image/jpeg", quality), "JPEG", 0, 0, pageWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
      return;
    }

    // Slice per page so we don't embed the full tall image on every page.
    const pageHeightPx = (pageHeight / imgHeight) * canvas.height;
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
      const sliceHmm = (slicePx * pageWidth) / canvas.width;
      pdf.addImage(sliceCanvas.toDataURL("image/jpeg", quality), "JPEG", 0, 0, pageWidth, sliceHmm);
      srcY += slicePx;
      pageIndex += 1;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
