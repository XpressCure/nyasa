import crypto from "crypto";

export function createInvitationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
