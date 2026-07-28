import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkDigitalModuleAccess,
  checkDigitalResourceOwnership,
  getDigitalSubRoleModules,
  canManageCmsProjects,
  canAccessDigitalFreelancerDirectory,
  isDigitalElevatedLead,
  normalizeSubRole,
  filterDigitalPermissionSet,
  requireDigitalModuleAccess,
  shouldRestrictToOwnDigitalTasks,
  resolveDigitalTaskAssigneeId,
} from "../../src/middlewares/digital-access.js";
import { canManageMarketingClientCommercial } from "../../src/modules/marketing/services/helpers.js";

describe("Digital Department RBAC & Sub-Role Access Control", () => {
  it("Super Admin has unscoped access to all modules and resources", () => {
    const admin = { role: "super_admin", subType: null, id: 1 };
    assert.equal(checkDigitalModuleAccess(admin, "marketing_ads"), true);
    assert.equal(checkDigitalModuleAccess(admin, "marketing_seo"), true);
    assert.equal(checkDigitalResourceOwnership(admin, { projectId: 999 }), true);
  });

  it("Designer can open Digital home but cannot see Meta Ads or Reports", () => {
    const designer = { role: "digital", subType: "Designer", id: 2 };
    const modules = getDigitalSubRoleModules(designer);
    assert.ok(modules.includes("marketing_content"));
    assert.ok(modules.includes("marketing_media"));
    assert.ok(modules.includes("marketing_dashboard"));
    assert.ok(modules.includes("marketing_calendar"));
    assert.ok(modules.includes("marketing_approvals"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_reports"));
  });

  it("missing subType defaults to designer — not Account Manager", () => {
    const bare = { role: "digital", subType: null, id: 9 };
    const modules = getDigitalSubRoleModules(bare);
    assert.ok(modules.includes("marketing_content"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_reports"));
    assert.equal(canManageCmsProjects(bare), false);
  });

  it("unknown subType does not inherit Account Manager", () => {
    const odd = { role: "digital", subType: "Senior Creative", id: 10 };
    assert.ok(!getDigitalSubRoleModules(odd).includes("marketing_reports"));
    assert.equal(canManageCmsProjects(odd), false);
  });

  it("every digital sub-role can open Approvals (list is assignee-scoped for craft)", () => {
    for (const subType of [
      "Account Manager",
      "Digital Specialist",
      "Designer",
      "Video Editor",
      "Content Creator",
      "SEO Expert",
      "Ads Manager",
      "Freelancer",
    ]) {
      const modules = getDigitalSubRoleModules({ role: "digital", subType, id: 1 });
      assert.ok(
        modules.includes("marketing_approvals"),
        `${subType} should include marketing_approvals`,
      );
    }
  });

  it("Video Editor cannot see Meta Ads or Reports", () => {
    const videoEditor = { role: "digital", subType: "Video Editor", id: 3 };
    const modules = getDigitalSubRoleModules(videoEditor);
    assert.ok(modules.includes("marketing_content"));
    assert.ok(modules.includes("marketing_media"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_reports"));
  });

  it("SEO Expert cannot see Content or Reports", () => {
    const seo = { role: "digital", subType: "SEO Expert", id: 4 };
    const modules = getDigitalSubRoleModules(seo);
    assert.ok(modules.includes("marketing_seo"));
    assert.ok(modules.includes("marketing_analytics"));
    assert.ok(modules.includes("marketing_approvals"));
    assert.ok(!modules.includes("marketing_content"));
    assert.ok(!modules.includes("marketing_reports"));
  });

  it("Account Manager can approve content and view reports", () => {
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    const modules = getDigitalSubRoleModules(am);
    assert.ok(modules.includes("marketing_approvals"));
    assert.ok(modules.includes("marketing_reports"));
    assert.ok(modules.includes("marketing_dashboard"));
    assert.equal(canAccessDigitalFreelancerDirectory(am), true);
  });

  it("Content Creator can open Approvals but not Ads/Reports", () => {
    const cc = { role: "digital", subType: "Content Creator", id: 12 };
    const modules = getDigitalSubRoleModules(cc);
    assert.ok(modules.includes("marketing_approvals"));
    assert.ok(modules.includes("marketing_calendar"));
    assert.ok(!modules.includes("marketing_ads"));
    assert.ok(!modules.includes("marketing_reports"));
  });

  it("Digital specialist is elevated lead but not commercial/freelancer dir", () => {
    const spec = { role: "digital", subType: "Digital Specialist", id: 11 };
    assert.ok(!getDigitalSubRoleModules(spec).includes("marketing_reports"));
    assert.equal(canAccessDigitalFreelancerDirectory(spec), false);
    assert.equal(canManageCmsProjects(spec), true);
    assert.equal(isDigitalElevatedLead(spec), true);
  });

  it("Freelancer is strictly scoped to assigned tasks and project files", () => {
    const freelancer = {
      role: "digital",
      subType: "Freelancer",
      id: 6,
      scopedAccess: { projectIds: [10] },
    };
    assert.equal(
      checkDigitalResourceOwnership(freelancer, { projectId: 10, assigneeId: 6 }),
      true,
    );
    assert.equal(
      checkDigitalResourceOwnership(freelancer, { projectId: 10, assigneeId: 99 }),
      false,
    );
  });

  it("Users cannot access cross-project resources", () => {
    const user = {
      role: "digital",
      subType: "Designer",
      id: 7,
      scopedAccess: { projectIds: [10] },
    };
    assert.equal(checkDigitalResourceOwnership(user, { projectId: 10 }), true);
    assert.equal(checkDigitalResourceOwnership(user, { projectId: 20 }), false);
  });

  it("normalizes Account Manager spacing and gates project manage role", () => {
    assert.equal(normalizeSubRole("Account Manager"), "account_manager");
    assert.equal(canManageCmsProjects({ role: "digital", subType: "Account Manager" }), true);
    assert.equal(canManageCmsProjects({ role: "digital", subType: "Designer" }), false);
    assert.equal(canManageCmsProjects({ role: "digital", subType: "Freelancer" }), false);
    assert.equal(canManageCmsProjects({ role: "bde" }), true);
    assert.equal(canManageCmsProjects({ role: "freelancer", subType: "Freelancer" }), false);
  });

  it("Account Manager can manage commercial package/budget; specialist cannot", () => {
    const am = { role: "digital", subType: "Account Manager" };
    const spec = { role: "digital", subType: "Digital Specialist" };
    assert.equal(canManageMarketingClientCommercial(am), true);
    assert.equal(canManageMarketingClientCommercial(spec), false);
    assert.equal(canManageMarketingClientCommercial("super_admin"), true);
    assert.equal(canManageMarketingClientCommercial("digital"), false);
  });

  it("craft digital roles only see own tasks; leads see team tasks", () => {
    assert.equal(
      shouldRestrictToOwnDigitalTasks({ role: "digital", subType: "Designer" }),
      true,
    );
    assert.equal(
      shouldRestrictToOwnDigitalTasks({ role: "digital", subType: "Content Creator" }),
      true,
    );
    assert.equal(
      shouldRestrictToOwnDigitalTasks({ role: "freelancer", subType: "Freelancer" }),
      true,
    );
    assert.equal(
      shouldRestrictToOwnDigitalTasks({ role: "digital", subType: "Account Manager" }),
      false,
    );
    assert.equal(
      shouldRestrictToOwnDigitalTasks({ role: "digital", subType: "Digital Specialist" }),
      false,
    );
    assert.equal(shouldRestrictToOwnDigitalTasks({ role: "super_admin" }), false);
  });

  it("craft staff can only assign tasks to themselves", () => {
    const designer = { role: "digital", subType: "Designer", id: 42 };
    assert.equal(resolveDigitalTaskAssigneeId(designer, 99), 42);
    assert.equal(resolveDigitalTaskAssigneeId(designer, null), 42);
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    assert.equal(resolveDigitalTaskAssigneeId(am, 99), 99);
    assert.equal(resolveDigitalTaskAssigneeId(am, null), null);
  });

  it("project Account Manager roster role may assign others", () => {
    const designer = { role: "digital", subType: "Designer", id: 42 };
    assert.equal(
      resolveDigitalTaskAssigneeId(designer, 99, { allowAssignOthers: true }),
      99,
    );
  });

  it("account_manager sub-role includes marketing_calendar", () => {
    const modules = getDigitalSubRoleModules({
      role: "digital",
      subType: "Account Manager",
      id: 5,
    });
    assert.ok(modules.includes("marketing_calendar"));
  });

  it("filterDigitalPermissionSet strips dashboard edit for designers", () => {
    const designer = { role: "digital", subType: "Designer", id: 2 };
    const set = new Set([
      "marketing_dashboard:view",
      "marketing_dashboard:edit",
      "marketing_content:view",
      "marketing_content:create",
      "marketing_content:delete",
      "marketing_ads:view",
      "marketing_reports:view",
      "marketing_clients:edit",
      "finance_freelancers:view",
    ]);
    filterDigitalPermissionSet(designer, set);
    assert.ok(set.has("marketing_dashboard:view"));
    assert.ok(!set.has("marketing_dashboard:edit"));
    assert.ok(set.has("marketing_content:view"));
    assert.ok(set.has("marketing_content:create"));
    assert.ok(!set.has("marketing_content:delete"));
    assert.ok(!set.has("marketing_ads:view"));
    assert.ok(!set.has("marketing_reports:view"));
    assert.ok(!set.has("marketing_clients:edit"));
    assert.ok(!set.has("finance_freelancers:view"));
  });

  it("craft assignee resolution always returns self unless allowAssignOthers", () => {
    const designer = { role: "digital", subType: "Designer", id: 42 };
    assert.equal(resolveDigitalTaskAssigneeId(designer, 99), 42);
    assert.equal(resolveDigitalTaskAssigneeId(designer, 99, { allowAssignOthers: true }), 99);
    assert.equal(resolveDigitalTaskAssigneeId(designer, null, { allowAssignOthers: true }), null);
  });

  it("elevated leads are not craft-restricted on assignee resolution", () => {
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    assert.equal(shouldRestrictToOwnDigitalTasks(am), false);
    assert.equal(resolveDigitalTaskAssigneeId(am, 88), 88);
  });

  it("AM fully edits own items but not admin-created ones", async () => {
    const { canFullyEditMarketingOwnedItem, isMarketingOrgAdmin } = await import(
      "../../src/modules/marketing/services/helpers.js"
    );
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    const admin = { role: "super_admin", id: 1 };
    assert.equal(isMarketingOrgAdmin(admin), true);
    assert.equal(isMarketingOrgAdmin(am), false);
    assert.equal(canFullyEditMarketingOwnedItem(am, { createdBy: 5 }), true);
    assert.equal(canFullyEditMarketingOwnedItem(am, { createdBy: 1 }), false);
    assert.equal(canFullyEditMarketingOwnedItem(admin, { createdBy: 5 }), true);
  });

  it("approval stage: assignee/creator/elevated lead may advance; peer craft may not", async () => {
    const { canAdvanceMarketingApprovalStage } = await import(
      "../../src/modules/marketing/services/helpers.js"
    );
    const designer = { role: "digital", subType: "Designer", id: 42 };
    const peer = { role: "digital", subType: "Designer", id: 43 };
    const am = { role: "digital", subType: "Account Manager", id: 5 };
    const admin = { role: "super_admin", id: 1 };
    // accountId null avoids DB when denying peers (no lead/account lookup).
    const doc = { createdBy: 42, assigneeId: 42, accountId: null };
    assert.equal(await canAdvanceMarketingApprovalStage(designer, doc), true);
    assert.equal(await canAdvanceMarketingApprovalStage(peer, doc), false);
    assert.equal(await canAdvanceMarketingApprovalStage(am, doc), true);
    assert.equal(await canAdvanceMarketingApprovalStage(admin, doc), true);
    assert.equal(
      await canAdvanceMarketingApprovalStage(peer, { ...doc, assigneeId: 43 }),
      true,
    );
  });

  it("media mutate: creator and org admin may rename; peer craft may not without lead", async () => {
    const { canMutateMarketingMediaItem } = await import(
      "../../src/modules/marketing/services/helpers.js"
    );
    const designer = { role: "digital", subType: "Designer", id: 42 };
    const peer = { role: "digital", subType: "Designer", id: 43 };
    const admin = { role: "super_admin", id: 1 };
    const doc = { createdBy: 42, accountId: null };
    assert.equal(await canMutateMarketingMediaItem(designer, doc), true);
    assert.equal(await canMutateMarketingMediaItem(peer, doc), false);
    assert.equal(await canMutateMarketingMediaItem(admin, doc), true);
  });

  it("requireDigitalModuleAccess rejects designer on ads", () => {
    const mw = requireDigitalModuleAccess("marketing_ads");
    let status = "next";
    const req = { user: { role: "digital", subType: "Designer" } };
    try {
      mw(req, {}, () => {
        status = "allowed";
      });
    } catch (err) {
      status = err?.statusCode ?? err?.status ?? "forbidden";
    }
    assert.notEqual(status, "allowed");
  });
});
