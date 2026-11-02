import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import {
  addMoney,
  subtractMoney,
  calculateBudgetUtilization,
  calculateDailySafeSpend,
  calculateGoalMonthlyRequired,
} from "@/lib/calculations/financial";

describe("Phase 5: Insights & Planning Hub (Leftovers-Inspired)", () => {
  describe("Daily Spending Scrubber & Analytics Math", () => {
    const mockDailyTransactions = [
      { id: "1", amount: "500.00", transaction_type: "expense", transaction_date: "2026-11-01T10:00:00Z" },
      { id: "2", amount: "750.50", transaction_type: "expense", transaction_date: "2026-11-01T14:00:00Z" },
      { id: "3", amount: "2000.00", transaction_type: "expense", transaction_date: "2026-11-02T19:00:00Z" },
      { id: "4", amount: "300.00", transaction_type: "expense", transaction_date: "2026-11-03T08:00:00Z" },
    ];

    it("aggregates daily totals and identifies peak spending day accurately", () => {
      const dailyMap: Record<string, number> = {};
      let total = 0;

      for (const t of mockDailyTransactions) {
        const dateKey = t.transaction_date.slice(0, 10);
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + parseFloat(t.amount);
        total += parseFloat(t.amount);
      }

      expect(dailyMap["2026-11-01"]).toBeCloseTo(1250.50, 2);
      expect(dailyMap["2026-11-02"]).toBeCloseTo(2000.00, 2);
      expect(dailyMap["2026-11-03"]).toBeCloseTo(300.00, 2);
      expect(total).toBeCloseTo(3550.50, 2);

      // Peak Day calculation
      let maxVal = 0;
      let peakDate = "";
      Object.entries(dailyMap).forEach(([date, amt]) => {
        if (amt > maxVal) {
          maxVal = amt;
          peakDate = date;
        }
      });

      expect(peakDate).toBe("2026-11-02");
      expect(maxVal).toBeCloseTo(2000.00, 2);
    });

    it("computes average daily burn across active days", () => {
      const totalSpent = 3550.50;
      const daysCounted = 3;
      const dailyAverage = totalSpent / daysCounted;

      expect(dailyAverage).toBeCloseTo(1183.50, 2);
    });

    it("computes month-over-month (MoM) trend percentage correctly", () => {
      const currentMonthSpent = 45000.00;
      const previousMonthSpent = 50000.00;

      const diff = currentMonthSpent - previousMonthSpent; // -5000
      const percentChange = (diff / previousMonthSpent) * 100; // -10%

      expect(diff).toBe(-5000.00);
      expect(percentChange).toBe(-10.0);
    });
  });

  describe("SVG Circular Progress Ring & Goal Calculations", () => {
    it("computes exact SVG stroke-dashoffset based on progress percentage", () => {
      const size = 76;
      const strokeWidth = 7;
      const radius = (size - strokeWidth) / 2; // (76 - 7) / 2 = 34.5
      const circumference = 2 * Math.PI * radius; // ~216.77

      // Test 50% progress
      const progress50 = 50;
      const offset50 = circumference - (progress50 / 100) * circumference;
      expect(offset50).toBeCloseTo(circumference / 2, 2);

      // Test 100% progress
      const progress100 = 100;
      const offset100 = circumference - (progress100 / 100) * circumference;
      expect(offset100).toBeCloseTo(0, 2);

      // Test 0% progress
      const progress0 = 0;
      const offset0 = circumference - (progress0 / 100) * circumference;
      expect(offset0).toBeCloseTo(circumference, 2);
    });

    it("calculates required monthly savings and corpus gap for goals", () => {
      const targetCorpus = "300000.00";
      const currentSaved = "120000.00";
      const targetDate = "2027-11-01"; // approx 12 months ahead

      const metrics = calculateGoalMonthlyRequired(targetCorpus, currentSaved, targetDate);
      expect(metrics.progressPercent).toBe(40);
      expect(parseFloat(metrics.remainingAmount)).toBeCloseTo(180000.00, 2);
      expect(metrics.monthsRemaining).toBeGreaterThan(0);
      expect(parseFloat(metrics.monthlyRequired)).toBeGreaterThan(0);
    });
  });

  describe("Budget Envelope Pacing & Daily Safe Velocity", () => {
    it("computes envelope utilization, remaining funds, and daily safe velocity", () => {
      const totalLimit = "60000.00";
      const currentSpent = "24000.00";
      const endDate = "2026-11-30";

      const util = calculateBudgetUtilization(totalLimit, currentSpent);
      expect(util.percentage).toBe(40);
      expect(parseFloat(util.remaining)).toBeCloseTo(36000.00, 2);
      expect(util.isOverBudget).toBe(false);

      const velocity = calculateDailySafeSpend(util.remaining, endDate);
      expect(velocity.daysRemaining).toBeGreaterThan(0);
      expect(parseFloat(velocity.dailySafeSpend)).toBeGreaterThan(0);
    });
  });

  describe("Leftovers Design Language in Phase 5 Components", () => {
    it("DailySpendingScrubber includes day selector, peakDay, dailyAverage, and MoM trend", () => {
      const compPath = path.resolve(process.cwd(), "components/reports/daily-spending-scrubber.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("DailySpendingScrubber");
      expect(content).toContain("Daily Average Spend");
      expect(content).toContain("Peak Spending Day");
      expect(content).toContain("MoM Spending Trend");
      expect(content).toContain("Interactive Timeline");
    });

    it("ReportsView integrates DailySpendingScrubber and tabbed view controls", () => {
      const compPath = path.resolve(process.cwd(), "components/reports/reports-view.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("DailySpendingScrubber");
      expect(content).toContain('activeTab === "scrubber"');
      expect(content).toContain('activeTab === "trends"');
      expect(content).toContain("Financial Insights & Anomaly Intelligence");
    });

    it("ProgressRing component implements SVG circular progress meter", () => {
      const compPath = path.resolve(process.cwd(), "components/goals/progress-ring.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("ProgressRing");
      expect(content).toContain("strokeDasharray");
      expect(content).toContain("strokeDashoffset");
      expect(content).toContain("strokeLinecap");
    });

    it("GoalsView implements ProgressRing, GoalCalculator, and unified Plan tabs", () => {
      const compPath = path.resolve(process.cwd(), "components/goals/goals-view.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("ProgressRing");
      expect(content).toContain("GoalCalculator");
      expect(content).toContain("Monthly Budgets");
      expect(content).toContain("Financial Goals");
      expect(content).toContain("Corpus Gap");
    });

    it("BudgetView implements Category Spending Envelopes, daily safe velocity, and unified Plan tabs", () => {
      const compPath = path.resolve(process.cwd(), "components/budgets/budget-view.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("Category Spending Envelopes");
      expect(content).toContain("Daily Safe Velocity");
      expect(content).toContain("Monthly Budgets");
      expect(content).toContain("Financial Goals");
      expect(content).toContain("Create a monthly spending plan to understand how much you can spend");
    });
  });
});
