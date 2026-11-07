import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: {
          DEFAULT: "hsl(var(--input))",
          interactive: "hsl(var(--border-interactive))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          soft: "hsl(var(--primary-soft))",
        },
        surface: {
          DEFAULT: "hsl(var(--card))",
          secondary: "hsl(var(--card-secondary))",
          elevated: "hsl(var(--card-elevated))",
          muted: "hsl(var(--muted))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--ring))",
          foreground: "hsl(var(--primary-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
          secondary: "hsl(var(--card-secondary))",
          sunken: "hsl(var(--card-sunken))",
        },
        // Bloomberg Financial Terminal Semantics
        positive: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success) / 0.15)",
        },
        negative: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          muted: "hsl(var(--danger) / 0.15)",
        },
        info: {
          DEFAULT: "hsl(210 75% 64.7%)",
          foreground: "hsl(210 33% 9.4%)",
          muted: "hsl(210 75% 64.7% / 0.15)",
        },
        terminalAccent: {
          DEFAULT: "#F0A52B",
          gold: "#B77A18",
        },
        // Mobile-First Dynamic Theme System (Light & Dark modes)
        mobile: {
          bg: "var(--mobile-bg)",
          surface: "var(--mobile-surface)",
          secondary: "var(--mobile-surface-secondary)",
          elevated: "var(--mobile-surface-elevated)",
          primary: "var(--mobile-text-primary)",
          secondaryText: "var(--mobile-text-secondary)",
          border: "var(--mobile-border)",
          accent: "var(--mobile-accent)",
          blue: "var(--mobile-blue)",
          income: "var(--mobile-income)",
          expense: "var(--mobile-expense)",
          warning: "var(--mobile-warning)",
          rent: "var(--mobile-rent)",
          investment: "var(--mobile-investment)",
        },
        // Backward-compatible Brand & Action Colors
        brand: {
          forest: "#244B3C",
          sage: "#8BA58C",
          terracotta: "#C77A65",
          amber: "#F0A52B",
          ivory: "#F7F7F0",
          indigo: "#101820",
          emerald: "#39B98A",
          coral: "#EF6A68",
          violet: "#62A6E8",
        },
        income: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success) / 0.15)",
        },
        expense: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          muted: "hsl(var(--danger) / 0.15)",
        },
        investment: {
          DEFAULT: "hsl(var(--ring))",
          foreground: "hsl(var(--primary-foreground))",
          muted: "hsl(var(--ring) / 0.15)",
        },
        transfer: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          muted: "hsl(var(--primary) / 0.15)",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.15s ease-out",
        "accordion-up": "accordion-up 0.15s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
