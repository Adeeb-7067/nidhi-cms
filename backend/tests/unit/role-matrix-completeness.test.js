/**
 * Regression: adding a CMS role without updating every mirror list ships broken portals.
 * If this fails, finish the checklist in .cursor/rules/feature-completeness.mdc.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  userRoles,
  staffEmployeeRoles,
  hrmEmployeeRoles,
  adminStaffRoles,
  monitorableStaffRoles,
} from "../../src/constants/user-roles.js";
import {
  defaultTemplateByRole,
  builtInAssignableCmsRoles,
} from "../../src/constants/permissions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "../..");

function readBackend(relPath) {
  return readFileSync(join(backendRoot, relPath), "utf8");
}

function readFrontend(relPath) {
  return readFileSync(join(backendRoot, "..", "frontend", relPath), "utf8");
}

describe("CMS role matrix completeness", () => {
  test("every userRoles entry has defaultTemplateByRole mapping", () => {
    for (const role of userRoles) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(defaultTemplateByRole, role),
        `defaultTemplateByRole missing key ${role}`,
      );
    }
    assert.equal(defaultTemplateByRole.client, null);
    assert.equal(defaultTemplateByRole.digital, "digital");
  });

  test("assignable CMS roles cover every non-client userRoles value", () => {
    const values = new Set(builtInAssignableCmsRoles.map((r) => r.value));
    for (const role of userRoles) {
      if (role === "client") continue;
      assert.ok(values.has(role), `builtInAssignableCmsRoles missing ${role}`);
    }
  });

  test("DEFAULT_TEMPLATES seed includes cmsRole for digital (and peers)", () => {
    const src = readBackend("src/modules/identity/services/permissions.service.js");
    for (const role of ["digital", "finance", "bde", "manager", "super_admin"]) {
      assert.ok(
        src.includes(`cmsRole: "${role}"`),
        `permissions.service DEFAULT_TEMPLATES missing cmsRole: "${role}"`,
      );
    }
  });

  test("OpenAPI / generated Zod role enum includes every userRoles value", () => {
    const generated = readBackend("src/api-zod/generated/api.js");
    for (const role of userRoles) {
      assert.ok(
        generated.includes(`'${role}'`),
        `api-zod generated enum missing role ${role} — update openapi.yaml and regenerate`,
      );
    }
  });

  test("frontend user-roles.ts mirrors every backend userRoles value", () => {
    const fe = readFrontend("src/lib/user-roles.ts");
    for (const role of userRoles) {
      assert.ok(
        fe.includes(`"${role}"`),
        `frontend/src/lib/user-roles.ts missing "${role}"`,
      );
    }
    assert.ok(fe.includes('"digital"'), "digital must be on frontend role lists");
    assert.ok(fe.includes("PROFILE_PAGE_ROLES"), "PROFILE_PAGE_ROLES must exist");
  });

  test("digital role is on staff / HRM / admin / monitorable lists", () => {
    assert.ok(staffEmployeeRoles.includes("digital"));
    assert.ok(hrmEmployeeRoles.includes("digital"));
    assert.ok(adminStaffRoles.includes("digital"));
    assert.ok(monitorableStaffRoles.includes("digital"));
  });

  test("project member routes exist for digital project assignment", () => {
    const routes = readBackend("src/modules/crm/routes/projects.routes.js");
    assert.ok(routes.includes("/projects/:id/members"), "member assign API missing");
    assert.ok(routes.includes("members/batch"), "batch member assign API missing");
  });

  test("digital project detail mounts team panel (assignment UI)", () => {
    const overview = readFrontend("src/components/project/DigitalProjectOverview.tsx");
    assert.ok(overview.includes("ProjectTeamPanel"), "Digital overview must mount ProjectTeamPanel");
    assert.ok(overview.includes('variant="digital"'), 'ProjectTeamPanel must use variant="digital"');
    const page = readFrontend("src/pages/marketing/ProjectDetail.tsx");
    assert.ok(
      page.includes("DigitalProjectOverview"),
      "Marketing project detail must render DigitalProjectOverview (team panel)",
    );
  });

  test("BDE opens digital projects on the Digital detail hub", () => {
    const routes = readFrontend("src/lib/project-routes.ts");
    assert.match(
      routes,
      /if \(type === "digital"\) return `\/marketing\/projects\/\$\{projectId\}`/,
      "getProjectDetailHref must send digital projects to /marketing/projects/:id",
    );
    const adminDetail = readFrontend("src/pages/admin/ProjectDetail.tsx");
    assert.ok(
      adminDetail.includes('project?.type === "digital"'),
      "Admin ProjectDetail must redirect digital projects to marketing hub",
    );
    assert.ok(
      !adminDetail.includes('user?.role !== "bde"'),
      "Admin ProjectDetail must redirect BDE digital projects too",
    );
    const bdeList = readFrontend("src/pages/sales/BdeProjects.tsx");
    assert.ok(
      bdeList.includes('getProjectDetailHref(project.id, "bde", project.type)'),
      "BDE project cards must pass project.type into detail href",
    );
    const perms = readBackend("src/modules/identity/services/permissions.service.js");
    assert.ok(
      perms.includes("BDE_DIGITAL_PROJECT_VIEW"),
      "BDE template must include Digital view grants for project detail APIs",
    );
  });

  test("digital daily log form uses marketing categories (not engineering)", () => {
    const cats = readFrontend("src/lib/daily-log-work-categories.ts");
    assert.ok(cats.includes("DIGITAL_WORK_CATEGORIES"), "digital category catalog missing");
    assert.ok(cats.includes("usesDigitalDailyLogForm"), "digital form gate missing");
    assert.ok(cats.includes("{ id: \"seo\""), "digital logs should include SEO work type");
    assert.ok(cats.includes("{ id: \"ads\""), "digital logs should include Ads work type");
    assert.ok(
      cats.includes("developer | qa | tester | manager | freelancer"),
      "delivery roles must stay on engineering categories",
    );
    const logsPage = readFrontend("src/pages/dev/Logs.tsx");
    assert.ok(
      logsPage.includes("dailyLogFormCopyForRole"),
      "Logs page must use role-specific form copy",
    );
    assert.ok(
      logsPage.includes("usesDigitalDailyLogForm"),
      "project filter must gate on digital role only",
    );
    assert.ok(
      logsPage.includes("workCategoriesForForm"),
      "edit form must preserve legacy categories safely",
    );
    assert.ok(
      logsPage.includes("isVirtualDailyLogProjectId"),
      "edit form must keep saved project visible when filtered",
    );
  });
});
