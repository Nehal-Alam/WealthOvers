import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { themePreferenceSchema } from "@/lib/validations/settings";

describe("Phase 1: Design Tokens & Theme System (Leftovers Aesthetic)", () => {
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

    it("defines all Leftovers Light Theme design tokens", () => {
      expect(globalsContent).toContain("--background: 60 30% 95.5%;"); // #F7F7F0
      expect(globalsContent).toContain("--foreground: 140 7% 17.3%;"); // #292F2B
      expect(globalsContent).toContain("--primary: 157 35% 21.8%;"); // #244B3C
      expect(globalsContent).toContain("--primary-soft: 105 19% 87.5%;"); // #DCE5D9
      expect(globalsContent).toContain("--accent: 122 13% 59.6%;"); // #8BA58C
      expect(globalsContent).toContain("--border: 80 16% 88.8%;"); // #E4E7DE
      expect(globalsContent).toContain("--success: 149 38% 36.3%;"); // #39805B
      expect(globalsContent).toContain("--danger: 13 47% 58.8%;"); // #C77A65
      expect(globalsContent).toContain("--warning: 36 51% 52.4%;"); // #C39148
    });

    it("defines all Leftovers Dark Theme design tokens", () => {
      expect(globalsContent).toContain("--background: 146 14% 9.6%;"); // #151C18
      expect(globalsContent).toContain("--foreground: 87 27% 93.5%;"); // #EFF3EA
      expect(globalsContent).toContain("--card: 142 16% 13.5%;"); // #1D2821
      expect(globalsContent).toContain("--card-secondary: 139 18% 17.6%;"); // #25352A
      expect(globalsContent).toContain("--card-elevated: 139 16% 20%;"); // #2B3B30
      expect(globalsContent).toContain("--primary: 124 18% 66.7%;"); // #9BB99D
      expect(globalsContent).toContain("--primary-soft: 140 18% 23.3%;"); // #314638
      expect(globalsContent).toContain("--border: 139 13% 23.5%;"); // #344439
      expect(globalsContent).toContain("--success: 133 30% 63.1%;"); // #85BD91
      expect(globalsContent).toContain("--danger: 12 62% 67.6%;"); // #E08D79
      expect(globalsContent).toContain("--warning: 39 56% 63.1%;"); // #D6B16C
    });

    it("provides explicit hex variables for inline canvas and SVG chart rendering", () => {
      expect(globalsContent).toContain("--color-background: #F7F7F0;");
      expect(globalsContent).toContain("--color-surface: #FFFFFF;");
      expect(globalsContent).toContain("--color-primary: #244B3C;");
      expect(globalsContent).toContain("--color-background: #151C18;");
      expect(globalsContent).toContain("--color-primary: #9BB99D;");
    });
  });

  describe("WCAG 2.1 AA/AAA Contrast Verification for Leftovers Palette", () => {
    it("certifies Light mode text contrast meets WCAG AAA (>= 7.0:1)", () => {
      const bg = "#F7F7F0";
      const card = "#FFFFFF";
      const textPrimary = "#292F2B";

      const bgContrast = getContrastRatio(textPrimary, bg);
      const cardContrast = getContrastRatio(textPrimary, card);

      expect(bgContrast).toBeGreaterThanOrEqual(12.0); // 12.7:1
      expect(cardContrast).toBeGreaterThanOrEqual(13.0); // 13.6:1
    });

    it("certifies Light mode brand button contrast meets WCAG AAA (>= 7.0:1)", () => {
      const primaryBrand = "#244B3C";
      const whiteText = "#FFFFFF";

      const ratio = getContrastRatio(primaryBrand, whiteText);
      expect(ratio).toBeGreaterThanOrEqual(9.0); // 9.78:1
    });

    it("certifies Dark mode text contrast meets WCAG AAA (>= 7.0:1)", () => {
      const darkBg = "#151C18";
      const darkCard = "#1D2821";
      const textPrimary = "#EFF3EA";
      const textSecondary = "#A9B5A8";

      const bgContrast = getContrastRatio(textPrimary, darkBg);
      const cardContrast = getContrastRatio(textPrimary, darkCard);
      const secondaryContrast = getContrastRatio(textSecondary, darkCard);

      expect(bgContrast).toBeGreaterThanOrEqual(15.0); // 15.4:1
      expect(cardContrast).toBeGreaterThanOrEqual(13.0); // 13.5:1
      expect(secondaryContrast).toBeGreaterThanOrEqual(7.0); // 7.16:1
    });

    it("certifies Dark mode brand button contrast meets WCAG AAA (>= 7.0:1)", () => {
      const darkBrand = "#9BB99D";
      const pineNightText = "#151C18";

      const ratio = getContrastRatio(darkBrand, pineNightText);
      expect(ratio).toBeGreaterThanOrEqual(8.0); // 8.11:1
    });
  });

  describe("Tailwind Configuration Semantic Extensions", () => {
    const configPath = path.resolve(process.cwd(), "tailwind.config.ts");
    const configContent = fs.readFileSync(configPath, "utf-8");

    it("contains surface, income, expense, transfer, and brand definitions", () => {
      expect(configContent).toContain("surface:");
      expect(configContent).toContain("income:");
      expect(configContent).toContain("expense:");
      expect(configContent).toContain("transfer:");
      expect(configContent).toContain("forest: \"#244B3C\"");
      expect(configContent).toContain("ivory: \"#F7F7F0\"");
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
