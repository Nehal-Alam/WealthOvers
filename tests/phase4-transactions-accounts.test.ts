import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
import { addMoney, subtractMoney } from "@/lib/calculations/financial";

describe("Phase 4: Transactions & Accounts Experience (Leftovers-Inspired)", () => {
  describe("Keypad Arithmetic & Amount Handling", () => {
    // Helper simulating the keypad handler in CreateTransactionDialog
    function simulateKeypad(initialAmount: string, keys: string[]): string {
      let current = initialAmount;
      for (const key of keys) {
        if (key === "backspace") {
          current = current.slice(0, -1);
        } else if (key === "clear") {
          current = "";
        } else if (key === ".") {
          if (!current) {
            current = "0.";
          } else if (!current.includes(".")) {
            current = current + ".";
          }
        } else {
          // digit
          if (current === "0" && key !== ".") {
            current = key;
          } else if (current.includes(".")) {
            const parts = current.split(".");
            if (parts[1] && parts[1].length >= 2) {
              continue; // max 2 decimal places
            }
            current += key;
          } else {
            if (current.length < 10) {
              current += key;
            }
          }
        }
      }
      return current;
    }

    it("correctly handles consecutive digit presses", () => {
      const result = simulateKeypad("", ["1", "5", "0", "0"]);
      expect(result).toBe("1500");
    });

    it("formats leading decimal point with zero prefix", () => {
      const result = simulateKeypad("", [".", "5", "0"]);
      expect(result).toBe("0.50");
    });

    it("enforces maximum of 2 decimal places", () => {
      const result = simulateKeypad("", ["1", "2", ".", "4", "5", "9"]);
      expect(result).toBe("12.45"); // 9 should be ignored
    });

    it("handles backspace and clear operations", () => {
      const step1 = simulateKeypad("", ["4", "5", "0"]);
      expect(step1).toBe("450");
      const step2 = simulateKeypad(step1, ["backspace"]);
      expect(step2).toBe("45");
      const step3 = simulateKeypad(step2, ["clear"]);
      expect(step3).toBe("");
    });
  });

  describe("Date-Grouping & Daily Spending Summaries", () => {
    const mockTransactions = [
      {
        id: "1",
        transaction_date: "2026-11-02T10:30:00Z",
        transaction_type: "expense",
        amount: "450.00",
        description: "Swiggy Dinner",
      },
      {
        id: "2",
        transaction_date: "2026-11-02T14:15:00Z",
        transaction_type: "expense",
        amount: "970.50",
        description: "Supermarket Groceries",
      },
      {
        id: "3",
        transaction_date: "2026-11-02T09:00:00Z",
        transaction_type: "income",
        amount: "25000.00",
        description: "Freelance Payment",
      },
      {
        id: "4",
        transaction_date: "2026-11-01T12:00:00Z",
        transaction_type: "expense",
        amount: "1200.00",
        description: "Fuel",
      },
    ];

    it("groups transactions by calendar day and computes daily sums accurately", () => {
      const map = new Map<string, { expenses: string; income: string; count: number }>();

      for (const t of mockTransactions) {
        const dateKey = t.transaction_date.slice(0, 10);
        if (!map.has(dateKey)) {
          map.set(dateKey, { expenses: "0.0000", income: "0.0000", count: 0 });
        }
        const entry = map.get(dateKey)!;
        entry.count += 1;
        if (t.transaction_type === "expense") {
          entry.expenses = addMoney(entry.expenses, t.amount);
        } else if (t.transaction_type === "income") {
          entry.income = addMoney(entry.income, t.amount);
        }
      }

      // Day 1: 2026-11-02
      const day1 = map.get("2026-11-02")!;
      expect(day1.count).toBe(3);
      expect(parseFloat(day1.expenses)).toBeCloseTo(1420.50, 2);
      expect(parseFloat(day1.income)).toBeCloseTo(25000.00, 2);

      // Day 2: 2026-11-01
      const day2 = map.get("2026-11-01")!;
      expect(day2.count).toBe(1);
      expect(parseFloat(day2.expenses)).toBeCloseTo(1200.00, 2);
    });
  });

  describe("Accounts Categorization & Liquid Balances", () => {
    const mockAccounts = [
      { id: "a1", name: "HDFC Savings", account_type: "savings", current_balance: 75000.00, is_archived: false },
      { id: "a2", name: "ICICI Salary", account_type: "salary", current_balance: 45000.00, is_archived: false },
      { id: "a3", name: "Cash Wallet", account_type: "cash", current_balance: 5500.00, is_archived: false },
      { id: "a4", name: "HDFC Regalia", account_type: "credit_card", current_balance: 18500.00, is_archived: false },
      { id: "a5", name: "Car Loan", account_type: "loan_account", current_balance: 250000.00, is_archived: false },
      { id: "a6", name: "Old Bank Account", account_type: "savings", current_balance: 200.00, is_archived: true },
    ];

    it("accurately computes total liquid balance, total credit debt, and net capital", () => {
      const active = mockAccounts.filter((a) => !a.is_archived);
      let liquid = "0.0000";
      let debt = "0.0000";

      for (const a of active) {
        if (a.account_type === "credit_card" || a.account_type === "loan_account") {
          debt = addMoney(debt, a.current_balance);
        } else {
          liquid = addMoney(liquid, a.current_balance);
        }
      }

      const net = subtractMoney(liquid, debt);

      // Liquid: 75000 + 45000 + 5500 = 1,25,500
      expect(parseFloat(liquid)).toBe(125500.00);
      // Debt: 18500 + 250000 = 2,68,500
      expect(parseFloat(debt)).toBe(268500.00);
      // Net: 125500 - 268500 = -1,43,000
      expect(parseFloat(net)).toBe(-143000.00);
    });
  });

  describe("Leftovers Design Language in Phase 4 Components", () => {
    it("CreateTransactionDialog includes keypad-first design, tabular amounts, category chips, and 1-tap accounts", () => {
      const compPath = path.resolve(process.cwd(), "components/transactions/create-transaction-dialog.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("handleKeypadPress");
      expect(content).toContain("tabular-nums");
      expect(content).toContain("topCategories");
      expect(content).toContain("activeAccounts");
      expect(content).toContain("Expense");
      expect(content).toContain("Income");
      expect(content).toContain("Transfer");
      expect(content).toContain("Split");
    });

    it("TransactionTimeline implements Leftovers date-grouped timeline with daily sums", () => {
      const compPath = path.resolve(process.cwd(), "components/transactions/transaction-timeline.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("TransactionTimeline");
      expect(content).toContain("totalExpense");
      expect(content).toContain("totalIncome");
      expect(content).toContain("Spent -₹");
      expect(content).toContain("text-danger");
      expect(content).toContain("text-success");
      expect(content).toContain("text-primary");
    });

    it("TransactionLedger supports Timeline view mode by default and allows Table view toggle", () => {
      const compPath = path.resolve(process.cwd(), "components/transactions/transaction-ledger.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain('viewMode === "timeline"');
      expect(content).toContain("TransactionTimeline");
      expect(content).toContain("TransactionTable");
      expect(content).toContain("Export CSV");
      expect(content).toContain("Needs Review");
    });

    it("AccountGrid implements Leftovers onboarding empty state and categorized cards", () => {
      const compPath = path.resolve(process.cwd(), "components/accounts/account-grid.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("Add your first account to see your total available balance");
      expect(content).toContain("Bank Accounts");
      expect(content).toContain("Credit Cards & Debt");
      expect(content).toContain("Total Liquid Balance");
      expect(content).toContain("Net Available Capital");
    });

    it("AccountCard displays formatted tabular balance, account type, and actions dropdown", () => {
      const compPath = path.resolve(process.cwd(), "components/accounts/account-card.tsx");
      const content = fs.readFileSync(compPath, "utf-8");

      expect(content).toContain("tabular-nums");
      expect(content).toContain("Reconcile Balance");
      expect(content).toContain("Transfer Funds");
      expect(content).toContain("View Transactions");
    });
  });
});

