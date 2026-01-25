/**
 * Data Type Badge Components
 *
 * Visual indicators for demo/template/client data classification.
 * Follows SPARCC pattern with gradient backgrounds and clear color coding.
 *
 * Color Palette:
 * - Demo: Orange gradient (#FF6B35 → #F7931E → #FDB813)
 * - Template: Teal gradient (#0D9488 → #14B8A6 → #22D3EE)
 * - Client/Live: Green gradient (#059669 → #10B981 → #34D399)
 */

import type { DataType } from "@/lib/sfp-types";

interface BadgeProps {
  className?: string;
}

export function DemoBadge({ className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase
        bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400
        text-orange-950 dark:text-orange-100 ${className}`}
    >
      Demo
    </span>
  );
}

export function TemplateBadge({ className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase
        bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-400
        text-teal-950 dark:text-teal-100 ${className}`}
    >
      Template
    </span>
  );
}

export function ClientBadge({ className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase
        bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400
        text-emerald-950 dark:text-emerald-100 ${className}`}
    >
      Live
    </span>
  );
}

interface DataTypeBadgeProps extends BadgeProps {
  dataType: DataType;
}

/**
 * Smart wrapper that auto-selects badge based on dataType
 */
export function DataTypeBadge({ dataType, className }: DataTypeBadgeProps) {
  switch (dataType) {
    case "demo":
      return <DemoBadge className={className} />;
    case "template":
      return <TemplateBadge className={className} />;
    case "client":
      return <ClientBadge className={className} />;
    default:
      return null;
  }
}
