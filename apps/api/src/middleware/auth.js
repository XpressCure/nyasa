import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { httpError } from "../utils/http-error.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = req.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw httpError(401, "Authentication required", "AUTH_REQUIRED");
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      throw httpError(401, "Invalid authenticated user", "INVALID_USER");
    }

    if (payload.authVersion !== undefined && payload.authVersion !== user.authVersion) {
      throw httpError(401, "Please sign in again.", "SESSION_REVOKED");
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (error) {
    next(error.statusCode ? error : httpError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}

export function requirePasswordAuth(req, _res, next) {
  if (req.auth?.authLevel !== "password") {
    next(
      httpError(
        403,
        "Password verification is required for this Kosh action. Set your password in Parichay, then sign in again.",
        "PASSWORD_AUTH_REQUIRED"
      )
    );
    return;
  }

  next();
}
