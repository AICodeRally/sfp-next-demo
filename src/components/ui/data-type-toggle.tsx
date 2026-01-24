/**
 * Data Type Filter Toggle
 *
 * Three-state toggle for filtering scenarios by data type.
 * States: All | Demo Only | Real Only
 *
 * Usage:
 * const [filter, setFilter] = useState<"all" | "demo" | "client">("all");
 * <DataTypeToggle value={filter} onChange={setFilter} />
 */

"use client";

interface DataTypeToggleProps {
  value: "all" | "demo" | "client";
  onChange: (value: "all" | "demo" | "client") => void;
}

export function DataTypeToggle({ value, onChange }: DataTypeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-input bg-background p-1">
      <button
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "all"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        All Data
      </button>
      <button
        onClick={() => onChange("demo")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "demo"
            ? "bg-gradient-to-r from-orange-500 to-amber-400 text-orange-950"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        Demo Only
      </button>
      <button
        onClick={() => onChange("client")}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === "client"
            ? "bg-gradient-to-r from-emerald-600 to-emerald-400 text-emerald-950"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        }`}
      >
        Real Only
      </button>
    </div>
  );
}
