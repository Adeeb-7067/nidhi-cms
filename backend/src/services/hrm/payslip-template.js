function formatInr(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(amount) {
  return formatInr(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatMonthYear(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function monthIndex(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? 1 : d.getMonth() + 1;
}

// Indian fiscal year (April=1 … March=12), capped at months since employee joined.
function fiscalMonthIndex(slipDate, joiningDate) {
  const d = slipDate ? new Date(slipDate) : new Date();
  if (isNaN(d.getTime())) return 1;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const fyStartYear = month >= 4 ? year : year - 1;
  const fiscalStart = new Date(fyStartYear, 3, 1);
  const fiscalMonths = (year - fyStartYear) * 12 + month - 3;
  if (joiningDate) {
    const jd = new Date(joiningDate);
    if (!isNaN(jd.getTime()) && jd > fiscalStart) {
      const monthsSinceJoining =
        (year - jd.getFullYear()) * 12 + month - (jd.getMonth() + 1) + 1;
      return Math.max(1, Math.min(fiscalMonths, monthsSinceJoining));
    }
  }
  return Math.max(1, fiscalMonths);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function twoDigits(n) {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
}

function convertIndianNumber(n) {
  if (n === 0) return "Zero";
  let words = "";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore) words += `${twoDigits(crore)} Crore `;
  if (lakh) words += `${twoDigits(lakh)} Lakh `;
  if (thousand) words += `${twoDigits(thousand)} Thousand `;
  if (hundred) words += `${ones[hundred]} Hundred `;
  if (n) words += twoDigits(n);
  return words.trim();
}

function amountInWords(amount) {
  const n = Math.round(Number(amount) || 0);
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let text = convertIndianNumber(rupees);
  if (paise) text += ` and ${convertIndianNumber(paise)} Paise`;
  return text;
}

function splitAllowances(basic, allowances) {
  const total = Number(allowances) || 0;
  if (total <= 0) {
    return { hra: 0, conveyance: 0, special: 0, other: 0 };
  }
  const hra = Math.round(total * 0.45);
  const conveyance = Math.round(total * 0.15);
  const special = Math.max(0, total - hra - conveyance);
  return { hra, conveyance, special, other: 0 };
}

function buildDeductionRows(payRollData) {
  const halfDed = Number(payRollData?.halfDayDeductionAmount ?? 0);
  const lateDed = Number(payRollData?.lateDeductionAmount ?? 0);
  const absentDed = Number(payRollData?.absentDeductionAmount ?? 0);
  const unpaidLeaveDed = Number(payRollData?.unpaidLeaveDeductionAmount ?? 0);
  const manualDed = Number(payRollData?.manualDeductionAmount ?? 0);
  const attendanceDed = halfDed + lateDed + absentDed;

  const rows = [];

  if (attendanceDed > 0) {
    rows.push({ label: "Attendance Deductions", amount: attendanceDed });
  }
  if (unpaidLeaveDed > 0) {
    rows.push({ label: "LOP Deduction", amount: unpaidLeaveDed });
  }
  if (manualDed > 0) {
    rows.push({ label: "Deduction", amount: manualDed });
  }

  return rows.filter((row) => row.amount > 0);
}

function detailRow(label, value) {
  return `
    <div class="detail-row">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${escapeHtml(value)}</span>
    </div>`;
}

function formatDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function tableRows(rows, ytdFactor) {
  return rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num">${formatAmount(row.amount)}</td>
        <td class="num">${formatAmount(row.amount * ytdFactor)}</td>
      </tr>`,
    )
    .join("");
}

function tableRowsAmountOnly(rows) {
  return rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num">${formatAmount(row.amount)}</td>
      </tr>`,
    )
    .join("");
}

/** Prorated earnings rows for CMS payroll (contract net / 30 × paid days). */
function buildCmsEarningsRows(payRollData, salary) {
  const earnedGross = Number(payRollData?.earnedGross ?? 0);
  const basic =
    Number(payRollData?.salaryBaseUsed) > 0
      ? Number(payRollData.salaryBaseUsed)
      : Number(salary.basicSalary ?? 0);
  const allowances = Math.max(0, Number(salary.allowances ?? 0));
  const monthlyGross = basic + allowances;
  const earningsRows = [];

  if (basic > 0 && monthlyGross > 0 && earnedGross > 0) {
    const basicEarned = Math.round((earnedGross * basic) / monthlyGross * 100) / 100;
    const allowanceEarned = Math.round((earnedGross - basicEarned) * 100) / 100;
    earningsRows.push({ label: "Basic Salary", amount: basicEarned });
    if (allowanceEarned > 0) {
      const allowanceSplit = splitAllowances(basicEarned, allowanceEarned);
      if (allowanceSplit.hra > 0) {
        earningsRows.push({ label: "House Rent Allowance", amount: allowanceSplit.hra });
      }
      if (allowanceSplit.conveyance > 0) {
        earningsRows.push({ label: "Conveyance Allowance", amount: allowanceSplit.conveyance });
      }
      if (allowanceSplit.special > 0) {
        earningsRows.push({ label: "Special Allowance", amount: allowanceSplit.special });
      }
      if (allowanceSplit.other > 0) {
        earningsRows.push({ label: "Other Allowance", amount: allowanceSplit.other });
      }
    }
  } else if (earnedGross > 0) {
    earningsRows.push({ label: "Salary (earned)", amount: earnedGross });
  }

  const overtime = Number(payRollData?.overtimeAmount ?? 0);
  if (overtime > 0) {
    earningsRows.push({ label: "Overtime", amount: overtime });
  }

  return earningsRows.filter((row) => row.amount > 0);
}

/** Single source of truth for payslip numbers (HTML + JSON API + PDF). */
function buildPayslipFigures(payRollData, companyData) {
  const emp = payRollData?.employeeId || {};
  const salary = emp.salary || {};
  const bank = salary.bankAccount || {};
  const addr = companyData?.address || {};

  const slipDate = payRollData?.paySlipTime ?? payRollData?.createdAt ?? new Date();
  const payDate = payRollData?.paidOn ?? slipDate;
  const ytdFactor = fiscalMonthIndex(slipDate, emp.joiningDate);

  const isCmsPayroll = payRollData?.cmsPayroll === true;
  const basic =
    Number(payRollData?.salaryBaseUsed) > 0
      ? Number(payRollData.salaryBaseUsed)
      : Number(salary.basicSalary ?? 0);
  const contractNet = Number(
    payRollData?.contractNetMonthly ?? salary.netSalary ?? payRollData?.totalSalary ?? 0,
  );
  const storedAllowances = Math.max(0, Number(salary.allowances ?? 0));
  const derivedAllowances =
    basic > 0 && contractNet > basic ? contractNet - basic : 0;
  const allowances = storedAllowances > 0 ? storedAllowances : derivedAllowances;

  let filteredEarnings;
  let grossEarnings;
  let deductionRows;
  let totalDeductions;
  let netPay;
  let paidDays;
  let lopDays;

  if (isCmsPayroll) {
    filteredEarnings = buildCmsEarningsRows(payRollData, salary);
    if (!filteredEarnings.length) {
      filteredEarnings.push({ label: "Salary (earned)", amount: 0 });
    }
    grossEarnings = filteredEarnings.reduce((sum, row) => sum + row.amount, 0);
    deductionRows = buildDeductionRows(payRollData);
    netPay = Number(payRollData?.paySalary ?? 0);
    const explicitDeductions = deductionRows.reduce((sum, row) => sum + row.amount, 0);
    totalDeductions =
      explicitDeductions > 0
        ? explicitDeductions
        : Math.max(0, Math.round((grossEarnings - netPay) * 100) / 100);
    paidDays = Math.round(Number(payRollData?.totalFullDay ?? 0) * 100) / 100;
    lopDays = Math.round(Number(payRollData?.totalLeaveOrAbsent ?? 0) * 100) / 100;
  } else {
    const allowanceSplit = splitAllowances(basic, allowances);
    const earningsRows = [];
    if (basic > 0) {
      earningsRows.push({ label: "Basic Salary", amount: basic });
      if (allowances > 0) {
        if (allowanceSplit.hra > 0) {
          earningsRows.push({ label: "House Rent Allowance", amount: allowanceSplit.hra });
        }
        if (allowanceSplit.conveyance > 0) {
          earningsRows.push({ label: "Conveyance Allowance", amount: allowanceSplit.conveyance });
        }
        if (allowanceSplit.special > 0) {
          earningsRows.push({ label: "Special Allowance", amount: allowanceSplit.special });
        }
        if (allowanceSplit.other > 0) {
          earningsRows.push({ label: "Other Allowance", amount: allowanceSplit.other });
        }
      }
    } else {
      earningsRows.push({
        label: "Gross Salary",
        amount: contractNet || payRollData?.totalSalary || 0,
      });
    }
    earningsRows.push({ label: "Overtime", amount: Number(payRollData?.overtimeAmount ?? 0) });
    filteredEarnings = earningsRows.filter((row) => row.amount > 0);

    if (!filteredEarnings.length) {
      filteredEarnings.push({
        label: "Gross Salary",
        amount: payRollData?.totalSalary ?? 0,
      });
    }

    grossEarnings = filteredEarnings.reduce((sum, row) => sum + row.amount, 0);
    deductionRows = buildDeductionRows(payRollData);
    totalDeductions =
      deductionRows.reduce((sum, row) => sum + row.amount, 0) ||
      Math.max(0, grossEarnings - (payRollData?.paySalary ?? 0));
    netPay = Number(payRollData?.paySalary ?? grossEarnings - totalDeductions);

    const approvedLeaveDays = Number(payRollData?.approvedLeaveDaysUsed ?? 0);
    const unpaidLeaveDays = Number(payRollData?.unpaidLeaveDays ?? 0);
    const paidLeaveDays = Math.max(0, approvedLeaveDays - unpaidLeaveDays);
    const workingDays =
      Number(payRollData?.totalFullDay ?? 0) +
      Number(payRollData?.totalHalfDay ?? 0) * 0.5;
    paidDays = Math.round((workingDays + paidLeaveDays) * 100) / 100;
    lopDays =
      Math.round(
        (Number(payRollData?.totalLeaveOrAbsent ?? 0) + unpaidLeaveDays) * 100,
      ) / 100;
  }

  const approvedLeaveDays = Number(payRollData?.approvedLeaveDaysUsed ?? 0);
  const leaveDays = approvedLeaveDays;
  const wfhDays = Number(payRollData?.totalWfh ?? 0);
  const lateDays = Number(payRollData?.totalLate ?? 0);
  const leaveBalance =
    payRollData?.leaveBalanceCarryForward != null
      ? Number(payRollData.leaveBalanceCarryForward)
      : null;
  const leaveAllowancePool =
    payRollData?.leaveAllowance != null
      ? Number(payRollData.leaveAllowance)
      : null;
  const leaveUsedThisMonth =
    payRollData?.approvedLeaveDaysUsed != null
      ? Number(payRollData.approvedLeaveDaysUsed)
      : null;

  const department =
    emp.departmentId?.departmentName ?? emp.departmentId?.name ?? "—";
  const companyName =
    companyData?.companyName ?? "Satyakabir Buildmart Private Limited";
  const brandName =
    companyData?.companyName?.split(/\s+/)[0]?.toUpperCase() ?? "SATYAKABIR";
  const watermarkText = brandName;
  const logoUrl =
    companyData?.logoUrl ||
    process.env.DEFAULT_LOGO_URL ||
    `${(process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || "http://localhost:5173").replace(/\/$/, "")}/logo.png`;
  const sealUrl = companyData?.sealUrl ?? null;
  const addressLine = [
    addr.street,
    addr.city,
    addr.state,
    addr.zipCode ? `- ${addr.zipCode}` : "",
  ]
    .filter(Boolean)
    .join(", ") ||
    "Unit No. 404, 4th Floor, Emaar Colonnade, Sector-66, Golf Course Extn Road, Gurugram, Haryana - 122101";
  const employeeName = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || "—";
  const pfAccount = bank.accountNumber
    ? `HR/${emp.employeeId ?? "00000"}/${bank.accountNumber}`
    : "—";
  const uanNumber = emp.adharNumber ?? emp.panNumber ?? "—";

  return {
    emp,
    slipDate,
    payDate,
    ytdFactor,
    filteredEarnings,
    deductionRows,
    grossEarnings,
    totalDeductions,
    netPay,
    paidDays,
    lopDays,
    leaveDays,
    wfhDays,
    lateDays,
    leaveBalance,
    leaveAllowancePool,
    leaveUsedThisMonth,
    department,
    companyName,
    brandName,
    watermarkText,
    logoUrl,
    sealUrl,
    addressLine,
    employeeName,
    pfAccount,
    uanNumber,
    status: payRollData?.status ?? "UNPAID",
  };
}

const generatePaySlipHtml = (
  payRollData,
  companyData,
  _fullDaySalary,
  _halfDaySalary,
  _lateDaySalary,
) => {
  const f = buildPayslipFigures(payRollData, companyData);
  const {
    emp,
    slipDate,
    payDate,
    ytdFactor,
    filteredEarnings,
    deductionRows,
    grossEarnings,
    totalDeductions,
    netPay,
    paidDays,
    lopDays,
    leaveDays,
    wfhDays,
    lateDays,
    leaveBalance,
    leaveAllowancePool,
    leaveUsedThisMonth,
    companyName,
    brandName,
    watermarkText,
    logoUrl,
    sealUrl,
    addressLine,
    employeeName,
    pfAccount,
    uanNumber,
  } = f;
  const department =
    emp.departmentId?.departmentName ?? emp.departmentId?.name ?? "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip - ${escapeHtml(employeeName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1f2937;
      font-size: 11px;
      line-height: 1.45;
    }
    .page {
      position: relative;
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      padding: 28px 32px 24px;
      background: #fff;
      overflow: hidden;
    }
    @media print {
      .page { width: 794px; max-width: none; }
    }
    .page-content {
      position: relative;
      z-index: 1;
    }
    .watermark-layer {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .watermark-logo {
      width: 360px;
      max-width: 70%;
      opacity: 0.07;
      transform: rotate(-28deg);
      object-fit: contain;
    }
    .watermark-text {
      position: absolute;
      font-size: 72px;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: #3f7f2d;
      opacity: 0.06;
      transform: rotate(-32deg);
      white-space: nowrap;
      user-select: none;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
    }
    .brand {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      max-width: 68%;
    }
    .logo {
      width: 58px;
      height: 58px;
      object-fit: contain;
      border-radius: 50%;
    }
    .brand-name {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #111827;
      margin-bottom: 4px;
    }
    .brand-sub, .brand-meta {
      color: #6b7280;
      font-size: 10px;
      margin-top: 2px;
    }
    .month-box {
      text-align: right;
      min-width: 180px;
    }
    .month-label {
      font-size: 10px;
      letter-spacing: 0.08em;
      color: #6b7280;
      font-weight: 700;
    }
    .month-value {
      margin-top: 4px;
      font-size: 28px;
      font-weight: 800;
      color: #3f7f2d;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
      margin-top: 18px;
    }
    .panel {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #374151;
    }
    .panel-head svg { width: 14px; height: 14px; color: #3f7f2d; }
    .details-body { padding: 8px 14px 12px; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 700; color: #111827; text-align: right; }
    .net-panel {
      border: 1px solid #d7e8cf;
      border-left: 4px solid #3f7f2d;
      background: #f7fbf4;
      border-radius: 10px;
      padding: 18px 16px 14px;
      min-height: 100%;
    }
    .net-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #374151;
    }
    .net-amount {
      margin-top: 8px;
      font-size: 34px;
      font-weight: 800;
      color: #3f7f2d;
      line-height: 1.1;
    }
    .net-words {
      margin-top: 6px;
      color: #6b7280;
      font-size: 10px;
    }
    .mini-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 16px;
    }
    .mini-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #374151;
      font-size: 10px;
      font-weight: 600;
    }
    .mini-stat svg { width: 14px; height: 14px; color: #3f7f2d; }
    .accounts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fcfcfc;
    }
    .account-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      color: #374151;
    }
    .account-item svg { width: 14px; height: 14px; color: #3f7f2d; flex-shrink: 0; }
    .tables {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }
    .table-wrap {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .table-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
      background: #fafafa;
    }
    .table-head.earn svg { color: #3f7f2d; }
    .table-head.deduct svg { color: #b42318; }
    .table-head svg { width: 14px; height: 14px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      text-align: left;
    }
    th {
      background: #f8fafc;
      color: #6b7280;
      font-size: 9px;
      letter-spacing: 0.05em;
      font-weight: 700;
    }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .total-row td {
      font-weight: 800;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
    }
    .total-row.earn td {
      background: #f0f7eb;
      color: #3f7f2d;
    }
    .total-row.deduct td {
      background: #fef2f2;
      color: #b42318;
    }
    .net-banner {
      margin-top: 16px;
      border: 1px solid #d7e8cf;
      background: #f7fbf4;
      border-radius: 10px;
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .net-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .net-banner-icon {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #3f7f2d;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .net-banner-icon svg { width: 20px; height: 20px; fill: #fff; }
    .net-banner-title {
      font-size: 13px;
      font-weight: 800;
      color: #111827;
    }
    .net-banner-sub {
      font-size: 10px;
      color: #6b7280;
      margin-top: 2px;
    }
    .net-banner-right {
      text-align: right;
    }
    .net-banner-amount {
      font-size: 28px;
      font-weight: 800;
      color: #3f7f2d;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      margin-top: 18px;
    }
    .footer-panel {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px;
      min-height: 150px;
    }
    .footer-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #374151;
      padding-bottom: 8px;
      border-bottom: 2px solid #3f7f2d;
      margin-bottom: 10px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 10px;
    }
    .footer-row:last-child { border-bottom: none; }
    .sign-box {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: calc(100% - 28px);
    }
    .sign-area {
      margin-top: 18px;
      min-height: 70px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      position: relative;
    }
    .sign-line {
      width: 180px;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      color: #374151;
    }
    .stamp {
      position: absolute;
      right: 20px;
      bottom: 8px;
      width: 72px;
      height: 72px;
      border: 2px solid #93c5fd;
      border-radius: 50%;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 8px;
      font-weight: 700;
      opacity: 0.85;
      transform: rotate(-12deg);
    }
    .seal-img {
      position: absolute;
      right: 12px;
      bottom: 4px;
      width: 80px;
      height: 80px;
      object-fit: contain;
      opacity: 0.92;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark-layer" aria-hidden="true">
      <img class="watermark-logo" src="${escapeHtml(logoUrl)}" alt="" />
      <span class="watermark-text">${escapeHtml(watermarkText)}</span>
    </div>
    <div class="page-content">
    <div class="top">
      <div class="brand">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Company logo" />
        <div>
          <div class="brand-name">${escapeHtml(brandName)}</div>
          <div class="brand-sub">${escapeHtml(companyName)}</div>
          <div class="brand-meta">${escapeHtml(addressLine || "—")}</div>
          <div class="brand-meta">${escapeHtml(companyData?.email ?? "")}${companyData?.phone ? ` | ${escapeHtml(companyData.phone)}` : ""}</div>
        </div>
      </div>
      <div class="month-box">
        <div class="month-label">PAYSLIP FOR THE MONTH</div>
        <div class="month-value">${escapeHtml(formatMonthYear(slipDate))}</div>
      </div>
    </div>

    <div class="hero">
      <div class="panel">
        <div class="panel-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          EMPLOYEE DETAILS
        </div>
        <div class="details-body">
          ${detailRow("Employee Name", employeeName)}
          ${detailRow("Employee ID", emp.employeeId ?? "—")}
          ${detailRow("Designation", emp.designation ?? "—")}
          ${detailRow("Department", department)}
          ${detailRow("Date of Joining", formatDate(emp.joiningDate))}
          ${detailRow("Pay Period", formatMonthYear(slipDate))}
          ${detailRow("Pay Date", formatDate(payDate))}
        </div>
      </div>

      <div class="net-panel">
        <div class="net-label">TOTAL NET PAY</div>
        <div class="net-amount">${formatInr(netPay)}</div>
        <div class="net-words">(Rupees ${escapeHtml(amountInWords(netPay))} Only)</div>
        <div class="mini-stats">
          <div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Paid Days: ${formatDays(paidDays)}
          </div>
          <div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            LOP Days: ${formatDays(lopDays)}
          </div>
          <div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
            Leave Days: ${formatDays(leaveDays)}
          </div>
          ${
            wfhDays > 0
              ? `<div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z"/></svg>
            WFH Days: ${wfhDays}
          </div>`
              : ""
          }
          ${
            lateDays > 0
              ? `<div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Late marks: ${lateDays}
          </div>`
              : ""
          }
          ${
            leaveAllowancePool != null
              ? `<div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
            Paid leave pool: ${leaveAllowancePool != null ? leaveAllowancePool.toFixed(2) : "—"}
          </div>`
              : ""
          }
          ${
            leaveBalance != null
              ? `<div class="mini-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
            Leave balance (available): ${leaveBalance != null ? leaveBalance.toFixed(2) : "—"}
          </div>`
              : ""
          }
        </div>
      </div>
    </div>

    <div class="tables">
      <div class="table-wrap">
        <div class="table-head earn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          EARNINGS
        </div>
        <table>
          <thead>
            <tr>
              <th>EARNINGS</th>
              <th class="num">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsAmountOnly(filteredEarnings)}
            <tr class="total-row earn">
              <td>GROSS EARNINGS</td>
              <td class="num">${formatAmount(grossEarnings)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-wrap">
        <div class="table-head deduct">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          DEDUCTIONS
        </div>
        <table>
          <thead>
            <tr>
              <th>DEDUCTIONS</th>
              <th class="num">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsAmountOnly(
              deductionRows.length
                ? deductionRows
                : [{ label: "Total Deductions", amount: totalDeductions }],
            )}
            <tr class="total-row deduct">
              <td>TOTAL DEDUCTIONS</td>
              <td class="num">${formatAmount(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="net-banner">
      <div class="net-banner-left">
        <div class="net-banner-icon">
          <svg viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
        </div>
        <div>
          <div class="net-banner-title">TOTAL NET PAYABLE</div>
          <div class="net-banner-sub">(Gross Earnings - Total Deductions)</div>
        </div>
      </div>
      <div class="net-banner-right">
        <div class="net-banner-amount">${formatInr(netPay)}</div>
        <div class="net-words">(Rupees ${escapeHtml(amountInWords(netPay))} Only)</div>
      </div>
    </div>

    <div class="footer-grid">
      <div class="footer-panel">
        <div class="footer-title">COMPANY AUTHORIZED SIGNATORY</div>
        <div class="sign-box">
          <div class="sign-area">
            ${
              sealUrl
                ? `<img class="seal-img" src="${escapeHtml(sealUrl)}" alt="Official seal" />`
                : `<div class="stamp">${escapeHtml(brandName)}<br/>AUTHORIZED</div>`
            }
            <div class="sign-line">
              Authorized Signatory<br/>
              ${escapeHtml(companyName)}
            </div>
          </div>
        </div>
      </div>
    </div>

    </div>
  </div>
</body>
</html>`;
};

/** Map CMS payroll entities to Satyakabir payslip template input. */
function buildCmsPayrollPayload({ user, run, line, structure, leaveSummary }) {
  const monthDate = new Date(run.year, run.month - 1, 1);
  const emp = user ?? {};
  const salary = structure ?? {};
  const profileSal = emp.salary ?? {};
  const nameParts = String(emp.name ?? "").trim().split(/\s+/);
  const contractNetMonthly = Number(salary.contractNet ?? profileSal.netSalary ?? 0);
  const structAllowances = (salary.hra ?? 0) + (salary.allowances ?? 0);
  const monthlyAllowances =
    structAllowances > 0 ? structAllowances : Number(profileSal.allowances) || 0;
  const basicSalary = salary.basic ?? (Number(profileSal.basicSalary) || 0);
  const approvedLeaveDaysUsed = Number(leaveSummary?.approvedLeaveDaysUsed ?? 0);
  const unpaidLeaveDays = Number(leaveSummary?.unpaidLeaveDays ?? 0);
  return {
    cmsPayroll: true,
    earnedGross: Number(line.gross ?? 0),
    contractNetMonthly,
    paySalary: line.net,
    totalSalary: contractNetMonthly,
    salaryBaseUsed: basicSalary,
    paySlipTime: monthDate,
    createdAt: monthDate,
    paidOn: line.paidOn ?? (run.status === "paid" ? new Date() : null),
    status: run.status === "paid" ? "PAID" : "UNPAID",
    lateDeductionAmount: 0,
    halfDayDeductionAmount: 0,
    absentDeductionAmount: 0,
    unpaidLeaveDeductionAmount: line.lopDeduction ?? 0,
    manualDeductionAmount: line.manualDeduction ?? 0,
    overtimeAmount: 0,
    totalFullDay: line.paidDays ?? 0,
    totalWfh: 0,
    totalHalfDay: 0,
    totalLate: line.lateCount ?? 0,
    totalLeaveOrAbsent: line.lopDays ?? 0,
    approvedLeaveDaysUsed,
    unpaidLeaveDays,
    employeeId: {
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" ") ?? "",
      employeeId: emp.employeeId ?? "—",
      designation: emp.designation ?? "—",
      departmentId: { departmentName: emp.department ?? "—" },
      joiningDate: emp.joiningDate,
      salary: {
        basicSalary,
        netSalary: contractNetMonthly,
        allowances: monthlyAllowances,
        bankAccount: { accountNumber: "—" },
      },
      panNumber: "—",
    },
  };
}

function resolvePublicAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (String(pathOrUrl).startsWith("http")) return pathOrUrl;
  const base = (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  const path = String(pathOrUrl).startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function buildCmsCompanyPayload(settings) {
  const addr = settings?.address;
  const logoUrl = resolvePublicAssetUrl(settings?.logoUrl) || resolvePublicAssetUrl("/logo.png");
  const sealUrl = resolvePublicAssetUrl(settings?.sealUrl);
  return {
    companyName: settings?.companyName ?? "Company",
    logoUrl,
    sealUrl,
    email: settings?.email ?? "",
    phone: settings?.phone ?? "",
    address:
      typeof addr === "string"
        ? { street: addr }
        : addr ?? { street: "" },
  };
}

function generatePayslipHtmlFromCms({ user, run, line, structure, settings, leaveSummary }) {
  const payRollData = buildCmsPayrollPayload({ user, run, line, structure, leaveSummary });
  const companyData = buildCmsCompanyPayload(settings);
  return generatePaySlipHtml(payRollData, companyData);
}

export {
  generatePaySlipHtml,
  buildPayslipFigures,
  formatDate,
  formatMonthYear,
  buildCmsPayrollPayload,
  buildCmsCompanyPayload,
  generatePayslipHtmlFromCms,
  resolvePublicAssetUrl,
};
