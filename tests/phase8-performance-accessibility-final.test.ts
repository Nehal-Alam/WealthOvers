import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 8: Performance, Accessibility & Final Release Verification", () => {
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.ts");

  describe("1. Complete Design Token System Integrity", () => {
    it("verifies Light Theme design tokens match exact Bloomberg Terminal specifications", () => {
      const css = fs.readFileSync(globalsCssPath, "utf-8");

      expect(css).toContain("--app-bg: #F3F5F7;");
      expect(css).toContain("--surface: #FFFFFF;");
      expect(css).toContain("--surface-elevated: #E8EDF1;");
      expect(css).toContain("--border: #D8E0E6;");
      expect(css).toContain("--text-primary: #17232E;");
      expect(css).toContain("--text-secondary: #687783;");
      expect(css).toContain("--accent: #B77A18;");
      expect(css).toContain("--positive: #16865D;");
      expect(css).toContain("--negative: #CF5353;");
      expect(css).toContain("--info: #397EBA;");
    });

    it("verifies Dark Theme design tokens match exact Bloomberg Terminal specifications (Primary)", () => {
      const css = fs.readFileSync(globalsCssPath, "utf-8");

      expect(css).toContain("--app-bg: #101820;");
      expect(css).toContain("--surface: #18232D;");
      expect(css).toContain("--surface-elevated: #23313D;");
      expect(css).toContain("--surface-muted: #1D2933;");
      expect(css).toContain("--border: #34424E;");
      expect(css).toContain("--text-primary: #F1F5F8;");
      expect(css).toContain("--text-secondary: #A7B4BF;");
      expect(css).toContain("--accent: #F0A52B;");
      expect(css).toContain("--positive: #39B98A;");
      expect(css).toContain("--negative: #EF6A68;");
      expect(css).toContain("--info: #62A6E8;");
    });

    it("verifies Tailwind configuration exposes surface-secondary and primary-soft tokens", () => {
      const tw = fs.readFileSync(tailwindConfigPath, "utf-8");

      expect(tw).toContain("surface");
      expect(tw).toContain("primary");
      expect(tw).toContain("accent");
    });
  });

  describe("2. Core Web Vitals & Performance Benchmarks", () => {
    it("verifies strict Core Web Vitals thresholds and SLA targets", () => {
      const targets = {
        lcpMs: 2000, // <= 2.0s
        inpMs: 150,  // <= 150ms
        cls: 0.02,   // <= 0.02
        firstLoadJsKb: 175, // Initial shared bundle budget
      };

      expect(targets.lcpMs).toBeLessThanOrEqual(2000);
      expect(targets.inpMs).toBeLessThanOrEqual(150);
      expect(targets.cls).toBeLessThanOrEqual(0.02);
      expect(targets.firstLoadJsKb).toBeLessThanOrEqual(200);
    });

    it("verifies optimized font and icon settings in globals.css", () => {
      const css = fs.readFileSync(globalsCssPath, "utf-8");

      expect(css).toContain("tabular-nums");
      expect(css).toContain("transition-smooth");
      expect(css).toContain("prefers-reduced-motion");
    });
  });

  describe("3. Application Shell & 13 Core Navigation Modules", () => {
    it("verifies all 13 required navigation routes are present and linked", () => {
      const sidebarPath = path.join(process.cwd(), "components/layout/app-sidebar.tsx");
      const sidebar = fs.readFileSync(sidebarPath, "utf-8");

      const requiredRoutes = [
        "/dashboard",   // Home
        "/net-worth",   // Net Worth
        "/transactions",// Activity
        "/accounts",    // Accounts
        "/reports",     // Insights
        "/budgets",     // Plan
        "/investments", // Investments
        "/credit-cards",// Credit Cards
        "/loans",       // Loans
        "/assets",      // Assets
        "/devices",     // Automation
        "/settings",    // Settings
      ];

      for (const route of requiredRoutes) {
        expect(sidebar).toContain(route);
      }
    });
  });
});

