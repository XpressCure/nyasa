import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { familyRoutes } from "./modules/families/family.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { memberRoutes } from "./modules/members/member.routes.js";
import { permissionRoutes } from "./modules/permissions/permission.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/families", familyRoutes);
  app.use("/api/members", memberRoutes);
  app.use("/api/permissions", permissionRoutes);
  app.use("/api/audit-logs", auditRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
