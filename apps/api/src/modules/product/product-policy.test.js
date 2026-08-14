import assert from "node:assert/strict";
import test from "node:test";
import { canMemberSeeMoment, financialAccountAccess, redactFinancialAccount } from "./product-policy.js";

test("family moments are visible while private moments stay with their creator", () => {
  assert.equal(canMemberSeeMoment({ visibility: "family", createdByMemberId: "a" }, "b"), true);
  assert.equal(canMemberSeeMoment({ visibility: "private", createdByMemberId: "a" }, "b"), false);
  assert.equal(canMemberSeeMoment({ visibility: "private", createdByMemberId: "a" }, "a"), true);
});

test("selected-member moment access is explicit", () => {
  const moment = { visibility: "selected_members", createdByMemberId: "a", selectedMemberIds: ["b"] };
  assert.equal(canMemberSeeMoment(moment, "b"), true);
  assert.equal(canMemberSeeMoment(moment, "c"), false);
});

test("financial account access never leaks an unshared account", () => {
  const account = { ownerUserId: "owner", sharingScope: "only_me", sharedWithMemberIds: [], nickname: "Salary", maskedNumber: "1234" };
  assert.equal(financialAccountAccess(account, "other", "member"), "none");
  assert.equal(redactFinancialAccount(account, "none"), null);
  assert.equal(financialAccountAccess(account, "owner", "member"), "owner");
});

test("family summaries omit account identifiers", () => {
  const account = { _id: "1", ownerUserId: "owner", sharingScope: "family_summary", institutionName: "Bank", nickname: "Home", accountType: "savings", maskedNumber: "1234", balancePaise: 50000 };
  const redacted = redactFinancialAccount(account, financialAccountAccess(account, "other", "member"));
  assert.equal(redacted.balancePaise, 50000);
  assert.equal(redacted.maskedNumber, undefined);
});
