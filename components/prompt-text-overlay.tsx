"use client";

import { motion } from "motion/react";
import { type ChannelWidget, type VideoChip } from "@/lib/youtube";
import { type TextSegment } from "@/lib/text-segments";
import { MentionStatusChip } from "@/components/mention-status-chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TextScramble } from "@/components/ui/text-scramble";

export function PromptTextOverlay({
  textSegments,
  videoChips,
  channelWidgets,
  overlayRef,
  shouldReduceMotion,
  prompt,
}: {
  textSegments: TextSegment[] | null;
  videoChips: VideoChip[];
  channelWidgets: Map<string, ChannelWidget>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  shouldReduceMotion: boolean | null;
  prompt: string;
}) {
  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap wrap-break-word px-2 py-2 text-base leading-6 text-primary"
    >
      {textSegments
        ? textSegments.map((p: TextSegment, i: number) => {
            if (p.type === "plain") return <span key={i}>{p.text}</span>;

            if (p.type === "youtube-url") {
              const chip = videoChips.find((c) => c.videoId === p.videoId);
              if (chip?.stage === "error") {
                return (
                  <MentionStatusChip
                    key={i}
                    markClass="bg-destructive/15 text-destructive"
                    textClass="text-destructive"
                    message="Video not found"
                  >
                    {p.text}
                  </MentionStatusChip>
                );
              }
              const isFound = chip?.stage === "found";
              return (
                <HoverCard key={i}>
                  <HoverCardTrigger
                    delay={200}
                    closeDelay={100}
                    render={
                      <mark
                        className={
                          isFound
                            ? "bg-channel text-channel-foreground rounded-sm not-italic cursor-default pointer-events-auto"
                            : "bg-muted text-muted-foreground rounded-sm not-italic animate-pulse cursor-default pointer-events-auto"
                        }
                      />
                    }
                  >
                    <TextScramble
                      as="span"
                      trigger={isFound && !shouldReduceMotion}
                    >
                      {p.text}
                    </TextScramble>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-52 p-2"
                    side="top"
                    align="start"
                  >
                    {isFound ? (
                      <motion.img
                        src={`https://i.ytimg.com/vi/${chip.videoId}/hqdefault.jpg`}
                        alt={chip.title}
                        className="aspect-video w-full rounded-sm object-cover"
                        draggable={false}
                        initial={
                          shouldReduceMotion
                            ? false
                            : { opacity: 0, scale: 0.95 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                      />
                    ) : (
                      <Skeleton className="aspect-video w-full rounded-sm" />
                    )}
                  </HoverCardContent>
                </HoverCard>
              );
            }

            if (p.type === "duplicate-channel") {
              return (
                <MentionStatusChip
                  key={i}
                  markClass="bg-destructive/15 text-destructive"
                  textClass="text-destructive"
                  message="Can't tag the same channel twice"
                >
                  {p.text}
                </MentionStatusChip>
              );
            }

            const widget = channelWidgets.get(p.handle);
            const widgetFound = widget?.stage === "found" ? widget : null;
            if (widgetFound) {
              return (
                <HoverCard key={i}>
                  <HoverCardTrigger
                    delay={200}
                    closeDelay={100}
                    render={
                      <mark className="bg-channel text-channel-foreground rounded-sm not-italic cursor-default pointer-events-auto" />
                    }
                  >
                    {p.text}
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-52 p-2"
                    side="top"
                    align="start"
                  >
                    <div className="flex flex-col gap-1.5 select-none">
                      {widgetFound.ref.thumbnails
                        .slice(0, 3)
                        .map((thumb, j) => (
                          <motion.img
                            key={thumb.videoId}
                            src={thumb.url}
                            alt={thumb.title}
                            className="aspect-video w-full rounded-sm object-cover"
                            draggable={false}
                            initial={
                              shouldReduceMotion
                                ? false
                                : { opacity: 0, scale: 0.95 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.18,
                              delay: j * 0.04,
                              ease: [0.25, 1, 0.5, 1],
                            }}
                          />
                        ))}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }

            if (widget?.stage === "error") {
              return (
                <MentionStatusChip
                  key={i}
                  markClass="bg-destructive/15 text-destructive"
                  textClass="text-destructive"
                  message="Channel not found"
                >
                  {p.text}
                </MentionStatusChip>
              );
            }

            if (widget?.stage === "empty") {
              return (
                <MentionStatusChip
                  key={i}
                  markClass="bg-destructive/15 text-destructive"
                  textClass="text-destructive"
                  message="No videos found"
                >
                  {p.text}
                </MentionStatusChip>
              );
            }

            return (
              <HoverCard key={i}>
                <HoverCardTrigger
                  delay={200}
                  closeDelay={100}
                  render={
                    <mark className="bg-muted text-muted-foreground rounded-sm not-italic animate-pulse cursor-default pointer-events-auto" />
                  }
                >
                  {p.text}
                </HoverCardTrigger>
                <HoverCardContent className="w-52 p-2" side="top" align="start">
                  <div className="flex flex-col gap-1.5">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Skeleton
                        key={idx}
                        className="aspect-video w-full rounded-sm"
                      />
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })
        : prompt}
    </div>
  );
}
