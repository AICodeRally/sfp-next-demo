'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PersonIcon, GearIcon, ExitIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info from session, fallback to defaults
  const user = {
    name: session?.user?.name || 'Guest',
    role: (session?.user as any)?.role || 'User',
    email: session?.user?.email || ''
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-[color:var(--color-surface)] shadow-sm border-b-4 border-transparent"
      style={{
        borderImage: 'linear-gradient(to right, var(--sfp-gradient-start), var(--sfp-gradient-mid2), var(--sfp-gradient-end)) 1'
      }}
    >
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: SFP Branding */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-4">
              {/* SFP Text Logo (gradient) */}
              <div className="flex flex-col items-center">
                <span className="gradient-text text-3xl font-bold tracking-tight">
                  SFP
                </span>
                <span className="text-[8px] text-[color:var(--color-muted)] uppercase tracking-widest -mt-1">
                  Financial Planning
                </span>
              </div>

              {/* Module Info */}
              <div className="border-l border-[color:var(--color-border)] pl-6">
                <h1 className="gradient-text text-lg font-bold">
                  Startup Financial Planning
                </h1>
                <p className="text-xs text-[color:var(--color-muted)] mt-0.5">
                  Scenario-based modeling for founders
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Theme Toggle + User Dropdown */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-[color:var(--color-border)]">|</span>

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[color:var(--color-surface-alt)] transition-colors"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">{user.name}</p>
                  <p className="text-xs text-[color:var(--color-muted)]">{user.role}</p>
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, var(--sfp-gradient-start), var(--sfp-gradient-mid2), var(--sfp-gradient-end))',
                  }}
                >
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-[color:var(--color-muted)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[color:var(--color-surface)] rounded-lg shadow-xl border border-[color:var(--color-border)] py-2 z-50">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-[color:var(--color-border)]">
                    <p className="text-sm font-semibold text-[color:var(--color-foreground)]">{user.name}</p>
                    <p className="text-[10px] text-[color:var(--color-muted)] truncate">{user.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/settings/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-alt)] transition-colors"
                    >
                      <PersonIcon className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-alt)] transition-colors"
                    >
                      <GearIcon className="w-4 h-4" />
                      Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-[color:var(--color-border)] pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[color:var(--color-error)] hover:bg-[color:var(--color-error-bg)] transition-colors"
                    >
                      <ExitIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
