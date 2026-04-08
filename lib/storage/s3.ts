import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3;
}

function getBucket(): string {
  return process.env.AWS_S3_BUCKET!;
}

export interface StoredThoughtSignatures {
  textThoughtSignature: string | null;
  imageThoughtSignature: string | null;
}

export function generationKey(
  userId: string,
  sessionId: string,
  generationId: string,
): string {
  return `users/${userId}/sessions/${sessionId}/${generationId}.png`;
}

export function imageProxyUrl(generationId: string): string {
  return `/api/images/${generationId}`;
}

export function thoughtSignatureKey(imageKey: string): string {
  return `${imageKey}.thought-signatures.json`;
}

export async function uploadImage(
  key: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const body = Buffer.from(base64, "base64");
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: mimeType,
    }),
  );
}

export async function uploadThoughtSignatures(
  imageKey: string,
  signatures: StoredThoughtSignatures,
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: thoughtSignatureKey(imageKey),
      Body: JSON.stringify(signatures),
      ContentType: "application/json",
    }),
  );
}

export async function getThoughtSignatures(
  imageKey: string,
): Promise<StoredThoughtSignatures | null> {
  try {
    const res = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: thoughtSignatureKey(imageKey),
      }),
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const parsed = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    ) as Partial<StoredThoughtSignatures> | null;
    return {
      textThoughtSignature:
        typeof parsed?.textThoughtSignature === "string"
          ? parsed.textThoughtSignature
          : null,
      imageThoughtSignature:
        typeof parsed?.imageThoughtSignature === "string"
          ? parsed.imageThoughtSignature
          : null,
    };
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

export async function deleteThoughtSignatures(imageKey: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: thoughtSignatureKey(imageKey),
    }),
  );
}

export async function getObjectBase64(key: string): Promise<string> {
  const res = await getS3Client().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("base64");
}

export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  return awsGetSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  );
}
