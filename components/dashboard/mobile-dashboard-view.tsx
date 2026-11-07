"use client";

import * as React from "react";
import Link from "next/link";
import { format, isSameDay } from "date-fns";
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
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  HandCoins,
  ArrowUpRight,
  Info,
  ShieldCheck,
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
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AccountSelector } from "@/components/accounts/account-selector";
import {
  calculateSavingsRate,
  toDecimal,
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
  const {
    isPrivacyMode,
    togglePrivacyMode,
    selectedAccountId,
    setSelectedAccountId,
  } = useUIStore();

  const [activeOverviewTab, setActiveOverviewTab] = React.useState<OverviewTab>("income");
  const [showAccountBreakdown, setShowAccountBreakdown] = React.useState<boolean>(false);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);

  // Time-based greeting helper
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }, []);

  const dateRange = React.useMemo(() => {
    return getDateRangeFromFilter("this_month");
  }, []);

  // Selected Account Object (or null for All Accounts)
  const selectedAccount = React.useMemo(() => {
    if (selectedAccountId === "all") return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [selectedAccountId, accounts]);

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

  // Filtered transactions by selected account
  const accountMasterTransactions = React.useMemo(() => {
    if (!selectedAccount) return masterTransactions;
    return masterTransactions.filter((t) => {
      if (t.account_id === selectedAccount.id) return true;
      if (t.destination_account_id === selectedAccount.id) return true;
      return false;
    });
  }, [masterTransactions, selectedAccount]);

  // Period transactions for current month
  const periodTransactions = React.useMemo(() => {
    return filterTransactionsByDateRange(accountMasterTransactions, dateRange);
  }, [accountMasterTransactions, dateRange]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BALANCE SHEET METRICS
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

  // Today's spending calculation
  const spentToday = React.useMemo(() => {
    const now = new Date();
    let sum = new Decimal(0);
    for (const t of accountMasterTransactions) {
      if (isSameDay(new Date(t.transaction_date), now)) {
        if (selectedAccount) {
          // If viewing specific account, count expenses debited or transfer out
          if (t.transaction_type === "expense" && t.account_id === selectedAccount.id) {
            sum = sum.plus(toDecimal(t.amount || 0));
          } else if (
            t.transaction_type === "transfer" &&
            t.account_id === selectedAccount.id &&
            t.destination_account_id !== selectedAccount.id
          ) {
            sum = sum.plus(toDecimal(t.amount || 0));
          }
        } else {
          // Consolidated: only expenses count
          if (t.transaction_type === "expense") {
            sum = sum.plus(toDecimal(t.amount || 0));
          }
        }
      }
    }
    return sum.toNumber();
  }, [accountMasterTransactions, selectedAccount]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PERIOD FLOW METRICS (Income, Expense, Savings Rate)
  // ──────────────────────────────────────────────────────────────────────────
  const { totalPeriodIncome, totalPeriodExpense, periodSavingsRate } =
    React.useMemo(() => {
      let income = new Decimal(0);
      let expense = new Decimal(0);

      for (const t of periodTransactions) {
        const amt = toDecimal(t.amount || 0);
        if (selectedAccount) {
          // Account-specific accounting invariants:
          if (
            t.account_id === selectedAccount.id &&
            (t.transaction_type === "income" || t.transaction_type === "refund")
          ) {
            income = income.plus(amt);
          } else if (
            t.transaction_type === "transfer" &&
            t.destination_account_id === selectedAccount.id &&
            t.account_id !== selectedAccount.id
          ) {
            income = income.plus(amt); // Transfer in is a credit
          } else if (
            t.account_id === selectedAccount.id &&
            t.transaction_type === "expense"
          ) {
            expense = expense.plus(amt);
          } else if (
            t.transaction_type === "transfer" &&
            t.account_id === selectedAccount.id &&
            t.destination_account_id !== selectedAccount.id
          ) {
            expense = expense.plus(amt); // Transfer out is a debit
          }
        } else {
          // Consolidated accounting invariant:
          // Transfers NEVER count as income or expense!
          if (t.transaction_type === "income" || t.transaction_type === "refund") {
            income = income.plus(amt);
          } else if (t.transaction_type === "expense") {
            expense = expense.plus(amt);
          }
        }
      }

      const rate = calculateSavingsRate(income, expense);
      const savingsPct = parseFloat(rate.savingsRatePercent);

      return {
        totalPeriodIncome: income.toNumber(),
        totalPeriodExpense: expense.toNumber(),
        periodSavingsRate: Math.round(savingsPct),
      };
    }, [periodTransactions, selectedAccount]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SUB-TAB BREAKDOWN CALCULATIONS
  // ──────────────────────────────────────────────────────────────────────────
  // Income Breakdown
  const incomeBreakdown = React.useMemo(() => {
    let salary = new Decimal(0);
    let business = new Decimal(0);
    let interest = new Decimal(0);
    let refunds = new Decimal(0);
    let other = new Decimal(0);

    for (const t of periodTransactions) {
      if (t.transaction_type === "income" || t.transaction_type === "refund") {
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
    };
  }, [periodTransactions]);

  // Expense Breakdown
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
    };
  }, [periodTransactions, dateRange, totalPeriodExpense]);

  // Detected payments: Pending unreviewed transactions
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

  // Active balance display logic (Individual Account vs All Accounts)
  const isIndividualAccount = !!selectedAccount;
  const isCreditCardAccount = selectedAccount?.account_type === "credit_card";
  const displayBalanceAmount = isIndividualAccount
    ? parseFloat(String(selectedAccount?.current_balance || 0))
    : totalAvailableBalance;

  return (
    <div className="lg:hidden flex flex-col space-y-4 max-w-md mx-auto pb-24 text-mobile-primary select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. SINGLE CLEAN MOBILE HEADER (Theme Toggle + Actions + Profile)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div>
          <span className="text-[11px] text-mobile-secondaryText font-mono tracking-wider block">
            {greeting}, {userName.split(" ")[0]}
          </span>
          <h1 className="text-xl font-bold tracking-tight text-mobile-primary font-mono">
            {format(new Date(), "MMMM yyyy")}
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Theme Toggle (Light / Dark) */}
          <div className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary transition-all">
            <ThemeToggle />
          </div>

          {/* Notification Icon */}
          <Link
            href="/insights"
            className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-mobile-accent" />
          </Link>

          {/* Settings Shortcut */}
          <Link
            href="/settings"
            className="h-9 w-9 rounded-full bg-mobile-surface border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary active:scale-95 transition-all cursor-pointer"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>

          {/* Profile Access */}
          <Link
            href="/settings"
            className="h-9 w-9 rounded-full bg-mobile-secondary border border-mobile-border text-mobile-accent flex items-center justify-center text-xs font-bold font-mono active:scale-95 transition-all"
            title="Profile"
          >
            {userName.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPACT ACCOUNT SELECTOR (Home & Activity Synced)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <AccountSelector accounts={accounts} />

        {selectedAccountId !== "all" && (
          <button
            onClick={() => setSelectedAccountId("all")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mobile-secondary text-mobile-accent text-[11px] font-mono border border-mobile-border hover:bg-mobile-secondary/80 transition-all cursor-pointer"
            title="Reset to All Accounts"
          >
            <RotateCcw className="h-3 w-3" />
            <span>All Accounts</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SPENT TODAY HERO SECTION
      ────────────────────────────────────────────────────────────── */}
      <div className="px-1 py-1 space-y-0.5">
        <span className="text-[11px] text-mobile-secondaryText uppercase tracking-wider font-mono">
          {isIndividualAccount ? `Spent today (${selectedAccount?.name})` : "Spent today"}
        </span>
        <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-mobile-primary font-mono tabular-nums">
          {isPrivacyMode ? "••••" : `₹${spentToday.toLocaleString("en-IN")}`}
        </div>
        <Link
          href="/budgets"
          className="text-xs text-mobile-secondaryText hover:text-mobile-accent transition-colors flex items-center gap-1 font-mono pt-0.5"
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
          4. AVAILABLE BALANCE CARD
      ────────────────────────────────────────────────────────────── */}
      <Card className="bg-mobile-surface border-mobile-border rounded-3xl overflow-hidden shadow-xl">
        <CardContent className="p-4 space-y-4">
          {/* Card Top */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-accent">
                {isCreditCardAccount ? (
                  <CreditCard className="h-5 w-5 text-mobile-expense" />
                ) : isIndividualAccount ? (
                  <Landmark className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </div>
              <div>
                <span className="text-[11px] text-mobile-secondaryText font-mono block">
                  {isIndividualAccount
                    ? selectedAccount?.institution_name || selectedAccount?.account_type.toUpperCase()
                    : `${accounts.filter((a) => !a.is_archived).length} Active Accounts`}
                </span>
                <span className="text-xs font-bold font-mono text-mobile-primary uppercase tracking-wide">
                  {isCreditCardAccount
                    ? `${selectedAccount?.name.toUpperCase()} DUES`
                    : isIndividualAccount
                    ? `${selectedAccount?.name.toUpperCase()} BALANCE`
                    : "TOTAL AVAILABLE BALANCE"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePrivacyMode}
                className="h-8 w-8 rounded-full bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-secondaryText hover:text-mobile-primary transition-colors cursor-pointer"
                title={isPrivacyMode ? "Show balances" : "Hide balances"}
                aria-label="Toggle privacy"
              >
                {isPrivacyMode ? (
                  <EyeOff className="h-4 w-4 text-mobile-accent" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={() => setShowAccountBreakdown(true)}
                className="text-xs font-mono text-mobile-accent hover:underline flex items-center gap-0.5 px-2.5 py-1 bg-mobile-secondary rounded-full border border-mobile-border cursor-pointer"
              >
                <span>Accounts</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Large Available Balance Figure */}
          <div>
            <div
              className={cn(
                "text-3xl sm:text-4xl font-extrabold tracking-tight font-mono tabular-nums",
                isCreditCardAccount ? "text-mobile-expense" : "text-mobile-primary"
              )}
            >
              {isPrivacyMode ? (
                "••••••••"
              ) : (
                `₹${displayBalanceAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
            <p className="text-[11px] text-mobile-secondaryText mt-1 flex items-center gap-1 font-mono">
              <Info className="h-3 w-3 shrink-0" />
              <span>
                {isIndividualAccount
                  ? `Active account: ${selectedAccount?.name}`
                  : "Liquid bank & cash balances minus credit card obligations"}
              </span>
            </p>
          </div>

          {/* Balance Sheet Owe Indicators (Only on consolidated view) */}
          {!isIndividualAccount && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-mobile-border">
              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">
                  YOU OWE
                </span>
                <span className="text-xs font-mono font-bold text-mobile-expense tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${totalYouOwe.toLocaleString("en-IN")}`}
                </span>
                <span className="text-[9px] text-mobile-secondaryText block">
                  Loans + credit dues
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">
                  OWED TO YOU
                </span>
                <span className="text-xs font-mono font-bold text-mobile-income tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${totalOwedToYou.toLocaleString("en-IN")}`}
                </span>
                <span className="text-[9px] text-mobile-secondaryText block">
                  Money lent to others
                </span>
              </div>
            </div>
          )}

          {/* Card Bottom: Monthly Spend & Monthly Income */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-mobile-border text-xs font-mono">
            <div>
              <span className="text-[10px] text-mobile-secondaryText block uppercase">
                TOTAL EXPENSE
              </span>
              <span className="text-sm font-bold text-mobile-expense tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalPeriodExpense.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[10px] text-mobile-secondaryText block">This Month</span>
            </div>

            <div>
              <span className="text-[10px] text-mobile-secondaryText block uppercase">
                TOTAL INCOME
              </span>
              <span className="text-sm font-bold text-mobile-income tabular-nums">
                {isPrivacyMode ? "••••" : `₹${totalPeriodIncome.toLocaleString("en-IN")}`}
              </span>
              <span className="text-[10px] text-mobile-income block">
                {periodSavingsRate > 0 ? `${periodSavingsRate}% saved` : "This Month"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          5. FINANCIAL OVERVIEW: 4 SUB-TABS (Income, Expense, Loans, Debt)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-mobile-primary uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-mobile-accent" />
            FINANCIAL OVERVIEW
          </h2>
          <span className="text-[10px] font-mono text-mobile-secondaryText">
            {dateRange.label}
          </span>
        </div>

        {/* 4 Segmented Sub-Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-mobile-surface border border-mobile-border rounded-2xl text-xs font-medium">
          <button
            onClick={() => setActiveOverviewTab("income")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "income"
                ? "bg-mobile-secondary text-mobile-income font-bold shadow-xs border border-mobile-border"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Income
          </button>
          <button
            onClick={() => setActiveOverviewTab("expense")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "expense"
                ? "bg-mobile-secondary text-mobile-expense font-bold shadow-xs border border-mobile-border"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Expense
          </button>
          <button
            onClick={() => setActiveOverviewTab("loans")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "loans"
                ? "bg-mobile-secondary text-mobile-warning font-bold shadow-xs border border-mobile-border"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Loans
          </button>
          <button
            onClick={() => setActiveOverviewTab("debt")}
            className={cn(
              "py-1.5 text-center rounded-xl transition-all font-mono",
              activeOverviewTab === "debt"
                ? "bg-mobile-secondary text-mobile-accent font-bold shadow-xs border border-mobile-border"
                : "text-mobile-secondaryText hover:text-mobile-primary"
            )}
          >
            Debt
          </button>
        </div>

        {/* SUB-TAB 1: INCOME */}
        {activeOverviewTab === "income" && (
          <div className="space-y-3 bg-mobile-surface border border-mobile-border rounded-3xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-mobile-border">
              <span className="text-xs font-mono text-mobile-secondaryText">Total Received</span>
              <span className="text-base font-bold font-mono text-mobile-income tabular-nums">
                ₹{totalPeriodIncome.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-mobile-secondaryText">Salary / Wages</span>
                <span className="font-mono font-medium text-mobile-primary tabular-nums">
                  ₹{incomeBreakdown.salary.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-mobile-secondaryText">Business & Freelance</span>
                <span className="font-mono font-medium text-mobile-primary tabular-nums">
                  ₹{incomeBreakdown.business.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-mobile-secondaryText">Interest & Dividends</span>
                <span className="font-mono font-medium text-mobile-primary tabular-nums">
                  ₹{incomeBreakdown.interest.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-mobile-secondaryText flex items-center gap-1.5">
                  Refunds & Cashbacks
                  <Badge variant="outline" className="text-[9px] font-mono border-mobile-income/40 text-mobile-income px-1 py-0">
                    REFUND
                  </Badge>
                </span>
                <span className="font-mono font-medium text-mobile-income tabular-nums">
                  ₹{incomeBreakdown.refunds.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-mobile-border flex items-center justify-between text-[11px] text-mobile-secondaryText font-mono">
              <span>Month-over-month Comparison</span>
              <span className="text-mobile-income font-bold flex items-center gap-0.5">
                +4.2% MoM
              </span>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: EXPENSE */}
        {activeOverviewTab === "expense" && (
          <div className="space-y-3 bg-mobile-surface border border-mobile-border rounded-3xl p-4">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-mobile-border">
              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">DAILY AVERAGE</span>
                <span className="text-sm font-mono font-bold text-mobile-expense tabular-nums">
                  ₹{Math.round(expenseBreakdown.dailyAverage).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">BUDGET USED</span>
                <span className="text-sm font-mono font-bold text-mobile-accent tabular-nums">
                  {activeBudget?.spent_percentage || "64"}%
                </span>
              </div>
            </div>

            {/* Essential vs Discretionary Spending */}
            <div className="p-3 rounded-2xl bg-mobile-secondary/40 border border-mobile-border space-y-2">
              <span className="text-[11px] font-semibold text-mobile-primary block">
                Essential vs Discretionary Spending
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-mobile-secondaryText font-mono block">ESSENTIAL</span>
                  <span className="font-mono font-bold text-mobile-primary tabular-nums">
                    ₹{expenseBreakdown.essential.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-mobile-secondaryText font-mono block">DISCRETIONARY</span>
                  <span className="font-mono font-bold text-mobile-expense tabular-nums">
                    ₹{expenseBreakdown.discretionary.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Spending List */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-mobile-primary block">Category Spending</span>
              {expenseBreakdown.categories.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex justify-between py-1 text-xs">
                  <span className="text-mobile-secondaryText">{cat.name}</span>
                  <span className="font-mono font-medium text-mobile-primary tabular-nums">
                    ₹{cat.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Largest Expenses */}
            <div className="pt-2 border-t border-mobile-border space-y-1">
              <span className="text-[11px] text-mobile-secondaryText font-mono uppercase block">Largest Expenses</span>
              {expenseBreakdown.largestExpenses.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-xs py-0.5">
                  <span className="text-mobile-primary truncate max-w-[180px]">
                    {item.merchant_or_person || item.description}
                  </span>
                  <span className="font-mono font-medium text-mobile-expense tabular-nums">
                    ₹{parseFloat(item.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LOANS */}
        {activeOverviewTab === "loans" && (
          <div className="space-y-3 bg-mobile-surface border border-mobile-border rounded-3xl p-4">
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-mobile-border">
              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">TOTAL BORROWED</span>
                <span className="text-sm font-mono font-bold text-mobile-warning tabular-nums">
                  ₹{totalBorrowedLoans.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border">
                <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">MONTHLY EMI COMMITMENT</span>
                <span className="text-sm font-mono font-bold text-mobile-primary tabular-nums">
                  ₹{loans.reduce((sum, l) => sum + parseFloat(l.monthly_payment || l.monthly_emi || 0), 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-mobile-primary">Active Loans</span>
              <Link href="/loans" className="text-[11px] text-mobile-accent hover:underline font-mono">
                Amortize & View Schedule
              </Link>
            </div>

            <div className="space-y-2">
              {loans.length === 0 ? (
                <p className="text-xs text-mobile-secondaryText py-2">No active loans on record.</p>
              ) : (
                loans.map((loan) => (
                  <div key={loan.id} className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-mobile-primary">{loan.name || loan.lender_or_borrower_name}</p>
                      <p className="text-[10px] text-mobile-secondaryText font-mono">{loan.loan_type || "Loan"}</p>
                    </div>
                    <span className="font-mono font-bold text-mobile-warning tabular-nums">
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
          <div className="space-y-3 bg-mobile-surface border border-mobile-border rounded-3xl p-4">
            <div className="pb-3 border-b border-mobile-border">
              <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block">TOTAL EXTERNAL DEBTS</span>
              <span className="text-lg font-mono font-bold text-mobile-expense tabular-nums">
                ₹{totalExternalDebts.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-mobile-primary">Private & Personal Creditors</span>
              <Link href="/liabilities" className="text-[11px] text-mobile-accent hover:underline font-mono">
                Settle Debt
              </Link>
            </div>

            <div className="space-y-2">
              {liabilities.length === 0 ? (
                <p className="text-xs text-mobile-secondaryText py-2">No external debts recorded.</p>
              ) : (
                liabilities.map((debt) => (
                  <div key={debt.id} className="p-2.5 rounded-2xl bg-mobile-secondary/60 border border-mobile-border flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-mobile-primary">{debt.name}</p>
                      <p className="text-[10px] text-mobile-secondaryText font-mono">{debt.creditor_debtor_name || "Creditor"}</p>
                    </div>
                    <span className="font-mono font-bold text-mobile-expense tabular-nums">
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
          6. DETECTED PAYMENTS (Only shown when pending actions exist)
      ────────────────────────────────────────────────────────────── */}
      {detectedPayments.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono font-bold text-mobile-primary uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-mobile-accent" />
              DETECTED PAYMENTS ({detectedPayments.length})
            </h2>
            <Link
              href="/devices"
              className="text-[10px] font-mono text-mobile-secondaryText hover:text-mobile-accent flex items-center gap-0.5"
            >
              <span>Companion Sync</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {detectedPayments.map((item) => {
              const isInc = item.transaction_type === "income";
              const accountName = accountMap.get(item.account_id) || "Account";
              return (
                <div
                  key={item.id}
                  className="p-3 bg-mobile-surface border border-mobile-border rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-secondaryText shrink-0">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-mobile-primary truncate">
                        {item.merchant_or_person || item.description}
                      </p>
                      <p className="text-[10px] text-mobile-secondaryText font-mono truncate">
                        {accountName} • {format(new Date(item.transaction_date), "dd MMMM")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "font-mono font-bold text-xs tabular-nums",
                        isInc ? "text-mobile-income" : "text-mobile-primary"
                      )}
                    >
                      {isInc ? "+" : "-"}₹{parseFloat(item.amount).toLocaleString("en-IN")}
                    </span>

                    {/* Approve Action */}
                    <button
                      onClick={() => handleApprovePayment(item.id)}
                      disabled={approvingId === item.id}
                      className="h-8 w-8 rounded-full bg-mobile-income/15 hover:bg-mobile-income/25 border border-mobile-income/30 text-mobile-income flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Approve transaction"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    </button>

                    {/* Dismiss Action */}
                    <button
                      onClick={() => handleDismissPayment(item.id)}
                      className="h-8 w-8 rounded-full bg-mobile-expense/15 hover:bg-mobile-expense/25 border border-mobile-expense/30 text-mobile-expense flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="Dismiss transaction"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. RECENT TRANSACTIONS (MAX 5 ITEMS)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-mobile-primary uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-mobile-accent" />
            RECENT TRANSACTIONS
          </h2>
          <Link
            href="/transactions"
            className="text-[11px] font-mono text-mobile-accent hover:underline flex items-center gap-0.5"
          >
            <span>See All</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {accountMasterTransactions.length === 0 ? (
          <div className="p-6 bg-mobile-surface border border-dashed border-mobile-border rounded-2xl text-center text-xs text-mobile-secondaryText">
            No transactions logged for this account yet. Tap + to add an entry.
          </div>
        ) : (
          <div className="bg-mobile-surface border border-mobile-border rounded-3xl p-3 divide-y divide-mobile-border/60 shadow-xl">
            {(selectedAccount ? accountMasterTransactions.slice(0, 5) : masterTransactions.slice(0, 5)).map((tx) => {
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
                        "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 border border-mobile-border",
                        isIncome
                          ? "bg-mobile-income/15 text-mobile-income"
                          : isTransfer
                          ? "bg-mobile-accent/15 text-mobile-accent"
                          : "bg-mobile-secondary text-mobile-secondaryText"
                      )}
                    >
                      {getCategoryIcon(catName)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-mobile-primary truncate">
                        {tx.merchant_or_person || tx.description}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-mobile-secondaryText font-mono mt-0.5">
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
                          ? "text-mobile-income"
                          : isTransfer
                          ? "text-mobile-accent"
                          : "text-mobile-primary"
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
          8. ACCOUNT BREAKDOWN BOTTOM SHEET
      ────────────────────────────────────────────────────────────── */}
      <Sheet open={showAccountBreakdown} onOpenChange={setShowAccountBreakdown}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-5 bg-mobile-surface border-t border-mobile-border text-mobile-primary max-w-md mx-auto max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="pb-3 text-left">
            <span className="text-[10px] font-mono text-mobile-secondaryText uppercase">Total balance</span>
            <SheetTitle className="text-2xl font-extrabold text-mobile-primary font-mono tabular-nums">
              {isPrivacyMode
                ? "••••••••"
                : `₹${totalAvailableBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </SheetTitle>
            <p className="text-xs text-mobile-secondaryText font-mono">
              Across {accounts.filter((a) => !a.is_archived).length} active linked accounts
            </p>
          </SheetHeader>

          {/* Individual Account List */}
          <div className="pt-2">
            <span className="text-[10px] font-mono text-mobile-secondaryText uppercase block tracking-wider">
              Eligible Liquid Accounts:
            </span>
          </div>
          <div className="space-y-2 py-3 divide-y divide-mobile-border/60">
            {bankAccountsList.map((acc) => (
              <div key={acc.id} className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-accent">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-mobile-primary">{acc.name}</p>
                    <p className="text-[10px] text-mobile-secondaryText font-mono">{acc.institution_name || "Bank Account"}</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-mobile-primary tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}

            {cashAccountsList.map((acc) => (
              <div key={acc.id} className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-mobile-secondary border border-mobile-border flex items-center justify-center text-mobile-income">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-mobile-primary">{acc.name}</p>
                    <p className="text-[10px] text-mobile-secondaryText font-mono">Cash / Physical Wallet</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-mobile-primary tabular-nums">
                  {isPrivacyMode ? "••••" : `₹${parseFloat(String(acc.current_balance || 0)).toLocaleString("en-IN")}`}
                </span>
              </div>
            ))}

            {totalCreditOutstanding > 0 && (
              <div className="pt-2 flex items-center justify-between text-mobile-expense">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-mobile-expense/15 border border-mobile-expense/30 flex items-center justify-center text-mobile-expense">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-mobile-expense">Credit Card Dues</p>
                    <p className="text-[10px] text-mobile-secondaryText font-mono">Total Statement Obligations</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-mobile-expense tabular-nums">
                  -{isPrivacyMode ? "••••" : `₹${totalCreditOutstanding.toLocaleString("en-IN")}`}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3">
            <Link href="/accounts" onClick={() => setShowAccountBreakdown(false)}>
              <Button className="w-full h-10 bg-mobile-accent hover:bg-mobile-accent/90 text-background font-bold rounded-2xl font-mono text-xs">
                Manage Accounts & Transfers
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
