import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import { httpError } from "../../utils/http-error.js";

function getSafeExtension(originalName, mimeType) {
  const extension = path.extname(originalName).toLowerCase();

  if (extension && /^[a-z0-9.]+$/.test(extension)) {
    return extension;
  }

  const fallbackExtensions = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };

  return fallbackExtensions[mimeType] || ".bin";
}

function createStoredName(originalName, mimeType) {
  return `${Date.now()}-${randomUUID()}${getSafeExtension(originalName, mimeType)}`;
}

function getS3Client() {
  if (!env.AWS_S3_BUCKET_NAME || !env.AWS_S3_ACCESS_KEY_ID || !env.AWS_S3_SECRET_ACCESS_KEY) {
    throw httpError(500, "S3 storage is not configured.", "S3_NOT_CONFIGURED");
  }

  return new S3Client({
    region: env.AWS_S3_REGION,
    endpoint: env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_S3_SECRET_ACCESS_KEY
    }
  });
}

export async function saveDocumentFile({ familyId, expenseId, originalName, mimeType, fileBuffer }) {
  const storedName = createStoredName(originalName, mimeType);

  if (env.STORAGE_DRIVER === "s3") {
    const storageKey = `nyasa/${familyId}/expenses/${expenseId}/${storedName}`;
    const client = getS3Client();

    await client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET_NAME,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          originalName
        }
      })
    );

    return {
      storageDriver: "s3",
      storedName,
      storageKey,
      bucketName: env.AWS_S3_BUCKET_NAME,
      region: env.AWS_S3_REGION
    };
  }

  const uploadDir = path.resolve("uploads", String(familyId), "expenses", String(expenseId));
  const storagePath = path.join(uploadDir, storedName);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(storagePath, fileBuffer);

  return {
    storageDriver: "local",
    storedName,
    storagePath
  };
}

export async function getDocumentObject(document) {
  if (document.storageDriver !== "s3") {
    return null;
  }

  const client = getS3Client();

  return client.send(
    new GetObjectCommand({
      Bucket: document.bucketName || env.AWS_S3_BUCKET_NAME,
      Key: document.storageKey
    })
  );
}
