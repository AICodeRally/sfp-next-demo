'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * SFP Landing Page
 * Startup Funding Platform - Financial modeling for founders
 */
export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{
                backgroundImage: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
              }}
            >
              <span className="text-white font-bold text-3xl">SFP</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Founder Model
            <span
              className="bg-clip-text text-transparent ml-3"
              style={{
                backgroundImage: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
              }}
            >
              Studio
            </span>
          </h1>
          <p className="text-xl text-blue-200 mb-4">
            Board-Ready Financial Scenarios
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Run sophisticated financial models with full visibility into revenue, cash, and margin drivers.
            Generate investor-ready projections in minutes.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-blue-500/20">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Financial Modeling</h3>
              <p className="text-sm text-slate-400">
                Revenue projections, cash flow analysis, and P&L statements with AI-powered assumptions.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-blue-500/20">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Scenario Analysis</h3>
              <p className="text-sm text-slate-400">
                Compare multiple scenarios side-by-side. Test assumptions and see instant impacts.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-blue-500/20">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Board Decks</h3>
              <p className="text-sm text-slate-400">
                Generate investor-ready presentations with charts, narratives, and key metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Preview */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Key Metrics at a Glance
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'ARR', desc: 'Annual Recurring Revenue' },
                { label: 'GM%', desc: 'Blended Gross Margin' },
                { label: 'Runway', desc: 'Cash Runway Months' },
                { label: 'Net Income', desc: 'Monthly Profitability' },
              ].map(({ label, desc }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">{label}</div>
                  <div className="text-xs text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white rounded-xl shadow-lg transition-all hover:scale-105"
            style={{
              backgroundImage: 'linear-gradient(90deg, #3b82f6, #2563eb)',
            }}
          >
            Start Modeling
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-sm text-slate-500 mt-4">
            Demo mode: Enter any email to explore
          </p>
        </div>
      </section>
    </div>
  );
}
