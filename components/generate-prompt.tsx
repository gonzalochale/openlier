"use client";

import { useRef, useState } from "react";
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

const MAX_FILES = 5;
const MAX_REFERENCE_PX = 512;

function resizeAndToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(
        1,
        MAX_REFERENCE_PX / Math.max(img.width, img.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileEntry = { file: File; url: string };

export function GeneratePrompt() {
  const [prompt, setPrompt] = useState("");
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    versions,
    selectedVersionId,
    loading,
    setLoading,
    startGenerating,
    addVersion,
  } = useThumbnailStore(
    useShallow((s) => ({
      versions: s.versions,
      selectedVersionId: s.selectedVersionId,
      loading: s.loading,
      setLoading: s.setLoading,
      startGenerating: s.startGenerating,
      addVersion: s.addVersion,
    })),
  );

  function addFiles(newFiles: File[]) {
    const remaining = MAX_FILES - fileEntries.length;
    if (remaining <= 0) {
      toast("You can only attach up to 5 images");
      return;
    }
    if (newFiles.length > remaining) {
      toast(
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added`,
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

  async function handleSubmit() {
    if ((!prompt.trim() && fileEntries.length === 0) || loading) return;
    const trimmed = prompt.trim();
    const entriesToSubmit = fileEntries;
    setPrompt("");
    setFileEntries([]);
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
          prompt: trimmed,
          previousVersion: previousVersion
            ? {
                imageBase64: previousVersion.imageBase64,
                mimeType: previousVersion.mimeType,
                enhancedPrompt: previousVersion.enhancedPrompt,
              }
            : undefined,
          referenceImages:
            referenceImages.length > 0 ? referenceImages : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");

      addVersion({
        imageBase64: data.image,
        mimeType: data.mimeType,
        enhancedPrompt: data.enhancedPrompt ?? null,
        prompt: trimmed,
        createdAt: Date.now(),
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) addFiles(imageFiles);
  }

  const placeholder =
    selectedVersionId !== null
      ? `Describe changes from v${selectedVersionId}…`
      : "Create a thumbnail for my YouTube video with the title...";

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-10 sm:pb-20 px-5 pointer-events-none">
      <div className="w-full max-w-2xl pointer-events-auto">
        <FileUpload onFilesAdded={addFiles} accept="image/*" disabled={loading}>
          <PromptInput
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            onPaste={handlePaste}
            isLoading={loading}
            disabled={loading}
          >
            {fileEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pt-1">
                {fileEntries.map(({ file, url }, index) => (
                  <div
                    key={url}
                    className="bg-secondary flex items-center gap-2 rounded-lg p-1.5 pr-2.5 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={url}
                      alt={file.name}
                      className="size-9 rounded-sm object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="max-w-28 truncate text-xs font-medium leading-tight">
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
                  </div>
                ))}
              </div>
            )}
            <PromptInputTextarea
              ref={textareaRef}
              placeholder={placeholder}
              autoFocus
            />
            <PromptInputActions className="justify-between px-1 pb-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <FileUploadTrigger
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-lg",
                      })}
                      disabled={loading}
                    >
                      <Paperclip className="size-4" />
                    </FileUploadTrigger>
                  }
                />
                <TooltipContent>Attach image</TooltipContent>
              </Tooltip>
              <PromptInputAction tooltip="Send">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    loading || (!prompt.trim() && fileEntries.length === 0)
                  }
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
    </div>
  );
}
