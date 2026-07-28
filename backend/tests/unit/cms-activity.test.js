import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatActivityAction } from "../../src/modules/platform/services/dashboard-activity.js";

describe("CMS recent activity formatting", () => {
  it("formats CRUD and auth actions into readable phrases", () => {
    assert.equal(formatActivityAction("login", "auth", null), "signed in to");
    assert.equal(formatActivityAction("logout", "auth", null), "signed out of");
    assert.equal(formatActivityAction("POST_projects", "projects", null), "created project");
    assert.equal(formatActivityAction("PATCH_bugs", "bugs", null), "updated bug");
    assert.equal(formatActivityAction("DELETE_tickets", "tickets", null), "deleted ticket");
  });
});
