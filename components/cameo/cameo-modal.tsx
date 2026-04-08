"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCameoStore } from "@/store/use-cameo-store";
import { saveLocalCameo } from "@/lib/cameo/local";
import { CameoScanner } from "./cameo-scanner";
import { CameoManage } from "./cameo-manage";

interface CameoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EASE = [0.25, 1, 0.5, 1] as const;

type Phase = "scan" | "processing" | "save-error";

const HEADER: Record<Phase | "manage", { title: string; description: string }> =
  {
    scan: {
      title: "Save Cameo Locally",
      description:
        "Your cameo stays only in this browser and is never saved on our servers.",
    },
    processing: {
      title: "Saving locally…",
      description: "Hang tight while we store your cameo in this browser.",
    },
    "save-error": {
      title: "Local save failed",
      description:
        "We could not save your cameo in this browser. Your scan is still here if you want to try again.",
    },
    manage: {
      title: "Your Local Cameo",
      description:
        "This cameo lives only in this browser and is never uploaded to our servers.",
    },
  };

export function CameoModal({ open, onOpenChange }: CameoModalProps) {
  const { availableLocally, setAvailableLocally } = useCameoStore();
  const [phase, setPhase] = useState<Phase>("scan");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<
    { angle: string; base64: string }[] | null
  >(null);
  const rm = useReducedMotion();

  const slideVariants = {
    initial: rm ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: rm ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: rm ? { opacity: 0 } : { opacity: 0, y: -6 },
  };
  const transition = { duration: 0.15, ease: EASE };

  const handleClose = useCallback(() => {
    setSaveError(null);
    setPendingImages(null);
    if (!availableLocally) setPhase("scan");
    onOpenChange(false);
  }, [availableLocally, onOpenChange]);

  const handleDeleteClose = useCallback(() => {
    setPhase("scan");
    setSaveError(null);
    setPendingImages(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const persistLocally = useCallback(
    async (images: { angle: string; base64: string }[]) => {
      setPhase("processing");
      setSaveError(null);
      try {
        saveLocalCameo(images[0].base64, "image/jpeg");
        setAvailableLocally(true);
        handleClose();
      } catch (err) {
        setPhase("save-error");
        setSaveError(
          err instanceof Error ? err.message : "Local save failed",
        );
      }
    },
    [handleClose, setAvailableLocally],
  );

  const handleScanComplete = useCallback(
    (images: { angle: string; base64: string }[]) => {
      setPendingImages(images);
      persistLocally(images);
    },
    [persistLocally],
  );

  const headerKey = availableLocally ? "manage" : phase;
  const { title, description } = HEADER[headerKey];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <AnimatePresence mode="wait">
            <m.div
              key={headerKey}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-1"
            >
              <DialogTitle className="text-base font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {description}
              </DialogDescription>
            </m.div>
          </AnimatePresence>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {availableLocally ? (
            <m.div
              key="manage"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              <CameoManage onClose={handleDeleteClose} />
            </m.div>
          ) : phase === "save-error" ? (
            <m.div
              key="save-error"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-3"
            >
              <p className="text-xs text-muted-foreground">{saveError}</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setPhase("scan");
                    setPendingImages(null);
                  }}
                  className="text-xs text-muted-foreground underline underline-offset-3 hover:text-foreground transition-colors"
                >
                  Re-scan
                </button>
                <button
                  onClick={() =>
                    pendingImages && persistLocally(pendingImages)
                  }
                  className="text-xs text-foreground underline underline-offset-3 hover:text-muted-foreground transition-colors"
                >
                  Try again
                </button>
              </div>
            </m.div>
          ) : (
            <m.div
              key="scanner"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              <CameoScanner
                onComplete={handleScanComplete}
                isProcessing={phase === "processing"}
              />
            </m.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
