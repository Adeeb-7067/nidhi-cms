import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer } from "@/api/sales";
import type { DocumentCompanyBranding } from "./company-branding";
import {
  formatStatementSummaryAmount,
  formatStatementTableAmount,
  type StatementLedger,
} from "./customer-statement-ledger";

const MARGIN = { top: 14, right: 14, bottom: 18, left: 14 };
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;

export type CustomerStatementPdfInput = {
  customer: Customer;
  company: DocumentCompanyBranding;
  companyGstin?: string;
  ledger: StatementLedger;
  periodLabel: string;
  showingText: string;
  fromDate: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_") || "statement";
}

function amountCell(value: number): string {
  if (value === 0) return "0.00";
  return formatStatementTableAmount(value);
}

function drawStatementHeader(
  doc: jsPDF,
  input: CustomerStatementPdfInput,
  startY: number,
): number {
  const { customer, company, companyGstin, ledger, periodLabel } = input;
  const gstin = companyGstin?.trim() ?? "";
  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(company.companyName, MARGIN.left, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const addressLines = doc.splitTextToSize(company.address, CONTENT_W * 0.55);
  doc.text(addressLines, MARGIN.left, y);
  y += addressLines.length * 4.2;

  if (gstin) {
    doc.text(`GSTIN Number: ${gstin}`, MARGIN.left, y);
    y += 8;
  } else {
    y += 4;
  }

  const summaryX = MARGIN.left + CONTENT_W * 0.52;
  const summaryW = CONTENT_W * 0.48;
  const toBlockBottom = y;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("To", MARGIN.left, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  y += 5;
  doc.text(customer.companyName, MARGIN.left, y);
  y += 4.5;

  if (customer.location?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const customerLines = doc.splitTextToSize(customer.location.trim(), CONTENT_W * 0.48);
    doc.text(customerLines, MARGIN.left, y);
    y += customerLines.length * 4.2;
  }

  if (customer.gstin?.trim()) {
    doc.setFontSize(9);
    doc.text(`GSTIN Number: ${customer.gstin.trim()}`, MARGIN.left, y);
    y += 5;
  }

  let summaryY = toBlockBottom;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Account Summary", summaryX, summaryY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(periodLabel, summaryX + summaryW, summaryY, { align: "right" });
  summaryY += 6;

  const summaryRows: [string, string][] = [
    ["Beginning Balance:", formatStatementSummaryAmount(ledger.beginningBalance)],
    ["Invoiced Amount:", formatStatementSummaryAmount(ledger.invoicedInPeriod)],
    ["Amount Paid:", formatStatementSummaryAmount(ledger.paidInPeriod)],
    ["Balance Due:", formatStatementSummaryAmount(ledger.balanceDue)],
  ];

  for (const [label, value] of summaryRows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(label, summaryX, summaryY);
    doc.setTextColor(30, 30, 30);
    doc.text(value, summaryX + summaryW, summaryY, { align: "right" });
    summaryY += 5;
  }

  const blockBottom = Math.max(y, summaryY) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN.left, blockBottom, PAGE_W - MARGIN.right, blockBottom);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(input.showingText, PAGE_W / 2, blockBottom + 6, { align: "center" });

  return blockBottom + 10;
}

function addPageNumbers(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`${i} of ${total}`, PAGE_W / 2, doc.internal.pageSize.getHeight() - 8, {
      align: "center",
    });
  }
}

export function downloadCustomerStatementPdf(input: CustomerStatementPdfInput): void {
  const { customer, ledger, fromDate } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const beginningDate =
    fromDate ||
    (ledger.rows[0]?.date
      ? format(new Date(ledger.rows[0].date), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"));

  const tableBody: string[][] = [
    [beginningDate, "Beginning Balance", "0.00", "0.00", amountCell(ledger.beginningBalance)],
    ...ledger.rows.map((row) => [
      format(new Date(row.date), "yyyy-MM-dd"),
      row.details,
      row.amount > 0 ? amountCell(row.amount) : "",
      row.payment > 0 ? amountCell(row.payment) : "",
      amountCell(row.balance),
    ]),
  ];

  const tableStartY = drawStatementHeader(doc, input, MARGIN.top);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: MARGIN.left, right: MARGIN.right, bottom: MARGIN.bottom },
    head: [["Date", "Details", "Amount", "Payments", "Balance"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      valign: "top",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [245, 247, 250],
      textColor: [30, 30, 30],
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: CONTENT_W - 22 - 24 - 24 - 26 },
      2: { halign: "right", cellWidth: 24 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 26 },
    },
    showHead: "everyPage",
    didDrawPage: () => {
      // Header is only on page 1; table head repeats via showHead.
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableStartY;
  let footerY = finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (footerY > pageHeight - MARGIN.bottom - 6) {
    doc.addPage();
    footerY = MARGIN.top;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Balance Due ${formatStatementSummaryAmount(ledger.balanceDue)}`,
    PAGE_W - MARGIN.right,
    footerY,
    { align: "right" },
  );

  addPageNumbers(doc);

  const slug = sanitizeFilename(customer.companyName);
  doc.save(`statement-${slug}.pdf`);
}
