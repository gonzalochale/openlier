import { pool } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { requireAuth } from "@/lib/auth/require-auth";
import { CREDIT_PLANS } from "@/lib/constants";

export async function POST(req: Request) {
  const session = await requireAuth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const credits = Number(body.credits);

  if (!Number.isInteger(credits) || credits < 1) {
    return Response.json({ error: "Invalid credits amount" }, { status: 400 });
  }

  if (!CREDIT_PLANS[credits]) {
    return Response.json({ error: "Invalid credits amount" }, { status: 400 });
  }

  const result = await pool.query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM "user" WHERE id = $1`,
    [session.user.id],
  );
  const stripeCustomerId = result.rows[0]?.stripe_customer_id;

  if (!stripeCustomerId) {
    return Response.json(
      { error: "Stripe customer not found" },
      { status: 500 },
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: CREDIT_PLANS[credits],
          product_data: { name: "Open Outlier Credits" },
        },
        quantity: credits,
      },
    ],
    allow_promotion_codes: true,
    metadata: {
      credits: String(credits),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?payment=cancelled`,
  });

  return Response.json({ url: checkoutSession.url });
}
