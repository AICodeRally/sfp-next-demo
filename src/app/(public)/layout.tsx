'use client';

import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public layout for landing page and marketing pages
 * Minimal chrome - just logo header, no navbar/footer
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        {/* Simple header with logo */}
        <header className="fixed top-0 w-full z-50 bg-transparent">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
                }}
              >
                <span className="text-white font-bold text-sm">SFP</span>
              </div>
              <span
                className="text-2xl font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
                }}
              >
                Founder Model Studio
              </span>
            </Link>
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-all hover:opacity-90"
              style={{
                backgroundImage: 'linear-gradient(90deg, #3b82f6, #2563eb)',
              }}
            >
              Sign In
            </Link>
          </div>
        </header>

        {/* Page content */}
        {children}

        {/* Simple footer */}
        <footer className="py-8 text-center text-sm text-slate-500">
          <span>Powered by </span>
          <span
            className="font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          >
            AICR
          </span>
          <span className="mx-2">•</span>
          <span>Startup Funding Platform</span>
        </footer>
      </div>
    </SessionProvider>
  );
}
