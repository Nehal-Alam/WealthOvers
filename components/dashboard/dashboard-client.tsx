"use client";

import * as React from "react";
import Link from "next/link";
import { format, isThisMonth, subMonths } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Receipt,
  PiggyBank,
  Calendar,
  ArrowLeftRight,
  ChevronRight,
  Percent,
  SlidersHorizontal,
  ShieldCheck,
  Coins,
  Home,
  Target,
  Sparkles,
  Plus,
  BarChart3,
  Scale,
  FileSpreadsheet,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Building2,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { useUIStore } from "@/stores/ui-store";
import { SafeToSpendHero } from "./safe-to-spend-hero";
import dynamic from "next/dynamic";

const TransferFundsDialog = dynamic(
  () =>
    import("@/components/accounts/transfer-funds-dialog").then(
      (m) => m.TransferFundsDialog
    ),
  { ssr: false }
);

const CreateAccountDialog = dynamic(
  () =>
    import("@/components/accounts/create-account-dialog").then(
      (m) => m.CreateAccountDialog
    ),
  { ssr: false }
);

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  calculateBalanceSheetRatios,
  calculateInvestmentReturns,
  calculateSafeToSpend,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";

interface DashboardClientProps {
  userName?: string;
  accounts: Tables<"accounts">[];
  recentTransactions: any[];
  categories: Tables<"categories">[];
  activeBudget?: any | null;
  upcomingRecurring?: any[];
  investments?: any[];
  assets?: any[];
  loans?: any[];
  liabilities?: any[];
  goals?: any[];
  monthTransactions?: any[];
  precomputedSummary?: {
    totalLiquid?: string;
    totalCredit?: string;
    netWorth?: string;
    monthlyInflow?: string;
    monthlyOutflow?: string;
    savingsRate?: string;
  } | null;
}

