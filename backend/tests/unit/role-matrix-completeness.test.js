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
    const src = readBackend("src/services/permissions.service.js");
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
    const routes = readBackend("src/routes/projects.routes.js");
    assert.ok(routes.includes("/projects/:id/members"), "member assign API missing");
    assert.ok(routes.includes("members/batch"), "batch member assign API missing");
  });

  test("digital project detail mounts team panel (assignment UI)", () => {
    const page = readFrontend("src/pages/marketing/ProjectDetail.tsx");
    assert.ok(page.includes("ProjectTeamPanel"), "Digital project detail must mount ProjectTeamPanel");
    assert.ok(page.includes('variant="digital"'), 'ProjectTeamPanel must use variant="digital"');
  });
});
