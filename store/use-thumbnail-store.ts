import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ThumbnailVersion {
  id: number;
  imageBase64: string;
  mimeType: string;
  prompt: string;
  rawPrompt?: string;
  enhancedPrompt: string | null;
  createdAt: number;
}

interface ThumbnailState {
  versions: ThumbnailVersion[];
  selectedVersionId: number | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  pendingPrompt: string | null;
  credits: number | null;
  addVersion: (v: Omit<ThumbnailVersion, "id">) => void;
  selectVersion: (id: number) => void;
  setLoading: (loading: boolean) => void;
  startGenerating: () => void;
  setError: (error: string) => void;
  setPendingPrompt: (prompt: string | null) => void;
  setCredits: (credits: number) => void;
  decrementCredits: () => void;
  download: (id?: number) => void;
  clear: () => void;
  clearHistory: () => void;
}

export const useThumbnailStore = create<ThumbnailState>()(
  persist(
    (set, get) => ({
      versions: [],
      selectedVersionId: null,
      loading: false,
      generating: false,
      error: null,
      pendingPrompt: null,
      credits: null,

      addVersion: (versionData) =>
        set((state) => {
          const newId = state.versions.length;
          const version: ThumbnailVersion = { ...versionData, id: newId };
          return {
            versions: [...state.versions, version],
            selectedVersionId: newId,
            loading: false,
            generating: false,
            error: null,
          };
        }),

      selectVersion: (id) => set({ selectedVersionId: id }),

      setLoading: (loading) =>
        set(loading ? { loading } : { loading, generating: false }),

      startGenerating: () => set({ loading: true, generating: true }),

      setError: (error) => set({ error }),

      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),

      setCredits: (credits) => set({ credits }),

      decrementCredits: () =>
        set((state) => ({
          credits:
            state.credits !== null ? Math.max(0, state.credits - 1) : null,
        })),

      download: (id) => {
        const { versions, selectedVersionId } = get();
        const targetId = id ?? selectedVersionId;
        const version = versions.find((v) => v.id === targetId);
        if (!version) return;
        const a = document.createElement("a");
        a.href = `data:${version.mimeType};base64,${version.imageBase64}`;
        a.download = `thumbnail-v${version.id}.png`;
        a.click();
      },

      clear: () => set({ versions: [], selectedVersionId: null, error: null }),

      clearHistory: () => set({ versions: [], selectedVersionId: null }),
    }),
    {
      name: "thumbnail-store",
      partialize: (state) => ({ pendingPrompt: state.pendingPrompt }),
    },
  ),
);
