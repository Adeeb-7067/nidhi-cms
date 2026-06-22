import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  encryptHrm,
  decryptHrm,
  encryptIntoFields,
  decryptFromFields,
  maskTail,
} from "../../src/lib/hrm-crypto.js";

describe("hrm-crypto", () => {
  test("encryptHrm returns null for nullish/empty input", () => {
    assert.equal(encryptHrm(null), null);
    assert.equal(encryptHrm(undefined), null);
    assert.equal(encryptHrm(""), null);
  });

  test("encryptHrm produces a fresh IV on every call (non-deterministic)", () => {
    const a = encryptHrm("acc-123");
    const b = encryptHrm("acc-123");
    assert.ok(a && b);
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.ciphertext, b.ciphertext);
    assert.notEqual(a.authTag, b.authTag);
  });

  test("decryptHrm round-trips arbitrary strings", () => {
    const samples = [
      "1234567890",
      "ICIC0001234",
      "Doe, John — 9876.54",
      "ünïçødé and 中文",
      "x".repeat(2048),
    ];
    for (const s of samples) {
      const enc = encryptHrm(s);
      assert.equal(decryptHrm(enc), s);
    }
  });

  test("decryptHrm returns null for missing parts", () => {
    assert.equal(decryptHrm(null), null);
    assert.equal(decryptHrm(undefined), null);
    assert.equal(decryptHrm({}), null);
    const enc = encryptHrm("hello");
    assert.equal(decryptHrm({ ciphertext: enc.ciphertext }), null);
    assert.equal(
      decryptHrm({ ciphertext: enc.ciphertext, iv: enc.iv }),
      null,
    );
  });

  test("decryptHrm throws on tampered ciphertext (GCM auth)", () => {
    const enc = encryptHrm("sensitive");
    const tampered = {
      ...enc,
      ciphertext: Buffer.from(enc.ciphertext, "base64")
        .map((b, i) => (i === 0 ? b ^ 1 : b))
        .toString("base64"),
    };
    assert.throws(() => decryptHrm(tampered));
  });

  test("encryptIntoFields produces flat shape with the prefix", () => {
    const patch = encryptIntoFields("bankAccountNumber", "1234567890");
    assert.equal(typeof patch.bankAccountNumber, "string");
    assert.equal(typeof patch.bankAccountNumberIv, "string");
    assert.equal(typeof patch.bankAccountNumberAuthTag, "string");
    const plain = decryptFromFields("bankAccountNumber", patch);
    assert.equal(plain, "1234567890");
  });

  test("encryptIntoFields nullifies all three columns for empty input", () => {
    const patch = encryptIntoFields("ifsc", "");
    assert.deepEqual(patch, { ifsc: null, ifscIv: null, ifscAuthTag: null });
    assert.equal(decryptFromFields("ifsc", patch), null);
  });

  test("decryptFromFields handles legacy rows missing the auth tag", () => {
    const doc = {
      bankAccountNumber: "AAAA",
      bankAccountNumberIv: "BBBB",
      // bankAccountNumberAuthTag intentionally absent
    };
    assert.equal(decryptFromFields("bankAccountNumber", doc), null);
  });

  test("maskTail keeps the last N characters visible", () => {
    assert.equal(maskTail("1234567890"), "******7890");
    assert.equal(maskTail("1234567890", 2), "********90");
    assert.equal(maskTail("12", 4), "12");
    assert.equal(maskTail(""), null);
    assert.equal(maskTail(null), null);
  });
});
