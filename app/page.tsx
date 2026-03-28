import { cookies } from "next/headers";
import { Preview } from "@/components/thumbnail/preview";
import { GeneratePrompt } from "@/components/prompt/generate-prompt";
import { UserHeader } from "@/components/auth/user-header";
import { PaymentReturnHandler } from "@/components/payments/payment-return-handler";
import { KonamiCode } from "@/components/konami-code";
import { SessionsSidebar } from "@/components/sessions/sessions-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalModals } from "@/components/modals/global-modals";

export default async function Home() {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <SessionsSidebar />
      <SidebarInset>
        <div className="relative w-full max-w-360 mx-auto h-svh flex flex-col gap-2 justify-center items-center p-2 pb-48">
          <UserHeader />
          <Preview />
          <GeneratePrompt />
          <PaymentReturnHandler />
          <KonamiCode />
          <GlobalModals />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
