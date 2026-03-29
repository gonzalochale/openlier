import { cookies } from "next/headers";
import { SessionsSidebar } from "@/components/sessions/sessions-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PageShell } from "@/components/layout/page-shell";
import { MotionProvider } from "@/components/layout/motion-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <MotionProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <SessionsSidebar />
        <SidebarInset>
          <PageShell>{children}</PageShell>
        </SidebarInset>
      </SidebarProvider>
    </MotionProvider>
  );
}
