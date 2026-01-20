'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScenarios } from '@/lib/sfp-store';
import { formatDateTime } from '@/lib/format';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const scenarios = useScenarios();

  // Keyboard shortcut to open (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        setSelectedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter scenarios based on search
  const filteredScenarios = scenarios.filter((scenario) =>
    scenario.name.toLowerCase().includes(search.toLowerCase())
  );

  // Commands (static actions)
  const commands = [
    {
      id: 'home',
      label: 'Go to Overview',
      icon: '🏠',
      action: () => router.push('/'),
      group: 'Navigate'
    },
    {
      id: 'scenarios',
      label: 'View All Scenarios',
      icon: '📋',
      action: () => router.push('/scenarios'),
      group: 'Navigate'
    },
    {
      id: 'create',
      label: 'Create New Scenario',
      icon: '➕',
      action: () => {
        const { createScenario } = require('@/lib/sfp-store');
        const scenario = createScenario(`Scenario ${scenarios.length + 1}`);
        if (scenario) router.push(`/scenarios/${scenario.id}/settings`);
      },
      group: 'Actions'
    }
  ];

  // Filter commands
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  // Combine commands + scenarios for navigation
  const allItems = [
    ...filteredCommands,
    ...filteredScenarios.map((scenario) => ({
      id: scenario.id,
      label: scenario.name,
      icon: '📊',
      action: () => router.push(`/scenarios/${scenario.id}/settings`),
      group: 'Scenarios',
      meta: formatDateTime(scenario.updatedAt)
    }))
  ];

  // Arrow key navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault();
        allItems[selectedIndex].action();
        setIsOpen(false);
        setSearch('');
        setSelectedIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyNav);
    return () => document.removeEventListener('keydown', handleKeyNav);
  }, [isOpen, allItems, selectedIndex, router]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setSearch('');
          setSelectedIndex(0);
        }}
      />

      {/* Command Palette Modal */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2">
        <div className="glass-card mx-4 overflow-hidden shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="text-xl">🔍</span>
            <input
              type="text"
              placeholder="Search scenarios or commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-muted outline-none"
              autoFocus
            />
            <kbd className="rounded bg-surface-alt px-2 py-1 text-xs text-muted">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {allItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">
                No results found for "{search}"
              </div>
            ) : (
              <div className="py-2">
                {/* Group items */}
                {['Navigate', 'Actions', 'Scenarios'].map((group) => {
                  const groupItems = allItems.filter((item) => item.group === group);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={group} className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {group}
                      </div>
                      {groupItems.map((item, index) => {
                        const globalIndex = allItems.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              item.action();
                              setIsOpen(false);
                              setSearch('');
                              setSelectedIndex(0);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2 text-left transition-colors ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'text-foreground hover:bg-surface-alt'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{item.icon}</span>
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            {item.meta && (
                              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                                {item.meta}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted">
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-surface-alt px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded bg-surface-alt px-1.5 py-0.5">↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-surface-alt px-1.5 py-0.5">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded bg-surface-alt px-1.5 py-0.5">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
