"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PiggyBank,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  TrendingDown,
  Compass,
  RotateCcw,
  Target,
  Sparkles,
  Repeat,
  Copy,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import { PlanHeader } from "@/components/plan/plan-header";
import { CategoryBreakdown, CategoryBreakdownItem } from "./category-breakdown";
import { CreateBudgetDialog } from "./create-budget-dialog";

import {
  deleteBudgetAction,
  duplicateBudgetAction,
  toggleBudgetStatusAction,
} from "@/app/(dashboard)/budgets/actions";
import {
  calculateBudgetUtilization,
  calculateDailySafeSpend,
  calculateAdvancedBudgetForecast,
  toDecimal,
  addMoney,
} from "@/lib/calculations/financial";

export interface BudgetWithAllocations extends Tables<"budgets"> {
  budget_categories: (Tables<"budget_categories"> & {
    category: Tables<"categories">;
  })[];
  spentByCategory?: Record<string, string>;
  totalSpent?: string;
}

interface BudgetViewProps {
  budgets: BudgetWithAllocations[];
  categories: Tables<"categories">[];
  accounts?: Tables<"accounts">[];
  transactions?: Array<{
    id: string;
    description: string;
    amount: number | string;
    transaction_date: string;
    category_id?: string | null;
    account_id?: string;
    account?: { name?: string } | null;
  }>;
  upcomingBillsTotal?: string | number;
  period?: string;
  onPeriodChange?: (p: string) => void;
  periodLabel?: string;
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
}

