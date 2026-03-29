"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useSidebar } from "@/components/ui/sidebar";
import type { SessionSummary } from "@/hooks/use-sessions";

interface SessionItemProps {
  session: SessionSummary;
  isNew?: boolean;
}

const MotionLink = motion(Link);

export function SessionItem({ session, isNew }: SessionItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const params = useParams<{ sessionId?: string }>();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = params.sessionId === session.id;

  return (
    <MotionLink
      href={`/${session.id}`}
      prefetch={false}
      layout
      initial={
        shouldReduceMotion
          ? false
          : isNew
            ? { opacity: 0, y: -8 }
            : { opacity: 0, x: -6 }
      }
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
      transition={{
        duration: 0.2,
        ease: [0.25, 1, 0.5, 1],
        layout: { duration: 0.22, ease: [0.25, 1, 0.5, 1] },
      }}
      onClick={() => isMobile && setOpenMobile(false)}
      className="group w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 cursor-pointer"
    >
      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, black 70%, transparent 100%)",
        }}
      >
        <span
          className={`block text-xs/relaxed font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-foreground/40"}`}
        >
          {session.firstPrompt ?? "Untitled session"}
        </span>
      </div>
    </MotionLink>
  );
}
