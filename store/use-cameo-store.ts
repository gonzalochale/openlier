import { create } from "zustand";
import { hasLocalCameo } from "@/lib/cameo/local";

interface CameoState {
  availableLocally: boolean;
  loading: boolean;
  hydrate: () => void;
  setAvailableLocally: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useCameoStore = create<CameoState>()((set) => ({
  availableLocally: false,
  loading: true,
  hydrate: () =>
    set({
      availableLocally: hasLocalCameo(),
      loading: false,
    }),
  setAvailableLocally: (availableLocally) => set({ availableLocally }),
  setLoading: (loading) => set({ loading }),
}));
