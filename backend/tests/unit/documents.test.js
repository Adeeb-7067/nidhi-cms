import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  collectProfileDocuments,
  isProfileDocumentId,
  PROFILE_DOCUMENT_ID_BASE,
} from "../../src/services/hrm/documents.service.js";

describe("collectProfileDocuments", () => {
  test("includes resume, proofs, certificates, and profileDocuments", () => {
    const docs = collectProfileDocuments({
      id: 42,
      name: "Alex Dev",
      employeeId: "EMP-42",
      resumeUrl: "/uploads/resume.pdf",
      idProofUrl: "/uploads/id.pdf",
      addressProofUrl: "/uploads/addr.pdf",
      certificateUrls: ["/uploads/cert1.pdf"],
      profileDocuments: [
        {
          name: "Experience letter",
          type: "Experience Letter",
          status: "Active",
          fileUrl: "/uploads/exp.pdf",
          uploadedAt: new Date("2025-06-01T10:00:00Z"),
        },
      ],
    });

    assert.equal(docs.length, 5);
    assert.ok(docs.some((d) => d.name === "Resume" && d.category === "resume"));
    assert.ok(docs.some((d) => d.name === "ID proof"));
    assert.ok(docs.some((d) => d.name === "Experience letter"));
    assert.ok(docs.every((d) => d.source === "profile"));
    assert.ok(docs.every((d) => d.userId === 42));
  });

  test("skips empty urls", () => {
    const docs = collectProfileDocuments({
      id: 1,
      name: "Test",
      resumeUrl: "",
      idProofUrl: null,
    });
    assert.equal(docs.length, 0);
  });
});

describe("isProfileDocumentId", () => {
  test("detects synthetic profile document ids", () => {
    assert.equal(isProfileDocumentId(PROFILE_DOCUMENT_ID_BASE + 100), true);
    assert.equal(isProfileDocumentId(12), false);
  });
});
