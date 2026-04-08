import { pool } from "@/lib/db";
import {
  deleteThoughtSignatures,
  generationKey,
  getObjectBase64,
  getThoughtSignatures,
  uploadImage,
  uploadThoughtSignatures,
} from "@/lib/storage/s3";
import type { PersistGenerationParams, PreviousVersion } from "./types";

const SIGNATURE_RETENTION_LIMIT = 1;

export async function persistGeneration(params: PersistGenerationParams) {
  const {
    generationId,
    sessionId,
    userId,
    prompt,
    enhancedPrompt,
    base64,
    cameoUsed,
    previousGenerationId,
    channelRefs,
    videoRefs,
    textThoughtSignature,
    imageThoughtSignature,
  } = params;

  const key = generationKey(userId, sessionId, generationId);
  await Promise.all([
    uploadImage(key, base64, "image/png"),
    imageThoughtSignature || textThoughtSignature
      ? uploadThoughtSignatures(key, {
          textThoughtSignature: textThoughtSignature ?? null,
          imageThoughtSignature: imageThoughtSignature ?? null,
        })
      : Promise.resolve(),
  ]);

  const client = await pool.connect();
  let staleImageKeys: string[] = [];

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO thumbnail_generation
        (id, session_id, user_id, prompt, enhanced_prompt, image_key, mime_type,
          cameo_used, previous_generation_id, channel_refs, video_refs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        generationId,
        sessionId,
        userId,
        prompt,
        enhancedPrompt,
        key,
        "image/png",
        cameoUsed ?? false,
        previousGenerationId ?? null,
        channelRefs ? JSON.stringify(channelRefs) : null,
        videoRefs ? JSON.stringify(videoRefs) : null,
      ],
    );

    const staleRows = await client.query<{ image_key: string }>(
      `SELECT image_key
       FROM thumbnail_generation
       WHERE session_id = $1
         AND id NOT IN (
           SELECT id
           FROM thumbnail_generation
           WHERE session_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT $2
         )`,
      [sessionId, SIGNATURE_RETENTION_LIMIT],
    );
    staleImageKeys = staleRows.rows.map((row) => row.image_key);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await Promise.all(
    staleImageKeys.map((imageKey) => deleteThoughtSignatures(imageKey)),
  );
}

export async function fetchPreviousVersion(
  previousGenerationId: string,
  userId: string,
): Promise<PreviousVersion | undefined> {
  const result = await pool.query<{
    image_key: string;
    enhanced_prompt: string | null;
    prompt: string;
    cameo_used: boolean;
  }>(
    `SELECT image_key, enhanced_prompt, prompt, cameo_used
     FROM thumbnail_generation WHERE id = $1 AND user_id = $2`,
    [previousGenerationId, userId],
  );

  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  const storedSignatures = await getThoughtSignatures(row.image_key);

  return {
    imageBase64: await getObjectBase64(row.image_key),
    mimeType: "image/png",
    enhancedPrompt: row.enhanced_prompt,
    cameoUsed: row.cameo_used || /#(me|cameo)\b/i.test(row.prompt),
    textThoughtSignature: storedSignatures?.textThoughtSignature ?? null,
    imageThoughtSignature: storedSignatures?.imageThoughtSignature ?? null,
  };
}
