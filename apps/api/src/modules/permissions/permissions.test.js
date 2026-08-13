import assert from "node:assert/strict";
import test from "node:test";
import { permissions, roleHasPermission } from "./permissions.js";

test("only owners and Kosh Pramukh can reconcile Kosh", () => {
  assert.equal(roleHasPermission("owner", permissions.treasuryReconcile), true);
  assert.equal(roleHasPermission("kosh_pramukh", permissions.treasuryReconcile), true);
  assert.equal(roleHasPermission("admin", permissions.treasuryReconcile), false);
  assert.equal(roleHasPermission("member", permissions.treasuryReconcile), false);
  assert.equal(roleHasPermission("project_lead", permissions.treasuryReconcile), false);
});
