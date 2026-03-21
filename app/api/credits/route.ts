import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query<{ credits: number }>(
    `SELECT credits FROM "user" WHERE id = $1`,
    [session.user.id],
  );

  const credits = result.rows[0]?.credits ?? 0;
  return Response.json({ credits });
}
