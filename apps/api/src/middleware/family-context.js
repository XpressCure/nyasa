import { FamilyMember } from "../models/FamilyMember.js";
import { roleHasPermission } from "../modules/permissions/permissions.js";
import { httpError } from "../utils/http-error.js";

export function requireFamilyPermission(permission) {
  return async (req, _res, next) => {
    try {
      const familyId = req.params.familyId || req.body.familyId || req.query.familyId;

      if (!familyId) {
        throw httpError(400, "familyId is required", "FAMILY_ID_REQUIRED");
      }

      const member = await FamilyMember.findOne({
        familyId,
        userId: req.user._id,
        status: "active"
      });

      if (!member) {
        throw httpError(403, "You are not an active member of this family", "FAMILY_ACCESS_DENIED");
      }

      if (!roleHasPermission(member.role, permission)) {
        throw httpError(403, "You do not have permission for this action", "PERMISSION_DENIED");
      }

      req.familyId = familyId;
      req.member = member;
      next();
    } catch (error) {
      next(error);
    }
  };
}
