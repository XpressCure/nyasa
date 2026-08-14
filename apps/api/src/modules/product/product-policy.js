export function canMemberSeeMoment(moment, memberId) {
  if (moment.visibility === "family") return true;
  if (String(moment.createdByMemberId) === String(memberId)) return true;
  return moment.visibility === "selected_members" && (moment.selectedMemberIds || []).some((id) => String(id) === String(memberId));
}

export function financialAccountAccess(account, userId, memberId) {
  if (String(account.ownerUserId) === String(userId)) return "owner";
  if (account.sharingScope === "family_summary") return "summary";
  if (account.sharingScope === "selected_members" && (account.sharedWithMemberIds || []).some((id) => String(id) === String(memberId))) return "shared";
  return "none";
}

export function redactFinancialAccount(account, access) {
  if (access === "owner") return account;
  if (access === "none") return null;
  return {
    _id: account._id,
    nickname: account.nickname,
    institutionName: account.institutionName,
    accountType: account.accountType,
    sharingScope: account.sharingScope,
    balancePaise: access === "summary" ? account.balancePaise : undefined,
    balanceAsOf: account.balanceAsOf,
    isShared: true
  };
}
