import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Lumo English — personal language coach",
  description: "A private, offline-first English learning app with lessons, spaced repetition, speech practice and a conversation tutor.",
};

export const viewport: Viewport = {
  themeColor: "#F7F5EF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>
          <MotionConfig reducedMotion="user">
            <Shell>{children}</Shell>
          </MotionConfig>
        </AppProvider>
      </body>
    </html>
  );
}
