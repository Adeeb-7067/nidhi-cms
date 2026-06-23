import { BRAND } from "@/lib/brand";
import type { HrmPayslipDetail } from "./types";
import { payslipPeriodLabel } from "./payslip-utils";

export type PayslipLine = { label: string; amount: number; ytd: number };

export type PayslipViewModel = {
  payslipId: string;
  company: {
    brandName: string;
    legalName: string;
    addressLine: string;
    email?: string;
    phone?: string;
    logoUrl: string;
    watermarkText: string;
  };
  employee: {
    name: string;
    employeeId: string;
    designation: string;
    department: string;
    joiningDate?: string;
  };
  periodLabel: string;
  payDate: string;
  netPay: number;
  grossEarnings: number;
  totalDeductions: number;
  paidDays: number;
  lopDays: number;
  leaveDays?: number;
  wfhDays?: number;
  lateDays?: number;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
};

export function inrMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function inrDecimal(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function amountInWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function two(n: number) {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
  }

  function convert(n: number): string {
    if (n === 0) return "Zero";
    let words = "";
    let rest = n;
    const crore = Math.floor(rest / 10000000);
    rest %= 10000000;
    const lakh = Math.floor(rest / 100000);
    rest %= 100000;
    const thousand = Math.floor(rest / 1000);
    rest %= 1000;
    const hundred = Math.floor(rest / 100);
    rest %= 100;
    if (crore) words += `${two(crore)} Crore `;
    if (lakh) words += `${two(lakh)} Lakh `;
    if (thousand) words += `${two(thousand)} Thousand `;
    if (hundred) words += `${ones[hundred]} Hundred `;
    if (rest) words += two(rest);
    return words.trim();
  }

  return convert(Math.floor(amount));
}

export function hrmPayslipToViewModel(detail: HrmPayslipDetail): PayslipViewModel {
  const periodLabel = payslipPeriodLabel(detail.month, detail.year);
  const earnings: PayslipLine[] = [
    { label: "Basic Salary", amount: detail.basic, ytd: detail.basic },
    { label: "House Rent Allowance", amount: detail.hra, ytd: detail.hra },
    { label: "Special Allowance", amount: detail.allowances, ytd: detail.allowances },
  ].filter((r) => r.amount > 0);

  if (!earnings.length) {
    earnings.push({ label: "Gross Salary", amount: detail.gross, ytd: detail.gross });
  }

  const deductions: PayslipLine[] = [
    ...(detail.lopDeduction > 0
      ? [{ label: "LOP Deduction", amount: detail.lopDeduction, ytd: detail.lopDeduction }]
      : []),
    ...(detail.pfEmployee > 0
      ? [{ label: "PF (Employee)", amount: detail.pfEmployee, ytd: detail.pfEmployee }]
      : []),
    ...(detail.tds > 0 ? [{ label: "TDS", amount: detail.tds, ytd: detail.tds }] : []),
  ];

  if (!deductions.length && detail.deductions > 0) {
    deductions.push({
      label: "Total Deductions",
      amount: detail.deductions,
      ytd: detail.deductions,
    });
  }

  return {
    payslipId: String(detail.id),
    company: {
      brandName: detail.companyName,
      legalName: detail.companyName,
      addressLine: "",
      logoUrl: BRAND.logoSrc,
      watermarkText: detail.companyName,
    },
    employee: {
      name: detail.employeeName,
      employeeId: detail.employeeId ?? "—",
      designation: "—",
      department: detail.department ?? "—",
    },
    periodLabel,
    payDate: new Date().toLocaleDateString("en-IN"),
    netPay: detail.net,
    grossEarnings: detail.gross,
    totalDeductions: detail.deductions,
    paidDays: detail.paidDays,
    lopDays: detail.lopDays,
    lateDays: detail.lateCount,
    earnings,
    deductions,
  };
}
