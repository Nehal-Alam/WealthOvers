"use client";

import * as React from "react";
import Link from "next/link";
import { format, isThisMonth, subMonths, isSameMonth } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Receipt,
  PiggyBank,
  Calendar,
  PlusCircle,
  ArrowLeftRight,
  ChevronRight,
  AlertTriangle,
  Percent,
  SlidersHorizontal,
  ShieldCheck,
  Coins,
  Home,
  Target,
  Sparkles,
  Check,
  Plus,
  BarChart3,
  Scale,
  FileSpreadsheet,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
import { TransferFundsDialog } from "@/components/accounts/transfer-funds-dialog";
import { CreateAccountDialog } from "@/components/accounts/create-account-dialog";
import { CreateInvestmentDialog } from "@/components/investments/create-investment-dialog";
import { useUIStore } from "@/stores/ui-store";
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
  calculateBudgetUtilization,
  calculateBalanceSheetRatios,
  calculateInvestmentReturns,
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
  precomputedSummary,
}: DashboardClientProps) {
  const { openQuickTransaction, dashboardWidgets, toggleDashboardWidget } = useUIStore();
  const [selectedPeriod, setSelectedPeriod] = React.useState<"month" | "quarter" | "year" | "all">("month");
  const [customizeOpen, setCustomizeOpen] = React.useState(false);

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

  // 1. Consolidated Real-Time Balance Sheet & 7 Primary Financial KPIs
  const balanceSheet = React.useMemo(() => {
    // Liquid accounts vs Credit Card liabilities
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

    // Investments valuations (with USD to INR conversion if needed)
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

    // Fixed physical assets
    const tangibleAssets = assets.map((ast) => String(ast.current_valuation || 0));

    // Loans and external liabilities
    const loanLiabilities = loans.map((ln) => String(ln.outstanding_balance || 0));
    const manualLiabilities = liabilities.map((lia) => String(lia.outstanding_amount || 0));

    // Cash flow this month
    let inflow = precomputedSummary?.monthlyInflow || "0.0000";
    let outflow = precomputedSummary?.monthlyOutflow || "0.0000";

    if (!precomputedSummary) {
      for (const t of recentTransactions) {
        if (isThisMonth(new Date(t.transaction_date))) {
          if (t.transaction_type === "income" || t.transaction_type === "refund") {
            inflow = addMoney(inflow, t.amount);
          } else if (t.transaction_type === "expense") {
            outflow = addMoney(outflow, t.amount);
          }
        }
      }
    }

    const { netSavings, savingsRatePercent } = calculateSavingsRate(inflow, outflow);

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
      monthlyInflow: inflow,
      monthlyOutflow: outflow,
      netSavings,
      savingsRate: precomputedSummary?.savingsRate || savingsRatePercent,
    };
  }, [activeAccounts, investments, assets, loans, liabilities, precomputedSummary, recentTransactions]);

  // 2. Budget utilization
  const budgetUtilization = React.useMemo(() => {
    if (!activeBudget) return null;
    return calculateBudgetUtilization(
      activeBudget.total_amount,
      activeBudget.totalSpent || "0.0000"
    );
  }, [activeBudget]);

  // 3. Estimated Net Worth Trend (past 6 months trajectory)
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
      // Linear model based on monthly savings velocity
      const offset = (months.length - 1 - idx) * (monthlyNetFlow * 0.85);
      const estNw = Math.max(0, currentNw - offset);
      return {
        label: m.label,
        value: estNw,
      };
    });
  }, [balanceSheet.netWorth, balanceSheet.netSavings]);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: COMMAND CENTRE TOP ACTION TOOLBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {userName}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold text-primary border-primary/30">
              Live Overview
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time financial position, multi-asset portfolio, and cash-flow health.
          </p>
        </div>

        {/* Action Controls & Widget Customizer */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector Tabs */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
            <button
              onClick={() => setSelectedPeriod("month")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedPeriod === "month"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod("quarter")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedPeriod === "quarter"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => setSelectedPeriod("year")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedPeriod === "year"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Year
            </button>
          </div>

          {/* Quick Transfer Dialog */}
          {activeAccounts.length >= 2 && (
            <TransferFundsDialog
              accounts={accounts}
              trigger={
                <Button size="sm" variant="outline" className="gap-1.5 h-8 sm:h-9 text-xs">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Transfer</span>
                </Button>
              }
            />
          )}

          {/* Add Investment */}
          <CreateInvestmentDialog
            accounts={accounts}
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5 h-8 sm:h-9 text-xs">
                <Coins className="h-3.5 w-3.5 text-violet-500" />
                <span className="hidden sm:inline">Add Investment</span>
              </Button>
            }
          />

          {/* Export Report Action */}
          <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 sm:h-9 text-xs">
            <Link href="/reports">
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Export Report</span>
            </Link>
          </Button>

          {/* Widget Customization Trigger */}
          <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                title="Customize Dashboard"
                aria-label="Customize Dashboard"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">Customize Dashboard Widgets</DialogTitle>
                <CardDescription className="text-xs">
                  Show or hide financial modules to personalize your daily view.
                </CardDescription>
              </DialogHeader>
              <div className="py-2 space-y-3">
                {[
                  { id: "netWorthTrend", label: "Net Worth Trajectory Chart", desc: "6-month estimated growth trend" },
                  { id: "monthlyCashFlow", label: "Monthly Cash Flow (Inflow vs Outflow)", desc: "Income and expense visual progress" },
                  { id: "assetAllocation", label: "Asset Allocation Breakdown", desc: "Liquid vs Invested vs Tangible assets" },
                  { id: "budgetProgress", label: "Active Budget Progress Bar", desc: "Current envelope utilization" },
                  { id: "accountsOverview", label: "Accounts & Banking Balances", desc: "Active bank accounts & cash balances" },
                  { id: "recentTransactions", label: "Recent Transactions Ledger", desc: "Latest incoming and outgoing transactions" },
                  { id: "upcomingBills", label: "Upcoming Bills & Subscriptions", desc: "Payments due in the next 30 days" },
                  { id: "financialGoals", label: "Financial Goals Progress", desc: "Milestones and savings velocity" },
                ].map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/20">
                    <div className="pr-4">
                      <p className="font-semibold text-xs text-foreground">{w.label}</p>
                      <p className="text-[11px] text-muted-foreground">{w.desc}</p>
                    </div>
                    <Switch
                      checked={dashboardWidgets[w.id] !== false}
                      onCheckedChange={() => toggleDashboardWidget(w.id)}
                      aria-label={`Toggle ${w.label}`}
                    />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: PRIMARY FINANCIAL HIERARCHY (7 CORE METRICS)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Row 1: Wealth Foundation (Net Worth, Gross Assets, Gross Liabilities) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Consolidated Net Worth"
            amount={balanceSheet.netWorth}
            subtitle="Assets minus all debt obligations"
            icon={ShieldCheck}
            iconColor="#365CF5"
            coloredAmount
          />
          <MetricCard
            title="Total Assets"
            amount={balanceSheet.totalAssets}
            subtitle="Liquid cash, investments & fixed assets"
            icon={Landmark}
            iconColor="#0F9F75"
          />
          <MetricCard
            title="Total Liabilities"
            amount={balanceSheet.totalLiabilities}
            subtitle="Credit cards, loans & liabilities"
            icon={Scale}
            iconColor="#E05B67"
          />
        </div>

        {/* Row 2: Operational Cash Flow (Liquid, Income, Expense, Savings Rate) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Liquid Capital"
            amount={balanceSheet.totalLiquid}
            subtitle="Checking, savings & cash"
            icon={Wallet}
            iconColor="#365CF5"
          />
          <MetricCard
            title="Monthly Income"
            amount={balanceSheet.monthlyInflow}
            subtitle="Salary & inflows this month"
            icon={TrendingUp}
            iconColor="#0F9F75"
          />
          <MetricCard
            title="Monthly Expenses"
            amount={balanceSheet.monthlyOutflow}
            subtitle="Purchases & bill outflows"
            icon={TrendingDown}
            iconColor="#E05B67"
          />
          <MetricCard
            title="Savings Rate"
            amount={`${balanceSheet.savingsRate}%`}
            subtitle={`Net saved: ₹${parseFloat(balanceSheet.netSavings).toLocaleString()}`}
            icon={Percent}
            iconColor="#8B7CF6"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ANALYTICS WIDGETS (TREND, CASH FLOW, ALLOCATION)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Net Worth Trajectory */}
        {dashboardWidgets.netWorthTrend !== false && (
          <Card className="shadow-xs lg:col-span-2 border-border/80 bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Net Worth Trajectory</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Estimated 6-month growth trend
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/net-worth">
                  <span>Balance Sheet</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {/* Sparkline / Bar visualization */}
              <div className="h-32 flex items-end justify-between gap-3 pt-4 px-2">
                {netWorthTrend.map((item, idx) => {
                  const maxVal = Math.max(...netWorthTrend.map((t) => t.value), 1);
                  const heightPercent = Math.min(100, Math.max(15, (item.value / maxVal) * 100));
                  const isCurrent = idx === netWorthTrend.length - 1;

                  return (
                    <div key={item.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{(item.value / 1000).toFixed(0)}k
                      </div>
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isCurrent
                            ? "bg-primary shadow-sm shadow-primary/30"
                            : "bg-muted/60 hover:bg-muted"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className={`text-[11px] font-medium ${isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Trajectory Insights Footer */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Monthly Savings Velocity: ₹{parseFloat(balanceSheet.netSavings).toLocaleString()}
                </span>
                <span className="font-medium text-foreground">
                  Debt-to-Asset: {balanceSheet.debtToAssetRatio}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget 2: Asset Allocation Breakdown */}
        {dashboardWidgets.assetAllocation !== false && (
          <Card className="shadow-xs border-border/80 bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Coins className="h-4 w-4 text-violet-500" />
                  <span>Asset Allocation</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribution across asset classes
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {parseFloat(balanceSheet.totalAssets) === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No assets recorded yet. Add an account or investment to visualize allocation.
                </div>
              ) : (
                <>
                  {/* Segmented bar */}
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/40">
                    {parseFloat(balanceSheet.totalLiquid) > 0 && (
                      <div
                        className="bg-primary transition-all"
                        style={{
                          width: `${(parseFloat(balanceSheet.totalLiquid) / parseFloat(balanceSheet.totalAssets)) * 100}%`,
                        }}
                        title={`Cash & Bank: ₹${parseFloat(balanceSheet.totalLiquid).toLocaleString()}`}
                      />
                    )}
                    {parseFloat(balanceSheet.totalInvestments) > 0 && (
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{
                          width: `${(parseFloat(balanceSheet.totalInvestments) / parseFloat(balanceSheet.totalAssets)) * 100}%`,
                        }}
                        title={`Investments: ₹${parseFloat(balanceSheet.totalInvestments).toLocaleString()}`}
                      />
                    )}
                    {parseFloat(balanceSheet.totalTangible) > 0 && (
                      <div
                        className="bg-violet-500 transition-all"
                        style={{
                          width: `${(parseFloat(balanceSheet.totalTangible) / parseFloat(balanceSheet.totalAssets)) * 100}%`,
                        }}
                        title={`Fixed Assets: ₹${parseFloat(balanceSheet.totalTangible).toLocaleString()}`}
                      />
                    )}
                  </div>

                  {/* Legend breakdown */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                        <span className="text-muted-foreground">Bank & Liquid Cash</span>
                      </div>
                      <span className="font-semibold font-mono">
                        ₹{parseFloat(balanceSheet.totalLiquid).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">Investments & Equities</span>
                      </div>
                      <span className="font-semibold font-mono">
                        ₹{parseFloat(balanceSheet.totalInvestments).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
                        <span className="text-muted-foreground">Tangible Assets & Property</span>
                      </div>
                      <span className="font-semibold font-mono">
                        ₹{parseFloat(balanceSheet.totalTangible).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: BUDGET UTILIZATION ALERT
      ────────────────────────────────────────────────────────────── */}
      {dashboardWidgets.budgetProgress !== false && activeBudget && budgetUtilization && (
        <Card className="border-l-4 border-l-primary shadow-xs border-border/80 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">
                  {activeBudget.name} Envelope
                </h3>
              </div>
              <span
                className={`text-xs font-mono font-bold ${
                  budgetUtilization.isOverBudget
                    ? "text-destructive"
                    : budgetUtilization.percentage >= 85
                    ? "text-amber-500"
                    : "text-emerald-500"
                }`}
              >
                {budgetUtilization.percentage}% used
              </span>
            </div>

            <Progress
              value={Math.min(budgetUtilization.percentage, 100)}
              indicatorClassName={
                budgetUtilization.isOverBudget
                  ? "bg-destructive"
                  : budgetUtilization.percentage >= 85
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }
              className="h-2"
            />

            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
              <span>
                Spent: <MoneyDisplay amount={activeBudget.totalSpent || "0"} />
              </span>
              <span>
                Remaining: <MoneyDisplay amount={budgetUtilization.remaining} />
              </span>
              <Button asChild variant="link" className="p-0 h-auto text-xs text-primary">
                <Link href="/budgets">Manage Budgets →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: MAIN ACTIVITY GRID (ACCOUNTS & TRANSACTIONS)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Card */}
        {dashboardWidgets.accountsOverview !== false && (
          <Card className="shadow-xs border-border/80 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Your Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  Connected banks and cash balances
                </CardDescription>
              </div>
              <CreateAccountDialog
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>New Account</span>
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {activeAccounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No accounts found</p>
                  <div className="mt-3">
                    <CreateAccountDialog />
                  </div>
                </div>
              ) : (
                <>
                  {activeAccounts.slice(0, 4).map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color || "#365CF5" }}
                        />
                        <div>
                          <p className="font-semibold text-xs sm:text-sm leading-tight text-foreground">
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {acc.institution_name}
                            {acc.account_number_masked && (
                              <span className="ml-1.5 font-mono">
                                {acc.account_number_masked}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <MoneyDisplay
                        amount={acc.current_balance}
                        currency={acc.currency}
                        className="text-xs sm:text-sm font-bold"
                      />
                    </div>
                  ))}

                  <div className="pt-2 text-center">
                    <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                      <Link href="/accounts">
                        <span>View All Accounts ({activeAccounts.length})</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions Card */}
        {dashboardWidgets.recentTransactions !== false && (
          <Card className="shadow-xs border-border/80 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Recent Transactions
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest inflows, purchases, and transfers
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link href="/transactions">
                  <span>View Ledger</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Receipt className="mx-auto h-8 w-8 opacity-40 mb-2" />
                  <p className="text-xs">No transactions recorded yet</p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => openQuickTransaction("expense")}
                      className="text-xs"
                    >
                      Record First Transaction
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {recentTransactions.slice(0, 5).map((txn) => {
                    const isPositive = txn.transaction_type === "income";
                    const isNegative = txn.transaction_type === "expense";

                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-500"
                                : isNegative
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : isNegative ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <ArrowLeftRight className="h-4 w-4" />
                            )}
                          </div>

                          <div className="truncate">
                            <p className="font-semibold text-xs sm:text-sm leading-tight text-foreground truncate">
                              {txn.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {format(new Date(txn.transaction_date), "dd MMM")} •{" "}
                              {txn.category?.name || "General"}
                            </p>
                          </div>
                        </div>

                        <MoneyDisplay
                          amount={txn.amount}
                          currency={txn.currency}
                          positiveSign={isPositive}
                          colored={isPositive || isNegative}
                          className={`text-xs sm:text-sm font-bold shrink-0 ml-2 ${
                            isNegative ? "text-destructive" : ""
                          }`}
                        />
                      </div>
                    );
                  })}

                  <div className="pt-2 text-center">
                    <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                      <Link href="/transactions">
                        <span>Complete Transaction History</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: SECONDARY MODULES (BILLS & GOALS)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        {dashboardWidgets.upcomingBills !== false && (
          <Card className="shadow-xs border-border/80 bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span>Upcoming Bills & Payments</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Subscriptions & EMIs due in 30 days
                </CardDescription>
              </div>
              <Button asChild variant="link" className="text-xs text-primary p-0 h-auto">
                <Link href="/recurring">View All →</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingRecurring.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No upcoming bills scheduled in the next 30 days.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingRecurring.slice(0, 3).map((bill) => (
                    <div
                      key={bill.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-xs text-foreground">{bill.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          Due {format(new Date(bill.next_occurrence_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <MoneyDisplay
                        amount={bill.amount}
                        currency={bill.currency}
                        className="font-bold text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Goals */}
        {dashboardWidgets.financialGoals !== false && (
          <Card className="shadow-xs border-border/80 bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span>Financial Goals</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Long-term savings milestones
                </CardDescription>
              </div>
              <Button asChild variant="link" className="text-xs text-primary p-0 h-auto">
                <Link href="/goals">View All →</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {goals.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No financial goals created yet.
                  <div className="mt-2">
                    <Button asChild variant="outline" size="sm" className="text-xs h-7">
                      <Link href="/goals">Create First Goal</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.slice(0, 3).map((g) => {
                    const target = parseFloat(g.target_amount) || 1;
                    const current = parseFloat(g.current_amount) || 0;
                    const percent = Math.min(100, Math.round((current / target) * 100));

                    return (
                      <div key={g.id} className="space-y-1.5 p-2 rounded-lg bg-muted/20 border border-border/50">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-foreground">{g.name}</span>
                          <span className="font-mono text-muted-foreground">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>₹{current.toLocaleString()} saved</span>
                          <span>Target: ₹{target.toLocaleString()}</span>
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
    </div>
  );
}
