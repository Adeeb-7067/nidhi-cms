import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import type { Column } from "@/components/ui/advanced-table";

const PDF_MARGIN = { top: 14, right: 10, bottom: 14, left: 10 };

/** Use landscape when many columns so content is not clipped horizontally. */
export function shouldUseLandscapePdf(columnCount: number): boolean {
  return columnCount > 4;
}

export function createExportPdf(columnCount: number): jsPDF {
  return new jsPDF({
    orientation: shouldUseLandscapePdf(columnCount) ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
}

export function baseAutoTableOptions(columnCount: number): UserOptions {
  return {
    margin: PDF_MARGIN,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      cellWidth: "wrap",
      minCellHeight: 6,
      valign: "top",
    },
    headStyles: {
      overflow: "linebreak",
      valign: "middle",
    },
    bodyStyles: {
      overflow: "linebreak",
      valign: "top",
    },
    showHead: "everyPage",
    rowPageBreak: "auto",
    horizontalPageBreak: columnCount > 6,
    tableWidth: "auto",
  };
}

export function runAutoTableExport(doc: jsPDF, options: UserOptions & { columnCount?: number }) {
  const columnCount =
    options.columnCount ??
    (options.head?.[0] as unknown[] | undefined)?.length ??
    (options.body?.[0] as unknown[] | undefined)?.length ??
    1;
  const { columnCount: _omit, ...rest } = options;
  autoTable(doc, {
    ...baseAutoTableOptions(columnCount),
    ...rest,
  });
}

/** Plain-text value for CSV/PDF export (skips React-only cells unless exportValue is set). */
export function getColumnExportValue<T>(col: Column<T>, item: T): string {
  if (col.exportValue) return col.exportValue(item);
  if (col.accessorKey) {
    const value = item[col.accessorKey];
    if (value == null) return "";
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
  if (col.detailCell) {
    const rendered = col.detailCell(item);
    if (typeof rendered === "string" || typeof rendered === "number") return String(rendered);
  }
  return "";
}

/** Reserve space for a footer block; adds a page when the table ends too low on the page. */
export function reserveFooterY(doc: jsPDF, offsetFromTableMm = 20, minBottomMarginMm = 30): number {
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
  let y = finalY + offsetFromTableMm;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - minBottomMarginMm) {
    doc.addPage();
    y = PDF_MARGIN.top;
  }
  return y;
}
