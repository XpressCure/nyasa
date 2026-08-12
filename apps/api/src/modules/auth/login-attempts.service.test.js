import assert from "node:assert/strict";
import test from "node:test";
import {
  clearFailedLogins,
  getLoginLock,
  recordFailedLogin,
  resetLoginAttemptsForTests
} from "./login-attempts.service.js";

test("temporarily locks repeated password failures", () => {
  resetLoginAttemptsForTests();
  const identity = { userId: "member-1", ip: "127.0.0.1" };
  for (let attempt = 0; attempt < 7; attempt += 1) {
    assert.equal(recordFailedLogin({ ...identity, now: 1000 }), null);
  }
  assert.ok(recordFailedLogin({ ...identity, now: 1000 }).retryAfterSeconds > 0);
  assert.ok(getLoginLock({ ...identity, now: 2000 }).retryAfterSeconds > 0);
});

test("successful login clears failed attempts", () => {
  resetLoginAttemptsForTests();
  const identity = { userId: "member-1", ip: "127.0.0.1" };
  recordFailedLogin({ ...identity, now: 1000 });
  clearFailedLogins(identity);
  assert.equal(getLoginLock({ ...identity, now: 1000 }), null);
});
