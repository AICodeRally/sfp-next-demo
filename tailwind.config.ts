import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      colors: {
        // Original SFP color scales (preserved)
        ink: {
          50: "#f6f7f9",
          100: "#e9ebf1",
          200: "#c9cdda",
          300: "#aab0c1",
          400: "#71788d",
          500: "#3f4659",
          600: "#2f3443",
          700: "#242834",
          800: "#1a1d26",
          900: "#12141c"
        },
        tide: {
          50: "#eef6ff",
          100: "#d8e8ff",
          200: "#b1d1ff",
          300: "#7eb3ff",
          400: "#4a8fff",
          500: "#2a6fff",
          600: "#1d54e6",
          700: "#1a41b3",
          800: "#183787",
          900: "#142a66"
        },
        sun: {
          50: "#fff6e6",
          100: "#ffe7bf",
          200: "#ffd48c",
          300: "#ffbb4d",
          400: "#ff9a1f",
          500: "#f37707",
          600: "#cc5a03",
          700: "#9b4408",
          800: "#7b360c",
          900: "#652d0f"
        },
        // CSS variable-based semantic colors
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        border: "var(--color-border)",
        background: "var(--color-background)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
      },
      backgroundColor: {
        "success-bg": "var(--color-success-bg)",
        "warning-bg": "var(--color-warning-bg)",
        "error-bg": "var(--color-error-bg)",
        "info-bg": "var(--color-info-bg)",
        "accent-bg": "var(--color-accent-bg)",
        "glass": "var(--surface-glass)",
      },
      borderColor: {
        "success-border": "var(--color-success-border)",
        "warning-border": "var(--color-warning-border)",
        "error-border": "var(--color-error-border)",
        "info-border": "var(--color-info-border)",
        "accent-border": "var(--color-accent-border)",
        "glass": "var(--surface-glass-border)",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(15, 23, 42, 0.12)",
        glow: "0 0 0 1px rgba(42, 111, 255, 0.2), 0 12px 20px rgba(42, 111, 255, 0.18)",
        "glass": "0 10px 15px -3px rgba(14, 165, 233, 0.2)",
      },
      backdropBlur: {
        glass: "8px",
      }
    }
  },
  plugins: []
};

export default config;
