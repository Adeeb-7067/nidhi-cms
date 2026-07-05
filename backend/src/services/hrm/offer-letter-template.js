function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLetterDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export function generateOfferLetterHtml({
  company,
  employeeName,
  designation,
  departmentName,
  offerDate,
  joiningDate,
  offeredCtc,
  additionalNotes,
}) {
  const salaryLabel = formatCurrency(offeredCtc);
  const deptLine = departmentName?.trim() ? ` in the ${escapeHtml(departmentName)} department` : "";
  const noteBlock = additionalNotes?.trim()
    ? `<p style="margin-top:16px;">${escapeHtml(additionalNotes)}</p>`
    : "";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Offer Letter</title>
    <style>
      @page { size: A4; margin: 18mm; }
      body { font-family: Arial, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.7; }
      .wrap { max-width: 760px; margin: 0 auto; }
      .head { display:flex; justify-content:space-between; gap:16px; border-bottom:2px solid #4f46e5; padding-bottom:16px; margin-bottom:24px; }
      .brand h1 { margin:0; font-size:22px; color:#312e81; }
      .brand p { margin:4px 0 0; color:#6b7280; font-size:11px; }
      .logo { max-height:56px; max-width:140px; object-fit:contain; }
      .title { text-align:center; letter-spacing:.14em; text-transform:uppercase; font-size:16px; font-weight:700; color:#312e81; margin:18px 0; }
      .meta { font-size:12px; color:#4b5563; margin-bottom:16px; }
      .meta p { margin:3px 0; }
      .footer { margin-top:36px; font-size:12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="head">
        <div class="brand">
          <h1>${escapeHtml(company?.name ?? "Company")}</h1>
          <p>${escapeHtml(company?.address ?? "")}</p>
        </div>
        ${company?.logoUrl ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="Logo" />` : ""}
      </div>
      <div class="meta">
        <p><strong>Date:</strong> ${formatLetterDate(offerDate)}</p>
        <p><strong>Candidate:</strong> ${escapeHtml(employeeName)}</p>
      </div>
      <div class="title">Offer Letter</div>
      <p>Dear ${escapeHtml(employeeName)},</p>
      <p>
        We are pleased to offer you the position of <strong>${escapeHtml(designation || "Employee")}</strong>${deptLine}
        with <strong>${escapeHtml(company?.name ?? "our company")}</strong>.
      </p>
      <p>
        Your proposed joining date will be <strong>${formatLetterDate(joiningDate)}</strong>.
        ${salaryLabel ? `Your offered compensation will be <strong>${escapeHtml(salaryLabel)}</strong>.` : ""}
      </p>
      <p>
        This offer is made based on the information and documents shared by you and is subject to internal approvals,
        verification of credentials, and successful completion of onboarding formalities.
      </p>
      <p>
        Please sign and return a copy of this letter as your confirmation of acceptance.
        We look forward to welcoming you to the team.
      </p>
      ${noteBlock}
      <div class="footer">
        <p>Sincerely,</p>
        <p><strong>For ${escapeHtml(company?.name ?? "Company")}</strong></p>
      </div>
    </div>
  </body>
</html>`;
}
