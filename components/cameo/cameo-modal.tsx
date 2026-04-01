"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCameoStore } from "@/store/use-cameo-store";
import { CameoScanner } from "./cameo-scanner";
import { CameoManage } from "./cameo-manage";

interface CameoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EASE = [0.25, 1, 0.5, 1] as const;

type Phase = "scan" | "processing" | "upload-error";

const HEADER: Record<Phase | "manage", { title: string; description: string }> =
  {
    scan: {
      title: "Register Cameo",
      description: "Scan your face to personalize thumbnails.",
    },
    processing: {
      title: "Saving…",
      description: "Hang tight, just a moment.",
    },
    "upload-error": {
      title: "Upload failed",
      description: "Your scan is saved — no need to redo it.",
    },
    manage: {
      title: "Your Cameo",
      description: "Your face is saved and ready to use.",
    },
  };

export function CameoModal({ open, onOpenChange }: CameoModalProps) {
  const { registered, setRegistered } = useCameoStore();
  const [phase, setPhase] = useState<Phase>("scan");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<
    { angle: string; base64: string }[] | null
  >(null);
  const uploadRunIdRef = useRef(0);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const rm = useReducedMotion();

  useEffect(() => {
    if (!registered && open) {
      setPhase("scan");
      setPendingImages(null);
      setUploadError(null);
    }
  }, [registered, open]);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
    };
  }, []);

  const slideVariants = {
    initial: rm ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: rm ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: rm ? { opacity: 0 } : { opacity: 0, y: -6 },
  };
  const transition = { duration: 0.15, ease: EASE };

  const handleClose = useCallback(() => {
    uploadRunIdRef.current += 1;
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUploadError(null);
    setPendingImages(null);
    if (!registered) setPhase("scan");
    onOpenChange(false);
  }, [onOpenChange, registered]);

  const upload = useCallback(
    async (images: { angle: string; base64: string }[]) => {
      const runId = ++uploadRunIdRef.current;
      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setPhase("processing");
      setUploadError(null);
      try {
        const res = await fetch("/api/cameo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ image: images[0].base64 }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        if (runId !== uploadRunIdRef.current) return;
        setRegistered(true);
        handleClose();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (runId !== uploadRunIdRef.current) return;
        setPhase("upload-error");
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (uploadAbortRef.current === controller) {
          uploadAbortRef.current = null;
        }
      }
    },
    [handleClose, setRegistered],
  );

  const handleScanComplete = useCallback(
    (images: { angle: string; base64: string }[]) => {
      setPendingImages(images);
      upload(images);
    },
    [upload],
  );

  const headerKey = registered ? "manage" : phase;
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
          {registered ? (
            <m.div
              key="manage"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              <CameoManage onClose={handleClose} />
            </m.div>
          ) : phase === "upload-error" ? (
            <m.div
              key="upload-error"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              className="flex flex-col gap-3"
            >
              <p className="text-xs text-muted-foreground">{uploadError}</p>
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
                  onClick={() => pendingImages && upload(pendingImages)}
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
