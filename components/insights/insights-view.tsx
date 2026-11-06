"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  TrendingDown,
  TrendingUp,
  Percent,
  PiggyBank,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Landmark,
  Building2,
  Coins,
  Scale,
  HandCoins,
  CreditCard,
  Wallet,
  Activity,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const CashFlowChart = dynamic(
  () =>
    import("@/components/reports/cash-flow-chart").then(
      (mod) => mod.CashFlowChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary font-mono">
        Loading cash flow analytics...
      </div>
    ),
  }
);

const CategoryPieChart = dynamic(
  () =>
    import("@/components/reports/category-pie-chart").then(
      (mod) => mod.CategoryPieChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary font-mono">
        Loading category breakdown...
      </div>
    ),
  }
);

import { DailySpendingScrubber } from "@/components/reports/daily-spending-scrubber";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "@/components/financial/metric-card";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  generateDeterministicInsights,
  getTransactionDisplayInfo,
  toDecimal,
} from "@/lib/calculations/financial";
import {
  DateDurationFilter,
  DATE_FILTER_OPTIONS,
  getDateRangeFromFilter,
  filterTransactionsByDateRange,
} from "@/lib/calculations/date-ranges";
import Decimal from "decimal.js";
import { MobileInsightsView } from "@/components/insights/mobile-insights-view";

interface InsightsViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
  investments?: any[];
  assets?: any[];
  loans?: any[];
  liabilities?: any[];
}

