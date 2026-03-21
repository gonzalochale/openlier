"use client";

import { useCallback, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useThumbnailStore } from "@/store/use-thumbnail-store";

export function useCredits() {
  const { data: session } = authClient.useSession();
  const setCredits = useThumbnailStore((s) => s.setCredits);
  const credits = useThumbnailStore((s) => s.credits);
  const userId = session?.user.id;

  const fetchCredits = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {
      console.error("Failed to fetch credits");
    }
  }, [userId, setCredits]);

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  useEffect(() => {
    window.addEventListener("focus", fetchCredits);
    return () => window.removeEventListener("focus", fetchCredits);
  }, [fetchCredits]);

  return { credits, refetch: fetchCredits };
}
