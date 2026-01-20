'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('email', {
        email,
        callbackUrl,
        redirect: true,
      });

      if (result?.error) {
        alert('Sign in failed. Please check your email and try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="theme-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="gradient-text text-4xl font-bold mb-2">SFP</h1>
            <p className="text-sm text-[color:var(--color-muted)] uppercase tracking-widest">
              Financial Planning
            </p>
            <h2 className="text-xl font-semibold text-[color:var(--color-foreground)] mt-6">
              Sign in to continue
            </h2>
          </div>

          {/* Sign in form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[color:var(--color-foreground)] mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] transition-all"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo notice */}
          <div className="mt-6 p-4 rounded-lg bg-[color:var(--color-info-bg)] border border-[color:var(--color-info-border)]">
            <p className="text-xs text-[color:var(--color-muted)] text-center">
              <strong>Demo Mode:</strong> Enter any valid email address to sign in.
              No password required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
