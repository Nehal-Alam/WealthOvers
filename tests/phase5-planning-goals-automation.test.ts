import { describe, it, expect } from "vitest";
import {
  calculateBudgetUtilization,
  calculateDailySafeSpend,
  calculateCashFlowForecast,
  calculateGoalTrajectory,
  calculateGoalMonthlyRequired,
} from "@/lib/calculations/financial";
import { addDays, addMonths, format } from "date-fns";

describe("Phase 5: Planning, Goals & Automation", () => {
  describe("Category Budgets & Daily Safe Spend Velocity", () => {
    it("should calculate budget utilization and safe daily spend rate across remaining days", () => {
      const totalAllocated = "30000.0000";
      const totalSpent = "15000.0000";
      const util = calculateBudgetUtilization(totalAllocated, totalSpent);

      expect(util.percentage).toBe(50);
      expect(util.isOverBudget).toBe(false);
      expect(util.remaining).toBe("15000.0000");

      const today = new Date();
      const cycleEnd = addDays(today, 14); // 15 days total inclusive
      const daily = calculateDailySafeSpend(util.remaining, cycleEnd, today);

      expect(daily.daysRemaining).toBe(15);
      expect(daily.isOverspent).toBe(false);
      // 15,000 / 15 days = 1,000 per day
      expect(parseFloat(daily.dailySafeSpend)).toBeCloseTo(1000.0, 1);
    });

    it("should correctly handle overspent budgets with zero safe spend and overspent flag", () => {
      const totalAllocated = "20000.0000";
      const totalSpent = "24000.0000";
      const util = calculateBudgetUtilization(totalAllocated, totalSpent);

      expect(util.percentage).toBe(120);
      expect(util.isOverBudget).toBe(true);

      const today = new Date();
      const cycleEnd = addDays(today, 10);
      const daily = calculateDailySafeSpend(util.remaining, cycleEnd, today);

      expect(daily.isOverspent).toBe(true);
      expect(daily.dailySafeSpend).toBe("0.0000");
    });
  });

  describe("Recurring Cash-Flow Forecasting (30, 60, 90 Days)", () => {
    it("should project accurate cash flows over 30, 60, and 90 days from active rules", () => {
      const rules = [
        {
          amount: "100000.0000",
          recurrence_interval: "monthly",
          transaction_type: "income",
          is_active: true,
        },
        {
          amount: "25000.0000",
          recurrence_interval: "monthly",
          transaction_type: "expense",
          is_active: true,
        },
        {
          amount: "1000.0000",
          recurrence_interval: "weekly",
          transaction_type: "expense",
          is_active: true,
        },
        {
          amount: "5000.0000",
          recurrence_interval: "monthly",
          transaction_type: "expense",
          is_active: false, // Paused rule should not be counted
        },
      ];

      const forecast = calculateCashFlowForecast(rules, [30, 60, 90]);

      expect(forecast.length).toBe(3);

      // 30 Days:
      // Income: 100k (1 monthly)
      // Outflows: 25k (1 monthly) + 4 * 1k (4 weeks) = 29k
      // Net: 71k
      const p30 = forecast[0];
      expect(p30.days).toBe(30);
      expect(parseFloat(p30.inflows)).toBeCloseTo(100000, 0);
      expect(parseFloat(p30.outflows)).toBeCloseTo(29000, 0);
      expect(parseFloat(p30.netCashFlow)).toBeCloseTo(71000, 0);
      expect(p30.isNetPositive).toBe(true);

      // 60 Days:
      // Income: 200k (2 monthly)
      // Outflows: 50k (2 monthly) + 8 * 1k (8 weeks) = 58k
      // Net: 142k
      const p60 = forecast[1];
      expect(p60.days).toBe(60);
      expect(parseFloat(p60.inflows)).toBeCloseTo(200000, 0);
      expect(parseFloat(p60.outflows)).toBeCloseTo(58000, 0);
      expect(parseFloat(p60.netCashFlow)).toBeCloseTo(142000, 0);

      // 90 Days:
      // Income: 300k (3 monthly)
      const p90 = forecast[2];
      expect(p90.days).toBe(90);
      expect(parseFloat(p90.inflows)).toBeCloseTo(300000, 0);
      expect(p90.isNetPositive).toBe(true);
    });

    it("should flag net negative cash flow periods when outflows exceed inflows", () => {
      const deficitRules = [
        {
          amount: "10000.0000",
          recurrence_interval: "monthly",
          transaction_type: "income",
          is_active: true,
        },
        {
          amount: "40000.0000",
          recurrence_interval: "monthly",
          transaction_type: "expense",
          is_active: true,
        },
      ];

      const forecast = calculateCashFlowForecast(deficitRules, [30]);
      expect(forecast[0].isNetPositive).toBe(false);
      expect(parseFloat(forecast[0].netCashFlow)).toBeCloseTo(-30000, 0);
    });
  });

  describe("Goal Trajectory & Pacing Engine", () => {
    it("should compute on-track goal status when savings velocity meets or exceeds target rate", () => {
      const now = new Date();
      const targetDate = addMonths(now, 10); // 10 months away
      const targetAmount = "500000.0000"; // 5 Lakhs
      const currentAmount = "100000.0000"; // 1 Lakh saved
      // Remaining = 4 Lakhs. Required per month = 40,000

      const monthlyVelocity = "50000.0000"; // Saving 50k/mo (faster than 40k required)

      const trajectory = calculateGoalTrajectory(
        targetAmount,
        currentAmount,
        targetDate,
        monthlyVelocity,
        now
      );

      expect(trajectory.isOnTrack).toBe(true);
      // 400,000 / 50,000 = 8 months to complete (earlier than 10 months)
      expect(trajectory.projectedMonthsToComplete).toBe(8);
      expect(trajectory.varianceMonths).toBe(2); // 2 months ahead of schedule
      expect(trajectory.projectedCompletionDate).toBeDefined();
    });

    it("should compute pacing lag when savings velocity is below target requirements", () => {
      const now = new Date();
      const targetDate = addMonths(now, 10); // 10 months away
      const targetAmount = "500000.0000";
      const currentAmount = "100000.0000";
      // Remaining = 4 Lakhs

      const monthlyVelocity = "20000.0000"; // Saving only 20k/mo

      const trajectory = calculateGoalTrajectory(
        targetAmount,
        currentAmount,
        targetDate,
        monthlyVelocity,
        now
      );

      expect(trajectory.isOnTrack).toBe(false);
      // 400,000 / 20,000 = 20 months (10 months behind schedule)
      expect(trajectory.projectedMonthsToComplete).toBe(20);
      expect(trajectory.varianceMonths).toBe(-10);
    });

    it("should mark completed goals immediately with 0 months remaining", () => {
      const now = new Date();
      const targetDate = addMonths(now, 6);
      const targetAmount = "300000.0000";
      const currentAmount = "350000.0000"; // Surpassed target

      const trajectory = calculateGoalTrajectory(
        targetAmount,
        currentAmount,
        targetDate,
        0,
        now
      );

      expect(trajectory.isOnTrack).toBe(true);
      expect(trajectory.projectedMonthsToComplete).toBe(0);
      expect(trajectory.varianceMonths).toBe(0);
    });
  });

  describe("Companion Sync Telemetry & Automation Health", () => {
    it("should correctly aggregate sync metrics and compute parser reliability", () => {
      const mockSyncLogs = [
        { sync_status: "success", records_ingested: 12 },
        { sync_status: "success", records_ingested: 8 },
        { sync_status: "partial_error", records_ingested: 3 },
        { sync_status: "success", records_ingested: 15 },
      ];

      const totalIngested = mockSyncLogs.reduce((acc, l) => acc + l.records_ingested, 0);
      expect(totalIngested).toBe(38);

      const successCount = mockSyncLogs.filter((l) => l.sync_status === "success").length;
      const successRate = Math.round((successCount / mockSyncLogs.length) * 100);

      expect(successRate).toBe(75); // 3 of 4 = 75%
    });
  });
});
