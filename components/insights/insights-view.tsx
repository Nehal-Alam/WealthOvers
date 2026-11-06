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
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary">
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
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary">
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
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  generateDeterministicInsights,
  getTransactionDisplayInfo,
} from "@/lib/calculations/financial";
import {
  DateDurationFilter,
  DATE_FILTER_OPTIONS,
  getDateRangeFromFilter,
  filterTransactionsByDateRange,
} from "@/lib/calculations/date-ranges";

interface InsightsViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

export function InsightsView({
  transactions,
  accounts,
  categories,
}: InsightsViewProps) {
  // Default to Indian Financial Year
  const [selectedDuration, setSelectedDuration] =
    React.useState<DateDurationFilter>("financial_year");
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");
  const [appliedCustomStart, setAppliedCustomStart] = React.useState<string | null>(null);
  const [appliedCustomEnd, setAppliedCustomEnd] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"scrubber" | "trends">("scrubber");

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

  // Financial aggregates for the selected range
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

  // Deterministic Insights
  const insights = React.useMemo(() => {
    let liquid = "0.0000";
    for (const a of accounts.filter((acc) => !acc.is_archived)) {
      if (a.account_type !== "credit_card" && a.account_type !== "loan_account") {
        liquid = addMoney(liquid, a.current_balance);
      }
    }

    return generateDeterministicInsights(filteredTransactions, liquid);
  }, [filteredTransactions, accounts]);

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

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          TOP HEADER & DURATION FILTER BAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Financial Insights & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Spending velocity, cash flow trends, and deterministic anomaly intelligence.
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
            <SelectTrigger className="h-9 min-w-[200px] text-xs font-semibold rounded-xl border-border bg-surface text-text-primary shadow-xs">
              <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              {DATE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
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
                className="h-9 w-36 text-xs bg-surface border-border"
                aria-label="Start Date"
              />
              <span className="text-xs text-text-secondary">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-36 text-xs bg-surface border-border"
                aria-label="End Date"
              />
              <Button
                size="sm"
                onClick={handleApplyCustom}
                className="h-9 bg-primary hover:bg-primary-hover text-surface text-xs font-semibold rounded-xl"
              >
                Apply Filter
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
            className="text-xs font-medium py-1 px-2.5 rounded-lg border-primary/30 text-primary bg-primary/10"
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
          SECTION 2: AGGREGATE FINANCIAL KPIS FOR THE PERIOD
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          subtitle="Net accumulated capital"
          icon={PiggyBank}
          iconColor="forest"
          coloredAmount
        />
        <MetricCard
          title="Savings Rate"
          amount={`${savingsRate}%`}
          formatType="percent"
          subtitle="Proportion of income preserved"
          icon={Percent}
          iconColor="indigo"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: DETERMINISTIC INSIGHTS CARDS
      ────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Financial Insights & Anomaly Intelligence
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.insights.map((item) => {
          let borderClass = "border-border";
          let bgClass = "bg-surface";
          let icon = <CheckCircle2 className="h-4 w-4 text-primary" />;

          if (item.type === "alert") {
            borderClass = "border-danger/30 bg-danger/5";
            icon = <AlertTriangle className="h-4 w-4 text-danger" />;
          } else if (item.type === "warning") {
            borderClass = "border-warning/30 bg-warning/5";
            icon = <AlertTriangle className="h-4 w-4 text-warning" />;
          } else if (item.type === "positive") {
            borderClass = "border-success/30 bg-success/5";
            icon = <CheckCircle2 className="h-4 w-4 text-success" />;
          }

          return (
            <Card
              key={item.id}
              className={`border ${borderClass} ${bgClass} rounded-2xl shadow-2xs p-4 flex flex-col justify-between`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {icon}
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
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
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: CHARTS & SCRUBBER
      ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <button
          onClick={() => setActiveTab("scrubber")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "scrubber"
              ? "bg-primary text-surface shadow-2xs"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Daily Spending Scrubber</span>
        </button>
        <button
          onClick={() => setActiveTab("trends")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "trends"
              ? "bg-primary text-surface shadow-2xs"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Category & Cash Flow Analytics</span>
        </button>
      </div>

      {activeTab === "scrubber" ? (
        <DailySpendingScrubber transactions={filteredTransactions} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold text-text-primary">
                  Cash Flow Trends (Inflow vs Outflow)
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary">
                  Monthly net income comparison for active period
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CashFlowChart data={cashFlowChartData} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="border border-border/80 bg-surface rounded-2xl shadow-2xs p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-semibold text-text-primary">
                  Spending by Category
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary">
                  Expense distribution across spending envelopes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <CategoryPieChart data={categoryChartData} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
