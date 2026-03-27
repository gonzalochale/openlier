import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await req.json();
  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const [checkoutSession, userResult] = await Promise.all([
    stripe.checkout.sessions.retrieve(sessionId),
    pool.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM "user" WHERE id = $1`,
      [session.user.id],
    ),
  ]);

  if (checkoutSession.payment_status !== "paid") {
    return Response.json({ error: "Payment not completed" }, { status: 402 });
  }

  const stripeCustomerId = userResult.rows[0]?.stripe_customer_id;
  if (!stripeCustomerId || checkoutSession.customer !== stripeCustomerId) {
    return Response.json({ error: "Session mismatch" }, { status: 403 });
  }

  const credits = Number(checkoutSession.metadata?.credits);
  if (!Number.isInteger(credits) || credits < 1) {
    return Response.json(
      { error: "Invalid session metadata" },
      { status: 400 },
    );
  }

  try {
    const newBalance = await grantCredits(
      session.user.id,
      checkoutSession.id,
      credits,
      checkoutSession.amount_total ?? 0,
    );

    if (newBalance === null) {
      const result = await pool.query<{ credits: number }>(
        `SELECT credits FROM "user" WHERE id = $1`,
        [session.user.id],
      );
      return Response.json({ credits: result.rows[0]?.credits ?? 0 });
    }

    return Response.json({ credits: newBalance });
  } catch (err) {
    console.error("Confirm DB error:", err);
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
