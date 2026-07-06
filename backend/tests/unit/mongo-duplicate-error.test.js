import test from "node:test";
import assert from "node:assert/strict";
import {
  duplicateKeyToApiBody,
  findMongoDuplicateKeyError,
  isMongoDuplicateKeyError,
} from "../../src/utils/mongo-duplicate-error.js";

test("findMongoDuplicateKeyError walks nested cause chain", () => {
  const root = new Error("wrapper");
  root.cause = { code: 11000, keyPattern: { email: 1 }, keyValue: { email: "a@b.com" } };
  assert.equal(findMongoDuplicateKeyError(root)?.code, 11000);
});

test("duplicateKeyToApiBody maps clients email duplicate", () => {
  const err = {
    code: 11000,
    keyPattern: { email: 1 },
    keyValue: { email: "dup@co.com" },
    message:
      'E11000 duplicate key error collection: cms.clients index: email_1 dup key: { email: "dup@co.com" }',
  };
  const body = duplicateKeyToApiBody(err);
  assert.equal(body.field, "email");
  assert.match(body.message, /dup@co\.com/);
  assert.match(body.message, /Contact email/i);
});

test("duplicateKeyToApiBody maps users email to portal login field", () => {
  const err = {
    code: 11000,
    message:
      'E11000 duplicate key error collection: cms.users index: email_1 dup key: { email: "login@co.com" }',
  };
  const body = duplicateKeyToApiBody(err);
  assert.equal(body.field, "portalEmail");
  assert.match(body.message, /login@co\.com/);
});

test("duplicateKeyToApiBody parses dup key from message when keyPattern missing", () => {
  const err = {
    code: 11000,
    message:
      'E11000 duplicate key error collection: cms.clients index: email_1 dup key: { email: "x@y.z" }',
  };
  const body = duplicateKeyToApiBody(err);
  assert.equal(body.field, "email");
  assert.match(body.message, /x@y\.z/);
});

test("isMongoDuplicateKeyError detects string code", () => {
  assert.equal(isMongoDuplicateKeyError({ code: "11000" }), true);
});
