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

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : httpError(401, "Invalid or expired token", "INVALID_TOKEN"));
  }
}
