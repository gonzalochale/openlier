import fs from "node:fs";
import { Pool, type PoolClient } from "pg";

const ENV_FILES = [".env.local", ".env"] as const;

export function loadLocalEnv() {
  for (const file of ENV_FILES) {
    if (fs.existsSync(file) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(file);
    }
  }
}

export function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Add it to .env.local or .env before running DB scripts.",
    );
  }

  return new Pool({ connectionString });
}

export async function runStatements(
  client: PoolClient,
  statements: readonly string[],
) {
  for (const statement of statements) {
    await client.query(statement);
  }
}
