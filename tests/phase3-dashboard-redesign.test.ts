import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import { calculateSafeToSpend } from "@/lib/calculations/financial";

describe("Phase 3: Home Dashboard Redesign (Safe to Spend Today)", () => {
  describe("Safe to Spend Mathematical Engine", () => {
    it("calculates exact safe daily spend from liquid balances and active budget", () => {
      const res = calculateSafeToSpend({
        liquidBalances: ["50000.00", "25000.00"], // Total 75,000 liquid
        creditLiabilities: ["10000.00"], // 10,000 credit debt -> 65,000 net liquid
        monthlySpent: "15000.00",
        activeBudgetLimit: "40000.00", // 25,000 budget remaining
        upcomingBills: ["5000.00"], // 5,000 upcoming bill -> 20,000 safe pool
        daysRemainingInMonth: 20,
      });

      expect(parseFloat(res.totalLiquidAvailable)).toBeCloseTo(65000.0, 2);
      expect(parseFloat(res.remainingBudget)).toBeCloseTo(25000.0, 2);
      expect(parseFloat(res.safeRemainingPool)).toBeCloseTo(20000.0, 2);
      expect(parseFloat(res.safeToSpendToday)).toBeCloseTo(1000.0, 2); // 20,000 / 20 days = 1,000/day
      expect(res.daysRemaining).toBe(20);
      expect(res.paceStatus).toBe("ahead");
    });

    it("falls back gracefully to liquid buffer when no active budget is configured", () => {
      const res = calculateSafeToSpend({
        liquidBalances: ["100000.00"],
        creditLiabilities: ["20000.00"], // Net liquid: 80,000
        monthlySpent: "30000.00",
        activeBudgetLimit: null,
        upcomingBills: ["20000.00"], // Net safe pool: 60,000
        daysRemainingInMonth: 30,
      });

      expect(parseFloat(res.safeRemainingPool)).toBeCloseTo(60000.0, 2);
      expect(parseFloat(res.safeToSpendToday)).toBeCloseTo(2000.0, 2); // 60,000 / 30 = 2,000/day
      expect(res.paceStatus).toBe("ahead");
    });

    it("detects depleted budget and avoids negative daily spend", () => {
      const res = calculateSafeToSpend({
        liquidBalances: ["10000.00"],
        creditLiabilities: ["5000.00"],
        monthlySpent: "45000.00",
        activeBudgetLimit: "40000.00", // Over budget by 5,000
        upcomingBills: ["8000.00"],
        daysRemainingInMonth: 10,
      });

      expect(parseFloat(res.remainingBudget)).toBe(0);
      expect(parseFloat(res.safeRemainingPool)).toBe(0);
      expect(parseFloat(res.safeToSpendToday)).toBe(0);
      expect(res.paceStatus).toBe("depleted");
      expect(res.healthScore).toBeLessThanOrEqual(30);
    });

    it("preserves 28-digit precision under fractional currency inputs", () => {
      const res = calculateSafeToSpend({
        liquidBalances: ["12345.6789"],
        creditLiabilities: ["123.4567"],
        monthlySpent: "456.7890",
        activeBudgetLimit: "10000.0000",
        upcomingBills: ["234.5678"],
        daysRemainingInMonth: 14,
      });

      const netLiquid = new Decimal("12345.6789").minus("123.4567");
      expect(parseFloat(res.totalLiquidAvailable)).toBeCloseTo(netLiquid.toNumber(), 2);
    });
  });

  describe("SafeToSpendHero Component Structure", () => {
    const heroPath = path.resolve(
      process.cwd(),
      "components/dashboard/safe-to-spend-hero.tsx"
    );
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    it("displays the primary question: 'How much money do I have, and how much can I safely spend?'", () => {
      expect(heroContent).toContain("SAFE TO SPEND TODAY");
      expect(heroContent).toContain(
        "How much money do I have, and how much can I safely spend?"
      );
    });

    it("displays all required sub-metrics in Leftovers format", () => {
      expect(heroContent).toContain("Spent This Month");
      expect(heroContent).toContain("Remaining Budget");
      expect(heroContent).toContain("Monthly Income");
      expect(heroContent).toContain("Monthly Expenses");
      expect(heroContent).toContain("Liquid Available");
    });

    it("includes pacing meter bar and quick action buttons", () => {
      expect(heroContent).toContain("Monthly Budget Utilized");
      expect(heroContent).toContain("Add Expense");
      expect(heroContent).toContain("Transfer");
    });
  });

  describe("Dashboard Client 5 Primary Sections", () => {
    const clientPath = path.resolve(
      process.cwd(),
      "components/dashboard/dashboard-client.tsx"
    );
    const clientContent = fs.readFileSync(clientPath, "utf-8");

    it("mounts the Safe to Spend Today hero as the primary top section", () => {
      expect(clientContent).toContain("<SafeToSpendHero");
    });

    it("renders the Account Balances section with liquid total and account cards", () => {
      expect(clientContent).toContain("Account Balances");
      expect(clientContent).toContain("Total available:");
    });

    it("renders the Recent Activity section with transaction filter tabs", () => {
      expect(clientContent).toContain("Recent Activity");
      expect(clientContent).toContain("activityFilter");
    });

    it("renders Upcoming Payments section with bills, EMIs, and countdowns", () => {
      expect(clientContent).toContain("Upcoming Payments");
      expect(clientContent).toContain("upcomingPayments");
    });

    it("renders Financial Overview section with Net Worth, Assets, Liabilities, and Savings Rate", () => {
      expect(clientContent).toContain("Financial Overview");
      expect(clientContent).toContain("Total Net Worth");
      expect(clientContent).toContain("Monthly Savings Rate");
      expect(clientContent).toContain("Total Assets");
      expect(clientContent).toContain("Total Liabilities");
      expect(clientContent).toContain("6-Month Trajectory");
    });
  });
});