export function BudgetView({
  budgets,
  categories,
  accounts = [],
  transactions = [],
  upcomingBillsTotal = "0.00",
  period = "this_month",
  onPeriodChange,
  periodLabel,
  onPrevPeriod,
  onNextPeriod,
}: BudgetViewProps) {
  const router = useRouter();
  const [selectedBudgetId, setSelectedBudgetId] = React.useState<string>(
    budgets[0]?.id || ""
  );

  const currentBudget =
    budgets.find((b) => b.id === selectedBudgetId) || budgets[0];

  // Keep selected ID in sync if budgets change
  React.useEffect(() => {
    if (budgets.length > 0 && !budgets.some((b) => b.id === selectedBudgetId)) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  // Compute advanced KPIs & forecasts
  const budgetStats = React.useMemo(() => {
    if (!currentBudget) return null;
    const totalAllocated = currentBudget.total_amount;
    const totalSpent = currentBudget.totalSpent || "0.0000";
    const util = calculateBudgetUtilization(totalAllocated, totalSpent);

    const forecast = calculateAdvancedBudgetForecast(
      totalAllocated,
      totalSpent,
      currentBudget.start_date,
      currentBudget.end_date,
      upcomingBillsTotal
    );

    const isWarning =
      util.percentage >= (currentBudget.alert_threshold_percent || 85) &&
      !util.isOverBudget;

    return {
      totalAllocated,
      totalSpent,
      remaining: util.remaining,
      percentage: util.percentage,
      isOverBudget: util.isOverBudget,
      isWarning,
      forecast,
    };
  }, [currentBudget, upcomingBillsTotal]);

  // Build Comprehensive Category Breakdown
  const categoryBreakdownItems = React.useMemo<CategoryBreakdownItem[]>(() => {
    const map = new Map<string, CategoryBreakdownItem>();

    // 1. Initialize from all expense categories
    for (const cat of categories) {
      if (cat.type === "expense" || !cat.type) {
        map.set(cat.id, {
          category: cat,
          allocatedAmount: null,
          spent: "0.00",
          transactionCount: 0,
          transactions: [],
        });
      }
    }

    // 2. Overlay explicit budget allocations
    if (currentBudget?.budget_categories) {
      for (const alloc of currentBudget.budget_categories) {
        const cat = alloc.category;
        if (!cat) continue;
        const existing = map.get(cat.id);
        if (existing) {
          existing.allocatedAmount = alloc.allocated_amount;
        } else {
          map.set(cat.id, {
            category: cat,
            allocatedAmount: alloc.allocated_amount,
            spent: "0.00",
            transactionCount: 0,
            transactions: [],
          });
        }
      }
    }

    // 3. Populate transactions and actual spend for current budget period
    const bStart = currentBudget?.start_date;
    const bEnd = currentBudget ? `${currentBudget.end_date}T23:59:59.999Z` : "";

    for (const tx of transactions) {
      if (!tx.category_id) continue;
      if (bStart && bEnd && (tx.transaction_date < bStart || tx.transaction_date > bEnd)) {
        continue;
      }

      const item = map.get(tx.category_id);
      if (item) {
        item.spent = addMoney(item.spent, tx.amount);
        item.transactionCount += 1;
        item.transactions.push({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          transaction_date: tx.transaction_date,
          account_name: tx.account?.name,
        });
      }
    }

    // Also inject spentByCategory if present on currentBudget
    if (currentBudget?.spentByCategory) {
      for (const [catId, spentAmt] of Object.entries(currentBudget.spentByCategory)) {
        const item = map.get(catId);
        if (item && toDecimal(item.spent).isZero()) {
          item.spent = spentAmt;
        }
      }
    }

    // Return items sorted by spent descending, then allocated
    return Array.from(map.values()).sort((a, b) => {
      const spentA = toDecimal(a.spent);
      const spentB = toDecimal(b.spent);
      if (!spentB.equals(spentA)) return spentB.minus(spentA).toNumber();
      const allocA = toDecimal(a.allocatedAmount || "0");
      const allocB = toDecimal(b.allocatedAmount || "0");
      return allocB.minus(allocA).toNumber();
    });
  }, [categories, currentBudget, transactions]);

  // Actions
  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    const res = await deleteBudgetAction(id);
    if (res.success) {
      toast.success(res.message || "Budget deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete budget");
    }
  };

  const handleDuplicateBudget = async (id: string) => {
    const res = await duplicateBudgetAction(id);
    if (res.success) {
      toast.success(res.message || "Budget duplicated for next month");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to duplicate budget");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    const res = await toggleBudgetStatusAction(id, newStatus);
    if (res.success) {
      toast.success(res.message || `Budget ${newStatus}`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update budget status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Plan Header */}
      <PlanHeader
        activeTab="budgets"
        currentPeriod={period}
        onPeriodChange={onPeriodChange}
        periodLabel={
          periodLabel ||
          (currentBudget
            ? `${format(new Date(currentBudget.start_date), "dd MMM")} – ${format(
                new Date(currentBudget.end_date),
                "dd MMM yyyy"
              )}`
            : undefined)
        }
        onPrevPeriod={onPrevPeriod}
        onNextPeriod={onNextPeriod}
        actions={
          <div className="flex items-center gap-2">
            {budgets.length > 1 && (
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className="h-9 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs text-text-primary shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.status === "paused" ? "Paused" : "Active"})
                  </option>
                ))}
              </select>
            )}
            <CreateBudgetDialog
              categories={categories}
              accounts={accounts}
            />
          </div>
        }
      />

      {/* Unified Plan Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <Link
          href="/budgets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-surface shadow-2xs"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Monthly Budgets</span>
        </Link>
        <Link
          href="/goals"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Target className="h-3.5 w-3.5" />
          <span>Financial Goals</span>
        </Link>
        <Link
          href="/recurring"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
        >
          <Repeat className="h-3.5 w-3.5" />
          <span>Recurring & Bills</span>
        </Link>
      </div>

      {/* Empty State when no budgets exist */}
      {!currentBudget ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-surface space-y-4">
          <PiggyBank className="mx-auto h-12 w-12 text-text-secondary/40" />
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-semibold text-text-primary">
              Create a monthly spending plan to understand how much you can spend
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Establish a monthly budget cap and allocate category envelopes to track Safe-to-Spend pacing.
            </p>
          </div>
          <CreateBudgetDialog
            categories={categories}
            accounts={accounts}
          />
        </div>
      ) : (
        <>
          {/* Budget Sub-Header with Status & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border/70 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-text-primary">
                {currentBudget.name}
              </h2>
              <Badge
                variant="outline"
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                  currentBudget.status === "paused"
                    ? "bg-warning/15 text-warning border-warning/30"
                    : "bg-success/15 text-success border-success/30"
                }`}
              >
                {currentBudget.status === "paused" ? "Paused" : "Active Plan"}
              </Badge>
              {currentBudget.rollover_enabled && (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0.5 px-2 bg-primary/10 text-primary border-primary/20 rounded-md font-medium"
                >
                  Rollover: {currentBudget.rollover_mode || "Full"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(currentBudget.id, currentBudget.status || "active")}
                className="h-8 text-xs text-text-secondary hover:text-text-primary gap-1 rounded-lg"
                title={currentBudget.status === "paused" ? "Resume Budget" : "Pause Budget"}
              >
                {currentBudget.status === "paused" ? (
                  <>
                    <PlayCircle className="h-3.5 w-3.5 text-success" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-3.5 w-3.5 text-warning" />
                    <span>Pause</span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDuplicateBudget(currentBudget.id)}
                className="h-8 text-xs text-text-secondary hover:text-text-primary gap-1 rounded-lg"
                title="Duplicate Budget for Next Month"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Duplicate</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteBudget(currentBudget.id)}
                className="h-8 w-8 text-text-secondary hover:text-danger rounded-lg"
                title="Delete Budget"
                aria-label="Delete Budget"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Overspending / Threshold Alerts */}
          {budgetStats?.isOverBudget && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-danger/30 bg-danger/10 text-danger shadow-2xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Budget Exceeded!</span> You have spent{" "}
                <MoneyDisplay amount={budgetStats.totalSpent} className="font-bold" /> of your{" "}
                <MoneyDisplay amount={budgetStats.totalAllocated} className="font-bold" /> limit (
                {budgetStats.percentage}% utilized).
              </div>
            </div>
          )}

          {budgetStats?.isWarning && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-warning/30 bg-warning/10 text-warning shadow-2xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Warning Threshold Reached:</span> You have utilized{" "}
                {budgetStats.percentage}% of your planned spending for this period.
              </div>
            </div>
          )}

          {/* Overview 6 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* 1. Total Budget */}
            <MetricCard
              title="Total Budget"
              amount={budgetStats?.totalAllocated || "0.00"}
              subtitle="Cycle spending cap"
              icon={PiggyBank}
              iconColor="forest"
            />

            {/* 2. Total Spent */}
            <MetricCard
              title="Total Spent"
              amount={budgetStats?.totalSpent || "0.00"}
              subtitle={`${budgetStats?.percentage || 0}% utilized`}
              icon={TrendingDown}
              iconColor={
                budgetStats?.isOverBudget
                  ? "coral"
                  : budgetStats?.isWarning
                  ? "coral"
                  : "emerald"
              }
              coloredAmount={false}
            />

            {/* 3. Remaining Budget */}
            <MetricCard
              title="Remaining Budget"
              amount={budgetStats?.remaining || "0.00"}
              subtitle={
                budgetStats?.isOverBudget ? "Over budget limit" : "Available balance"
              }
              icon={CheckCircle2}
              iconColor={budgetStats?.isOverBudget ? "coral" : "emerald"}
              coloredAmount
            />

            {/* 4. Daily Safe-to-Spend */}
            <MetricCard
              title="Daily Safe Velocity"
              amount={budgetStats?.forecast.adjustedDailySafeSpend || budgetStats?.forecast.dailySafeSpend || "0.00"}
              subtitle={
                budgetStats?.isOverBudget
                  ? "Restrict discretionary"
                  : `${budgetStats?.forecast.daysRemaining || 0}d left (after bills)`
              }
              icon={Compass}
              iconColor={budgetStats?.isOverBudget ? "coral" : "indigo"}
              coloredAmount={!budgetStats?.isOverBudget}
            />

            {/* 5. Projected Month-End Spending */}
            <MetricCard
              title="Projected Spend"
              amount={budgetStats?.forecast.projectedMonthEndSpending || "0.00"}
              subtitle={
                budgetStats?.forecast.isProjectedToExceed
                  ? "Forecasted to exceed cap"
                  : "Within planned budget"
              }
              icon={TrendingDown}
              iconColor={
                budgetStats?.forecast.isProjectedToExceed ? "coral" : "emerald"
              }
              coloredAmount={false}
            />

            {/* 6. Upcoming Bills */}
            <MetricCard
              title="Upcoming Bills"
              amount={upcomingBillsTotal}
              subtitle="Pending in this cycle"
              icon={Receipt}
              iconColor="indigo"
              coloredAmount={false}
            />
          </div>

          {/* Overall Budget Progress Bar Card */}
          <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-text-primary">
                    Overall Budget Progress
                  </CardTitle>
                  <span className="text-xs text-text-secondary font-medium">
                    ({budgetStats?.percentage || 0}% used)
                  </span>
                </div>
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${
                    budgetStats?.isOverBudget
                      ? "text-danger"
                      : budgetStats?.isWarning
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {budgetStats?.percentage || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              <div className="relative">
                <Progress
                  value={Math.min(budgetStats?.percentage || 0, 100)}
                  indicatorClassName={
                    budgetStats?.isOverBudget
                      ? "bg-danger"
                      : budgetStats?.isWarning
                      ? "bg-warning"
                      : "bg-success"
                  }
                  className="h-3 rounded-full bg-surface-secondary"
                />
                {/* Milestone Tick Indicators */}
                <div className="absolute inset-0 pointer-events-none flex justify-between px-[50%]">
                  <div className="w-0.5 h-3 bg-background/60" title="50% threshold" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-text-secondary pt-0.5 font-mono tabular-nums">
                <span>
                  Spent:{" "}
                  <MoneyDisplay
                    amount={budgetStats?.totalSpent || "0.00"}
                    className="font-bold text-text-primary"
                  />
                </span>
                <span>
                  Limit:{" "}
                  <MoneyDisplay
                    amount={budgetStats?.totalAllocated || "0.00"}
                    className="font-bold text-text-primary"
                  />
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Comprehensive Category Budget Breakdown & Category Spending Envelopes */}
          <CategoryBreakdown
            items={categoryBreakdownItems}
            totalBudgetCap={currentBudget.total_amount}
          />
        </>
      )}
    </div>
  );
}
