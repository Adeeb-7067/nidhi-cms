import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateOfferLetterHtml } from "../../src/services/hrm/offer-letter-template.js";
import { generateExperienceLetterHtml } from "../../src/services/hrm/experience-letter-template.js";

describe("hrm letter templates", () => {
  const company = {
    name: "Acme Pvt Ltd",
    address: "Mumbai, India",
    logoUrl: null,
    sealUrl: null,
  };

  it("renders experience letter html with employee details", () => {
    const html = generateExperienceLetterHtml({
      company,
      employeeName: "Rahul Sharma",
      designation: "Developer",
      departmentName: "Engineering",
      joiningDate: new Date("2022-01-15"),
      relievingDate: new Date("2026-06-30"),
      letterType: "experience",
      additionalNotes: "",
      gender: "male",
    });
    assert.match(html, /Rahul Sharma/);
    assert.match(html, /Acme Pvt Ltd/);
    assert.match(html, /Experience Letter/i);
  });

  it("renders offer letter html with CTC", () => {
    const html = generateOfferLetterHtml({
      company,
      employeeName: "Priya Patel",
      designation: "BDE",
      departmentName: "Sales",
      offerDate: new Date("2026-07-01"),
      joiningDate: new Date("2026-07-15"),
      offeredCtc: 600000,
      additionalNotes: "Welcome aboard.",
    });
    assert.match(html, /Priya Patel/);
    assert.match(html, /₹6,00,000|600,000/);
    assert.match(html, /Welcome aboard/);
  });
});
