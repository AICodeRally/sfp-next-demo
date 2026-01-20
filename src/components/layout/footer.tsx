'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 bg-[color:var(--color-surface)] shadow-sm border-t-4 border-transparent"
      style={{
        borderImage: 'linear-gradient(to right, var(--sfp-gradient-start), var(--sfp-gradient-mid2), var(--sfp-gradient-end)) 1'
      }}
    >
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="space-y-2">
              {/* Quick Links */}
              <div className="flex items-center justify-center gap-6 mb-2">
                <Link
                  href="/"
                  className="text-base hover:underline transition-all font-bold px-3 py-1 rounded hover:bg-[color:var(--surface-glass)] text-[color:var(--color-primary)]"
                >
                  Overview
                </Link>
                <Link
                  href="/scenarios"
                  className="text-base hover:underline transition-all font-bold px-3 py-1 rounded hover:bg-[color:var(--surface-glass)] text-[color:var(--color-primary)]"
                >
                  Scenarios
                </Link>
              </div>

              {/* Copyright & Legal */}
              <div className="flex items-center justify-center gap-6 text-xs text-[color:var(--color-muted)]">
                <span>© 2026 SFP Demo</span>
                <span>•</span>
                <span>v0.1 (Local data only)</span>
              </div>

              {/* Branding */}
              <div className="text-xs">
                <span className="text-[color:var(--color-muted)]">Powered by </span>
                <span className="gradient-text font-bold">AICR</span>
                <span className="text-[color:var(--color-muted)]"> • Part of the AI Code Rally platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
