import { pathToFileURL } from "node:url";
import { createPool, loadLocalEnv, runStatements } from "./utils";

const statements = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
  `
    CREATE TABLE IF NOT EXISTS "user" (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL,
      "emailVerified" boolean NOT NULL DEFAULT false,
      image text,
      credits integer NOT NULL DEFAULT 1,
      stripe_customer_id text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `,
  'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 1',
  'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS stripe_customer_id text',
  'ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT now()',
  'ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT now()',
  'CREATE UNIQUE INDEX IF NOT EXISTS user_email_key ON "user" (email)',
  `
    CREATE TABLE IF NOT EXISTS session (
      id text PRIMARY KEY,
      token text NOT NULL,
      "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "expiresAt" timestamptz NOT NULL,
      "ipAddress" text,
      "userAgent" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `,
  'ALTER TABLE session ALTER COLUMN "createdAt" SET DEFAULT now()',
  'ALTER TABLE session ALTER COLUMN "updatedAt" SET DEFAULT now()',
  "CREATE UNIQUE INDEX IF NOT EXISTS session_token_key ON session (token)",
  'CREATE INDEX IF NOT EXISTS session_user_id_idx ON session ("userId")',
  `
    CREATE TABLE IF NOT EXISTS account (
      id text PRIMARY KEY,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" timestamptz,
      "refreshTokenExpiresAt" timestamptz,
      scope text,
      password text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `,
  'ALTER TABLE account ALTER COLUMN "createdAt" SET DEFAULT now()',
  'ALTER TABLE account ALTER COLUMN "updatedAt" SET DEFAULT now()',
  `
    CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_key
    ON account ("providerId", "accountId")
  `,
  'CREATE INDEX IF NOT EXISTS account_user_id_idx ON account ("userId")',
  `
    CREATE TABLE IF NOT EXISTS verification (
      id text PRIMARY KEY,
      identifier text NOT NULL,
      value text NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `,
  'ALTER TABLE verification ALTER COLUMN "createdAt" SET DEFAULT now()',
  'ALTER TABLE verification ALTER COLUMN "updatedAt" SET DEFAULT now()',
  "CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier)",
  `
    CREATE TABLE IF NOT EXISTS thumbnail_session (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS thumbnail_session_user_created_idx
    ON thumbnail_session (user_id, created_at DESC)
  `,
  `
    CREATE TABLE IF NOT EXISTS thumbnail_generation (
      id uuid PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES thumbnail_session(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      prompt text NOT NULL,
      enhanced_prompt text,
      image_key text NOT NULL,
      mime_type text,
      cameo_used boolean NOT NULL DEFAULT false,
      previous_generation_id uuid REFERENCES thumbnail_generation(id) ON DELETE SET NULL,
      channel_refs jsonb,
      video_refs jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS thumbnail_generation_session_created_idx
    ON thumbnail_generation (session_id, created_at ASC)
  `,
  `
    CREATE INDEX IF NOT EXISTS thumbnail_generation_user_created_idx
    ON thumbnail_generation (user_id, created_at DESC)
  `,
  `
    CREATE TABLE IF NOT EXISTS credit_purchase (
      id bigserial PRIMARY KEY,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      stripe_session_id text NOT NULL,
      credits_added integer NOT NULL,
      amount_cents integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS credit_purchase_stripe_session_id_key
    ON credit_purchase (stripe_session_id)
  `,
  "CREATE INDEX IF NOT EXISTS credit_purchase_user_id_idx ON credit_purchase (user_id)",
  `
    CREATE TABLE IF NOT EXISTS konami_redemption (
      id bigserial PRIMARY KEY,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS konami_redemption_email_key
    ON konami_redemption (email)
  `,
] as const;

export async function setupDatabase() {
  loadLocalEnv();
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await runStatements(client, statements);
    await client.query("COMMIT");
    console.log("Database schema is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  setupDatabase().catch((error) => {
    console.error("Failed to set up the database schema.");
    console.error(error);
    process.exit(1);
  });
}
