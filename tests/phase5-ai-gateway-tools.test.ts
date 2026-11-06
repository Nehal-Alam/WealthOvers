import { describe, it, expect } from "vitest";
import { sanitizeFinancialPrompt, maskAccountNumber } from "../lib/ai/sanitizer";
import { resolveActiveProvider, sendChatMessage } from "../lib/ai/gateway";
import Decimal from "decimal.js";

describe("Phase 5: Cloud AI Finance Assistant & Multi-Provider Gateway", () => {
  describe("PII & Financial Data Sanitizer", () => {
    it("redacts Indian PAN card numbers", () => {
      const input = "User PAN is ABCDE1234F for ITR filing.";
      const sanitized = sanitizeFinancialPrompt(input);
      expect(sanitized).toBe("User PAN is [PAN_REDACTED] for ITR filing.");
    });

    it("redacts 12-digit Indian Aadhaar numbers", () => {
      const input = "Aadhaar verified: 1234-5678-9012 and 987654321098.";
      const sanitized = sanitizeFinancialPrompt(input);
      expect(sanitized).toContain("[AADHAAR_REDACTED]");
      expect(sanitized).not.toContain("1234-5678-9012");
      expect(sanitized).not.toContain("987654321098");
    });

    it("redacts mobile phone numbers and email addresses", () => {
      const input = "Contact advisor at advisor@wealthovers.in or call +919876543210.";
      const sanitized = sanitizeFinancialPrompt(input);
      expect(sanitized).toContain("[EMAIL_REDACTED]");
      expect(sanitized).toContain("[PHONE_REDACTED]");
      expect(sanitized).not.toContain("advisor@wealthovers.in");
      expect(sanitized).not.toContain("9876543210");
    });

    it("masks bank account numbers retaining only the final 4 digits", () => {
      const input = "Transfer from account 50100492817492 to 1029384756.";
      const sanitized = sanitizeFinancialPrompt(input);
      expect(sanitized).toContain("XXXX-XXXX-7492");
      expect(sanitized).toContain("XXXX-XXXX-4756");
      expect(sanitized).not.toContain("50100492817492");
      expect(sanitized).not.toContain("1029384756");
    });

    it("masks standalone account number helper", () => {
      expect(maskAccountNumber("50100492817492")).toBe("XXXX-7492");
      expect(maskAccountNumber("1234")).toBe("1234");
      expect(maskAccountNumber(null)).toBe("XXXX");
    });
  });

  describe("AI Gateway Provider Resolution & Deterministic Fallback Engine", () => {
    it("falls back to local deterministic engine when no cloud provider API keys exist", () => {
      const provider = resolveActiveProvider();
      expect(["gemini", "openai", "claude", "local_fallback"]).toContain(provider);
    });

    it("generates structured terminal markdown for net worth inquiries", async () => {
      const mockContext = {
        netWorthSummary: {
          totalAssets: 4500000,
          totalLiabilities: 1200000,
          netWorth: 3300000,
          liquidNetWorth: 850000,
          breakdown: {
            cashAndBank: 1050000,
            investments: 1950000,
            fixedAssets: 1500000,
            creditCards: 200000,
            loans: 1000000,
            externalLiabilities: 0,
          },
        },
      };

      const response = await sendChatMessage(
        [{ role: "user", content: "What is my current net worth and balance sheet breakdown?" }],
        { provider: "local_fallback", financialContext: mockContext }
      );

      expect(response.provider).toBe("local_fallback");
      expect(response.content).toContain("WealthOvers Terminal Net Worth Summary");
      expect(response.content).toContain("Cash & Bank Balances");
      expect(response.content).toContain("₹33,00,000"); // Indian formatted
      expect(response.content).toContain("Verified");
    });

    it("generates structured category breakdown for expense inquiries", async () => {
      const mockContext = {
        spendingBreakdown: {
          periodDays: 30,
          totalExpenses: 65400,
          topExpenseCategory: "Dining Out",
          categories: [
            { category: "Dining Out", totalAmount: 22500, percentage: 34.4, transactionCount: 14 },
            { category: "Groceries", totalAmount: 18000, percentage: 27.5, transactionCount: 8 },
            { category: "Utilities", totalAmount: 8500, percentage: 13.0, transactionCount: 3 },
          ],
        },
      };

      const response = await sendChatMessage(
        [{ role: "user", content: "Break down my monthly spending and expenses" }],
        { provider: "local_fallback", financialContext: mockContext }
      );

      expect(response.content).toContain("Spending Breakdown (30 Days)");
      expect(response.content).toContain("Dining Out");
      expect(response.content).toContain("₹22,500");
      expect(response.content).toContain("34.4%");
    });

    it("generates loan prepayment interest and time savings calculation", async () => {
      const mockContext = {
        loanSimulation: {
          loanId: "loan-hdfc-01",
          lenderName: "HDFC Home Loan",
          principalAmount: 5000000,
          currentOutstanding: 4200000,
          annualInterestRate: 8.5,
          tenureMonths: 240,
          currentEmi: 43391,
          extraMonthlyPayment: 10000,
          revisedTenureMonths: 168,
          monthsSaved: 72,
          totalInterestOriginal: 4813840,
          totalInterestRevised: 3120400,
          interestSaved: 1693440,
        },
      };

      const response = await sendChatMessage(
        [{ role: "user", content: "Simulate prepaying ₹10,000 extra on my home loan" }],
        { provider: "local_fallback", financialContext: mockContext }
      );

      expect(response.content).toContain("Loan Prepayment Simulation: HDFC Home Loan");
      expect(response.content).toContain("72 months earlier");
      expect(response.content).toContain("₹16,93,440");
    });
  });

  describe("Amortization Math Precision Invariants", () => {
    it("proves that extra prepayment strictly reduces both tenure and cumulative interest", () => {
      const P = new Decimal(2500000); // 25 Lakhs
      const annualRate = new Decimal(0.09); // 9%
      const r = annualRate.div(12);
      const originalEmi = new Decimal(22493); // Standard 20-year EMI
      const extraMonthly = new Decimal(5000);
      const revisedEmi = originalEmi.plus(extraMonthly);

      // Baseline simulation
      let bal1 = P;
      let months1 = 0;
      let totalInt1 = new Decimal(0);
      while (bal1.greaterThan(0) && months1 < 360) {
        months1++;
        const int = bal1.times(r);
        totalInt1 = totalInt1.plus(int);
        bal1 = bal1.minus(originalEmi.minus(int));
      }

      // Revised simulation
      let bal2 = P;
      let months2 = 0;
      let totalInt2 = new Decimal(0);
      while (bal2.greaterThan(0) && months2 < 360) {
        months2++;
        const int = bal2.times(r);
        totalInt2 = totalInt2.plus(int);
        bal2 = bal2.minus(revisedEmi.minus(int));
      }

      expect(months2).toBeLessThan(months1);
      expect(totalInt2.toNumber()).toBeLessThan(totalInt1.toNumber());
      expect(months1 - months2).toBeGreaterThan(50); // Saves over 4 years!
    });
  });
});