export function InsightsView({
  transactions,
  accounts,
  categories,
  investments = [],
  assets = [],
  loans = [],
  liabilities = [],
}: InsightsViewProps) {
  // Default to Indian Financial Year
  const [selectedDuration, setSelectedDuration] =
    React.useState<DateDurationFilter>("financial_year");
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");
  const [appliedCustomStart, setAppliedCustomStart] = React.useState<string | null>(null);
  const [appliedCustomEnd, setAppliedCustomEnd] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"scrubber" | "trends">("trends");
  const [showAllInsights, setShowAllInsights] = React.useState<boolean>(false);

  const dateRange = React.useMemo(() => {
    return getDateRangeFromFilter(
      selectedDuration,
      appliedCustomStart,
      appliedCustomEnd
    );
  }, [selectedDuration, appliedCustomStart, appliedCustomEnd]);

  // Filter transactions by selected duration
  const filteredTransactions = React.useMemo(() => {
    return filterTransactionsByDateRange(transactions, dateRange);
  }, [transactions, dateRange]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. FINANCIAL OVERVIEW METRICS
  // ──────────────────────────────────────────────────────────────────────────
  const { totalInflow, totalOutflow, netSavings, savingsRate, categoryExpenses } =
    React.useMemo(() => {
      let inc = "0.0000";
      let exp = "0.0000";
      const catMap: Record<string, string> = {};

      for (const t of filteredTransactions) {
        const info = getTransactionDisplayInfo(t);
        if (info.direction === "inflow") {
          inc = addMoney(inc, t.amount);
        } else if (info.direction === "outflow") {
          exp = addMoney(exp, t.amount);
          const cId = t.category_id || "uncategorized";
          catMap[cId] = addMoney(catMap[cId] || "0.0000", t.amount);
        }
      }

      const { netSavings: net, savingsRatePercent } = calculateSavingsRate(inc, exp);

      return {
        totalInflow: inc,
        totalOutflow: exp,
        netSavings: net,
        savingsRate: savingsRatePercent,
        categoryExpenses: catMap,
      };
    }, [filteredTransactions]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SPENDING ANALYTICS (Top Merchants, Velocity, Anomalies)
  // ──────────────────────────────────────────────────────────────────────────
  const { topMerchants, spendingVelocity, daysInPeriod } = React.useMemo(() => {
    const merchantMap = new Map<string, { total: Decimal; count: number }>();
    let outflowCount = 0;
    let outflowTotal = new Decimal(0);

    for (const t of filteredTransactions) {
      const info = getTransactionDisplayInfo(t);
      if (info.direction === "outflow") {
        const amt = toDecimal(t.amount || 0);
        outflowTotal = outflowTotal.plus(amt);
        outflowCount += 1;

        const name = (t.merchant_or_person || t.description || "Uncategorized").trim();
        const curr = merchantMap.get(name) || { total: new Decimal(0), count: 0 };
        curr.total = curr.total.plus(amt);
        curr.count += 1;
        merchantMap.set(name, curr);
      }
    }

    let days = 30;
    if (dateRange.start && dateRange.end) {
      const diff = Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24)
      );
      days = Math.max(1, Math.min(diff, 365));
    }

    const dailyRunRate = Math.round(outflowTotal.toNumber() / days);
    const avgTicket = outflowCount > 0 ? Math.round(outflowTotal.toNumber() / outflowCount) : 0;

    const sortedMerchants = Array.from(merchantMap.entries())
      .map(([name, stat]) => ({
        name,
        total: stat.total.toNumber(),
        count: stat.count,
        percent: outflowTotal.greaterThan(0)
          ? Math.round((stat.total.toNumber() / outflowTotal.toNumber()) * 100)
          : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      topMerchants: sortedMerchants,
      spendingVelocity: {
        dailyRunRate,
        avgTicket,
        outflowCount,
      },
      daysInPeriod: days,
    };
  }, [filteredTransactions, dateRange]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. WEALTH ANALYTICS (Net Worth, Asset Allocation, Liabilities)
  // ──────────────────────────────────────────────────────────────────────────
  const wealthMetrics = React.useMemo(() => {
    let liquid = new Decimal(0);
    for (const a of accounts.filter((acc) => !acc.is_archived)) {
      if (a.account_type !== "credit_card" && a.account_type !== "loan_account") {
        liquid = liquid.plus(toDecimal(a.current_balance || 0));
      }
    }

    let invest = new Decimal(0);
    for (const inv of investments) {
      invest = invest.plus(toDecimal(inv.current_value || 0));
    }

    let physAssets = new Decimal(0);
    for (const ast of assets) {
      physAssets = physAssets.plus(toDecimal(ast.current_valuation || 0));
    }

    let borrowedLoans = new Decimal(0);
    let outstandingLoans = new Decimal(0);
    let receivables = new Decimal(0);

    for (const l of loans) {
      const bal = toDecimal(l.outstanding_balance || 0);
      const principal = toDecimal(l.principal_amount || l.outstanding_balance || 0);
      if (l.loan_type === "loan_given" || l.loan_type === "lending") {
        receivables = receivables.plus(bal);
      } else {
        borrowedLoans = borrowedLoans.plus(principal);
        outstandingLoans = outstandingLoans.plus(bal);
      }
    }

    let extDebts = new Decimal(0);
    for (const d of liabilities) {
      extDebts = extDebts.plus(toDecimal(d.outstanding_amount || 0));
    }

    const totalAssets = liquid.plus(invest).plus(physAssets).plus(receivables);
    const totalLiabilities = outstandingLoans.plus(extDebts);
    const netWorth = totalAssets.minus(totalLiabilities);

    const assetTotalNum = totalAssets.greaterThan(0) ? totalAssets.toNumber() : 1;
    const liquidPct = Math.round((liquid.toNumber() / assetTotalNum) * 100);
    const investPct = Math.round((invest.toNumber() / assetTotalNum) * 100);
    const physPct = Math.max(0, 100 - liquidPct - investPct);

    // Loan repayment progress
    const loanRepaidPct = borrowedLoans.greaterThan(0)
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              borrowedLoans.minus(outstandingLoans).dividedBy(borrowedLoans).toNumber() * 100
            )
          )
        )
      : 100;

    return {
      netWorth: netWorth.toNumber(),
      totalAssets: totalAssets.toNumber(),
      totalLiabilities: totalLiabilities.toNumber(),
      liquid: liquid.toNumber(),
      investments: invest.toNumber(),
      physicalAssets: physAssets.toNumber(),
      outstandingLoans: outstandingLoans.toNumber(),
      externalDebts: extDebts.toNumber(),
      liquidPct,
      investPct,
      physPct,
      loanRepaidPct,
      borrowedLoans: borrowedLoans.toNumber(),
    };
  }, [accounts, investments, assets, loans, liabilities]);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. AI FINANCIAL INTELLIGENCE & HEALTH SCORE
  // ──────────────────────────────────────────────────────────────────────────
  const deterministicInsights = React.useMemo(() => {
    let liquid = "0.0000";
    for (const a of accounts.filter((acc) => !acc.is_archived)) {
      if (a.account_type !== "credit_card" && a.account_type !== "loan_account") {
        liquid = addMoney(liquid, a.current_balance);
      }
    }

    const res = generateDeterministicInsights(filteredTransactions, liquid);

    // Compute Financial Health Score (0 - 100)
    let score = 70;
    const sRate = parseFloat(savingsRate);
    if (sRate >= 30) score += 15;
    else if (sRate >= 15) score += 8;
    else if (sRate < 0) score -= 15;

    const runway = parseFloat(res.liquidRunwayMonths || "0");
    if (runway >= 6) score += 15;
    else if (runway >= 3) score += 8;
    else if (runway < 1) score -= 15;

    const finalScore = Math.max(10, Math.min(100, score));

    return {
      ...res,
      healthScore: finalScore,
    };
  }, [filteredTransactions, accounts, savingsRate]);

  // Chart data formatting
  const { cashFlowChartData, categoryChartData } = React.useMemo(() => {
    const monthMap: Record<string, { income: number; expense: number }> = {};
    for (const t of filteredTransactions) {
      const m = format(new Date(t.transaction_date), "MMM yyyy");
      if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
      const amt = parseFloat(String(t.amount || 0));
      const info = getTransactionDisplayInfo(t);
      if (info.direction === "inflow") {
        monthMap[m].income += amt;
      } else if (info.direction === "outflow") {
        monthMap[m].expense += amt;
      }
    }
    const cashFlowData = Object.entries(monthMap).map(([month, val]) => ({
      month,
      income: val.income,
      expense: val.expense,
    }));

    const catMap: Record<string, number> = {};
    for (const t of filteredTransactions) {
      const info = getTransactionDisplayInfo(t);
      if (info.direction === "outflow") {
        const catName = t.category?.name || info.badgeLabel || "Uncategorized";
        catMap[catName] = (catMap[catName] || 0) + parseFloat(String(t.amount || 0));
      }
    }
    const categoryData = Object.entries(catMap).map(([name, amount]) => ({
      name,
      amount,
    }));

    return { cashFlowChartData: cashFlowData, categoryChartData: categoryData };
  }, [filteredTransactions]);

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      setAppliedCustomStart(customStart);
      setAppliedCustomEnd(customEnd);
    }
  };

  const handleResetFilter = () => {
    setSelectedDuration("financial_year");
    setCustomStart("");
    setCustomEnd("");
    setAppliedCustomStart(null);
    setAppliedCustomEnd(null);
  };

  // Initially show max 3 AI insight cards
  const visibleInsights = showAllInsights
    ? deterministicInsights.insights
    : deterministicInsights.insights.slice(0, 3);

  return (
    <>
      {/* Mobile Insights View (References 1 & 2) */}
      <div className="block lg:hidden">
        <MobileInsightsView
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          investments={investments}
          assets={assets}
          loans={loans}
          liabilities={liabilities}
        />
      </div>

      {/* Desktop Terminal Analytics */}
      <div className="hidden lg:block space-y-6 max-w-6xl mx-auto pb-10">
      {/* ─────────────────────────────────────────────────────────────
          TOP HEADER & DURATION FILTER BAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary font-mono flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-terminalAccent" />
            FINANCIAL STATS & INTELLIGENCE
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Spending velocity, cash flow trends, wealth allocation, and AI health metrics.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedDuration}
            onValueChange={(val) => {
              setSelectedDuration(val as DateDurationFilter);
              if (val !== "custom") {
                setAppliedCustomStart(null);
                setAppliedCustomEnd(null);
              }
            }}
          >
            <SelectTrigger className="h-9 min-w-[180px] text-xs font-semibold rounded-xl border-border bg-surface text-text-primary shadow-xs font-mono">
              <Calendar className="mr-2 h-3.5 w-3.5 text-terminalAccent" />
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              {DATE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs font-mono">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedDuration === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-36 text-xs bg-surface border-border font-mono"
                aria-label="Start Date"
              />
              <span className="text-xs text-text-secondary">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-36 text-xs bg-surface border-border font-mono"
                aria-label="End Date"
              />
              <Button
                size="sm"
                onClick={handleApplyCustom}
                className="h-9 bg-primary hover:bg-primary-hover text-surface text-xs font-semibold rounded-xl"
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="h-9 border-border text-xs rounded-xl"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          )}

          {/* Active Duration Indicator Badge */}
          <Badge
            variant="outline"
            className="text-xs font-mono py-1 px-2.5 rounded-lg border-terminalAccent/30 text-terminalAccent bg-terminalAccent/10"
          >
            {dateRange.label}
          </Badge>

          <Link href="/ai-assistant">
            <Button
              size="sm"
              className="h-9 gap-1.5 font-mono text-xs bg-terminalAccent hover:bg-terminalAccent/90 text-app-bg font-semibold rounded-xl"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Terminal
            </Button>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: FINANCIAL OVERVIEW (Inflow, Outflow, Savings, Cash Flow)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-positive" />
            1. FINANCIAL OVERVIEW
          </h3>
          <span className="text-xs font-mono text-text-secondary">{dateRange.label}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Total Inflow"
            amount={totalInflow}
            subtitle={`Income in ${dateRange.label}`}
            icon={TrendingUp}
            iconColor="emerald"
            coloredAmount
          />
          <MetricCard
            title="Total Outflow"
            amount={totalOutflow}
            subtitle={`Expenses in ${dateRange.label}`}
            icon={TrendingDown}
            iconColor="coral"
            coloredAmount={false}
          />
          <MetricCard
            title="Net Savings"
            amount={netSavings}
            subtitle="Preserved capital"
            icon={PiggyBank}
            iconColor="forest"
            coloredAmount
          />
          <MetricCard
            title="Savings Rate"
            amount={`${savingsRate}%`}
            formatType="percent"
            subtitle="Income retention ratio"
            icon={Percent}
            iconColor="indigo"
          />
        </div>

        {/* Cash Flow Trends Chart Card */}
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs p-4">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-text-primary font-mono">
                Cash Flow Trends (Inflow vs Outflow)
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary font-mono">
                Monthly income and expenditure comparison
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70">
              <button
                onClick={() => setActiveTab("trends")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeTab === "trends"
                    ? "bg-terminalAccent text-app-bg shadow-2xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Cash Flow Chart
              </button>
              <button
                onClick={() => setActiveTab("scrubber")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeTab === "scrubber"
                    ? "bg-terminalAccent text-app-bg shadow-2xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Daily Scrubber
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeTab === "trends" ? (
              <CashFlowChart data={cashFlowChartData} />
            ) : (
              <DailySpendingScrubber transactions={filteredTransactions} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: SPENDING ANALYTICS (Category, Velocity, Top Merchants)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-terminalAccent" />
          2. SPENDING ANALYTICS & VELOCITY
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Spending Velocity Metrics */}
          <Card className="bg-surface border-border p-4 rounded-xl space-y-3">
            <span className="text-xs font-mono font-bold text-text-primary block">
              Spending Velocity
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-text-secondary">Daily Burn Rate</span>
                <span className="font-mono font-bold text-negative tabular-nums">
                  ₹{spendingVelocity.dailyRunRate.toLocaleString("en-IN")} / day
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-text-secondary">Average Ticket Size</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">
                  ₹{spendingVelocity.avgTicket.toLocaleString("en-IN")} / tx
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-text-secondary">Total Expense Outflows</span>
                <span className="font-mono font-bold text-text-primary tabular-nums">
                  {spendingVelocity.outflowCount} transactions
                </span>
              </div>
            </div>
          </Card>

          {/* Top Merchants by Spend */}
          <Card className="bg-surface border-border p-4 rounded-xl space-y-3 md:col-span-2">
            <span className="text-xs font-mono font-bold text-text-primary block">
              Top Merchants & Counterparties
            </span>
            {topMerchants.length === 0 ? (
              <p className="text-xs text-text-secondary py-2 text-center">
                No merchant spending recorded in this period.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {topMerchants.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5">
                    <div className="truncate max-w-[200px] sm:max-w-[320px]">
                      <span className="font-semibold text-text-primary">{m.name}</span>
                      <span className="text-[10px] text-text-secondary font-mono ml-2">
                        ({m.count} txs)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-negative tabular-nums">
                      ₹{m.total.toLocaleString("en-IN")} ({m.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Category Distribution Chart */}
        <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-semibold text-text-primary font-mono">
              Spending by Category
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary font-mono">
              Expense distribution across budget envelopes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <CategoryPieChart data={categoryChartData} />
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: WEALTH ANALYTICS (Net Worth, Asset Allocation, Liabilities)
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-info" />
          3. WEALTH ANALYTICS & ALLOCATION
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Net Worth Card */}
          <Card className="bg-surface border-border p-4 rounded-xl space-y-2">
            <span className="text-[10px] font-mono text-text-secondary uppercase block">
              TOTAL NET WORTH
            </span>
            <div className="text-2xl font-mono font-bold text-text-primary tabular-nums">
              ₹{wealthMetrics.netWorth.toLocaleString("en-IN")}
            </div>
            <div className="pt-2 border-t border-border/40 text-xs space-y-1">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Total Assets:</span>
                <span className="font-mono font-medium text-positive">
                  ₹{wealthMetrics.totalAssets.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-secondary">
                <span>Total Liabilities:</span>
                <span className="font-mono font-medium text-negative">
                  -₹{wealthMetrics.totalLiabilities.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </Card>

          {/* Asset Allocation Breakdown */}
          <Card className="bg-surface border-border p-4 rounded-xl space-y-2.5">
            <span className="text-xs font-mono font-bold text-text-primary block">
              Asset Allocation
            </span>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between py-0.5">
                  <span className="text-text-secondary">Liquid Bank & Cash</span>
                  <span className="font-mono font-semibold text-text-primary">
                    ₹{wealthMetrics.liquid.toLocaleString("en-IN")} ({wealthMetrics.liquidPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-positive rounded-full" style={{ width: `${wealthMetrics.liquidPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-0.5">
                  <span className="text-text-secondary">Investments</span>
                  <span className="font-mono font-semibold text-text-primary">
                    ₹{wealthMetrics.investments.toLocaleString("en-IN")} ({wealthMetrics.investPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-terminalAccent rounded-full" style={{ width: `${wealthMetrics.investPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-0.5">
                  <span className="text-text-secondary">Physical & Fixed Assets</span>
                  <span className="font-mono font-semibold text-text-primary">
                    ₹{wealthMetrics.physicalAssets.toLocaleString("en-IN")} ({wealthMetrics.physPct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full" style={{ width: `${wealthMetrics.physPct}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Liabilities & Loan Amortization Progress */}
          <Card className="bg-surface border-border p-4 rounded-xl space-y-3">
            <span className="text-xs font-mono font-bold text-text-primary block">
              Liabilities & Loan Progress
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Outstanding Loans</span>
                <span className="font-mono font-bold text-negative">
                  ₹{wealthMetrics.outstandingLoans.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Private Debts</span>
                <span className="font-mono font-bold text-negative">
                  ₹{wealthMetrics.externalDebts.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="pt-2 border-t border-border/40">
                <div className="flex justify-between text-[11px] font-mono py-0.5">
                  <span className="text-text-secondary">Loan Principal Amortized</span>
                  <span className="font-bold text-positive">{wealthMetrics.loanRepaidPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-positive rounded-full" style={{ width: `${wealthMetrics.loanRepaidPct}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: AI FINANCIAL INTELLIGENCE & HEALTH SCORE
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-terminalAccent" />
            4. Financial Insights & Anomaly Intelligence
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono text-positive border-positive/30">
              Health Score: {deterministicInsights.healthScore}/100
            </Badge>
            <Badge variant="outline" className="text-xs font-mono text-info border-info/30">
              Runway: {deterministicInsights.liquidRunwayMonths} mo
            </Badge>
          </div>
        </div>

        {/* AI Insight Cards (Max 3 Initially with Show More) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {visibleInsights.map((item) => {
            let borderClass = "border-border";
            let bgClass = "bg-surface";
            let icon = <CheckCircle2 className="h-4 w-4 text-positive" />;

            if (item.type === "alert") {
              borderClass = "border-negative/30 bg-negative/5";
              icon = <AlertTriangle className="h-4 w-4 text-negative" />;
            } else if (item.type === "warning") {
              borderClass = "border-warning/30 bg-warning/5";
              icon = <AlertTriangle className="h-4 w-4 text-warning" />;
            } else if (item.type === "positive") {
              borderClass = "border-positive/30 bg-positive/5";
              icon = <CheckCircle2 className="h-4 w-4 text-positive" />;
            }

            return (
              <Card
                key={item.id}
                className={`border ${borderClass} ${bgClass} rounded-2xl shadow-2xs p-4 flex flex-col justify-between`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {icon}
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {item.metric && (
                  <div className="mt-3 pt-2 border-t border-border/60 text-right">
                    <span className="font-mono text-xs font-bold text-text-primary">
                      {item.metric}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Show More / Show Less Action */}
        {deterministicInsights.insights.length > 3 && (
          <div className="text-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllInsights(!showAllInsights)}
              className="h-8 text-xs font-mono border-border rounded-xl"
            >
              <span>{showAllInsights ? "Show Less Insights" : `Show More (${deterministicInsights.insights.length - 3} more)`}</span>
              {showAllInsights ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
