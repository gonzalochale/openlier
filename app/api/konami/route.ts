import { grantKonamiCredits } from "@/lib/stripe/credits";
import { requireAuth } from "@/lib/auth/require-auth";

export async function POST() {
  const session = await requireAuth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { newBalance, alreadyRedeemed } = await grantKonamiCredits(
    session.user.id,
    session.user.email,
  );
  if (alreadyRedeemed)
    return Response.json({ error: "Already redeemed" }, { status: 409 });

  return Response.json({ credits: newBalance });
}
