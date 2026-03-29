import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const visitorScriptSrc = process.env.PLAUSIBLE_SRC;
const visitorScriptDomain = process.env.PLAUSIBLE_DOMAIN;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Openlier",
  description: "Open source YouTube thumbnail generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full dark",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <TooltipProvider>
        {visitorScriptSrc && visitorScriptDomain ? (
          <head>
            <Script
              defer
              data-domain={visitorScriptDomain}
              src={visitorScriptSrc}
              strategy="afterInteractive"
            />
          </head>
        ) : null}
        <body className="min-h-full w-full flex flex-col justify-center items-center">
          {children}
          <Toaster position="top-center" />
        </body>
      </TooltipProvider>
    </html>
  );
}
