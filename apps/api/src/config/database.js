import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : undefined);
  console.log("MongoDB connected");
}
