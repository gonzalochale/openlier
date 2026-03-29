"use client";

import { useLayoutEffect } from "react";
import {
  useThumbnailStore,
  type ThumbnailVersion,
} from "@/store/use-thumbnail-store";

interface SessionLoaderProps {
  sessionId: string;
  generations: Omit<ThumbnailVersion, "id">[];
}

export function SessionLoader({ sessionId, generations }: SessionLoaderProps) {
  const loadSession = useThumbnailStore((s) => s.loadSession);

  useLayoutEffect(() => {
    const state = useThumbnailStore.getState();

    if (state.sessionId === sessionId) return;
    loadSession(sessionId, generations);
  }, [sessionId]);

  return null;
}
