"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useThumbnailStore } from "@/store/use-thumbnail-store";

export function PaymentReturnHandler() {
  const setCredits = useThumbnailStore((s) => s.setCredits);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment === "success" && sessionId) {
      fetch("/api/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
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

    if (payment) {
      params.delete("payment");
      params.delete("session_id");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  return null;
}
