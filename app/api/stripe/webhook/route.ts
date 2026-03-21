import { pool } from "@/lib/db";
import { grantCredits } from "@/lib/credits";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeCustomerId = session.customer as string | null;
    const credits = Number(session.metadata?.credits);

    if (!stripeCustomerId || !Number.isInteger(credits) || credits < 1) {
      return Response.json({ received: true });
    }

    const userResult = await pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE stripe_customer_id = $1`,
      [stripeCustomerId],
    );
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      console.error("Webhook: no user found for customer", stripeCustomerId);
      return Response.json({ error: "User not found" }, { status: 500 });
    }

    try {
      await grantCredits(
        userId,
        session.id,
        credits,
        session.amount_total ?? 0,
      );
    } catch (err) {
      console.error("Webhook DB error:", err);
      return Response.json({ error: "DB error" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
