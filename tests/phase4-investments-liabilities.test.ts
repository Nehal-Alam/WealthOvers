import { describe, it, expect } from "vitest";
import {
  calculateLoanPrepayment,
  calculateInvestmentReturns,
  calculateXIRR,
  subtractMoney,
} from "@/lib/calculations/financial";

describe("Phase 4: Investments, Liabilities & Prepayment Simulations", () => {
  describe("Loan Prepayment & Foreclosure Simulator", () => {
    it("should accurately simulate extra monthly payments on a 20-year home loan", () => {
      const principal = "5000000"; // 50 Lakhs
      const annualRate = 8.5; // 8.5% p.a.
      const tenureMonths = 240; // 20 years
      const extraMonthly = "10000"; // Extra 10k/month
      const startDate = "2026-01-01";

      const sim = calculateLoanPrepayment(
        principal,
        annualRate,
        tenureMonths,
        extraMonthly,
        "0",
        1,
        startDate
      );

      expect(sim.originalTenureMonths).toBe(240);
      // With extra 10k/month on a 50L loan at 8.5%, tenure should decrease significantly (around 6-8 years saved)
      expect(sim.revisedTenureMonths).toBeLessThan(240);
      expect(sim.monthsSaved).toBeGreaterThan(60);
      expect(parseFloat(sim.interestSaved)).toBeGreaterThan(1000000); // More than 10 Lakhs saved in interest
      expect(sim.schedule.length).toBe(sim.revisedTenureMonths);

      // Verify the final remaining balance terminates properly
      const lastRow = sim.schedule[sim.schedule.length - 1];
      expect(parseFloat(lastRow.remainingBalance)).toBeLessThanOrEqual(5.0);
    });

    it("should accurately simulate one-time lumpsum prepayment at month 12", () => {
      const principal = "1000000"; // 10 Lakhs
      const annualRate = 10.0; // 10% p.a.
      const tenureMonths = 60; // 5 years
      const lumpsumAmount = "200000"; // 2 Lakhs lumpsum
      const lumpsumMonth = 12; // In month 12
      const startDate = "2026-01-01";

      const sim = calculateLoanPrepayment(
        principal,
        annualRate,
        tenureMonths,
        "0",
        lumpsumAmount,
        lumpsumMonth,
        startDate
      );

      expect(sim.originalTenureMonths).toBe(60);
      expect(sim.revisedTenureMonths).toBeLessThan(60);
      expect(sim.monthsSaved).toBeGreaterThan(10);
      expect(parseFloat(sim.interestSaved)).toBeGreaterThan(50000);
      expect(sim.schedule.length).toBe(sim.revisedTenureMonths);

      // Verify month 12 principal drop is larger than normal
      const row11 = sim.schedule[10];
      const row12 = sim.schedule[11];
      const principalDrop = parseFloat(row11.remainingBalance) - parseFloat(row12.remainingBalance);
      expect(principalDrop).toBeGreaterThan(200000);
    });

    it("should return zero savings when no prepayment is made", () => {
      const principal = "500000";
      const annualRate = 9.0;
      const tenureMonths = 36;
      const startDate = "2026-01-01";

      const sim = calculateLoanPrepayment(
        principal,
        annualRate,
        tenureMonths,
        "0",
        "0",
        1,
        startDate
      );

      expect(sim.revisedTenureMonths).toBe(36);
      expect(sim.monthsSaved).toBe(0);
      expect(parseFloat(sim.interestSaved)).toBe(0);
    });
  });

  describe("Credit Card Utilization & Bill Urgency Logic", () => {
    it("should categorize utilization rates according to credit scoring standards", () => {
      const getUtilizationStatus = (balance: number, limit: number) => {
        if (limit <= 0) return "unknown";
        const pct = (balance / limit) * 100;
        if (pct <= 30) return "optimal";
        if (pct <= 50) return "moderate";
        return "high_risk";
      };

      expect(getUtilizationStatus(15000, 100000)).toBe("optimal"); // 15%
      expect(getUtilizationStatus(30000, 100000)).toBe("optimal"); // 30%
      expect(getUtilizationStatus(45000, 100000)).toBe("moderate"); // 45%
      expect(getUtilizationStatus(50000, 100000)).toBe("moderate"); // 50%
      expect(getUtilizationStatus(75000, 100000)).toBe("high_risk"); // 75%
      expect(getUtilizationStatus(98000, 100000)).toBe("high_risk"); // 98%
    });

    it("should evaluate bill payment urgency based on remaining days", () => {
      const getBillUrgency = (daysRemaining: number) => {
        if (daysRemaining <= 3) return "urgent";
        if (daysRemaining <= 7) return "warning";
        return "normal";
      };

      expect(getBillUrgency(1)).toBe("urgent");
      expect(getBillUrgency(3)).toBe("urgent");
      expect(getBillUrgency(5)).toBe("warning");
      expect(getBillUrgency(7)).toBe("warning");
      expect(getBillUrgency(14)).toBe("normal");
    });
  });

  describe("Portfolio Asset Allocation & XIRR Calculations", () => {
    it("should calculate exact asset allocation percentages summing to 100%", () => {
      const allocations = {
        equities: 500000,
        mutualFunds: 300000,
        gold: 150000,
        deposits: 50000,
      };
      const total = Object.values(allocations).reduce((acc, v) => acc + v, 0);
      expect(total).toBe(1000000);

      const shares = {
        equities: (allocations.equities / total) * 100,
        mutualFunds: (allocations.mutualFunds / total) * 100,
        gold: (allocations.gold / total) * 100,
        deposits: (allocations.deposits / total) * 100,
      };

      expect(shares.equities).toBe(50);
      expect(shares.mutualFunds).toBe(30);
      expect(shares.gold).toBe(15);
      expect(shares.deposits).toBe(5);
      expect(shares.equities + shares.mutualFunds + shares.gold + shares.deposits).toBe(100);
    });

    it("should compute annualized XIRR across periodic investment inflows and current valuation", () => {
      const cashFlows = [
        { amount: -100000, date: new Date("2025-01-01") },
        { amount: -100000, date: new Date("2025-07-01") },
        { amount: 240000, date: new Date("2026-01-01") }, // 40k gain
      ];

      const xirr = calculateXIRR(cashFlows);
      expect(xirr).not.toBeNull();
      if (xirr !== null) {
        // calculateXIRR returns percentage directly (e.g. 27.13)
        expect(xirr).toBeGreaterThan(15);
        expect(xirr).toBeLessThan(35);
      }
    });

    it("should handle USD assets converted with exchange rate properly", () => {
      const usdInvested = calculateInvestmentReturns(
        10, // 10 shares
        150, // $150 buy price
        200, // $200 current price
        "USD",
        84.5 // USD-INR rate
      );

      // 10 * 150 = $1500 * 84.5 = INR 126,750
      expect(usdInvested.investedAmount).toBe("126750.0000");
      // 10 * 200 = $2000 * 84.5 = INR 169,000
      expect(usdInvested.currentValuation).toBe("169000.0000");
      // Returns = INR 42,250
      expect(usdInvested.unrealizedPnL).toBe("42250.0000");
      // Returns % = 33.33%
      expect(usdInvested.absoluteReturnPercent).toBe("33.33");
    });
  });

  describe("Tangible Asset Solvency & Equity Math", () => {
    it("should compute accurate unencumbered equity and debt leverage ratios", () => {
      const assetVal = "10000000.0000"; // 1 Crore assets
      const debtVal = "2500000.0000"; // 25 Lakhs debt
      const net = subtractMoney(assetVal, debtVal);

      expect(net).toBe("7500000.0000"); // 75 Lakhs equity

      const assetNum = parseFloat(assetVal);
      const debtNum = parseFloat(debtVal);
      const leverageRatio = (debtNum / assetNum) * 100;
      const equityRatio = (parseFloat(net) / assetNum) * 100;

      expect(leverageRatio).toBe(25);
      expect(equityRatio).toBe(75);
      expect(leverageRatio + equityRatio).toBe(100);
    });
  });
});
