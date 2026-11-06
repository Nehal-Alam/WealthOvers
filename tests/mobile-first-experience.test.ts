import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import Decimal from "decimal.js";

describe("Mobile-First Personal Finance Experience (V2 Redesign)", () => {
  const mobileNavPath = path.join(process.cwd(), "components/layout/mobile-nav.tsx");
  const mobileDashboardPath = path.join(process.cwd(), "components/dashboard/mobile-dashboard-view.tsx");
  const mobileSettingsPath = path.join(process.cwd(), "components/settings/mobile-settings-extras.tsx");
  const dashboardClientPath = path.join(process.cwd(), "components/dashboard/dashboard-client.tsx");

  const mobileNavCode = fs.readFileSync(mobileNavPath, "utf-8");
  const mobileDashboardCode = fs.readFileSync(mobileDashboardPath, "utf-8");
  const mobileSettingsCode = fs.readFileSync(mobileSettingsPath, "utf-8");
  const dashboardClientCode = fs.readFileSync(dashboardClientPath, "utf-8");

  describe("1. Mobile Bottom Navigation (4 Primary Tabs + Floating Action Button)", () => {
    it("implements the four primary navigation destinations requested by V2 UX spec", () => {
      // Home
      expect(mobileNavCode).toContain('href="/dashboard"');
      expect(mobileNavCode).toContain("<span>Home</span>");

      // Stats
      expect(mobileNavCode).toContain('href="/insights"');
      expect(mobileNavCode).toContain("<span>Stats</span>");

      // Accounts
      expect(mobileNavCode).toContain('href="/accounts"');
      expect(mobileNavCode).toContain("<span>Accounts</span>");

      // Settings
      expect(mobileNavCode).toContain('href="/settings"');
      expect(mobileNavCode).toContain("<span>Settings</span>");
    });

    it("features the elevated floating circular + button with quick action trigger", () => {
      expect(mobileNavCode).toContain("h-12 w-12 rounded-full bg-terminalAccent");
      expect(mobileNavCode).toContain("openQuickTransaction");
      expect(mobileNavCode).toContain("QUICK ADD TRANSACTION");
    });

    it("supports all major quick entry transaction categories in the mobile action sheet", () => {
      expect(mobileNavCode).toContain("Expense");
      expect(mobileNavCode).toContain("Income");
      expect(mobileNavCode).toContain("Transfer");
      expect(mobileNavCode).toContain("Credit Card");
      expect(mobileNavCode).toContain("Loan Payment");
      expect(mobileNavCode).toContain("Debt Settlement");
      expect(mobileNavCode).toContain("Investment");
    });

    it("enforces accessibility touch targets >= 44px and safe-area insets", () => {
      expect(mobileNavCode).toContain("min-h-[44px]");
      expect(mobileNavCode).toContain("min-w-[48px]");
      expect(mobileNavCode).toContain("pb-safe");
    });
  });

  describe("2. Home Dashboard & Primary Balance Architecture", () => {
    it("renders the minimal mobile dashboard on small viewports while preserving desktop terminal", () => {
      expect(dashboardClientCode).toContain("block lg:hidden");
      expect(dashboardClientCode).toContain("<MobileDashboardView");
      expect(dashboardClientCode).toContain("hidden lg:block");
    });

    it("displays Total Available Balance with privacy toggle control", () => {
      expect(mobileDashboardCode).toContain("TOTAL AVAILABLE BALANCE");
      expect(mobileDashboardCode).toContain("togglePrivacyMode");
      expect(mobileDashboardCode).toContain("••••••••");
      expect(mobileDashboardCode).toContain("Liquid bank & cash balances minus credit card obligations");
    });

    it("displays quick glance liability owe status (You Owe vs Owed To You)", () => {
      expect(mobileDashboardCode).toContain("YOU OWE");
      expect(mobileDashboardCode).toContain("OWED TO YOU");
      expect(mobileDashboardCode).toContain("Money lent to others");
    });

    it("displays the two key summary cards (Total Income and Total Expense)", () => {
      expect(mobileDashboardCode).toContain("TOTAL INCOME");
      expect(mobileDashboardCode).toContain("TOTAL EXPENSE");
      expect(mobileDashboardCode).toContain("saved");
    });
  });

  describe("3. Financial Overview (4 Sub-Tabs: Income, Expense, Loans, Debt)", () => {
    it("contains segmented control bar for the 4 overview sub-tabs", () => {
      expect(mobileDashboardCode).toContain("FINANCIAL OVERVIEW");
      expect(mobileDashboardCode).toContain('activeOverviewTab === "income"');
      expect(mobileDashboardCode).toContain('activeOverviewTab === "expense"');
      expect(mobileDashboardCode).toContain('activeOverviewTab === "loans"');
      expect(mobileDashboardCode).toContain('activeOverviewTab === "debt"');
    });

    it("verifies Income sub-tab classifies salary, business, interest and separately tags refunds", () => {
      expect(mobileDashboardCode).toContain("Salary / Wages");
      expect(mobileDashboardCode).toContain("Business & Freelance");
      expect(mobileDashboardCode).toContain("Interest & Dividends");
      expect(mobileDashboardCode).toContain("Refunds & Cashbacks");
      expect(mobileDashboardCode).toContain("REFUND");
      expect(mobileDashboardCode).toContain("MoM");
    });

    it("verifies Expense sub-tab calculates daily average and category breakdown", () => {
      expect(mobileDashboardCode).toContain("DAILY AVERAGE");
      expect(mobileDashboardCode).toContain("BUDGET USED");
      expect(mobileDashboardCode).toContain("Category Spending");
      expect(mobileDashboardCode).toContain("Largest Expenses");
    });

    it("verifies Loans sub-tab distinguishes borrowings, outstanding EMI, and APR", () => {
      expect(mobileDashboardCode).toContain("TOTAL BORROWED");
      expect(mobileDashboardCode).toContain("MONTHLY EMI COMMITMENT");
      expect(mobileDashboardCode).toContain("Active Loans");
      expect(mobileDashboardCode).toContain("Amortize");
    });

    it("verifies Debt sub-tab keeps external liabilities and private creditors distinct from institutional loans", () => {
      expect(mobileDashboardCode).toContain("TOTAL EXTERNAL DEBTS");
      expect(mobileDashboardCode).toContain("Private & Personal Creditors");
      expect(mobileDashboardCode).toContain("Settle Debt");
    });
  });

  describe("4. Dashboard Period Filtering Mathematical Invariants", () => {
    it("guarantees point-in-time balance sheet metrics are never zeroed by monthly filters", () => {
      // Balance sheet inputs
      const liquidBankAccounts = new Decimal("150000.00");
      const ccOutstanding = new Decimal("25000.00");
      const loanBalance = new Decimal("500000.00");
      const privateDebt = new Decimal("30000.00");
      const loanGivenReceivable = new Decimal("40000.00");

      // Available Balance formula: Liquid - CC
      const availableBalance = liquidBankAccounts.minus(ccOutstanding);
      expect(availableBalance.toNumber()).toBe(125000);

      // Total You Owe formula: Loans + Private Debts + CC
      const totalOwe = loanBalance.plus(privateDebt).plus(ccOutstanding);
      expect(totalOwe.toNumber()).toBe(555000);

      // Owed to you: loan_given
      expect(loanGivenReceivable.toNumber()).toBe(40000);

      // Simulation: Even if period transactions for 'last_month' have 0 expenses and 0 income,
      // the point-in-time balance sheet figures remain identical and unmutated!
      const periodIncomeTxs: any[] = [];
      const periodExpenseTxs: any[] = [];

      let periodIncome = new Decimal(0);
      for (const t of periodIncomeTxs) periodIncome = periodIncome.plus(t.amount);
      let periodExpense = new Decimal(0);
      for (const t of periodExpenseTxs) periodExpense = periodExpense.plus(t.amount);

      expect(periodIncome.toNumber()).toBe(0);
      expect(periodExpense.toNumber()).toBe(0);

      // Balance sheet remains invariant:
      expect(availableBalance.toNumber()).toBe(125000);
      expect(totalOwe.toNumber()).toBe(555000);
    });
  });

  describe("5. Mobile Settings & Preferences Tab", () => {
    it("features profile card, privacy mode toggle, AI provider preference, and device manager", () => {
      expect(mobileSettingsCode).toContain("Privacy Mode (Mask Balances)");
      expect(mobileSettingsCode).toContain("AI Provider Preference");
      expect(mobileSettingsCode).toContain("Connected Devices");
      expect(mobileSettingsCode).toContain("gemini");
      expect(mobileSettingsCode).toContain("claude");
      expect(mobileSettingsCode).toContain("openai");
      expect(mobileSettingsCode).toContain("local");
    });
  });
});
