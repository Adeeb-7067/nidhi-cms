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

function pronouns(gender) {
  const g = String(gender ?? "").toLowerCase();
  if (g === "male") return { subject: "He", object: "him", possessive: "his" };
  if (g === "female") return { subject: "She", object: "her", possessive: "her" };
  return { subject: "They", object: "them", possessive: "their" };
}

function tenurePhrase(joiningDate, relievingDate) {
  const start = formatLetterDate(joiningDate);
  const end = formatLetterDate(relievingDate);
  return `from <strong>${start}</strong> to <strong>${end}</strong>`;
}

const LETTER_PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    color: #1e293b;
    font-size: 13px;
    line-height: 1.65;
    margin: 0;
    padding: 0;
  }
  .letter {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
    min-height: 900px;
  }
  .letter-content {
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
    overflow: hidden;
  }
  .watermark-logo {
    width: 340px;
    max-width: 72%;
    opacity: 0.07;
    transform: rotate(-28deg);
    object-fit: contain;
  }
  .watermark-text {
    position: absolute;
    font-size: 64px;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: #4f46e5;
    opacity: 0.06;
    transform: rotate(-32deg);
    white-space: nowrap;
    user-select: none;
    font-family: system-ui, sans-serif;
  }
  .letterhead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 14px;
    margin-bottom: 24px;
  }
  .brand h1 {
    margin: 0;
    font-size: 22px;
    color: #312e81;
    letter-spacing: 0.02em;
  }
  .brand p {
    margin: 4px 0 0;
    font-size: 11px;
    color: #64748b;
    font-family: system-ui, sans-serif;
  }
  .logo {
    max-height: 56px;
    max-width: 140px;
    object-fit: contain;
  }
  .meta {
    margin-bottom: 22px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    color: #475569;
  }
  .meta p { margin: 2px 0; }
  .title {
    text-align: center;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #312e81;
    margin: 0 0 20px;
  }
  .salutation { margin-bottom: 14px; }
  p { margin: 0 0 12px; text-align: justify; }
  .signature {
    margin-top: 36px;
    font-family: system-ui, sans-serif;
    position: relative;
    min-height: 120px;
  }
  .signature-block {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-top: 12px;
  }
  .signature .line {
    width: 220px;
    padding-top: 8px;
    font-size: 12px;
    color: #334155;
    margin-top: 0;
  }
  .seal-wrap {
    position: relative;
    flex-shrink: 0;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .seal-img {
    width: 88px;
    height: 88px;
    object-fit: contain;
    opacity: 0.92;
  }
  .seal-stamp {
    width: 84px;
    height: 84px;
    border: 2px solid #818cf8;
    border-radius: 50%;
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 8px;
    font-weight: 700;
    line-height: 1.25;
    opacity: 0.85;
    transform: rotate(-12deg);
    padding: 8px;
    font-family: system-ui, sans-serif;
  }
  .footer-note {
    margin-top: 28px;
    font-size: 10px;
    color: #94a3b8;
    font-family: system-ui, sans-serif;
    border-top: 1px dashed #e2e8f0;
    padding-top: 10px;
  }
`;

function experienceBody({ employeeName, designation, departmentName, joiningDate, relievingDate, pronoun, additionalNotes }) {
  const role = designation?.trim() || "the assigned role";
  const dept = departmentName?.trim() ? ` in the <strong>${escapeHtml(departmentName)}</strong> department` : "";
  const note = additionalNotes?.trim()
    ? `<p>${escapeHtml(additionalNotes)}</p>`
    : "";

  return `
    <p class="salutation">To Whom It May Concern,</p>
    <p>
      This is to certify that <strong>${escapeHtml(employeeName)}</strong>
      was employed with our organization ${tenurePhrase(joiningDate, relievingDate)}
      as <strong>${escapeHtml(role)}</strong>${dept}.
    </p>
    <p>
      During ${pronoun.possessive} tenure with us, ${pronoun.subject.toLowerCase()} performed
      ${pronoun.possessive} duties with dedication, professionalism, and integrity.
      ${pronoun.subject} maintained good conduct and was cooperative with colleagues and management.
    </p>
    <p>
      We found ${pronoun.object} to be sincere, hardworking, and dependable.
      We wish ${pronoun.object} every success in ${pronoun.possessive} future endeavours.
    </p>
    ${note}
    <p>Please feel free to contact us for any further information.</p>
  `;
}

function relievingBody({ employeeName, designation, departmentName, joiningDate, relievingDate, pronoun, additionalNotes }) {
  const role = designation?.trim() || "the assigned role";
  const dept = departmentName?.trim() ? ` in the <strong>${escapeHtml(departmentName)}</strong> department` : "";
  const note = additionalNotes?.trim()
    ? `<p>${escapeHtml(additionalNotes)}</p>`
    : "";

  return `
    <p class="salutation">Dear ${escapeHtml(employeeName)},</p>
    <p>
      This is to confirm that you were employed with our organization
      ${tenurePhrase(joiningDate, relievingDate)} as <strong>${escapeHtml(role)}</strong>${dept}.
    </p>
    <p>
      We accept your resignation and hereby relieve you from your duties with effect from
      <strong>${formatLetterDate(relievingDate)}</strong>.
      You are requested to hand over all company property, credentials, and pending assignments
      as per the exit checklist, if not already completed.
    </p>
    <p>
      We appreciate your contributions during your tenure and wish you the very best
      in your future career.
    </p>
    ${note}
    <p>
      We certify that ${pronoun.subject.toLowerCase()} has cleared ${pronoun.possessive} obligations
      with the organization to the best of our knowledge as on the relieving date mentioned above.
    </p>
  `;
}

/**
 * @param {{
 *   company: { name: string; address?: string | null; logoUrl?: string | null; sealUrl?: string | null };
 *   employeeName: string;
 *   designation?: string | null;
 *   departmentName?: string | null;
 *   joiningDate?: string | Date | null;
 *   relievingDate: string | Date;
 *   letterType: 'experience' | 'relieving';
 *   issuedDate?: string | Date;
 *   gender?: string | null;
 *   additionalNotes?: string | null;
 * }} params
 */
export function generateExperienceLetterHtml({
  company,
  employeeName,
  designation,
  departmentName,
  joiningDate,
  relievingDate,
  letterType,
  issuedDate = new Date(),
  gender,
  additionalNotes,
}) {
  const pronoun = pronouns(gender);
  const title = letterType === "relieving" ? "Relieving Letter" : "Experience Letter";
  const body =
    letterType === "relieving"
      ? relievingBody({
          employeeName,
          designation,
          departmentName,
          joiningDate,
          relievingDate,
          pronoun,
          additionalNotes,
        })
      : experienceBody({
          employeeName,
          designation,
          departmentName,
          joiningDate,
          relievingDate,
          pronoun,
          additionalNotes,
        });

  const logo = company.logoUrl
    ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" alt="" />`
    : "";

  const watermarkLogo = company.logoUrl
    ? `<img class="watermark-logo" src="${escapeHtml(company.logoUrl)}" alt="" />`
    : "";
  const watermarkText = `<span class="watermark-text">${escapeHtml(company.name)}</span>`;

  const sealBlock = company.sealUrl
    ? `<img class="seal-img" src="${escapeHtml(company.sealUrl)}" alt="Official seal" />`
    : `<div class="seal-stamp">${escapeHtml(company.name)}<br/>AUTHORIZED</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(employeeName)}</title>
  <style>${LETTER_PRINT_CSS}</style>
</head>
<body>
  <div class="letter">
    <div class="watermark-layer" aria-hidden="true">
      ${watermarkLogo}
      ${watermarkText}
    </div>
    <div class="letter-content">
    <div class="letterhead">
      <div class="brand">
        <h1>${escapeHtml(company.name)}</h1>
        ${company.address ? `<p>${escapeHtml(company.address)}</p>` : ""}
      </div>
      ${logo}
    </div>

    <div class="meta">
      <p><strong>Date:</strong> ${formatLetterDate(issuedDate)}</p>
      <p><strong>Employee:</strong> ${escapeHtml(employeeName)}</p>
      ${designation ? `<p><strong>Designation:</strong> ${escapeHtml(designation)}</p>` : ""}
      ${departmentName ? `<p><strong>Department:</strong> ${escapeHtml(departmentName)}</p>` : ""}
    </div>

    <h2 class="title">${escapeHtml(title)}</h2>
    ${body}

    <div class="signature">
      <p>Yours sincerely,</p>
      <div class="signature-block">
        <div class="line">
          <strong>For ${escapeHtml(company.name)}</strong><br />
          Human Resources Department
        </div>
        <div class="seal-wrap">${sealBlock}</div>
      </div>
    </div>

    <p class="footer-note">This is a system-generated letter. For verification, contact the HR department.</p>
    </div>
  </div>
</body>
</html>`;
}

export { formatLetterDate, escapeHtml };
