import jwt from "jsonwebtoken";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { User } from "../../models/User.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { writeAuditLog } from "../audit/audit.service.js";

export const authRoutes = Router();

const devLoginSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email()
});

authRoutes.post(
  "/dev-login",
  asyncHandler(async (req, res) => {
    const body = devLoginSchema.parse(req.body);

    const user = await User.findOneAndUpdate(
      { email: body.email.toLowerCase() },
      {
        $setOnInsert: {
          fullName: body.fullName,
          email: body.email.toLowerCase(),
          authProviders: [{ provider: "email_magic_link", verifiedAt: new Date() }]
        },
        $set: { lastLoginAt: new Date(), status: "active" }
      },
      { upsert: true, new: true }
    );

    await writeAuditLog({
      actorUserId: user._id,
      action: "auth.dev_login",
      entityType: "User",
      entityId: String(user._id),
      summary: `${user.fullName} signed in with development login`,
      req
    });

    const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      }
    });
  })
);
