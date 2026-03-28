"use client";

import { Button } from "@/components/ui/button";
import { useThumbnailUIStore } from "@/store/use-thumbnail-ui-store";
import { cn } from "@/lib/utils";

export function LoginButton({ className }: { className?: string }) {
  const openAuthModal = useThumbnailUIStore((s) => s.openAuthModal);

  return (
    <Button size="lg" variant="outline" className={cn("w-28", className)} onClick={openAuthModal}>
      Log in
    </Button>
  );
}
