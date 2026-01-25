"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16 pb-20 px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