export function DashboardClient({
  userName = "Investor",
  accounts,
  recentTransactions,
  categories,
  activeBudget,
  upcomingRecurring = [],
  investments = [],
  assets = [],
  loans = [],
  liabilities = [],
  goals = [],
  monthTransactions = [],
  precomputedSummary,
}: DashboardClientProps) {
  const {
    openQuickTransaction,
    dashboardWidgets,
    toggleDashboardWidget,
    setDashboardWidgetVisible,
  } = useUIStore();

  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [activityFilter, setActivityFilter] = React.useState<
    "all" | "expense" | "income" | "transfer"
  >("all");

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.is_archived),
    [accounts]
  );

  // Time-based greeting
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // 1. Consolidated Real-Time Balance Sheet & Financial Calculations
  const balanceSheet = React.useMemo(() => {
    const liquidBalances: string[] = [];
    const creditBalances: string[] = [];

    for (const a of activeAccounts) {
      if (a.account_type === "credit_card") {
        creditBalances.push(String(a.current_balance));
      } else if (a.account_type === "loan_account") {
        // counted in loan balances
      } else {
        liquidBalances.push(String(a.current_balance));
      }
    }

    const investmentValuations: string[] = [];
    for (const inv of investments) {
      const returns = calculateInvestmentReturns(
        inv.total_quantity || 0,
        inv.average_buy_price || 0,
        inv.current_nav_or_price || inv.average_buy_price || 0,
        inv.currency || "INR",
        DEFAULT_USD_INR_RATE
      );
      investmentValuations.push(returns.currentValuation);
    }

    const tangibleAssets = assets.map((ast) => String(ast.current_valuation || 0));
    const loanLiabilities = loans.map((ln) => String(ln.outstanding_balance || 0));
    const manualLiabilities = liabilities.map((lia) =>
      String(lia.outstanding_amount || 0)
    );

    let inflow = precomputedSummary?.monthlyInflow || "0.0000";
    let outflow = precomputedSummary?.monthlyOutflow || "0.0000";

    if (!precomputedSummary) {
      const sourceTxns =
        monthTransactions.length > 0 ? monthTransactions : recentTransactions;
      for (const t of sourceTxns) {
        if (isThisMonth(new Date(t.transaction_date))) {
          if (t.transaction_type === "income" || t.transaction_type === "refund") {
            inflow = addMoney(inflow, t.amount);
          } else if (t.transaction_type === "expense") {
            outflow = addMoney(outflow, t.amount);
          }
        }
      }
    }

    const { netSavings, savingsRatePercent } = calculateSavingsRate(
      inflow,
      outflow
    );

    const ratios = calculateBalanceSheetRatios({
      liquidBalances,
      investmentValuations,
      tangibleAssets,
      creditLiabilities: creditBalances,
      loanLiabilities,
      manualLiabilities,
      monthlyExpenses: outflow,
    });

    return {
      ...ratios,
      liquidBalances,
      creditBalances,
      monthlyInflow: inflow,
      monthlyOutflow: outflow,
      netSavings,
      savingsRate: precomputedSummary?.savingsRate || savingsRatePercent,
    };
  }, [
    activeAccounts,
    investments,
    assets,
    loans,
    liabilities,
    precomputedSummary,
    monthTransactions,
    recentTransactions,
  ]);

  // 2. Leftovers "Safe to Spend Today" Calculation Engine
  const safeToSpend = React.useMemo(() => {
    const upcomingBills: string[] = [];
    for (const bill of upcomingRecurring) {
      upcomingBills.push(String(bill.amount || 0));
    }
    for (const loan of loans) {
      if (loan.monthly_emi) {
        upcomingBills.push(String(loan.monthly_emi));
      }
    }

    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const daysRemaining = Math.max(1, daysInMonth - now.getDate());

    return calculateSafeToSpend({
      liquidBalances: balanceSheet.liquidBalances,
      creditLiabilities: balanceSheet.creditBalances,
      monthlySpent: balanceSheet.monthlyOutflow,
      activeBudgetLimit: activeBudget ? activeBudget.total_amount : null,
      upcomingBills,
      daysRemainingInMonth: daysRemaining,
    });
  }, [
    balanceSheet.liquidBalances,
    balanceSheet.creditBalances,
    balanceSheet.monthlyOutflow,
    activeBudget,
    upcomingRecurring,
    loans,
  ]);

  // 3. 6-Month Estimated Net Worth Trajectory
  const netWorthTrend = React.useMemo(() => {
    const months = [5, 4, 3, 2, 1, 0].map((sub) => {
      const d = subMonths(new Date(), sub);
      return {
        label: format(d, "MMM"),
        monthDate: d,
      };
    });

    const currentNw = parseFloat(balanceSheet.netWorth);
    const monthlyNetFlow = parseFloat(balanceSheet.netSavings);

    return months.map((m, idx) => {
      const offset = (months.length - 1 - idx) * (monthlyNetFlow * 0.85);
      const estNw = Math.max(0, currentNw - offset);
      return {
        label: m.label,
        value: estNw,
      };
    });
  }, [balanceSheet.netWorth, balanceSheet.netSavings]);

  // 4. Filtered Recent Transactions
  const filteredTransactions = React.useMemo(() => {
    if (activityFilter === "all") return recentTransactions.slice(0, 7);
    return recentTransactions
      .filter((t) => t.transaction_type === activityFilter)
      .slice(0, 7);
  }, [recentTransactions, activityFilter]);

  // 5. Consolidated Upcoming Payments & Commitments
  const upcomingPayments = React.useMemo(() => {
    const items: {
      id: string;
      title: string;
      amount: string;
      dueDate: string;
      type: "recurring" | "emi" | "liability";
      category: string;
    }[] = [];

    for (const r of upcomingRecurring) {
      items.push({
        id: `rec-${r.id}`,
        title: r.name || "Recurring Bill",
        amount: String(r.amount),
        dueDate: r.next_occurrence_date,
        type: "recurring",
        category: r.recurrence_interval || "Monthly",
      });
    }

    for (const l of loans) {
      if (l.monthly_emi && parseFloat(String(l.monthly_emi)) > 0) {
        items.push({
          id: `loan-${l.id}`,
          title: `${l.lender_or_borrower_name || "Loan"} EMI`,
          amount: String(l.monthly_emi),
          dueDate: "Monthly EMI",
          type: "emi",
          category: l.loan_type || "Loan",
        });
      }
    }

    for (const lb of liabilities) {
      if (lb.due_date) {
        items.push({
          id: `liab-${lb.id}`,
          title: lb.name || "Bill Payment",
          amount: String(lb.outstanding_amount),
          dueDate: lb.due_date,
          type: "liability",
          category: lb.category || "Due",
        });
      }
    }

    return items.slice(0, 5);
  }, [upcomingRecurring, loans, liabilities]);

  const widgetCatalog = [
    { id: "safeToSpend", label: "Safe to Spend Today Hero", desc: "Hero calculation meter based on liquid cash & budget" },
    { id: "accountBalances", label: "Account Balances", desc: "Liquid accounts, credit cards & balances" },
    { id: "recentActivity", label: "Recent Activity Timeline", desc: "Latest income, expenses, and transfers" },
    { id: "upcomingPayments", label: "Upcoming Payments", desc: "EMIs, bills, subscriptions, and utilities" },
    { id: "financialOverview", label: "Financial Overview", desc: "Net Worth, assets, liabilities, and savings rate" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          HEADER BAR: GREETING & CONCISE CONTROLS
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your personal wealth overview and daily spending status
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {activeAccounts.length >= 2 && (
            <TransferFundsDialog
              accounts={accounts}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8.5 text-xs border-border/80 text-foreground hover:bg-muted"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Transfer</span>
                </Button>
              }
            />
          )}

          <CreateAccountDialog
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8.5 text-xs border-border/80 text-foreground hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Add Account</span>
              </Button>
            }
          />

          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 h-8.5 text-xs border-border/80 text-foreground hover:bg-muted"
          >
            <Link href="/reports">
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Insights & Reports</span>
            </Link>
          </Button>

          {/* Customize Widgets Modal */}
          <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8.5 w-8.5 text-muted-foreground hover:text-foreground"
                title="Customize Modules"
                aria-label="Customize Modules"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground">
                  Personalize Dashboard
                </DialogTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Toggle sections to customize your home finance view.
                </CardDescription>
              </DialogHeader>

              <div className="py-2 space-y-2.5">
                {widgetCatalog.map((w) => {
                  const isChecked = dashboardWidgets[w.id] !== false;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-surface-secondary/30"
                    >
                      <div className="pr-4">
                        <p className="font-semibold text-xs text-foreground">
                          {w.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {w.desc}
                        </p>
                      </div>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={() => toggleDashboardWidget(w.id)}
                        aria-label={`Toggle ${w.label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRIMARY SECTION: SAFE TO SPEND TODAY (THE LEFTOVERS HERO)
      ────────────────────────────────────────────────────────────── */}
      {dashboardWidgets.safeToSpend !== false && (
        <SafeToSpendHero
          safeToSpend={safeToSpend}
          monthlyInflow={balanceSheet.monthlyInflow}
          monthlyOutflow={balanceSheet.monthlyOutflow}
          userName={userName}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          TWO-COLUMN BALANCED LAYOUT: CONTENT & ANALYTICS
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN (7 COLS): ACCOUNTS & RECENT ACTIVITY */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          {/* SECTION 2: ACCOUNT BALANCES */}
          {dashboardWidgets.accountBalances !== false && (
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span>Account Balances</span>
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-surface-secondary/60 text-foreground font-mono"
                    >
                      {activeAccounts.length} Active
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Total available:{" "}
                    <span className="font-semibold text-foreground font-mono">
                      <MoneyDisplay
                        amount={balanceSheet.totalLiquid}
                      />
                    </span>
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary">
                  <Link href="/accounts">
                    <span>Manage</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAccounts.map((account) => {
                    const isCredit = account.account_type === "credit_card";
                    const isLoan = account.account_type === "loan_account";

                    return (
                      <Link
                        key={account.id}
                        href={`/accounts`}
                        className="p-3 rounded-xl border border-border/80 bg-surface-secondary/40 hover:bg-surface-secondary transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: account.color || "#244B3C" }}
                            />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {account.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {account.institution_name || "Bank Account"}
                                {account.account_number_masked
                                  ? ` • ${account.account_number_masked}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium ${
                              isCredit
                                ? "bg-danger/10 text-danger"
                                : isLoan
                                ? "bg-warning/10 text-warning"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {account.account_type.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground">
                            {isCredit ? "Balance Due" : "Available"}
                          </span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              isCredit ? "text-danger" : "text-foreground"
                            }`}
                          >
                            <MoneyDisplay
                              amount={account.current_balance}
                              currency={account.currency}
                            />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 3: RECENT ACTIVITY */}
          {dashboardWidgets.recentActivity !== false && (
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Latest transactions, expenses, and transfers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Activity Filter Tabs */}
                  <div className="hidden sm:inline-flex items-center rounded-lg border border-border/80 bg-surface-secondary/50 p-0.5 text-[11px]">
                    {(["all", "expense", "income", "transfer"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setActivityFilter(f)}
                        className={`px-2 py-0.5 rounded-md font-medium capitalize transition-colors ${
                          activityFilter === f
                            ? "bg-card text-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary">
                    <Link href="/transactions">
                      <span>Ledger</span>
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No transactions recorded for this filter.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredTransactions.map((tx) => {
                      const isIncome = tx.transaction_type === "income";
                      const isTransfer = tx.transaction_type === "transfer";
                      const isExpense = tx.transaction_type === "expense";

                      return (
                        <div
                          key={tx.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isIncome
                                  ? "bg-success/10 text-success"
                                  : isTransfer
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-secondary text-muted-foreground"
                              }`}
                            >
                              {isIncome ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : isTransfer ? (
                                <ArrowLeftRight className="h-4 w-4" />
                              ) : (
                                <Receipt className="h-4 w-4" />
                              )}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {tx.description || tx.category?.name || "Transaction"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {tx.account?.name || "Account"} •{" "}
                                {format(new Date(tx.transaction_date), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <p
                              className={`text-xs font-bold ${
                                isIncome
                                  ? "text-success"
                                  : isExpense
                                  ? "text-danger"
                                  : "text-foreground"
                              }`}
                            >
                              {isIncome ? "+" : isExpense ? "-" : ""}
                              <MoneyDisplay
                                amount={tx.amount}
                                currency={tx.currency}
                              />
                            </p>
                            <span className="text-[9px] text-muted-foreground capitalize">
                              {tx.transaction_type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): UPCOMING PAYMENTS & FINANCIAL OVERVIEW */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          {/* SECTION 4: UPCOMING PAYMENTS */}
          {dashboardWidgets.upcomingPayments !== false && (
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Upcoming Payments</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Bills, EMIs, and recurring commitments
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary">
                  <Link href="/recurring">
                    <span>Schedule</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {upcomingPayments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <p className="font-semibold text-foreground">All caught up!</p>
                    <p className="text-[11px]">No pending bills due in this cycle.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl border border-border/80 bg-surface-secondary/40 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              {p.dueDate}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{p.category}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-mono">
                          <p className="text-xs font-bold text-foreground">
                            <MoneyDisplay amount={p.amount} />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 5: FINANCIAL OVERVIEW */}
          {dashboardWidgets.financialOverview !== false && (
            <Card className="shadow-xs border-border bg-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Financial Overview</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Consolidated balance sheet & net savings rate
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary">
                  <Link href="/net-worth">
                    <span>Details</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Net Worth Headline Display */}
                <div className="p-3.5 rounded-xl bg-surface-secondary/50 border border-border/70 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Total Net Worth
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                      <MoneyDisplay
                        amount={balanceSheet.netWorth}
                      />
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">
                      Monthly Savings Rate
                    </span>
                    <span className="text-sm font-bold text-success font-mono">
                      {balanceSheet.savingsRate}%
                    </span>
                  </div>
                </div>

                {/* 6-Month Visual Net Worth Trajectory Bar Sparklines */}
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>6-Month Trajectory</span>
                    <span className="font-mono text-foreground font-medium">
                      Est. Trend
                    </span>
                  </div>
                  <div className="h-16 flex items-end justify-between gap-2 p-2 rounded-xl bg-surface-secondary/30 border border-border/50">
                    {netWorthTrend.map((m, idx) => {
                      const maxVal = Math.max(...netWorthTrend.map((t) => t.value), 1);
                      const heightPct = Math.min(
                        100,
                        Math.max(20, (m.value / maxVal) * 100)
                      );
                      const isLast = idx === netWorthTrend.length - 1;

                      return (
                        <div
                          key={m.label}
                          className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                        >
                          <div
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isLast ? "bg-primary" : "bg-primary/40"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assets vs Liabilities Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl border border-border/70 bg-surface-secondary/40">
                    <span className="text-[10px] text-muted-foreground font-medium block">
                      Total Assets
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
                      <MoneyDisplay
                        amount={balanceSheet.totalAssets}
                      />
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border/70 bg-surface-secondary/40">
                    <span className="text-[10px] text-muted-foreground font-medium block">
                      Total Liabilities
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-danger font-mono mt-0.5">
                      <MoneyDisplay
                        amount={balanceSheet.totalLiabilities}
                      />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
