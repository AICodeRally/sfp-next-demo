/**
 * Label Component
 *
 * Simple label for form inputs.
 */

import * as React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", ...props }, ref) => (
    <label
      ref={ref}
      className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block ${className}`}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
