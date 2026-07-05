import path from "path";
import fs from "fs/promises";
import { storeGeneratedFile } from "./file-storage.js";
import { withBrowserPage } from "./browser.js";

/**
 * Render HTML to a PDF file on disk, persist via file-storage, return public URL.
 */
export async function htmlToPdfUrl(html, { fileName, category = "hrm" } = {}) {
  const safeName = fileName?.replace(/[^a-zA-Z0-9._-]/g, "_") || `document_${Date.now()}.pdf`;
  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const localPath = path.join(uploadsDir, safeName);

  await withBrowserPage(async (page) => {
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.pdf({
      path: localPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
    });
  });

  const { url } = await storeGeneratedFile(localPath, safeName, "application/pdf", category);
  return url;
}
