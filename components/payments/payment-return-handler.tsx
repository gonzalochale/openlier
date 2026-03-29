"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useThumbnailStore } from "@/store/use-thumbnail-store";

export function PaymentReturnHandler() {
  const setCredits = useThumbnailStore((s) => s.setCredits);
  const searchParams = useSearchParams();
  const router = useRouter();
  const payment = searchParams.get("payment");
  const stripeSessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!payment) return;

    if (payment === "success" && stripeSessionId) {
      fetch("/api/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: stripeSessionId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("confirm failed");
          return res.json();
        })
        .then((data) => {
          if (data.credits !== undefined) setCredits(data.credits);
          toast("Credits added!");
        })
        .catch(() => {
          toast("Payment received — credits will appear shortly");
        });
    } else if (payment === "cancelled") {
      toast("Payment cancelled");
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("payment");
    next.delete("session_id");
    router.replace(next.toString() ? `?${next}` : window.location.pathname, {
      scroll: false,
    });
  }, [payment, stripeSessionId]);

  return null;
}
