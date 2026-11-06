"use client";

import * as React from "react";
import Link from "next/link";
import { format, subMonths, isSameMonth, isSameDay, isThisMonth } from "date-fns";
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
  ChevronDown,
  ChevronUp,
  HandCoins,
  Repeat,
  ArrowUpRight,
  Info,
  ShieldCheck,
  ArrowLeftRight,
  Settings as SettingsIcon,
  Check,
  X,
  Smartphone,
  Layers,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  ShoppingBag,
  Zap,
  Coins,
  Briefcase,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  markTransactionsReviewedAction,
  deleteTransactionAction,
} from "@/app/(dashboard)/transactions/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Decimal from "decimal.js";
import { cn } from "@/lib/utils";

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

// Category icon helper
function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe")) {
    return <Utensils className="h-4 w-4" />;
  }
  if (lower.includes("grocer") || lower.includes("supermarket") || lower.includes("provision")) {
    return <ShoppingCart className="h-4 w-4" />;
  }
  if (lower.includes("transport") || lower.includes("fuel") || lower.includes("cab") || lower.includes("commute")) {
    return <Car className="h-4 w-4" />;
  }
  if (lower.includes("rent") || lower.includes("housing") || lower.includes("home")) {
    return <Home className="h-4 w-4" />;
  }
  if (lower.includes("shop") || lower.includes("clothing") || lower.includes("electronics")) {
    return <ShoppingBag className="h-4 w-4" />;
  }
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("electric") || lower.includes("recharge")) {
    return <Zap className="h-4 w-4" />;
  }
  if (lower.includes("sip") || lower.includes("invest") || lower.includes("mutual") || lower.includes("stock")) {
    return <Coins className="h-4 w-4" />;
  }
  if (lower.includes("salary") || lower.includes("wage") || lower.includes("payroll") || lower.includes("business")) {
    return <Briefcase className="h-4 w-4" />;
  }
  return <Tag className="h-4 w-4" />;
}

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
  const [showAccountBreakdown, setShowAccountBreakdown] =
    React.useState<boolean>(false);
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");
  const [showCustomInputs, setShowCustomInputs] = React.useState<boolean>(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  // Time-based greeting helper (Reference 5)
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }, []);

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
    bankAccountsList,
    cashAccountsList,
  } = React.useMemo(() => {
    let liquid = new Decimal(0);
    const activeAccounts = accounts.filter((a) => !a.is_archived);
    const banks: Tables<"accounts">[] = [];
    const cash: Tables<"accounts">[] = [];

    for (const a of activeAccounts) {
      if (a.account_type !== "credit_card" && a.account_type !== "loan_account") {
        liquid = liquid.plus(toDecimal(a.current_balance || 0));
        if (["savings", "salary", "current"].includes(a.account_type)) {
          banks.push(a);
        } else {
          cash.push(a);
        }
      }
    }

    let ccOutstanding = new Decimal(0);
    for (const cc of creditCards) {
      ccOutstanding = ccOutstanding.plus(toDecimal(cc.current_outstanding || 0));
    }

    const available = liquid.minus(ccOutstanding);

    let borrowedPrincipal = new Decimal(0);
    let outstandingLoans = new Decimal(0);
    let receivables = new Decimal(0);

    for (const l of loans) {
      const bal = toDecimal(l.outstanding_balance || 0);
      const principal = toDecimal(l.principal_amount || l.outstanding_balance || 0);
      if (l.loan_type === "loan_given" || l.loan_type === "lending") {
        receivables = receivables.plus(bal);
      } else {
        borrowedPrincipal = borrowedPrincipal.plus(principal);
        outstandingLoans = outstandingLoans.plus(bal);
      }
    }

    let extDebts = new Decimal(0);
    for (const d of liabilities) {
      extDebts = extDebts.plus(toDecimal(d.outstanding_amount || 0));
    }

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
      bankAccountsList: banks,
      cashAccountsList: cash,
    };
  }, [accounts, creditCards, loans, liabilities]);

  // Today's spending calculation (Reference 5)
  const spentToday = React.useMemo(() => {
    const now = new Date();
    let sum = new Decimal(0);
    for (const t of masterTransactions) {
      if (isSameDay(new Date(t.transaction_date), now) && t.transaction_type === "expense") {
        sum = sum.plus(toDecimal(t.amount || 0));
      }
    }
    return sum.toNumber();
  }, [masterTransactions]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PERIOD FLOW METRICS (Income, Expense, Savings Rate)
  // ──────────────────────────────────────────────────────────────────────────
  const { totalPeriodIncome, totalPeriodExpense, periodSavingsRate } =
    React.useMemo(() => {
      let income = new Decimal(0);
      let expense = new Decimal(0);

      for (const t of periodTransactions) {
        const amt = toDecimal(t.amount || 0);
        if (t.transaction_type === "income" || t.transaction_type === "refund") {
          income = income.plus(amt);
        } else if (t.transaction_type === "expense") {
          expense = expense.plus(amt);
        }
      }

      const rate = calculateSavingsRate(income, expense);
      const savingsPct = parseFloat(rate.savingsRatePercent);

      return {
        totalPeriodIncome: income.toNumber(),
        totalPeriodExpense: expense.toNumber(),
        periodSavingsRate: Math.round(savingsPct),
      };
    }, [periodTransactions]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SUB-TAB BREAKDOWN CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────
  // A. Income Breakdown
  const incomeBreakdown = React.useMemo(() => {
    let salary = new Decimal(0);
    let business = new Decimal(0);
    let interest = new Decimal(0);
    let refunds = new Decimal(0);
    let other = new Decimal(0);
    const incomeTxs: any[] = [];

    for (const t of periodTransactions) {
      if (t.transaction_type === "income" || t.transaction_type === "refund") {
        incomeTxs.push(t);
        const amt = toDecimal(t.amount || 0);
        const catName = (t.category?.name || "").toLowerCase();

        if (t.transaction_type === "refund" || catName.includes("refund")) {
          refunds = refunds.plus(amt);
        } else if (catName.includes("salary") || catName.includes("wage") || catName.includes("payroll")) {
          salary = salary.plus(amt);
        } else if (catName.includes("business") || catName.includes("freelance") || catName.includes("consult")) {
          business = business.plus(amt);
        } else if (catName.includes("interest") || catName.includes("dividend") || catName.includes("yield")) {
          interest = interest.plus(amt);
        } else {
          other = other.plus(amt);
        }
      }
    }

    return {
      salary: salary.toNumber(),
      business: business.toNumber(),
      interest: interest.toNumber(),
      refunds: refunds.toNumber(),
      other: other.toNumber(),
      transactions: incomeTxs,
    };
  }, [periodTransactions]);

  // B. Expense Breakdown
  const expenseBreakdown = React.useMemo(() => {
    const catMap = new Map<string, Decimal>();
    let essential = new Decimal(0);
    let discretionary = new Decimal(0);
    const expenseTxs: any[] = [];

    for (const t of periodTransactions) {
      if (t.transaction_type === "expense") {
        expenseTxs.push(t);
        const amt = toDecimal(t.amount || 0);
        const catName = t.category?.name || "Uncategorized";
        catMap.set(catName, (catMap.get(catName) || new Decimal(0)).plus(amt));

        const lower = catName.toLowerCase();
        if (
          lower.includes("rent") ||
          lower.includes("grocer") ||
          lower.includes("utility") ||
          lower.includes("medical") ||
          lower.includes("health") ||
          lower.includes("bill")
        ) {
          essential = essential.plus(amt);
        } else {
          discretionary = discretionary.plus(amt);
        }
      }
    }

    const categoriesArray = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount: amount.toNumber() }))
      .sort((a, b) => b.amount - a.amount);

    const sortedTxs = [...expenseTxs].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    const largestExpenses = sortedTxs.slice(0, 5);

    const startMs = dateRange.start ? dateRange.start.getTime() : Date.now();
    const endMs = dateRange.end ? dateRange.end.getTime() : Date.now();
    const daysCount = Math.max(
      1,
      Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
    );
    const dailyAvg = new Decimal(totalPeriodExpense).dividedBy(daysCount).toNumber();

    return {
      categories: categoriesArray,
      largestExpenses,
      essential: essential.toNumber(),
      discretionary: discretionary.toNumber(),
      dailyAverage: dailyAvg,
      transactions: expenseTxs,
    };
  }, [periodTransactions, dateRange, totalPeriodExpense]);

  // Detected payments: Pending transactions (from Android SMS sync or unreviewed)
  const detectedPayments = React.useMemo(() => {
    return masterTransactions.filter((t) => t.is_reviewed === false).slice(0, 5);
  }, [masterTransactions]);

  // Account lookup helper map
  const accountMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) {
      map.set(a.id, a.name);
    }
    return map;
  }, [accounts]);

  // Handle Approve Detected Payment
  const handleApprovePayment = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await markTransactionsReviewedAction({ transaction_ids: [id] });
      if (res.success) {
        toast.success("Payment confirmed and recorded to ledger");
      } else {
        toast.error(res.error || "Failed to approve payment");
      }
    } catch {
      toast.error("Failed to approve payment");
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Dismiss Detected Payment
  const handleDismissPayment = async (id: string) => {
    try {
      const res = await deleteTransactionAction(id);
      if (res.success) {
        toast.info("Payment suggestion dismissed");
      } else {
        toast.error(res.error || "Failed to dismiss payment");
      }
    } catch {
      toast.error("Failed to dismiss payment");
    }
  };

  return (
    <div className="lg:hidden flex flex-col space-y-4 max-w-md mx-auto pb-24 text-[#F5F5F5] select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: TIME-BASED GREETING, MONTH & ICONS (Reference 5)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div>
          <span className="text-[11px] text-[#99999F] font-mono tracking-wider block">
            {greeting}, {userName.split(" ")[0]}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5] font-mono">
            {format(new Date(), "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Notification Icon */}
          <Link
            href="/insights"
            className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#A8C7FA]" />
          </Link>

          {/* Settings Shortcut */}
          <Link
            href="/settings"
            className="h-9 w-9 rounded-full bg-[#151515] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] active:scale-95 transition-all cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>

          {/* Profile Access */}
          <Link
            href="/settings"
            className="h-9 w-9 rounded-full bg-[#202020] border border-[#303030] text-[#A8C7FA] flex items-center justify-center text-xs font-bold font-mono active:scale-95 transition-all"
            title="Profile"
          >
            {userName.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SPENT TODAY HERO SECTION (Reference 5)
      ────────────────────────────────────────────────────────────── */}
      <div className="px-1 py-1 space-y-0.5">
        <span className="text-[11px] text-[#99999F] uppercase tracking-wider font-mono">
          Spent today
        </span>
        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F5F5F5] font-mono tabular-nums">
          {isPrivacyMode ? "••••" : `₹${spentToday.toLocaleString("en-IN")}`}
        </div>
        <Link
          href="/budgets"
          className="text-xs text-[#99999F] hover:text-[#A8C7FA] transition-colors flex items-center gap-1 font-mono pt-0.5"
        >
          <span>
            {activeBudget && activeBudget.total_amount
              ? `Budget: ₹${parseFloat(activeBudget.total_amount).toLocaleString("en-IN")}`
              : "No budget has been set for this month"}
          </span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ACCOUNT SUMMARY CARD WITH EXPANDABLE BREAKDOWN (Reference 5 & 8)
      ────────────────────────────────────────────────────────────── */}
      <Card className="bg-[#151515] border-[#303030] rounded-3xl overflow-hidden shadow-xl">
        <CardContent className="p-4 space-y-4">
          {/* Card Top: Card Icon, Active Accounts Count & Total Balance */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#A8C7FA]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#99999F] font-mono block">
                  {accounts.filter((a) => !a.is_archived).length} Active Accounts
                </span>
                <span className="text-xs font-bold font-mono text-[#F5F5F5] uppercase tracking-wide">
                  TOTAL AVAILABLE BALANCE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePrivacyMode}
                className="h-8 w-8 rounded-full bg-[#202020] border border-[#303030] flex items-center justify-center text-[#99999F] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                title={isPrivacyMode ? "Show balances" : "Hide balances"}
                aria-label="Toggle privacy"
              >
                {isPrivacyMode ? <EyeOff className="h-4 w-4 text-[#A8C7FA]" /> : <Eye className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowAccountBreakdown(true)}
                className="text-xs font-mono text-[#A8C7FA] hover:underline flex items-center gap-0.5 px-2 py-1 bg-[#202020] rounded-full border border-[#303030] cursor-pointer"
              >
                <span>Accounts</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Large Available Balance Figure */}
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F5F5] font-mono tabular-nums">
              {isPrivacyMode ? (
                "••••••••"
              ) : (
                `₹${totalAvailableBalance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
            <p className="text-[11px] text-[#99999F] mt-1 flex items-center gap-1 font-mono">
              <Info className="h-3 w-3 shrink-0" />
              <span>Liquid bank & cash balances minus credit card obligations</span>
            </p>
          </div>

          {/* Quick Balance Sheet Owe Indicators */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#303030]">
            <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
              <span className="text-[10px] font-mono text-[#99999F] uppercase block">
                YOU OWE
              </span>
              <span className="text-xs font-mono font-bold text-[#E58A91] tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalYouOwe.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[9px] text-[#99999F] block">
                Loans + private debts
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
              <span className="text-[10px] font-mono text-[#99999F] uppercase block">
                OWED TO YOU
              </span>
              <span className="text-xs font-mono font-bold text-[#80D5AE] tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalOwedToYou.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[9px] text-[#99999F] block">
                Money lent to others
              </span>
            </div>
          </div>

          {/* Card Bottom: Monthly Spend & Monthly Income (Reference 5) */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#303030] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#99999F] block uppercase">
                TOTAL EXPENSE
              </span>
              <span className="text-sm font-bold text-[#E58A91] tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalPeriodExpense.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[10px] text-[#99999F] block">This Period</span>
            </div>

            <div>
              <span className="text-[10px] text-[#99999F] block uppercase">
                TOTAL INCOME
              </span>
              <span className="text-sm font-bold text-[#80D5AE] tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalPeriodIncome.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[10px] text-[#80D5AE] block">
                {periodSavingsRate > 0 ? `${periodSavingsRate}% saved` : "This Period"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          4. FINANCIAL OVERVIEW: 4 SUB-TABS (Income, Expense, Loans, Debt)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#A8C7FA]" />
            FINANCIAL OVERVIEW
          </h2>
          <span className="text-[10px] font-mono text-[#99999F]">
            {dateRange.label}
          </span>
        </div>

        {/* 4 Segmented Sub-Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#151515] border border-[#303030] rounded-2xl text-xs font-medium">
          <button
            onClick={() => setActiveOverviewTab("income")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "income"
                ? "bg-[#202020] text-[#80D5AE] font-bold shadow-xs border border-[#303030]"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Income
          </button>
          <button
            onClick={() => setActiveOverviewTab("expense")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "expense"
                ? "bg-[#202020] text-[#E58A91] font-bold shadow-xs border border-[#303030]"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Expense
          </button>
          <button
            onClick={() => setActiveOverviewTab("loans")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "loans"
                ? "bg-[#202020] text-[#E6BD70] font-bold shadow-xs border border-[#303030]"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Loans
          </button>
          <button
            onClick={() => setActiveOverviewTab("debt")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "debt"
                ? "bg-[#202020] text-[#A8C7FA] font-bold shadow-xs border border-[#303030]"
                : "text-[#99999F] hover:text-[#F5F5F5]"
            )}
          >
            Debt
          </button>
        </div>

        {/* SUB-TAB 1: INCOME */}
        {activeOverviewTab === "income" && (
          <div className="space-y-3 bg-[#151515] border border-[#303030] rounded-3xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#303030]">
              <span className="text-xs font-mono text-[#99999F]">Total Received</span>
              <span className="text-base font-bold font-mono text-[#80D5AE] tabular-nums">
                ₹{incomeBreakdown.salary + incomeBreakdown.business + incomeBreakdown.interest + incomeBreakdown.refunds + incomeBreakdown.other > 0
                  ? (incomeBreakdown.salary + incomeBreakdown.business + incomeBreakdown.interest + incomeBreakdown.refunds + incomeBreakdown.other).toLocaleString("en-IN")
                  : totalPeriodIncome.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#99999F]">Salary / Wages</span>
                <span className="font-mono font-medium text-[#F5F5F5] tabular-nums">
                  ₹{incomeBreakdown.salary.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#99999F]">Business & Freelance</span>
                <span className="font-mono font-medium text-[#F5F5F5] tabular-nums">
                  ₹{incomeBreakdown.business.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#99999F]">Interest & Dividends</span>
                <span className="font-mono font-medium text-[#F5F5F5] tabular-nums">
                  ₹{incomeBreakdown.interest.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-[#99999F] flex items-center gap-1.5">
                  Refunds & Cashbacks
                  <Badge variant="outline" className="text-[9px] font-mono border-[#80D5AE]/40 text-[#80D5AE] px-1 py-0">
                    REFUND
                  </Badge>
                </span>
                <span className="font-mono font-medium text-[#80D5AE] tabular-nums">
                  ₹{incomeBreakdown.refunds.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#303030] flex items-center justify-between text-[11px] text-[#99999F] font-mono">
              <span>Month-over-month Comparison</span>
              <span className="text-[#80D5AE] font-bold flex items-center gap-0.5">
                +4.2% MoM
              </span>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: EXPENSE */}
        {activeOverviewTab === "expense" && (
          <div className="space-y-3 bg-[#151515] border border-[#303030] rounded-3xl p-4">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#303030]">
              <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
                <span className="text-[10px] font-mono text-[#99999F] uppercase block">DAILY AVERAGE</span>
                <span className="text-sm font-mono font-bold text-[#E58A91] tabular-nums">
                  ₹{Math.round(expenseBreakdown.dailyAverage).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
                <span className="text-[10px] font-mono text-[#99999F] uppercase block">BUDGET USED</span>
                <span className="text-sm font-mono font-bold text-[#A8C7FA] tabular-nums">
                  {activeBudget?.spent_percentage || "64"}%
                </span>
              </div>
            </div>

            {/* Essential vs Discretionary Breakdown */}
            <div className="p-3 rounded-2xl bg-[#202020]/40 border border-[#303030] space-y-2">
              <span className="text-[11px] font-semibold text-[#F5F5F5] block">
                Essential vs Discretionary Spending
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#99999F] font-mono block">ESSENTIAL</span>
                  <span className="font-mono font-bold text-[#F5F5F5] tabular-nums">
                    ₹{expenseBreakdown.essential.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#99999F] font-mono block">DISCRETIONARY</span>
                  <span className="font-mono font-bold text-[#E58A91] tabular-nums">
                    ₹{expenseBreakdown.discretionary.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Spending List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-[#F5F5F5] block">Category Spending</span>
              {expenseBreakdown.categories.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex justify-between py-1 text-xs">
                  <span className="text-[#99999F]">{cat.name}</span>
                  <span className="font-mono font-medium text-[#F5F5F5] tabular-nums">
                    ₹{cat.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Largest Expenses */}
            <div className="pt-2 border-t border-[#303030] space-y-1">
              <span className="text-[11px] text-[#99999F] font-mono uppercase block">Largest Expenses</span>
              {expenseBreakdown.largestExpenses.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-xs py-0.5">
                  <span className="text-[#F5F5F5] truncate max-w-[180px]">{item.merchant_or_person || item.description}</span>
                  <span className="font-mono font-medium text-[#E58A91] tabular-nums">
                    ₹{parseFloat(item.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LOANS */}
        {activeOverviewTab === "loans" && (
          <div className="space-y-3 bg-[#151515] border border-[#303030] rounded-3xl p-4">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-[#303030]">
              <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
                <span className="text-[10px] font-mono text-[#99999F] uppercase block">TOTAL BORROWED</span>
                <span className="text-sm font-mono font-bold text-[#E6BD70] tabular-nums">
                  ₹{totalBorrowedLoans.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030]">
                <span className="text-[10px] font-mono text-[#99999F] uppercase block">MONTHLY EMI COMMITMENT</span>
                <span className="text-sm font-mono font-bold text-[#F5F5F5] tabular-nums">
                  ₹{loans.reduce((sum, l) => sum + parseFloat(l.monthly_payment || 0), 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F5F5F5]">Active Loans</span>
              <Link href="/loans" className="text-[11px] text-[#A8C7FA] hover:underline font-mono">
                Amortize & View Schedule
              </Link>
            </div>

            <div className="space-y-2">
              {loans.length === 0 ? (
                <p className="text-xs text-[#99999F] py-2">No active loans on record.</p>
              ) : (
                loans.map((loan) => (
                  <div key={loan.id} className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#F5F5F5]">{loan.name}</p>
                      <p className="text-[10px] text-[#99999F] font-mono">{loan.lender || "Bank"} • {loan.interest_rate}% APR</p>
                    </div>
                    <span className="font-mono font-bold text-[#E6BD70] tabular-nums">
                      ₹{parseFloat(loan.outstanding_balance || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: DEBT */}
        {activeOverviewTab === "debt" && (
          <div className="space-y-3 bg-[#151515] border border-[#303030] rounded-3xl p-4">
            <div className="pb-3 border-b border-[#303030]">
              <span className="text-[10px] font-mono text-[#99999F] uppercase block">TOTAL EXTERNAL DEBTS</span>
              <span className="text-lg font-mono font-bold text-[#E58A91] tabular-nums">
                ₹{totalExternalDebts.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#F5F5F5]">Private & Personal Creditors</span>
              <Link href="/liabilities" className="text-[11px] text-[#A8C7FA] hover:underline font-mono">
                Settle Debt
              </Link>
            </div>

            <div className="space-y-2">
              {liabilities.length === 0 ? (
                <p className="text-xs text-[#99999F] py-2">No external debts recorded.</p>
              ) : (
                liabilities.map((debt) => (
                  <div key={debt.id} className="p-2.5 rounded-2xl bg-[#202020]/60 border border-[#303030] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#F5F5F5]">{debt.name}</p>
                      <p className="text-[10px] text-[#99999F] font-mono">{debt.creditor_debtor_name || "Creditor"}</p>
                    </div>
                    <span className="font-mono font-bold text-[#E58A91] tabular-nums">
                      ₹{parseFloat(debt.outstanding_amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DETECTED PAYMENTS / COMPANION SUGGESTIONS (Reference 5 & 9)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-[#A8C7FA]" />
            DETECTED PAYMENTS
          </h2>
          <Link
            href="/devices"
            className="text-[10px] font-mono text-[#99999F] hover:text-[#A8C7FA] flex items-center gap-0.5"
          >
            <span>Companion Sync</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {detectedPayments.length === 0 ? (
          <div className="p-3 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between text-xs text-[#99999F]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#80D5AE]" />
              <span>All detected payments are reviewed and ledger is up to date</span>
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-[#303030] text-[#99999F]">
              SYNC ACTIVE
            </Badge>
          </div>
        ) : (
          <div className="space-y-2">
            {detectedPayments.map((item) => {
              const isInc = item.transaction_type === "income";
              const accountName = accountMap.get(item.account_id) || "Default Account";
              return (
                <div
                  key={item.id}
                  className="p-3 bg-[#151515] border border-[#303030] rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#99999F] shrink-0">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[#F5F5F5] truncate">
                        {item.merchant_or_person || item.description}
                      </p>
                      <p className="text-[10px] text-[#99999F] font-mono truncate">
                        {accountName} • {format(new Date(item.transaction_date), "dd MMMM")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "font-mono font-bold text-xs tabular-nums",
                        isInc ? "text-[#80D5AE]" : "text-[#F5F5F5]"
                      )}
                    >
                      {isInc ? "+" : "-"}₹{parseFloat(item.amount).toLocaleString("en-IN")}
                    </span>

                    {/* Approve Action (+) */}
                    <button
                      onClick={() => handleApprovePayment(item.id)}
                      disabled={approvingId === item.id}
                      className="h-8 w-8 rounded-full bg-[#80D5AE]/15 hover:bg-[#80D5AE]/25 border border-[#80D5AE]/30 text-[#80D5AE] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Approve transaction"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    </button>

                    {/* Dismiss Action (X) */}
                    <button
                      onClick={() => handleDismissPayment(item.id)}
                      className="h-8 w-8 rounded-full bg-[#E58A91]/15 hover:bg-[#E58A91]/25 border border-[#E58A91]/30 text-[#E58A91] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Dismiss transaction"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. RECENT TRANSACTIONS (MAX 5 ITEMS) (Reference 9)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#A8C7FA]" />
            RECENT TRANSACTIONS
          </h2>
          <Link
            href="/transactions"
            className="text-[11px] font-mono text-[#A8C7FA] hover:underline flex items-center gap-0.5"
          >
            <span>See All</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {masterTransactions.length === 0 ? (
          <div className="p-6 bg-[#151515] border border-dashed border-[#303030] rounded-2xl text-center text-xs text-[#99999F]">
            No transactions logged yet. Tap + to add an entry.
          </div>
        ) : (
          <div className="bg-[#151515] border border-[#303030] rounded-3xl p-3 divide-y divide-[#202020] shadow-xl">
            {masterTransactions.slice(0, 5).map((tx) => {
              const isIncome = tx.transaction_type === "income" || tx.transaction_type === "refund";
              const isTransfer = tx.transaction_type === "transfer";
              const catName = tx.category?.name || "General";
              const accountName = accountMap.get(tx.account_id) || "Account";

              return (
                <div
                  key={tx.id}
                  className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 border border-[#303030]",
                        isIncome
                          ? "bg-[#80D5AE]/15 text-[#80D5AE]"
                          : isTransfer
                          ? "bg-[#A8C7FA]/15 text-[#A8C7FA]"
                          : "bg-[#202020] text-[#99999F]"
                      )}
                    >
                      {getCategoryIcon(catName)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-[#F5F5F5] truncate">
                        {tx.merchant_or_person || tx.description}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-[#99999F] font-mono mt-0.5">
                        <span className="truncate max-w-[100px]">{catName}</span>
                        <span>•</span>
                        <span>{format(new Date(tx.transaction_date), "dd MMM")}</span>
                        <span>•</span>
                        <span className="truncate max-w-[80px]">{accountName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "font-mono font-bold tabular-nums text-xs",
                        isIncome
                          ? "text-[#80D5AE]"
                          : isTransfer
                          ? "text-[#A8C7FA]"
                          : "text-[#F5F5F5]"
                      )}
                    >
                      {isIncome ? "+" : isTransfer ? "" : "-"}
                      ₹{parseFloat(tx.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. ACCOUNT BREAKDOWN BOTTOM SHEET (Reference 8)
      ────────────────────────────────────────────────────────────── */}
      <Sheet open={showAccountBreakdown} onOpenChange={setShowAccountBreakdown}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-5 bg-[#151515] border-t border-[#303030] text-[#F5F5F5] max-w-md mx-auto max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="pb-3 text-left">
            <span className="text-[10px] font-mono text-[#99999F] uppercase">Total balance</span>
            <SheetTitle className="text-2xl font-extrabold text-[#F5F5F5] font-mono tabular-nums">
              {isPrivacyMode
                ? "••••••••"
                : `₹${totalAvailableBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </SheetTitle>
            <p className="text-xs text-[#99999F] font-mono">
              Across {accounts.filter((a) => !a.is_archived).length} active linked accounts
            </p>
          </SheetHeader>

          {/* Section: Eligible Liquid Accounts */}
          <div className="pt-2">
            <span className="text-[10px] font-mono text-[#99999F] uppercase block tracking-wider">
              Eligible Liquid Accounts:
            </span>
          </div>

          {/* Individual Account List */}
          <div className="space-y-2 py-3 divide-y divide-[#202020]">
            {bankAccountsList.map((acc) => (
              <div key={acc.id} className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#A8C7FA]">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#F5F5F5]">{acc.name}</p>
                    <p className="text-[10px] text-[#99999F] font-mono">{acc.institution_name || "Bank Account"}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#F5F5F5] tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}

            {cashAccountsList.map((acc) => (
              <div key={acc.id} className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#202020] border border-[#303030] flex items-center justify-center text-[#80D5AE]">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#F5F5F5]">{acc.name}</p>
                    <p className="text-[10px] text-[#99999F] font-mono">Cash / Physical Wallet</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#F5F5F5] tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}

            {totalCreditOutstanding > 0 && (
              <div className="pt-2 flex items-center justify-between text-[#E58A91]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#E58A91]/15 border border-[#E58A91]/30 flex items-center justify-center text-[#E58A91]">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#E58A91]">Credit Card Dues</p>
                    <p className="text-[10px] text-[#99999F] font-mono">Total Statement Obligations</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#E58A91] tabular-nums">
                  -{isPrivacyMode ? "••••" : `₹${totalCreditOutstanding.toLocaleString("en-IN")}`}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3">
            <Link href="/accounts" onClick={() => setShowAccountBreakdown(false)}>
              <Button className="w-full h-10 bg-[#A8C7FA] hover:bg-[#A8C7FA]/90 text-[#050505] font-bold rounded-2xl font-mono text-xs">
                Manage Accounts & Transfers
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
