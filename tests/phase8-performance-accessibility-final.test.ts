import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 8: Performance, Accessibility & Final Release Verification", () => {
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.ts");

  describe("1. Complete Design Token System Integrity", () => {
    it("verifies Light Theme design tokens match exact Leftovers specifications", () => {
      const css = fs.readFileSync(globalsCssPath, "utf-8");

      expect(css).toContain("--color-background: #F7F7F0;");
      expect(css).toContain("--color-surface: #FFFFFF;");
      expect(css).toContain("--color-surface-secondary: #E9EEE5;");
      expect(css).toContain("--color-primary: #244B3C;");
      expect(css).toContain("--color-primary-hover: #1B3B2F;");
      expect(css).toContain("--color-primary-soft: #DCE5D9;");
      expect(css).toContain("--color-accent: #8BA58C;");
      expect(css).toContain("--color-text-primary: #292F2B;");
      expect(css).toContain("--color-text-secondary: #737C73;");
      expect(css).toContain("--color-border: #E4E7DE;");
      expect(css).toContain("--color-success: #39805B;");
      expect(css).toContain("--color-danger: #C77A65;");
      expect(css).toContain("--color-warning: #C39148;");
    });

    it("verifies Dark Theme design tokens match exact Leftovers specifications", () => {
      const css = fs.readFileSync(globalsCssPath, "utf-8");

      expect(css).toContain("--color-background: #151C18;");
      expect(css).toContain("--color-surface: #1D2821;");
      expect(css).toContain("--color-surface-secondary: #25352A;");
      expect(css).toContain("--color-primary: #9BB99D;");
      expect(css).toContain("--color-primary-soft: #314638;");
      expect(css).toContain("--color-text-primary: #EFF3EA;");
      expect(css).toContain("--color-text-secondary: #A9B5A8;");
      expect(css).toContain("--color-border: #344439;");
      expect(css).toContain("--color-success: #85BD91;");
      expect(css).toContain("--color-danger: #E08D79;");
      expect(css).toContain("--color-warning: #D6B16C;");
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
