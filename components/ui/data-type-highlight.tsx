/**
 * Data Type Highlight Wrapper Components
 *
 * Wraps content with colored left border and subtle background to indicate data type.
 * Useful for highlighting demo/template/client scenarios in lists.
 *
 * Usage:
 * <DataTypeHighlight dataType={scenario.dataType}>
 *   <Card>{content}</Card>
 * </DataTypeHighlight>
 */

import type { DataType } from "@/lib/sfp-types";
import type { ReactNode } from "react";

interface HighlightProps {
  children: ReactNode;
  className?: string;
}

export function DemoHighlight({ children, className = "" }: HighlightProps) {
  return (
    <div className={`border-l-4 border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 ${className}`}>
      {children}
    </div>
  );
}

export function TemplateHighlight({ children, className = "" }: HighlightProps) {
  return (
    <div className={`border-l-4 border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 ${className}`}>
      {children}
    </div>
  );
}

export function ClientHighlight({ children, className = "" }: HighlightProps) {
  return (
    <div className={`border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ${className}`}>
      {children}
    </div>
  );
}

interface DataTypeHighlightProps extends HighlightProps {
  dataType: DataType;
}

/**
 * Smart wrapper that auto-selects highlight based on dataType
 */
export function DataTypeHighlight({ dataType, children, className }: DataTypeHighlightProps) {
  switch (dataType) {
    case "demo":
      return <DemoHighlight className={className}>{children}</DemoHighlight>;
    case "template":
      return <TemplateHighlight className={className}>{children}</TemplateHighlight>;
    case "client":
      return <ClientHighlight className={className}>{children}</ClientHighlight>;
    default:
      // No highlight for unknown types
      return <>{children}</>;
  }
}
