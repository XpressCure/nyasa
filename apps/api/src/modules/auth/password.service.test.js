import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, validatePassword, verifyPassword } from "./password.service.js";

test("password policy uses a simple length rule", () => {
  assert.match(validatePassword("short"), /8 characters/);
  assert.equal(validatePassword("onlyletters"), null);
  assert.equal(validatePassword("12345678"), null);
  assert.equal(validatePassword("Nyasa2026"), null);
  assert.match(validatePassword("a".repeat(129)), /128 characters/);
});

test("password hashes verify without exposing the original value", async () => {
  const hash = await hashPassword("Nyasa2026");
  assert.notEqual(hash, "Nyasa2026");
  assert.equal(await verifyPassword("Nyasa2026", hash), true);
  assert.equal(await verifyPassword("Wrong2026", hash), false);
});
