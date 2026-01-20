import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import AppShell from "@/components/layout/app-shell";
import { Providers } from "@/components/Providers";
import { CommandPalette } from "@/components/CommandPalette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Startup Financial Planning (SFP)",
  description: "Scenario-based modeling for startup financial planning."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppShell>{children}</AppShell>
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
