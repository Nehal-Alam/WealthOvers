"use client";

import * as React from "react";
import Link from "next/link";
import { format, subMonths, isSameMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Scale,
  Landmark,
  Eye,
  EyeOff,
  Bell,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Percent,
  Clock,
  Sparkles,
  ChevronRight,
  HandCoins,
  Repeat,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { useUIStore } from "@/stores/ui-store";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  toDecimal,
  getTransactionDisplayInfo,
} from "@/lib/calculations/financial";
import {
  DateDurationFilter,
  getDateRangeFromFilter,
  filterTransactionsByDateRange,
} from "@/lib/calculations/date-ranges";
import Decimal from "decimal.js";

interface MobileDashboardViewProps {
  userName?: string;
  accounts: Tables<"accounts">[];
  recentTransactions: any[];
  allTransactions?: any[];
  categories: Tables<"categories">[];
  activeBudget?: any | null;
  upcomingRecurring?: any[];
  loans?: any[];
  liabilities?: any[];
  creditCards?: any[];
  precomputedSummary?: any;
}

export type OverviewTab = "income" | "expense" | "loans" | "debt";

export function MobileDashboardView({
  userName = "Investor",
  accounts,
  recentTransactions,
  allTransactions = [],
  categories,
  activeBudget,
  upcomingRecurring = [],
  loans = [],
  liabilities = [],
  creditCards = [],
  precomputedSummary,
}: MobileDashboardViewProps) {
  const { isPrivacyMode, togglePrivacyMode, openQuickTransaction } = useUIStore();

  // Period Filter State (defaults to "this_month")
  const [selectedDuration, setSelectedDuration] =
    React.useState<DateDurationFilter>("this_month");
  const [activeOverviewTab, setActiveOverviewTab] =
    React.useState<OverviewTab>("income");
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");
  const [showCustomInputs, setShowCustomInputs] = React.useState<boolean>(false);

  // Period date boundaries
  const dateRange = React.useMemo(() => {
    return getDateRangeFromFilter(selectedDuration);
  }, [selectedDuration]);

  // Master transaction pool (combines allTransactions and recentTransactions)
  const masterTransactions = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const t of allTransactions) map.set(t.id, t);
    for (const t of recentTransactions) map.set(t.id, t);
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    );
  }, [allTransactions, recentTransactions]);

  // Filtered transactions for the selected period
  const periodTransactions = React.useMemo(() => {
    if (selectedDuration === "custom" && customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      return masterTransactions.filter((t) => {
        const d = new Date(t.transaction_date);
        return d >= s && d <= e;
      });
    }
    return filterTransactionsByDateRange(masterTransactions, dateRange);
  }, [masterTransactions, selectedDuration, dateRange, customStart, customEnd]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. POINT-IN-TIME BALANCE SHEET METRICS (Never filtered by period)
  // ──────────────────────────────────────────────────────────────────────────
  const {
    totalAvailableBalance,
    totalLiquidBank,
    totalCreditOutstanding,
    totalBorrowedLoans,
    totalOutstandingLoans,
    totalExternalDebts,
    totalOwedToYou,
    totalYouOwe,
  } = React.useMemo(() => {
    let liquid = new Decimal(0);
    const activeAccounts = accounts.filter((a) => !a.is_archived);

    for (const a of activeAccounts) {
      if (a.account_type !== "credit_card" && a.account_type !== "loan_account") {
        liquid = liquid.plus(toDecimal(a.current_balance || 0));
      }
    }

    // Credit card current outstanding
    let ccOutstanding = new Decimal(0);
    for (const cc of creditCards) {
      ccOutstanding = ccOutstanding.plus(toDecimal(cc.current_outstanding || 0));
    }

    // Total Available = Liquid Bank/Cash - Credit Card Outstanding
    const available = liquid.minus(ccOutstanding);

    // Loans: distinguish borrowing vs lending (receivables)
    let borrowedPrincipal = new Decimal(0);
    let outstandingLoans = new Decimal(0);
    let receivables = new Decimal(0);

    for (const l of loans) {
      const bal = toDecimal(l.outstanding_balance || 0);
      const principal = toDecimal(l.principal_amount || l.outstanding_balance || 0);

      if (l.loan_type === "loan_given" || l.loan_type === "lending") {
        // Money lent to someone else: RECEIVABLE
        receivables = receivables.plus(bal);
      } else {
        // Loan borrowed: LIABILITY
        borrowedPrincipal = borrowedPrincipal.plus(principal);
        outstandingLoans = outstandingLoans.plus(bal);
      }
    }

    // External liabilities (Private debts, friends/family debts)
    let extDebts = new Decimal(0);
    for (const d of liabilities) {
      extDebts = extDebts.plus(toDecimal(d.outstanding_amount || 0));
    }

    // Total liabilities owed by user
    const totalOwe = outstandingLoans.plus(extDebts).plus(ccOutstanding);

    return {
      totalAvailableBalance: available.toNumber(),
      totalLiquidBank: liquid.toNumber(),
      totalCreditOutstanding: ccOutstanding.toNumber(),
      totalBorrowedLoans: borrowedPrincipal.toNumber(),
      totalOutstandingLoans: outstandingLoans.toNumber(),
      totalExternalDebts: extDebts.toNumber(),
      totalOwedToYou: receivables.toNumber(),
      totalYouOwe: totalOwe.toNumber(),
    };
  }, [accounts, creditCards, loans, liabilities]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PERIOD-FILTERED TRANSACTION METRICS (Respond to Selected Duration)
  // ──────────────────────────────────────────────────────────────────────────
  const {
    totalIncome,
    totalExpense,
    savingsRatePct,
    incomeBreakdown,
    categoryExpenses,
    dailySpendingAvg,
    largestExpenses,
    refundsTotal,
    periodIncomeTransactions,
    periodExpenseTransactions,
  } = React.useMemo(() => {
    let incomeSum = new Decimal(0);
    let expenseSum = new Decimal(0);
    let refundSum = new Decimal(0);

    let salarySum = new Decimal(0);
    let businessSum = new Decimal(0);
    let interestSum = new Decimal(0);
    let otherIncomeSum = new Decimal(0);

    const categoryMap = new Map<string, { total: Decimal; count: number }>();
    const expTxList: any[] = [];
    const incTxList: any[] = [];

    for (const t of periodTransactions) {
      const amt = toDecimal(t.amount || 0);
      const type = t.transaction_type;

      if (type === "income") {
        incomeSum = incomeSum.plus(amt);
        incTxList.push(t);

        const desc = (t.description || "").toLowerCase();
        if (desc.includes("salary") || desc.includes("wage") || desc.includes("payroll")) {
          salarySum = salarySum.plus(amt);
        } else if (desc.includes("business") || desc.includes("client") || desc.includes("freelance")) {
          businessSum = businessSum.plus(amt);
        } else if (desc.includes("interest") || desc.includes("dividend")) {
          interestSum = interestSum.plus(amt);
        } else {
          otherIncomeSum = otherIncomeSum.plus(amt);
        }
      } else if (type === "refund") {
        // Separately classified refunds
        refundSum = refundSum.plus(amt);
        incTxList.push(t);
      } else if (type === "expense") {
        expenseSum = expenseSum.plus(amt);
        expTxList.push(t);

        const catName = t.category?.name || "Other Expenses";
        const curr = categoryMap.get(catName) || { total: new Decimal(0), count: 0 };
        curr.total = curr.total.plus(amt);
        curr.count += 1;
        categoryMap.set(catName, curr);
      }
    }

    const netIncome = incomeSum.plus(refundSum);
    const savingsPct =
      netIncome.greaterThan(0)
        ? Math.max(
            0,
            Math.round(
              netIncome.minus(expenseSum).dividedBy(netIncome).toNumber() * 100
            )
          )
        : 0;

    // Category sorting
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([name, stat]) => ({
        name,
        amount: stat.total.toNumber(),
        count: stat.count,
        percent: expenseSum.greaterThan(0)
          ? Math.round((stat.total.toNumber() / expenseSum.toNumber()) * 100)
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Days in selected period
    let days = 30;
    if (dateRange.start && dateRange.end) {
      const diff = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24)
      );
      days = Math.max(1, Math.min(diff, 365));
    }
    const dailyAvg = expenseSum.toNumber() / days;

    // Largest single expenses in period
    const topExpenses = [...expTxList]
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 3);

    return {
      totalIncome: netIncome.toNumber(),
      totalExpense: expenseSum.toNumber(),
      savingsRatePct: savingsPct,
      refundsTotal: refundSum.toNumber(),
      incomeBreakdown: {
        salary: salarySum.toNumber(),
        business: businessSum.toNumber(),
        interest: interestSum.toNumber(),
        refunds: refundSum.toNumber(),
        other: otherIncomeSum.toNumber(),
      },
      categoryExpenses: sortedCategories,
      dailySpendingAvg: Math.round(dailyAvg),
      largestExpenses: topExpenses,
      periodIncomeTransactions: incTxList.slice(0, 5),
      periodExpenseTransactions: expTxList.slice(0, 5),
    };
  }, [periodTransactions, dateRange]);

  // Month-over-Month income delta calculation
  const momIncomeDelta = React.useMemo(() => {
    const lastMonthStart = subMonths(new Date(), 1);
    const lastMonthTxs = masterTransactions.filter((t) =>
      isSameMonth(new Date(t.transaction_date), lastMonthStart)
    );
    let lastMonthIncome = new Decimal(0);
    for (const t of lastMonthTxs) {
      if (t.transaction_type === "income" || t.transaction_type === "refund") {
        lastMonthIncome = lastMonthIncome.plus(toDecimal(t.amount || 0));
      }
    }
    const lastNum = lastMonthIncome.toNumber();
    if (lastNum <= 0) return null;
    const delta = ((totalIncome - lastNum) / lastNum) * 100;
    return Number(delta.toFixed(1));
  }, [masterTransactions, totalIncome]);

  // Budget Utilization
  const budgetUtilizationPct = React.useMemo(() => {
    if (!activeBudget || !activeBudget.total_amount) return null;
    const total = parseFloat(activeBudget.total_amount);
    if (total <= 0) return null;
    return Math.min(Math.round((totalExpense / total) * 100), 100);
  }, [activeBudget, totalExpense]);

  // Recurring monthly bills sum
  const recurringMonthlySum = React.useMemo(() => {
    let sum = 0;
    for (const r of upcomingRecurring) {
      sum += parseFloat(r.amount || 0);
    }
    return sum;
  }, [upcomingRecurring]);

  // Monthly Loan EMI total
  const monthlyLoanEmiSum = React.useMemo(() => {
    let sum = 0;
    for (const l of loans) {
      if (l.loan_type !== "loan_given") {
        sum += parseFloat(l.monthly_emi || 0);
      }
    }
    return sum;
  }, [loans]);

  const PERIOD_OPTIONS: Array<{ id: DateDurationFilter; label: string }> = [
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "financial_year", label: "This FY" },
    { id: "previous_year", label: "Last FY" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="lg:hidden flex flex-col space-y-4 max-w-md mx-auto pb-6">
      {/* ─────────────────────────────────────────────────────────────
          1. MINIMAL MOBILE HEADER
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-terminalAccent/15 border border-terminalAccent/30 text-terminalAccent flex items-center justify-center font-mono font-bold text-sm">
            W
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-text-primary font-mono leading-none">
              WEALTHOVERS
            </h1>
            <p className="text-[11px] text-text-secondary font-mono mt-0.5">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Notification Icon */}
          <Link
            href="/insights"
            className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-95 transition-all relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-terminalAccent" />
          </Link>

          {/* Profile Access */}
          <Link
            href="/settings"
            className="h-9 w-9 rounded-full bg-surface-elevated border border-border text-terminalAccent flex items-center justify-center text-xs font-bold font-mono active:scale-95 transition-all"
            title="Profile & Settings"
          >
            {userName.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DASHBOARD PERIOD FILTER BAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = selectedDuration === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                setSelectedDuration(opt.id);
                setShowCustomInputs(opt.id === "custom");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                isActive
                  ? "bg-terminalAccent text-app-bg font-bold shadow-xs"
                  : "bg-surface border border-border/80 text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Optional Custom Date Range Inputs */}
      {showCustomInputs && (
        <div className="p-3 bg-surface border border-border rounded-xl space-y-2 text-xs">
          <p className="text-[11px] font-mono text-text-secondary">Custom Range:</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-surface-elevated border border-border rounded-lg p-2 text-xs font-mono text-text-primary"
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-surface-elevated border border-border rounded-lg p-2 text-xs font-mono text-text-primary"
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. PRIMARY BALANCE CARD (Available Money + Owe Summary)
      ────────────────────────────────────────────────────────────── */}
      <Card className="bg-surface border-border shadow-xs overflow-hidden rounded-2xl relative">
        <div className="h-1 bg-gradient-to-r from-terminalAccent via-positive to-terminalAccent" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Wallet className="h-4 w-4 text-terminalAccent" />
              <span className="text-[11px] font-mono tracking-wider uppercase text-text-secondary">
                TOTAL AVAILABLE BALANCE
              </span>
            </div>
            <button
              onClick={togglePrivacyMode}
              className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={isPrivacyMode ? "Show balances" : "Hide balances"}
              aria-label="Toggle privacy"
            >
              {isPrivacyMode ? (
                <EyeOff className="h-4 w-4 text-terminalAccent" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <div>
            <div className="text-3xl font-mono font-bold tracking-tight text-text-primary tabular-nums">
              {isPrivacyMode ? (
                "••••••••"
              ) : (
                `₹${totalAvailableBalance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
            <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              <span>Liquid bank & cash balances minus credit card obligations</span>
            </p>
          </div>

          {/* Quick Balance Sheet Owe Indicators */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <div className="p-2 rounded-xl bg-surface-elevated/60 border border-border/40">
              <span className="text-[10px] font-mono text-text-secondary uppercase block">
                YOU OWE
              </span>
              <span className="text-xs font-mono font-bold text-negative tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalYouOwe.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[9px] text-text-secondary block">
                Loans + private debts
              </span>
            </div>

            <div className="p-2 rounded-xl bg-surface-elevated/60 border border-border/40">
              <span className="text-[10px] font-mono text-text-secondary uppercase block">
                OWED TO YOU
              </span>
              <span className="text-xs font-mono font-bold text-positive tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalOwedToYou.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[9px] text-text-secondary block">
                Money lent to others
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          4. TWO KEY SUMMARY CARDS (Income & Expense)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Income */}
        <div className="p-3.5 rounded-2xl bg-surface border border-border/90 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
              TOTAL INCOME
            </span>
            <div className="h-6 w-6 rounded-full bg-positive/10 text-positive flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-positive tabular-nums">
            {isPrivacyMode
              ? "••••••"
              : `₹${totalIncome.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
          </div>
          <p className="text-[10px] text-text-secondary font-mono">
            {dateRange.label}
          </p>
        </div>

        {/* Total Expense */}
        <div className="p-3.5 rounded-2xl bg-surface border border-border/90 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
              TOTAL EXPENSE
            </span>
            <div className="h-6 w-6 rounded-full bg-negative/10 text-negative flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-mono font-bold text-negative tabular-nums">
            {isPrivacyMode
              ? "••••••"
              : `₹${totalExpense.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary">
            <span>{dateRange.label}</span>
            {savingsRatePct > 0 && (
              <span className="text-positive font-bold">
                {savingsRatePct}% saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. FINANCIAL OVERVIEW SECTION (4 SUB-TABS: INCOME, EXPENSE, LOANS, DEBT)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-terminalAccent" />
            FINANCIAL OVERVIEW
          </h2>
          <span className="text-[11px] font-mono text-text-secondary">
            {dateRange.label}
          </span>
        </div>

        {/* Segmented Control Bar */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface-elevated/80 border border-border rounded-xl">
          {(["income", "expense", "loans", "debt"] as OverviewTab[]).map((tab) => {
            const isActive = activeOverviewTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveOverviewTab(tab)}
                className={`py-2 text-[11px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer min-h-[38px] flex items-center justify-center ${
                  isActive
                    ? "bg-surface text-terminalAccent shadow-xs border border-border"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SUB-TAB 1: INCOME
        ────────────────────────────────────────────────────────────── */}
        {activeOverviewTab === "income" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <Card className="bg-surface border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-xs font-mono font-bold text-text-primary">
                  Income Streams
                </span>
                {momIncomeDelta !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono py-0 h-5 ${
                      momIncomeDelta >= 0
                        ? "border-positive text-positive bg-positive/10"
                        : "border-negative text-negative bg-negative/10"
                    }`}
                  >
                    {momIncomeDelta >= 0 ? "+" : ""}
                    {momIncomeDelta}% MoM
                  </Badge>
                )}
              </div>

              {/* Streams List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">Salary / Wages</span>
                  <span className="font-mono font-semibold text-text-primary tabular-nums">
                    ₹{incomeBreakdown.salary.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">Business & Freelance</span>
                  <span className="font-mono font-semibold text-text-primary tabular-nums">
                    ₹{incomeBreakdown.business.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">Interest & Dividends</span>
                  <span className="font-mono font-semibold text-text-primary tabular-nums">
                    ₹{incomeBreakdown.interest.toLocaleString("en-IN")}
                  </span>
                </div>
                {incomeBreakdown.refunds > 0 && (
                  <div className="flex items-center justify-between py-1 text-info">
                    <span className="flex items-center gap-1">
                      <span>Refunds & Cashbacks</span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-info/40">
                        REFUND
                      </Badge>
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      ₹{incomeBreakdown.refunds.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">Other Inflows</span>
                  <span className="font-mono font-semibold text-text-primary tabular-nums">
                    ₹{incomeBreakdown.other.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </Card>

            {/* Income Transactions History */}
            <Card className="bg-surface border-border p-4 rounded-xl space-y-2">
              <span className="text-xs font-mono font-bold text-text-primary block">
                Recent Inflows
              </span>
              {periodIncomeTransactions.length === 0 ? (
                <p className="text-xs text-text-secondary py-2 text-center">
                  No income entries recorded in this period.
                </p>
              ) : (
                <div className="divide-y divide-border/40 text-xs">
                  {periodIncomeTransactions.map((tx) => (
                    <div key={tx.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary truncate max-w-[180px]">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-text-secondary font-mono">
                          {format(new Date(tx.transaction_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-positive tabular-nums">
                        +₹{parseFloat(tx.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SUB-TAB 2: EXPENSE
        ────────────────────────────────────────────────────────────── */}
        {activeOverviewTab === "expense" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Daily Avg & Budget Progress */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-surface border border-border rounded-xl">
                <span className="text-[10px] font-mono text-text-secondary block">
                  DAILY AVERAGE
                </span>
                <span className="text-sm font-mono font-bold text-text-primary tabular-nums">
                  ₹{dailySpendingAvg.toLocaleString("en-IN")} / day
                </span>
              </div>
              <div className="p-3 bg-surface border border-border rounded-xl">
                <span className="text-[10px] font-mono text-text-secondary block">
                  BUDGET USED
                </span>
                <span className="text-sm font-mono font-bold text-terminalAccent tabular-nums">
                  {budgetUtilizationPct !== null ? `${budgetUtilizationPct}%` : "No Active Budget"}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <Card className="bg-surface border-border p-4 rounded-xl space-y-3">
              <span className="text-xs font-mono font-bold text-text-primary block">
                Category Spending
              </span>
              {categoryExpenses.length === 0 ? (
                <p className="text-xs text-text-secondary py-2 text-center">
                  No expenses recorded in this period.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {categoryExpenses.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-primary font-medium">{cat.name}</span>
                        <span className="font-mono font-semibold text-text-primary tabular-nums">
                          ₹{cat.amount.toLocaleString("en-IN")} ({cat.percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-terminalAccent rounded-full"
                          style={{ width: `${Math.min(cat.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Largest Expenses */}
            {largestExpenses.length > 0 && (
              <Card className="bg-surface border-border p-4 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold text-text-primary block">
                  Largest Expenses
                </span>
                <div className="divide-y divide-border/40 text-xs">
                  {largestExpenses.map((tx) => (
                    <div key={tx.id} className="py-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary truncate max-w-[180px]">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-text-secondary font-mono">
                          {format(new Date(tx.transaction_date), "dd MMM")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-negative tabular-nums">
                        -₹{parseFloat(tx.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SUB-TAB 3: LOANS
        ────────────────────────────────────────────────────────────── */}
        {activeOverviewTab === "loans" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Loan Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-surface border border-border rounded-xl">
                <span className="text-[10px] font-mono text-text-secondary block">
                  TOTAL BORROWED
                </span>
                <span className="text-sm font-mono font-bold text-text-primary tabular-nums">
                  ₹{totalBorrowedLoans.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-3 bg-surface border border-border rounded-xl">
                <span className="text-[10px] font-mono text-text-secondary block">
                  MONTHLY EMI COMMITMENT
                </span>
                <span className="text-sm font-mono font-bold text-terminalAccent tabular-nums">
                  ₹{monthlyLoanEmiSum.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Active Loans Cards */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-text-primary block">
                Active Loans ({loans.filter((l) => l.loan_type !== "loan_given").length})
              </span>
              {loans.filter((l) => l.loan_type !== "loan_given").length === 0 ? (
                <div className="p-4 bg-surface border border-dashed border-border rounded-xl text-center text-xs text-text-secondary">
                  No active loans recorded.
                </div>
              ) : (
                loans
                  .filter((l) => l.loan_type !== "loan_given")
                  .map((loan) => (
                    <Card key={loan.id} className="bg-surface border-border p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {loan.lender_or_borrower_name}
                          </p>
                          <p className="text-[10px] font-mono text-text-secondary capitalize">
                            {loan.loan_type?.replace(/_/g, " ")} • {loan.annual_interest_rate}% APR
                          </p>
                        </div>
                        <Link href="/loans">
                          <Button size="sm" variant="outline" className="h-7 text-[11px] font-mono">
                            Amortize
                          </Button>
                        </Link>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                        <span className="text-text-secondary">Outstanding</span>
                        <span className="font-mono font-bold text-negative tabular-nums">
                          ₹{parseFloat(loan.outstanding_balance || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Monthly EMI</span>
                        <span className="font-mono font-medium text-text-primary tabular-nums">
                          ₹{parseFloat(loan.monthly_emi || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </Card>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            SUB-TAB 4: DEBT (External Liabilities, Friends & Family)
        ────────────────────────────────────────────────────────────── */}
        {activeOverviewTab === "debt" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Debt Metrics */}
            <div className="p-3.5 bg-surface border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-text-secondary block">
                  TOTAL EXTERNAL DEBTS
                </span>
                <span className="text-base font-mono font-bold text-negative tabular-nums">
                  ₹{totalExternalDebts.toLocaleString("en-IN")}
                </span>
              </div>
              <Link href="/loans?tab=debts">
                <Button size="sm" className="h-8 text-xs font-mono bg-terminalAccent text-app-bg">
                  Settle Debt
                </Button>
              </Link>
            </div>

            {/* Creditor List */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-text-primary block">
                Private & Personal Creditors ({liabilities.length})
              </span>
              {liabilities.length === 0 ? (
                <div className="p-4 bg-surface border border-dashed border-border rounded-xl text-center text-xs text-text-secondary">
                  No private debts recorded. Your external liabilities balance is zero.
                </div>
              ) : (
                liabilities.map((debt) => (
                  <Card key={debt.id} className="bg-surface border-border p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-text-primary">{debt.name}</p>
                        <p className="text-[10px] font-mono text-text-secondary">
                          {debt.category || "Personal Debt"} {debt.due_date ? `• Due ${debt.due_date}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono text-negative border-negative/30">
                        OUTSTANDING
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="text-text-secondary">Amount Due</span>
                      <span className="font-mono font-bold text-negative tabular-nums">
                        ₹{parseFloat(debt.outstanding_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
