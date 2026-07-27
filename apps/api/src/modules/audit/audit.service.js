import { AuditLog } from "../../models/AuditLog.js";

export async function writeAuditLog({
  familyId,
  actorUserId,
  actorMemberId,
  action,
  entityType,
  entityId,
  summary,
  before,
  after,
  reason,
  req
}) {
  return AuditLog.create({
    familyId,
    actorUserId,
    actorMemberId,
    action,
    entityType,
    entityId,
    summary,
    before,
    after,
    reason,
    ipAddress: req?.ip,
    userAgent: req?.get?.("user-agent")
  });
}
