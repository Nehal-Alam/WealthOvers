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
  PieChart,
  Briefcase,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  RotateCcw,
  Info,
} from "lucide-react";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { useUIStore } from "@/stores/ui-store";

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

const CreateInvestmentDialog = dynamic(
  () =>
    import("@/components/investments/create-investment-dialog").then(
      (m) => m.CreateInvestmentDialog
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
  calculateBudgetUtilization,
  calculateBalanceSheetRatios,
  calculateInvestmentReturns,
  generateDeterministicInsights,
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
  const { openQuickTransaction, dashboardWidgets, toggleDashboardWidget, setDashboardWidgetVisible } = useUIStore();
  const [selectedPeriod, setSelectedPeriod] = React.useState<"month" | "quarter" | "year">("month");
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
      const sourceTxns = monthTransactions.length > 0 ? monthTransactions : recentTransactions;
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
  }, [activeAccounts, investments, assets, loans, liabilities, precomputedSummary, monthTransactions, recentTransactions]);

  // 2. Visualisation: Estimated Net Worth Trend (past 6 months trajectory)
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

  // 3. Visualisation: Monthly Cash Flow (Income vs Expenses comparison)
  const cashFlowAnalysis = React.useMemo(() => {
    const inflow = parseFloat(balanceSheet.monthlyInflow) || 0;
    const outflow = parseFloat(balanceSheet.monthlyOutflow) || 0;
    const totalVolume = Math.max(inflow + outflow, 1);
    const inflowPct = Math.round((inflow / totalVolume) * 100);
    const outflowPct = Math.round((outflow / totalVolume) * 100);
    const netFlow = inflow - outflow;
    const isPositive = netFlow >= 0;

    return {
      inflow,
      outflow,
      inflowPct,
      outflowPct,
      netFlow,
      isPositive,
      netSavingsFormatted: Math.abs(netFlow).toLocaleString(),
    };
  }, [balanceSheet.monthlyInflow, balanceSheet.monthlyOutflow]);

  // 4. Visualisation: Expense Breakdown by Category
  const expenseBreakdown = React.useMemo(() => {
    const txns = monthTransactions.length > 0 ? monthTransactions : recentTransactions;
    const catMap: Record<string, { name: string; color: string; amount: string; count: number }> = {};
    let totalMonthExpense = "0.0000";

    for (const t of txns) {
      if (t.transaction_type === "expense") {
        totalMonthExpense = addMoney(totalMonthExpense, t.amount);
        const catId = t.category?.id || "uncategorized";
        const catName = t.category?.name || "General & Other";
        const catColor = t.category?.color || "#4F46E5";

        if (!catMap[catId]) {
          catMap[catId] = { name: catName, color: catColor, amount: "0.0000", count: 0 };
        }
        catMap[catId].amount = addMoney(catMap[catId].amount, t.amount);
        catMap[catId].count += 1;
      }
    }

    const totalNum = parseFloat(totalMonthExpense);
    const sorted = Object.values(catMap)
      .map((c) => {
        const amt = parseFloat(c.amount);
        const pct = totalNum > 0 ? Math.round((amt / totalNum) * 100) : 0;
        return { ...c, percentage: pct, numAmount: amt };
      })
      .sort((a, b) => b.numAmount - a.numAmount);

    return {
      totalMonthExpense,
      categories: sorted.slice(0, 5),
      hasExpenses: sorted.length > 0,
    };
  }, [monthTransactions, recentTransactions]);

  // 5. Visualisation: Investment Performance Summary & Holdings
  const investmentPortfolio = React.useMemo(() => {
    let totalInvested = "0.0000";
    let totalValuation = "0.0000";

    const holdingItems = investments.map((inv) => {
      const ret = calculateInvestmentReturns(
        inv.total_quantity || 0,
        inv.average_buy_price || 0,
        inv.current_nav_or_price || inv.average_buy_price || 0,
        inv.currency || "INR",
        DEFAULT_USD_INR_RATE
      );
      totalInvested = addMoney(totalInvested, ret.investedAmount);
      totalValuation = addMoney(totalValuation, ret.currentValuation);

      return {
        ...inv,
        investedAmount: ret.investedAmount,
        currentValuation: ret.currentValuation,
        unrealizedPnL: ret.unrealizedPnL,
        absoluteReturnPercent: ret.absoluteReturnPercent,
        isPositive: ret.isProfit,
      };
    });

    const totalPnL = subtractMoney(totalValuation, totalInvested);
    const isPositiveReturn = parseFloat(totalPnL) >= 0;
    const investedNum = parseFloat(totalInvested);
    const overallReturnPct =
      investedNum > 0
        ? ((parseFloat(totalPnL) / investedNum) * 100).toFixed(2)
        : "0.00";

    return {
      totalInvested,
      totalValuation,
      totalPnL,
      isPositiveReturn,
      overallReturnPct,
      holdings: holdingItems.slice(0, 4),
      hasInvestments: investments.length > 0,
    };
  }, [investments]);

  // 6. Deterministic Financial Insights Engine
  const deterministicInsights = React.useMemo(() => {
    const txns = monthTransactions.length > 0 ? monthTransactions : recentTransactions;
    return generateDeterministicInsights(txns, balanceSheet.totalLiquid);
  }, [monthTransactions, recentTransactions, balanceSheet.totalLiquid]);

  // 7. Budget utilization
  const budgetUtilization = React.useMemo(() => {
    if (!activeBudget) return null;
    return calculateBudgetUtilization(
      activeBudget.total_amount,
      activeBudget.totalSpent || "0.0000"
    );
  }, [activeBudget]);

  // Widget Catalog for Customization Dialog
  const widgetCatalog = [
    { id: "netWorthTrend", label: "Net Worth Trajectory Chart", desc: "6-month estimated growth trend & velocity", icon: BarChart3 },
    { id: "monthlyCashFlow", label: "Monthly Cash Flow (Inflow vs Outflow)", desc: "Income and expense visual progress", icon: ArrowLeftRight },
    { id: "assetAllocation", label: "Asset Allocation Breakdown", desc: "Liquid vs Invested vs Tangible portfolio split", icon: Coins },
    { id: "expenseBreakdown", label: "Expense Breakdown by Category", desc: "Top spending distribution & category breakdown", icon: PieChart },
    { id: "investmentPerformance", label: "Investment Portfolio Performance", desc: "Invested capital, current valuation & returns", icon: TrendingUp },
    { id: "financialInsights", label: "Financial Health Insights", desc: "Deterministic runway, spending drivers & guidance", icon: Sparkles },
    { id: "budgetProgress", label: "Active Budget Progress Bar", desc: "Current envelope utilization & headroom", icon: PiggyBank },
    { id: "accountsOverview", label: "Accounts & Banking Balances", desc: "Active bank accounts & cash balances", icon: Landmark },
    { id: "recentTransactions", label: "Recent Transactions Ledger", desc: "Latest incoming and outgoing transactions", icon: Receipt },
    { id: "upcomingBills", label: "Upcoming Bills & Subscriptions", desc: "Payments due in the next 30 days", icon: Calendar },
    { id: "financialGoals", label: "Financial Goals Progress", desc: "Savings milestones and completion velocity", icon: Target },
  ];

  const handleSelectAllWidgets = (visible: boolean) => {
    widgetCatalog.forEach((w) => setDashboardWidgetVisible(w.id, visible));
  };

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
            <DialogContent className="max-w-lg bg-card max-h-[85vh] flex flex-col">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-base font-bold">Customize Dashboard Widgets</DialogTitle>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllWidgets(true)}
                      className="text-[11px] h-6 px-2 text-primary"
                    >
                      Show All
                    </Button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllWidgets(false)}
                      className="text-[11px] h-6 px-2 text-muted-foreground"
                    >
                      Hide All
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Show or hide financial modules to personalize your daily view. All preferences are preserved.
                </CardDescription>
              </DialogHeader>

              <div className="py-2 space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
                {widgetCatalog.map((w) => {
                  const Icon = w.icon;
                  const isChecked = dashboardWidgets[w.id] !== false;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 pr-4">
                        <div className="p-1.5 rounded-md bg-muted/60 text-primary mt-0.5 shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-foreground leading-snug">{w.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{w.desc}</p>
                        </div>
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
          SECTION 2: PRIMARY FINANCIAL HIERARCHY (7 CORE METRICS)
          Better spacing & hierarchy: avoids displaying too many cards in one row
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3.5">
        {/* Tier 1: Core Balance Sheet Pillars (3 Large Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Consolidated Net Worth"
            amount={balanceSheet.netWorth}
            subtitle="Assets minus all debt obligations"
            icon={ShieldCheck}
            iconColor="indigo"
            coloredAmount
          />
          <MetricCard
            title="Total Assets"
            amount={balanceSheet.totalAssets}
            subtitle="Liquid cash, investments & fixed assets"
            icon={Landmark}
            iconColor="emerald"
          />
          <MetricCard
            title="Total Liabilities"
            amount={balanceSheet.totalLiabilities}
            subtitle="Credit cards, loans & external debts"
            icon={Scale}
            iconColor="coral"
          />
        </div>

        {/* Tier 2: Operational Cash Flow & Liquidity (Balanced 4 Cards Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <MetricCard
            title="Liquid Capital"
            amount={balanceSheet.totalLiquid}
            subtitle="Checking, savings & cash"
            icon={Wallet}
            iconColor="indigo"
          />
          <MetricCard
            title="Monthly Income"
            amount={balanceSheet.monthlyInflow}
            subtitle="Total inflows this month"
            icon={TrendingUp}
            iconColor="emerald"
          />
          <MetricCard
            title="Monthly Expenses"
            amount={balanceSheet.monthlyOutflow}
            subtitle="Purchases & bill outflows"
            icon={TrendingDown}
            iconColor="coral"
          />
          <MetricCard
            title="Savings Rate"
            amount={`${balanceSheet.savingsRate}%`}
            formatType="percent"
            subtitle={`Net saved: ₹${parseFloat(balanceSheet.netSavings).toLocaleString()}`}
            icon={Percent}
            iconColor="violet"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: PRIMARY VISUALISATIONS (NET WORTH TREND & ASSET ALLOCATION)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualisation 1: Net Worth Trajectory */}
        {dashboardWidgets.netWorthTrend !== false && (
          <Card className="shadow-xs lg:col-span-2 border-border/80 bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>Net Worth Trajectory</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Estimated 6-month wealth trajectory and growth pace
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
              {/* Trajectory Bar Chart */}
              <div className="h-36 flex items-end justify-between gap-3 pt-4 px-2">
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
                  Monthly Savings Velocity: <span className="font-semibold text-foreground">₹{parseFloat(balanceSheet.netSavings).toLocaleString()}</span>
                </span>
                <span className="font-medium text-foreground">
                  Debt-to-Asset: {balanceSheet.debtToAssetRatio}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visualisation 2: Asset Allocation Breakdown */}
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
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/assets">
                  <span>Assets</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
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
          SECTION 4: OPERATIONAL VISUALISATIONS
          (INCOME VS EXPENSES, EXPENSE BREAKDOWN, INVESTMENT PERFORMANCE)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Visualisation 3: Monthly Cash Flow (Income vs Expenses) */}
        {dashboardWidgets.monthlyCashFlow !== false && (
          <Card className="shadow-xs border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
                  <span>Income vs Expenses</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly cash-flow comparison
                </CardDescription>
              </div>
              <Badge
                variant={cashFlowAnalysis.isPositive ? "outline" : "destructive"}
                className={`text-[10px] ${
                  cashFlowAnalysis.isPositive
                    ? "text-emerald-500 border-emerald-500/30"
                    : "text-destructive border-destructive/30"
                }`}
              >
                {cashFlowAnalysis.isPositive ? "Surplus" : "Deficit"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Side-by-side Flow Meters */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      Inflow
                    </span>
                    <span className="font-semibold font-mono text-emerald-500">
                      ₹{cashFlowAnalysis.inflow.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={cashFlowAnalysis.inflowPct}
                    className="h-2 bg-muted/40"
                    indicatorClassName="bg-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      Outflow
                    </span>
                    <span className="font-semibold font-mono text-destructive">
                      ₹{cashFlowAnalysis.outflow.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={cashFlowAnalysis.outflowPct}
                    className="h-2 bg-muted/40"
                    indicatorClassName="bg-destructive"
                  />
                </div>
              </div>

              {/* Net Flow Summary Box */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[11px] text-muted-foreground">Net Monthly Cash Flow</p>
                  <p className={`font-bold font-mono text-sm ${cashFlowAnalysis.isPositive ? "text-emerald-500" : "text-destructive"}`}>
                    {cashFlowAnalysis.isPositive ? "+" : "-"}₹{cashFlowAnalysis.netSavingsFormatted}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Savings Rate</p>
                  <p className="font-bold text-sm text-foreground">{balanceSheet.savingsRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visualisation 4: Expense Breakdown by Category */}
        {dashboardWidgets.expenseBreakdown !== false && (
          <Card className="shadow-xs border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  <span>Expense Breakdown</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Current month category spending
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/reports">
                  <span>Details</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!expenseBreakdown.hasExpenses ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No expense transactions this month.
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openQuickTransaction("expense")}
                      className="text-xs h-7"
                    >
                      Record First Expense
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {expenseBreakdown.categories.map((cat) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium truncate text-foreground">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-muted-foreground text-[11px]">{cat.percentage}%</span>
                          <span className="font-semibold font-mono">₹{cat.numAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <Progress
                        value={cat.percentage}
                        className="h-1.5 bg-muted/40"
                        indicatorClassName="bg-primary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Visualisation 5: Investment Performance */}
        {dashboardWidgets.investmentPerformance !== false && (
          <Card className="shadow-xs border-border/80 bg-card flex flex-col justify-between">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                  <span>Investment Performance</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Portfolio valuation & unrealized P&L
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/investments">
                  <span>Portfolio</span>
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!investmentPortfolio.hasInvestments ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No investments recorded yet.
                  <div className="mt-2">
                    <CreateInvestmentDialog
                      accounts={accounts}
                      trigger={
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Add First Asset
                        </Button>
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Portfolio Return Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total Invested</p>
                      <p className="font-semibold font-mono">
                        ₹{parseFloat(investmentPortfolio.totalInvested).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Current Valuation</p>
                      <p className="font-semibold font-mono">
                        ₹{parseFloat(investmentPortfolio.totalValuation).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Unrealized Return:</span>
                      <span
                        className={`font-bold font-mono ${
                          investmentPortfolio.isPositiveReturn ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {investmentPortfolio.isPositiveReturn ? "+" : "-"}₹
                        {Math.abs(parseFloat(investmentPortfolio.totalPnL)).toLocaleString()} (
                        {investmentPortfolio.overallReturnPct}%)
                      </span>
                    </div>
                  </div>

                  {/* Top Holdings Mini-List */}
                  <div className="space-y-1.5">
                    {investmentPortfolio.holdings.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-1.5 rounded-md text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold leading-tight truncate text-foreground">{h.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{h.symbol || h.asset_type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold font-mono">₹{parseFloat(h.currentValuation).toLocaleString()}</p>
                          <p
                            className={`text-[10px] font-mono ${
                              h.isPositive ? "text-emerald-500" : "text-destructive"
                            }`}
                          >
                            {h.isPositive ? "+" : ""}{h.absoluteReturnPercent}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: FINANCIAL HEALTH INSIGHTS
      ────────────────────────────────────────────────────────────── */}
      {dashboardWidgets.financialInsights !== false && (
        <Card className="shadow-xs border-border/80 bg-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Financial Health Insights</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time deterministic calculations based on your cash flow and liquidity
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              Runway: {deterministicInsights.liquidRunwayMonths} Months
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 3 Metric Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Emergency Runway
                </p>
                <p className="text-base font-bold font-mono text-foreground mt-0.5">
                  {deterministicInsights.liquidRunwayMonths} mo
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Living expenses covered by liquid cash</p>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <PieChart className="h-3.5 w-3.5 text-primary" />
                  Top Expense Driver
                </p>
                <p className="text-base font-bold text-foreground mt-0.5 truncate">
                  {deterministicInsights.topExpenseCategory ? deterministicInsights.topExpenseCategory.name : "None"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {deterministicInsights.topExpenseCategory
                    ? `${deterministicInsights.topExpenseCategory.percentage}% of total monthly outflows`
                    : "No expense recorded"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                  Savings Velocity
                </p>
                <p className="text-base font-bold font-mono text-foreground mt-0.5">
                  {balanceSheet.savingsRate}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ₹{parseFloat(balanceSheet.netSavings).toLocaleString()} saved this month
                </p>
              </div>
            </div>

            {/* Insight Alerts */}
            {deterministicInsights.insights.length > 0 && (
              <div className="space-y-2 pt-1">
                {deterministicInsights.insights.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      item.type === "positive"
                        ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                        : item.type === "warning"
                        ? "border-amber-500/30 bg-amber-500/5 text-foreground"
                        : "border-border/60 bg-muted/20 text-foreground"
                    }`}
                  >
                    <Info className={`h-4 w-4 shrink-0 mt-0.5 ${
                      item.type === "positive" ? "text-emerald-500" : item.type === "warning" ? "text-amber-500" : "text-primary"
                    }`} />
                    <div>
                      <p className="font-semibold text-xs leading-tight">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: ACTIVE BUDGET UTILIZATION ALERT
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
          SECTION 7: MAIN ACTIVITY GRID (ACCOUNTS & RECENT TRANSACTIONS)
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
                          style={{ backgroundColor: acc.color || "hsl(var(--primary))" }}
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
          SECTION 8: PLANNING & COMMITMENTS (BILLS & GOALS)
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
