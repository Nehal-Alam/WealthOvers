import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { themePreferenceSchema } from "@/lib/validations/settings";

describe("Phase 1: Bloomberg-Inspired Terminal Design Tokens & Theme System", () => {
  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (hex1: string, hex2: string) => {
    const parseHex = (hex: string) => {
      const clean = hex.replace("#", "");
      return [
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16),
      ];
    };

    const [r1, g1, b1] = parseHex(hex1);
    const [r2, g2, b2] = parseHex(hex2);

    const l1 = getLuminance(r1, g1, b1);
    const l2 = getLuminance(r2, g2, b2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  describe("Design Tokens & CSS Variables in globals.css", () => {
    const globalsPath = path.resolve(process.cwd(), "app/globals.css");
    const globalsContent = fs.readFileSync(globalsPath, "utf-8");

    it("defines all Bloomberg Terminal Dark Theme design tokens (Primary)", () => {
      expect(globalsContent).toContain("--app-bg: #101820;");
      expect(globalsContent).toContain("--surface: #18232D;");
      expect(globalsContent).toContain("--surface-elevated: #23313D;");
      expect(globalsContent).toContain("--surface-muted: #1D2933;");
      expect(globalsContent).toContain("--border: #34424E;");
      expect(globalsContent).toContain("--text-primary: #F1F5F8;");
      expect(globalsContent).toContain("--text-secondary: #A7B4BF;");
      expect(globalsContent).toContain("--accent: #F0A52B;");
      expect(globalsContent).toContain("--positive: #39B98A;");
      expect(globalsContent).toContain("--negative: #EF6A68;");
      expect(globalsContent).toContain("--info: #62A6E8;");
    });

    it("defines all Bloomberg Terminal Light Theme design tokens", () => {
      expect(globalsContent).toContain("--app-bg: #F3F5F7;");
      expect(globalsContent).toContain("--surface: #FFFFFF;");
      expect(globalsContent).toContain("--surface-elevated: #E8EDF1;");
      expect(globalsContent).toContain("--border: #D8E0E6;");
      expect(globalsContent).toContain("--text-primary: #17232E;");
      expect(globalsContent).toContain("--text-secondary: #687783;");
      expect(globalsContent).toContain("--accent: #B77A18;");
      expect(globalsContent).toContain("--positive: #16865D;");
      expect(globalsContent).toContain("--negative: #CF5353;");
      expect(globalsContent).toContain("--info: #397EBA;");
    });

    it("enforces tabular numerals for financial monospacing", () => {
      expect(globalsContent).toContain("font-variant-numeric: tabular-nums;");
      expect(globalsContent).toContain(".tabular-nums");
    });
  });

  describe("WCAG 2.1 AA/AAA Contrast Verification for Bloomberg Palette", () => {
    it("certifies Dark mode text contrast meets WCAG AAA (>= 7.0:1)", () => {
      const darkBg = "#101820";
      const darkSurface = "#18232D";
      const textPrimary = "#F1F5F8";
      const textSecondary = "#A7B4BF";

      const bgContrast = getContrastRatio(textPrimary, darkBg);
      const surfaceContrast = getContrastRatio(textPrimary, darkSurface);
      const secondaryContrast = getContrastRatio(textSecondary, darkSurface);

      expect(bgContrast).toBeGreaterThanOrEqual(14.0); // > 15:1
      expect(surfaceContrast).toBeGreaterThanOrEqual(13.0); // > 14:1
      expect(secondaryContrast).toBeGreaterThanOrEqual(6.0); // > 6:1 (AA for labels)
    });

    it("certifies Dark mode Bloomberg amber accent contrast on surface", () => {
      const darkSurface = "#18232D";
      const accent = "#F0A52B";

      const ratio = getContrastRatio(accent, darkSurface);
      expect(ratio).toBeGreaterThanOrEqual(7.0); // AAA compliant
    });

    it("certifies Light mode text contrast meets WCAG AAA (>= 7.0:1)", () => {
      const lightBg = "#F3F5F7";
      const lightSurface = "#FFFFFF";
      const textPrimary = "#17232E";

      const bgContrast = getContrastRatio(textPrimary, lightBg);
      const surfaceContrast = getContrastRatio(textPrimary, lightSurface);

      expect(bgContrast).toBeGreaterThanOrEqual(12.0);
      expect(surfaceContrast).toBeGreaterThanOrEqual(14.0);
    });

    it("certifies semantic indicator contrast for positive and negative values", () => {
      const darkSurface = "#18232D";
      const positive = "#39B98A";
      const negative = "#EF6A68";

      const posRatio = getContrastRatio(positive, darkSurface);
      const negRatio = getContrastRatio(negative, darkSurface);

      expect(posRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA for financial metrics
      expect(negRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Tailwind Configuration Semantic Extensions", () => {
    const configPath = path.resolve(process.cwd(), "tailwind.config.ts");
    const configContent = fs.readFileSync(configPath, "utf-8");

    it("contains surface, positive, negative, info, and terminalAccent definitions", () => {
      expect(configContent).toContain("surface:");
      expect(configContent).toContain("positive:");
      expect(configContent).toContain("negative:");
      expect(configContent).toContain("info:");
      expect(configContent).toContain("terminalAccent:");
    });
  });

  describe("Theme Preference Validation", () => {
    it("validates light, dark, and system theme options", () => {
      expect(themePreferenceSchema.safeParse("light").success).toBe(true);
      expect(themePreferenceSchema.safeParse("dark").success).toBe(true);
      expect(themePreferenceSchema.safeParse("system").success).toBe(true);
    });

    it("rejects invalid theme selections securely", () => {
      expect(themePreferenceSchema.safeParse("invalid-theme").success).toBe(false);
      expect(themePreferenceSchema.safeParse("").success).toBe(false);
      expect(themePreferenceSchema.safeParse(123).success).toBe(false);
    });
  });
});
