import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, validatePassword, verifyPassword } from "./password.service.js";

test("password policy requires length, a letter, and a number", () => {
  assert.match(validatePassword("short1"), /8 characters/);
  assert.match(validatePassword("onlyletters"), /letter and one number/);
  assert.match(validatePassword("12345678"), /letter and one number/);
  assert.equal(validatePassword("Nyasa2026"), null);
});

test("password hashes verify without exposing the original value", async () => {
  const hash = await hashPassword("Nyasa2026");
  assert.notEqual(hash, "Nyasa2026");
  assert.equal(await verifyPassword("Nyasa2026", hash), true);
  assert.equal(await verifyPassword("Wrong2026", hash), false);
});
