import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import AppShell from "@/components/layout/app-shell";
import { Providers } from "@/components/Providers";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingRedirect } from "@/components/onboarding/onboarding-redirect";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SFP - Startup Financial Planning",
  description: "Scenario-based modeling for startup financial planning."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} font-sans`}>
        <Providers>
          <OnboardingRedirect />
          <AppShell>{children}</AppShell>
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
