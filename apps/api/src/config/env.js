import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  AWS_S3_BUCKET_NAME: z.string().optional(),
  AWS_S3_REGION: z.string().default("ap-south-1"),
  AWS_S3_ACCESS_KEY_ID: z.string().optional(),
  AWS_S3_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_ENDPOINT: z.string().optional(),
  AWS_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PAYMENT_PAGE_ID: z.string().optional(),
  RAZORPAY_PAYMENT_PAGE_FAMILY_ID: z.string().optional(),
  Bucket: z.string().optional(),
  AWSAccessKeyId: z.string().optional(),
  AWSSecretKey: z.string().optional()
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  AWS_S3_BUCKET_NAME: parsedEnv.AWS_S3_BUCKET_NAME || parsedEnv.Bucket,
  AWS_S3_ACCESS_KEY_ID: parsedEnv.AWS_S3_ACCESS_KEY_ID || parsedEnv.AWSAccessKeyId,
  AWS_S3_SECRET_ACCESS_KEY: parsedEnv.AWS_S3_SECRET_ACCESS_KEY || parsedEnv.AWSSecretKey
};
