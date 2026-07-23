import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkDigitalModuleAccess,
  checkDigitalResourceOwnership,
  getDigitalSubRoleModules,
} from "../../src/middlewares/digital-access.js";

describe("Digital Department RBAC & Sub-Role Access Control", () => {
  it("Super Admin has unscoped access to all modules and resources", () => {
    const admin = { role: "super_admin", subType: null, id: 1 };
    assert.equal(checkDigitalModuleAccess(admin, "marketing_ads"), true);
    assert.equal(checkDigitalModuleAccess(admin, "marketing_seo"), true);
    assert.equal(checkDigitalResourceOwnership(admin, { projectId: 999 }), true);
  });

  it("Designer cannot see Dashboard or Meta Ads", () => {
    const designer = { role: "digital", subType: "Designer", id: 2 };
    const modules = getDigitalSubRoleModules(designer);
    assert.ok(modules.includes("marketing_content"));
    assert.ok(modules.includes("marketing_media"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_dashboard"));
  });

  it("Video Editor cannot see Meta Ads or Budgets", () => {
    const videoEditor = { role: "digital", subType: "Video Editor", id: 3 };
    const modules = getDigitalSubRoleModules(videoEditor);
    assert.ok(modules.includes("marketing_content"));
    assert.ok(modules.includes("marketing_media"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_reports"));
  });

  it("SEO Expert cannot see Budgets or Approvals", () => {
    const seo = { role: "digital", subType: "SEO Expert", id: 4 };
    const modules = getDigitalSubRoleModules(seo);
    assert.ok(modules.includes("marketing_seo"));
    assert.ok(modules.includes("marketing_analytics"));
    assert.ok(!modules.includes("marketing_content"));
    assert.ok(!modules.includes("marketing_approvals"));
  });

  it("Account Manager can approve content and view assigned budgets", () => {
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    const modules = getDigitalSubRoleModules(am);
    assert.ok(modules.includes("marketing_approvals"));
    assert.ok(modules.includes("marketing_reports"));
    assert.ok(modules.includes("marketing_dashboard"));
  });

  it("Freelancer is strictly scoped to assigned tasks and project files", () => {
    const freelancer = { role: "digital", subType: "Freelancer", id: 6, scopedAccess: { projectIds: [10] } };
    assert.equal(checkDigitalResourceOwnership(freelancer, { projectId: 10, assigneeId: 6 }), true);
    assert.equal(checkDigitalResourceOwnership(freelancer, { projectId: 10, assigneeId: 99 }), false);
  });

  it("Users cannot access cross-project resources", () => {
    const user = { role: "digital", subType: "Designer", id: 7, scopedAccess: { projectIds: [10] } };
    assert.equal(checkDigitalResourceOwnership(user, { projectId: 10 }), true);
    assert.equal(checkDigitalResourceOwnership(user, { projectId: 20 }), false);
  });
});
