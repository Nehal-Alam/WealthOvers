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
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          interactive: "hsl(var(--border-interactive))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
          sunken: "hsl(var(--card-sunken))",
        },
        brand: {
          indigo: "#4F46E5",
          emerald: "#10B981",
          coral: "#F87171",
          violet: "#8B5CF6",
          amber: "#F59E0B",
        },
        income: {
          DEFAULT: "#10B981",
          foreground: "#ffffff",
          muted: "hsl(160 84% 39% / 0.1)",
          dark: "#059669",
        },
        expense: {
          DEFAULT: "#F87171",
          foreground: "#ffffff",
          muted: "hsl(0 91% 71% / 0.1)",
          dark: "#DC2626",
        },
        investment: {
          DEFAULT: "#8B5CF6",
          foreground: "#ffffff",
          muted: "hsl(258 90% 66% / 0.1)",
          dark: "#7C3AED",
        },
        transfer: {
          DEFAULT: "#4F46E5",
          foreground: "#ffffff",
          muted: "hsl(243 75% 59% / 0.1)",
          dark: "#4338CA",
        },
        amber: {
          DEFAULT: "#F59E0B",
          foreground: "#ffffff",
          muted: "hsl(38 92% 50% / 0.1)",
          dark: "#D97706",
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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

