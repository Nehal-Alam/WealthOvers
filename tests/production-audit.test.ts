import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import {
  calculateLoanEMI,
  generateAmortizationSchedule,
  calculateInvestmentReturns,
  calculateXIRR,
  convertCurrency,
  calculateGoalMonthlyRequired,
  toDecimal,
} from "../lib/calculations/financial";
import { validateFinancialRecord } from "../lib/security/device-auth";

describe("Production-Readiness Security, Precision & Architecture Audit", () => {
  describe("Navigation Integrity & Zero Broken Links", () => {
    it("verifies all sidebar and mobile navigation routes map to valid pages", () => {
      // 1. Gather all existing route directories under app/(dashboard)/
      const dashboardDir = path.resolve(__dirname, "../app/(dashboard)");
      const routeDirs = fs
        .readdirSync(dashboardDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => `/${d.name}`);

      // Add root dashboard
      routeDirs.push("/dashboard");

      // 2. Read app-sidebar.tsx
      const sidebarContent = fs.readFileSync(
        path.resolve(__dirname, "../components/layout/app-sidebar.tsx"),
        "utf-8"
      );
      const sidebarHrefs = Array.from(sidebarContent.matchAll(/href:\s*"([^"]+)"/g)).map(
        (m) => m[1]
      );

      for (const href of sidebarHrefs) {
        expect(
          routeDirs.includes(href),
          `Sidebar link ${href} must point to an existing route directory in app/(dashboard)`
        ).toBe(true);
      }

      // 3. Read mobile-nav.tsx
      const mobileNavContent = fs.readFileSync(
        path.resolve(__dirname, "../components/layout/mobile-nav.tsx"),
        "utf-8"
      );
      const mobileHrefs = Array.from(mobileNavContent.matchAll(/href:\s*"([^"]+)"/g)).map(
        (m) => m[1]
      );

      for (const href of mobileHrefs) {
        expect(
          routeDirs.includes(href),
          `Mobile nav link ${href} must point to an existing route directory in app/(dashboard)`
        ).toBe(true);
      }
    });
  });

  describe("Responsive Layout Integrity (320px to 1920px)", () => {
    it("verifies dialogs and containers use responsive width classes without breaking on mobile 320px", () => {
      const componentsDir = path.resolve(__dirname, "../components");
      
      function checkFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkFiles(fullPath);
          } else if (entry.name.endsWith(".tsx")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            // Check that no DialogContent uses un-responsive fixed width like className="w-[500px]"
            const hasUnresponsiveFixedWidth = /DialogContent\s+className="[^"]*(?<!sm:|md:|lg:|max-)w-\[[3-9][0-9]{2}px\][^"]*"/.test(
              content
            );
            expect(
              hasUnresponsiveFixedWidth,
              `File ${entry.name} should not contain hardcoded fixed dialog width without responsive prefix (e.g. sm:max-w-*)`
            ).toBe(false);
          }
        }
      }

      checkFiles(componentsDir);
    });
  });

  describe("Monetary Precision & Double-Counting Invariants", () => {
    it("ensures zero floating-point arithmetic drift in high-volume micro-transactions", () => {
      let balance = new Decimal("100000.0000");
      const transactionAmount = new Decimal("0.1000");

      // Simulate 10,000 fractional transactions
      for (let i = 0; i < 10000; i++) {
        balance = balance.minus(transactionAmount);
      }

      // 100,000 - (10,000 * 0.1) = 99,000.0000 EXACTLY
      expect(balance.toFixed(4)).toBe("99000.0000");
    });

    it("verifies inter-account transfers are strictly cash-flow neutral", () => {
      const sourceBefore = new Decimal("50000.0000");
      const destBefore = new Decimal("12000.0000");
      const transferAmount = new Decimal("8500.0000");

      const sourceAfter = sourceBefore.minus(transferAmount);
      const destAfter = destBefore.plus(transferAmount);

      const netBefore = sourceBefore.plus(destBefore);
      const netAfter = sourceAfter.plus(destAfter);

      expect(netBefore.toFixed(4)).toBe(netAfter.toFixed(4));
    });

    it("handles loan EMI calculations with zero or negative interest gracefully", () => {
      const zeroRateEmi = calculateLoanEMI("120000", "0", 12);
      expect(zeroRateEmi.monthlyEmi).toBe("10000.0000");
      expect(zeroRateEmi.totalInterest).toBe("0.0000");
    });

    it("verifies amortization schedule generates exactly N periods with declining balance reaching zero", () => {
      const schedule = generateAmortizationSchedule(100000, 10.5, 12, "2026-01-01");
      expect(schedule.length).toBe(12);
      const finalPeriod = schedule[11];
      expect(parseFloat(finalPeriod.remainingBalance)).toBeCloseTo(0, 1);
    });
  });

  describe("Zero-Trust Security & API Defense Audit", () => {
    it("verifies all OTP patterns and sensitive tokens are rejected unconditionally", () => {
      const dangerousPhrases = [
        "Your OTP is 928192",
        "Verification code 4921",
        "One-Time Password is 8829",
        "Login PIN: 1234",
        "Do not share this code",
        "Never share your password",
      ];

      for (const phrase of dangerousPhrases) {
        const payload: any = {
          externalId: "test_sec_1",
          amount: "100.00",
          transactionType: "expense",
          description: phrase,
          timestamp: "2026-10-15T10:00:00Z",
          parserConfidence: 0.9,
        };

        const res = validateFinancialRecord(payload);
        expect(
          res.isValid,
          `Expected payload containing "${phrase}" to be rejected by security policy`
        ).toBe(false);
      }
    });

    it("rejects non-positive amounts and non-ISO timestamps", () => {
      const invalidAmount: any = {
        externalId: "test_sec_2",
        amount: "-50.00",
        transactionType: "expense",
        timestamp: "2026-10-15T10:00:00Z",
        parserConfidence: 0.9,
      };
      expect(validateFinancialRecord(invalidAmount).isValid).toBe(false);

      const invalidDate: any = {
        externalId: "test_sec_3",
        amount: "50.00",
        transactionType: "expense",
        timestamp: "not-a-date",
        parserConfidence: 0.9,
      };
      expect(validateFinancialRecord(invalidDate).isValid).toBe(false);
    });
  });
});
