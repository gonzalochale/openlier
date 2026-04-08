"use client";

import { useEffect } from "react";
import { AuthModal } from "@/components/modals/auth-modal";
import { CreditsModal } from "@/components/modals/credits-modal";
import { InfoModal } from "@/components/modals/info-modal";
import { CameoModal } from "@/components/cameo/cameo-modal";
import { useThumbnailStore } from "@/store/use-thumbnail-store";
import { useThumbnailUIStore } from "@/store/use-thumbnail-ui-store";
import { useCameoStore } from "@/store/use-cameo-store";
import { useShallow } from "zustand/react/shallow";
import { authClient } from "@/lib/auth/client";

export function GlobalModals() {
  const { data: session, isPending } = authClient.useSession();
  const setCredits = useThumbnailStore((s) => s.setCredits);
  const hydrateCameo = useCameoStore((s) => s.hydrate);
  const setCameoLoading = useCameoStore((s) => s.setLoading);

  useEffect(() => {
    hydrateCameo();
  }, [hydrateCameo]);

  useEffect(() => {
    if (!isPending) setCameoLoading(false);
  }, [isPending, setCameoLoading]);

  useEffect(() => {
    if (session?.user.credits != null) {
      setCredits(session.user.credits);
    }
  }, [session?.user.credits, setCredits]);

  useEffect(() => {
    const onFocus = async () => {
      const fresh = await authClient.getSession({
        fetchOptions: { cache: "no-store" },
      });
      if (fresh.data?.user.credits != null) {
        setCredits(fresh.data.user.credits);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [setCredits]);
  const {
    authModalOpen,
    closeAuthModal,
    creditsModalOpen,
    closeCreditsModal,
    infoModalOpen,
    closeInfoModal,
    cameoModalOpen,
    closeCameoModal,
  } = useThumbnailUIStore(
    useShallow((s) => ({
      authModalOpen: s.authModalOpen,
      closeAuthModal: s.closeAuthModal,
      creditsModalOpen: s.creditsModalOpen,
      closeCreditsModal: s.closeCreditsModal,
      infoModalOpen: s.infoModalOpen,
      closeInfoModal: s.closeInfoModal,
      cameoModalOpen: s.cameoModalOpen,
      closeCameoModal: s.closeCameoModal,
    })),
  );

  return (
    <>
      <AuthModal
        open={authModalOpen}
        onOpenChange={(o) => !o && closeAuthModal()}
      />
      <CreditsModal
        open={creditsModalOpen}
        onOpenChange={(o) => !o && closeCreditsModal()}
      />
      <InfoModal
        open={infoModalOpen}
        onOpenChange={(o) => !o && closeInfoModal()}
      />
      <CameoModal
        open={cameoModalOpen}
        onOpenChange={(o) => !o && closeCameoModal()}
      />
    </>
  );
}
