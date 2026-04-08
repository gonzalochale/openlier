import { create } from "zustand";

interface ThumbnailUIState {
  authModalOpen: boolean;
  creditsModalOpen: boolean;
  infoModalOpen: boolean;
  cameoModalOpen: boolean;
  promptFocusTick: number;

  openAuthModal: () => void;
  closeAuthModal: () => void;
  openCreditsModal: () => void;
  closeCreditsModal: () => void;
  openInfoModal: () => void;
  closeInfoModal: () => void;
  openCameoModal: () => void;
  closeCameoModal: () => void;
  focusPrompt: () => void;
}

export const useThumbnailUIStore = create<ThumbnailUIState>()((set) => ({
  authModalOpen: false,
  creditsModalOpen: false,
  infoModalOpen: false,
  cameoModalOpen: false,
  promptFocusTick: 0,

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),
  openCreditsModal: () => set({ creditsModalOpen: true }),
  closeCreditsModal: () => set({ creditsModalOpen: false }),
  openInfoModal: () => set({ infoModalOpen: true }),
  closeInfoModal: () => set({ infoModalOpen: false }),
  openCameoModal: () => set({ cameoModalOpen: true }),
  closeCameoModal: () => set({ cameoModalOpen: false }),
  focusPrompt: () => set((s) => ({ promptFocusTick: s.promptFocusTick + 1 })),
}));
