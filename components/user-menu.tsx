"use client";

import { ChevronsUpDown, Wallet, Info, Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { useThumbnailStore } from "@/store/use-thumbnail-store";
import { SignOutButton } from "@/components/sign-out-button";
import { LoginButton } from "@/components/login-button";

const SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local[0]}${"•".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

function useScramble(target: string, shouldReduceMotion: boolean | null): string {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    cancelAnimationFrame(rafRef.current);

    if (from === target || shouldReduceMotion) {
      setDisplayed(target);
      return;
    }

    const len = Math.min(from.length, target.length);
    const changing = Array.from({ length: len }, (_, i) => i).filter(
      (i) => from[i] !== target[i],
    );

    if (changing.length === 0) {
      setDisplayed(target);
      return;
    }

    const duration = 380;
    const start = performance.now();

    function tick() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const chars = target.split("");

      changing.forEach((idx, n) => {
        if (progress < n / changing.length) {
          chars[idx] =
            SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      });

      setDisplayed(chars.join(""));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, shouldReduceMotion]);

  return displayed;
}

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const openCreditsModal = useThumbnailStore((s) => s.openCreditsModal);
  const openInfoModal = useThumbnailStore((s) => s.openInfoModal);
  const shouldReduceMotion = useReducedMotion();
  const [emailVisible, setEmailVisible] = useState(false);
  const user = session?.user;

  const emailTarget = emailVisible
    ? (user?.email ?? "")
    : maskEmail(user?.email ?? "");
  const scrambledEmail = useScramble(emailTarget, shouldReduceMotion);

  const variants = {
    initial: shouldReduceMotion ? {} : { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? {} : { opacity: 0, y: -4 },
  };

  const transition = {
    duration: 0.2,
    ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {isPending ? null : !user ? (
        <motion.div
          key="logged-out"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs/relaxed font-medium">
              Generate AI thumbnails
            </span>
            <span className="text-xs/relaxed text-muted-foreground">
              Sign in to start creating and saving your sessions.
            </span>
          </div>
          <LoginButton className="w-full" />
        </motion.div>
      ) : (
        <motion.div
          key="logged-in"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="hover:cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={user.image ?? undefined}
                          alt={user.name ?? ""}
                        />
                        <AvatarFallback>
                          {user.name?.charAt(0).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 leading-none min-w-0">
                        <span className="font-medium truncate">
                          {user.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {scrambledEmail}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto shrink-0" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  className="w-(--anchor-width)"
                  align="start"
                  side="top"
                >
                  <div className="flex items-center gap-2.5 px-2 py-2">
                    <Avatar size="sm">
                      <AvatarImage
                        src={user.image ?? undefined}
                        alt={user.name ?? ""}
                      />
                      <AvatarFallback>
                        {user.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium leading-snug">
                        {user.name ?? "—"}
                      </span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate text-xs leading-snug text-muted-foreground">
                          {scrambledEmail}
                        </span>
                        <button
                          className="shrink-0 text-muted-foreground hover:text-foreground hover:cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmailVisible((v) => !v);
                          }}
                          aria-label={emailVisible ? "Hide email" : "Show email"}
                        >
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={emailVisible ? "icon-hide" : "icon-show"}
                              initial={
                                shouldReduceMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, scale: 0.6 }
                              }
                              animate={{ opacity: 1, scale: 1 }}
                              exit={
                                shouldReduceMotion
                                  ? { opacity: 0 }
                                  : { opacity: 0, scale: 0.6 }
                              }
                              transition={{
                                duration: 0.12,
                                ease: [0.25, 1, 0.5, 1] as const,
                              }}
                              className="flex"
                            >
                              {emailVisible ? (
                                <EyeOff size={12} />
                              ) : (
                                <Eye size={12} />
                              )}
                            </motion.span>
                          </AnimatePresence>
                        </button>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={openCreditsModal}>
                      <Wallet />
                      Get credits
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openInfoModal}>
                      <Info />
                      About
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <SignOutButton />
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
