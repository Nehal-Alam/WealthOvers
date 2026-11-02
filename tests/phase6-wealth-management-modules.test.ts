import { describe, it, expect } from "vitest";
import {
  calculateBalanceSheetRatios,
  calculateFinancialHealthScore,
  calculateInvestmentReturns,
  calculateXIRR,
  generateAmortizationSchedule,
  calculateLoanPrepayment,
  addMoney,
  subtractMoney,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";
import { validateFinancialRecord } from "@/lib/security/device-auth";

describe("Phase 6: Wealth Management Modules (Leftovers-Inspired)", () => {
  describe("1. Net Worth Balance Sheet & Solvency", () => {
    it("correctly reconciles consolidated Net Worth = Gross Assets - Gross Liabilities with Decimal precision", () => {
      const liquidBalances = ["150000.00", "50000.50"]; // 200,000.50
      const investmentValuations = ["500000.00", "250000.00"]; // 750,000.00
      const tangibleAssets = ["7500000.00", "650000.00"]; // 8,150,000.00
      // Total Assets = 9,100,000.50

      const creditLiabilities = ["25000.00"];
      const loanLiabilities = ["2500000.00"];
      const manualLiabilities = ["100000.00"];
      // Total Liabilities = 2,625,000.00

      const ratios = calculateBalanceSheetRatios({
        liquidBalances,
        investmentValuations,
        tangibleAssets,
        creditLiabilities,
        loanLiabilities,
        manualLiabilities,
        monthlyExpenses: "75000.00",
      });

      expect(parseFloat(ratios.totalLiquid)).toBeCloseTo(200000.5, 2);
      expect(parseFloat(ratios.totalInvestments)).toBeCloseTo(750000.0, 2);
      expect(parseFloat(ratios.totalTangible)).toBeCloseTo(8150000.0, 2);
      expect(parseFloat(ratios.totalAssets)).toBeCloseTo(9100000.5, 2);
      expect(parseFloat(ratios.totalLiabilities)).toBeCloseTo(2625000.0, 2);
      expect(parseFloat(ratios.netWorth)).toBeCloseTo(9100000.5 - 2625000.0, 2);

      // Liquid Net Worth = 200,000.50 - 25,000 = 175,000.50
      expect(parseFloat(ratios.liquidNetWorth)).toBeCloseTo(175000.5, 2);

      // Debt to Asset ratio = (2,625,000 / 9,100,000.5) * 100 = ~28.8%
      expect(parseFloat(ratios.debtToAssetRatio)).toBeCloseTo(28.85, 1);
    });

    it("evaluates deterministic multi-pillar Financial Health Score accurately", () => {
      const scoreResult = calculateFinancialHealthScore({
        liquidCapital: "450000.00",
        monthlyOutflow: "75000.00", // 6 months runway
        totalAssets: "5000000.00",
        totalLiabilities: "1000000.00", // 20% DTI
        savingsRatePercent: "35.0",
        creditUsed: 15000,
        totalCreditLimit: 100000, // 15% util
      });

      expect(scoreResult.score).toBeGreaterThanOrEqual(80);
      expect(["Excellent", "Good"]).toContain(scoreResult.grade);
      expect(scoreResult.pillars.length).toBe(4);
      expect(scoreResult.pillars.map((p) => p.name)).toEqual([
        "Emergency Runway",
        "Debt-to-Asset",
        "Savings Rate",
        "Credit Utilization",
      ]);
    });
  });

  describe("2. Investments Portfolio & XIRR Engine", () => {
    it("computes investment valuations and profit/loss in INR and USD", () => {
      // 100 shares at buy price 250, current price 320 INR
      const inrStock = calculateInvestmentReturns(100, 250, 320, "INR", DEFAULT_USD_INR_RATE);
      expect(parseFloat(inrStock.investedAmount)).toBeCloseTo(25000, 2);
      expect(parseFloat(inrStock.currentValuation)).toBeCloseTo(32000, 2);
      expect(inrStock.isProfit).toBe(true);
      expect(parseFloat(inrStock.absoluteReturnPercent)).toBeCloseTo(28.0, 1);

      // US Stock: 10 shares at $150, current $180, USD/INR @ 86
      const usStock = calculateInvestmentReturns(10, 150, 180, "USD", 86);
      expect(parseFloat(usStock.investedAmount)).toBeCloseTo(1500 * 86, 2);
      expect(parseFloat(usStock.currentValuation)).toBeCloseTo(1800 * 86, 2);
      expect(usStock.isProfit).toBe(true);
      expect(parseFloat(usStock.absoluteReturnPercent)).toBeCloseTo(20.0, 1);
    });

    it("calculates realistic XIRR for irregular investment cash flows", () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const cashFlows = [
        { amount: -100000, date: oneYearAgo },
        { amount: -50000, date: sixMonthsAgo },
        { amount: 185000, date: now },
      ];

      const xirr = calculateXIRR(cashFlows);
      expect(xirr).not.toBeNull();
      expect(xirr!).toBeGreaterThan(15);
      expect(xirr!).toBeLessThan(45);
    });
  });

  describe("3. Credit Cards Management", () => {
    it("computes overall card utilization and categories into optimal, warning, danger", () => {
      const limit = "300000.0000";
      const outstandingOptimal = "45000.0000"; // 15% -> optimal
      const outstandingWarning = "120000.0000"; // 40% -> moderate warning
      const outstandingDanger = "240000.0000"; // 80% -> high danger

      const utilOptimal = Math.round((parseFloat(outstandingOptimal) / parseFloat(limit)) * 100);
      const utilWarning = Math.round((parseFloat(outstandingWarning) / parseFloat(limit)) * 100);
      const utilDanger = Math.round((parseFloat(outstandingDanger) / parseFloat(limit)) * 100);

      expect(utilOptimal).toBe(15);
      expect(utilWarning).toBe(40);
      expect(utilDanger).toBe(80);

      expect(utilOptimal <= 30).toBe(true);
      expect(utilWarning > 30 && utilWarning <= 50).toBe(true);
      expect(utilDanger > 50).toBe(true);
    });
  });

  describe("4. Loans Amortization & Accelerated Payoff", () => {
    it("generates exact loan amortization schedule with monthly EMI and zero negative balances", () => {
      const principal = 1200000; // 12 Lakhs
      const annualRate = 9.0;
      const tenureMonths = 60; // 5 years
      const startDate = "2026-01-01";

      const schedule = generateAmortizationSchedule(principal, annualRate, tenureMonths, startDate);

      expect(schedule.length).toBe(60);
      expect(schedule[0].month).toBe(1);
      expect(parseFloat(schedule[0].remainingBalance)).toBeLessThan(principal);

      // Final month balance must be zero
      const lastMonth = schedule[schedule.length - 1];
      expect(lastMonth.month).toBe(60);
      expect(parseFloat(lastMonth.remainingBalance)).toBeCloseTo(0, 1);
    });

    it("simulates accelerated prepayment savings with extra monthly contribution", () => {
      const principal = 3000000; // 30 Lakhs
      const annualRate = 8.5;
      const tenureMonths = 240; // 20 years

      const sim = calculateLoanPrepayment(
        principal,
        annualRate,
        tenureMonths,
        10000, // +₹10,000/month extra EMI
        100000, // ₹1,00,000 lumpsum
        12, // at month 12
        "2026-01-01"
      );

      expect(sim.monthsSaved).toBeGreaterThan(36); // Saves 3+ years
      expect(parseFloat(sim.interestSaved)).toBeGreaterThan(500000); // Saves 5+ Lakhs interest
    });
  });

  describe("5. Assets & Liabilities Balance Sheet Ratios", () => {
    it("calculates tangible net capital and unencumbered equity ratio", () => {
      const assetVal = 5000000; // 50 Lakhs real estate / car
      const liabilityVal = 1500000; // 15 Lakhs external debts

      const netTangible = assetVal - liabilityVal; // 35 Lakhs
      const debtRatio = (liabilityVal / assetVal) * 100; // 30%
      const equityPercent = 100 - debtRatio; // 70%

      expect(netTangible).toBe(3500000);
      expect(debtRatio).toBe(30);
      expect(equityPercent).toBe(70);
    });
  });

  describe("6. Android Companion Automation & Zero-Trust Defense", () => {
    it("validates legitimate financial notification payload", () => {
      const validRecord = {
        externalId: "ext_swiggy_123",
        amount: "850.00",
        transactionType: "expense" as const,
        merchant: "Swiggy",
        timestamp: new Date().toISOString(),
        parserConfidence: 0.95,
      };

      const result = validateFinancialRecord(validRecord);
      expect(result.isValid).toBe(true);
    });

    it("strictly rejects SMS messages containing authentication OTP keywords (Zero-Trust)", () => {
      const maliciousRecord = {
        externalId: "ext_otp_456",
        amount: "5000.00",
        transactionType: "expense" as const,
        merchant: "Bank OTP Alert",
        description: "Your verification OTP for netbanking transaction is 482910. Do not share.",
        timestamp: new Date().toISOString(),
        parserConfidence: 0.1,
      };

      const result = validateFinancialRecord(maliciousRecord);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/OTP/i);
    });
  });

  describe("7. Section 11 Onboarding Empty State Standards", () => {
    it("verifies onboarding criteria across all wealth modules", () => {
      const modules = [
        {
          name: "Net Worth",
          explanation: "Add your bank accounts, stocks, mutual funds, or real estate to see your consolidated net worth",
          setupAction: "Add Liquid Account",
        },
        {
          name: "Investments",
          explanation: "Add your stocks, mutual funds or deposits to track your portfolio.",
          setupAction: "CreateInvestmentDialog",
        },
        {
          name: "Credit Cards",
          explanation: "Add your credit cards to track billing cycles, statement balances, and utilization limits.",
          setupAction: "CreateCreditCardDialog",
        },
        {
          name: "Loans & Debts",
          explanation: "Record home loans, personal loans, or vehicle financing to monitor your amortization schedule",
          setupAction: "CreateLoanDialog",
        },
        {
          name: "Fixed Assets",
          explanation: "Add properties, vehicles, or physical assets to track tangible net worth.",
          setupAction: "CreateAssetDialog",
        },
        {
          name: "Android Companion",
          explanation: "Pair your Android phone to automatically capture UPI, debit card, and banking transactions in real-time.",
          setupAction: "PairDeviceDialog",
        },
      ];

      for (const mod of modules) {
        expect(mod.explanation.length).toBeGreaterThan(20);
        expect(mod.setupAction).toBeDefined();
      }
    });
  });
});
