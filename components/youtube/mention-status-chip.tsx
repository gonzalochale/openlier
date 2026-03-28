"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function MentionStatusChip({
  markClass,
  textClass,
  message,
  children,
}: {
  markClass: string;
  textClass: string;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={100}
        closeDelay={0}
        render={
          <mark
            className={`${markClass} rounded-sm not-italic cursor-default pointer-events-auto`}
          />
        }
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-auto p-2" side="top" align="start">
        <span className={`text-xs ${textClass}`}>{message}</span>
      </HoverCardContent>
    </HoverCard>
  );
}
