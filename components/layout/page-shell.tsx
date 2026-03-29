"use client";

import { Suspense } from "react";
import { GeneratePrompt } from "@/components/prompt/generate-prompt";
import { Preview } from "@/components/thumbnail/preview";
import { UserHeader } from "@/components/auth/user-header";
import { PaymentReturnHandler } from "@/components/payments/payment-return-handler";
import { KonamiCode } from "@/components/konami-code";
import { GlobalModals } from "@/components/modals/global-modals";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-360 mx-auto h-svh flex flex-col gap-2 justify-center items-center p-2 pb-48">
      <UserHeader />
      <Preview />
      {children}
      <GeneratePrompt />
      <Suspense>
        <PaymentReturnHandler />
      </Suspense>
      <KonamiCode />
      <GlobalModals />
    </div>
  );
}
