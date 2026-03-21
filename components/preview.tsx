"use client";

import { ArrowDown, Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useThumbnailStore } from "@/store/use-thumbnail-store";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Preview() {
  const { versions, selectedVersionId, loading, download } = useThumbnailStore(
    useShallow((s) => ({
      versions: s.versions,
      selectedVersionId: s.selectedVersionId,
      loading: s.loading,
      download: s.download,
    })),
  );

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const isFirstLoad = versions.length === 0 && loading;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center gap-2">
      {selectedVersion && (
        <div className="w-full flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">v{selectedVersion.id}</p>
          <Tooltip>
            <TooltipTrigger
              disabled={loading}
              render={
                <Button
                  variant="outline"
                  onClick={() => download(selectedVersion.id)}
                  size="icon-lg"
                  disabled={loading}
                >
                  <ArrowDown size={18} />
                </Button>
              }
              onClick={(event) => event.stopPropagation()}
            />
            <TooltipContent>
              <p>Download</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {isFirstLoad && (
          <Skeleton className="absolute inset-0 rounded-lg sm:rounded-2xl" />
        )}
        {selectedVersion && (
          <img
            src={`data:${selectedVersion.mimeType};base64,${selectedVersion.imageBase64}`}
            alt={`Thumbnail v${selectedVersion.id}`}
            className="w-full h-full object-cover rounded-lg sm:rounded-2xl"
          />
        )}
      </div>
    </div>
  );
}
