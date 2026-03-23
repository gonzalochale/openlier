"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useThumbnailStore } from "@/store/use-thumbnail-store";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileUpload,
  FileUploadTrigger,
  FileUploadContent,
} from "@/components/file-upload";
import { authClient } from "@/lib/auth-client";
import { AuthModal } from "@/components/auth-modal";
import { CreditsModal } from "@/components/credits-modal";
import { resizeAndToBase64, formatFileSize } from "@/lib/utils";
import { MAX_FILES, MAX_PROMPT_LENGTH } from "@/lib/constants";
import {
  type ChannelReference,
  stripVideoChips,
  youtubeRe,
} from "@/lib/youtube";
import { getTextSegments } from "@/lib/text-segments";
import { useThumbnailShortcuts } from "@/hooks/use-thumbnail-shortcuts";
import { useYouTubeReferences } from "@/hooks/use-youtube-references";
import { PromptTextOverlay } from "@/components/prompt-text-overlay";

type FileEntry = { file: File; url: string };

export function GeneratePrompt() {
  useThumbnailShortcuts();
  const shouldReduceMotion = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  const pendingActionRef = useRef<"submit" | "attach" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const {
    versions,
    selectedVersionId,
    loading,
    setLoading,
    startGenerating,
    addVersion,
    pendingPrompt,
    setPendingPrompt,
    decrementCredits,
  } = useThumbnailStore(
    useShallow((s) => ({
      versions: s.versions,
      selectedVersionId: s.selectedVersionId,
      loading: s.loading,
      setLoading: s.setLoading,
      startGenerating: s.startGenerating,
      addVersion: s.addVersion,
      pendingPrompt: s.pendingPrompt,
      setPendingPrompt: s.setPendingPrompt,
      decrementCredits: s.decrementCredits,
    })),
  );

  const {
    channelWidgets,
    videoChips,
    processValueChange,
    clearAll,
    countSlots,
  } = useYouTubeReferences({
    onVideoTitleResolved: (originalUrl, title) => {
      setPrompt((prev) => prev.replace(originalUrl, title));
    },
  });

  function addFiles(newFiles: File[]) {
    if (!session) {
      pendingActionRef.current = "attach";
      setAuthModalOpen(true);
      return;
    }
    const remaining = MAX_FILES - fileEntries.length - countSlots();
    if (remaining <= 0) {
      toast(`You've reached the ${MAX_FILES} reference image limit`);
      return;
    }
    if (newFiles.length > remaining) {
      toast(
        `Only ${remaining} reference slot${remaining === 1 ? "" : "s"} left (${MAX_FILES} max total)`,
      );
    }
    const toAdd = newFiles
      .slice(0, remaining)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFileEntries((prev) => [...prev, ...toAdd]);
  }

  function removeFile(index: number) {
    setFileEntries((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleValueChange(value: string) {
    const processed = processValueChange(value, fileEntries.length);
    setPrompt(processed);
    if (pendingPrompt !== null) setPendingPrompt(processed.trim() || null);
  }

  const textSegments = useMemo(
    () =>
      /@/.test(prompt) ||
      /youtu/.test(prompt) ||
      videoChips.some((c) => c.stage === "found")
        ? getTextSegments(prompt, channelWidgets, videoChips)
        : null,
    [prompt, channelWidgets, videoChips],
  );

  const doSubmit = useCallback(
    async (promptValue: string) => {
      if (!promptValue.trim() || loading) return;
      const trimmed = promptValue.trim();
      const videoChipsSnapshot = videoChips;

      const validationPrompt = stripVideoChips(
        trimmed.replace(/@[\w.-]*/g, ""),
        videoChipsSnapshot,
      );
      if (!validationPrompt) return;

      const sendPrompt = trimmed
        .replace(youtubeRe(), "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const videoRefs = videoChipsSnapshot
        .filter((c): c is typeof c & { stage: "found" } => c.stage === "found")
        .map((c) => ({
          url: `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
        }));

      const entriesToSubmit = fileEntries;
      const foundChannels = [...channelWidgets.values()].filter(
        (w): w is { stage: "found"; ref: ChannelReference } =>
          w.stage === "found",
      );
      const channelRefs = foundChannels.map((w) => ({
        urls: w.ref.thumbnails.map((t) => t.url),
        handle: w.ref.handle,
      }));

      setPrompt("");
      setFileEntries([]);
      clearAll();
      entriesToSubmit.forEach((e) => URL.revokeObjectURL(e.url));
      startGenerating();

      const previousVersion = versions.find((v) => v.id === selectedVersionId);

      try {
        const referenceImages = await Promise.all(
          entriesToSubmit.map(async ({ file }) => ({
            imageBase64: await resizeAndToBase64(file),
            mimeType: "image/jpeg",
          })),
        );

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: sendPrompt,
            previousVersion: previousVersion
              ? {
                  imageBase64: previousVersion.imageBase64,
                  mimeType: previousVersion.mimeType,
                  enhancedPrompt: previousVersion.enhancedPrompt,
                }
              : undefined,
            referenceImages:
              referenceImages.length > 0 ? referenceImages : undefined,
            channelRefs: channelRefs.length > 0 ? channelRefs : undefined,
            videoRefs: videoRefs.length > 0 ? videoRefs : undefined,
          }),
        });
        const data = await res.json();
        if (res.status === 402) {
          setLoading(false);
          setCreditsModalOpen(true);
          return;
        }
        if (!res.ok) throw new Error(data.error ?? "Unknown error");

        decrementCredits();
        addVersion({
          imageBase64: data.image,
          mimeType: data.mimeType,
          enhancedPrompt: data.enhancedPrompt ?? null,
          prompt: sendPrompt,
          createdAt: Date.now(),
        });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      } finally {
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    },
    [
      fileEntries,
      channelWidgets,
      videoChips,
      loading,
      versions,
      selectedVersionId,
      startGenerating,
      addVersion,
      setLoading,
      decrementCredits,
      clearAll,
    ],
  );

  const effectivePrompt = prompt.replace(/@[\w.-]*/g, "").trim();
  const cleanedEffectivePrompt = stripVideoChips(effectivePrompt, videoChips);
  const hasDuplicateChannel =
    textSegments?.some((s) => s.type === "duplicate-channel") ?? false;
  const hasContent =
    !!cleanedEffectivePrompt &&
    !hasDuplicateChannel &&
    ![...channelWidgets.values()].some(
      (w) =>
        w.stage === "error" || w.stage === "loading" || w.stage === "empty",
    );

  const handleSubmit = useCallback(async () => {
    if (!hasContent || loading) return;
    if (!session) {
      if (effectivePrompt) setPendingPrompt(effectivePrompt);
      setAuthModalOpen(true);
      return;
    }
    doSubmit(prompt);
  }, [
    hasContent,
    prompt,
    effectivePrompt,
    loading,
    session,
    setPendingPrompt,
    doSubmit,
  ]);

  useEffect(() => {
    if (sessionPending || !session || !pendingPrompt) return;
    setPendingPrompt(null);
    setPrompt(pendingPrompt);
    doSubmit(pendingPrompt);
  }, [sessionPending, session, pendingPrompt, setPendingPrompt, doSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.key !== "Backspace" && e.key !== "Delete") || !textareaRef.current)
        return;
      if (!textSegments) return;
      const { selectionStart, selectionEnd } = textareaRef.current;

      let offset = 0;
      for (const seg of textSegments) {
        const start = offset;
        const end = offset + seg.text.length;
        if (seg.type === "youtube-url") {
          if (selectionStart === start && selectionEnd === end) break;
          const hitBackspace =
            e.key === "Backspace" &&
            selectionStart === selectionEnd &&
            selectionStart === end;
          const hitDelete =
            e.key === "Delete" &&
            selectionStart === selectionEnd &&
            selectionStart === start;
          const hitInside =
            selectionStart === selectionEnd &&
            selectionStart > start &&
            selectionStart < end;
          if (hitBackspace || hitDelete || hitInside) {
            e.preventDefault();
            textareaRef.current.selectionStart = start;
            textareaRef.current.selectionEnd = end;
            return;
          }
        }
        offset = end;
      }
    },
    [textSegments],
  );

  function handlePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) addFiles(imageFiles);

    const pastedText = e.clipboardData.getData("text");
    if (!pastedText || !textareaRef.current) return;

    const { selectionStart, selectionEnd } = textareaRef.current;
    const newValue =
      prompt.slice(0, selectionStart) + pastedText + prompt.slice(selectionEnd);

    if (newValue.length > MAX_PROMPT_LENGTH) {
      e.preventDefault();
      handleValueChange(newValue.slice(0, MAX_PROMPT_LENGTH));
    }
  }

  const placeholder =
    selectedVersionId !== null
      ? `Describe changes from v${selectedVersionId}…`
      : "Create a thumbnail for my YouTube video with the title...";

  return (
    <div className="absolute bottom-0 sm:bottom-5 sm:px-5 w-full flex justify-center pointer-events-none">
      <div className="mx-auto w-full max-w-2xl pointer-events-auto">
        <FileUpload onFilesAdded={addFiles} accept="image/*" disabled={loading}>
          <PromptInput
            value={prompt}
            onValueChange={handleValueChange}
            onSubmit={handleSubmit}
            onPaste={handlePaste}
            isLoading={loading}
            disabled={loading}
          >
            {fileEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pt-1">
                <AnimatePresence mode="popLayout">
                  {fileEntries.map(({ file, url }, index) => (
                    <motion.div
                      key={url}
                      layout
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.85, filter: "blur(4px)" }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1 }
                          : { opacity: 1, scale: 1, filter: "blur(0px)" }
                      }
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.85 }
                      }
                      transition={{ type: "spring", bounce: 0, duration: 0.25 }}
                      className="bg-background border flex items-center gap-2 rounded-lg p-1.5 pr-2.5 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={url}
                        alt={file.name}
                        className="size-9 rounded-sm object-cover shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="max-w-10 truncate text-xs font-medium leading-tight">
                          {file.name}
                        </span>
                        <span className="text-muted-foreground text-xs leading-tight">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className={
                          buttonVariants({
                            variant: "destructive",
                            size: "icon-sm",
                          }) + " ml-auto"
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="relative">
              <PromptTextOverlay
                textSegments={textSegments}
                videoChips={videoChips}
                channelWidgets={channelWidgets}
                overlayRef={overlayRef}
                shouldReduceMotion={shouldReduceMotion}
                prompt={prompt}
              />
              <PromptInputTextarea
                ref={textareaRef}
                placeholder={placeholder}
                autoFocus
                maxLength={MAX_PROMPT_LENGTH}
                className="caret-foreground text-transparent"
                onKeyDown={handleKeyDown}
                onScroll={() => {
                  if (overlayRef.current && textareaRef.current) {
                    overlayRef.current.scrollTop =
                      textareaRef.current.scrollTop;
                  }
                }}
              />
            </div>
            <PromptInputActions className="justify-between px-1 pb-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    session ? (
                      <FileUploadTrigger
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-lg",
                        })}
                        disabled={loading}
                      >
                        <Paperclip className="size-4" />
                      </FileUploadTrigger>
                    ) : (
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-lg",
                        })}
                        onClick={() => {
                          pendingActionRef.current = "attach";
                          setAuthModalOpen(true);
                        }}
                      >
                        <Paperclip className="size-4" />
                      </button>
                    )
                  }
                />
                <TooltipContent>Attach image</TooltipContent>
              </Tooltip>
              <PromptInputAction tooltip="Send">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !hasContent}
                  size="icon-lg"
                >
                  <ArrowUp size={18} />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
          <FileUploadContent>
            <div className="bg-background/90 m-4 w-full max-w-md rounded-2xl border p-8 shadow-lg text-center">
              <Paperclip className="text-muted-foreground mx-auto mb-3 size-8" />
              <p className="font-medium">Drop images here</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Release to attach to your prompt
              </p>
            </div>
          </FileUploadContent>
        </FileUpload>
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <CreditsModal
        open={creditsModalOpen}
        onOpenChange={setCreditsModalOpen}
      />
    </div>
  );
}
