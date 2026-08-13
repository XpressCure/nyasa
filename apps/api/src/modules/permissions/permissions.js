export const permissions = {
  workspaceView: "workspace.view",
  workspaceManage: "workspace.manage",
  workspaceManageRoles: "workspace.manage_roles",
  membersView: "members.view",
  membersInvite: "members.invite",
  membersManage: "members.manage",
  treasuryViewSummary: "treasury.view_summary",
  treasuryViewLedger: "treasury.view_ledger",
  treasuryReconcile: "treasury.reconcile",
  treasuryContribute: "treasury.contribute",
  treasuryAllocateOwn: "treasury.allocate_own",
  projectsView: "projects.view",
  projectsCreate: "projects.create",
  projectsManage: "projects.manage",
  projectsManageAssigned: "projects.manage_assigned",
  expensesView: "expenses.view",
  expensesSubmit: "expenses.submit",
  expensesApprove: "expenses.approve",
  auditView: "reports.audit"
};

export const rolePermissions = {
  owner: Object.values(permissions),
  admin: [
    permissions.workspaceView,
    permissions.workspaceManage,
    permissions.membersView,
    permissions.membersInvite,
    permissions.membersManage,
    permissions.treasuryViewSummary,
    permissions.treasuryViewLedger,
    permissions.treasuryContribute,
    permissions.treasuryAllocateOwn,
    permissions.projectsView,
    permissions.projectsCreate,
    permissions.projectsManage,
    permissions.expensesView,
    permissions.expensesSubmit,
    permissions.expensesApprove,
    permissions.auditView
  ],
  project_lead: [
    permissions.workspaceView,
    permissions.membersView,
    permissions.treasuryViewSummary,
    permissions.treasuryContribute,
    permissions.treasuryAllocateOwn,
    permissions.projectsView,
    permissions.projectsManageAssigned,
    permissions.expensesView,
    permissions.expensesSubmit
  ],
  kosh_pramukh: [
    permissions.workspaceView,
    permissions.membersView,
    permissions.treasuryViewSummary,
    permissions.treasuryViewLedger,
    permissions.treasuryReconcile,
    permissions.treasuryContribute,
    permissions.treasuryAllocateOwn,
    permissions.projectsView,
    permissions.expensesView,
    permissions.auditView
  ],
  member: [
    permissions.workspaceView,
    permissions.membersView,
    permissions.treasuryViewSummary,
    permissions.treasuryContribute,
    permissions.treasuryAllocateOwn,
    permissions.projectsView,
    permissions.expensesView
  ],
  viewer: [permissions.workspaceView, permissions.membersView, permissions.projectsView, permissions.expensesView],
  external_advisor: [permissions.projectsView]
};

export function roleHasPermission(role, permission) {
  return rolePermissions[role]?.includes(permission) || false;
}
